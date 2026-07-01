import { randomUUID } from "crypto";
import {
  getExtendedStudioSettings,
  saveExtendedStudioSettings,
  matchAutoReplyRule,
  clusterCommentTopics,
} from "./youtubeStudioAdvanced.js";
import {
  assertTitleTestScopes,
  fetchRetentionCurve,
  getYoutubeAccessToken,
} from "./youtubeTitleAnalytics.js";
import { replyToChannelComment } from "./youtubeChannelAnalytics.js";

const MAX_HISTORY = 250;
const MAX_QUEUE = 120;

export const PRE_UPLOAD_ITEMS = [
  { id: "title", label: "Título pesquisável (3–5 palavras-chave)", required: true },
  { id: "thumb", label: "Thumbnail 1280×720 com rosto/contraste", required: true },
  { id: "hook", label: "Gancho verbal nos primeiros 3s", required: true },
  { id: "desc", label: "Descrição com links e timestamps", required: false },
  { id: "tags", label: "Tags alinhadas ao nicho", required: false },
  { id: "endscreen", label: "End screen / cards configurados", required: false },
  { id: "shorts", label: "Sem marca d'água / formato 9:16 (Shorts)", required: false },
  { id: "playlist", label: "Adicionar à playlist do cluster", required: false },
];

const SEO_STOP = new Set([
  "que", "com", "para", "uma", "dos", "das", "por", "mais", "muito", "isso", "esse", "essa",
  "the", "and", "you", "your", "this", "what", "how", "why", "when", "onde", "como", "qual",
  "video", "vídeo", "canal", "obrigado", "gostei", "amei",
]);

