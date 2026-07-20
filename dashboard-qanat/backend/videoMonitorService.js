/**
 * videoMonitorService.js
 * Serviço de monitoramento de criação de vídeos.
 * Descoberta via YouTube Data API v3 + score interno + geração editorial com IA.
 *
 * COMPLIANCE: sem download de audiovisual de terceiros.
 * Apenas metadados públicos + embed oficial. Score interno NÃO é exposto como
 * "métrica do YouTube" — calculado com sinais próprios.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchWithRetry } from "./fetchWithRetry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, "../../");

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ---------------------------------------------------------------------------
// In-memory stores (MVP — substituir por Postgres na Fase 2)
// ---------------------------------------------------------------------------

export const monitorRuns = new Map(); // runId → RunRecord
export const runLogs = new Map(); // runId → LogEntry[]
export const runVideos = new Map(); // runId → CandidateVideo[]
export const runArtifacts = new Map(); // videoId → ArtifactRecord
export const sseClients = new Map(); // runId → Set<Response>

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

export function nowIso() {
  return new Date().toISOString();
}

export function createRunId() {
  return crypto.randomUUID();
}

function getYoutubeApiKey() {
  if (
    process.env.YOUTUBE_API_KEY ||
    process.env.YT_API_KEY ||
    process.env.GOOGLE_API_KEY
  ) {
    return (
      process.env.YOUTUBE_API_KEY ||
      process.env.YT_API_KEY ||
      process.env.GOOGLE_API_KEY
    );
  }
  try {
    const configPath = path.join(WORKSPACE_DIR, "config_qanat.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.youtube_api_key) return config.youtube_api_key;
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

function getGeminiApiKey() {
  if (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_KEY ||
    process.env.GOOGLE_AI_KEY
  ) {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_KEY ||
      process.env.GOOGLE_AI_KEY
    );
  }
  try {
    const configPath = path.join(WORKSPACE_DIR, "config_qanat.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.gemini_api_key) return config.gemini_api_key;
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || null;
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

export function registerSseClient(runId, res) {
  if (!sseClients.has(runId)) sseClients.set(runId, new Set());
  sseClients.get(runId).add(res);
}

export function unregisterSseClient(runId, res) {
  sseClients.get(runId)?.delete(res);
}

function broadcast(runId, eventType, payload) {
  const clients = sseClients.get(runId);
  if (!clients || clients.size === 0) return;
  const data = JSON.stringify({ type: eventType, ...payload });
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

export function appendLog(runId, level, message, extra = {}) {
  const entry = { ts: nowIso(), level, message, ...extra };
  if (!runLogs.has(runId)) runLogs.set(runId, []);
  runLogs.get(runId).push(entry);
  broadcast(runId, "log.appended", { log: entry });
  return entry;
}

// ---------------------------------------------------------------------------
// Run state
// ---------------------------------------------------------------------------

export function updateRun(runId, patch) {
  const run = monitorRuns.get(runId);
  if (!run) return;
  Object.assign(run, patch, { updatedAt: nowIso() });
  monitorRuns.set(runId, run);
  broadcast(runId, "run.updated", { run });
  return run;
}

export function createRun({
  niche,
  region,
  mode,
  maxVideos,
  sources,
  workspaceId,
}) {
  const id = createRunId();
  const run = {
    id,
    workspaceId: workspaceId || "default",
    nicheName: niche,
    region: region || "BR",
    mode: mode || "metadata_only",
    sources: sources || ["youtube"],
    maxVideos: Math.min(maxVideos || 15, 30),
    status: "queued",
    progress: 0,
    candidateCount: 0,
    rightsStatus: "public_metadata_only",
    costEstimate: 0,
    errorCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    startedAt: null,
    endedAt: null,
  };
  monitorRuns.set(id, run);
  runLogs.set(id, []);
  runVideos.set(id, []);
  appendLog(
    id,
    "info",
    `Run criada. Nicho: "${niche}" · Região: ${region} · Modo: ${mode}`
  );
  return run;
}

// ---------------------------------------------------------------------------
// YouTube Discovery
// ---------------------------------------------------------------------------

async function ytFetch(path, params = {}) {
  const apiKey = getYoutubeApiKey();
  const qs = new URLSearchParams({ ...params, key: apiKey || "" }).toString();
  const url = `${YT_API_BASE}${path}?${qs}`;
  const res = await fetchWithRetry(url, { timeout: 12000 });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`YouTube API ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

function regionToLangHint(region = "BR") {
  const map = { BR: "pt-BR", PT: "pt-PT", US: "en-US", MX: "es-MX" };
  return map[region.toUpperCase()] || "pt-BR";
}

export async function discoverVideos(runId, { niche, region, maxVideos }) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) {
    appendLog(
      runId,
      "warn",
      "YOUTUBE_API_KEY não configurada. Usando dados de demonstração."
    );
    return generateDemoVideos(niche, maxVideos);
  }

  appendLog(
    runId,
    "info",
    `Buscando vídeos para "${niche}" na região ${region}...`
  );

  // 1. search.list — vídeos relevantes por query
  let searchItems = [];
  try {
    const searchData = await ytFetch("/search", {
      part: "snippet",
      q: niche,
      type: "video",
      regionCode: region || "BR",
      relevanceLanguage: regionToLangHint(region),
      maxResults: Math.min(maxVideos, 25),
      order: "viewCount",
    });
    searchItems = searchData.items || [];
    appendLog(
      runId,
      "info",
      `Encontrados ${searchItems.length} vídeos no search.list.`
    );
  } catch (err) {
    appendLog(runId, "error", `Falha no search.list: ${err.message}`);
  }

  // 2. videos.list — estatísticas detalhadas dos vídeos encontrados
  const videoIds = searchItems.map((i) => i.id?.videoId).filter(Boolean);
  let videoStats = {};
  if (videoIds.length > 0) {
    try {
      const statsData = await ytFetch("/videos", {
        part: "statistics,contentDetails,snippet",
        id: videoIds.join(","),
        maxResults: videoIds.length,
      });
      for (const item of statsData.items || []) {
        videoStats[item.id] = item;
      }
      appendLog(
        runId,
        "info",
        `Estatísticas obtidas para ${Object.keys(videoStats).length} vídeos.`
      );
    } catch (err) {
      appendLog(runId, "warn", `Falha ao obter estatísticas: ${err.message}`);
    }
  }

  // 3. Montar candidatos com score interno
  const candidates = searchItems
    .filter((item) => item.id?.videoId)
    .map((item) => {
      const id = item.id.videoId;
      const stats = videoStats[id]?.statistics || {};
      const snippet = item.snippet || {};
      const detailSnippet = videoStats[id]?.snippet || snippet;
      const contentDetails = videoStats[id]?.contentDetails || {};

      const viewCount = parseInt(stats.viewCount || "0", 10);
      const likeCount = parseInt(stats.likeCount || "0", 10);
      const commentCount = parseInt(stats.commentCount || "0", 10);

      return {
        id,
        videoId: id,
        title: snippet.title || detailSnippet.title || "Sem título",
        description: (
          snippet.description ||
          detailSnippet.description ||
          ""
        ).slice(0, 300),
        channelTitle: snippet.channelTitle || detailSnippet.channelTitle || "",
        channelId: snippet.channelId || detailSnippet.channelId || "",
        publishedAt: snippet.publishedAt || detailSnippet.publishedAt || "",
        thumbnailUrl:
          detailSnippet.thumbnails?.high?.url ||
          detailSnippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.high?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        viewCount,
        likeCount,
        commentCount,
        duration: contentDetails.duration || "",
        rightsStatus: "public_metadata_only",
        // Score interno — NÃO é "métrica do YouTube"
        internalScore: computeInternalScore({
          viewCount,
          likeCount,
          commentCount,
          publishedAt: snippet.publishedAt,
        }),
        summary: null,
        artifacts: null,
      };
    })
    .sort((a, b) => b.internalScore - a.internalScore);

  return candidates;
}

/**
 * Score interno baseado em sinais próprios.
 * NÃO é exibido como "métrica oficial do YouTube".
 */
