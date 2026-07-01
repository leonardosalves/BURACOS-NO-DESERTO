import fs from "fs";
import path from "path";
import { getHandledCommentIds } from "./youtubeStudioSettings.js";
import {
  assertTitleTestScopes,
  fetchRetentionCurve,
  fetchVideoAnalytics,
  fetchVideoVelocity,
  getYoutubeAccessToken,
  getYoutubeTokenScopes,
  throwIfInsufficientScope,
} from "./youtubeTitleAnalytics.js";

const DEFAULT_VIEWS_48H_THRESHOLD = 100;
const DEFAULT_POLL_INTERVAL_MINUTES = 20;
const CACHE_TTL_MS = {
  overview: 5 * 60 * 1000,
  videos: 5 * 60 * 1000,
  lumiera: 5 * 60 * 1000,
  alerts: 3 * 60 * 1000,
  videoDetail: 5 * 60 * 1000,
};

function getCacheFilePath(workspaceDir) {
  return path.join(workspaceDir, "youtube_channel_cache.json");
}

function readCacheStore(workspaceDir) {
  return readJsonSafe(getCacheFilePath(workspaceDir)) || {};
}

function writeCacheStore(workspaceDir, store) {
  fs.writeFileSync(getCacheFilePath(workspaceDir), JSON.stringify(store, null, 2), "utf8");
}

function normalizeVideoFormat(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "SHORT" || raw === "SHORTS") return "SHORT";
  return "LONG";
}

function enrichVideosReport(data) {
  if (!data?.videos?.length) return data;
  return {
    ...data,
    videos: data.videos.map((video) => ({
      ...video,
      videoFormat: normalizeVideoFormat(video.videoFormat || video.format),
    })),
  };
}

function getCachedPayload(workspaceDir, cacheKey, ttlMs) {
  const entry = readCacheStore(workspaceDir)[cacheKey];
  if (!entry?.fetchedAt || !entry?.data) return null;
  const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
  if (ageMs > ttlMs) return null;
  const data = cacheKey.startsWith("videos:")
    ? enrichVideosReport(entry.data)
    : entry.data;
  return {
    ...data,
    fromCache: true,
    cachedAt: entry.fetchedAt,
  };
}

function setCachedPayload(workspaceDir, cacheKey, data) {
  const store = readCacheStore(workspaceDir);
  store[cacheKey] = {
    fetchedAt: new Date().toISOString(),
    data,
  };
  writeCacheStore(workspaceDir, store);
}

async function withChannelCache(workspaceDir, cacheKey, ttlMs, forceRefresh, loader) {
  if (!forceRefresh) {
    const cached = getCachedPayload(workspaceDir, cacheKey, ttlMs);
    if (cached) return cached;
  }
  const data = await loader();
  if (data && data.connected !== false) {
    setCachedPayload(workspaceDir, cacheKey, data);
  }
  return { ...data, fromCache: false };
}

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

function mapAnalyticsRow(row) {
  return {
    views: formatCount(row.views),
    estimatedMinutesWatched: formatCount(row.estimatedMinutesWatched),
    likes: formatCount(row.likes),
    comments: formatCount(row.comments),
    shares: formatCount(row.shares),
    subscribersGained: formatCount(row.subscribersGained),
  };
}

async function fetchSingleVideoMetrics(accessToken, videoId, startDate, endDate) {
  const analyticsParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: VIDEO_METRICS,
    dimensions: "video",
    filters: `video==${videoId}`,
  });

  const analyticsData = await queryYoutubeAnalytics(accessToken, analyticsParams);
  const row = parseAnalyticsRows(analyticsData)[0];
  return row ? mapAnalyticsRow(row) : null;
}

async function fetchVideoMetricsBatched(accessToken, videoIds, startDate, endDate) {
  const metricsByVideoId = new Map();
  if (!videoIds.length) return metricsByVideoId;

  const results = await Promise.all(
    videoIds.map(async (videoId) => {
      try {
        const metrics = await fetchSingleVideoMetrics(accessToken, videoId, startDate, endDate);
        return { videoId, metrics };
      } catch {
        return { videoId, metrics: null };
      }
    }),
  );

  results.forEach(({ videoId, metrics }) => {
    if (metrics) metricsByVideoId.set(videoId, metrics);
  });

  return metricsByVideoId;
}

