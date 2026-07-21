/**
 * Ressuscitador de vídeos — reformula metadados SEO de vídeos do canal YouTube (+N dias).
 * Varre uploads do canal (não só pastas Lumiera). Projeto local é usado quando existir (roteiro).
 * Dois batches diários (manhã 11h + tarde 18h, 5 vídeos cada). Auto só com app aberto.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  collectLumieraPublishedVideos,
  filterExistingLumieraVideos,
} from "./youtubeChannelAnalytics.js";
import {
  assertTitleTestScopes,
  getYoutubeAccessToken,
  throwIfInsufficientScope,
} from "./youtubeTitleAnalytics.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  parseYoutubeMetadataMarkdown,
  resolveYoutubeMetadataContext,
  YOUTUBE_METADATA_PIPELINE_VERSION,
} from "./youtubeMetadataOptimizer.js";
import { injectStudioAgentsContext } from "./studioAgents.js";
import {
  compareResurrectionOpportunity,
  diagnoseResurrectionOpportunity,
} from "./videoResurrectionDiagnosis.js";
import {
  readJsonSafe,
  writeJsonAtomic,
  localDateString,
  daysSince,
  youtubeDataGet,
} from "./shared/commonUtils.js";

export const RESURRECTOR_FILE = "youtube_video_resurrector.json";
const MAX_ACTIVITY_LOG = 250;

let resurrectorMutex = Promise.resolve();

/** Serializa mutações do estado do ressuscitador (evita last-write-wins entre rotas). */
export function withResurrectorMutex(fn) {
  const job = resurrectorMutex.then(() => fn());
  resurrectorMutex = job.then(() => undefined).catch(() => undefined);
  return job;
}

export const RESURRECTOR_STATUSES = [
  "queued",
  "generating",
  "review",
  "applied",
  "skipped",
  "failed",
];

export const RESURRECTOR_SLOTS = ["morning", "afternoon"];

const DEFAULT_SETTINGS = {
  enabled: true,
  autoRunWhenAppOpen: true,
  autoApplyToYoutube: true,
  minAgeDays: 10,
  morningBatchSize: 5,
  afternoonBatchSize: 5,
  morningHour: 11,
  afternoonHour: 18,
  cooldownDays: 45,
};

/** Janela de automação: HH:00 até HH:05 (inclusive). */
export const RESURRECTOR_AUTO_WINDOW_END_MINUTE = 5;

/**
 * true se estamos nos minutos 0–5 da hora do lote (ex.: 11:00–11:05).
 */
export function isWithinResurrectorAutoWindow(
  now = new Date(),
  hour = 11,
  endMinute = RESURRECTOR_AUTO_WINDOW_END_MINUTE
) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return false;
  const slotHour = Math.max(0, Math.min(23, Math.floor(h)));
  const end = Math.max(0, Math.min(59, Number(endMinute) || 5));
  return now.getHours() === slotHour && now.getMinutes() <= end;
}

function formatLocalTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function normalizeResurrectorSlot(slot) {
  return slot === "afternoon" ? "afternoon" : "morning";
}

export function normalizeResurrectorTrigger(trigger) {
  return trigger === "auto" ? "auto" : "manual";
}

function migrateResurrectorSettings(stored = {}) {
  const legacyDaily = Number(stored.dailyBatchSize);
  const half = Number.isFinite(legacyDaily)
    ? Math.max(1, Math.floor(legacyDaily / 2))
    : 5;
  const morningBatchSize = Number.isFinite(Number(stored.morningBatchSize))
    ? Number(stored.morningBatchSize)
    : half;
  const afternoonBatchSize = Number.isFinite(Number(stored.afternoonBatchSize))
    ? Number(stored.afternoonBatchSize)
    : Number.isFinite(legacyDaily)
      ? Math.max(1, legacyDaily - half)
      : 5;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    autoRunWhenAppOpen:
      typeof stored.autoRunWhenAppOpen === "boolean"
        ? stored.autoRunWhenAppOpen
        : typeof stored.autoRunDaily === "boolean"
          ? stored.autoRunDaily
          : DEFAULT_SETTINGS.autoRunWhenAppOpen,
    morningBatchSize: Math.max(1, Math.min(20, morningBatchSize)),
    afternoonBatchSize: Math.max(1, Math.min(20, afternoonBatchSize)),
    morningHour: Number.isFinite(Number(stored.morningHour))
      ? Number(stored.morningHour)
      : DEFAULT_SETTINGS.morningHour,
    afternoonHour: Number.isFinite(Number(stored.afternoonHour))
      ? Number(stored.afternoonHour)
      : DEFAULT_SETTINGS.afternoonHour,
    autoApplyToYoutube:
      typeof stored.autoApplyToYoutube === "boolean"
        ? stored.autoApplyToYoutube
        : DEFAULT_SETTINGS.autoApplyToYoutube,
  };
}

function emptyDailyRuns(date = localDateString()) {
  return { date, morning: null, afternoon: null };
}