export function computeInternalScore({
  viewCount = 0,
  likeCount = 0,
  commentCount = 0,
  publishedAt = "",
}) {
  // Recência — peso maior para vídeos recentes
  let recencyScore = 0;
  if (publishedAt) {
    const ageMs = Date.now() - new Date(publishedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    recencyScore =
      ageDays < 7 ? 100 : ageDays < 30 ? 70 : ageDays < 90 ? 40 : 10;
  }

  // Engajamento relativo
  const engagementRate =
    viewCount > 0 ? ((likeCount + commentCount * 2) / viewCount) * 100 : 0;
  const engagementScore = Math.min(engagementRate * 10, 100);

  // Volume de views (log normalizado)
  const viewScore =
    viewCount > 0 ? Math.min((Math.log10(viewCount) / 7) * 100, 100) : 0;

  return Math.round(
    recencyScore * 0.35 + engagementScore * 0.35 + viewScore * 0.3
  );
}

/**
 * Dados de demonstração quando a API key não está configurada.
 */
function generateDemoVideos(niche, maxVideos = 10) {
  const titles = [
    `${niche}: o que ninguém te conta`,
    `5 estratégias de ${niche} para 2025`,
    `Começando do ZERO em ${niche}`,
    `${niche} FUNCIONA? Minha experiência`,
    `O maior ERRO de ${niche} que cometi`,
    `${niche} em 10 minutos — guia completo`,
    `Por que ${niche} mudou minha vida`,
    `${niche} vs concorrentes — análise`,
    `Como DOBREI resultados com ${niche}`,
    `${niche}: verdades que ninguém fala`,
  ];

  return titles.slice(0, maxVideos).map((title, i) => {
    const demoId = `demo_${i}_${Date.now()}`;
    const viewCount = Math.floor(Math.random() * 500000) + 10000;
    return {
      id: demoId,
      videoId: demoId,
      title,
      description: `Vídeo demonstração — configure YOUTUBE_API_KEY para dados reais.`,
      channelTitle: `Canal Demo ${i + 1}`,
      channelId: `UCdemo${i}`,
      publishedAt: new Date(
        Date.now() - Math.random() * 30 * 86400000
      ).toISOString(),
      thumbnailUrl: `https://picsum.photos/seed/${demoId}/320/180`,
      viewCount,
      likeCount: Math.floor(viewCount * 0.04),
      commentCount: Math.floor(viewCount * 0.005),
      duration: "PT8M30S",
      rightsStatus: "public_metadata_only",
      internalScore: computeInternalScore({
        viewCount,
        publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      }),
      summary: null,
      artifacts: null,
      isDemo: true,
    };
  });
}

// ---------------------------------------------------------------------------
// AI Artifact Generation
// ---------------------------------------------------------------------------

async function callGemini(prompt, temperature = 0.7) {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY não configurada.");

  const model = "gemini-2.0-flash-lite";
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${key}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 2048 },
  };

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(prompt, temperature = 0.7) {
  const key = getOpenAiApiKey();
  if (!key) throw new Error("OPENAI_API_KEY não configurada.");

  const res = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 2048,
      }),
      timeout: 30000,
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI API ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callAI(prompt, temperature = 0.7) {
  try {
    return await callGemini(prompt, temperature);
  } catch (geminiErr) {
    try {
      return await callOpenAI(prompt, temperature);
    } catch (openaiErr) {
      throw new Error(
        `Gemini: ${geminiErr.message} | OpenAI: ${openaiErr.message}`
      );
    }
  }
}

