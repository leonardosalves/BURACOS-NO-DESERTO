import fs from "fs";
import path from "path";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

/** Escopos mínimos para teste A/B de títulos + analytics (além do upload). */
export const TITLE_TEST_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export const TITLE_TEST_SCOPE_LABELS = {
  "https://www.googleapis.com/auth/youtube.force-ssl": "Editar títulos dos vídeos",
  "https://www.googleapis.com/auth/youtube.readonly": "Ler dados do canal",
  "https://www.googleapis.com/auth/yt-analytics.readonly": "Analytics (views, retenção)",
};

export function getYoutubeScopeString() {
  return YOUTUBE_SCOPES.join(" ");
}

export function isInsufficientScopeError(message = "") {
  return /insufficient authentication scopes/i.test(String(message));
}

export function buildInsufficientScopeError(message = "") {
  const err = new Error(
    message || "Permissões insuficientes no YouTube. Revincule a conta em Upload → Integrações.",
  );
  err.code = "INSUFFICIENT_SCOPES";
  err.needsReauth = true;
  return err;
}

export function throwIfInsufficientScope(apiMessage = "") {
  if (isInsufficientScopeError(apiMessage)) {
    throw buildInsufficientScopeError(apiMessage);
  }
}

export async function getYoutubeTokenScopes(workspaceDir) {
  const paths = getYoutubePaths(workspaceDir);
  if (!fs.existsSync(paths.secrets) || !fs.existsSync(paths.token)) {
    return {
      connected: false,
      ready: false,
      granted: [],
      missing: [...TITLE_TEST_REQUIRED_SCOPES],
      missingLabels: TITLE_TEST_REQUIRED_SCOPES.map((s) => TITLE_TEST_SCOPE_LABELS[s] || s),
    };
  }

  try {
    const accessToken = await refreshYoutubeAccessToken(workspaceDir);
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        connected: true,
        ready: false,
        granted: [],
        missing: [...TITLE_TEST_REQUIRED_SCOPES],
        missingLabels: TITLE_TEST_REQUIRED_SCOPES.map((s) => TITLE_TEST_SCOPE_LABELS[s] || s),
        error: data?.error_description || data?.error || "Falha ao verificar escopos.",
      };
    }

    const granted = String(data.scope || "").split(/\s+/).filter(Boolean);
    const missing = TITLE_TEST_REQUIRED_SCOPES.filter((scope) => !granted.includes(scope));
    return {
      connected: true,
      ready: missing.length === 0,
      granted,
      missing,
      missingLabels: missing.map((s) => TITLE_TEST_SCOPE_LABELS[s] || s),
    };
  } catch (err) {
    return {
      connected: true,
      ready: false,
      granted: [],
      missing: [...TITLE_TEST_REQUIRED_SCOPES],
      missingLabels: TITLE_TEST_REQUIRED_SCOPES.map((s) => TITLE_TEST_SCOPE_LABELS[s] || s),
      error: err.message,
    };
  }
}

export function resetYoutubeAuth(workspaceDir) {
  const paths = getYoutubePaths(workspaceDir);
  if (fs.existsSync(paths.token)) {
    fs.unlinkSync(paths.token);
  }
}

