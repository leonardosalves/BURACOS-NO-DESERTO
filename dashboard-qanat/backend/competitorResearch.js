/**
 * Pesquisa automática de concorrentes — YouTube Data API + análise IA + memória Obsidian.
 */

import fs from "fs";
import path from "path";
import { resolveProjectsRoot } from "./projectsRoot.js";
import {
  appendDailyRunLog,
  ensureAgentDirs,
  getAgentPaths,
} from "./agentMemory.js";
import { repairVaultGraphLinks } from "./obsidianVault.js";
import {
  assertTitleTestScopes,
  getYoutubeAccessToken,
} from "./youtubeTitleAnalytics.js";
import { extractJsonCandidate, parseJsonLocally } from "./aiJsonParse.js";

const COMPETITOR_MEMORY_FILE = "competitor-intelligence.md";
const OUTLIER_MULTIPLIER = 3.5;
const OUTLIER_MIN_VIEWS = 1000;
const DEFAULT_MAX_COMPETITORS = 5;
const MAX_COMPETITORS_HARD_CAP = 10;
const DEFAULT_VIDEOS_PER_CHANNEL = 20;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_RETRY_DELAY_MS = 600;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers genéricos
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function toCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function parseIso8601Duration(iso = "") {
  const match = String(iso).match(
    /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );
  if (!match) return 0;
  const [, d, h, m, s] = match.map((v) => Number(v || 0));
  return d * 86400 + h * 3600 + m * 60 + s;
}

function median(values = []) {
  const nums = values
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function daysSince(isoDate = "") {
  if (!isoDate) return null;
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / DAY_MS));
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function titleSuggestsShort(title = "") {
  return /#shorts?\b|\bshorts?\b/i.test(String(title));
}

function normalizeFormat(format) {
  return String(format || "SHORT").toUpperCase() === "LONG" ? "LONG" : "SHORT";
}

function videoMatchesFormat(video, format = "SHORT") {
  if (normalizeFormat(format) === "LONG") {
    return video.durationSec > 60 && !titleSuggestsShort(video.title);
  }
  return (
    (video.durationSec > 0 && video.durationSec <= 180) ||
    titleSuggestsShort(video.title)
  );
}

function pickThumbnailUrl(thumbnails = {}) {
  return thumbnails?.medium?.url || thumbnails?.default?.url || "";
}

// ---------------------------------------------------------------------------
// API YouTube (com retry leve em 5xx/429)
// ---------------------------------------------------------------------------

async function youtubeDataGet(accessToken, apiPath, params = {}, attempt = 0) {
  const url = new URL(`${YT_API_BASE}/${apiPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && attempt < 1 && (res.status >= 500 || res.status === 429)) {
    await sleep(YT_RETRY_DELAY_MS * (attempt + 1));
    return youtubeDataGet(accessToken, apiPath, params, attempt + 1);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Falha na API YouTube (${apiPath}).`
    );
  }
  return data;
}

// ---------------------------------------------------------------------------
// Resolução de nicho
// ---------------------------------------------------------------------------

function readNicheFromCompetitorMemory(workspaceDir) {
  const memoryPath = path.join(
    getAgentPaths(workspaceDir).memoryDir,
    COMPETITOR_MEMORY_FILE
  );
  if (!fs.existsSync(memoryPath)) return "";
  try {
    const content = fs.readFileSync(memoryPath, "utf8");
    const match = content.match(/^niche:\s*(.+)$/m);
    return match ? String(match[1]).trim() : "";
  } catch {
    return "";
  }
}

function isChannelBrandNiche(niche, channelTitle = "") {
  const n = String(niche || "")
    .trim()
    .toLowerCase();
  const t = String(channelTitle || "")
    .trim()
    .toLowerCase();
  if (!n) return true;
  if (t && (n === t || n.includes(t) || t.includes(n))) return true;
  if (/^(ai |the )/.test(n)) return true;
  if (/construction stories|building stories|ai construction/i.test(n))
    return true;
  return false;
}

const GENERIC_NICHE_KEYS = new Set([
  "história",
  "historia",
  "customized",
  "geral",
  "tecnologia",
  "shorts",
  "youtube",
]);

function nichePriorityScore(niche, count) {
  const key = String(niche || "")
    .trim()
    .toLowerCase();
  let score = count;
  if (GENERIC_NICHE_KEYS.has(key)) score *= 0.15;
  const words = key.split(/\s+/).filter(Boolean).length;
  if (words >= 3) score *= 1.6;
  else if (words >= 2) score *= 1.35;
  if (/engenharia|curiosidade|fato|mist[eé]rio|arqueologia/i.test(key))
    score *= 1.25;
  return score;
}

