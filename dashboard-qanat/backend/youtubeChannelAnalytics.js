import fs from "fs";
import path from "path";
import {
  assertTitleTestScopes,
  fetchVideoVelocity,
  getYoutubeAccessToken,
  getYoutubeTokenScopes,
  throwIfInsufficientScope,
} from "./youtubeTitleAnalytics.js";

const DEFAULT_VIEWS_48H_THRESHOLD = 100;
const DEFAULT_POLL_INTERVAL_MINUTES = 20;

const VIDEO_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "likes",
  "comments",
  "shares",
  "subscribersGained",
].join(",");

function parseAnalyticsRows(analyticsData = {}) {
  const headers = analyticsData?.columnHeaders || [];
  const rows = analyticsData?.rows || [];
  return rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header.name] = row[index];
    });
    return entry;
  });
}

async function youtubeDataGet(accessToken, path, params = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
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
    const message = data?.error?.message || `Falha na API YouTube Data (${path}).`;
    throwIfInsufficientScope(message);
    throw new Error(message);
  }
  return data;
}

async function queryYoutubeAnalytics(accessToken, params) {
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Falha ao buscar analytics do YouTube.";
    throwIfInsufficientScope(message);
    throw new Error(message);
  }
  return data;
}

function periodDates(days = 28) {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { startDate, endDate };
}

function formatCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export async function fetchChannelOverview(workspaceDir) {
  const scopeStatus = await getYoutubeTokenScopes(workspaceDir);

  if (!scopeStatus.connected) {
    return {
      connected: false,
      scopesReady: false,
      channel: null,
      scopeStatus,
      fetchedAt: new Date().toISOString(),
    };
  }

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const data = await youtubeDataGet(accessToken, "channels", {
    part: "snippet,statistics",
    mine: "true",
  });

  const item = data?.items?.[0];
  if (!item) {
    throw new Error("Nenhum canal encontrado na conta conectada.");
  }

  const stats = item.statistics || {};
  const snippet = item.snippet || {};
  const thumbs = snippet.thumbnails || {};

  return {
    connected: true,
    scopesReady: true,
    scopeStatus,
    channel: {
      id: item.id,
      title: snippet.title || "",
      description: snippet.description || "",
      thumbnailUrl: thumbs.medium?.url || thumbs.default?.url || "",
      customUrl: snippet.customUrl || "",
      subscriberCount: formatCount(stats.subscriberCount),
      viewCount: formatCount(stats.viewCount),
      videoCount: formatCount(stats.videoCount),
      hiddenSubscriberCount: Boolean(stats.hiddenSubscriberCount),
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchChannelVideosWithAnalytics(workspaceDir, { days = 28, limit = 25 } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodDates(days);
  const maxResults = Math.min(Math.max(Number(limit) || 25, 1), 50);

  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "contentDetails,snippet",
    mine: "true",
  });

  const channelItem = channelData?.items?.[0];
  const uploadsPlaylistId = channelItem?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Playlist de uploads do canal não encontrada.");
  }

  const playlistData = await youtubeDataGet(accessToken, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  const playlistItems = playlistData?.items || [];
  const videoMetaById = new Map();

  playlistItems.forEach((entry) => {
    const videoId = entry?.contentDetails?.videoId || entry?.snippet?.resourceId?.videoId;
    if (!videoId) return;
    const snippet = entry.snippet || {};
    const thumbs = snippet.thumbnails || {};
    videoMetaById.set(videoId, {
      videoId,
      title: snippet.title || "",
      publishedAt: snippet.publishedAt || "",
      thumbnailUrl: thumbs.medium?.url || thumbs.default?.url || "",
    });
  });

  const analyticsParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: VIDEO_METRICS,
    dimensions: "video",
    sort: "-views",
  });

  const analyticsData = await queryYoutubeAnalytics(accessToken, analyticsParams);
  const analyticsRows = parseAnalyticsRows(analyticsData);
  const metricsByVideoId = new Map(
    analyticsRows.map((row) => [
      String(row.video),
      {
        views: formatCount(row.views),
        estimatedMinutesWatched: formatCount(row.estimatedMinutesWatched),
        likes: formatCount(row.likes),
        comments: formatCount(row.comments),
        shares: formatCount(row.shares),
        subscribersGained: formatCount(row.subscribersGained),
      },
    ]),
  );

  const emptyMetrics = {
    views: 0,
    estimatedMinutesWatched: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    subscribersGained: 0,
  };

  const videos = [...videoMetaById.values()]
    .map((meta) => ({
      ...meta,
      metrics: metricsByVideoId.get(meta.videoId) || emptyMetrics,
    }))
    .sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0));

  return {
    channelId: channelItem?.id || null,
    channelTitle: channelItem?.snippet?.title || "",
    periodDays: days,
    startDate,
    endDate,
    videos,
    fetchedAt: new Date().toISOString(),
    reachNote:
      "Impressões e CTR de thumbnail só existem no YouTube Studio. O Lumiera mostra views, engajamento e minutos assistidos do período.",
  };
}