function periodDates(days) {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function getProSettings(workspaceDir) {
  const ext = getExtendedStudioSettings(workspaceDir);
  return {
    ...ext,
    slaHours: Math.min(Math.max(Number(ext.slaHours) || 24, 1), 168),
    approvalQueue: Array.isArray(ext.approvalQueue) ? ext.approvalQueue : [],
    replyHistory: Array.isArray(ext.replyHistory) ? ext.replyHistory : [],
    channelNotes: Array.isArray(ext.channelNotes) ? ext.channelNotes : [],
    preUploadChecklist: ext.preUploadChecklist && typeof ext.preUploadChecklist === "object"
      ? ext.preUploadChecklist
      : {},
    autoQueueEnabled: ext.autoQueueEnabled !== false,
  };
}

export function saveProSettings(workspaceDir, patch = {}) {
  return saveExtendedStudioSettings(workspaceDir, patch);
}

export function computeSlaStatus(comment, slaHours = 24) {
  if (!comment?.publishedAt) {
    return { hours: 0, overdue: false, dueInHours: slaHours };
  }
  const hours = (Date.now() - new Date(comment.publishedAt).getTime()) / 3600000;
  return {
    hours: Math.round(hours * 10) / 10,
    overdue: hours > slaHours,
    dueInHours: Math.max(0, Math.round((slaHours - hours) * 10) / 10),
  };
}

export function computeInboxStats(comments = [], settings = {}) {
  const slaHours = Number(settings.slaHours) || 24;
  const unanswered = comments.filter((c) => !c.isAnswered && !c.isOwnChannelComment);
  const overdue = unanswered.filter((c) => computeSlaStatus(c, slaHours).overdue);
  const queue = (settings.approvalQueue || []).filter((q) => q.status === "pending" || q.status === "approved");
  const handled = (settings.handledCommentIds || []).length;
  const history = (settings.replyHistory || []).length;
  return {
    slaHours,
    pending: unanswered.length,
    overdue: overdue.length,
    queuePending: queue.length,
    handled,
    repliesLogged: history,
    inboxZero: unanswered.length === 0,
    overdueComments: overdue.slice(0, 8).map((c) => ({
      threadId: c.threadId,
      commentId: c.commentId,
      authorDisplayName: c.authorDisplayName,
      videoTitle: c.videoTitle,
      publishedAt: c.publishedAt,
      ...computeSlaStatus(c, slaHours),
    })),
  };
}

export function appendReplyHistory(workspaceDir, entry = {}) {
  const settings = getProSettings(workspaceDir);
  const item = {
    id: randomUUID(),
    threadId: String(entry.threadId || "").trim(),
    commentId: String(entry.commentId || entry.parentId || "").trim(),
    videoId: String(entry.videoId || "").trim(),
    videoTitle: String(entry.videoTitle || "").trim(),
    text: String(entry.text || "").trim().slice(0, 10000),
    source: String(entry.source || "manual"),
    sentAt: new Date().toISOString(),
  };
  const replyHistory = [item, ...(settings.replyHistory || [])].slice(0, MAX_HISTORY);
  saveProSettings(workspaceDir, { replyHistory });
  return item;
}

export function buildApprovalQueueFromComments(workspaceDir, comments = []) {
  const settings = getProSettings(workspaceDir);
  if (!settings.autoQueueEnabled) {
    return { queue: settings.approvalQueue, added: 0 };
  }
  const existing = new Set((settings.approvalQueue || []).map((q) => q.threadId));
  const queue = [...(settings.approvalQueue || [])];
  let added = 0;

  for (const comment of comments) {
    if (comment.isAnswered || comment.isOwnChannelComment) continue;
    const suggestion = comment.autoReplySuggestion
      || matchAutoReplyRule(comment.text, settings.autoReplyRules, settings.replyTemplates);
    if (!suggestion?.suggestedText) continue;
    if (existing.has(comment.threadId)) continue;
    queue.push({
      id: randomUUID(),
      threadId: comment.threadId,
      commentId: comment.commentId,
      videoId: comment.videoId,
      videoTitle: comment.videoTitle || "",
      authorDisplayName: comment.authorDisplayName || "",
      commentText: String(comment.text || "").slice(0, 2000),
      suggestedText: suggestion.suggestedText,
      ruleId: suggestion.ruleId || suggestion.templateId || "",
      ruleLabel: suggestion.label || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    existing.add(comment.threadId);
    added += 1;
    if (queue.length >= MAX_QUEUE) break;
  }

  if (added > 0) saveProSettings(workspaceDir, { approvalQueue: queue });
  return { queue, added };
}

export function updateQueueItem(workspaceDir, itemId, patch = {}) {
  const settings = getProSettings(workspaceDir);
  const queue = (settings.approvalQueue || []).map((item) => (
    item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
  ));
  saveProSettings(workspaceDir, { approvalQueue: queue });
  const updated = queue.find((item) => item.id === itemId);
  if (!updated) throw new Error("Item da fila não encontrado.");
  return updated;
}

export async function sendQueueItem(workspaceDir, itemId, { text } = {}) {
  const settings = getProSettings(workspaceDir);
  const item = (settings.approvalQueue || []).find((q) => q.id === itemId);
  if (!item) throw new Error("Item da fila não encontrado.");
  const replyText = String(text || item.suggestedText || "").trim();
  if (!replyText) throw new Error("Texto da resposta vazio.");

  const result = await replyToChannelComment(workspaceDir, {
    parentId: item.commentId,
    text: replyText,
  });

  appendReplyHistory(workspaceDir, {
    threadId: item.threadId,
    commentId: item.commentId,
    videoId: item.videoId,
    videoTitle: item.videoTitle,
    text: replyText,
    source: "queue",
  });

  const queue = (settings.approvalQueue || []).map((q) => (
    q.id === itemId
      ? { ...q, status: "sent", sentAt: new Date().toISOString(), finalText: replyText }
      : q
  ));
  saveProSettings(workspaceDir, { approvalQueue: queue });

  return { ...result, queueItem: item };
}

export function mineSeoKeywords(comments = [], { limit = 16 } = {}) {
  const clustered = clusterCommentTopics(comments, { limit: limit * 2 });
  const topics = clustered.topics || [];
  const opportunities = [];
  const freq = new Map();

  for (const comment of comments) {
    if (comment.isAnswered || comment.isOwnChannelComment) continue;
    const words = String(comment.text || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !SEO_STOP.has(w));
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  }

  const fromFreq = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, mentions]) => ({
      keyword,
      mentions,
      type: "keyword",
      titleIdea: `Vídeo sobre ${keyword}`,
    }));

  for (const t of topics) {
    opportunities.push({
      keyword: t.topic,
      mentions: t.mentions,
      type: "topic",
      titleIdea: `${t.topic.charAt(0).toUpperCase()}${t.topic.slice(1)} — o que a audiência pergunta`,
    });
  }

  const seen = new Set();
  return [...fromFreq, ...opportunities]
    .filter((item) => {
      const key = item.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function analyzeRetentionCliff(points = []) {
  if (!points.length) {
    return { available: false, cliffs: [], note: "Sem dados de retenção no período." };
  }
  const sorted = [...points].sort((a, b) => a.ratio - b.ratio);
  const cliffs = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const drop = (prev.watchRatio || 0) - (curr.watchRatio || 0);
    if (drop > 0.03) {
      cliffs.push({
        atPercent: Math.round(curr.ratio * 100),
        dropPct: Math.round(drop * 1000) / 10,
        watchRatioBefore: prev.watchRatio,
        watchRatioAfter: curr.watchRatio,
        severity: drop >= 0.12 ? "high" : drop >= 0.06 ? "medium" : "low",
      });
    }
  }
  cliffs.sort((a, b) => b.dropPct - a.dropPct);
  const top = cliffs[0] || null;
  return {
    available: true,
    cliffs: cliffs.slice(0, 6),
    primaryCliff: top,
    note: top
      ? `Maior queda em ~${top.atPercent}% do vídeo (−${top.dropPct} pts de retenção).`
      : "Retenção estável — sem penhasco crítico detectado.",
  };
}

export async function fetchRetentionCliffReport(workspaceDir, videoId, { days = 28 } = {}) {
  const { startDate, endDate } = periodDates(days);
  const retention = await fetchRetentionCurve(workspaceDir, videoId, { startDate, endDate });
  const analysis = analyzeRetentionCliff(retention.points || []);
  return { videoId, startDate, endDate, retention, ...analysis };
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

export async function fetchAudienceHeatmap(workspaceDir, { days = 28 } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodDates(days);

  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views",
    dimensions: "day",
    sort: "day",
  });

  try {
    const data = await queryYoutubeAnalytics(accessToken, params);
    const rows = data.rows || [];
    const byWeekday = Array.from({ length: 7 }, (_, i) => ({ weekday: i, label: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i], views: 0, days: 0 }));
    const daily = [];

    for (const row of rows) {
      const day = String(row[0] || "");
      const views = Number(row[1] || 0);
      daily.push({ day, views });
      const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
      byWeekday[wd].views += views;
      byWeekday[wd].days += 1;
    }

    const maxViews = Math.max(...byWeekday.map((d) => d.views), 1);
    return {
      available: true,
      periodDays: days,
      startDate,
      endDate,
      daily: daily.slice(-14),
      byWeekday: byWeekday.map((d) => ({
        ...d,
        avgViews: d.days ? Math.round(d.views / d.days) : 0,
        intensity: Math.round((d.views / maxViews) * 100),
      })),
      bestWeekday: byWeekday.reduce((best, cur) => (cur.views > best.views ? cur : best), byWeekday[0]),
      note: "Heatmap por dia da semana (views agregadas). Publique perto dos dias mais fortes.",
    };
  } catch (err) {
    return { available: false, error: err.message, byWeekday: [], daily: [] };
  }
}