function emptyCycle(number = 1) {
  return {
    number,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

function comparePublishedAtAsc(a, b) {
  const ta = new Date(a?.publishedAt || 0).getTime();
  const tb = new Date(b?.publishedAt || 0).getTime();
  if (ta !== tb) return ta - tb;
  return String(a?.videoId || "").localeCompare(String(b?.videoId || ""));
}

export function getResurrectorCycleNumber(state) {
  return Math.max(1, Number(state?.cycle?.number) || 1);
}

export function isVideoAttemptedInCurrentCycle(state, videoId) {
  const cycleNum = getResurrectorCycleNumber(state);
  const item = (state.items || []).find((i) => i.videoId === videoId);
  if (!item) return false;
  if (item.cycleNumber !== cycleNum) return false;
  return item.status !== "queued";
}

export function isVideoBatchedInCurrentCycle(state, videoId) {
  if (!isVideoAttemptedInCurrentCycle(state, videoId)) return false;
  const item = (state.items || []).find((i) => i.videoId === videoId);
  return item?.status !== "failed";
}

export function appendResurrectorLog(state, level, message, meta = {}) {
  const entry = {
    at: new Date().toISOString(),
    level,
    message: String(message || ""),
    ...meta,
  };
  state.activityLog = [entry, ...(state.activityLog || [])].slice(
    0,
    MAX_ACTIVITY_LOG
  );
  return entry;
}

export function resetResurrectorFailedItems(state) {
  const cycleNum = getResurrectorCycleNumber(state);
  let count = 0;
  for (let i = 0; i < (state.items || []).length; i += 1) {
    const item = state.items[i];
    if (item.status !== "failed") continue;
    if (item.cycleNumber != null && item.cycleNumber !== cycleNum) continue;
    state.items[i] = {
      ...resetItemForNewCycle(item),
      lastError: item.error || item.lastError || null,
    };
    count += 1;
  }
  if (count > 0) {
    appendResurrectorLog(
      state,
      "info",
      `${count} vídeo(s) com falha recolocados na fila.`
    );
  }
  return count;
}

export function resetItemForNewCycle(item) {
  const now = new Date().toISOString();
  return {
    ...item,
    status: "queued",
    cycleNumber: undefined,
    proposedMetadata: null,
    selectedTitle: null,
    metadataRaw: null,
    error: null,
    appliedAt: null,
    thumbnailApplied: false,
    thumbnailLocalPath: null,
    thumbnailStatus: item.format === "LONG" ? "awaiting_manual" : "n/a",
    thumbnailError: null,
    updatedAt: now,
  };
}

export function advanceResurrectorCycle(state) {
  const prev = getResurrectorCycleNumber(state);
  const now = new Date().toISOString();
  state.cycle = {
    number: prev + 1,
    startedAt: now,
    completedAt: null,
    previousCycleNumber: prev,
    previousCompletedAt: now,
  };

  for (let i = 0; i < (state.items || []).length; i += 1) {
    const item = state.items[i];
    if (item.status === "review" || item.status === "generating") continue;
    if (["applied", "skipped", "failed"].includes(item.status)) {
      state.items[i] = resetItemForNewCycle(item);
    }
  }

  return state;
}

export function computeResurrectorCycleProgress(state, eligible = []) {
  const total = eligible.length;
  const cycleNum = getResurrectorCycleNumber(state);
  const batched = eligible.filter((row) =>
    isVideoAttemptedInCurrentCycle(state, row.videoId)
  ).length;
  const pending = Math.max(0, total - batched);
  const nextVideo =
    eligible.find(
      (row) => !isVideoAttemptedInCurrentCycle(state, row.videoId)
    ) || null;

  return {
    number: cycleNum,
    startedAt: state.cycle?.startedAt || null,
    completedAt: state.cycle?.completedAt || null,
    total,
    batched,
    pending,
    complete: total > 0 && batched >= total,
    nextVideoId: nextVideo?.videoId || null,
    nextVideoTitle: nextVideo?.title || null,
    order: "oldest_first",
  };
}

export function maybeCompleteResurrectorCycle(state, eligible = []) {
  const progress = computeResurrectorCycleProgress(state, eligible);
  const cycleNum = getResurrectorCycleNumber(state);
  const pendingWork = (state.items || []).some(
    (i) =>
      i.cycleNumber === cycleNum && ["review", "generating"].includes(i.status)
  );
  if (!progress.complete || pendingWork)
    return { state, advanced: false, progress };

  const advancedState = advanceResurrectorCycle({ ...state });
  const nextProgress = computeResurrectorCycleProgress(advancedState, eligible);
  return { state: advancedState, advanced: true, progress: nextProgress };
}

export function getTodayDailyRuns(state, now = new Date()) {
  const today = localDateString(now);
  if (state.dailyRuns?.date === today) return state.dailyRuns;
  return emptyDailyRuns(today);
}

export function slotAlreadyRanToday(state, slot, now = new Date()) {
  const runs = getTodayDailyRuns(state, now);
  return Boolean(runs[normalizeResurrectorSlot(slot)]?.ranAt);
}

export function getMorningVideoIdsToday(state, now = new Date()) {
  const runs = getTodayDailyRuns(state, now);
  return Array.isArray(runs.morning?.videoIds) ? runs.morning.videoIds : [];
}

export function getSlotBatchSize(settings = {}, slot = "morning") {
  const normalized = normalizeResurrectorSlot(slot);
  if (normalized === "afternoon") {
    return Math.max(
      1,
      Math.min(
        20,
        Number(settings.afternoonBatchSize) ||
          DEFAULT_SETTINGS.afternoonBatchSize
      )
    );
  }
  return Math.max(
    1,
    Math.min(
      20,
      Number(settings.morningBatchSize) || DEFAULT_SETTINGS.morningBatchSize
    )
  );
}

function statePath(workspaceDir) {
  return path.join(workspaceDir, RESURRECTOR_FILE);
}

export function loadResurrectorState(workspaceDir) {
  const stored = readJsonSafe(statePath(workspaceDir)) || {};
  const settings = migrateResurrectorSettings(stored.settings || {});
  const today = localDateString();
  const dailyRuns =
    stored.dailyRuns?.date === today ? stored.dailyRuns : emptyDailyRuns(today);

  return {
    version: 3,
    settings,
    cycle: stored.cycle?.number ? stored.cycle : emptyCycle(1),
    dailyRuns,
    lastDailyRunAt: stored.lastDailyRunAt || null,
    lastDailyRunDate: stored.lastDailyRunDate || null,
    items: Array.isArray(stored.items) ? stored.items : [],
    history: Array.isArray(stored.history) ? stored.history.slice(0, 200) : [],
    activityLog: Array.isArray(stored.activityLog)
      ? stored.activityLog.slice(0, MAX_ACTIVITY_LOG)
      : [],
    updatedAt: stored.updatedAt || null,
  };
}

export function saveResurrectorState(workspaceDir, state) {
  const next = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(statePath(workspaceDir), next);
  return next;
}

function normalizeFormat(format) {
  const f = String(format || "").toUpperCase();
  return f === "SHORTS" || f === "SHORT" ? "SHORT" : "LONG";
}

const ytGet = (token, apiPath, params) =>
  youtubeDataGet(token, apiPath, params, { onError: throwIfInsufficientScope });

export async function fetchAllChannelUploadVideoIds(
  accessToken,
  { maxVideos = 500 } = {}
) {
  const channelData = await ytGet(accessToken, "channels", {
    part: "contentDetails,snippet",
    mine: "true",
  });
  const channelItem = channelData?.items?.[0];
  const uploadsPlaylistId =
    channelItem?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Playlist de uploads do canal não encontrada.");
  }

  const videoIds = [];
  let pageToken = "";
  const cap = Math.max(1, Math.min(2000, Number(maxVideos) || 500));

  while (videoIds.length < cap) {
    const playlistData = await ytGet(accessToken, "playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, cap - videoIds.length),
      ...(pageToken ? { pageToken } : {}),
    });
    for (const entry of playlistData?.items || []) {
      const videoId = entry?.contentDetails?.videoId;
      if (videoId) videoIds.push(videoId);
    }
    pageToken = playlistData?.nextPageToken || "";
    if (!pageToken) break;
  }

  return {
    channelId: channelItem?.id || null,
    channelTitle: channelItem?.snippet?.title || "",
    videoIds,
  };
}

function buildLumieraProjectByVideoId(projectsRoot) {
  const map = new Map();
  for (const row of filterExistingLumieraVideos(
    collectLumieraPublishedVideos(projectsRoot)
  )) {
    if (row.videoId) map.set(row.videoId, row);
  }
  return map;
}

function readProjectTranscript(projectPath) {
  const storyboardPath = path.join(projectPath, "storyboard.json");
  const transcriptPath = path.join(projectPath, "transcripts_readable.txt");
  const configPath = path.join(projectPath, "config_qanat.json");
  const storyboard = readJsonSafe(storyboardPath) || {};
  const config = readJsonSafe(configPath) || {};

  if (
    typeof storyboard.narrative_script === "string" &&
    storyboard.narrative_script.trim().length > 80
  ) {
    return storyboard.narrative_script.trim();
  }
  if (fs.existsSync(transcriptPath)) {
    const t = fs.readFileSync(transcriptPath, "utf8").trim();
    if (t.length > 40) return t;
  }
  if (Array.isArray(storyboard.visual_prompts)) {
    const joined = storyboard.visual_prompts
      .map((vp) => vp?.narration_text)
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (joined.length > 40) return joined;
  }
  return String(config.upload_metadata?.youtube?.description || "").trim();
}

function readResurrectorTranscript(item = {}) {
  if (item.projectPath && fs.existsSync(item.projectPath)) {
    const fromProject = readProjectTranscript(item.projectPath);
    if (fromProject && fromProject.length >= 40) return fromProject;
  }
  // Sem projeto Lumiera: usa título + descrição completa + tags como "roteiro" para extractTitleFacts
  const title = String(item.currentMetadata?.title || item.title || "").trim();
  const description = String(item.currentMetadata?.description || "").trim();
  const tags = (item.currentMetadata?.tags || []).join(", ");
  const parts = [
    title,
    description,
    tags ? `Palavras-chave do vídeo: ${tags}` : "",
  ].filter(Boolean);
  const fallback = parts.join("\n\n").trim();
  return fallback.length >= 40 ? fallback : "";
}