async function fetchChannelOverviewUncached(workspaceDir) {
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

export async function fetchChannelOverview(workspaceDir, { forceRefresh = false } = {}) {
  return withChannelCache(
    workspaceDir,
    "overview",
    CACHE_TTL_MS.overview,
    forceRefresh,
    () => fetchChannelOverviewUncached(workspaceDir),
  );
}

async function fetchChannelVideosWithAnalyticsUncached(
  workspaceDir,
  { days = 28, limit = 25, projectsRoot = null } = {},
) {
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

  const videoIds = [...videoMetaById.keys()];
  const lumieraFormatById = {};
  if (projectsRoot) {
    for (const row of collectLumieraPublishedVideos(projectsRoot)) {
      if (row.videoId) lumieraFormatById[row.videoId] = row.format;
    }
  }
  const [metricsByVideoId, formatByVideoId] = await Promise.all([
    fetchVideoMetricsBatched(accessToken, videoIds, startDate, endDate),
    (async () => {
      try {
        const { tagVideosShortsLong } = await import("./youtubeStudioAdvanced.js");
        return tagVideosShortsLong(accessToken, videoIds, {
          lumieraFormatById,
          startDate,
          endDate,
        });
      } catch {
        return new Map();
      }
    })(),
  ]);

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
      videoFormat: normalizeVideoFormat(formatByVideoId.get(meta.videoId) || "LONG"),
      metrics: metricsByVideoId.get(meta.videoId) || emptyMetrics,
    }))
    .sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0));

  return enrichVideosReport({
    channelId: channelItem?.id || null,
    channelTitle: channelItem?.snippet?.title || "",
    periodDays: days,
    startDate,
    endDate,
    videos,
    fetchedAt: new Date().toISOString(),
    reachNote:
      "Impressões e CTR de thumbnail só existem no YouTube Studio. O Lumiera mostra views, engajamento e minutos assistidos do período.",
  });
}

export async function fetchChannelVideosWithAnalytics(
  workspaceDir,
  { days = 28, limit = 25, forceRefresh = false, format = "all", projectsRoot = null } = {},
) {
  const cacheKey = `videos:v3:${days}:${limit}`;
  const report = await withChannelCache(
    workspaceDir,
    cacheKey,
    CACHE_TTL_MS.videos,
    forceRefresh,
    () => fetchChannelVideosWithAnalyticsUncached(workspaceDir, { days, limit, projectsRoot }),
  );
  const normalizedFormat = String(format || "all").toUpperCase();
  if (normalizedFormat === "ALL" || !report?.videos) return report;
  const target = normalizedFormat === "SHORTS" ? "SHORT" : normalizedFormat;
  return {
    ...report,
    formatFilter: target,
    videos: report.videos.filter((video) => video.videoFormat === target),
  };
}

function normalizeCommentText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAuthorChannelId(snippet = {}) {
  return String(snippet?.authorChannelId?.value || snippet?.authorChannelId || "").trim();
}

function replyAuthorIsChannel(snippet = {}, channelId, channelTitle = "", channelHandle = "") {
  if (normalizeAuthorChannelId(snippet) === channelId) return true;
  const author = String(snippet.authorDisplayName || "").trim().toLowerCase();
  const titleNorm = String(channelTitle || "").trim().toLowerCase();
  if (titleNorm && author === titleNorm) return true;
  const handleNorm = String(channelHandle || "").trim().toLowerCase().replace(/^@/, "");
  if (handleNorm && (author === `@${handleNorm}` || author.includes(handleNorm))) return true;
  return false;
}

function threadHasChannelReply(thread, channelId, channelTitle = "", channelHandle = "") {
  const replies = thread?.replies?.comments || [];
  return replies.some((reply) => replyAuthorIsChannel(reply?.snippet, channelId, channelTitle, channelHandle));
}

