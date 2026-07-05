import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  loadSocialPublishQueue,
  markSocialPublishPosted,
  updateSocialPublishItem,
} from "./socialPublishQueue.js";

const activePublishIds = new Set();
let schedulerHandle = null;
let lastSchedulerTick = null;
let lastSchedulerResult = null;

export function getSocialPublishSchedulerStatus() {
  return {
    running: Boolean(schedulerHandle),
    activePublishIds: [...activePublishIds],
    lastTick: lastSchedulerTick,
    lastResult: lastSchedulerResult,
  };
}

export function getDueScheduledItems(workspaceDir) {
  const now = Date.now();
  const { items } = loadSocialPublishQueue(workspaceDir);
  return items.filter(
    (item) =>
      item.status === "scheduled" &&
      item.scheduledAt &&
      new Date(item.scheduledAt).getTime() <= now &&
      !activePublishIds.has(item.id)
  );
}

function readYoutubeVideoId(projDir) {
  try {
    const configPath = path.join(projDir, "config_qanat.json");
    if (!fs.existsSync(configPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return cfg?.upload_metadata?.youtube?.post_id || null;
  } catch {
    return null;
  }
}

function runUploadPipeline(projDir, platforms, videoFile, deps) {
  const { pythonPath, workspaceDir, syncUploadScripts } = deps;

  return new Promise((resolve, reject) => {
    syncUploadScripts(projDir);

    const pipelineArgs = [
      path.join(projDir, "upload_pipeline.py"),
      projDir,
      platforms.join(","),
    ];
    if (videoFile) pipelineArgs.push(videoFile);

    const child = spawn(pythonPath, pipelineArgs, {
      cwd: projDir,
      shell: false,
      env: {
        ...process.env,
        LUMIERA_WORKSPACE: workspaceDir,
        LUMIERA_PROJECT_DIR: projDir,
        ...(videoFile ? { LUMIERA_UPLOAD_VIDEO: videoFile } : {}),
      },
    });

    let lastError = "";
    const onLine = (line, isErr) => {
      const trimmed = String(line || "").trim();
      if (!trimmed) return;
      if (/\[ERROR\]|\[PIPELINE_ERROR\]/i.test(trimmed) || isErr) {
        lastError = trimmed.replace(/^\[Error\]\s*/i, "");
      }
    };

    child.stdout.on("data", (data) => {
      for (const line of data.toString().split("\n")) onLine(line, false);
    });

    child.stderr.on("data", (data) => {
      for (const line of data.toString().split("\n")) onLine(line, true);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ videoId: readYoutubeVideoId(projDir) });
        return;
      }
      const hint =
        lastError ||
        (code === 1
          ? "Verifique vídeo em OUTPUT/, OAuth YouTube e metadados salvos."
          : `Processo encerrou com código ${code}`);
      reject(new Error(hint));
    });

    child.on("error", (err) => reject(err));
  });
}

export async function publishSocialQueueItem(workspaceDir, itemId, deps) {
  const { resolveProjectDir } = deps;
  const { items } = loadSocialPublishQueue(workspaceDir);
  const item = items.find((row) => row.id === itemId);
  if (!item) throw new Error("Item da fila não encontrado.");

  if (!["pending", "scheduled", "failed"].includes(item.status)) {
    throw new Error(
      `Status "${item.status}" não permite publicação automática.`
    );
  }

  if (activePublishIds.has(itemId)) {
    throw new Error("Publicação já em andamento para este item.");
  }

  const projDir = resolveProjectDir(item.projectSlug);
  if (!projDir) {
    throw new Error(`Projeto não encontrado: ${item.projectSlug}`);
  }

  activePublishIds.add(itemId);
  try {
    const result = await runUploadPipeline(
      projDir,
      item.platforms,
      item.videoFile,
      deps
    );

    let postUpload = null;
    if (result.videoId && deps.runPostUploadHooks) {
      try {
        postUpload = await deps.runPostUploadHooks(workspaceDir, projDir, {
          videoId: result.videoId,
          autoStartTitleTest: true,
          postPinned: true,
        });
      } catch (err) {
        console.warn(
          `[SocialPublish] Post-upload ${item.projectSlug}:`,
          err.message
        );
      }
    }

    markSocialPublishPosted(workspaceDir, {
      projectSlug: item.projectSlug,
      videoFile: item.videoFile,
    });

    return {
      ok: true,
      itemId,
      projectSlug: item.projectSlug,
      videoId: result.videoId,
      postUpload,
    };
  } catch (err) {
    updateSocialPublishItem(workspaceDir, itemId, {
      status: "failed",
      lastError: err.message || "Falha no upload.",
    });
    throw err;
  } finally {
    activePublishIds.delete(itemId);
  }
}

export async function tickSocialPublishScheduler(workspaceDir, deps) {
  lastSchedulerTick = new Date().toISOString();
  const due = getDueScheduledItems(workspaceDir);
  const results = [];

  for (const item of due) {
    if (activePublishIds.size > 0) break;
    try {
      const published = await publishSocialQueueItem(
        workspaceDir,
        item.id,
        deps
      );
      results.push({
        itemId: item.id,
        projectSlug: item.projectSlug,
        ok: true,
        videoId: published.videoId,
      });
      console.log(
        `[SocialPublish] Agendado publicado: ${item.projectSlug} (${item.videoFile})`
      );
    } catch (err) {
      results.push({
        itemId: item.id,
        projectSlug: item.projectSlug,
        ok: false,
        error: err.message,
      });
      console.warn(
        `[SocialPublish] Falha agendada ${item.projectSlug}:`,
        err.message
      );
    }
  }

  lastSchedulerResult = { due: due.length, results };
  return lastSchedulerResult;
}

export function startSocialPublishScheduler({
  workspaceDir,
  deps,
  intervalMs = 60 * 1000,
}) {
  if (schedulerHandle) return schedulerHandle;

  const run = async () => {
    try {
      await tickSocialPublishScheduler(workspaceDir, deps);
    } catch (err) {
      console.warn("[SocialPublish] Erro no scheduler:", err.message);
    }
  };

  setTimeout(run, 15_000);
  schedulerHandle = setInterval(run, intervalMs);
  console.log(
    `[SocialPublish] Scheduler ativo (intervalo ${Math.round(intervalMs / 1000)}s)`
  );
  return schedulerHandle;
}