function parseTagsRaw(raw) {
  if (Array.isArray(raw))
    return raw.map((t) => String(t).trim()).filter(Boolean);
  if (!raw) return [];
  return String(raw)
    .replace(/;/g, ",")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function appendHashtagsToDescription(description, hashtags) {
  const base = String(description || "").trim();
  const tags = String(hashtags || "").trim();
  if (!tags) return base;
  if (
    base
      .toLowerCase()
      .includes(tags.toLowerCase().split(/\s+/)[0]?.replace("#", ""))
  )
    return base;
  return `${base}\n\n${tags}`.trim();
}

/** Extrai palavras-chave de conteúdo específico do título + descrição + tags. */
function extractResurrectorAnchors(title, description, tags = []) {
  const fullText = [title, description, tags.join(" ")].join(" ");
  // Capturar: nomes próprios, números com unidades, termos específicos
  const properNouns = [
    ...fullText.matchAll(
      /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){0,2}\b/g
    ),
  ]
    .map((m) => m[0])
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          "O",
          "A",
          "Os",
          "As",
          "Um",
          "Uma",
          "No",
          "Na",
          "Em",
          "De",
          "Do",
          "Da",
          "E",
          "Mas",
          "Se",
          "Você",
        ].includes(w)
    );
  const numbers = [
    ...fullText.matchAll(
      /\b\d+[\d.,]*\s*(?:%|mil|milhões?|bilhões?|anos?|séculos?|km|metros?|toneladas?|pessoas?|dias?|horas?|min)?\b/gi
    ),
  ]
    .map((m) => m[0].trim())
    .filter((n) => n.length >= 2 && !/^[0-9]$/.test(n));
  const tagAnchors = tags.slice(0, 8);
  const unique = [
    ...new Set([
      ...properNouns.slice(0, 8),
      ...numbers.slice(0, 4),
      ...tagAnchors,
    ]),
  ];
  return unique.slice(0, 15);
}

export function buildResurrectorRefreshPrompt({
  currentTitle = "",
  currentDescription = "",
  currentTags = [],
  transcript = "",
  format = "LONG",
  niche = "Geral",
  ageDays = 0,
  views = 0,
}) {
  const base = buildYoutubeMetadataPrompt({
    transcript,
    chaptersText: "",
    storyboard: {},
    config: { niche },
    format,
    niche,
    totalDuration: 0,
    category: "default",
    profile: {},
    rpmHint: {},
  });

  // Âncoras extraídas do conteúdo real do vídeo
  const anchors = extractResurrectorAnchors(
    currentTitle,
    currentDescription,
    currentTags
  );
  const anchorsBlock = anchors.length
    ? `\n## ÂNCORAS DO CONTEÚDO REAL (obrigatório — cada título DEVE referenciar pelo menos 1 âncora)\n\nEstas palavras/números foram extraídos do título e descrição ATUAIS do vídeo.\nEles representam o tema específico do vídeo — não invente temas que não estejam aqui:\n${anchors.map((a) => `- ${a}`).join("\n")}`
    : "";

  // Usar mais da descrição atual como contexto (até 3000 chars)
  const descriptionSnippet = String(currentDescription || "").slice(0, 3000);

  return `${base}\n${anchorsBlock}

## CONTEXTO RESSUSCITADOR (vídeo antigo no ar)

Este vídeo já está publicado há ${ageDays} dias (${views} views no período recente).
Objetivo: **reformular** título, descrição, hashtags e tags para melhorar CTR e descoberta — SEM mentir sobre o conteúdo.

Metadados ATUAIS no YouTube (referência completa — leia antes de escrever qualquer título):
- Título atual: ${currentTitle || "(desconhecido)"}
- Descrição atual: ${descriptionSnippet || "(vazia)"}
- Tags atuais: ${(currentTags || []).slice(0, 20).join(", ") || "(nenhuma)"}

REGRAS EXTRA (PRIORIDADE MÁXIMA):
- O novo título deve ser claramente diferente do atual, mas sobre O MESMO vídeo (mesmos fatos, nomes, lugares e números).
- PROIBIDO inventar tema que não aparece na descrição/roteiro acima.
- Cada título deve mencionar pelo menos 1 âncora (nome, lugar, número ou fato específico do vídeo).
- Priorize palavras-chave de busca + gancho de clique honesto.
- Títulos genéricos como "3 top...", "As melhores...", "Tudo sobre..." sem especificidade serão rejeitados.
- Para LONGO: inclua capítulos se houver timestamps; thumbnails A/B são só briefing (upload manual).`;
}

export async function fetchYoutubeVideosSnippet(accessToken, videoIds = []) {
  const ids = [...new Set(videoIds.map(String).filter(Boolean))];
  if (!ids.length) return new Map();

  const map = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await ytGet(accessToken, "videos", {
      part: "snippet,statistics",
      id: chunk.join(","),
    });
    for (const item of data?.items || []) {
      const sn = item.snippet || {};
      map.set(item.id, {
        videoId: item.id,
        title: sn.title || "",
        description: sn.description || "",
        tags: Array.isArray(sn.tags) ? sn.tags : [],
        publishedAt: sn.publishedAt || "",
        thumbnailUrl:
          sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || "",
        viewCount: Number(item.statistics?.viewCount || 0),
      });
    }
  }
  return map;
}

export async function updateYoutubeVideoMetadata(
  accessToken,
  videoId,
  {
    title,
    description,
    tags = [],
    categoryId = "22",
    defaultLanguage = "pt",
  } = {}
) {
  const getRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const getData = await getRes.json();
  if (!getRes.ok) {
    throwIfInsufficientScope(getData?.error?.message || "Falha ao ler vídeo.");
    throw new Error(getData?.error?.message || "Falha ao ler vídeo.");
  }
  const video = getData?.items?.[0];
  if (!video?.snippet)
    throw new Error("Vídeo não encontrado no canal conectado.");

  const tagList = parseTagsRaw(tags).slice(0, 30);
  const updateRes = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: videoId,
        snippet: {
          ...video.snippet,
          title: String(title || video.snippet.title).slice(0, 100),
          description: String(description || "").slice(0, 4900),
          tags: tagList.length ? tagList : video.snippet.tags,
          categoryId: String(categoryId || video.snippet.categoryId || "22"),
          defaultLanguage:
            defaultLanguage || video.snippet.defaultLanguage || "pt",
        },
      }),
    }
  );
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throwIfInsufficientScope(
      updateData?.error?.message || "Falha ao atualizar metadados."
    );
    throw new Error(
      updateData?.error?.message || "Falha ao atualizar metadados."
    );
  }
  return updateData;
}

export async function uploadYoutubeVideoThumbnail(
  accessToken,
  videoId,
  imagePath
) {
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";
  const url = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Falha ao enviar thumbnail.");
  }
  return true;
}

function findResurrectorItem(state, videoId) {
  return (state.items || []).find((i) => i.videoId === videoId) || null;
}

function hasBlockingResurrectorItem(state, videoId) {
  const item = findResurrectorItem(state, videoId);
  if (!item) return false;
  return ["review", "generating"].includes(item.status);
}

function hasActiveQueueItem(state, videoId) {
  const cycleNum = getResurrectorCycleNumber(state);
  const item = findResurrectorItem(state, videoId);
  if (!item) return false;
  if (hasBlockingResurrectorItem(state, videoId)) return true;
  if (item.cycleNumber === cycleNum && item.status === "queued") return true;
  return false;
}

function buildResurrectorRow(base, sn, merged, extras = {}) {
  const ageDays = daysSince(sn.publishedAt);
  const minAgeDays = merged.minAgeDays;
  const daysUntilEligible = Math.max(0, minAgeDays - ageDays);
  const eligibleOn =
    daysUntilEligible > 0
      ? new Date(
          new Date(sn.publishedAt).getTime() + minAgeDays * 24 * 60 * 60 * 1000
        ).toISOString()
      : sn.publishedAt;

  return {
    videoId: base.videoId,
    projectName: base.projectName,
    projectPath: base.projectPath || null,
    format: normalizeFormat(base.format),
    niche: base.niche || "",
    title: sn.title || base.title || "",
    publishedAt: sn.publishedAt,
    ageDays,
    daysUntilEligible,
    eligibleOn,
    thumbnailUrl: sn.thumbnailUrl,
    viewCount: sn.viewCount,
    hasLumieraProject: Boolean(extras.hasLumieraProject),
    source: extras.source || "channel",
    currentMetadata: {
      title: sn.title,
      description: sn.description,
      tags: sn.tags,
    },
  };
}

