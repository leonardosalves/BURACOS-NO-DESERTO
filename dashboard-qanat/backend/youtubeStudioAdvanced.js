import fs from "fs";
import path from "path";
import {
  assertTitleTestScopes,
  fetchVideoVelocity,
  getYoutubeAccessToken,
  getYoutubeTokenScopes,
} from "./youtubeTitleAnalytics.js";
import { collectLumieraPublishedVideos } from "./youtubeChannelAnalytics.js";
import { loadStudioSettings, saveStudioSettings } from "./youtubeStudioSettings.js";
import { postPinnedComment } from "./postUploadService.js";

const SENTIMENT_PATTERNS = {
  positive: /\b(obrigad|incrível|maravilh|show|top|amei|gostei|perfeito|excelente|👏|❤|🔥)\b/i,
  critical: /\b(ruim|péssim|horrível|fake|mentira|lixo|odeio|não gost|decepção|clickbait)\b/i,
  question: /(\?|como |qual |quando |onde |por que |porque )/i,
};

const DEFAULT_AUTO_REPLY_RULES = [
  { id: "part2", keyword: "parte 2", templateId: "part2", enabled: true },
  { id: "link", keyword: "link", templateId: "description", enabled: true },
  { id: "thanks", keyword: "obrigad", templateId: "thanks", enabled: true },
];

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function periodRange(days, offsetDays = 0) {
  const endMs = Date.now() - offsetDays * 24 * 60 * 60 * 1000;
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  return {
    startDate: new Date(startMs).toISOString().slice(0, 10),
    endDate: new Date(endMs).toISOString().slice(0, 10),
  };
}

async function queryYoutubeAnalytics(accessToken, params) {
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Falha analytics YouTube.");
  return data;
}

