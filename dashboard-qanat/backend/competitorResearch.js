/**
 * Pesquisa automática de concorrentes — YouTube Data API + análise IA + memória Obsidian.
 */

import fs from "fs";
import path from "path";
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

const COMPETITOR_MEMORY_FILE = "competitor-intelligence.md";
const OUTLIER_MULTIPLIER = 3.5;
const DEFAULT_MAX_COMPETITORS = 5;
const DEFAULT_VIDEOS_PER_CHANNEL = 20;

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function formatCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function parseIso8601Duration(iso = "") {
  const match = String(iso).match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/,
  );
  if (!match) return 0;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  return h * 3600 + m * 60 + s;
}

function median(values = []) {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function daysSince(isoDate = "") {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function titleSuggestsShort(title = "") {
  return /#shorts?\b|#short\b|\bshorts\b/i.test(String(title));
}

function videoMatchesFormat(video, format = "SHORT") {
  const fmt = String(format || "SHORT").toUpperCase();
  if (fmt === "LONG") {
    return video.durationSec > 60 && !titleSuggestsShort(video.title);
  }
  return (video.durationSec > 0 && video.durationSec <= 180) || titleSuggestsShort(video.title);
}

async function youtubeDataGet(accessToken, apiPath, params = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${apiPath}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Falha na API YouTube (${apiPath}).`);
  }
  return data;
}

function buildSearchQueries(niche, format) {
  const base = String(niche || "").trim();
  const fmt = String(format || "SHORT").toUpperCase();
  const queries = [];
  if (base) {
    queries.push(base);
    if (fmt === "SHORT") queries.push(`${base} shorts`);
    else queries.push(`${base} documentary`);
  }
  if (fmt === "SHORT") queries.push("construction history shorts");
  return [...new Set(queries.filter(Boolean))].slice(0, 3);
}

async function searchCompetitorChannels(accessToken, { niche, format, maxCompetitors, excludeChannelId }) {
  const queries = buildSearchQueries(niche, format);
  const found = new Map();

  for (const q of queries) {
    if (found.size >= maxCompetitors) break;
    const data = await youtubeDataGet(accessToken, "search", {
      part: "snippet",
      type: "channel",
      q,
      maxResults: Math.min(maxCompetitors * 2, 15),
      relevanceLanguage: "pt",
      safeSearch: "none",
    });
    for (const item of data?.items || []) {
      const channelId = item?.id?.channelId || item?.snippet?.channelId;
      if (!channelId || channelId === excludeChannelId) continue;
      if (found.has(channelId)) continue;
      found.set(channelId, {
        id: channelId,
        title: item?.snippet?.channelTitle || item?.snippet?.title || "",
        description: (item?.snippet?.description || "").slice(0, 280),
        thumbnailUrl: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || "",
        url: `https://www.youtube.com/channel/${channelId}`,
        sourceQuery: q,
      });
      if (found.size >= maxCompetitors) break;
    }
  }

  return [...found.values()];
}

async function resolveSeedChannels(accessToken, seedChannels = []) {
  const resolved = [];
  for (const seed of seedChannels) {
    const raw = String(seed || "").trim();
    if (!raw) continue;

    let channelId = raw;
    if (raw.includes("youtube.com")) {
      const handleMatch = raw.match(/@([\w.-]+)/);
      const idMatch = raw.match(/channel\/(UC[\w-]+)/);
      if (idMatch) channelId = idMatch[1];
      else if (handleMatch) {
        const data = await youtubeDataGet(accessToken, "search", {
          part: "snippet",
          type: "channel",
          q: `@${handleMatch[1]}`,
          maxResults: 1,
        });
        channelId = data?.items?.[0]?.id?.channelId;
        if (!channelId) continue;
      }
    } else if (raw.startsWith("@")) {
      const data = await youtubeDataGet(accessToken, "search", {
        part: "snippet",
        type: "channel",
        q: raw,
        maxResults: 1,
      });
      channelId = data?.items?.[0]?.id?.channelId;
      if (!channelId) continue;
    }

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
      thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
      url: `https://www.youtube.com/channel/${item.id}`,
      subscriberCount: formatCount(stats.subscriberCount),
      videoCount: formatCount(stats.videoCount),
      sourceQuery: "seed",
    });
  }
  return resolved;
}

