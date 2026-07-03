/**
 * Ressuscitador de vídeos — reformula metadados SEO de vídeos Lumiera com +N dias.
 * Batch diário (padrão 10). Thumbnail de longos: upload manual; demais campos via IA.
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

export const RESURRECTOR_FILE = "youtube_video_resurrector.json";

export const RESURRECTOR_STATUSES = [
  "queued",
  "generating",
  "review",
  "applied",
  "skipped",
  "failed",
];

const DEFAULT_SETTINGS = {
  enabled: true,
  autoRunDaily: true,
  minAgeDays: 10,
  dailyBatchSize: 10,
  cooldownDays: 45,
};

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function statePath(workspaceDir) {
  return path.join(workspaceDir, RESURRECTOR_FILE);
}

export function loadResurrectorState(workspaceDir) {
  const stored = readJsonSafe(statePath(workspaceDir)) || {};
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
    lastDailyRunAt: stored.lastDailyRunAt || null,
    lastDailyRunDate: stored.lastDailyRunDate || null,
    items: Array.isArray(stored.items) ? stored.items : [],
    history: Array.isArray(stored.history) ? stored.history.slice(0, 200) : [],
    updatedAt: stored.updatedAt || null,
  };
}

export function saveResurrectorState(workspaceDir, state) {
  const next = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statePath(workspaceDir), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function daysSince(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function normalizeFormat(format) {
  const f = String(format || "").toUpperCase();
  return f === "SHORTS" || f === "SHORT" ? "SHORT" : "LONG";
}

function readProjectTranscript(projectPath) {
  const storyboardPath = path.join(projectPath, "storyboard.json");
  const transcriptPath = path.join(projectPath, "transcripts_readable.txt");
  const configPath = path.join(projectPath, "config_qanat.json");
  const storyboard = readJsonSafe(storyboardPath) || {};
  const config = readJsonSafe(configPath) || {};

  if (typeof storyboard.narrative_script === "string" && storyboard.narrative_script.trim().length > 80) {
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

function parseTagsRaw(raw) {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (!raw) return [];
  return String(raw).replace(/;/g, ",").split(",").map((t) => t.trim()).filter(Boolean);
}

function appendHashtagsToDescription(description, hashtags) {
  const base = String(description || "").trim();
  const tags = String(hashtags || "").trim();
  if (!tags) return base;
  if (base.toLowerCase().includes(tags.toLowerCase().split(/\s+/)[0]?.replace("#", ""))) return base;
  return `${base}\n\n${tags}`.trim();
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

  return `${base}

## CONTEXTO RESSUSCITADOR (vídeo antigo no ar)

Este vídeo já está publicado há ${ageDays} dias (${views} views no período recente).
Objetivo: **reformular** título, descrição, hashtags e tags para melhorar CTR e descoberta — SEM mentir sobre o conteúdo.

Metadados ATUAIS no YouTube (referência — melhore, não copie genericamente):
- Título atual: ${currentTitle || "(desconhecido)"}
- Descrição atual (trecho): ${String(currentDescription || "").slice(0, 600)}
- Tags atuais: ${(currentTags || []).slice(0, 12).join(", ") || "(nenhuma)"}

REGRAS EXTRA:
- O novo título deve ser claramente diferente do atual, mas sobre O MESMO vídeo (mesmos fatos do roteiro).
- Não invente tema que não está no roteiro.
- Priorize palavras-chave de busca + gancho de clique honesto.
- Para LONGO: inclua capítulos se houver timestamps no projeto; thumbnails A/B são só briefing (upload manual).`;
}

export async function fetchYoutubeVideosSnippet(accessToken, videoIds = []) {
  const ids = [...new Set(videoIds.map(String).filter(Boolean))];
  if (!ids.length) return new Map();

  const map = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!res.ok) {
      throwIfInsufficientScope(data?.error?.message || "Falha ao ler vídeos no YouTube.");
      throw new Error(data?.error?.message || "Falha ao ler vídeos no YouTube.");
    }
    for (const item of data?.items || []) {
      const sn = item.snippet || {};
      map.set(item.id, {
        videoId: item.id,
        title: sn.title || "",
        description: sn.description || "",
        tags: Array.isArray(sn.tags) ? sn.tags : [],
        publishedAt: sn.publishedAt || "",
        thumbnailUrl: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || "",
        viewCount: Number(item.statistics?.viewCount || 0),
      });
    }
  }
  return map;
}

export async function updateYoutubeVideoMetadata(accessToken, videoId, {
  title,
  description,
  tags = [],
  categoryId = "22",
  defaultLanguage = "pt",
} = {}) {
  const getRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const getData = await getRes.json();
  if (!getRes.ok) {
    throwIfInsufficientScope(getData?.error?.message || "Falha ao ler vídeo.");
    throw new Error(getData?.error?.message || "Falha ao ler vídeo.");
  }
  const video = getData?.items?.[0];
  if (!video?.snippet) throw new Error("Vídeo não encontrado no canal conectado.");

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
          defaultLanguage: defaultLanguage || video.snippet.defaultLanguage || "pt",
        },
      }),
    },
  );
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throwIfInsufficientScope(updateData?.error?.message || "Falha ao atualizar metadados.");
    throw new Error(updateData?.error?.message || "Falha ao atualizar metadados.");
  }
  return updateData;
}

export async function uploadYoutubeVideoThumbnail(accessToken, videoId, imagePath) {
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

function wasRecentlyProcessed(state, videoId, cooldownDays) {
  const cutoff = Date.now() - cooldownDays * 24 * 60 * 60 * 1000;
  for (const item of state.items || []) {
    if (item.videoId !== videoId) continue;
    if (item.status === "skipped") continue;
    const applied = item.appliedAt ? new Date(item.appliedAt).getTime() : 0;
    const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (item.status === "applied" && applied > cutoff) return true;
    if (["review", "generating", "queued"].includes(item.status)) return true;
    if (updated > cutoff && item.status === "failed") return false;
  }
  for (const h of state.history || []) {
    if (h.videoId === videoId && h.appliedAt) {
      if (new Date(h.appliedAt).getTime() > cutoff) return true;
    }
  }
  return false;
}

export async function scanEligibleResurrectorVideos(workspaceDir, projectsRoot, settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const state = loadResurrectorState(workspaceDir);
  const published = filterExistingLumieraVideos(collectLumieraPublishedVideos(projectsRoot));
  if (!published.length) return { eligible: [], state };

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const snippetMap = await fetchYoutubeVideosSnippet(accessToken, published.map((p) => p.videoId));

  const eligible = [];
  for (const entry of published) {
    const sn = snippetMap.get(entry.videoId);
    if (!sn?.publishedAt) continue;
    const ageDays = daysSince(sn.publishedAt);
    if (ageDays < merged.minAgeDays) continue;
    if (wasRecentlyProcessed(state, entry.videoId, merged.cooldownDays)) continue;

    eligible.push({
      videoId: entry.videoId,
      projectName: entry.projectName,
      projectPath: entry.projectPath,
      format: normalizeFormat(entry.format),
      niche: entry.niche || "",
      title: sn.title || entry.title || "",
      publishedAt: sn.publishedAt,
      ageDays,
      thumbnailUrl: sn.thumbnailUrl,
      viewCount: sn.viewCount,
      currentMetadata: {
        title: sn.title,
        description: sn.description,
        tags: sn.tags,
      },
    });
  }

  eligible.sort((a, b) => b.ageDays - a.ageDays || (a.viewCount || 0) - (b.viewCount || 0));
  return { eligible, state };
}

export function enqueueResurrectorCandidates(state, eligible = []) {
  const existingIds = new Set((state.items || []).map((i) => i.videoId));
  const now = new Date().toISOString();
  let added = 0;

  for (const row of eligible) {
    if (existingIds.has(row.videoId)) continue;
    state.items.push({
      id: randomUUID(),
      videoId: row.videoId,
      projectName: row.projectName,
      projectPath: row.projectPath,
      format: row.format,
      niche: row.niche,
      title: row.title,
      publishedAt: row.publishedAt,
      ageDays: row.ageDays,
      viewCount: row.viewCount,
      thumbnailUrl: row.thumbnailUrl,
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

export function pickResurrectorBatch(state, batchSize = 10) {
  const size = Math.max(1, Math.min(20, Number(batchSize) || 10));
  const queued = (state.items || [])
    .filter((i) => i.status === "queued")
    .sort((a, b) => (b.ageDays || 0) - (a.ageDays || 0));
  return queued.slice(0, size);
}

export async function generateResurrectorMetadata(projectPath, item, deps = {}) {
  const { workspaceDir, callGemini, getApiKey } = deps;
  const configPath = path.join(projectPath, "config_qanat.json");
  const storyboardPath = path.join(projectPath, "storyboard.json");
  const timingsPath = path.join(projectPath, "block_timings.json");
  const config = readJsonSafe(configPath) || {};
  const storyboard = readJsonSafe(storyboardPath) || {};
  const timings = readJsonSafe(timingsPath) || { starts: [] };
  const transcript = readProjectTranscript(projectPath);
  if (!transcript || transcript.length < 40) {
    throw new Error("Roteiro/transcrição insuficiente para gerar metadados específicos.");
  }

  const format = normalizeFormat(item.format);
  const metadataCtx = resolveYoutubeMetadataContext({
    config,
    timings,
    storyboard,
    projectName: path.basename(projectPath),
  });

  let prompt = buildResurrectorRefreshPrompt({
    currentTitle: item.currentMetadata?.title || item.title,
    currentDescription: item.currentMetadata?.description || "",
    currentTags: item.currentMetadata?.tags || [],
    transcript,
    format,
    niche: metadataCtx.niche || config.niche || item.niche || "Geral",
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

  let text = "";
  const apiKey = typeof getApiKey === "function" ? getApiKey(projectPath) : null;
  if (typeof callGemini === "function" && apiKey) {
    text = await callGemini(prompt, { temperature: 0.55, projectDir: projectPath });
  } else if (apiKey && deps.callGeminiWithRetry) {
    text = await deps.callGeminiWithRetry(apiKey, prompt, { temperature: 0.55, projectDir: projectPath });
  } else {
    text = buildFallbackYoutubeMetadata({
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
  }

  const parsed = parseYoutubeMetadataMarkdown(text);
  if (!parsed.recommendedTitle && !parsed.titles?.length) {
    throw new Error("IA não retornou títulos válidos para este vídeo.");
  }

  const description = appendHashtagsToDescription(parsed.description, parsed.hashtags);

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
  };
}

export async function runResurrectorBatch(workspaceDir, projectsRoot, deps = {}, autoScanAttempted = false) {
  const state = loadResurrectorState(workspaceDir);
  const settings = state.settings;
  if (!settings.enabled) {
    return { skipped: true, reason: "Ressuscitador desativado.", state };
  }

  const batch = pickResurrectorBatch(state, settings.dailyBatchSize);
  if (!batch.length && !autoScanAttempted) {
    const { eligible } = await scanEligibleResurrectorVideos(workspaceDir, projectsRoot, settings);
    const enq = enqueueResurrectorCandidates(state, eligible);
    saveResurrectorState(workspaceDir, enq.state);
    return runResurrectorBatch(workspaceDir, projectsRoot, deps, true);
  }
  if (!batch.length) {
    return { processed: 0, message: "Nenhum vídeo elegível na fila.", state };
  }

  const results = [];
  for (const item of batch) {
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx < 0) continue;
    state.items[idx].status = "generating";
    state.items[idx].updatedAt = new Date().toISOString();
    saveResurrectorState(workspaceDir, state);

    try {
      const generated = await generateResurrectorMetadata(item.projectPath, state.items[idx], {
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
      };
      results.push({ id: item.id, videoId: item.videoId, status: "review" });
    } catch (err) {
      state.items[idx] = {
        ...state.items[idx],
        status: "failed",
        error: err?.message || String(err),
        updatedAt: new Date().toISOString(),
      };
      results.push({ id: item.id, videoId: item.videoId, status: "failed", error: err?.message });
    }
    saveResurrectorState(workspaceDir, state);
  }

  state.lastDailyRunAt = new Date().toISOString();
  state.lastDailyRunDate = new Date().toISOString().slice(0, 10);
  saveResurrectorState(workspaceDir, state);

  return {
    processed: results.length,
    results,
    state,
    message: `${results.filter((r) => r.status === "review").length} vídeo(s) prontos para revisão.`,
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

  const title = String(options.title || item.selectedTitle || item.proposedMetadata.title).trim();
  const description = String(options.description || item.proposedMetadata.description || "").trim();
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

  const cachePath = path.join(item.projectPath, "youtube_metadata_cache.json");
  if (item.metadataRaw) {
    fs.writeFileSync(cachePath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      pipelineVersion: YOUTUBE_METADATA_PIPELINE_VERSION,
      format: item.format === "SHORT" ? "SHORT" : "LONG",
      source: "video_resurrector",
      parsed: item.proposedMetadata,
      text: item.metadataRaw,
    }, null, 2), "utf8");
  }

  state.items[idx] = {
    ...state.items[idx],
    status: "applied",
    selectedTitle: title,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailApplied,
    error: null,
  };

  state.history = [{
    id: item.id,
    videoId: item.videoId,
    projectName: item.projectName,
    title,
    appliedAt: state.items[idx].appliedAt,
    thumbnailApplied,
  }, ...(state.history || [])].slice(0, 200);

  saveResurrectorState(workspaceDir, state);
  return { item: state.items[idx], thumbnailApplied };
}

export function getResurrectorDashboard(state) {
  const items = state.items || [];
  return {
    settings: state.settings,
    lastDailyRunAt: state.lastDailyRunAt,
    lastDailyRunDate: state.lastDailyRunDate,
    counts: {
      queued: items.filter((i) => i.status === "queued").length,
      generating: items.filter((i) => i.status === "generating").length,
      review: items.filter((i) => i.status === "review").length,
      applied: items.filter((i) => i.status === "applied").length,
      failed: items.filter((i) => i.status === "failed").length,
      skipped: items.filter((i) => i.status === "skipped").length,
    },
    items: items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    history: state.history || [],
  };
}

export function startResurrectorDailyScheduler(deps) {
  const { workspaceDir, projectsRoot } = deps;
  const MS = 24 * 60 * 60 * 1000;

  const tick = async () => {
    try {
      const state = loadResurrectorState(workspaceDir);
      if (!state.settings?.enabled || !state.settings?.autoRunDaily) return;
      const today = new Date().toISOString().slice(0, 10);
      if (state.lastDailyRunDate === today) return;
      console.log("[Resurrector] Iniciando batch diário automático…");
      await runResurrectorBatch(workspaceDir, projectsRoot, deps);
    } catch (err) {
      console.warn("[Resurrector] Batch diário falhou:", err?.message || err);
    }
  };

  setTimeout(() => { void tick(); }, 90_000);
  setInterval(() => { void tick(); }, MS);
}