import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { redisConnection } from "./queue.js";
import {
  getMediaDuration,
  concatVideoClips,
  mergeAudioTrack,
} from "@video-suite/integrations";
import { randomUUID } from "crypto";
import { pushLog } from "./logger.js";

// Import Fish Speech & Voicebox TTS from parent workspace (legacy JS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  synthesizeFishSpeech,
  loadFishSpeechConfig,
} = require("../../../../dashboard-qanat/backend/fishSpeechTts.js");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  synthesizeVoiceboxNarration,
  loadVoiceboxConfig,
} = require("../../../../dashboard-qanat/backend/voiceboxTts.js");

const prisma = new PrismaClient();

function stableJobId(queueName: string, bullmqId: string | undefined): string {
  return bullmqId ? `${queueName}:${bullmqId}` : randomUUID();
}

function trackWorkerJobs(worker: Worker, queueName: string) {
  worker.on("active", async (job) => {
    try {
      const jobId = stableJobId(queueName, job.id);
      await prisma.job.upsert({
        where: { id: jobId },
        update: {
          status: "active",
          startedAt: new Date(),
          attempts: job.attemptsMade,
        },
        create: {
          id: jobId,
          projectId: job.data.projectId || "",
          sceneId: job.data.sceneId || null,
          queue: queueName,
          type: job.name || "job",
          status: "active",
          payloadJson: job.data || {},
          attempts: job.attemptsMade,
          startedAt: new Date(),
        },
      });
      console.log(`[Job Tracker] ${queueName} job ${jobId} → active`);
      pushLog("info", queueName, `⚡ Job iniciado: ${job.name || queueName}`, {
        sceneId: job.data?.sceneId,
        projectId: job.data?.projectId,
      });
    } catch (err) {
      console.error(
        `[Job Tracker] Failed to track active job ${queueName}:`,
        err
      );
    }
  });

  worker.on("progress", async (job, progress) => {
    try {
      const jobId = stableJobId(queueName, job.id);
      const progressNum =
        typeof progress === "number"
          ? progress
          : parseFloat(String(progress)) || 0;
      await prisma.job.upsert({
        where: { id: jobId },
        update: {
          progress: progressNum,
        },
        create: {
          id: jobId,
          projectId: job.data.projectId || "",
          sceneId: job.data.sceneId || null,
          queue: queueName,
          type: job.name || "job",
          status: "active",
          payloadJson: job.data || {},
          attempts: job.attemptsMade,
          progress: progressNum,
          startedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(
        `[Job Tracker] Failed to track progress ${queueName}:`,
        err
      );
    }
  });

  worker.on("completed", async (job, result) => {
    try {
      const jobId = stableJobId(queueName, job.id);
      await prisma.job.upsert({
        where: { id: jobId },
        update: {
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          resultJson: result || {},
        },
        create: {
          id: jobId,
          projectId: job.data.projectId || "",
          sceneId: job.data.sceneId || null,
          queue: queueName,
          type: job.name || "job",
          status: "completed",
          payloadJson: job.data || {},
          attempts: job.attemptsMade,
          progress: 100,
          completedAt: new Date(),
          resultJson: result || {},
        },
      });
      console.log(`[Job Tracker] ${queueName} job ${jobId} → completed`);
      pushLog("info", queueName, `✅ Job concluído com sucesso`, {
        sceneId: job.data?.sceneId,
      });
    } catch (err) {
      console.error(
        `[Job Tracker] Failed to track completed job ${queueName}:`,
        err
      );
    }
  });

  worker.on("failed", async (job, err) => {
    try {
      const jobId = stableJobId(queueName, job?.id);
      await prisma.job.upsert({
        where: { id: jobId },
        update: {
          status: "failed",
          completedAt: new Date(),
          errorCode: "FAILED",
          errorMessage: err.message,
        },
        create: {
          id: jobId,
          projectId: job?.data?.projectId || "",
          sceneId: job?.data?.sceneId || null,
          queue: queueName,
          type: job?.name || "unknown",
          status: "failed",
          payloadJson: job?.data || {},
          attempts: job?.attemptsMade || 1,
          completedAt: new Date(),
          errorCode: "FAILED",
          errorMessage: err.message,
        },
      });
      console.error(
        `[Job Tracker] ${queueName} job ${jobId} → failed: ${err.message}`
      );
      pushLog("error", queueName, `🔴 FALHA no job: ${err.message}`, {
        sceneId: job?.data?.sceneId,
        projectId: job?.data?.projectId,
      });

      if (job?.data?.projectId) {
        await prisma.project.update({
          where: { id: job.data.projectId },
          data: { status: "failed" },
        });
      }
    } catch (dbErr) {
      console.error(
        `[Job Tracker] Failed to track failed job ${queueName}:`,
        dbErr
      );
    }
  });
}

const WORKSPACE_ROOT =
  "c:/Users/Leo/Documents/VIDEOS PROFISSIONAIS/LONGOS/LUMIERA";
const STORAGE_ASSETS_DIR = path.join(
  WORKSPACE_ROOT,
  "youtube-video-suite/storage"
);

// Global Mutex: Strictly 1 process at a time across all workers to prevent overloading PC resources
class GlobalRenderMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(label: string): Promise<void> {
    if (this.locked) {
      console.log(
        `[Mutex Single-Process] ⏸️ ${label} aguardando a vez... (1 processo por vez ativado)`
      );
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.locked = true;
    console.log(
      `[Mutex Single-Process] 🚀 Executando processo único: ${label}`
    );
  }

  release(label: string): void {
    console.log(`[Mutex Single-Process] ✅ Concluído: ${label}`);
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

const systemMutex = new GlobalRenderMutex();

export const ttsWorker = new Worker(
  "tts",
  async (job) => {
    const {
      projectId,
      sceneId,
      script,
      ttsProvider: jobProvider,
      voiceId: jobVoiceId,
    } = job.data;
    const label = `TTS [Cena ${sceneId || "n/a"}]`;
    await systemMutex.acquire(label);

    try {
      console.log(
        `[TTS Worker] Processing scene ${sceneId} for project ${projectId}...`
      );

      const projectDir = path.join(STORAGE_ASSETS_DIR, "assets", projectId);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      const outputPath = path.join(projectDir, `voiceover_${sceneId}.mp3`);

      // Fetch project to inspect manifestJson defaults if not explicitly passed in job payload
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      const projectManifest = (project?.manifestJson as any) || {};

      const ttsProvider =
        jobProvider || projectManifest.ttsProvider || "voicebox";
      const voiceId = jobVoiceId || projectManifest.voiceId || "";

      if (ttsProvider === "voicebox") {
        console.log(
          `[TTS Worker] Synthesizing via Voicebox local server (voice: ${voiceId || "default"})...`
        );
        const vbConfig = loadVoiceboxConfig({ workspaceDir: WORKSPACE_ROOT });
        await synthesizeVoiceboxNarration(script, {
          outputPath,
          voice: voiceId || undefined,
          config: vbConfig,
          onLog: (msg: string) => console.log(msg),
        });
      } else {
        console.log(
          `[TTS Worker] Synthesizing via Fish Speech S2 (voice: ${voiceId || "default"})...`
        );
        const fishConfig = loadFishSpeechConfig({
          workspaceDir: WORKSPACE_ROOT,
        });
        let refPath: string | undefined = voiceId || undefined;
        if (voiceId && voiceId !== "default") {
          const sampleCandidate = path.join(
            WORKSPACE_ROOT,
            `dashboard-qanat/backend/_voice_samples/${voiceId}.mp3`
          );
          if (fs.existsSync(sampleCandidate)) {
            refPath = sampleCandidate;
            console.log(
              `[TTS Worker] Found reference voice sample: ${sampleCandidate}`
            );
          }
        }
        await synthesizeFishSpeech(script, {
          outputPath,
          referenceAudioPath: refPath,
          config: fishConfig,
        });
      }

      console.log(`[TTS Worker] Audio saved to ${outputPath}`);

      // Create an asset record in DB
      const assetId = randomUUID();
      const fileStats = fs.statSync(outputPath);

      await prisma.asset.create({
        data: {
          id: assetId,
          workspaceId: (await prisma.workspace.findFirst())?.id || "",
          projectId,
          sceneId,
          type: "audio",
          role: "voiceover",
          storageKey: `assets/${projectId}/voiceover_${sceneId}.mp3`,
          mimeType: "audio/mpeg",
          checksum: "local_hash",
          durationSec: 0, // Will be computed in the alignment stage
          metadataJson: {
            fileSize: fileStats.size,
          },
        },
      });

      // Trigger alignment queue job
      console.log(`[TTS Worker] Triggering alignment for scene ${sceneId}...`);
      const { addJobToQueue } = await import("./queue.js");
      await addJobToQueue("alignment", "align-scene", {
        projectId,
        sceneId,
        audioPath: outputPath,
        assetId,
      });
    } finally {
      systemMutex.release(label);
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

export const alignmentWorker = new Worker(
  "alignment",
  async (job) => {
    const { projectId, sceneId, audioPath, assetId } = job.data;
    console.log(`[Alignment Worker] Reading duration of ${audioPath}...`);

    // Use ffprobe helper to read duration
    const durationSec = await getMediaDuration(audioPath);
    console.log(`[Alignment Worker] Duration: ${durationSec}s`);

    // Update database scene and asset models
    await prisma.asset.update({
      where: { id: assetId },
      data: { durationSec },
    });

    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    if (scene) {
      const existingManifest = (scene.manifestJson as any) || {};
      const sceneManifest = {
        sceneId: scene.id,
        projectId: scene.projectId,
        aspectRatio: existingManifest.aspectRatio || "9:16",
        engineHint: scene.engineHint,
        script: scene.script,
        caption: scene.caption,
        visualMetaphor: scene.visualMetaphor,
        paletteId: scene.paletteId,
        motionProfile: scene.motionProfile,
        assets: existingManifest.assets || [],
        status: scene.status,
        version: scene.version,
        ...existingManifest,
        durationSec,
        voiceover: {
          storageKey: `assets/${projectId}/voiceover_${sceneId}.mp3`,
          durationSec,
          language: "pt-BR",
          voiceId: "default",
        },
      };

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          durationSec,
          manifestJson: sceneManifest,
        },
      });
    }

    // Check if all scenes in the project are aligned
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { scenes: true },
    });

    if (project) {
      const allAligned = project.scenes.every((s) => s.durationSec > 0);
      if (allAligned) {
        console.log(
          `[Alignment Worker] All scenes aligned. Initiating simple master render...`
        );
        // Update ProjectManifest
        const projectManifest = project.manifestJson as any;
        projectManifest.scenes = project.scenes.map((s) => s.manifestJson);

        await prisma.project.update({
          where: { id: projectId },
          data: {
            manifestJson: projectManifest,
            status: "completed",
          },
        });

        const { addJobToQueue } = await import("./queue.js");
        await addJobToQueue("delivery", "master-render", {
          projectId,
        });
      }
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

export const deliveryWorker = new Worker(
  "delivery",
  async (job) => {
    const { projectId } = job.data;
    const label = `Delivery Master Render [Project ${projectId}]`;
    await systemMutex.acquire(label);

    try {
      console.log(
        `[Delivery Worker] Executing master render for project ${projectId}...`
      );

      const projectDir = path.join(STORAGE_ASSETS_DIR, "assets", projectId);
      const rendersDir = path.join(STORAGE_ASSETS_DIR, "renders");
      if (!fs.existsSync(rendersDir)) {
        fs.mkdirSync(rendersDir, { recursive: true });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { scenes: { orderBy: { order: "asc" } } },
      });

      if (!project) return;

      const voiceoverFiles = project.scenes.map((s) =>
        path.join(projectDir, `voiceover_${s.id}.mp3`)
      );
      const outputAudioPath = path.join(projectDir, "narration.wav");

      const listFilePath = path.join(projectDir, `concat_audio_list.txt`);
      const listContent = voiceoverFiles
        .map((p) => `file '${p.replace(/\\/g, "/")}'`)
        .join("\n");
      fs.writeFileSync(listFilePath, listContent, "utf8");

      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);

        const audioCmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputAudioPath}"`;
        await execAsync(audioCmd);
        console.log(
          `[Delivery Worker] Audios concatenated to ${outputAudioPath}`
        );

        const finalVideoPath = path.join(rendersDir, `render_${projectId}.mp4`);
        const totalDuration = project.scenes.reduce(
          (sum, s) => sum + s.durationSec,
          0
        );
        const mockVideoCmd = `ffmpeg -y -f lavfi -i color=c=black:s=1280x720:d=${totalDuration} -i "${outputAudioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p "${finalVideoPath}"`;

        await execAsync(mockVideoCmd);
        console.log(
          `[Delivery Worker] Master preview video generated: ${finalVideoPath}`
        );

        await prisma.render.create({
          data: {
            id: randomUUID(),
            projectId,
            engine: "remotion",
            variant: "master",
            status: "completed",
            storageKey: `renders/render_${projectId}.mp4`,
            width: 1280,
            height: 720,
            fps: 24,
            durationSec: totalDuration,
            codec: "h264",
            manifestJson: project.manifestJson as any,
          },
        });
      } catch (err: any) {
        console.error("[Delivery Worker] Master render failed:", err.message);
        throw err;
      } finally {
        try {
          fs.unlinkSync(listFilePath);
        } catch {}
      }
    } finally {
      systemMutex.release(label);
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

// Handle worker event loggers
ttsWorker.on("failed", (job, err) => {
  console.error(`[TTS Worker] Job failed:`, err);
});
alignmentWorker.on("failed", (job, err) => {
  console.error(`[Alignment Worker] Job failed:`, err);
});
deliveryWorker.on("failed", (job, err) => {
  console.error(`[Delivery Worker] Job failed:`, err);
});

// Helper factory to create single-process render engine workers
function createGenericRenderWorker(queueName: string, engineName: string) {
  const worker = new Worker(
    queueName,
    async (job) => {
      const { projectId, sceneId, manifestJson } = job.data;
      const label = `${engineName.toUpperCase()} [Cena ${sceneId || "n/a"}]`;
      await systemMutex.acquire(label);

      try {
        console.log(`[${engineName} Worker] Processing scene ${sceneId}...`);

        const { renderScene } = await import("./adapters/router.js");
        const { SceneManifestSchema } =
          await import("@video-suite/scene-contract");

        const sceneManifest = SceneManifestSchema.parse(manifestJson);

        const renderManifest = await renderScene(sceneManifest, {
          jobId: job.id || randomUUID(),
          projectId,
          sceneId,
          storageDir: path.join(STORAGE_ASSETS_DIR, "renders", projectId),
          onLog: (msg) => console.log(msg),
          onProgress: (pct, msg) => {
            console.log(`[${engineName} ${pct}%] ${msg}`);
            job.updateProgress(pct).catch(() => {});
          },
        });

        const relKey = path
          .relative(STORAGE_ASSETS_DIR, renderManifest.storageKey)
          .replace(/\\/g, "/");

        // Persist render record
        await prisma.render.create({
          data: {
            id: randomUUID(),
            projectId,
            sceneId,
            engine: engineName,
            variant: "master",
            status: "completed",
            storageKey: relKey,
            width: renderManifest.width,
            height: renderManifest.height,
            fps: renderManifest.fps,
            durationSec: renderManifest.durationSec,
            codec: renderManifest.codec,
            manifestJson: renderManifest.manifestJson as any,
          },
        });

        // Update scene status
        await prisma.scene.update({
          where: { id: sceneId },
          data: { status: "rendered" },
        });

        console.log(
          `[${engineName} Worker] Scene ${sceneId} rendered successfully.`
        );
      } finally {
        systemMutex.release(label);
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[${engineName} Worker] Job failed:`, err);
  });

  trackWorkerJobs(worker, queueName);
  return worker;
}

// ── Render Engine Workers (concurrency: 1 + systemMutex) ───────────────────
export const hyperframesRenderWorker = createGenericRenderWorker(
  "hyperframes-render",
  "hyperframes"
);
export const remotionRenderWorker = createGenericRenderWorker(
  "remotion-render",
  "remotion"
);
export const gbroRenderWorker = createGenericRenderWorker(
  "gbro-render",
  "gbro"
);
export const voxRenderWorker = createGenericRenderWorker("vox-render", "vox");
export const ffmpegRenderWorker = createGenericRenderWorker(
  "ffmpeg-render",
  "ffmpeg"
);

// Register postgres database job trackers for core workers
trackWorkerJobs(ttsWorker, "tts");
trackWorkerJobs(alignmentWorker, "alignment");
trackWorkerJobs(deliveryWorker, "delivery");