async function fetchChannelRecentVideos(accessToken, channelId, { limit = DEFAULT_VIDEOS_PER_CHANNEL, format = "SHORT" } = {}) {
  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "contentDetails,snippet,statistics",
    id: channelId,
  });
  const item = channelData?.items?.[0];
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return { channel: null, videos: [] };

  const playlistData = await youtubeDataGet(accessToken, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(Math.max(limit, 5), 50),
  });

  const videoIds = (playlistData?.items || [])
    .map((entry) => entry?.contentDetails?.videoId || entry?.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (!videoIds.length) {
    return {
      channel: {
        id: channelId,
        title: item?.snippet?.title || "",
        subscriberCount: formatCount(item?.statistics?.subscriberCount),
        videoCount: formatCount(item?.statistics?.videoCount),
        url: `https://www.youtube.com/channel/${channelId}`,
      },
      videos: [],
    };
  }

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
      views: formatCount(stats.viewCount),
      likes: formatCount(stats.likeCount),
      comments: formatCount(stats.commentCount),
      durationSec,
      durationLabel: durationSec ? `${Math.round(durationSec)}s` : "—",
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
    };
  }).filter((v) => videoMatchesFormat(v, format));

  return {
    channel: {
      id: channelId,
      title: item?.snippet?.title || "",
      subscriberCount: formatCount(item?.statistics?.subscriberCount),
      videoCount: formatCount(item?.statistics?.videoCount),
      url: `https://www.youtube.com/channel/${channelId}`,
    },
    videos,
  };
}

function detectOutliers(videos = []) {
  if (!videos.length) return [];
  const viewCounts = videos.map((v) => v.views).filter((v) => v > 0);
  const baseline = median(viewCounts) || 1;
  const threshold = baseline * OUTLIER_MULTIPLIER;

  return videos
    .map((v) => ({
      ...v,
      channelMedianViews: Math.round(baseline),
      outlierRatio: baseline > 0 ? Number((v.views / baseline).toFixed(2)) : 0,
      isOutlier: v.views >= threshold && v.views >= 1000,
    }))
    .filter((v) => v.isOutlier)
    .sort((a, b) => b.outlierRatio - a.outlierRatio);
}

function parseJsonFromLlm(text = "") {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildAnalysisPrompt({ niche, format, competitors, outliers }) {
  const payload = {
    niche,
    format,
    competitors: competitors.map((c) => ({
      title: c.title,
      subscribers: c.subscriberCount,
      url: c.url,
      videoCount: c.videoCount,
    })),
    outliers: outliers.map((o) => ({
      channel: o.channelTitle,
      title: o.title,
      views: o.views,
      medianViews: o.channelMedianViews,
      ratio: o.outlierRatio,
      ageDays: o.ageDays,
      duration: o.durationLabel,
      url: o.url,
      description: o.description,
    })),
  };

  return `Você é analista de inteligência competitiva para YouTube (${format}) no nicho "${niche}".

Dados coletados automaticamente da API do YouTube (outliers = views ≥ ${OUTLIER_MULTIPLIER}× mediana do canal):

${JSON.stringify(payload, null, 2)}

Analise em português do Brasil. Estude MECÂNICA e packaging — nunca copie tópico palavra por palavra.

Retorne APENAS JSON válido (sem markdown) neste schema:
{
  "competitors": [
    { "title": "", "url": "", "size": "", "notes": "", "monitor": true }
  ],
  "outlierAnalyses": [
    {
      "videoTitle": "",
      "channel": "",
      "videoUrl": "",
      "hook": { "visual": "", "verbal": "", "onScreen": "", "archetype": "" },
      "structure": { "format": "", "beats": "", "openLoops": "" },
      "cta": { "type": "", "text": "" },
      "packaging": { "titlePattern": "", "thumbHint": "" },
      "mechanic": "",
      "competitorMistakes": ""
    }
  ],
  "derivedIdeas": [
    {
      "title": "",
      "hookPt": "",
      "whyNotCopy": "",
      "pillar": "impactful|practical|provocative|astonishing",
      "mechanicSource": ""
    }
  ],
  "promotedPatterns": [],
  "competitorErrors": []
}

Regras:
- outlierAnalyses: 1 entrada por outlier (máx ${outliers.length})
- derivedIdeas: exatamente 3 ideias originais para o canal do usuário
- promotedPatterns: só se a mesma mecânica aparecer em 2+ outliers
- competitorErrors: erros recorrentes observados nos outliers`;
}

function formatSubscriberCount(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1000)}k`;
  return String(num || "—");
}

function escapeTableCell(text = "") {
  return String(text || "").replace(/\|/g, "/").replace(/\n/g, " ").trim();
}

function upsertChannelRow(existingTable, channel) {
  const title = escapeTableCell(channel.title);
  const url = channel.url || "";
  if (existingTable.includes(url) || (title && existingTable.includes(`| ${title} |`))) {
    return existingTable;
  }
  const size = formatSubscriberCount(channel.subscriberCount);
  const notes = escapeTableCell(channel.notes || channel.sourceQuery || "IA search");
  return `${existingTable.trimEnd()}\n| ${title} | — | ${size} | ${url} | ${notes} |`;
}

function appendResearchSection(content, section) {
  const marker = "## Pesquisas automáticas (IA)";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const block = `\n\n${marker}\n\n### ${stamp} — ${section.title}\n\n${section.body}\n`;
  if (content.includes(marker)) {
    return content.replace(marker, `${marker}${block}`);
  }
  return `${content.trimEnd()}\n${block}`;
}