export async function assertTitleTestScopes(workspaceDir) {
  const status = await getYoutubeTokenScopes(workspaceDir);
  if (!status.connected) {
    throw new Error("YouTube não conectado.");
  }
  if (!status.ready) {
    throw buildInsufficientScopeError(
      status.missingLabels?.length
        ? `Faltam permissões: ${status.missingLabels.join(", ")}. Revincule a conta do YouTube.`
        : "Permissões do YouTube incompletas para teste A/B.",
    );
  }
  return status;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function getYoutubePaths(workspaceDir) {
  return {
    secrets: path.join(workspaceDir, "youtube_client_secrets.json"),
    token: path.join(workspaceDir, "youtube_token.json"),
  };
}

export async function refreshYoutubeAccessToken(workspaceDir) {
  const paths = getYoutubePaths(workspaceDir);
  const secrets = readJson(paths.secrets);
  const token = readJson(paths.token);

  if (!secrets?.client_id || !secrets?.client_secret || !token?.refresh_token) {
    throw new Error("YouTube não autenticado para analytics.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: secrets.client_id,
      client_secret: secrets.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Falha ao renovar token do YouTube.");
  }

  const merged = {
    ...token,
    access_token: data.access_token,
    expires_in: data.expires_in,
    refreshed_at: new Date().toISOString(),
  };
  writeJson(paths.token, merged);
  return merged.access_token;
}

export async function getYoutubeAccessToken(workspaceDir) {
  const paths = getYoutubePaths(workspaceDir);
  const token = readJson(paths.token);
  if (!token?.access_token) {
    throw new Error("YouTube não conectado.");
  }
  return refreshYoutubeAccessToken(workspaceDir);
}

export function getTitleExperimentPath(projectDir) {
  return path.join(projectDir, "youtube_title_experiment.json");
}

export function loadTitleExperiment(projectDir) {
  return readJson(getTitleExperimentPath(projectDir));
}

export function saveTitleExperiment(projectDir, experiment) {
  writeJson(getTitleExperimentPath(projectDir), experiment);
}

export function startTitleExperiment(projectDir, {
  videoId,
  titles = [],
  rotateHours = 48,
}) {
  const variants = titles
    .filter((t) => t?.text)
    .slice(0, 5)
    .map((t, index) => ({
      id: String.fromCharCode(65 + index),
      text: t.text,
      chars: t.chars || t.text.length,
      appliedAt: null,
      endedAt: null,
    }));

  if (variants.length < 2) {
    throw new Error("Selecione pelo menos 2 títulos para o teste A/B.");
  }
  if (!videoId) {
    throw new Error("Informe o videoId do YouTube (após publicar o vídeo).");
  }

  const experiment = {
    startedAt: new Date().toISOString(),
    videoId,
    rotateHours,
    activeVariantId: variants[0].id,
    status: "running",
    variants,
    history: [],
  };

  saveTitleExperiment(projectDir, experiment);
  return experiment;
}

export async function applyTitleVariant(workspaceDir, projectDir, variantId) {
  await assertTitleTestScopes(workspaceDir);

  const experiment = loadTitleExperiment(projectDir);
  if (!experiment) throw new Error("Nenhum experimento de título ativo neste projeto.");

  const variant = experiment.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`Variante ${variantId} não encontrada.`);

  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const videoId = experiment.videoId;

  const getRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const getData = await getRes.json();
  if (!getRes.ok) {
    const apiMessage = getData?.error?.message || "Falha ao ler vídeo no YouTube.";
    throwIfInsufficientScope(apiMessage);
    throw new Error(apiMessage);
  }

  const video = getData?.items?.[0];
  if (!video?.snippet) throw new Error("Vídeo não encontrado no canal conectado.");

  const now = new Date().toISOString();
  const previousVariant = experiment.variants.find((v) => v.id === experiment.activeVariantId);
  if (previousVariant && previousVariant.id !== variantId && !previousVariant.endedAt) {
    previousVariant.endedAt = now;
  }

  const updateRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
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
          title: variant.text.slice(0, 100),
        },
      }),
    },
  );

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    const apiMessage = updateData?.error?.message || "Falha ao atualizar título no YouTube.";
    throwIfInsufficientScope(apiMessage);
    throw new Error(apiMessage);
  }

  variant.appliedAt = variant.appliedAt || now;
  experiment.activeVariantId = variantId;
  experiment.lastAppliedAt = now;
  experiment.history.push({ variantId, title: variant.text, appliedAt: now });
  saveTitleExperiment(projectDir, experiment);

  return { experiment, appliedTitle: variant.text };
}

const VIDEO_SUMMARY_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "averageViewDuration",
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

async function queryYoutubeAnalytics(accessToken, params) {
  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const analyticsData = await analyticsRes.json();
  if (!analyticsRes.ok) {
    const message = analyticsData?.error?.message || "Falha ao buscar analytics do YouTube.";
    if (isInsufficientScopeError(message)) {
      throw buildInsufficientScopeError(message);
    }
    throw new Error(message);
  }
  return analyticsData;
}

export async function fetchVideoAnalytics(workspaceDir, videoId, { startDate, endDate } = {}) {
  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const end = endDate || new Date().toISOString().slice(0, 10);
  const start = startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate: start,
    endDate: end,
    metrics: VIDEO_SUMMARY_METRICS,
    dimensions: "video",
    filters: `video==${videoId}`,
  });

  try {
    const analyticsData = await queryYoutubeAnalytics(accessToken, params);
    const row = parseAnalyticsRows(analyticsData)[0] || {};

    return {
      videoId,
      startDate: start,
      endDate: end,
      available: true,
      reachNote: "Impressões e CTR de thumbnail só existem no YouTube Studio (Reporting API). O Lumiera compara views por período de cada título.",
      metrics: {
        views: Number(row.views || 0),
        estimatedMinutesWatched: Number(row.estimatedMinutesWatched || 0),
        averageViewDuration: Number(row.averageViewDuration || 0),
        likes: Number(row.likes || 0),
        comments: Number(row.comments || 0),
        shares: Number(row.shares || 0),
        subscribersGained: Number(row.subscribersGained || 0),
        impressions: null,
        impressionClickThroughRate: null,
      },
    };
  } catch (err) {
    if (err?.needsReauth) throw err;
    return {
      videoId,
      startDate: start,
      endDate: end,
      available: false,
      error: err.message,
      metrics: null,
      needsReauth: false,
    };
  }
}