function parseDurationSeconds(iso = "") {
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

export function getExtendedStudioSettings(workspaceDir) {
  const base = loadStudioSettings(workspaceDir);
  const stored = readJsonSafe(path.join(workspaceDir, "youtube_studio_settings.json")) || {};
  return {
    ...base,
    autoReplyRules: Array.isArray(stored.autoReplyRules) && stored.autoReplyRules.length
      ? stored.autoReplyRules
      : DEFAULT_AUTO_REPLY_RULES,
    webhooks: {
      telegram: String(stored.webhooks?.telegram || "").trim(),
      discord: String(stored.webhooks?.discord || "").trim(),
    },
    projectGoals: stored.projectGoals && typeof stored.projectGoals === "object" ? stored.projectGoals : {},
    defaultProjectGoalViews48h: Number(stored.defaultProjectGoalViews48h) || 100,
    selectedChannelId: String(stored.selectedChannelId || "").trim(),
    dailyReportEmail: String(stored.dailyReportEmail || stored.weeklyReportEmail || "").trim(),
    lastDailyReportAt: stored.lastDailyReportAt || null,
    slaHours: Number(stored.slaHours) || 24,
    approvalQueue: Array.isArray(stored.approvalQueue) ? stored.approvalQueue : [],
    replyHistory: Array.isArray(stored.replyHistory) ? stored.replyHistory : [],
    channelNotes: Array.isArray(stored.channelNotes) ? stored.channelNotes : [],
    preUploadChecklist: stored.preUploadChecklist && typeof stored.preUploadChecklist === "object"
      ? stored.preUploadChecklist
      : {},
    autoQueueEnabled: stored.autoQueueEnabled !== false,
  };
}

export function saveExtendedStudioSettings(workspaceDir, patch = {}) {
  const file = path.join(workspaceDir, "youtube_studio_settings.json");
  const stored = readJsonSafe(file) || {};
  const current = getExtendedStudioSettings(workspaceDir);
  const next = {
    ...stored,
    ...current,
    ...patch,
    webhooks: { ...current.webhooks, ...(patch.webhooks || {}) },
    projectGoals: { ...current.projectGoals, ...(patch.projectGoals || {}) },
  };
  fs.writeFileSync(file, JSON.stringify(next, null, 2), "utf8");
  return getExtendedStudioSettings(workspaceDir);
}

export function detectSentiment(text = "") {
  const t = String(text);
  if (SENTIMENT_PATTERNS.critical.test(t)) return "critical";
  if (SENTIMENT_PATTERNS.question.test(t)) return "question";
  if (SENTIMENT_PATTERNS.positive.test(t)) return "positive";
  return "neutral";
}

export function matchAutoReplyRule(text = "", rules = [], templates = []) {
  const hay = String(text).toLowerCase();
  const tplById = new Map((templates || []).map((t) => [t.id, t]));
  for (const rule of rules || []) {
    if (!rule?.enabled) continue;
    const kw = String(rule.keyword || "").trim().toLowerCase();
    if (kw && hay.includes(kw)) {
      const tpl = tplById.get(rule.templateId);
      return {
        ruleId: rule.id,
        keyword: rule.keyword,
        templateId: rule.templateId,
        suggestedText: tpl?.text || "",
        label: tpl?.label || rule.id,
      };
    }
  }
  return null;
}

export function scoreCommentPriority(comment, {
  hotVideoIds = new Set(),
  lumieraVideoIds = new Set(),
  views48hByVideoId = {},
} = {}) {
  if (comment.isAnswered) return -1000;
  let score = 0;
  score += Math.min(Number(comment.likeCount || 0) * 3, 60);
  if (hotVideoIds.has(comment.videoId)) score += 50;
  if (lumieraVideoIds.has(comment.videoId)) score += 25;
  const v48 = views48hByVideoId[comment.videoId] || 0;
  if (v48 >= 100) score += Math.min(Math.round(v48 / 20), 40);
  const sentiment = comment.sentiment || detectSentiment(comment.text);
  if (sentiment === "critical") score += 35;
  if (sentiment === "question") score += 30;
  if (sentiment === "positive") score += 5;
  if (comment.publishedAt) {
    const hours = (Date.now() - new Date(comment.publishedAt).getTime()) / 3600000;
    if (hours < 24) score += 20;
    else if (hours < 72) score += 10;
  }
  return score;
}

export function enrichComments(comments, context = {}) {
  const settings = context.settings || {};
  return comments.map((comment) => {
    const sentiment = detectSentiment(comment.text);
    const autoReply = matchAutoReplyRule(comment.text, settings.autoReplyRules, settings.replyTemplates);
    const priorityScore = scoreCommentPriority({ ...comment, sentiment }, context);
    return {
      ...comment,
      sentiment,
      priorityScore,
      autoReplySuggestion: autoReply,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

export async function listManagedChannels(workspaceDir) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=50",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Falha ao listar canais.");
  const selected = getExtendedStudioSettings(workspaceDir).selectedChannelId;
  return {
    channels: (data.items || []).map((item) => ({
      id: item.id,
      title: item.snippet?.title || "",
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || "",
      subscriberCount: Number(item.statistics?.subscriberCount || 0),
      videoCount: Number(item.statistics?.videoCount || 0),
      customUrl: item.snippet?.customUrl || "",
      selected: item.id === selected || (!selected && data.items?.[0]?.id === item.id),
    })),
    selectedChannelId: selected || data.items?.[0]?.id || "",
  };
}

export async function bulkReplyComments(workspaceDir, { replies = [] } = {}) {
  const { replyToChannelComment } = await import("./youtubeChannelAnalytics.js");
  const results = [];
  for (const item of replies.slice(0, 20)) {
    try {
      const result = await replyToChannelComment(workspaceDir, {
        parentId: item.commentId || item.parentId,
        text: item.text,
      });
      results.push({ commentId: item.commentId, success: true, result });
    } catch (err) {
      results.push({ commentId: item.commentId, success: false, error: err.message });
    }
  }
  return { results, sent: results.filter((r) => r.success).length };
}

export async function pinVideoComment(workspaceDir, { videoId, text } = {}) {
  return postPinnedComment(workspaceDir, videoId, text);
}

export function commentsToCsv(comments = []) {
  const header = "autor,texto,video,titulo_video,likes,sentimento,prioridade,respondido,data\n";
  const rows = comments.map((c) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
      esc(c.authorDisplayName),
      esc(c.text),
      esc(c.videoId),
      esc(c.videoTitle),
      c.likeCount ?? 0,
      c.sentiment || "",
      c.priorityScore ?? 0,
      c.isAnswered ? "sim" : "nao",
      esc(c.publishedAt),
    ].join(",");
  });
  return header + rows.join("\n");
}

export function videosToCsv(videos = []) {
  const header = "videoId,titulo,formato,views,likes,comentarios,minutos,views48h,projeto\n";
  const rows = videos.map((v) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
      esc(v.videoId),
      esc(v.title),
      esc(v.format || v.videoFormat || ""),
      v.metrics?.views ?? 0,
      v.metrics?.likes ?? 0,
      v.metrics?.comments ?? 0,
      v.metrics?.estimatedMinutesWatched ?? 0,
      v.views48h ?? "",
      esc(v.projectName || ""),
    ].join(",");
  });
  return header + rows.join("\n");
}