function collectProjectNiches(projectsRoot) {
  const counts = new Map();
  const labels = new Map();
  const root = projectsRoot || resolveProjectsRoot();
  const scanRoots = [
    path.join(root, "videos longos"),
    path.join(root, "videos curtos shorts"),
  ];

  for (const scanRoot of scanRoots) {
    if (!fs.existsSync(scanRoot)) continue;
    for (const item of fs.readdirSync(scanRoot)) {
      const cfg = readJsonFile(path.join(scanRoot, item, "config_qanat.json"));
      const niche = String(cfg?.niche || "").trim();
      if (!niche || isChannelBrandNiche(niche)) continue;
      const key = niche.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key) || niche.length > labels.get(key).length) {
        labels.set(key, niche);
      }
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const label = labels.get(key) || key;
      return { niche: label, score: nichePriorityScore(label, count), count };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .map((entry) => entry.niche);
}

function resolveResearchNiche(
  workspaceDir,
  { niche, config = {}, channelTitle = "", projectsRoot = "" } = {}
) {
  const explicit = String(niche || config.niche || "").trim();
  if (explicit && !isChannelBrandNiche(explicit, channelTitle)) return explicit;

  const projectNiches = collectProjectNiches(projectsRoot);
  if (projectNiches.length) return projectNiches[0];

  const fromMemory = readNicheFromCompetitorMemory(workspaceDir);
  if (fromMemory && !isChannelBrandNiche(fromMemory, channelTitle))
    return fromMemory;

  const keywords = Array.isArray(config.highlight_keywords)
    ? config.highlight_keywords
    : [];
  if (keywords.length >= 3) return keywords.slice(0, 3).join(" ").trim();

  return "engenharia antiga curiosidades história";
}

// ---------------------------------------------------------------------------
// Descoberta de canais
// ---------------------------------------------------------------------------

function buildSearchQueries(niche, format) {
  const base = String(niche || "").trim();
  const fmt = normalizeFormat(format);
  const queries = [];
  if (base) {
    queries.push(base);
    if (fmt === "SHORT") {
      queries.push(`${base} shorts`, `${base} curiosidades`);
    } else {
      queries.push(`${base} documentário`, `${base} documentary`);
    }
  }
  if (fmt === "SHORT") {
    queries.push("curiosidades história shorts", "fatos surpreendentes shorts");
  } else {
    queries.push("documentário história engenharia");
  }
  return [...new Set(queries.filter(Boolean))].slice(0, 5);
}

async function searchCompetitorChannels(
  accessToken,
  { niche, format, maxCompetitors, excludeChannelId }
) {
  const queries = buildSearchQueries(niche, format);
  const found = new Map();

  // Sequencial de propósito: interrompe cedo e economiza quota da API.
  for (const q of queries) {
    if (found.size >= maxCompetitors) break;
    let data;
    try {
      data = await youtubeDataGet(accessToken, "search", {
        part: "snippet",
        type: "channel",
        q,
        maxResults: Math.min(maxCompetitors * 2, 15),
        relevanceLanguage: "pt",
        safeSearch: "none",
      });
    } catch (err) {
      console.warn(`[CompetitorResearch] Busca "${q}" falhou:`, err.message);
      continue;
    }

    for (const item of data?.items || []) {
      const channelId = item?.id?.channelId || item?.snippet?.channelId;
      if (!channelId || channelId === excludeChannelId || found.has(channelId))
        continue;
      found.set(channelId, {
        id: channelId,
        title: item?.snippet?.channelTitle || item?.snippet?.title || "",
        description: (item?.snippet?.description || "").slice(0, 280),
        thumbnailUrl: pickThumbnailUrl(item?.snippet?.thumbnails),
        url: `https://www.youtube.com/channel/${channelId}`,
        sourceQuery: q,
      });
      if (found.size >= maxCompetitors) break;
    }
  }

  return [...found.values()];
}

async function resolveSeedChannelId(accessToken, raw) {
  if (/^UC[\w-]{20,}$/.test(raw)) return raw;

  const idMatch = raw.match(/channel\/(UC[\w-]+)/);
  if (idMatch) return idMatch[1];

  const handleMatch = raw.includes("youtube.com")
    ? raw.match(/@([\w.-]+)/)
    : raw.startsWith("@")
      ? [null, raw.slice(1)]
      : null;

  if (handleMatch) {
    const data = await youtubeDataGet(accessToken, "search", {
      part: "snippet",
      type: "channel",
      q: `@${handleMatch[1]}`,
      maxResults: 1,
    });
    return data?.items?.[0]?.id?.channelId || null;
  }

  return raw; // assume que já é um channelId
}

