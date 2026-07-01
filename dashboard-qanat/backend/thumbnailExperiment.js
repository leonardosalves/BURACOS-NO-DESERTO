import fs from "fs";
import path from "path";
import { getYoutubeAccessToken, fetchVariantPeriodStats } from "./youtubeTitleAnalytics.js";

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

export function getThumbnailExperimentPath(projectDir) {
  return path.join(projectDir, "youtube_thumbnail_experiment.json");
}

export function loadThumbnailExperiment(projectDir) {
  return readJson(getThumbnailExperimentPath(projectDir));
}

export function saveThumbnailExperiment(projectDir, experiment) {
  writeJson(getThumbnailExperimentPath(projectDir), experiment);
}

export function startThumbnailExperiment(projectDir, { videoId, thumbnails = [], rotateHours = 72 }) {
  const variants = thumbnails
    .filter((t) => t?.fileName || t?.path)
    .slice(0, 3)
    .map((t, index) => ({
      id: String.fromCharCode(65 + index),
      fileName: t.fileName || path.basename(t.path || ""),
      path: t.path || (t.fileName ? `ASSETS/youtube_thumbnails/${t.fileName}` : ""),
      appliedAt: null,
    }));

  if (variants.length < 2) {
    throw new Error("Selecione pelo menos 2 thumbnails para o teste A/B.");
  }
  if (!videoId) throw new Error("videoId obrigatório para teste de thumbnail.");

  const experiment = {
    startedAt: new Date().toISOString(),
    videoId,
    rotateHours,
    activeVariantId: variants[0].id,
    status: "running",
    variants,
    history: [],
  };

  saveThumbnailExperiment(projectDir, experiment);
  return experiment;
}

function resolveThumbnailPath(projectDir, variant) {
  const candidates = [
    path.join(projectDir, variant.path || ""),
    path.join(projectDir, "ASSETS", variant.fileName || ""),
    path.join(projectDir, "ASSETS", "youtube_thumbnails", variant.fileName || ""),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

export async function applyThumbnailVariant(workspaceDir, projectDir, variantId) {
  const experiment = loadThumbnailExperiment(projectDir);
  if (!experiment) throw new Error("Nenhum experimento de thumbnail ativo.");

  const variant = experiment.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`Variante ${variantId} não encontrada.`);

  const thumbPath = resolveThumbnailPath(projectDir, variant);
  if (!thumbPath) throw new Error(`Arquivo da thumbnail ${variantId} não encontrado.`);

  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const videoId = experiment.videoId;
  const ext = path.extname(thumbPath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";
  const imageData = fs.readFileSync(thumbPath);

  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "Content-Length": String(imageData.length),
      },
      body: imageData,
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Falha ao aplicar thumbnail no YouTube.");
  }

  const now = new Date().toISOString();
  const previous = experiment.variants.find((v) => v.id === experiment.activeVariantId);
  if (previous && previous.id !== variantId && !previous.endedAt) {
    previous.endedAt = now;
  }

  variant.appliedAt = variant.appliedAt || now;
  experiment.activeVariantId = variantId;
  experiment.lastAppliedAt = now;
  experiment.history.push({ variantId, fileName: variant.fileName, appliedAt: now });
  saveThumbnailExperiment(projectDir, experiment);

  return { experiment, appliedVariant: variantId };
}

export async function getThumbnailExperimentReport(workspaceDir, projectDir) {
  const experiment = loadThumbnailExperiment(projectDir);
  if (!experiment?.videoId) {
    return { experiment: null, variantPeriodStats: [], winner: null };
  }

  const titleExperiment = { videoId: experiment.videoId, history: experiment.history, startedAt: experiment.startedAt };
  let variantPeriodStats = [];
  try {
    variantPeriodStats = await fetchVariantPeriodStats(workspaceDir, titleExperiment);
  } catch {
    // analytics optional
  }

  const periodByVariant = new Map(variantPeriodStats.map((item) => [item.variantId, item]));
  const rankings = experiment.variants.map((variant) => {
    const period = periodByVariant.get(variant.id);
    return {
      ...variant,
      isActive: experiment.activeVariantId === variant.id,
      periodViews: period?.views ?? null,
      periodDays: period?.daysTracked ?? null,
    };
  }).sort((a, b) => (b.periodViews ?? -1) - (a.periodViews ?? -1));

  let winner = null;
  const withViews = rankings.filter((r) => typeof r.periodViews === "number" && r.periodViews > 0);
  if (withViews.length >= 2) {
    winner = { variantId: withViews[0].id, views: withViews[0].periodViews, fileName: withViews[0].fileName };
  }

  return { experiment, rankings, variantPeriodStats, winner };
}