export function buildResurrectorScanDiagnostics(
  rows = [],
  settings = {},
  meta = {}
) {
  const minAgeDays = settings.minAgeDays ?? DEFAULT_SETTINGS.minAgeDays;
  const tooYoung = rows
    .filter((row) => row.ageDays < minAgeDays)
    .sort((a, b) => (b.ageDays || 0) - (a.ageDays || 0));
  const eligibleNow = rows.filter((row) => row.ageDays >= minAgeDays);
  const nextToQualify = tooYoung[0] || null;
  const channelTotal = meta.channelTotal ?? rows.length;

  return {
    channelTitle: meta.channelTitle || null,
    channelTotal,
    withLumieraProject: rows.filter((row) => row.hasLumieraProject).length,
    channelOnlyCount: rows.filter((row) => !row.hasLumieraProject).length,
    publishedOnDisk: channelTotal,
    minAgeDays,
    eligibleCount: eligibleNow.length,
    tooYoungCount: tooYoung.length,
    tooYoung: tooYoung.slice(0, 12).map((row) => ({
      videoId: row.videoId,
      title: row.title,
      projectName: row.projectName,
      ageDays: row.ageDays,
      daysUntilEligible: row.daysUntilEligible,
      eligibleOn: row.eligibleOn,
      hasLumieraProject: row.hasLumieraProject,
    })),
    nextToQualify: nextToQualify
      ? {
          title: nextToQualify.title,
          projectName: nextToQualify.projectName,
          ageDays: nextToQualify.ageDays,
          daysUntilEligible: nextToQualify.daysUntilEligible,
          eligibleOn: nextToQualify.eligibleOn,
          hasLumieraProject: nextToQualify.hasLumieraProject,
        }
      : null,
    scannedAt: new Date().toISOString(),
  };
}

export function formatResurrectorScanMessage(
  diagnostics,
  { eligible = 0, added = 0 } = {}
) {
  const total = diagnostics?.channelTotal ?? diagnostics?.publishedOnDisk ?? 0;
  const channelLabel = diagnostics?.channelTitle
    ? `canal “${diagnostics.channelTitle}”`
    : "canal YouTube";

  if (!total) {
    return `Nenhum vídeo encontrado no ${channelLabel} conectado.`;
  }
  if (eligible > 0) {
    const lumiera = diagnostics.withLumieraProject
      ? `, ${diagnostics.withLumieraProject} com projeto Lumiera`
      : "";
    return `${added} vídeo(s) na fila (${eligible} elegíveis de ${total} no ${channelLabel}${lumiera}).`;
  }
  if (diagnostics.tooYoungCount > 0 && diagnostics.nextToQualify) {
    const next = diagnostics.nextToQualify;
    const days =
      next.daysUntilEligible ??
      Math.max(0, diagnostics.minAgeDays - (next.ageDays || 0));
    return `0 elegíveis: ${total} vídeo(s) no ${channelLabel}, mas nenhum com +${diagnostics.minAgeDays} dias. O mais antigo (“${next.title}”) tem ${next.ageDays}d — elegível em ~${days}d.`;
  }
  return `0 elegíveis de ${total} vídeo(s) no ${channelLabel}.`;
}

async function buildResurrectorCatalog(
  workspaceDir,
  projectsRoot,
  settings = {}
) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { channelTitle, videoIds } =
    await fetchAllChannelUploadVideoIds(accessToken);

  if (!videoIds.length) {
    return {
      allEligible: [],
      rows: [],
      diagnostics: buildResurrectorScanDiagnostics([], merged, {
        channelTitle,
        channelTotal: 0,
      }),
    };
  }

  const lumieraByVideoId = buildLumieraProjectByVideoId(projectsRoot);
  const lumieraFormatById = {};
  for (const [videoId, row] of lumieraByVideoId.entries()) {
    lumieraFormatById[videoId] = row.format;
  }

  const snippetMap = await fetchYoutubeVideosSnippet(accessToken, videoIds);
  let formatByVideoId = new Map();
  try {
    const { tagVideosShortsLong } = await import("./youtubeStudioAdvanced.js");
    formatByVideoId = await tagVideosShortsLong(accessToken, videoIds, {
      lumieraFormatById,
    });
  } catch {
    formatByVideoId = new Map();
  }

  const rows = [];
  const missingYoutube = [];
  for (const videoId of videoIds) {
    const sn = snippetMap.get(videoId);
    if (!sn?.publishedAt) {
      const lumiera = lumieraByVideoId.get(videoId);
      missingYoutube.push({
        videoId,
        projectName: lumiera?.projectName || videoId,
        title: lumiera?.title || videoId,
      });
      continue;
    }

    const lumiera = lumieraByVideoId.get(videoId);
    const format = formatByVideoId.get(videoId) || lumiera?.format || "LONG";
    rows.push(
      buildResurrectorRow(
        {
          videoId,
          projectName: lumiera?.projectName || sn.title || videoId,
          projectPath: lumiera?.projectPath || null,
          format,
          niche: lumiera?.niche || "",
          title: lumiera?.title || sn.title || "",
        },
        sn,
        merged,
        {
          hasLumieraProject: Boolean(lumiera?.projectPath),
          source: lumiera?.projectPath ? "lumiera" : "channel",
        }
      )
    );
  }

  rows.sort(comparePublishedAtAsc);
  const diagnostics = buildResurrectorScanDiagnostics(rows, merged, {
    channelTitle,
    channelTotal: rows.length,
  });
  diagnostics.missingYoutubeCount = missingYoutube.length;
  diagnostics.missingYoutube = missingYoutube.slice(0, 8);
  const allEligible = rows.filter((row) => row.ageDays >= merged.minAgeDays);

  return { allEligible, rows, diagnostics };
}

export async function buildResurrectorEligibleRows(
  workspaceDir,
  projectsRoot,
  settings = {}
) {
  const { allEligible } = await buildResurrectorCatalog(
    workspaceDir,
    projectsRoot,
    settings
  );
  return allEligible;
}

export async function scanEligibleResurrectorVideos(
  workspaceDir,
  projectsRoot,
  settings = {}
) {
  const state = loadResurrectorState(workspaceDir);
  const { allEligible, diagnostics } = await buildResurrectorCatalog(
    workspaceDir,
    projectsRoot,
    settings
  );
  const eligible = allEligible.filter(
    (row) => !isVideoBatchedInCurrentCycle(state, row.videoId)
  );
  return { eligible, allEligible, diagnostics, state };
}

export async function prepareResurrectorBatchState(
  workspaceDir,
  projectsRoot,
  state,
  settings = {}
) {
  let next = { ...state };
  const { allEligible } = await scanEligibleResurrectorVideos(
    workspaceDir,
    projectsRoot,
    settings
  );

  const completion = maybeCompleteResurrectorCycle(next, allEligible);
  next = completion.state;
  if (completion.advanced) {
    const enq = enqueueResurrectorCandidates(next, allEligible);
    next = enq.state;
  } else {
    const pending = allEligible.filter(
      (row) => !isVideoBatchedInCurrentCycle(next, row.videoId)
    );
    const enq = enqueueResurrectorCandidates(next, pending);
    next = enq.state;
  }

  next.cycleProgress = computeResurrectorCycleProgress(next, allEligible);
  return { state: next, allEligible, advanced: completion.advanced };
}