async function resolveSeedChannels(accessToken, seedChannels = []) {
  const resolved = [];
  for (const seed of seedChannels) {
    const raw = String(seed || "").trim();
    if (!raw) continue;
    try {
      const channelId = await resolveSeedChannelId(accessToken, raw);
      if (!channelId) continue;

      const data = await youtubeDataGet(accessToken, "channels", {
        part: "snippet,statistics",
        id: channelId,
      });
      const item = data?.items?.[0];
      if (!item) continue;

      const stats = item.statistics || {};
      const snippet = item.snippet || {};
      resolved.push({
        id: item.id,
        title: snippet.title || "",
        description: (snippet.description || "").slice(0, 280),
        thumbnailUrl: pickThumbnailUrl(snippet.thumbnails),
        url: `https://www.youtube.com/channel/${item.id}`,
        subscriberCount: toCount(stats.subscriberCount),
        videoCount: toCount(stats.videoCount),
        sourceQuery: "seed",
      });
    } catch (err) {
      // Um seed inválido não deve abortar a pesquisa inteira.
      console.warn(`[CompetitorResearch] Seed "${raw}" ignorado:`, err.message);
    }
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Coleta de vídeos por canal
// ---------------------------------------------------------------------------

async function fetchChannelRecentVideos(
  accessToken,
  channelId,
  { limit = DEFAULT_VIDEOS_PER_CHANNEL, format = "SHORT" } = {}
) {
  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "contentDetails,snippet,statistics",
    id: channelId,
  });
  const item = channelData?.items?.[0];
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;

  const channelInfo = item
    ? {
        id: channelId,
        title: item?.snippet?.title || "",
        subscriberCount: toCount(item?.statistics?.subscriberCount),
        videoCount: toCount(item?.statistics?.videoCount),
        url: `https://www.youtube.com/channel/${channelId}`,
      }
    : null;

  if (!uploadsPlaylistId) return { channel: channelInfo, videos: [] };

  const playlistData = await youtubeDataGet(accessToken, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(Math.max(limit, 5), 50),
  });

  const videoIds = (playlistData?.items || [])
    .map((e) => e?.contentDetails?.videoId || e?.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return { channel: channelInfo, videos: [] };

  const videosData = await youtubeDataGet(accessToken, "videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
  });

  const videos = (videosData?.items || []).map((v) => {
    const snippet = v.snippet || {};
    const stats = v.statistics || {};
    const durationSec = parseIso8601Duration(v?.contentDetails?.duration);
    return {
      videoId: v.id,
      title: snippet.title || "",
      description: (snippet.description || "").slice(0, 400),
      publishedAt: snippet.publishedAt || "",
      ageDays: daysSince(snippet.publishedAt),
      views: toCount(stats.viewCount),
      likes: toCount(stats.likeCount),
      comments: toCount(stats.commentCount),
      durationSec,
      durationLabel: durationSec ? `${Math.round(durationSec)}s` : "—",
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnailUrl: pickThumbnailUrl(snippet.thumbnails),
    };
  });

  // Filtro por formato com relaxamento progressivo (garante amostra mínima).
  let filtered = videos.filter((v) => videoMatchesFormat(v, format));
  if (filtered.length < 3 && videos.length > filtered.length) {
    const fmt = normalizeFormat(format);
    filtered = videos.filter((v) =>
      fmt === "LONG"
        ? v.durationSec > 60
        : v.durationSec <= 300 || titleSuggestsShort(v.title)
    );
  }
  if (filtered.length < 3) filtered = videos;

  return { channel: channelInfo, videos: filtered };
}

function detectOutliers(videos = []) {
  if (!videos.length) return [];
  const baseline = median(videos.map((v) => v.views)) || 1;
  const threshold = baseline * OUTLIER_MULTIPLIER;

  return videos
    .map((v) => ({
      ...v,
      channelMedianViews: Math.round(baseline),
      outlierRatio: Number((v.views / baseline).toFixed(2)),
      isOutlier: v.views >= threshold && v.views >= OUTLIER_MIN_VIEWS,
    }))
    .filter((v) => v.isOutlier)
    .sort((a, b) => b.outlierRatio - a.outlierRatio);
}

// ---------------------------------------------------------------------------
// Parse da análise IA
// ---------------------------------------------------------------------------

const SALVAGE_KEYS = [
  "derivedIdeas",
  "outlierAnalyses",
  "promotedPatterns",
  "competitorErrors",
  "competitors",
];

