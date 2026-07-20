import fs from "react"; // Mentira, import fs from "fs" no Node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";
import { getChannelAnalytics, getChannelPublicData } from "./youtubeClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const REGISTRY_PATH = path.join(CHANNELS_DIR, "_registry.json");

// Helper para ler arquivos JSON de forma segura
function readJson(p, fallback = {}) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

// Helper para salvar arquivos JSON
function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// Lógica de sincronização e simulação por canal
async function syncChannel(channelId) {
  console.log(`[Sync] Sincronizando canal: ${channelId}...`);
  const config = loadChannelConfig(channelId);
  if (!config) {
    console.error(
      `[Sync] Configuração não encontrada para o canal ${channelId}`
    );
    return;
  }

  const ytChannelId = config?.meta?.youtube_channel_id;
  const cachePath = path.join(
    CHANNELS_DIR,
    channelId,
    "data",
    "analytics_cache.json"
  );
  const historyPath = path.join(
    CHANNELS_DIR,
    channelId,
    "data",
    "performance_history.json"
  );

  // Carregar histórico atual
  const history = readJson(historyPath, {
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
    console.log(
      `[Sync] Dados públicos indisponíveis para o canal ${channelId}. Aplicando simulação offline.`
    );
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
        {
          video_id: "v4_mock",
          title: `Guia definitivo do zero ao avançado em ${nicho}`,
          published_at: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          thumbnail:
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
          views: 12500,
          ctr: 9.1,
          retencao: 58,
          drop_30s: 21,
          duration_seconds: 820,
          sub_nicho: subNichos[1] || "Tutoriais",
        },
        {
          video_id: "v5_mock",
          title: `React & Next.js: Minha Opinião Honesta`,
          published_at: new Date(
            Date.now() - 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
          thumbnail:
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80",
          views: 310,
          ctr: 2.1,
          retencao: 31,
          drop_30s: 55,
          duration_seconds: 380,
          sub_nicho: "Opinião",
        },
      ];
    } else {
      // Incrementar views e simular dinamicamente vídeos existentes
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

  // Mesclar dados privados se disponíveis, senão preencher/manter os simulados
  if (analytics.disponivel) {
    // Para cada vídeo público, tentar preencher métricas de CTR e retenção simuladas por vídeo baseadas na média real da API de analytics
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
    // Se o OAuth não estiver disponível, mantemos ou preenchemos valores base/simulados
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

  // 3) Persistir no cache de analytics
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
  writeJson(cachePath, cacheData);

  // 4) Atualizar performance_history com métricas reais/calculadas
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

  // Calcular médias locais baseadas nos dados finais
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
    // Sincronizar séries sparklines reais se disponíveis
    history.series.views = analytics.serie.map((s) => ({
      data: s.dia,
      valor: s.views,
    }));
  }

  writeJson(historyPath, history);
  console.log(
    `[${channelId}] ✅ sync ok — analytics: ${analytics.disponivel ? "OAuth (real)" : "indisponível (simulado/offline)"}`
  );
}

// Função principal de orquestração
async function run() {
  console.log(
    "[Sync] Iniciando job de sincronização de canais com cliente unificado..."
  );
  const registry = readJson(REGISTRY_PATH, null);
  if (!registry || !registry.channels || registry.channels.length === 0) {
    console.log("[Sync] Nenhum canal registrado no registry.");
    return;
  }

  for (const channel of registry.channels) {
    try {
      await syncChannel(channel.id);
    } catch (err) {
      console.error(
        `[Sync] Falha crítica ao sincronizar canal ${channel.id}:`,
        err
      );
    }
  }
  console.log("[Sync] Finalizado job de sincronização de canais.");
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isDirectRun) {
  run().catch((err) => {
    console.error("[Sync] Erro fatal no run:", err);
    process.exit(1);
  });
}

export { run };
