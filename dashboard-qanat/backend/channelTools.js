/**
 * channelTools.js — Rotas das 4 ferramentas, todas por canal.
 *
 * USO no server.js (adicione junto com channelRouter):
 *   import toolsRouter from "./channelTools.js";
 *   app.use("/api/tools", toolsRouter);
 *
 * Dados: lê de channels/{id}/data/analytics_cache.json
 * (populado pelo sync do YouTube — com ou sem YOUTUBE_API_KEY)
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

// ─── HELPERS ──────────────────────────────────────────────────

function readData(channelId, file, fallback = {}) {
  const p = path.join(CHANNELS_DIR, channelId, "data", file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeData(channelId, file, data) {
  const dir = path.join(CHANNELS_DIR, channelId, "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2), "utf8");
}

// ─── SYNC DO YOUTUBE (com fallback local) ─────────────────────

async function syncYouTubeAnalytics(channelId) {
  const config = loadChannelConfig(channelId);
  const ytId = config?.meta?.youtube_channel_id;
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Sem credenciais → mantém cache local (não quebra)
  if (!ytId || !apiKey) {
    return readData(channelId, "analytics_cache.json", {
      synced_at: null,
      offline: true,
      stats: null,
      videos: [],
    });
  }

  try {
    // Com credenciais → busca real (YouTube Data API v3)
    const base = "https://www.googleapis.com/youtube/v3";
    const [statsRes, videosRes] = await Promise.all([
      fetch(
        `${base}/channels?part=statistics,snippet&id=${ytId}&key=${apiKey}`
      ),
      fetch(
        `${base}/search?part=snippet&channelId=${ytId}&maxResults=25&order=date&type=video&key=${apiKey}`
      ),
    ]);
    const statsData = await statsRes.json();
    const videosData = await videosRes.json();

    const cache = {
      synced_at: new Date().toISOString(),
      offline: false,
      stats: statsData.items?.[0]?.statistics || null,
      videos: (videosData.items || []).map((v) => ({
        video_id: v.id.videoId,
        title: v.snippet.title,
        published_at: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url,
      })),
    };
    writeData(channelId, "analytics_cache.json", cache);
    return cache;
  } catch (err) {
    return {
      ...readData(channelId, "analytics_cache.json", {}),
      sync_error: err.message,
    };
  }
}

// ─── FERRAMENTA 1: CANALYOUTUBE (visão geral + diagnóstico) ───

router.get("/:channelId/overview", async (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    if (!config)
      return res.status(404).json({ error: "Canal não encontrado." });

    const cache = await syncYouTubeAnalytics(channelId);
    const history = readData(channelId, "performance_history.json", {
      series: { inscritos: [], views: [] },
    });

    res.json({
      ok: true,
      canal: {
        id: channelId,
        nome: config.meta?.nome,
        youtube_channel_id: config.meta?.youtube_channel_id,
        nicho: config.nicho?.principal,
      },
      stats: cache.stats,
      videos: cache.videos,
      series: history.series, // p/ sparklines
      offline: cache.offline || false,
      synced_at: cache.synced_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔬 SUGESTÃO IMPLANTADA: Diagnóstico automático por regras
router.get("/:channelId/diagnosis", (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    const history = readData(channelId, "performance_history.json", {
      metrics: {},
    });
    const m = history.metrics || {};

    const achados = [];
    const add = (sev, area, problema, acao) =>
      achados.push({ severidade: sev, area, problema, acao });

    // CTR
    if (m.ctr != null && m.ctr < 4)
      add(
        "critico",
        "Thumbnail/Título",
        `CTR de ${m.ctr}% (abaixo de 4%)`,
        "Refazer thumbnails com contraste máximo + títulos com número ou contradição."
      );
    if (m.ctr != null && m.ctr >= 8 && (m.views_media || 0) < 1000)
      add(
        "atencao",
        "Distribuição",
        `CTR alto (${m.ctr}%) mas views baixas`,
        "Algoritmo não está distribuindo — aumentar frequência para 3x/semana e revisar SEO/tags."
      );

    // Retenção
    if (m.retencao != null && m.retencao < 40)
      add(
        "critico",
        "Roteiro",
        `Retenção média de ${m.retencao}% (abaixo de 40%)`,
        "Adicionar picos de energia a cada 90s e cortar trechos sem informação nova."
      );
    if (m.drop_30s != null && m.drop_30s > 40)
      add(
        "critico",
        "Gancho",
        `${m.drop_30s}% do público sai nos primeiros 30s`,
        "Gancho fraco — começar com número, contradição ou ação. Nunca com saudação."
      );

    // Consistência
    if (m.dias_desde_ultimo != null && m.dias_desde_ultimo > 7)
      add(
        "atencao",
        "Frequência",
        `${m.dias_desde_ultimo} dias sem publicar`,
        "Algoritmo esfria canais irregulares — voltar ao calendário ter/qui/sáb."
      );

    // Nicho
    if (m.temas_fora_nicho != null && m.temas_fora_nicho > 0)
      add(
        "critico",
        "Nicho",
        `${m.temas_fora_nicho} vídeos recentes fora do nicho`,
        "O algoritmo não sabe para quem recomendar — publicar 5 vídeos seguidos DENTRO do nicho."
      );

    if (achados.length === 0)
      add(
        "ok",
        "Saúde",
        "Nenhum problema crítico detectado.",
        "Manter estratégia e escalar o que performa."
      );

    res.json({ ok: true, diagnosticos: achados });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FERRAMENTA 2: RESSUSCITADOR ──────────────────────────────

router.get("/:channelId/dead-videos", (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    const history = readData(channelId, "performance_history.json", {
      videos: [],
    });

    const media = history.videos.length
      ? history.videos.reduce((s, v) => s + (v.views || 0), 0) /
        history.videos.length
      : 0;

    // Vídeos "mortos": abaixo de 40% da média do canal
    const mortos = history.videos
      .filter((v) => (v.views || 0) < media * 0.4)
      .map((v) => ({ ...v, media_canal: Math.round(media) }));

    res.json({
      ok: true,
      mortos,
      media_canal: Math.round(media),
      total: history.videos.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⚰️ SUGESTÃO IMPLANTADA: Autópsia + plano de resgate
router.post("/:channelId/revive", (req, res) => {
  try {
    const { channelId } = req.params;
    const { video } = req.body || {};
    const config = loadChannelConfig(channelId);
    if (!config)
      return res.status(404).json({ error: "Canal não encontrado." });

    const tituloCfg = config.titulo || {};
    const nicho = config.nicho || {};
    const autopsia = [];
    const resgate = [];

    // 1. Título
    if (video.title?.length > (tituloCfg.max_caracteres || 60))
      autopsia.push(
        `Título com ${video.title.length} chars — cortado na busca.`
      );
    if (video.title && !/\d/.test(video.title))
      autopsia.push("Título sem número — perde CTR neste nicho.");
    if (video.title && /[A-ZÀ-Ú]{5,}/.test(video.title))
      autopsia.push("Excesso de CAIXA ALTA parece spam.");

    // 2. Nicho
    if (video.sub_nicho && nicho.temas_proibidos?.includes(video.sub_nicho))
      autopsia.push(
        `Tema '${video.sub_nicho}' é PROIBIDO neste canal — público errado.`
      );
    else if (
      video.sub_nicho &&
      !nicho.sub_nichos_permitidos?.includes(video.sub_nicho)
    )
      autopsia.push(
        `Tema fora dos sub-nichos do canal — algoritmo não distribuiu.`
      );

    // 3. Duração
    if (
      video.duration_seconds &&
      video.duration_seconds <
        (config.formato_video?.duracao_min_segundos || 480)
    )
      autopsia.push(
        `Vídeo curto demais (${video.duration_seconds}s) para o formato do canal.`
      );

    // 4. Retenção
    if (video.drop_30s > 40)
      autopsia.push(
        `Gancho fraco — ${video.drop_30s}% saíram nos primeiros 30s.`
      );

    if (autopsia.length === 0)
      autopsia.push(
        "Sem falhas estruturais claras — provavelmente timing / thumbnail."
      );

    // Plano de resgate usando os templates do canal
    const templates = tituloCfg.templates_vencedores || [];
    resgate.push({
      tipo: "novo_titulo",
      sugestao: templates[0] || "O/A {objeto} que quase foi {ação_negativa}",
      nota: "Preencher com os dados do vídeo e manter ≤ 60 chars.",
    });
    resgate.push({
      tipo: "nova_thumbnail",
      sugestao:
        "Escala humana + contraste máximo + texto de 3 palavras em fonte bold.",
      prompt: `Dramatic wide shot, tiny human silhouette for scale vs ${video.title || "estrutura gigante"}, golden hour side lighting, high contrast, cinematic, 8k`,
    });
    if (video.duration_seconds > 480) {
      resgate.push({
        tipo: "cortar_para_shorts",
        sugestao:
          "Extrair os 2 melhores momentos (picos de energia) como Shorts de 45s apontando para o vídeo completo.",
      });
    }
    resgate.push({
      tipo: "republicar",
      sugestao:
        "Aplicar novo título + thumbnail e republicar em horário de pico (18h). Aguardar 7 dias antes de julgar.",
    });

    res.json({ ok: true, autopsia, resgate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FERRAMENTA 3: RADAR DE TENDÊNCIAS ────────────────────────

// 🎯 SUGESTÃO IMPLANTADA: Fit Score contra o nicho do canal
function calcularFitScore(tendencia, config) {
  const nicho = config.nicho || {};
  let score = 50;
  const motivos = [];

  const texto =
    `${tendencia.tema} ${tendencia.palavras_chave?.join(" ")}`.toLowerCase();

  // + por palavra-chave do canal presente
  for (const kw of nicho.palavras_chave_seo || []) {
    if (texto.includes(kw.toLowerCase())) {
      score += 8;
      motivos.push(`contém "${kw}"`);
    }
  }
  // + por sub-nicho compatível
  if (
    tendencia.sub_nicho &&
    nicho.sub_nichos_permitidos?.includes(tendencia.sub_nicho)
  ) {
    score += 20;
    motivos.push("sub-nicho permitido");
  }
  // − por tema proibido
  for (const p of nicho.temas_proibidos || []) {
    if (texto.includes(p.toLowerCase())) {
      score -= 60;
      motivos.push(`🚫 toca em "${p}"`);
    }
  }
  // ajuste por competição e urgência
  if (tendencia.competicao === "baixa") {
    score += 10;
    motivos.push("competição baixa");
  }
  if (tendencia.urgencia === "alta") {
    score += 5;
    motivos.push("janela quente");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    motivos,
    bloqueado: score < 20,
  };
}

router.get("/:channelId/trends", (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    if (!config)
      return res.status(404).json({ error: "Canal não encontrado." });

    // Tendências brutas
    const brutas = readData(channelId, "trends_feed.json", {
      tendencias: [],
    }).tendencias;

    const ranqueadas = brutas
      .map((t) => ({ ...t, fit: calcularFitScore(t, config) }))
      .sort((a, b) => b.fit.score - a.fit.score);

    res.json({
      ok: true,
      canal: config.meta?.nome,
      nicho: config.nicho?.principal,
      tendencias: ranqueadas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FERRAMENTA 4: MONITOR DE VÍDEOS ──────────────────────────

router.get("/:channelId/video-monitor", (req, res) => {
  try {
    const { channelId } = req.params;
    const config = loadChannelConfig(channelId);
    const history = readData(channelId, "performance_history.json", {
      videos: [],
    });

    const tiers = config?.analytics?.classificacao_performance || {
      tier_a: { views_min: 5000 },
      tier_b: { views_min: 1000 },
      tier_c: { views_min: 0 },
    };

    const monitorados = history.videos.map((v) => {
      // velocidade = views/dia desde a publicação
      const dias = Math.max(
        1,
        (Date.now() - new Date(v.published_at).getTime()) / 86400000
      );
      const velocidade = (v.views || 0) / dias;

      let tier = "C";
      if (v.views >= tiers.tier_a.views_min) tier = "A";
      else if (v.views >= tiers.tier_b.views_min) tier = "B";

      let alerta = null;
      if (velocidade > 100 && dias <= 7)
        alerta = "decolando"; // 🔥
      else if (velocidade < 10 && dias >= 5) alerta = "estagnado"; // 📉

      return {
        ...v,
        velocidade: Math.round(velocidade),
        tier,
        alerta,
        dias: Math.round(dias),
      };
    });

    res.json({ ok: true, videos: monitorados });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 SUGESTÃO IMPLANTADA: Extração de padrões (feedback loop)
router.get("/:channelId/patterns", (req, res) => {
  try {
    const { channelId } = req.params;
    const history = readData(channelId, "performance_history.json", {
      videos: [],
    });
    const videos = history.videos;
    if (videos.length < 3) {
      return res.json({
        ok: true,
        padroes: [],
        nota: "Mínimo 3 vídeos para extrair padrões.",
      });
    }

    const mediaGeral =
      videos.reduce((s, v) => s + (v.views || 0), 0) / videos.length;
    const padroes = [];

    // Gancho com número vs sem número
    const comNum = videos.filter((v) => /\d/.test(v.title || ""));
    const semNum = videos.filter((v) => !/\d/.test(v.title || ""));
    if (comNum.length && semNum.length) {
      const mNum = comNum.reduce((s, v) => s + v.views, 0) / comNum.length;
      const mSem = semNum.reduce((s, v) => s + v.views, 0) / semNum.length;
      if (mNum > mSem * 1.3)
        padroes.push({
          tipo: "gancho",
          insight: `Títulos com número performam ${(mNum / mSem).toFixed(1)}x melhor.`,
          acao: "Sempre incluir número no próximo título.",
        });
    }

    // Sub-nicho campeão
    const porNicho = {};
    for (const v of videos) {
      if (!v.sub_nicho) continue;
      porNicho[v.sub_nicho] = porNicho[v.sub_nicho] || { soma: 0, n: 0 };
      porNicho[v.sub_nicho].soma += v.views;
      porNicho[v.sub_nicho].n++;
    }
    const ranking = Object.entries(porNicho)
      .map(([k, o]) => ({ sub_nicho: k, media: o.soma / o.n }))
      .sort((a, b) => b.media - a.media);
    if (ranking[0] && ranking[0].media > mediaGeral * 1.4)
      padroes.push({
        tipo: "nicho",
        insight: `'${ranking[0].sub_nicho}' performa ${Math.round((ranking[0].media / mediaGeral) * 10) / 10}x acima da média.`,
        acao: "Dobrar a produção neste sub-nicho.",
      });

    // Duração ideal
    const longos = videos.filter((v) => v.duration_seconds >= 480);
    const curtos = videos.filter((v) => v.duration_seconds < 480);
    if (longos.length && curtos.length) {
      const mL = longos.reduce((s, v) => s + v.views, 0) / longos.length;
      const mC = curtos.reduce((s, v) => s + v.views, 0) / curtos.length;
      if (mL > mC * 1.5)
        padroes.push({
          tipo: "duracao",
          insight: "Vídeos ≥ 8 min performam muito melhor que os curtos.",
          acao: "Manter duração entre 8–12 min.",
        });
    }

    res.json({ ok: true, padroes, media_geral: Math.round(mediaGeral) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