export function enqueueResurrectorCandidates(state, eligible = []) {
  const existingIds = new Set((state.items || []).map((i) => i.videoId));
  const now = new Date().toISOString();
  let added = 0;
  const sorted = [...eligible]
    .map((row) => ({
      ...row,
      diagnosis: row.diagnosis || diagnoseResurrectionOpportunity(row),
    }))
    .sort(compareResurrectionOpportunity);

  for (const row of sorted) {
    if (hasActiveQueueItem(state, row.videoId)) continue;
    if (existingIds.has(row.videoId)) {
      const idx = state.items.findIndex((i) => i.videoId === row.videoId);
      const item = state.items[idx];
      if (
        item &&
        ["applied", "skipped", "failed"].includes(item.status) &&
        !isVideoBatchedInCurrentCycle(state, row.videoId)
      ) {
        state.items[idx] = resetItemForNewCycle(item);
        added += 1;
      }
      continue;
    }
    state.items.push({
      id: randomUUID(),
      videoId: row.videoId,
      projectName: row.projectName,
      projectPath: row.projectPath || null,
      format: row.format,
      niche: row.niche,
      title: row.title,
      publishedAt: row.publishedAt,
      ageDays: row.ageDays,
      viewCount: row.viewCount,
      thumbnailUrl: row.thumbnailUrl,
      hasLumieraProject: Boolean(row.hasLumieraProject),
      source: row.source || "channel",
      diagnosis: row.diagnosis,
      opportunityScore: row.diagnosis?.score || 0,
      status: "queued",
      currentMetadata: row.currentMetadata,
      proposedMetadata: null,
      selectedTitle: null,
      thumbnailStatus: row.format === "LONG" ? "awaiting_manual" : "n/a",
      thumbnailLocalPath: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
    existingIds.add(row.videoId);
    added += 1;
  }

  return { state, added };
}

export function pickResurrectorBatch(state, batchSize = 10, options = {}) {
  const size = Math.max(1, Math.min(20, Number(batchSize) || 10));
  const cycleNum = getResurrectorCycleNumber(state);
  const exclude = new Set(
    (options.excludeVideoIds || []).map(String).filter(Boolean)
  );
  const queued = (state.items || [])
    .filter((i) => {
      if (exclude.has(String(i.videoId))) return false;
      if (hasBlockingResurrectorItem(state, i.videoId)) return false;
      if (i.cycleNumber != null && i.cycleNumber !== cycleNum) return false;
      if (i.status === "failed" && i.cycleNumber === cycleNum) return true;
      if (i.status !== "queued") return false;
      return !isVideoBatchedInCurrentCycle(state, i.videoId);
    })
    .sort(compareResurrectionOpportunity);
  return queued.slice(0, size);
}

export async function generateResurrectorMetadata(item, deps = {}) {
  const { workspaceDir, callGemini, getApiKey } = deps;
  const projectPath =
    item.projectPath && fs.existsSync(item.projectPath)
      ? item.projectPath
      : null;
  const configPath = projectPath
    ? path.join(projectPath, "config_qanat.json")
    : null;
  const storyboardPath = projectPath
    ? path.join(projectPath, "storyboard.json")
    : null;
  const timingsPath = projectPath
    ? path.join(projectPath, "block_timings.json")
    : null;
  const config = configPath ? readJsonSafe(configPath) || {} : {};
  const storyboard = storyboardPath ? readJsonSafe(storyboardPath) || {} : {};
  const timings = timingsPath
    ? readJsonSafe(timingsPath) || { starts: [] }
    : { starts: [] };
  const transcript = readResurrectorTranscript(item);
  if (!transcript || transcript.length < 40) {
    throw new Error(
      projectPath
        ? "Roteiro/transcrição insuficiente para gerar metadados específicos."
        : "Descrição do YouTube insuficiente — vincule um projeto Lumiera ou enriqueça a descrição no canal."
    );
  }

  const format = normalizeFormat(item.format);

  // Shotcraft: sugerir shot card a partir do storyboard do projeto (se houver)
  try {
    if (Array.isArray(storyboard?.visual_prompts) && storyboard.visual_prompts.length) {
      const { tagSceneWithMotion } = await import("./creatorSceneTagger.js");
      const first = storyboard.visual_prompts[0];
      const tagged = tagSceneWithMotion(first, {
        format: format === "SHORTS" || format === "9:16" ? "9:16" : "16:9",
        niche: String(config.niche || item.niche || "").trim(),
      });
      item = {
        ...item,
        suggested_shot: tagged.suggested_shot,
        scene_function: tagged.scene_function,
      };
    }
  } catch {
    /* non-blocking */
  }

  // Para vídeos sem projeto Lumiera, usar título + tags como referência de nicho
  const inferredProjectName = projectPath
    ? path.basename(projectPath)
    : [
        item.projectName || item.title || "",
        ...(item.currentMetadata?.tags || []).slice(0, 3),
      ]
        .filter(Boolean)
        .join(" ");
  const metadataCtx = resolveYoutubeMetadataContext({
    config,
    timings,
    storyboard,
    projectName: inferredProjectName,
  });

  // Nicho: prioriza projeto > tags > item.niche > "Geral"
  const resolvedNiche =
    metadataCtx.niche && metadataCtx.niche !== "Geral"
      ? metadataCtx.niche
      : config.niche || item.niche || metadataCtx.niche || "Geral";

  let prompt = buildResurrectorRefreshPrompt({
    currentTitle: item.currentMetadata?.title || item.title,
    currentDescription: item.currentMetadata?.description || "",
    currentTags: item.currentMetadata?.tags || [],
    transcript,
    format,
    niche: resolvedNiche,
    ageDays: item.ageDays,
    views: item.viewCount,
  });

  if (metadataCtx.chaptersText && format === "LONG") {
    prompt += `\n\nCapítulos do projeto:\n${metadataCtx.chaptersText}`;
  }

  prompt = injectStudioAgentsContext(prompt, workspaceDir, {
    niche: metadataCtx.niche,
    task: "metadata",
    format,
  });

  const fallbackText = () =>
    buildFallbackYoutubeMetadata({
      transcript,
      chaptersText: metadataCtx.chaptersText,
      storyboard,
      config,
      format,
      niche: metadataCtx.niche,
      category: metadataCtx.category,
      profile: metadataCtx.profile,
      rpmHint: metadataCtx.rpmHint,
    });

  let text = "";
  let usedFallback = false;
  const geminiDir = projectPath || workspaceDir;
  const apiKey = typeof getApiKey === "function" ? getApiKey(geminiDir) : null;
  try {
    if (typeof callGemini === "function" && apiKey) {
      text = await callGemini(prompt, {
        temperature: 0.55,
        projectDir: geminiDir,
      });
    } else if (apiKey && deps.callGeminiWithRetry) {
      text = await deps.callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.55,
        projectDir: geminiDir,
        maxRetries: 5,
      });
    } else {
      text = fallbackText();
      usedFallback = true;
    }
  } catch (geminiErr) {
    text = fallbackText();
    if (!text || text.length < 20) throw geminiErr;
    usedFallback = true;
  }

  const parsed = parseYoutubeMetadataMarkdown(text);
  if (!parsed.recommendedTitle && !parsed.titles?.length) {
    throw new Error("IA não retornou títulos válidos para este vídeo.");
  }

  const description = appendHashtagsToDescription(
    parsed.description,
    parsed.hashtags
  );

  return {
    pipelineVersion: YOUTUBE_METADATA_PIPELINE_VERSION,
    rawText: text,
    proposed: {
      title: parsed.recommendedTitle || parsed.titles[0]?.text || "",
      titleVariants: (parsed.titles || []).map((t) => t.text),
      description,
      tags: parseTagsRaw(parsed.tags),
      hashtags: parsed.hashtags,
      pinnedComment: parsed.pinnedComment,
      chapters: parsed.chapters,
      thumbnails: parsed.thumbnails,
    },
    format,
    niche: metadataCtx.niche,
    usedFallback,
  };
}

