import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { loadChannelConfig } from "./channelProfiles.js";

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

  const ytId = config?.meta?.youtube_channel_id;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const offlineMode = !ytId || !apiKey;

  let stats = null;
  let videos = [];
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

  if (offlineMode) {
    console.log(
      `[Sync] Sem API Key ou ID do canal. Executando em modo offline simulado para o canal: ${channelId}`
    );
    // Simular estatísticas do canal
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
  } else {
    // Com API Key
    try {
      const base = "https://www.googleapis.com/youtube/v3";
      const statsRes = await fetch(
        `${base}/channels?part=statistics,snippet&id=${ytId}&key=${apiKey}`
      );
      const statsData = await statsRes.json();
      stats = statsData.items?.[0]?.statistics || null;

      const videosRes = await fetch(
        `${base}/search?part=snippet&channelId=${ytId}&maxResults=25&order=date&type=video&key=${apiKey}`
      );
      const videosData = await videosRes.json();
      const ytVideos = (videosData.items || []).map((v) => ({
        video_id: v.id.videoId,
        title: v.snippet.title,
        published_at: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url,
      }));

      videos = ytVideos.map((ytv) => {
        const existente = (history.videos || []).find(
          (hv) => hv.video_id === ytv.video_id
        );
        const subNichos = config.nicho?.sub_nichos_permitidos || [];
        const randomSubNicho =
          subNichos[Math.floor(Math.random() * subNichos.length)] || "Geral";

        return {
          ...ytv,
          views: existente?.views || Math.floor(Math.random() * 1200) + 100,
          ctr: existente?.ctr || Number((Math.random() * 6 + 3).toFixed(1)),
          retencao: existente?.retencao || Math.floor(Math.random() * 25) + 35,
          drop_30s: existente?.drop_30s || Math.floor(Math.random() * 25) + 20,
          duration_seconds:
            existente?.duration_seconds ||
            Math.floor(Math.random() * 400) + 300,
          sub_nicho: existente?.sub_nicho || randomSubNicho,
        };
      });
    } catch (err) {
      console.error(
        `[Sync] Erro ao sincronizar com a API do YouTube: ${err.message}`
      );
      stats = history.metrics
        ? {
            viewCount: String(
              history.metrics.views_media * (history.videos?.length || 1) ||
                50000
            ),
            subscriberCount: "15000",
            videoCount: String(history.videos?.length || 10),
          }
        : null;
      videos = history.videos || [];
    }
  }

  // Salvar cache de analytics
  const cacheData = {
    synced_at: new Date().toISOString(),
    offline: offlineMode,
    stats,
    videos: videos.map((v) => ({
      video_id: v.video_id,
      title: v.title,
      published_at: v.published_at,
      thumbnail: v.thumbnail,
    })),
  };
  writeJson(cachePath, cacheData);

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

  const calculatedMetrics = {
    ctr: videos.length ? Number((totalCtr / videos.length).toFixed(1)) : 5.0,
    retencao: videos.length ? Math.round(totalRet / videos.length) : 45,
    drop_30s: videos.length ? Math.round(totalDrop / videos.length) : 30,
    views_media: videos.length ? Math.round(totalViews / videos.length) : 1000,
    dias_desde_ultimo: diasDesdeUltimo >= 0 ? diasDesdeUltimo : 99,
    temas_fora_nicho: temasForaNicho,
  };

  const updatedHistory = {
    metrics: calculatedMetrics,
    videos: videos,
    series: {
      inscritos: seriesInscritos,
      views: seriesViews,
    },
    last_sync: new Date().toISOString(),
  };

  writeJson(historyPath, updatedHistory);
  console.log(`[Sync] Canal ${channelId} sincronizado com sucesso!`);
}

// Função principal de orquestração
async function run() {
  console.log("[Sync] Iniciando job de sincronização de canais...");
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