async function threadHasChannelReplyDeep(accessToken, thread, channelId, channelTitle = "", channelHandle = "") {
  if (threadHasChannelReply(thread, channelId, channelTitle, channelHandle)) return true;
  const replyCount = Number(thread?.snippet?.totalReplyCount || 0);
  if (replyCount === 0) return false;
  const parentId = thread?.snippet?.topLevelComment?.id;
  if (!parentId) return false;
  try {
    const data = await youtubeDataGet(accessToken, "comments", {
      part: "snippet",
      parentId,
      maxResults: 100,
    });
    return (data?.items || []).some((reply) => (
      replyAuthorIsChannel(reply?.snippet, channelId, channelTitle, channelHandle)
    ));
  } catch {
    return false;
  }
}

function isOwnChannelComment(topSnippet, channelId) {
  return Boolean(normalizeAuthorChannelId(topSnippet) && normalizeAuthorChannelId(topSnippet) === channelId);
}

async function mapCommentThread(thread, channelId, channelTitle = "", channelHandle = "", accessToken = null) {
  const snippet = thread?.snippet || {};
  const top = snippet.topLevelComment?.snippet || {};
  const videoId = snippet.videoId || "";
  const threadId = thread?.id || "";
  const topCommentId = snippet.topLevelComment?.id || "";
  const replyCount = Number(snippet.totalReplyCount || 0);
  let isAnswered = false;
  if (replyCount > 0) {
    isAnswered = accessToken
      ? await threadHasChannelReplyDeep(accessToken, thread, channelId, channelTitle, channelHandle)
      : threadHasChannelReply(thread, channelId, channelTitle, channelHandle);
  }
  const ownChannelComment = isOwnChannelComment(top, channelId);

  return {
    threadId,
    commentId: topCommentId,
    videoId,
    videoTitle: snippet.videoTitle || "",
    authorDisplayName: top.authorDisplayName || "",
    authorProfileImageUrl: top.authorProfileImageUrl || "",
    isOwnChannelComment: ownChannelComment,
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

function applyCommentFilters(comments, { filter = "all", keyword = "", handledIds = new Set() } = {}) {
  let result = comments.filter((item) => !item.isOwnChannelComment && !handledIds.has(item.threadId));

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
  pageToken = "",
  projectsRoot = null,
  views48hThreshold = 100,
  enrich = true,
} = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const channelData = await youtubeDataGet(accessToken, "channels", {
    part: "snippet",
    mine: "true",
  });

  const channelItem = channelData?.items?.[0];
  const channelId = channelItem?.id;
  const channelTitle = channelItem?.snippet?.title || "";
  const channelHandle = channelItem?.snippet?.customUrl || "";
  if (!channelId) {
    throw new Error("Nenhum canal encontrado na conta conectada.");
  }

  const maxResults = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const wantsFilter = filter === "unanswered" || String(keyword || "").trim().length > 0;
  // Busca extra: comentários do próprio canal e já respondidos são filtrados depois.
  const fetchCount = wantsFilter ? 100 : Math.min(maxResults * 2, 100);

  const threadParams = {
    part: "snippet,replies",
    allThreadsRelatedToChannelId: channelId,
    order: "time",
    maxResults: fetchCount,
    moderationStatus: "published",
  };
  if (pageToken) threadParams.pageToken = pageToken;

  const threadsData = await youtubeDataGet(accessToken, "commentThreads", threadParams);

  const handledIds = getHandledCommentIds(workspaceDir);
  const mapped = await Promise.all(
    (threadsData?.items || []).map((thread) => (
      mapCommentThread(thread, channelId, channelTitle, channelHandle, accessToken)
    )),
  );

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

  let filtered = applyCommentFilters(mapped, { filter, keyword, handledIds }).slice(0, maxResults);

  if (enrich) {
    const { enrichComments, getExtendedStudioSettings } = await import("./youtubeStudioAdvanced.js");
    const settings = getExtendedStudioSettings(workspaceDir);
    const lumieraVideos = projectsRoot ? collectLumieraPublishedVideos(projectsRoot) : [];
    const lumieraVideoIds = new Set(lumieraVideos.map((item) => item.videoId));
    const hotVideoIds = new Set();
    const views48hByVideoId = {};
    if (projectsRoot) {
      await Promise.all(lumieraVideos.slice(0, 8).map(async (entry) => {
        try {
          const { fetchVideoVelocity } = await import("./youtubeTitleAnalytics.js");
          const velocity = await fetchVideoVelocity(workspaceDir, entry.videoId);
          views48hByVideoId[entry.videoId] = velocity.views48h || 0;
          if ((velocity.views48h || 0) >= views48hThreshold) hotVideoIds.add(entry.videoId);
        } catch { /* ignore */ }
      }));
    }
    filtered = enrichComments(filtered, {
      settings,
      hotVideoIds,
      lumieraVideoIds,
      views48hByVideoId,
    });
  }

  return {
    channelId,
    channelTitle: channelItem?.snippet?.title || "",
    filter,
    keyword: String(keyword || "").trim(),
    comments: filtered,
    totalFetched: mapped.length,
    handledHidden: mapped.filter((item) => handledIds.has(item.threadId)).length,
    nextPageToken: threadsData?.nextPageToken || null,
    fetchedAt: new Date().toISOString(),
    replyNote: "Comentários do canal e marcados como tratados ficam ocultos. Responda pelo Lumiera ou abra no Studio.",
  };
}

export async function replyToChannelComment(workspaceDir, { parentId, text } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const commentParentId = String(parentId || "").trim();
  const replyText = String(text || "").trim();

  if (!commentParentId) {
    throw new Error("parentId do comentário é obrigatório.");
  }
  if (!replyText) {
    throw new Error("Texto da resposta é obrigatório.");
  }

  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const res = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        parentId: commentParentId,
        textOriginal: replyText.slice(0, 10000),
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Falha ao publicar resposta no YouTube.";
    throwIfInsufficientScope(message);
    throw new Error(message);
  }

  return {
    success: true,
    commentId: data?.id || null,
    publishedAt: data?.snippet?.publishedAt || new Date().toISOString(),
  };
}