function buildSlotAlerts({
  slot,
  slotLabel,
  slotHour,
  ran,
  run,
  deadlinePassed,
}) {
  const alerts = [];
  if (deadlinePassed && !ran) {
    alerts.push({
      type: "missed_batch",
      slot,
      severity: "warning",
      message: `Batch da ${slotLabel} (${slotHour}h) não foi executado. Dispare manualmente.`,
    });
  }
  if (run?.trigger === "auto") {
    alerts.push({
      type: "auto_ran",
      slot,
      severity: "success",
      message: `Batch da ${slotLabel} executado automaticamente às ${formatLocalTime(run.ranAt)} (${run.count || 0} vídeos).`,
      ranAt: run.ranAt,
    });
  }
  return alerts;
}

export function computeResurrectorSchedule(state, now = new Date()) {
  const settings = state.settings || DEFAULT_SETTINGS;
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = localDateString(now);
  const runs = getTodayDailyRuns(state, now);
  const morningHour = settings.morningHour ?? DEFAULT_SETTINGS.morningHour;
  const afternoonHour =
    settings.afternoonHour ?? DEFAULT_SETTINGS.afternoonHour;
  const morningRan = Boolean(runs.morning?.ranAt);
  const afternoonRan = Boolean(runs.afternoon?.ranAt);

  // “Perdeu o lote” só depois da janela de 5 minutos fechar
  const morningDeadlinePassed =
    hour > morningHour ||
    (hour === morningHour && minute > RESURRECTOR_AUTO_WINDOW_END_MINUTE);
  const afternoonDeadlinePassed =
    hour > afternoonHour ||
    (hour === afternoonHour && minute > RESURRECTOR_AUTO_WINDOW_END_MINUTE);

  const alerts = [
    ...buildSlotAlerts({
      slot: "morning",
      slotLabel: "manhã",
      slotHour: morningHour,
      ran: morningRan,
      run: runs.morning,
      deadlinePassed: morningDeadlinePassed,
    }),
    ...buildSlotAlerts({
      slot: "afternoon",
      slotLabel: "tarde",
      slotHour: afternoonHour,
      ran: afternoonRan,
      run: runs.afternoon,
      deadlinePassed: afternoonDeadlinePassed,
    }),
  ];

  let nextSlot = null;
  if (
    !morningRan &&
    (hour < morningHour ||
      (hour === morningHour && minute <= RESURRECTOR_AUTO_WINDOW_END_MINUTE))
  )
    nextSlot = "morning";
  else if (
    !afternoonRan &&
    (hour < afternoonHour ||
      (hour === afternoonHour &&
        minute <= RESURRECTOR_AUTO_WINDOW_END_MINUTE) ||
      (morningRan && hour >= morningHour && hour < afternoonHour))
  )
    nextSlot = "afternoon";

  // Automação SOMENTE 11:00–11:05 e 18:00–18:05 (horas configuráveis)
  const inMorningWindow =
    isWithinResurrectorAutoWindow(now, morningHour) && !morningRan;
  const inAfternoonWindow =
    isWithinResurrectorAutoWindow(now, afternoonHour) && !afternoonRan;

  return {
    today,
    morningHour,
    afternoonHour,
    windowEndMinute: RESURRECTOR_AUTO_WINDOW_END_MINUTE,
    morningRan,
    afternoonRan,
    dailyRuns: runs,
    alerts,
    nextSlot,
    inMorningWindow,
    inAfternoonWindow,
    missedCount: alerts.filter((a) => a.type === "missed_batch").length,
    badgeCount: alerts.filter((a) => a.type === "missed_batch").length,
  };
}

export function shouldAutoTriggerResurrectorSlot(
  schedule,
  slot,
  settings = {}
) {
  if (!settings.enabled || !settings.autoRunWhenAppOpen) return false;
  const normalized = normalizeResurrectorSlot(slot);
  if (normalized === "morning") {
    return schedule.inMorningWindow && !schedule.morningRan;
  }
  return schedule.inAfternoonWindow && !schedule.afternoonRan;
}

export async function runResurrectorBatch(
  workspaceDir,
  projectsRoot,
  deps = {},
  options = {}
) {
  return withResurrectorMutex(() =>
    runResurrectorBatchInner(workspaceDir, projectsRoot, deps, options)
  );
}

/**
 * Publica um item no YouTube com logging padronizado.
 * Recarrega o state do disco após aplicar (applyResurrectorItem salva internamente).
 */
async function publishResurrectorItemWithLogging(
  workspaceDir,
  state,
  item,
  metadata,
  runLog,
  { usedFallback = false } = {}
) {
  const titlePreview = String(item.title || item.videoId).slice(0, 72);
  appendResurrectorLog(
    state,
    "info",
    `Publicando no YouTube: ${titlePreview}`,
    {
      videoId: item.videoId,
    }
  );
  saveResurrectorState(workspaceDir, state);

  try {
    const applied = await applyResurrectorItem(workspaceDir, item.id, metadata);
    const freshState = loadResurrectorState(workspaceDir);
    const thumbNote = applied.thumbnailApplied ? " (+ thumbnail)" : "";
    const okMsg = usedFallback
      ? `Publicado (fallback IA)${thumbNote}: ${titlePreview}`
      : `Publicado no YouTube${thumbNote}: ${titlePreview}`;
    appendResurrectorLog(freshState, "success", okMsg, {
      videoId: item.videoId,
    });
    runLog.push({
      at: new Date().toISOString(),
      level: "success",
      message: okMsg,
      videoId: item.videoId,
    });
    saveResurrectorState(workspaceDir, freshState);
    return {
      state: freshState,
      result: {
        id: item.id,
        videoId: item.videoId,
        status: "applied",
        thumbnailApplied: applied.thumbnailApplied,
      },
    };
  } catch (err) {
    const errMsg = err?.message || String(err);
    const freshState = loadResurrectorState(workspaceDir);
    const failIdx = freshState.items.findIndex((i) => i.id === item.id);
    if (failIdx >= 0) {
      freshState.items[failIdx] = {
        ...freshState.items[failIdx],
        status: "failed",
        error: `YouTube: ${errMsg}`,
        updatedAt: new Date().toISOString(),
      };
    }
    appendResurrectorLog(
      freshState,
      "error",
      `Falha ao publicar: ${titlePreview} — ${errMsg}`,
      {
        videoId: item.videoId,
      }
    );
    runLog.push({
      at: new Date().toISOString(),
      level: "error",
      message: `Publicar falhou: ${errMsg}`,
      videoId: item.videoId,
    });
    saveResurrectorState(workspaceDir, freshState);
    return {
      state: freshState,
      result: {
        id: item.id,
        videoId: item.videoId,
        status: "failed",
        error: errMsg,
      },
    };
  }
}