function salvagePartialAnalysis(text = "", fallback = {}) {
  const salvaged = { ...fallback };
  const candidate = extractJsonCandidate(text);
  for (const key of SALVAGE_KEYS) {
    const match = candidate.match(
      new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])`)
    );
    if (!match) continue;
    try {
      const arr = JSON.parse(match[1].replace(/,\s*]/g, "]"));
      if (Array.isArray(arr) && arr.length) salvaged[key] = arr;
    } catch {
      /* ignore */
    }
  }
  return salvaged;
}

function normalizeAnalysisShape(parsed = {}, fallback = {}) {
  if (!parsed || typeof parsed !== "object") return null;
  const pickArray = (value, fb = []) =>
    Array.isArray(value) && value.length ? value : fb;
  return {
    competitors: pickArray(parsed.competitors, fallback.competitors),
    outlierAnalyses: pickArray(
      parsed.outlierAnalyses,
      fallback.outlierAnalyses
    ),
    derivedIdeas: pickArray(parsed.derivedIdeas, fallback.derivedIdeas),
    promotedPatterns: Array.isArray(parsed.promotedPatterns)
      ? parsed.promotedPatterns
      : [],
    competitorErrors: Array.isArray(parsed.competitorErrors)
      ? parsed.competitorErrors
      : [],
  };
}

async function parseCompetitorAnalysis(
  llmText,
  { fallback, repairFn = null } = {}
) {
  if (!llmText) return { analysis: null, repaired: false, salvaged: false };

  // 1) Parse direto
  try {
    return {
      analysis: normalizeAnalysisShape(parseJsonLocally(llmText), fallback),
      repaired: false,
      salvaged: false,
    };
  } catch (firstErr) {
    console.warn("[CompetitorResearch] JSON parse:", firstErr.message);
  }

  // 2) Reparo via IA
  if (repairFn) {
    try {
      const candidate = extractJsonCandidate(llmText).slice(0, 14000);
      const repairedText = await repairFn(candidate);
      if (repairedText) {
        return {
          analysis: normalizeAnalysisShape(
            parseJsonLocally(repairedText),
            fallback
          ),
          repaired: true,
          salvaged: false,
        };
      }
    } catch (repairErr) {
      console.warn("[CompetitorResearch] JSON repair:", repairErr.message);
    }
  }

  // 3) Salvage parcial (regex por chave)
  const partial = salvagePartialAnalysis(llmText, fallback);
  const hasUseful =
    (partial.derivedIdeas?.length || 0) > 0 ||
    (partial.outlierAnalyses?.length || 0) > 0;
  if (hasUseful) {
    return {
      analysis: normalizeAnalysisShape(partial, fallback),
      repaired: false,
      salvaged: true,
    };
  }

  return { analysis: null, repaired: false, salvaged: false };
}

function buildAnalysisPrompt({ niche, format, competitors, outliers }) {
  const payload = {
    outliers: outliers.slice(0, 4).map((o) => ({
      channel: o.channelTitle,
      title: o.title.slice(0, 120),
      views: o.views,
      ratio: o.outlierRatio,
      url: o.url,
    })),
    competitors: competitors.slice(0, 5).map((c) => ({
      title: c.title,
      subscribers: c.subscriberCount,
      url: c.url,
    })),
  };

  return `Analista YouTube ${format === "LONG" ? "" : "Shorts "}— nicho "${niche}".

OUTLIERS (views ≥ ${OUTLIER_MULTIPLIER}× mediana):
${JSON.stringify(payload.outliers)}

CANAIS:
${JSON.stringify(payload.competitors)}

Retorne SOMENTE um objeto JSON (sem markdown, sem comentários). Aspas duplas em strings. Sem vírgula trailing.
{
  "competitors":[{"title":"","url":"","size":"","notes":"","monitor":true}],
  "outlierAnalyses":[{"videoTitle":"","channel":"","videoUrl":"","hook":{"verbal":"","onScreen":"","archetype":""},"structure":{"format":"","beats":""},"cta":{"type":"","text":""},"mechanic":"","competitorMistakes":""}],
  "derivedIdeas":[{"title":"","hookPt":"","whyNotCopy":"","pillar":"astonishing","mechanicSource":""}],
  "promotedPatterns":[],
  "competitorErrors":[]
}

Regras: PT-BR; mecânica (não cópia); derivedIdeas=3; outlierAnalyses=1 por outlier.`;
}

// ---------------------------------------------------------------------------
// Formatação Markdown / memória Obsidian
// ---------------------------------------------------------------------------

function formatSubscriberCount(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1000)}k`;
  return String(num || "—");
}