export async function fetchVideoVelocityTimeline(workspaceDir, videoId, { days = 7 } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodRange(days, 0);
  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views",
    dimensions: "day",
    filters: `video==${videoId}`,
    sort: "day",
  });
  const data = await queryYoutubeAnalytics(accessToken, params);
  const points = (data.rows || []).map((row) => ({
    date: row[0],
    views: Number(row[1] || 0),
  }));
  const total = points.reduce((sum, p) => sum + p.views, 0);
  const velocity = await fetchVideoVelocity(workspaceDir, videoId).catch(() => ({ views48h: 0 }));
  return {
    videoId,
    periodDays: days,
    points,
    totalViews: total,
    views48h: velocity.views48h ?? 0,
    views24hEstimate: points.slice(-1)[0]?.views ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchVideoCtrAndRevenue(workspaceDir, videoId, { days = 28 } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodRange(days, 0);
  try {
    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "views,impressions,impressionClickThroughRate,estimatedRevenue,estimatedAdRevenue",
      filters: `video==${videoId}`,
    });
    const data = await queryYoutubeAnalytics(accessToken, params);
    const row = (data.rows || [])[0] || [];
    const headers = (data.columnHeaders || []).map((h) => h.name);
    const mapped = Object.fromEntries(headers.map((name, i) => [name, Number(row[i] || 0)]));
    return {
      available: true,
      videoId,
      metrics: mapped,
      note: mapped.estimatedRevenue > 0
        ? "Receita estimada disponível (canal monetizado)."
        : "CTR/impressões do vídeo; receita só com YPP ativo.",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { available: false, videoId, error: err.message, fetchedAt: new Date().toISOString() };
  }
}

const SHORTS_MAX_DURATION_SEC = 180;

async function fetchVideoDetailsMap(accessToken, videoIds = []) {
  const map = new Map();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${chunk.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    for (const item of data.items || []) {
      map.set(item.id, {
        durationSec: parseDurationSeconds(item.contentDetails?.duration),
        title: item.snippet?.title || "",
      });
    }
  }
  return map;
}