function normalizeCommentText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function threadHasChannelReply(thread, channelId) {
  const replies = thread?.replies?.comments || [];
  return replies.some((reply) => reply?.snippet?.authorChannelId === channelId);
}

function mapCommentThread(thread, channelId) {
  const snippet = thread?.snippet || {};
  const top = snippet.topLevelComment?.snippet || {};
  const videoId = snippet.videoId || "";
  const threadId = thread?.id || "";
  const topCommentId = snippet.topLevelComment?.id || "";
  const replyCount = Number(snippet.totalReplyCount || 0);
  const isAnswered = replyCount > 0 && threadHasChannelReply(thread, channelId);

  return {
    threadId,
    commentId: topCommentId,
    videoId,
    videoTitle: snippet.videoTitle || "",
    authorDisplayName: top.authorDisplayName || "",
    authorProfileImageUrl: top.authorProfileImageUrl || "",
    text: normalizeCommentText(top.textDisplay || top.textOriginal || ""),
    publishedAt: top.publishedAt || top.updatedAt || "",
    likeCount: Number(top.likeCount || 0),
    replyCount,
    isAnswered,
    studioUrl: videoId
      ? `https://studio.youtube.com/video/${videoId}/comments`
      : `https://studio.youtube.com/channel/${channelId}/comments`,
    watchUrl: videoId && topCommentId
      ? `https://www.youtube.com/watch?v=${videoId}&lc=${topCommentId}`
      : videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : null,
  };
}

function applyCommentFilters(comments, { filter = "all", keyword = "" } = {}) {
  let result = [...comments];

  if (filter === "unanswered") {
    result = result.filter((item) => !item.isAnswered);
  }

  const keywordNorm = String(keyword || "").trim().toLowerCase();
  if (keywordNorm) {
    result = result.filter((item) => {
      const haystack = `${item.text} ${item.videoTitle} ${item.authorDisplayName}`.toLowerCase();
      return haystack.includes(keywordNorm);
    });
  }

  return result;
}

export async function fetchChannelComments(workspaceDir, {
  limit = 20,
  filter = "all",
  keyword = "",
} = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "snippet",
    mine: "true",
  });

  const channelItem = channelData?.items?.[0];
  const channelId = channelItem?.id;
  if (!channelId) {
    throw new Error("Nenhum canal encontrado na conta conectada.");
  }

  const maxResults = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const wantsFilter = filter === "unanswered" || String(keyword || "").trim().length > 0;
  const fetchCount = wantsFilter ? Math.min(maxResults * 3, 100) : maxResults;

  const threadsData = await youtubeDataGet(accessToken, "commentThreads", {
    part: "snippet,replies",
    allThreadsRelatedToChannelId: channelId,
    order: "time",
    maxResults: fetchCount,
    moderationStatus: "published",
  });

  const mapped = (threadsData?.items || []).map((thread) => mapCommentThread(thread, channelId));

  const missingTitleIds = [
    ...new Set(mapped.filter((item) => item.videoId && !item.videoTitle).map((item) => item.videoId)),
  ];
  if (missingTitleIds.length > 0) {
    const videosData = await youtubeDataGet(accessToken, "videos", {
      part: "snippet",
      id: missingTitleIds.join(","),
    });
    const titleById = new Map(
      (videosData?.items || []).map((video) => [video.id, video?.snippet?.title || ""]),
    );
    mapped.forEach((item) => {
      if (!item.videoTitle && item.videoId) {
        item.videoTitle = titleById.get(item.videoId) || "";
      }
    });
  }

  const filtered = applyCommentFilters(mapped, { filter, keyword }).slice(0, maxResults);

  return {
    channelId,
    channelTitle: channelItem?.snippet?.title || "",
    filter,
    keyword: String(keyword || "").trim(),
    comments: filtered,
    totalFetched: mapped.length,
    fetchedAt: new Date().toISOString(),
    replyNote: "Respostas pelo Lumiera ainda não estão disponíveis — use o link para abrir no YouTube Studio.",
  };
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function collectLumieraPublishedVideos(projectsRoot) {
  const results = [];
  const seen = new Set();
  const roots = [
    { dir: path.join(projectsRoot, "videos longos"), format: "LONGO" },
    { dir: path.join(projectsRoot, "videos curtos shorts"), format: "SHORTS" },
  ];

  for (const { dir, format } of roots) {
    if (!fs.existsSync(dir)) continue;
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      try {
        if (!fs.statSync(fullPath).isDirectory()) continue;
      } catch {
        continue;
      }

      const cfg = readJsonSafe(path.join(fullPath, "config_qanat.json"));
      const videoId = String(cfg?.upload_metadata?.youtube?.post_id || "").trim();
      if (!videoId || seen.has(videoId)) continue;

      seen.add(videoId);
      results.push({
        projectName: item,
        projectPath: fullPath,
        format,
        videoId,
        niche: cfg?.niche || "",
        title: cfg?.upload_metadata?.youtube?.title || cfg?.strategy?.title_main || "",
      });
    }
  }

  return results;
}