function appendCandidates(content, ideas = []) {
  if (!ideas.length) return content;
  const lines = ideas.map((idea) => {
    const title = escapeTableCell(idea.title);
    const hook = escapeTableCell(idea.hookPt);
    return `- **${title}** — ${hook} _(inbox · IA ${new Date().toISOString().slice(0, 10)})_`;
  });
  const marker = "## Candidatos em observação";
  if (!content.includes(marker)) return content;
  const parts = content.split(marker);
  const tail = parts[1] || "";
  const nextTail = `${tail.trimEnd()}\n${lines.join("\n")}\n`;
  return `${parts[0]}${marker}${nextTail}`;
}

function appendPromotedPatterns(content, patterns = []) {
  if (!patterns.length) return content;
  const marker = "## Padrões promovidos (concorrentes → nosso formato)";
  const additions = patterns.map((p) => `- ${escapeTableCell(p)} _(IA ${new Date().toISOString().slice(0, 10)})_`);
  if (!content.includes(marker)) return content;
  return content.replace(
    marker,
    `${marker}\n${additions.join("\n")}`,
  );
}

function appendCompetitorErrors(content, errors = []) {
  if (!errors.length) return content;
  const marker = "## Erros dos concorrentes (nosso diferencial)";
  const additions = errors.map((e) => `- ${escapeTableCell(e)}`);
  if (!content.includes(marker)) return content;
  const afterMarker = content.split(marker)[1] || "";
  if (additions.every((a) => afterMarker.includes(a.slice(2)))) return content;
  return content.replace(marker, `${marker}\n${additions.join("\n")}`);
}

function buildFichaMarkdown(analysis) {
  const lines = [];
  for (const o of analysis.outlierAnalyses || []) {
    lines.push(`#### ${escapeTableCell(o.videoTitle)}`);
    lines.push(`- **Canal:** ${escapeTableCell(o.channel)}`);
    lines.push(`- **URL:** ${o.videoUrl || "—"}`);
    lines.push(`- **Mecânica:** ${escapeTableCell(o.mechanic)}`);
    lines.push(`- **Hook verbal:** ${escapeTableCell(o.hook?.verbal)}`);
    lines.push(`- **Hook visual:** ${escapeTableCell(o.hook?.visual)}`);
    lines.push(`- **Texto na tela:** ${escapeTableCell(o.hook?.onScreen)}`);
    lines.push(`- **Estrutura:** ${escapeTableCell(o.structure?.format)} — ${escapeTableCell(o.structure?.beats)}`);
    lines.push(`- **CTA:** ${escapeTableCell(o.cta?.text)} (${escapeTableCell(o.cta?.type)})`);
    lines.push(`- **Packaging:** ${escapeTableCell(o.packaging?.titlePattern)}`);
    lines.push("");
  }
  return lines.join("\n");
}

function buildIdeasMarkdown(ideas = []) {
  return ideas.map((idea, i) => (
    `${i + 1}. **${escapeTableCell(idea.title)}**\n`
    + `   - Gancho: ${escapeTableCell(idea.hookPt)}\n`
    + `   - Mecânica: ${escapeTableCell(idea.mechanicSource)}\n`
    + `   - Por que não é cópia: ${escapeTableCell(idea.whyNotCopy)}\n`
    + `   - Pilar: ${escapeTableCell(idea.pillar)}`
  )).join("\n\n");
}