function parseArtifactJson(raw) {
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function generateArtifacts(
  runId,
  video,
  tasks = [
    "summary",
    "titles",
    "tags",
    "script",
    "thumbnail_brief",
    "edit_ideas",
  ]
) {
  const tasksStr = tasks.join(", ");

  const prompt = `Você é um especialista em criação de vídeos para YouTube em português brasileiro.

Analise o vídeo abaixo e gere os artefatos editoriais solicitados.

## Dados do vídeo (metadados públicos)
- Título: ${video.title}
- Canal: ${video.channelTitle}
- Visualizações: ${video.viewCount?.toLocaleString("pt-BR") || "N/A"}
- Curtidas: ${video.likeCount?.toLocaleString("pt-BR") || "N/A"}
- Publicado em: ${video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("pt-BR") : "N/A"}
- Descrição: ${video.description || "N/A"}

## Tarefas solicitadas: ${tasksStr}

IMPORTANTE: Gere IDEIAS ORIGINAIS inspiradas na estrutura e tema do vídeo — NÃO copie o conteúdo original.

Responda EXCLUSIVAMENTE em JSON válido com esta estrutura:
{
  "summary": "Resumo do tema e por que este vídeo está performando bem (3-5 linhas)",
  "titles": ["Título A", "Título B", "Título C", "Título D", "Título E"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "script": {
    "hook": "Gancho dos primeiros 3 segundos — deve ser impactante",
    "beats": ["Beat 1 — ponto principal", "Beat 2", "Beat 3", "Beat 4"],
    "cta": "Chamada para ação final"
  },
  "thumbnail_brief": {
    "concept": "Conceito visual da thumbnail",
    "text_overlay": "TEXTO EM CAIXA ALTA (máx 4 palavras)",
    "frame_reference": "Descrição do enquadramento ideal"
  },
  "edit_ideas": [
    "Ideia de edição 1",
    "Ideia de edição 2",
    "Ideia de edição 3"
  ]
}`;

  const raw = await callAI(prompt, 0.75);
  const parsed = parseArtifactJson(raw);

  if (!parsed) {
    // Retornar estrutura básica se falhar o parse
    return {
      summary: raw.slice(0, 500),
      titles: [],
      tags: [],
      script: { hook: "", beats: [], cta: "" },
      thumbnail_brief: { concept: "", text_overlay: "", frame_reference: "" },
      edit_ideas: [],
      rawResponse: raw,
    };
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Run pipeline (assíncrono — chamado após criar o run)
// ---------------------------------------------------------------------------

export async function executeDiscoveryPipeline(runId) {
  const run = monitorRuns.get(runId);
  if (!run) return;

  try {
    updateRun(runId, {
      status: "discovering",
      progress: 5,
      startedAt: nowIso(),
    });

    // Etapa 1: Descoberta
    appendLog(runId, "info", "Etapa 1/3 — Descoberta de vídeos candidatos...");
    const videos = await discoverVideos(runId, {
      niche: run.nicheName,
      region: run.region,
      maxVideos: run.maxVideos,
    });

    runVideos.set(runId, videos);
    updateRun(runId, {
      status: "enriching",
      progress: 60,
      candidateCount: videos.length,
    });
    broadcast(runId, "videos.discovered", { videos });
    appendLog(runId, "info", `${videos.length} vídeos candidatos encontrados.`);

    // Etapa 2: Enriquecimento metadata
    appendLog(runId, "info", "Etapa 2/3 — Enriquecimento de metadados...");
    updateRun(runId, { progress: 75 });

    // Etapa 3: Concluído
    appendLog(runId, "info", "Etapa 3/3 — Run concluída com sucesso.");
    updateRun(runId, {
      status: "completed",
      progress: 100,
      endedAt: nowIso(),
    });
  } catch (err) {
    appendLog(runId, "error", `Falha na pipeline: ${err.message}`);
    updateRun(runId, {
      status: "failed",
      errorCount: (monitorRuns.get(runId)?.errorCount || 0) + 1,
      endedAt: nowIso(),
    });
  }
}