function escapeTableCell(text = "") {
  return String(text || "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim();
}

function upsertChannelRow(existingTable, channel) {
  const title = escapeTableCell(channel.title);
  const url = channel.url || "";
  if (
    (url && existingTable.includes(url)) ||
    (title && existingTable.includes(`| ${title} |`))
  ) {
    return existingTable;
  }
  const size = formatSubscriberCount(channel.subscriberCount);
  const notes = escapeTableCell(
    channel.notes || channel.sourceQuery || "IA search"
  );
  return `${existingTable.trimEnd()}\n| ${title} | — | ${size} | ${url} | ${notes} |`;
}

function appendResearchSection(content, section) {
  const marker = "## Pesquisas automáticas (IA)";
  const block = `\n\n${marker}\n\n### ${nowStamp()} — ${section.title}\n\n${section.body}\n`;
  if (content.includes(marker)) {
    return content.replace(marker, `${marker}${block}`);
  }
  return `${content.trimEnd()}\n${block}`;
}

function appendCandidates(content, ideas = []) {
  if (!ideas.length) return content;
  const stamp = todayStamp();
  const lines = ideas.map(
    (idea) =>
      `- **${escapeTableCell(idea.title)}** — ${escapeTableCell(idea.hookPt)} _(inbox · IA ${stamp})_`
  );
  const marker = "## Candidatos em observação";
  if (!content.includes(marker)) return content;
  const [head, ...rest] = content.split(marker);
  const tail = rest.join(marker);
  return `${head}${marker}${tail.trimEnd()}\n${lines.join("\n")}\n`;
}

function appendPromotedPatterns(content, patterns = []) {
  if (!patterns.length) return content;
  const marker = "## Padrões promovidos (concorrentes → nosso formato)";
  if (!content.includes(marker)) return content;
  const stamp = todayStamp();
  const additions = patterns.map(
    (p) => `- ${escapeTableCell(p)} _(IA ${stamp})_`
  );
  return content.replace(marker, `${marker}\n${additions.join("\n")}`);
}

function appendCompetitorErrors(content, errors = []) {
  if (!errors.length) return content;
  const marker = "## Erros dos concorrentes (nosso diferencial)";
  if (!content.includes(marker)) return content;
  const additions = errors.map((e) => `- ${escapeTableCell(e)}`);
  const afterMarker = content.split(marker)[1] || "";
  if (additions.every((a) => afterMarker.includes(a.slice(2)))) return content;
  return content.replace(marker, `${marker}\n${additions.join("\n")}`);
}

function formatVideoAge(publishedAt) {
  const days = daysSince(publishedAt);
  if (days == null) return "—";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}m`;
  return `${Math.round(days / 365)}a`;
}

function buildFullOutlierFicha(outlier = {}, analysisEntry = {}) {
  const fmtNum = (v) => (v != null ? Number(v).toLocaleString("pt-BR") : "—");
  const title = escapeTableCell(
    analysisEntry.videoTitle || outlier.title || "Outlier"
  );
  const ratio = outlier.outlierRatio != null ? `${outlier.outlierRatio}×` : "—";
  const duration =
    outlier.durationLabel ||
    (outlier.durationSec ? `${outlier.durationSec}s` : "—");
  const videoId = outlier.videoId || "";
  const url =
    analysisEntry.videoUrl ||
    outlier.url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "—");

  return [
    `### ${title}`,
    `- **Canal:** ${escapeTableCell(analysisEntry.channel || outlier.channelTitle)}`,
    `- **videoId / URL:** ${videoId || "—"} · ${url}`,
    `- **Views / idade / duração:** ${fmtNum(outlier.views)} / ${formatVideoAge(outlier.publishedAt)} / ${duration}`,
    `- **Outlier?** ${ratio} vs mediana do canal (${fmtNum(outlier.channelMedianViews)} views)`,
    "",
    "#### Hook (0–3s)",
    `- Visual (1º frame): ${escapeTableCell(analysisEntry.hook?.visual)}`,
    `- Verbal (1ª frase): ${escapeTableCell(analysisEntry.hook?.verbal || outlier.title)}`,
    `- Texto na tela: ${escapeTableCell(analysisEntry.hook?.onScreen)}`,
    `- Arquétipo: ${escapeTableCell(analysisEntry.hook?.archetype)}`,
    "",
    "#### Estrutura",
    `- Formato: ${escapeTableCell(analysisEntry.structure?.format)}`,
    `- Blocos / beats: ${escapeTableCell(analysisEntry.structure?.beats)}`,
    `- Open loops: ${escapeTableCell(analysisEntry.structure?.openLoops)}`,
    `- Pattern interrupts: ${escapeTableCell(analysisEntry.structure?.patternInterrupts)}`,
    "",
    "#### Retenção & payoff",
    `- O que o gancho prometeu: ${escapeTableCell(analysisEntry.retention?.promise)}`,
    `- Onde entrega: ${escapeTableCell(analysisEntry.retention?.payoffAt)}`,
    "",
    "#### CTA",
    `- Último bloco / comentário fixo: ${escapeTableCell(analysisEntry.cta?.text)}`,
    `- Tipo: ${escapeTableCell(analysisEntry.cta?.type)}`,
    "",
    "#### Packaging",
    `- Thumb (3–5 palavras): ${escapeTableCell(analysisEntry.packaging?.thumbHint)}`,
    `- Título: ${escapeTableCell(analysisEntry.packaging?.titlePattern || outlier.title)}`,
    "",
    "#### Mecânica extraída (1 linha)",
    `> ${escapeTableCell(analysisEntry.mechanic || `Outlier ${ratio} no nicho`)}`,
    "",
    analysisEntry.competitorMistakes
      ? `#### Erros do concorrente\n- ${escapeTableCell(analysisEntry.competitorMistakes)}\n`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function mapAnalysesByTitle(analyses = []) {
  return new Map(
    analyses.map((a) => [String(a.videoTitle || "").toLowerCase(), a])
  );
}

function appendFichaArchive(content, outliers = [], analyses = []) {
  const marker = "## Ficha de dissecção (por vídeo outlier)";
  if (!outliers.length) return content;

  const analysisByTitle = mapAnalysesByTitle(analyses);
  const contentLower = content.toLowerCase();

  const blocks = outliers
    .map((o) => {
      const entry =
        analysisByTitle.get(String(o.title || "").toLowerCase()) || {};
      return buildFullOutlierFicha(o, entry);
    })
    .filter((block) => {
      const titleLine = block
        .split("\n")[0]
        .replace(/^###\s*/, "")
        .trim()
        .toLowerCase();
      return titleLine && !contentLower.includes(titleLine);
    });

  if (!blocks.length) return content;

  const sectionBody = `\n\n<!-- auto:${todayStamp()} -->\n${blocks.join("\n\n---\n\n")}\n`;
  if (!content.includes(marker)) {
    return `${content.trimEnd()}\n\n${marker}\n${sectionBody}`;
  }
  return content.replace(marker, `${marker}${sectionBody}`);
}

function buildFichaMarkdown(analysis, outliers = []) {
  if (!outliers.length) {
    return (analysis.outlierAnalyses || [])
      .map((o) => buildFullOutlierFicha({}, o))
      .join("\n\n---\n\n");
  }
  const analysisByTitle = mapAnalysesByTitle(analysis.outlierAnalyses || []);
  return outliers
    .slice(0, 4)
    .map((o) => {
      const entry =
        analysisByTitle.get(String(o.title || "").toLowerCase()) || {};
      return buildFullOutlierFicha(o, entry);
    })
    .join("\n\n---\n\n");
}

function buildIdeasMarkdown(ideas = []) {
  return ideas
    .map(
      (idea, i) =>
        `${i + 1}. **${escapeTableCell(idea.title)}**\n` +
        `   - Gancho: ${escapeTableCell(idea.hookPt)}\n` +
        `   - Mecânica: ${escapeTableCell(idea.mechanicSource)}\n` +
        `   - Por que não é cópia: ${escapeTableCell(idea.whyNotCopy)}\n` +
        `   - Pilar: ${escapeTableCell(idea.pillar)}`
    )
    .join("\n\n");
}

export function appendCompetitorResearchToMemory(
  workspaceDir,
  {
    niche,
    format,
    competitors = [],
    analysis = {},
    outliers = [],
    channelTitle = "",
  }
) {
  ensureAgentDirs(workspaceDir);
  const memoryPath = path.join(
    getAgentPaths(workspaceDir).memoryDir,
    COMPETITOR_MEMORY_FILE
  );
  let content = fs.existsSync(memoryPath)
    ? fs.readFileSync(memoryPath, "utf8")
    : `# Inteligência competitiva\n\n> 🔗 [[MEMORIA-LUMIERA]]\n\n`;

  // Frontmatter: nicho + data (preserva nicho bom já existente)
  const existingNiche =
    (content.match(/^niche:\s*(.+)$/m) || [])[1]?.trim() || "";
  const nicheToPersist = isChannelBrandNiche(niche, channelTitle)
    ? existingNiche && !isChannelBrandNiche(existingNiche, channelTitle)
      ? existingNiche
      : niche
    : niche;
  if (!isChannelBrandNiche(nicheToPersist, channelTitle)) {
    content = content.replace(/niche: .*/m, `niche: ${nicheToPersist}`);
  }
  content = content.replace(/updated: .*/m, `updated: ${todayStamp()}`);

  // Tabela "quem monitorar"
  const tableMarker = "## Quem monitorar (lista viva)";
  if (content.includes(tableMarker)) {
    const tableHeader = "| Canal | Nicho | Tamanho | URL | Notas |";
    const tableSep = "|-------|-------|---------|-----|-------|";
    const tableStart = content.indexOf(tableHeader);
    if (tableStart >= 0) {
      const afterHeader = content.indexOf(tableSep, tableStart);
      const tableEnd = content.indexOf("\n\n", afterHeader);
      const existingTable = content.slice(
        tableStart,
        tableEnd > 0 ? tableEnd : undefined
      );
      let nextTable = existingTable;
      for (const c of [...(analysis.competitors || []), ...competitors]) {
        if (c.monitor === false) continue;
        nextTable = upsertChannelRow(nextTable, {
          title: c.title,
          url: c.url,
          subscriberCount: c.subscriberCount || c.size,
          notes: c.notes,
          sourceQuery: c.sourceQuery,
        });
      }
      content = `${content.slice(0, tableStart)}${nextTable}${content.slice(
        tableEnd > 0 ? tableEnd : content.length
      )}`;
    }
  }

  const researchBody = [
    `**Nicho:** ${niche} · **Formato:** ${format}`,
    `**Outliers detectados:** ${outliers.length}`,
    "",
    "#### Fichas de dissecção (IA)",
    buildFichaMarkdown(analysis, outliers),
    "#### Ideias Lumiera derivadas",
    buildIdeasMarkdown(analysis.derivedIdeas || []),
  ].join("\n");

  content = appendResearchSection(content, {
    title: `${niche} (${format})`,
    body: researchBody,
  });
  content = appendFichaArchive(
    content,
    outliers,
    analysis.outlierAnalyses || []
  );
  content = appendCandidates(content, analysis.derivedIdeas || []);
  content = appendPromotedPatterns(content, analysis.promotedPatterns || []);
  content = appendCompetitorErrors(content, analysis.competitorErrors || []);

  fs.writeFileSync(memoryPath, content, "utf8");
  repairVaultGraphLinks(workspaceDir);

  appendDailyRunLog(
    workspaceDir,
    `- ${new Date().toISOString()} **competitor-research** (${niche}/${format}) competitors=${competitors.length} outliers=${outliers.length} ideas=${(analysis.derivedIdeas || []).length}`
  );

  return { memoryPath, memoryFile: COMPETITOR_MEMORY_FILE };
}

// ---------------------------------------------------------------------------
// Análise fallback (sem IA)
// ---------------------------------------------------------------------------

function buildFallbackAnalysis(competitors, topOutliers) {
  return {
    competitors: competitors.map((c) => ({
      title: c.title,
      url: c.url,
      size: formatSubscriberCount(c.subscriberCount),
      notes:
        c.sourceQuery === "seed" ? "canal seed" : `busca: ${c.sourceQuery}`,
      monitor: true,
    })),
    outlierAnalyses: topOutliers.map((o) => ({
      videoTitle: o.title,
      channel: o.channelTitle,
      videoUrl: o.url,
      hook: { visual: "", verbal: o.title, onScreen: "", archetype: "" },
      structure: { format: "", beats: "", openLoops: "" },
      cta: { type: "", text: "" },
      packaging: { titlePattern: o.title, thumbHint: "" },
      mechanic: `Outlier ${o.outlierRatio}× mediana (${o.channelMedianViews} views)`,
      competitorMistakes: "",
    })),
    derivedIdeas: topOutliers.slice(0, 3).map((o, i) => ({
      title: `Ideia ${i + 1} — mecânica de "${o.title.slice(0, 40)}…"`,
      hookPt: o.title,
      whyNotCopy: "Transplante de mecânica com novo tópico do nosso nicho",
      pillar: "astonishing",
      mechanicSource: o.title,
    })),
    promotedPatterns: [],
    competitorErrors: [],
  };
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export async function runCompetitorResearch(
  workspaceDir,
  {
    niche,
    format = "SHORT",
    maxCompetitors = DEFAULT_MAX_COMPETITORS,
    videosPerChannel = DEFAULT_VIDEOS_PER_CHANNEL,
    seedChannels = [],
    projectsRoot = "",
    llmFn = null,
    repairJsonFn = null,
  } = {}
) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const ownOverview = await youtubeDataGet(accessToken, "channels", {
    part: "snippet",
    mine: "true",
  });
  const ownChannel = ownOverview?.items?.[0] || null;
  const ownChannelId = ownChannel?.id || null;
  const channelTitle = ownChannel?.snippet?.title || "";

  const config =
    readJsonFile(path.join(workspaceDir, "config_qanat.json")) || {};
  const resolvedNiche = resolveResearchNiche(workspaceDir, {
    niche,
    config,
    channelTitle,
    projectsRoot: projectsRoot || resolveProjectsRoot(),
  });
  const resolvedFormat = normalizeFormat(format);
  const maxC = Math.min(
    Math.max(Number(maxCompetitors) || DEFAULT_MAX_COMPETITORS, 1),
    MAX_COMPETITORS_HARD_CAP
  );

  // 1) Seeds + descoberta
  const competitors = await resolveSeedChannels(accessToken, seedChannels);
  if (competitors.length < maxC) {
    const discovered = await searchCompetitorChannels(accessToken, {
      niche: resolvedNiche,
      format: resolvedFormat,
      maxCompetitors: maxC - competitors.length,
      excludeChannelId: ownChannelId,
    });
    const seen = new Set(competitors.map((c) => c.id));
    for (const c of discovered) {
      if (seen.has(c.id) || competitors.length >= maxC) continue;
      competitors.push(c);
      seen.add(c.id);
    }
  }

  // 2) Coleta de vídeos em paralelo (falha de um canal não derruba os demais)
  const fetchResults = await Promise.allSettled(
    competitors.map((competitor) =>
      fetchChannelRecentVideos(accessToken, competitor.id, {
        limit: videosPerChannel,
        format: resolvedFormat,
      }).then((result) => ({ competitor, ...result }))
    )
  );

  const allOutliers = [];
  const channelReports = [];

  for (const settled of fetchResults) {
    if (settled.status === "rejected") {
      console.warn(
        "[CompetitorResearch] Canal ignorado:",
        settled.reason?.message || settled.reason
      );
      continue;
    }
    const { competitor, channel, videos } = settled.value;
    if (!channel) continue;

    const outliers = detectOutliers(videos).map((o) => ({
      ...o,
      channelId: channel.id,
      channelTitle: channel.title,
      channelUrl: channel.url,
    }));

    channelReports.push({
      ...competitor,
      ...channel,
      videosScanned: videos.length,
      medianViews: videos.length ? median(videos.map((v) => v.views)) : 0,
      outliers,
    });
    allOutliers.push(...outliers);
  }

  allOutliers.sort((a, b) => b.outlierRatio - a.outlierRatio);
  const topOutliers = allOutliers.slice(0, 6);

  // 3) Análise IA (com fallback determinístico)
  let analysis = buildFallbackAnalysis(competitors, topOutliers);
  let aiAnalysisFailed = false;
  let aiAnalysisWarning = null;

  if (llmFn && topOutliers.length > 0) {
    const prompt = buildAnalysisPrompt({
      niche: resolvedNiche,
      format: resolvedFormat,
      competitors: channelReports,
      outliers: topOutliers,
    });
    try {
      const llmText = await llmFn(prompt);
      const {
        analysis: parsed,
        repaired,
        salvaged,
      } = await parseCompetitorAnalysis(llmText, {
        fallback: analysis,
        repairFn: repairJsonFn,
      });
      if (parsed) {
        analysis = parsed;
        if (repaired) {
          aiAnalysisWarning =
            "Análise IA recuperada (JSON reparado automaticamente).";
        } else if (salvaged) {
          aiAnalysisWarning = "Análise IA parcial recuperada dos outliers.";
        }
      } else {
        aiAnalysisFailed = true;
        aiAnalysisWarning = llmText
          ? "IA retornou resposta inválida — usando análise automática básica."
          : "IA indisponível — dados do YouTube salvos com análise básica.";
        if (llmText) {
          console.warn(
            "[CompetitorResearch] Resposta IA (trecho):",
            String(llmText).slice(0, 400)
          );
        }
      }
    } catch (err) {
      aiAnalysisFailed = true;
      aiAnalysisWarning = `IA falhou (${err.message}) — dados do YouTube salvos com análise básica.`;
      console.warn("[CompetitorResearch]", aiAnalysisWarning);
    }
  }

  // 4) Persistência na memória Obsidian
  const memory = appendCompetitorResearchToMemory(workspaceDir, {
    niche: resolvedNiche,
    format: resolvedFormat,
    competitors: channelReports,
    analysis,
    outliers: topOutliers,
    channelTitle,
  });

  return {
    ok: true,
    niche: resolvedNiche,
    format: resolvedFormat,
    aiAnalysisFailed,
    aiAnalysisWarning,
    competitors: channelReports.map((c) => ({
      id: c.id,
      title: c.title,
      url: c.url,
      subscriberCount: c.subscriberCount,
      videosScanned: c.videosScanned,
      outlierCount: c.outliers.length,
    })),
    outliers: topOutliers.map((o) => ({
      videoId: o.videoId,
      title: o.title,
      channelTitle: o.channelTitle,
      views: o.views,
      outlierRatio: o.outlierRatio,
      url: o.url,
    })),
    analysis,
    memory,
    fetchedAt: new Date().toISOString(),
  };
}