export function getPreUploadChecklistState(workspaceDir) {
  const settings = getProSettings(workspaceDir);
  const checked = settings.preUploadChecklist || {};
  const items = PRE_UPLOAD_ITEMS.map((item) => ({
    ...item,
    done: Boolean(checked[item.id]),
  }));
  const requiredDone = items.filter((i) => i.required && i.done).length;
  const requiredTotal = items.filter((i) => i.required).length;
  return {
    items,
    requiredDone,
    requiredTotal,
    ready: requiredDone >= requiredTotal,
    progressPct: Math.round((items.filter((i) => i.done).length / items.length) * 100),
  };
}

export function togglePreUploadItem(workspaceDir, itemId, done = true) {
  const settings = getProSettings(workspaceDir);
  const preUploadChecklist = { ...settings.preUploadChecklist, [itemId]: Boolean(done) };
  saveProSettings(workspaceDir, { preUploadChecklist });
  return getPreUploadChecklistState(workspaceDir);
}

export function addChannelNote(workspaceDir, text) {
  const trimmed = String(text || "").trim().slice(0, 2000);
  if (!trimmed) throw new Error("Texto da nota é obrigatório.");
  const settings = getProSettings(workspaceDir);
  const note = { id: randomUUID(), text: trimmed, createdAt: new Date().toISOString() };
  const channelNotes = [note, ...(settings.channelNotes || [])].slice(0, 50);
  saveProSettings(workspaceDir, { channelNotes });
  return note;
}