async function runResurrectorBatchInner(
  workspaceDir,
  projectsRoot,
  deps = {},
  options = {}
) {
  const {
    slot = "morning",
    trigger = "manual",
    autoScanAttempted = false,
    limit = null,
    finalizeSlot = null,
  } = options;
  const normalizedSlot = normalizeResurrectorSlot(slot);
  const normalizedTrigger = normalizeResurrectorTrigger(trigger);

  let state = loadResurrectorState(workspaceDir);
  const settings = state.settings;
  if (!settings.enabled) {
    return {
      skipped: true,
      reason: "Ressuscitador desativado.",
      state,
      slot: normalizedSlot,
    };
  }

  const batchSize = getSlotBatchSize(settings, normalizedSlot);
  const processLimit = Math.max(
    1,
    Math.min(batchSize, Number(limit) || batchSize)
  );
  const shouldFinalizeSlot =
    typeof finalizeSlot === "boolean" ? finalizeSlot : limit == null;

  if (slotAlreadyRanToday(state, normalizedSlot)) {
    return {
      skipped: true,
      reason: `Batch ${normalizedSlot === "morning" ? "da manhã" : "da tarde"} já executado hoje.`,
      state,
      slot: normalizedSlot,
    };
  }

  let prepared = await prepareResurrectorBatchState(
    workspaceDir,
    projectsRoot,
    state,
    settings
  );
  state = prepared.state;
  saveResurrectorState(workspaceDir, state);

  const runLog = [];
  const excludeVideoIds =
    normalizedSlot === "afternoon" ? getMorningVideoIdsToday(state) : [];
  let batch = pickResurrectorBatch(state, processLimit, { excludeVideoIds });

  if (processLimit >= batchSize || limit == null) {
    appendResurrectorLog(
      state,
      "info",
      `Batch ${normalizedSlot === "morning" ? "manhã" : "tarde"} iniciado (${processLimit} vídeo(s) nesta etapa).`,
      { slot: normalizedSlot, trigger: normalizedTrigger }
    );
  }

  if (!batch.length && !autoScanAttempted) {
    prepared = await prepareResurrectorBatchState(
      workspaceDir,
      projectsRoot,
      state,
      settings
    );
    state = prepared.state;
    saveResurrectorState(workspaceDir, state);
    batch = pickResurrectorBatch(state, processLimit, { excludeVideoIds });
  }

  if (!batch.length) {
    appendResurrectorLog(
      state,
      "warn",
      "Nenhum vídeo na fila para processar nesta etapa."
    );
    saveResurrectorState(workspaceDir, state);
    return {
      processed: 0,
      message: prepared.state.cycleProgress?.complete
        ? "Ciclo concluído — próximo batch inicia do vídeo mais antigo novamente."
        : "Nenhum vídeo elegível na fila para este slot.",
      state: prepared.state,
      slot: normalizedSlot,
      cycle: prepared.state.cycleProgress,
      runLog,
    };
  }

  const results = [];
  for (let step = 0; step < batch.length; step += 1) {
    const item = batch[step];
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx < 0) continue;
    const titlePreview = String(
      state.items[idx].title || item.title || item.videoId
    ).slice(0, 72);
    appendResurrectorLog(
      state,
      "info",
      `[${step + 1}/${batch.length}] Gerando metadados: ${titlePreview}`,
      { videoId: item.videoId, step: step + 1, total: batch.length }
    );
    runLog.push({
      at: new Date().toISOString(),
      level: "info",
      message: `Gerando: ${titlePreview}`,
    });
    saveResurrectorState(workspaceDir, state);

    state.items[idx].status = "generating";
    state.items[idx].cycleNumber = getResurrectorCycleNumber(state);
    state.items[idx].error = null;
    state.items[idx].updatedAt = new Date().toISOString();
    saveResurrectorState(workspaceDir, state);

    try {
      const generated = await generateResurrectorMetadata(state.items[idx], {
        ...deps,
        workspaceDir,
      });
      state.items[idx] = {
        ...state.items[idx],
        status: "review",
        proposedMetadata: generated.proposed,
        metadataRaw: generated.rawText,
        selectedTitle: generated.proposed.title,
        updatedAt: new Date().toISOString(),
        error: null,
        usedFallback: generated.usedFallback || false,
      };
      saveResurrectorState(workspaceDir, state);

      const autoApply = settings.autoApplyToYoutube !== false;
      if (autoApply) {
        const { state: nextState, result } =
          await publishResurrectorItemWithLogging(
            workspaceDir,
            state,
            item,
            {
              title: generated.proposed.title,
              description: generated.proposed.description,
              tags: generated.proposed.tags,
            },
            runLog,
            { usedFallback: generated.usedFallback }
          );
        state = nextState;
        results.push(
          result.status === "applied"
            ? { ...result, usedFallback: generated.usedFallback }
            : result
        );
      } else {
        results.push({
          id: item.id,
          videoId: item.videoId,
          status: "review",
          usedFallback: generated.usedFallback,
        });
        const okMsg = generated.usedFallback
          ? `OK (fallback local — Gemini indisponível): ${titlePreview}`
          : `OK (revisar): ${titlePreview}`;
        appendResurrectorLog(
          state,
          generated.usedFallback ? "warn" : "success",
          okMsg,
          { videoId: item.videoId }
        );
        runLog.push({
          at: new Date().toISOString(),
          level: "success",
          message: okMsg,
        });
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      state.items[idx] = {
        ...state.items[idx],
        status: "failed",
        error: errMsg,
        updatedAt: new Date().toISOString(),
      };
      results.push({
        id: item.id,
        videoId: item.videoId,
        status: "failed",
        error: errMsg,
      });
      appendResurrectorLog(
        state,
        "error",
        `Falhou: ${titlePreview} — ${errMsg}`,
        { videoId: item.videoId }
      );
      runLog.push({
        at: new Date().toISOString(),
        level: "error",
        message: `Falhou: ${errMsg}`,
      });
    }
    saveResurrectorState(workspaceDir, state);
  }

  const appliedCount = results.filter((r) => r.status === "applied").length;
  const reviewCount = results.filter((r) => r.status === "review").length;
  const successCount = appliedCount + reviewCount;
  const failCount = results.filter((r) => r.status === "failed").length;
  const today = localDateString();
  if (!state.dailyRuns || state.dailyRuns.date !== today) {
    state.dailyRuns = emptyDailyRuns(today);
  }

  if (shouldFinalizeSlot) {
    if (successCount > 0 || results.length === 0) {
      state.dailyRuns[normalizedSlot] = {
        ranAt: new Date().toISOString(),
        trigger: normalizedTrigger,
        videoIds: batch.map((b) => b.videoId),
        count: appliedCount || successCount,
        applied: appliedCount,
        failed: failCount,
      };
      state.lastDailyRunAt = new Date().toISOString();
      state.lastDailyRunDate = today;
    } else {
      appendResurrectorLog(
        state,
        "warn",
        `Batch ${normalizedSlot === "morning" ? "da manhã" : "da tarde"} não marcado como concluído — todos falharam. Use "Reprocessar falhas".`
      );
    }
  }

  appendResurrectorLog(
    state,
    failCount ? "warn" : "success",
    `Etapa concluída: ${appliedCount} publicado(s), ${reviewCount} revisão, ${failCount} falha(s).`,
    { slot: normalizedSlot, appliedCount, reviewCount, failCount }
  );

  const postBatch = await prepareResurrectorBatchState(
    workspaceDir,
    projectsRoot,
    state,
    settings
  );
  state = postBatch.state;
  saveResurrectorState(workspaceDir, state);

  const slotLabel = normalizedSlot === "morning" ? "manhã" : "tarde";
  const triggerLabel =
    normalizedTrigger === "auto" ? "automaticamente" : "manualmente";
  const cycleMsg = postBatch.advanced
    ? " Ciclo anterior concluído — recomeçando do mais antigo."
    : "";
  const summary =
    failCount && !successCount
      ? `Batch da ${slotLabel}: ${failCount} falha(s) — Gemini/rede indisponível? Tente "Reprocessar falhas".`
      : appliedCount > 0
        ? `Batch da ${slotLabel} (${triggerLabel}): ${appliedCount} aplicado(s) no YouTube${reviewCount ? `, ${reviewCount} para revisar` : ""}${failCount ? `, ${failCount} falha(s)` : ""}.${cycleMsg}`
        : `Batch da ${slotLabel} (${triggerLabel}): ${reviewCount} para revisão, ${failCount} falha(s).${cycleMsg}`;

  return {
    processed: results.length,
    successCount,
    appliedCount,
    reviewCount,
    failCount,
    results,
    state,
    slot: normalizedSlot,
    trigger: normalizedTrigger,
    cycle: state.cycleProgress,
    runLog,
    message: summary,
  };
}

export async function applyPendingResurrectorReviews(workspaceDir) {
  return withResurrectorMutex(() =>
    applyPendingResurrectorReviewsInner(workspaceDir)
  );
}