async function countUnansweredComments(accessToken, channelId, scanLimit = 50) {
  const threadsData = await youtubeDataGet(accessToken, "commentThreads", {
    part: "snippet,replies",
    allThreadsRelatedToChannelId: channelId,
    order: "time",
    maxResults: Math.min(Math.max(scanLimit, 1), 100),
    moderationStatus: "published",
  });

  let count = 0;
  for (const thread of threadsData?.items || []) {
    const snippet = thread?.snippet || {};
    const replyCount = Number(snippet.totalReplyCount || 0);
    const isAnswered = replyCount > 0 && threadHasChannelReply(thread, channelId);
    if (!isAnswered) count += 1;
  }
  return count;
}

export async function fetchChannelAlerts(workspaceDir, projectsRoot, {
  views48hThreshold = DEFAULT_VIEWS_48H_THRESHOLD,
  maxProjects = 12,
  commentScanLimit = 50,
} = {}) {
  const scopeStatus = await getYoutubeTokenScopes(workspaceDir);
  if (!scopeStatus.connected) {
    return {
      connected: false,
      scopesReady: false,
      badgeCount: 0,
      unansweredComments: 0,
      hotVideos: [],
      lumieraVideos: [],
      alerts: [],
      views48hThreshold,
      pollIntervalMinutes: DEFAULT_POLL_INTERVAL_MINUTES,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!scopeStatus.ready) {
    return {
      connected: true,
      scopesReady: false,
      badgeCount: 0,
      unansweredComments: 0,
      hotVideos: [],
      lumieraVideos: collectLumieraPublishedVideos(projectsRoot),
      alerts: [],
      views48hThreshold,
      pollIntervalMinutes: DEFAULT_POLL_INTERVAL_MINUTES,
      scopeStatus,
      fetchedAt: new Date().toISOString(),
    };
  }

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "snippet",
    mine: "true",
  });
  const channelId = channelData?.items?.[0]?.id;
  if (!channelId) {
    throw new Error("Nenhum canal encontrado na conta conectada.");
  }

  const lumieraVideos = collectLumieraPublishedVideos(projectsRoot);
  const lumieraVideoIds = lumieraVideos.map((item) => item.videoId);

  const [unansweredComments, velocityResults] = await Promise.all([
    countUnansweredComments(accessToken, channelId, commentScanLimit),
    Promise.all(
      lumieraVideos.slice(0, Math.min(Math.max(maxProjects, 1), 20)).map(async (entry) => {
        try {
          const velocity = await fetchVideoVelocity(workspaceDir, entry.videoId);
          return { ...entry, views48h: velocity.views48h, available: true };
        } catch (err) {
          return { ...entry, views48h: 0, available: false, error: err.message };
        }
      }),
    ),
  ]);

  const hotVideos = velocityResults.filter(
    (item) => item.available && item.views48h >= views48hThreshold,
  );

  const alerts = [];
  if (unansweredComments > 0) {
    alerts.push({
      type: "unanswered_comments",
      count: unansweredComments,
      label: `${unansweredComments} comentário(s) sem resposta`,
    });
  }
  if (hotVideos.length > 0) {
    alerts.push({
      type: "hot_videos",
      count: hotVideos.length,
      label: `${hotVideos.length} vídeo(s) Lumiera com views 48h ≥ ${views48hThreshold}`,
      videos: hotVideos.map((item) => ({
        projectName: item.projectName,
        videoId: item.videoId,
        views48h: item.views48h,
        format: item.format,
      })),
    });
  }

  return {
    connected: true,
    scopesReady: true,
    badgeCount: unansweredComments + hotVideos.length,
    unansweredComments,
    hotVideos,
    lumieraVideos,
    lumieraVideoIds,
    lumieraVideoById: Object.fromEntries(lumieraVideos.map((item) => [item.videoId, item])),
    alerts,
    views48hThreshold,
    pollIntervalMinutes: DEFAULT_POLL_INTERVAL_MINUTES,
    fetchedAt: new Date().toISOString(),
  };
}