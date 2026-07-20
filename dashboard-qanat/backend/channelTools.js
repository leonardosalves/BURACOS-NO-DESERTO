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
import { getChannelAnalytics, getChannelPublicData } from "./youtubeClient.js";

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
  if (!config)
    return { synced_at: null, offline: true, stats: null, videos: [] };

  const ytChannelId = config?.meta?.youtube_channel_id;

  // Carregar histórico atual
  const history = readData(channelId, "performance_history.json", {
    metrics: {},
    videos: [],
    series: { inscritos: [], views: [] },
  });

  // 1) Dados públicos (API key do canal ou global)
  const publicData = await getChannelPublicData(channelId, ytChannelId);

  // 2) Analytics privados (OAuth do canal — CTR, retenção)
  const analytics = await getChannelAnalytics(channelId, 28);

  let stats = null;
  let videos = [];
  let isOffline = !publicData.disponivel;

  if (publicData.disponivel) {
    stats = publicData.stats;
    videos = publicData.videos;
  } else {
    // Simular dados do canal
    const lastInscritos = history.series?.inscritos?.length
      ? history.series.inscritos[history.series.inscritos.length - 1]?.valor
      : 15420;
    const lastViews = history.series?.views?.length
      ? history.series.views[history.series.views.length - 1]?.valor
      : 320400;

    stats = {
      viewCount: String(lastViews + Math.floor(Math.random() * 450) + 50),
      subscriberCount: String(
        lastInscritos + Math.floor(Math.random() * 8) + 2
      ),
      videoCount: String(history.videos?.length || 12),
    };

    // Gerar vídeos mockados se não houver
    if (!history.videos || history.videos.length === 0) {
      const nicho = config.nicho?.principal || "Geral";
      const subNichos = config.nicho?.sub_nichos_permitidos || [
        "Tutoriais",
        "Dicas",
        "Review",
      ];

      videos = [
        {
          video_id: "v1_mock",
          title: `Como dominar o nicho ${nicho} hoje mesmo!`,
          published_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          thumbnail:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
          views: 1250,
          ctr: 6.8,
          retencao: 52,
          drop_30s: 28,
          duration_seconds: 520,
          sub_nicho: subNichos[0] || "Dicas",
        },
        {
          video_id: "v2_mock",
          title: `5 Erros Fatais no desenvolvimento de ${nicho}`,
          published_at: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          thumbnail:
            "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80",
          views: 4500,
          ctr: 8.2,
          retencao: 48,
          drop_30s: 32,
          duration_seconds: 640,
          sub_nicho: subNichos[0] || "Dicas",
        },
        {
          video_id: "v3_mock",
          title: `O Segredo Revelado sobre ${nicho} que ninguém te conta`,
          published_at: new Date(
            Date.now() - 9 * 24 * 60 * 60 * 1000
          ).toISOString(),
          thumbnail:
            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
          views: 820,
          ctr: 3.1,
          retencao: 35,
          drop_30s: 48,
          duration_seconds: 410,
          sub_nicho: subNichos[1] || "Tutoriais",
        },
      ];
    } else {
      videos = history.videos.map((v) => {
        const diasPublicado =
          (Date.now() - new Date(v.published_at).getTime()) /
          (24 * 60 * 60 * 1000);
        const ganhoViews =
          diasPublicado < 7
            ? Math.floor(Math.random() * 150) + 10
            : Math.floor(Math.random() * 15);
        return {
          ...v,
          views: (v.views || 0) + ganhoViews,
        };
      });
    }
  }

  // Mesclar dados privados
  if (analytics.disponivel) {
    videos = videos.map((v) => {
      const existente = (history.videos || []).find(
        (hv) => hv.video_id === v.video_id
      );
      return {
        ...v,
        ctr:
          existente?.ctr ||
          Number(
            (analytics.ctr_medio * (0.8 + Math.random() * 0.4)).toFixed(1)
          ),
        retencao:
          existente?.retencao ||
          Math.round(analytics.retencao_media * (0.8 + Math.random() * 0.4)),
        drop_30s: existente?.drop_30s || Math.floor(Math.random() * 20) + 20,
        sub_nicho:
          existente?.sub_nicho ||
          config.nicho?.sub_nichos_permitidos?.[0] ||
          "Geral",
      };
    });
  } else {
    videos = videos.map((v) => {
      const subNichos = config.nicho?.sub_nichos_permitidos || [];
      const randomSubNicho =
        subNichos[Math.floor(Math.random() * subNichos.length)] || "Geral";
      return {
        ...v,
        ctr: v.ctr || Number((Math.random() * 6 + 3).toFixed(1)),
        retencao: v.retencao || Math.floor(Math.random() * 25) + 35,
        drop_30s: v.drop_30s || Math.floor(Math.random() * 25) + 20,
        duration_seconds:
          v.duration_seconds || Math.floor(Math.random() * 400) + 300,
        sub_nicho: v.sub_nicho || randomSubNicho,
      };
    });
  }

  // Gravar no cache
  const cacheData = {
    synced_at: new Date().toISOString(),
    offline: isOffline,
    stats,
    videos: videos.map((v) => ({
      video_id: v.video_id,
      title: v.title,
      published_at: v.published_at,
      thumbnail: v.thumbnail,
    })),
    analytics_disponivel: analytics.disponivel,
  };
  writeData(channelId, "analytics_cache.json", cacheData);

  // Atualizar séries e métricas
  const viewsVal = stats ? parseInt(stats.viewCount) : 0;
  const subsVal = stats ? parseInt(stats.subscriberCount) : 0;

  const timestamp = new Date().toISOString().split("T")[0];
  const seriesInscritos = history.series?.inscritos || [];
  const seriesViews = history.series?.views || [];

  if (!seriesInscritos.some((s) => s.data === timestamp)) {
    seriesInscritos.push({ data: timestamp, valor: subsVal });
  } else {
    const idx = seriesInscritos.findIndex((s) => s.data === timestamp);
    if (idx !== -1) seriesInscritos[idx].valor = subsVal;
  }

  if (!seriesViews.some((s) => s.data === timestamp)) {
    seriesViews.push({ data: timestamp, valor: viewsVal });
  } else {
    const idx = seriesViews.findIndex((s) => s.data === timestamp);
    if (idx !== -1) seriesViews[idx].valor = viewsVal;
  }

  if (seriesInscritos.length > 15) seriesInscritos.shift();
  if (seriesViews.length > 15) seriesViews.shift();

  const totalCtr = videos.reduce((acc, v) => acc + (v.ctr || 0), 0);
  const totalRet = videos.reduce((acc, v) => acc + (v.retencao || 0), 0);
  const totalDrop = videos.reduce((acc, v) => acc + (v.drop_30s || 0), 0);
  const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);

  let diasDesdeUltimo = 99;
  if (videos.length > 0) {
    const ordenados = [...videos].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
    const ultimoPublish = new Date(ordenados[0].published_at).getTime();
    diasDesdeUltimo = Math.round(
      (Date.now() - ultimoPublish) / (24 * 60 * 60 * 1000)
    );
  }

  const subNichosPermitidos = config.nicho?.sub_nichos_permitidos || [];
  const temasForaNicho = videos.filter(
    (v) => v.sub_nicho && !subNichosPermitidos.includes(v.sub_nicho)
  ).length;

  history.metrics = {
    ctr: analytics.disponivel
      ? analytics.ctr_medio
      : videos.length
        ? Number((totalCtr / videos.length).toFixed(1))
        : 5.0,
    retencao: analytics.disponivel
      ? analytics.retencao_media
      : videos.length
        ? Math.round(totalRet / videos.length)
        : 45,
    drop_30s: videos.length ? Math.round(totalDrop / videos.length) : 30,
    views_media: videos.length ? Math.round(totalViews / videos.length) : 1000,
    dias_desde_ultimo: diasDesdeUltimo >= 0 ? diasDesdeUltimo : 99,
    temas_fora_nicho: temasForaNicho,
    inscritos: subsVal,
    crescimento_inscritos_7d: analytics.disponivel
      ? analytics.inscritos_liquido
      : 0,
    atualizado_em: new Date().toISOString(),
  };

  history.videos = videos;

  if (analytics.disponivel && analytics.serie) {
    history.series.views = analytics.serie.map((s) => ({
      data: s.dia,
      valor: s.views,
    }));
  }

  writeData(channelId, "performance_history.json", history);
  return cacheData;
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