async function applyPendingResurrectorReviewsInner(workspaceDir) {
  let state = loadResurrectorState(workspaceDir);
  const settings = state.settings || DEFAULT_SETTINGS;

  if (settings.autoApplyToYoutube === false) {
    return {
      applied: 0,
      failed: 0,
      skipped: state.items.filter((i) => i.status === "review").length,
      message: "Publicação automática desativada — revise manualmente.",
      runLog: [],
      state,
    };
  }

  const pending = state.items.filter(
    (i) => i.status === "review" && i.proposedMetadata?.title
  );

  if (!pending.length) {
    return {
      applied: 0,
      failed: 0,
      skipped: 0,
      message: "Nenhuma revisão pendente para publicar.",
      runLog: [],
      state,
    };
  }

  appendResurrectorLog(
    state,
    "info",
    `Publicando ${pending.length} revisão(ões) pendente(s) no YouTube…`
  );
  saveResurrectorState(workspaceDir, state);

  const results = [];
  const runLog = [];

  for (const item of pending) {
    const { state: nextState, result } =
      await publishResurrectorItemWithLogging(
        workspaceDir,
        state,
        item,
        {
          title: item.selectedTitle || item.proposedMetadata.title,
          description: item.proposedMetadata.description,
          tags: item.proposedMetadata.tags,
        },
        runLog
      );
    state = nextState;
    results.push(result);
  }

  state = loadResurrectorState(workspaceDir);
  const applied = results.filter((r) => r.status === "applied").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const message =
    applied > 0
      ? `${applied} vídeo(s) publicado(s) no YouTube${failed ? `, ${failed} falha(s)` : ""}.`
      : failed > 0
        ? `${failed} falha(s) ao publicar no YouTube.`
        : "Nenhuma revisão publicada.";

  appendResurrectorLog(state, failed ? "warn" : "success", message);
  saveResurrectorState(workspaceDir, state);

  return {
    applied,
    failed,
    skipped: 0,
    results,
    runLog,
    message,
    state,
  };
}

function buildMetadataCachePayload(item) {
  return {
    generatedAt: new Date().toISOString(),
    pipelineVersion: YOUTUBE_METADATA_PIPELINE_VERSION,
    format: item.format === "SHORT" ? "SHORT" : "LONG",
    source: "video_resurrector",
    parsed: item.proposedMetadata,
    text: item.metadataRaw,
  };
}

export async function applyResurrectorItem(workspaceDir, itemId, options = {}) {
  const state = loadResurrectorState(workspaceDir);
  const idx = state.items.findIndex((i) => i.id === itemId);
  if (idx < 0) throw new Error("Item não encontrado na fila do ressuscitador.");

  const item = state.items[idx];
  if (!item.proposedMetadata?.title) {
    throw new Error("Gere e revise os metadados antes de aplicar.");
  }

  const title = String(
    options.title || item.selectedTitle || item.proposedMetadata.title
  ).trim();
  const description = String(
    options.description || item.proposedMetadata.description || ""
  ).trim();
  const tags = options.tags || item.proposedMetadata.tags || [];

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  await updateYoutubeVideoMetadata(accessToken, item.videoId, {
    title,
    description,
    tags,
  });

  let thumbnailApplied = false;
  const thumbPath = options.thumbnailPath || item.thumbnailLocalPath;
  if (item.format === "LONG" && thumbPath && fs.existsSync(thumbPath)) {
    try {
      await uploadYoutubeVideoThumbnail(accessToken, item.videoId, thumbPath);
      thumbnailApplied = true;
      state.items[idx].thumbnailStatus = "applied";
    } catch (err) {
      state.items[idx].thumbnailStatus = "upload_failed";
      state.items[idx].thumbnailError = err?.message || String(err);
    }
  }

  if (item.projectPath && fs.existsSync(item.projectPath)) {
    const configPath = path.join(item.projectPath, "config_qanat.json");
    if (fs.existsSync(configPath)) {
      const config = readJsonSafe(configPath) || {};
      if (!config.upload_metadata) config.upload_metadata = {};
      config.upload_metadata.youtube = {
        ...(config.upload_metadata.youtube || {}),
        title,
        description,
        tags: Array.isArray(tags) ? tags.join(", ") : String(tags),
        post_id: item.videoId,
        resurrected_at: new Date().toISOString(),
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    }

    const cachePath = path.join(
      item.projectPath,
      "youtube_metadata_cache.json"
    );
    if (item.metadataRaw) {
      fs.writeFileSync(
        cachePath,
        JSON.stringify(buildMetadataCachePayload(item), null, 2),
        "utf8"
      );
    }
  }

  const workspaceCachePath = path.join(
    workspaceDir,
    "resurrector_metadata_cache",
    `${item.videoId}.json`
  );
  if (item.metadataRaw) {
    fs.mkdirSync(path.dirname(workspaceCachePath), { recursive: true });
    fs.writeFileSync(
      workspaceCachePath,
      JSON.stringify(buildMetadataCachePayload(item), null, 2),
      "utf8"
    );
  }

  const appliedAt = new Date().toISOString();
  const checkpointAt = (days) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  state.items[idx] = {
    ...state.items[idx],
    status: "applied",
    selectedTitle: title,
    appliedAt,
    updatedAt: appliedAt,
    thumbnailApplied,
    experiment: {
      version: 1,
      status: "tracking",
      treatment:
        item.diagnosis?.recommendedTreatment || "metadata_search_refresh",
      startedAt: appliedAt,
      baseline: item.analyticsBaseline || null,
      checkpoints: [
        { label: "48h", dueAt: checkpointAt(2), status: "pending" },
        { label: "7d", dueAt: checkpointAt(7), status: "pending" },
        { label: "28d", dueAt: checkpointAt(28), status: "pending" },
      ],
      originalMetadata: item.currentMetadata || null,
    },
    error: null,
  };

  state.history = [
    {
      id: item.id,
      videoId: item.videoId,
      projectName: item.projectName,
      title,
      appliedAt: state.items[idx].appliedAt,
      thumbnailApplied,
      treatment: state.items[idx].experiment?.treatment,
      experimentStartedAt: appliedAt,
    },
    ...(state.history || []),
  ].slice(0, 200);

  saveResurrectorState(workspaceDir, state);
  return { item: state.items[idx], thumbnailApplied };
}

export function getResurrectorDashboard(state) {
  const items = state.items || [];
  const schedule = computeResurrectorSchedule(state);
  return {
    settings: state.settings,
    lastDailyRunAt: state.lastDailyRunAt,
    lastDailyRunDate: state.lastDailyRunDate,
    dailyRuns: schedule.dailyRuns,
    schedule: {
      today: schedule.today,
      morningHour: schedule.morningHour,
      afternoonHour: schedule.afternoonHour,
      morningRan: schedule.morningRan,
      afternoonRan: schedule.afternoonRan,
      nextSlot: schedule.nextSlot,
      inMorningWindow: schedule.inMorningWindow,
      inAfternoonWindow: schedule.inAfternoonWindow,
    },
    alerts: schedule.alerts,
    badgeCount: schedule.badgeCount,
    cycle: state.cycle || emptyCycle(1),
    cycleProgress: state.cycleProgress || null,
    scanDiagnostics: state.scanDiagnostics || null,
    activityLog: state.activityLog || [],
    counts: {
      queued: items.filter((i) => i.status === "queued").length,
      generating: items.filter((i) => i.status === "generating").length,
      review: items.filter((i) => i.status === "review").length,
      applied: items.filter((i) => i.status === "applied").length,
      failed: items.filter((i) => i.status === "failed").length,
      skipped: items.filter((i) => i.status === "skipped").length,
    },
    items: [...items].sort(
      (a, b) =>
        comparePublishedAtAsc(a, b) ||
        new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    ),
    history: state.history || [],
  };
}
