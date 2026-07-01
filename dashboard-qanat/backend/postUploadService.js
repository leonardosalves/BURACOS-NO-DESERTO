import fs from "fs";
import path from "path";
import {
  getYoutubeAccessToken,
  loadTitleExperiment,
  saveTitleExperiment,
  startTitleExperiment,
  syncExperimentVideoId,
} from "./youtubeTitleAnalytics.js";

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

export async function postPinnedComment(workspaceDir, videoId, commentText) {
  if (!videoId || !commentText?.trim()) return { skipped: true, reason: "no_comment" };

  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const res = await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: {
          snippet: { textOriginal: commentText.trim().slice(0, 10000) },
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Falha ao postar comentário fixo.");
  }
  return { success: true, commentId: data?.id || null };
}

export function loadMetadataCache(projectDir) {
  const cachePath = path.join(projectDir, "youtube_metadata_cache.json");
  return readJson(cachePath);
}

export async function runPostUploadHooks(workspaceDir, projectDir, {
  videoId,
  autoStartTitleTest = true,
  postPinned = true,
} = {}) {
  const configPath = path.join(projectDir, "config_qanat.json");
  const config = readJson(configPath) || {};
  const ytMeta = config.upload_metadata?.youtube || {};
  const resolvedVideoId = videoId || ytMeta.post_id;

  if (!resolvedVideoId) {
    return { success: false, error: "videoId ausente após upload." };
  }

  syncExperimentVideoId(projectDir, resolvedVideoId);

  if (!config.upload_metadata) config.upload_metadata = {};
  if (!config.upload_metadata.youtube) config.upload_metadata.youtube = {};
  config.upload_metadata.youtube.post_id = resolvedVideoId;
  config.upload_metadata.youtube.status = "success";
  writeJson(configPath, config);

  const result = {
    success: true,
    videoId: resolvedVideoId,
    experiment: loadTitleExperiment(projectDir),
    pinnedComment: null,
    titleTestStarted: false,
  };

  if (postPinned) {
    const pinned = ytMeta.pinned_comment || ytMeta.pinnedComment;
    if (pinned) {
      try {
        result.pinnedComment = await postPinnedComment(workspaceDir, resolvedVideoId, pinned);
      } catch (err) {
        result.pinnedComment = { error: err.message };
      }
    }
  }

  if (autoStartTitleTest) {
    const cache = loadMetadataCache(projectDir);
    const titles = cache?.parsed?.titles || [];
    const existing = loadTitleExperiment(projectDir);
    if (titles.length >= 2 && (!existing || existing.status === "draft")) {
      try {
        result.experiment = startTitleExperiment(projectDir, {
          videoId: resolvedVideoId,
          titles: titles.slice(0, 5),
          rotateHours: existing?.rotateHours || 48,
        });
        result.titleTestStarted = true;
      } catch {
        // experiment may already exist
      }
    }
  }

  return result;
}

export function stopTitleExperiment(projectDir, { applyWinner = false } = {}) {
  const experiment = loadTitleExperiment(projectDir);
  if (!experiment) return null;

  experiment.status = "stopped";
  experiment.stoppedAt = new Date().toISOString();

  if (applyWinner && experiment.winnerVariantId) {
    const winner = experiment.variants?.find((v) => v.id === experiment.winnerVariantId);
    if (winner) experiment.finalTitle = winner.text;
  }

  saveTitleExperiment(projectDir, experiment);
  return experiment;
}