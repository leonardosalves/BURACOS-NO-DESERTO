import {
  assertTitleTestScopes,
  getYoutubeAccessToken,
  getYoutubeTokenScopes,
  throwIfInsufficientScope,
} from "./youtubeTitleAnalytics.js";

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