export function deleteChannelNote(workspaceDir, noteId) {
  const settings = getProSettings(workspaceDir);
  const channelNotes = (settings.channelNotes || []).filter((n) => n.id !== noteId);
  saveProSettings(workspaceDir, { channelNotes });
  return { success: true };
}

export async function fetchYppMilestones(workspaceDir) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const chRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const chData = await chRes.json();
  const stats = chData?.items?.[0]?.statistics || {};
  const subscribers = Number(stats.subscriberCount || 0);

  const endDate = new Date().toISOString().slice(0, 10);
  const start365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let watchMinutes12m = 0;
  let shortsViews90d = 0;

  try {
    const watchData = await queryYoutubeAnalytics(accessToken, new URLSearchParams({
      ids: "channel==MINE",
      startDate: start365,
      endDate,
      metrics: "estimatedMinutesWatched",
      dimensions: "day",
      maxResults: 500,
    }));
    watchMinutes12m = (watchData.rows || []).reduce((sum, row) => sum + Number(row[1] || 0), 0);
  } catch {
    watchMinutes12m = 0;
  }

  try {
    const shortsData = await queryYoutubeAnalytics(accessToken, new URLSearchParams({
      ids: "channel==MINE",
      startDate: start90,
      endDate,
      metrics: "views",
      dimensions: "creatorContentType",
      maxResults: 10,
    }));
    for (const row of shortsData.rows || []) {
      if (String(row[0] || "").toLowerCase() === "shorts") {
        shortsViews90d = Number(row[1] || 0);
      }
    }
  } catch {
    shortsViews90d = 0;
  }

  const watchHours12m = Math.round((watchMinutes12m / 60) * 10) / 10;
  const SUBS_REQ = 1000;
  const WATCH_HOURS_REQ = 4000;
  const SHORTS_VIEWS_REQ = 10_000_000;

  const subsMet = subscribers >= SUBS_REQ;
  const watchMet = watchHours12m >= WATCH_HOURS_REQ;
  const shortsMet = shortsViews90d >= SHORTS_VIEWS_REQ;

  const pct = (current, required) => Math.min(100, Math.round((current / required) * 1000) / 10);

  return {
    available: true,
    subscribers: {
      current: subscribers,
      required: SUBS_REQ,
      progressPct: pct(subscribers, SUBS_REQ),
      met: subsMet,
    },
    watchHours12m: {
      current: watchHours12m,
      required: WATCH_HOURS_REQ,
      progressPct: pct(watchHours12m, WATCH_HOURS_REQ),
      met: watchMet,
    },
    shortsViews90d: {
      current: shortsViews90d,
      required: SHORTS_VIEWS_REQ,
      progressPct: pct(shortsViews90d, SHORTS_VIEWS_REQ),
      met: shortsMet,
    },
    eligibleStandard: subsMet && watchMet,
    eligibleShorts: subsMet && shortsMet,
    recommendedPath: shortsViews90d > watchHours12m * 2000 ? "shorts" : "watch_hours",
    note: "YPP: 1.000 inscritos + 4.000h (12 meses) ou 10M views Shorts (90 dias).",
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchProDashboard(workspaceDir, comments = []) {
  const settings = getProSettings(workspaceDir);
  const inbox = computeInboxStats(comments, settings);
  const queue = (settings.approvalQueue || []).filter((q) => q.status === "pending" || q.status === "approved");
  const seo = mineSeoKeywords(comments, { limit: 8 });
  let heatmap = { available: false };
  let ypp = { available: false };
  try {
    heatmap = await fetchAudienceHeatmap(workspaceDir, { days: 28 });
  } catch {
    heatmap = { available: false };
  }
  try {
    ypp = await fetchYppMilestones(workspaceDir);
  } catch {
    ypp = { available: false };
  }
  return {
    inbox,
    approvalQueue: queue.slice(0, 12),
    replyHistory: (settings.replyHistory || []).slice(0, 10),
    seoOpportunities: seo,
    heatmap,
    ypp,
    preUpload: getPreUploadChecklistState(workspaceDir),
    channelNotes: (settings.channelNotes || []).slice(0, 5),
    slaHours: settings.slaHours,
    autoQueueEnabled: settings.autoQueueEnabled,
  };
}