async function fetchCreatorContentTypeByVideo(accessToken, videoIds = [], { startDate, endDate } = {}) {
  const map = new Map();
  if (!videoIds.length || !startDate || !endDate) return map;

  const batchSize = 6;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const chunk = videoIds.slice(i, i + batchSize);
    await Promise.all(chunk.map(async (videoId) => {
      try {
        const params = new URLSearchParams({
          ids: "channel==MINE",
          startDate,
          endDate,
          metrics: "views",
          dimensions: "video,creatorContentType",
          filters: `video==${videoId}`,
          maxResults: "5",
        });
        const res = await fetch(
          `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const data = await res.json();
        const row = data.rows?.[0];
        if (!row) return;
        const type = String(row[1] || "").toLowerCase();
        if (type === "shorts") map.set(videoId, "SHORT");
        else if (type.includes("video")) map.set(videoId, "LONG");
      } catch {
        /* analytics opcional por vídeo */
      }
    }));
  }
  return map;
}

function titleSuggestsShort(title = "") {
  return /#shorts?\b|#short\b|\bshorts\b/i.test(String(title));
}

export async function tagVideosShortsLong(
  accessToken,
  videoIds = [],
  { lumieraFormatById = {}, startDate, endDate } = {},
) {
  if (!videoIds.length) return new Map();

  const range = startDate && endDate
    ? { startDate, endDate }
    : periodRange(365);

  const detailsMap = await fetchVideoDetailsMap(accessToken, videoIds);
  const map = new Map();
  const needsAnalytics = [];

  for (const videoId of videoIds) {
    const lumiera = String(lumieraFormatById[videoId] || "").toUpperCase();
    if (lumiera === "SHORTS" || lumiera === "SHORT") {
      map.set(videoId, "SHORT");
      continue;
    }
    if (lumiera === "LONGO" || lumiera === "LONG") {
      map.set(videoId, "LONG");
      continue;
    }

    const details = detailsMap.get(videoId) || {};
    const sec = details.durationSec || 0;
    const title = details.title || "";

    if (titleSuggestsShort(title)) {
      map.set(videoId, "SHORT");
      continue;
    }

    if (sec > 0 && sec <= 60) {
      map.set(videoId, "SHORT");
      continue;
    }

    if (sec > SHORTS_MAX_DURATION_SEC) {
      map.set(videoId, "LONG");
      continue;
    }

    if (sec > 60 && sec <= SHORTS_MAX_DURATION_SEC) {
      needsAnalytics.push(videoId);
      continue;
    }

    needsAnalytics.push(videoId);
  }

  if (needsAnalytics.length) {
    const analyticsMap = await fetchCreatorContentTypeByVideo(accessToken, needsAnalytics, range);
    for (const videoId of needsAnalytics) {
      const analyticsFormat = analyticsMap.get(videoId);
      if (analyticsFormat) {
        map.set(videoId, analyticsFormat);
        continue;
      }
      const sec = detailsMap.get(videoId)?.durationSec || 0;
      map.set(videoId, sec > 0 && sec <= SHORTS_MAX_DURATION_SEC ? "SHORT" : "LONG");
    }
  }

  for (const videoId of videoIds) {
    if (!map.has(videoId)) map.set(videoId, "LONG");
  }
  return map;
}

export function clusterCommentTopics(comments = [], { limit = 8 } = {}) {
  const freq = new Map();
  const stop = new Set(["que", "com", "para", "uma", "dos", "das", "por", "mais", "muito", "isso", "esse", "essa", "the", "and"]);
  for (const c of comments) {
    if (c.isAnswered || c.isOwnChannelComment) continue;
    const words = String(c.text || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stop.has(w));
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  }
  const topics = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ topic: word, mentions: count }));
  const ideas = topics.slice(0, 5).map((t) => ({
    title: `Vídeo sobre "${t.topic}" (${t.mentions} menções nos comentários)`,
    source: "comments_cluster",
    mentions: t.mentions,
  }));
  return { topics, ideas };
}

export async function generateCommentIdeas(comments, niche = "", callGemini = null) {
  const clustered = clusterCommentTopics(comments);
  if (!callGemini || clustered.ideas.length === 0) {
    return { ...clustered, aiIdeas: [], usedAi: false };
  }
  const sample = comments.filter((c) => !c.isAnswered).slice(0, 15)
    .map((c) => `- ${c.text}`).join("\n");
  const prompt = `Canal YouTube nicho: ${niche || "geral"}
Comentários recentes:
${sample}

Tópicos frequentes: ${clustered.topics.map((t) => t.topic).join(", ")}

Gere 5 ideias de vídeo em JSON array: [{ "title": "...", "angle": "..." }]
Foco em perguntas e pedidos dos comentários. PT-BR. Só JSON.`;
  try {
    const raw = await callGemini(prompt, { temperature: 0.6, maxRetries: 2 });
    const match = String(raw).match(/\[[\s\S]*\]/);
    const aiIdeas = match ? JSON.parse(match[0]) : [];
    return { ...clustered, aiIdeas, usedAi: true };
  } catch {
    return { ...clustered, aiIdeas: [], usedAi: false };
  }
}

export async function translateCommentText(text, targetLang = "pt", callGemini) {
  const prompt = `Traduza para ${targetLang === "pt" ? "português do Brasil" : targetLang} mantendo tom natural:
"${String(text).slice(0, 2000)}"
Retorne só a tradução, sem aspas.`;
  const translation = await callGemini(prompt, { temperature: 0.2, maxRetries: 2 });
  return { translation: String(translation || "").trim(), targetLang };
}

export async function computeChannelResponseStats(accessToken, channelId, channelTitle, channelHandle, scanLimit = 30) {
  const { default: ya } = await import("./youtubeChannelAnalytics.js");
  void ya;
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.searchParams.set("part", "snippet,replies");
  url.searchParams.set("allThreadsRelatedToChannelId", channelId);
  url.searchParams.set("maxResults", String(Math.min(scanLimit, 50)));
  url.searchParams.set("order", "time");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  const hours = [];
  for (const thread of data.items || []) {
    const topAt = new Date(thread.snippet?.topLevelComment?.snippet?.publishedAt || 0).getTime();
    if (!topAt) continue;
    for (const reply of thread.replies?.comments || []) {
      const sn = reply.snippet || {};
      const authorId = String(sn.authorChannelId?.value || sn.authorChannelId || "");
      const author = String(sn.authorDisplayName || "").toLowerCase();
      const isChannel = authorId === channelId
        || author === String(channelTitle || "").toLowerCase()
        || (channelHandle && author.includes(String(channelHandle).replace("@", "").toLowerCase()));
      if (!isChannel) continue;
      const replyAt = new Date(sn.publishedAt || 0).getTime();
      if (replyAt > topAt) hours.push((replyAt - topAt) / 3600000);
    }
  }
  if (!hours.length) return { averageHours: null, sampleSize: 0 };
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  return { averageHours: Math.round(avg * 10) / 10, sampleSize: hours.length };
}

export async function generateDailyReport(workspaceDir, projectsRoot, options = {}) {
  const { generateWeeklyReport } = await import("./youtubeStudioExtras.js");
  const weekly = await generateWeeklyReport(workspaceDir, projectsRoot, options);
  const text = weekly.text.replace("Relatório semanal", "Resumo diário").split("\n").slice(0, 12).join("\n");
  const filePath = path.join(workspaceDir, "youtube_daily_report_latest.txt");
  fs.writeFileSync(filePath, text, "utf8");
  saveExtendedStudioSettings(workspaceDir, { lastDailyReportAt: new Date().toISOString() });
  return { ...weekly, text, filePath, type: "daily" };
}

export async function sendWebhookNotification(webhooks, payload) {
  const results = [];
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (webhooks?.telegram) {
    try {
      const res = await fetch(webhooks.telegram, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body.slice(0, 4000) }),
      });
      results.push({ channel: "telegram", ok: res.ok });
    } catch (err) {
      results.push({ channel: "telegram", ok: false, error: err.message });
    }
  }
  if (webhooks?.discord) {
    try {
      const res = await fetch(webhooks.discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: body.slice(0, 2000) }),
      });
      results.push({ channel: "discord", ok: res.ok });
    } catch (err) {
      results.push({ channel: "discord", ok: false, error: err.message });
    }
  }
  return results;
}

export async function getPostPublishChecklist(workspaceDir, projectsRoot, projectName, videoId) {
  const projects = collectLumieraPublishedVideos(projectsRoot);
  const entry = projects.find((p) => p.projectName === projectName);
  const settings = getExtendedStudioSettings(workspaceDir);
  const goal = settings.projectGoals?.[projectName]?.views48h
    ?? settings.defaultProjectGoalViews48h
    ?? 100;
  let views48h = 0;
  let checklist = [
    { id: "upload", label: "Vídeo publicado no YouTube", done: Boolean(videoId), required: true },
    { id: "metrics_1h", label: "Checar métricas após 1h", done: false, required: false },
    { id: "metrics_24h", label: "Checar views 24h", done: false, required: false },
    { id: "comments", label: "Responder comentários pendentes", done: false, required: true },
    { id: "retention", label: "Revisar retenção no painel", done: false, required: false },
    { id: "goal_48h", label: `Meta ${goal} views em 48h`, done: false, required: false },
  ];
  if (videoId) {
    try {
      const velocity = await fetchVideoVelocity(workspaceDir, videoId);
      views48h = velocity.views48h ?? 0;
      checklist = checklist.map((item) => {
        if (item.id === "goal_48h") return { ...item, done: views48h >= goal, detail: `${views48h}/${goal} views` };
        if (item.id === "metrics_24h" && views48h > 0) return { ...item, done: true, detail: `${views48h} views/48h` };
        return item;
      });
    } catch { /* ignore */ }
  }
  const statePath = path.join(entry?.projectPath || "", "youtube_publish_checklist.json");
  const saved = readJsonSafe(statePath) || {};
  checklist = checklist.map((item) => ({
    ...item,
    done: saved[item.id] ?? item.done,
  }));
  return {
    projectName,
    videoId: videoId || entry?.videoId || "",
    views48h,
    goalViews48h: goal,
    checklist,
    statePath,
  };
}

export function savePostPublishChecklistItem(projectPath, itemId, done = true) {
  if (!projectPath) return { success: false };
  const statePath = path.join(projectPath, "youtube_publish_checklist.json");
  const saved = readJsonSafe(statePath) || {};
  saved[itemId] = done;
  fs.writeFileSync(statePath, JSON.stringify(saved, null, 2), "utf8");
  return { success: true, itemId, done };
}

export async function fetchChannelTitleExperiments(workspaceDir, projectsRoot) {
  const { loadTitleExperiment, getTitleExperimentReport } = await import("./youtubeTitleAnalytics.js");
  const projects = collectLumieraPublishedVideos(projectsRoot);
  const experiments = [];

  for (const entry of projects) {
    const experiment = loadTitleExperiment(entry.projectPath);
    if (!experiment?.videoId || experiment.status !== "running") continue;
    try {
      const report = await getTitleExperimentReport(workspaceDir, entry.projectPath);
      experiments.push({
        projectName: entry.projectName,
        format: entry.format,
        videoId: experiment.videoId,
        title: entry.title || entry.projectName,
        experiment: {
          status: experiment.status,
          activeVariantId: experiment.activeVariantId,
          rotateHours: experiment.rotateHours,
          variants: (experiment.variants || []).map((v) => ({
            id: v.id,
            text: v.text,
            isActive: experiment.activeVariantId === v.id,
          })),
        },
        rankings: report.rankings || [],
        winner: report.winner || null,
        analytics: report.analytics?.available
          ? { views: report.analytics.metrics?.views ?? 0 }
          : null,
      });
    } catch (err) {
      experiments.push({
        projectName: entry.projectName,
        format: entry.format,
        videoId: experiment.videoId,
        title: entry.title || entry.projectName,
        experiment: {
          status: experiment.status,
          activeVariantId: experiment.activeVariantId,
          variants: (experiment.variants || []).length,
        },
        error: err.message,
      });
    }
  }

  return {
    available: true,
    count: experiments.length,
    experiments,
  };
}

export async function loadLumieraExperiments(projectsRoot, lumieraVideos = []) {
  const { loadTitleExperiment } = await import("./youtubeTitleAnalytics.js");
  const { loadThumbnailExperiment } = await import("./thumbnailExperiment.js");
  return lumieraVideos.map((item) => {
    const projectPath = item.projectPath || path.join(projectsRoot, item.format === "SHORT" ? "SHORTS" : "LONGOS", item.projectName);
    const titleExp = loadTitleExperiment(projectPath);
    const thumbExp = loadThumbnailExperiment(projectPath);
    return {
      ...item,
      titleExperiment: titleExp ? {
        status: titleExp.status,
        activeVariantId: titleExp.activeVariantId,
        variants: (titleExp.variants || []).length,
      } : null,
      thumbnailExperiment: thumbExp ? {
        status: thumbExp.status,
        activeVariantId: thumbExp.activeVariantId,
      } : null,
    };
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startYoutubeDailyReportScheduler({ workspaceDir, projectsRoot }) {
  const tick = async () => {
    try {
      const settings = getExtendedStudioSettings(workspaceDir);
      const last = settings.lastDailyReportAt ? new Date(settings.lastDailyReportAt).getTime() : 0;
      if (Date.now() - last < DAY_MS) return;
      await generateDailyReport(workspaceDir, projectsRoot);
      console.log("[YouTube] Resumo diário gerado.");
    } catch (err) {
      console.warn("[YouTube] Falha no resumo diário:", err.message);
    }
  };
  setTimeout(tick, 90_000);
  setInterval(tick, 6 * 60 * 60 * 1000);
}