async function fetchVideoStudioDetailUncached(workspaceDir, videoId, { days = 28 } = {}) {
  const {
    fetchVideoVelocityTimeline,
    fetchVideoCtrAndRevenue,
  } = await import("./youtubeStudioAdvanced.js");
  const normalizedVideoId = String(videoId || "").trim();
  if (!normalizedVideoId) {
    throw new Error("videoId é obrigatório.");
  }

  await assertTitleTestScopes(workspaceDir);
  const { startDate, endDate } = periodDates(days);

  const [analytics, retention, velocity, velocityTimeline, ctrRevenue] = await Promise.all([
    fetchVideoAnalytics(workspaceDir, normalizedVideoId, { startDate, endDate }),
    fetchRetentionCurve(workspaceDir, normalizedVideoId, { startDate, endDate }).catch((err) => ({
      videoId: normalizedVideoId,
      points: [],
      error: err.message,
    })),
    fetchVideoVelocity(workspaceDir, normalizedVideoId).catch((err) => ({
      videoId: normalizedVideoId,
      views48h: 0,
      error: err.message,
    })),
    fetchVideoVelocityTimeline(workspaceDir, normalizedVideoId, { days: Math.min(days, 7) }).catch(() => null),
    fetchVideoCtrAndRevenue(workspaceDir, normalizedVideoId, { days }).catch(() => null),
  ]);

  return {
    videoId: normalizedVideoId,
    periodDays: days,
    startDate,
    endDate,
    analytics,
    retention,
    velocity,
    velocityTimeline,
    ctrRevenue,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchVideoStudioDetail(workspaceDir, videoId, { days = 28, forceRefresh = false } = {}) {
  const normalizedVideoId = String(videoId || "").trim();
  if (!normalizedVideoId) {
    throw new Error("videoId é obrigatório.");
  }
  const cacheKey = `detail:${normalizedVideoId}:${days}`;
  return withChannelCache(
    workspaceDir,
    cacheKey,
    CACHE_TTL_MS.videoDetail,
    forceRefresh,
    () => fetchVideoStudioDetailUncached(workspaceDir, normalizedVideoId, { days }),
  );
}

async function fetchLumieraVideosReportUncached(workspaceDir, projectsRoot, { days = 28 } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodDates(days);
  const lumieraVideos = collectLumieraPublishedVideos(projectsRoot);
  const { getExtendedStudioSettings, loadLumieraExperiments } = await import("./youtubeStudioAdvanced.js");
  const studioSettings = getExtendedStudioSettings(workspaceDir);

  const enriched = await Promise.all(
    lumieraVideos.map(async (entry) => {
      let metrics = null;
      let views48h = 0;
      let thumbnailUrl = "";

      try {
        const [metricResult, velocity, videoData] = await Promise.all([
          fetchSingleVideoMetrics(accessToken, entry.videoId, startDate, endDate),
          fetchVideoVelocity(workspaceDir, entry.videoId).catch(() => ({ views48h: 0 })),
          youtubeDataGet(accessToken, "videos", { part: "snippet", id: entry.videoId }),
        ]);

        metrics = metricResult;
        views48h = Number(velocity?.views48h || 0);
        const snippet = videoData?.items?.[0]?.snippet || {};
        thumbnailUrl = snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || "";
        if (!entry.title && snippet?.title) {
          entry.title = snippet.title;
        }
      } catch {
        metrics = null;
      }

      const goalViews48h = studioSettings.projectGoals?.[entry.projectName]?.views48h
        ?? studioSettings.defaultProjectGoalViews48h
        ?? 100;
      return {
        ...entry,
        thumbnailUrl,
        views48h,
        goalViews48h,
        goalMet: views48h >= goalViews48h,
        metrics: metrics || {
          views: 0,
          estimatedMinutesWatched: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          subscribersGained: 0,
        },
        studioUrl: `https://studio.youtube.com/video/${entry.videoId}/analytics/tab-overview/period-default`,
        watchUrl: `https://www.youtube.com/watch?v=${entry.videoId}`,
      };
    }),
  );

  const withExperiments = await loadLumieraExperiments(projectsRoot, enriched);

  return {
    periodDays: days,
    startDate,
    endDate,
    videos: withExperiments.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0)),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLumieraVideosReport(
  workspaceDir,
  projectsRoot,
  { days = 28, forceRefresh = false } = {},
) {
  const cacheKey = `lumiera:${days}`;
  return withChannelCache(
    workspaceDir,
    cacheKey,
    CACHE_TTL_MS.lumiera,
    forceRefresh,
    () => fetchLumieraVideosReportUncached(workspaceDir, projectsRoot, { days }),
  );
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
      const experiment = readJsonSafe(path.join(fullPath, "youtube_title_experiment.json"));
      const videoId = String(
        cfg?.upload_metadata?.youtube?.post_id || experiment?.videoId || "",
      ).trim();
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

async function countUnansweredComments(
  accessToken,
  channelId,
  scanLimit = 50,
  handledIds = new Set(),
  channelTitle = "",
  channelHandle = "",
) {
  const threadsData = await youtubeDataGet(accessToken, "commentThreads", {
    part: "snippet,replies",
    allThreadsRelatedToChannelId: channelId,
    order: "time",
    maxResults: Math.min(Math.max(scanLimit, 1), 100),
    moderationStatus: "published",
  });

  let count = 0;
  for (const thread of threadsData?.items || []) {
    const threadId = thread?.id || "";
    if (handledIds.has(threadId)) continue;
    const snippet = thread?.snippet || {};
    const top = snippet.topLevelComment?.snippet || {};
    if (isOwnChannelComment(top, channelId)) continue;
    const replyCount = Number(snippet.totalReplyCount || 0);
    const isAnswered = replyCount > 0 && await threadHasChannelReplyDeep(
      accessToken, thread, channelId, channelTitle, channelHandle,
    );
    if (!isAnswered) count += 1;
  }
  return count;
}

async function fetchChannelAlertsUncached(workspaceDir, projectsRoot, {
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
  const channelItem = channelData?.items?.[0];
  const channelId = channelItem?.id;
  const channelTitle = channelItem?.snippet?.title || "";
  const channelHandle = channelItem?.snippet?.customUrl || "";
  if (!channelId) {
    throw new Error("Nenhum canal encontrado na conta conectada.");
  }

  const lumieraVideos = collectLumieraPublishedVideos(projectsRoot);
  const lumieraVideoIds = lumieraVideos.map((item) => item.videoId);

  const handledIds = getHandledCommentIds(workspaceDir);
  const [unansweredComments, velocityResults] = await Promise.all([
    countUnansweredComments(
      accessToken, channelId, commentScanLimit, handledIds, channelTitle, channelHandle,
    ),
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
  try {
    const { fetchChannelPeriodComparison } = await import("./youtubeStudioExtras.js");
    const period = await fetchChannelPeriodComparison(workspaceDir, { days: 7 });
    const viewsChange = period?.comparison?.views?.changePct;
    if (period?.available && viewsChange != null && viewsChange <= -30) {
      alerts.push({
        type: "views_drop",
        count: 1,
        label: `Views caíram ${viewsChange}% vs 7 dias anteriores (${period.comparison.views.current} vs ${period.comparison.views.previous})`,
        changePct: viewsChange,
        currentViews: period.comparison.views.current,
        previousViews: period.comparison.views.previous,
      });
    }
  } catch (err) {
    console.warn("[ChannelAlerts] Comparação de views:", err.message);
  }
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

  const report = {
    connected: true,
    scopesReady: true,
    badgeCount: unansweredComments + hotVideos.length + alerts.filter((a) => a.type === "views_drop").length,
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

  try {
    const { getExtendedStudioSettings, saveExtendedStudioSettings, sendWebhookNotification } = await import("./youtubeStudioAdvanced.js");
    const settings = getExtendedStudioSettings(workspaceDir);
    const prevBadge = Number(settings.lastAlertBadge || 0);
    if (report.badgeCount > prevBadge && (settings.webhooks?.telegram || settings.webhooks?.discord)) {
      const lines = report.alerts.map((a) => a.label).join(" · ");
      await sendWebhookNotification(settings.webhooks, `YouTube Lumiera: ${lines || `${report.badgeCount} alertas`}`);
    }
    saveExtendedStudioSettings(workspaceDir, { lastAlertBadge: report.badgeCount });
  } catch { /* ignore webhook errors */ }

  return report;
}

export async function fetchChannelAlerts(
  workspaceDir,
  projectsRoot,
  {
    views48hThreshold = DEFAULT_VIEWS_48H_THRESHOLD,
    maxProjects = 12,
    commentScanLimit = 50,
    forceRefresh = false,
  } = {},
) {
  const cacheKey = `alerts:${views48hThreshold}:${maxProjects}`;
  return withChannelCache(
    workspaceDir,
    cacheKey,
    CACHE_TTL_MS.alerts,
    forceRefresh,
    () => fetchChannelAlertsUncached(workspaceDir, projectsRoot, {
      views48hThreshold,
      maxProjects,
      commentScanLimit,
    }),
  );
}

export async function fetchChannelSummary(
  workspaceDir,
  projectsRoot,
  {
    days = 28,
    limit = 25,
    views48hThreshold = DEFAULT_VIEWS_48H_THRESHOLD,
    maxProjects = 12,
    forceRefresh = false,
  } = {},
) {
  const { fetchChannelPeriodComparison, fetchChannelReachMetrics } = await import("./youtubeStudioExtras.js");
  const { loadStudioSettings } = await import("./youtubeStudioSettings.js");

  const [overview, videos, lumiera, alerts, periodComparison, reach] = await Promise.all([
    fetchChannelOverview(workspaceDir, { forceRefresh }),
    fetchChannelVideosWithAnalytics(workspaceDir, { days, limit, forceRefresh, projectsRoot }),
    fetchLumieraVideosReport(workspaceDir, projectsRoot, { days, forceRefresh }),
    fetchChannelAlerts(workspaceDir, projectsRoot, {
      views48hThreshold,
      maxProjects,
      forceRefresh,
    }),
    fetchChannelPeriodComparison(workspaceDir, { days: 7 }).catch(() => ({ available: false })),
    fetchChannelReachMetrics(workspaceDir, { days }).catch(() => ({ available: false })),
  ]);

  return {
    overview,
    videos,
    lumiera,
    alerts,
    periodComparison,
    reach,
    settings: {
      replyTemplates: loadStudioSettings(workspaceDir).replyTemplates,
    },
    fetchedAt: new Date().toISOString(),
    fromCache: Boolean(
      overview?.fromCache || videos?.fromCache || lumiera?.fromCache || alerts?.fromCache,
    ),
    cacheTtlMinutes: Math.round(CACHE_TTL_MS.videos / 60000),
  };
}