export function appendCompetitorResearchToMemory(workspaceDir, {
  niche,
  format,
  competitors = [],
  analysis = {},
  outliers = [],
}) {
  ensureAgentDirs(workspaceDir);
  const memoryPath = path.join(getAgentPaths(workspaceDir).memoryDir, COMPETITOR_MEMORY_FILE);
  let content = fs.existsSync(memoryPath)
    ? fs.readFileSync(memoryPath, "utf8")
    : `# Inteligência competitiva\n\n> 🔗 [[MEMORIA-LUMIERA]]\n\n`;

  const today = new Date().toISOString().slice(0, 10);
  content = content.replace(/niche: .*/m, `niche: ${niche}`);
  content = content.replace(/updated: .*/m, `updated: ${today}`);

  const tableMarker = "## Quem monitorar (lista viva)";
  if (content.includes(tableMarker)) {
    const tableHeader = "| Canal | Nicho | Tamanho | URL | Notas |";
    const tableSep = "|-------|-------|---------|-----|-------|";
    const tableStart = content.indexOf(tableHeader);
    if (tableStart >= 0) {
      const afterHeader = content.indexOf(tableSep, tableStart);
      const tableEnd = content.indexOf("\n\n", afterHeader);
      const existingTable = content.slice(tableStart, tableEnd > 0 ? tableEnd : undefined);
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
      content = `${content.slice(0, tableStart)}${nextTable}${content.slice(tableEnd > 0 ? tableEnd : content.length)}`;
    }
  }

  const researchBody = [
    `**Nicho:** ${niche} · **Formato:** ${format}`,
    `**Outliers detectados:** ${outliers.length}`,
    "",
    "#### Fichas de dissecção (IA)",
    buildFichaMarkdown(analysis),
    "#### Ideias Lumiera derivadas",
    buildIdeasMarkdown(analysis.derivedIdeas || []),
  ].join("\n");

  content = appendResearchSection(content, {
    title: `${niche} (${format})`,
    body: researchBody,
  });

  content = appendCandidates(content, analysis.derivedIdeas || []);
  content = appendPromotedPatterns(content, analysis.promotedPatterns || []);
  content = appendCompetitorErrors(content, analysis.competitorErrors || []);

  fs.writeFileSync(memoryPath, content, "utf8");
  repairVaultGraphLinks(workspaceDir);

  appendDailyRunLog(
    workspaceDir,
    `- ${new Date().toISOString()} **competitor-research** (${niche}/${format}) competitors=${competitors.length} outliers=${outliers.length} ideas=${(analysis.derivedIdeas || []).length}`,
  );

  return { memoryPath, memoryFile: COMPETITOR_MEMORY_FILE };
}

export async function runCompetitorResearch(workspaceDir, {
  niche,
  format = "SHORT",
  maxCompetitors = DEFAULT_MAX_COMPETITORS,
  videosPerChannel = DEFAULT_VIDEOS_PER_CHANNEL,
  seedChannels = [],
  llmFn = null,
} = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const ownOverview = await youtubeDataGet(accessToken, "channels", {
    part: "snippet",
    mine: "true",
  });
  const ownChannelId = ownOverview?.items?.[0]?.id || null;

  const config = readJsonFile(path.join(workspaceDir, "config_qanat.json")) || {};
  const resolvedNiche = String(niche || config.niche || "").trim()
    || (ownOverview?.items?.[0]?.snippet?.title || "conteúdo YouTube");
  const resolvedFormat = String(format || "SHORT").toUpperCase() === "LONG" ? "LONG" : "SHORT";
  const maxC = Math.min(Math.max(Number(maxCompetitors) || DEFAULT_MAX_COMPETITORS, 1), 10);

  let competitors = await resolveSeedChannels(accessToken, seedChannels);
  if (competitors.length < maxC) {
    const discovered = await searchCompetitorChannels(accessToken, {
      niche: resolvedNiche,
      format: resolvedFormat,
      maxCompetitors: maxC - competitors.length,
      excludeChannelId: ownChannelId,
    });
    const seen = new Set(competitors.map((c) => c.id));
    for (const c of discovered) {
      if (seen.has(c.id)) continue;
      competitors.push(c);
      seen.add(c.id);
      if (competitors.length >= maxC) break;
    }
  }

  const allOutliers = [];
  const channelReports = [];

  for (const competitor of competitors) {
    const { channel, videos } = await fetchChannelRecentVideos(accessToken, competitor.id, {
      limit: videosPerChannel,
      format: resolvedFormat,
    });
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

  let analysis = {
    competitors: competitors.map((c) => ({
      title: c.title,
      url: c.url,
      size: formatSubscriberCount(c.subscriberCount),
      notes: c.sourceQuery === "seed" ? "canal seed" : `busca: ${c.sourceQuery}`,
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

  if (llmFn && topOutliers.length > 0) {
    const prompt = buildAnalysisPrompt({
      niche: resolvedNiche,
      format: resolvedFormat,
      competitors: channelReports,
      outliers: topOutliers,
    });
    const llmText = await llmFn(prompt);
    const parsed = parseJsonFromLlm(llmText);
    if (parsed && typeof parsed === "object") {
      analysis = {
        competitors: parsed.competitors || analysis.competitors,
        outlierAnalyses: parsed.outlierAnalyses || analysis.outlierAnalyses,
        derivedIdeas: parsed.derivedIdeas || analysis.derivedIdeas,
        promotedPatterns: parsed.promotedPatterns || [],
        competitorErrors: parsed.competitorErrors || [],
      };
    }
  }

  const memory = appendCompetitorResearchToMemory(workspaceDir, {
    niche: resolvedNiche,
    format: resolvedFormat,
    competitors: channelReports,
    analysis,
    outliers: topOutliers,
  });

  return {
    ok: true,
    niche: resolvedNiche,
    format: resolvedFormat,
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