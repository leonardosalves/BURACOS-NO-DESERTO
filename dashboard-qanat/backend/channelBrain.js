import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

// Helper para ler arquivos JSON de forma segura
function readData(channelId, file, fallback = {}) {
  const p = path.join(CHANNELS_DIR, channelId, "data", file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

// Helper para salvar arquivos JSON
function writeData(channelId, file, data) {
  const dir = path.join(CHANNELS_DIR, channelId, "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2), "utf8");
}

// Função auxiliar para calcular o Fit Score do Radar de Tendências
function calcularFitScore(tendencia, config) {
  const nicho = config.nicho || {};
  let score = 50;
  const texto =
    `${tendencia.tema} ${tendencia.palavras_chave?.join(" ")}`.toLowerCase();

  for (const kw of nicho.palavras_chave_seo || []) {
    if (texto.includes(kw.toLowerCase())) {
      score += 8;
    }
  }
  if (
    tendencia.sub_nicho &&
    nicho.sub_nichos_permitidos?.includes(tendencia.sub_nicho)
  ) {
    score += 20;
  }
  for (const p of nicho.temas_proibidos || []) {
    if (texto.includes(p.toLowerCase())) {
      score -= 60;
    }
  }
  if (tendencia.competicao === "baixa") score += 10;
  if (tendencia.urgencia === "alta") score += 5;

  return Math.max(0, Math.min(100, score));
}

// ROTA PRINCIPAL: Retorna o Cérebro do Canal (Métricas, Saúde, Missões, Alertas e Memória)
router.get("/:channelId", (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    if (!config) {
      return res.status(404).json({ error: "Canal não encontrado." });
    }

    const history = readData(channelId, "performance_history.json", {
      metrics: {
        ctr: 5.0,
        retencao: 45,
        drop_30s: 30,
        dias_desde_ultimo: 5,
        temas_fora_nicho: 0,
        views_media: 1000,
      },
      videos: [],
      series: { inscritos: [], views: [] },
    });

    const m = history.metrics || {};
    const videos = history.videos || [];

    // 1. CALCULAR HEALTH SCORE (60 pontos base)
    let healthScore = 60;
    const healthBreakdown = [];

    // CTR
    if (m.ctr >= 6.0) {
      healthScore += 15;
      healthBreakdown.push({ tag: "CTR Excelente", points: 15 });
    } else if (m.ctr < 4.0) {
      healthScore -= 15;
      healthBreakdown.push({ tag: "CTR Baixo", points: -15 });
    }

    // Retenção
    if (m.retencao >= 50) {
      healthScore += 15;
      healthBreakdown.push({ tag: "Retenção Excelente", points: 15 });
    } else if (m.retencao < 40) {
      healthScore -= 15;
      healthBreakdown.push({ tag: "Retenção Baixa", points: -15 });
    }

    // Frequência
    if (m.dias_desde_ultimo <= 4) {
      healthScore += 10;
      healthBreakdown.push({ tag: "Uploads Frequentes", points: 10 });
    } else if (m.dias_desde_ultimo > 7) {
      healthScore -= 12;
      healthBreakdown.push({ tag: "Falta de uploads", points: -12 });
    }

    // Dispersão de nicho
    if (m.temas_fora_nicho > 0) {
      healthScore -= 10;
      healthBreakdown.push({ tag: "Dispersão de Nicho", points: -10 });
    }

    // Crescimento de inscritos nos últimos 7 dias (calculado a partir da série histórica)
    const seriesSubs = history.series?.inscritos || [];
    if (seriesSubs.length >= 2) {
      const maisRecente = seriesSubs[seriesSubs.length - 1]?.valor || 0;
      const antigo = seriesSubs[0]?.valor || 0;
      if (maisRecente > antigo) {
        healthScore += 8;
        healthBreakdown.push({ tag: "Crescimento Ativo", points: 8 });
      }
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    // 2. EXTRAIR ALERTAS DO ALGORITMO
    const alertas = [];
    if (videos.length > 0) {
      // Ordenar vídeos por data de publicação decrescente
      const videosOrdenados = [...videos].sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
      );
      const maisRecente = videosOrdenados[0];
      const diasPublicado =
        (Date.now() - new Date(maisRecente.published_at).getTime()) / 86400000;

      // Velocidade do vídeo recente
      const velocidade = (maisRecente.views || 0) / Math.max(1, diasPublicado);

      if (diasPublicado <= 3 && velocidade < 10) {
        alertas.push({
          tipo: "perigo",
          titulo: "Retenção Inicial Lenta",
          mensagem: `O vídeo recente "${maisRecente.title}" está com visualizações abaixo do esperado. Recomendamos trocar a thumbnail e título imediatamente.`,
        });
      } else if (diasPublicado <= 7 && velocidade > 100) {
        alertas.push({
          tipo: "sucesso",
          titulo: "Vídeo Decolando!",
          mensagem: `O vídeo "${maisRecente.title}" está tracionando de forma excepcional no algoritmo. Não faça alterações; apenas promova.`,
        });
      }
    }

    // 3. DEFINIR MISSÕES PRIORIZADAS (cruzando as 4 ferramentas)
    const missoes = [];

    // Missão A: Radar (Tendência com Fit Score alto)
    const trendsFeed = readData(channelId, "trends_feed.json", {
      tendencias: [],
    });
    const radarTrends = (trendsFeed.tendencias || [])
      .map((t) => ({ ...t, fitScore: calcularFitScore(t, config) }))
      .sort((a, b) => b.fitScore - a.fitScore);

    const tendenciaQuente = radarTrends.find((t) => t.fitScore >= 80);
    if (tendenciaQuente) {
      missoes.push({
        tipo: "radar",
        titulo: "🚀 Produzir Vídeo de Tendência",
        descricao: `A tendência "${tendenciaQuente.tema}" possui fit score de ${tendenciaQuente.fitScore}% com o canal. Surfe nessa onda gerando o script agora.`,
        meta: {
          tema: tendenciaQuente.tema,
          sub_nicho: tendenciaQuente.sub_nicho,
        },
        prioridade: "alta",
        acaoLabel: "Criar Vídeo",
      });
    }

    // Missão B: Monitor (Impulsionar vídeo em destaque)
    const videoDecolando = videos.find((v) => {
      const dias = (Date.now() - new Date(v.published_at).getTime()) / 86400000;
      const velocidade = (v.views || 0) / Math.max(1, dias);
      return velocidade > 100 && dias <= 7;
    });
    if (videoDecolando) {
      missoes.push({
        tipo: "monitor",
        titulo: "🔥 Impulsionar Vídeo Decolando",
        descricao: `"${videoDecolando.title}" está viralizando. Crie um comentário fixado estratégico e prepare Shorts derivados.`,
        meta: {
          video_id: videoDecolando.video_id,
          title: videoDecolando.title,
        },
        prioridade: "alta",
        acaoLabel: "Promover",
      });
    }

    // Missão C: Diagnóstico (Erro crítico de desempenho)
    if (m.ctr < 4.0) {
      missoes.push({
        tipo: "diagnostico",
        titulo: "🔬 Otimizar Métricas de CTR",
        descricao:
          "O CTR médio recente está abaixo de 4%. Crie variantes de capa de vídeo e revise a embalagem dos títulos.",
        meta: {},
        prioridade: "critica",
        acaoLabel: "Diagnosticar",
      });
    } else if (m.drop_30s > 40) {
      missoes.push({
        tipo: "diagnostico",
        titulo: "🔬 Consertar Retenção do Gancho",
        descricao:
          "Alto drop de espectadores nos primeiros 30s. Ajuste as regras do Criador para remover vinhetas e saudações.",
        meta: {},
        prioridade: "critica",
        acaoLabel: "Ajustar Prompts",
      });
    }

    // Missão D: Ressuscitador (Vídeo estagnado com bom potencial)
    const mediaCanal = videos.length
      ? videos.reduce((acc, v) => acc + (v.views || 0), 0) / videos.length
      : 0;
    const videoMortoComPotencial = videos.find(
      (v) => (v.views || 0) < mediaCanal * 0.4 && v.ctr && v.ctr < 4
    );
    if (videoMortoComPotencial) {
      missoes.push({
        tipo: "reviver",
        titulo: "⚰️ Ressuscitar Vídeo Estagnado",
        descricao: `"${videoMortoComPotencial.title}" estagnou com ${videoMortoComPotencial.views} views. Execute o resgate com novo título e capa.`,
        meta: {
          video_id: videoMortoComPotencial.video_id,
          title: videoMortoComPotencial.title,
        },
        prioridade: "media",
        acaoLabel: "Resgatar",
      });
    }

    // Se não houver missões geradas, criar uma de consistência geral
    if (missoes.length === 0) {
      missoes.push({
        tipo: "radar",
        titulo: "📅 Planejar Novo Conteúdo",
        descricao:
          "Métricas estáveis. Planeje sua próxima semana de uploads explorando novos temas no Radar.",
        meta: {},
        prioridade: "baixa",
        acaoLabel: "Abrir Radar",
      });
    }

    // 4. CARREGAR OU INICIALIZAR MEMÓRIA DE APRENDIZADO
    const memoria = readData(channelId, "memoria.json", {
      sucessos: [
        "Títulos curtos com números geram CTR 25% maior no nicho.",
        "Começar o vídeo diretamente no gancho sem vinheta retém +15% de público nos primeiros 30s.",
      ],
      evitar: [
        "Evitar vídeos após as 21h (esfria a distribuição inicial).",
        "Não abordar temas genéricos que diluem o nicho principal.",
      ],
    });

    res.json({
      ok: true,
      canal: {
        id: channelId,
        nome: config.meta?.nome,
        nicho: config.nicho?.principal,
      },
      healthScore,
      healthBreakdown,
      alertas,
      missoes,
      memoria,
      lastSync: history.last_sync || new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint POST para atualizar/adicionar novos aprendizados na memória do canal
router.post("/:channelId/memoria", (req, res) => {
  try {
    const { channelId } = req.params;
    const { sucessos, evitar } = req.body;

    if (!Array.isArray(sucessos) || !Array.isArray(evitar)) {
      return res
        .status(400)
        .json({ error: "Parâmetros 'sucessos' e 'evitar' devem ser arrays." });
    }

    const config = loadChannelConfig(channelId);
    if (!config) {
      return res.status(404).json({ error: "Canal não encontrado." });
    }

    const memoria = { sucessos, evitar };
    writeData(channelId, "memoria.json", memoria);

    res.json({ ok: true, memoria });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