function toDayString(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function fetchVariantPeriodStats(workspaceDir, experiment, { startDate, endDate } = {}) {
  if (!experiment?.videoId || !Array.isArray(experiment.history) || experiment.history.length === 0) {
    return [];
  }

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);

  const end = endDate || new Date().toISOString().slice(0, 10);
  const start = startDate || toDayString(experiment.startedAt) || addDays(end, -28);

  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate: start,
    endDate: end,
    metrics: "views,averageViewDuration",
    dimensions: "day",
    filters: `video==${experiment.videoId}`,
    sort: "day",
  });

  const analyticsData = await queryYoutubeAnalytics(accessToken, params);
  const dailyRows = parseAnalyticsRows(analyticsData);

  const history = [...experiment.history].sort(
    (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime(),
  );

  const segments = history.map((entry, index) => {
    const segmentStart = toDayString(entry.appliedAt);
    const next = history[index + 1];
    const segmentEnd = next ? addDays(toDayString(next.appliedAt), -1) : end;
    return { ...entry, segmentStart, segmentEnd };
  });

  return segments.map((segment) => {
    const days = dailyRows.filter((row) => {
      const day = String(row.day || "");
      return day >= segment.segmentStart && day <= segment.segmentEnd;
    });

    const views = days.reduce((sum, row) => sum + Number(row.views || 0), 0);
    const avgDurationValues = days
      .map((row) => Number(row.averageViewDuration || 0))
      .filter((value) => value > 0);
    const averageViewDuration = avgDurationValues.length
      ? avgDurationValues.reduce((a, b) => a + b, 0) / avgDurationValues.length
      : 0;

    return {
      variantId: segment.variantId,
      title: segment.title,
      appliedAt: segment.appliedAt,
      segmentStart: segment.segmentStart,
      segmentEnd: segment.segmentEnd,
      daysTracked: days.length,
      views,
      averageViewDuration: Math.round(averageViewDuration),
    };
  });
}

export async function getTitleExperimentReport(workspaceDir, projectDir) {
  const experiment = loadTitleExperiment(projectDir);
  if (!experiment?.videoId) {
    return { experiment: null, analytics: null, rankings: [] };
  }

  const analytics = await fetchVideoAnalytics(workspaceDir, experiment.videoId);

  let variantPeriodStats = [];
  try {
    variantPeriodStats = await fetchVariantPeriodStats(workspaceDir, experiment);
  } catch (err) {
    if (err?.needsReauth) throw err;
  }

  const periodByVariant = new Map(variantPeriodStats.map((item) => [item.variantId, item]));

  const rankings = [...experiment.variants]
    .map((variant) => {
      const historyEntry = experiment.history.filter((h) => h.variantId === variant.id);
      const period = periodByVariant.get(variant.id);
      return {
        ...variant,
        applications: historyEntry.length,
        lastAppliedAt: historyEntry[historyEntry.length - 1]?.appliedAt || variant.appliedAt,
        isActive: experiment.activeVariantId === variant.id,
        periodViews: period?.views ?? null,
        periodAvgDuration: period?.averageViewDuration ?? null,
        periodDays: period?.daysTracked ?? null,
      };
    })
    .sort((a, b) => {
      const aViews = a.periodViews ?? -1;
      const bViews = b.periodViews ?? -1;
      if (aViews !== bViews) return bViews - aViews;
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return (b.applications || 0) - (a.applications || 0);
    });

  let winner = null;
  const rankedWithViews = rankings.filter((item) => typeof item.periodViews === "number" && item.periodViews > 0);
  if (rankedWithViews.length >= 2) {
    const top = rankedWithViews[0];
    winner = {
      variantId: top.id,
      reason: "views_no_periodo",
      views: top.periodViews,
      title: top.text,
    };
  }

  return { experiment, analytics, rankings, variantPeriodStats, winner };
}

export function syncExperimentVideoId(projectDir, videoId) {
  if (!videoId) return null;
  const experiment = loadTitleExperiment(projectDir) || {
    variants: [],
    history: [],
    status: "draft",
  };
  experiment.videoId = videoId;
  if (!experiment.startedAt) experiment.startedAt = new Date().toISOString();
  saveTitleExperiment(projectDir, experiment);
  return experiment;
}