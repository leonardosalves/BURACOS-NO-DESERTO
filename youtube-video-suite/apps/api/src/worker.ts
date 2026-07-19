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

// Import Fish Speech TTS from parent workspace
// @ts-ignore
import {
  synthesizeFishSpeech,
  loadFishSpeechConfig,
} from "../../../../dashboard-qanat/backend/fishSpeechTts.js";

const prisma = new PrismaClient();
const WORKSPACE_ROOT =
  "c:/Users/Leo/Documents/VIDEOS PROFISSIONAIS/LONGOS/LUMIERA";
const STORAGE_ASSETS_DIR = path.join(
  WORKSPACE_ROOT,
  "youtube-video-suite/storage"
);

export const ttsWorker = new Worker(
  "tts",
  async (job) => {
    const { projectId, sceneId, script } = job.data;
    console.log(
      `[TTS Worker] Processing scene ${sceneId} for project ${projectId}...`
    );

    const projectDir = path.join(STORAGE_ASSETS_DIR, "assets", projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const outputPath = path.join(projectDir, `voiceover_${sceneId}.mp3`);

    // Load the Fish Speech configuration from Lumiera main config
    const fishConfig = loadFishSpeechConfig({
      workspaceDir: WORKSPACE_ROOT,
    });

    // Call parent workspace's local Fish Speech S2
    await synthesizeFishSpeech(script, {
      outputPath,
      config: fishConfig,
    });

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

    // Update scene status
    await prisma.scene.update({
      where: { id: sceneId },
      data: {
        status: "rendered",
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
  },
  { connection: redisConnection }
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
      const sceneManifest = scene.manifestJson as any;
      sceneManifest.durationSec = durationSec;
      sceneManifest.voiceover = {
        storageKey: `assets/${projectId}/voiceover_${sceneId}.mp3`,
        durationSec,
        language: "pt-BR",
        voiceId: "default",
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
      const allAligned = project.scenes.every(
        (s) => s.durationSec > 0 && s.status === "rendered"
      );
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
  { connection: redisConnection }
);

export const deliveryWorker = new Worker(
  "delivery",
  async (job) => {
    const { projectId } = job.data;
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

    // For Phase 2 simple render, we will concatenate the generated voiceovers and a mock video clip
    // We locate all voiceover file paths
    const voiceoverFiles = project.scenes.map((s) =>
      path.join(projectDir, `voiceover_${s.id}.mp3`)
    );
    const outputAudioPath = path.join(projectDir, "narration.wav");

    // Concat audios using ffmpeg input file list
    const listFilePath = path.join(projectDir, `concat_audio_list.txt`);
    const listContent = voiceoverFiles
      .map((p) => `file '${p.replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(listFilePath, listContent, "utf8");

    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // Concatenate audio tracks
      const audioCmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputAudioPath}"`;
      await execAsync(audioCmd);
      console.log(
        `[Delivery Worker] Audios concatenated to ${outputAudioPath}`
      );

      // Create a mock video rendering path
      const finalVideoPath = path.join(rendersDir, `render_${projectId}.mp4`);

      // In Phase 2, we generate a simple blank video matching the narration duration so it can be previewed
      const totalDuration = project.scenes.reduce(
        (sum, s) => sum + s.durationSec,
        0
      );
      const mockVideoCmd = `ffmpeg -y -f lavfi -i color=c=black:s=1280x720:d=${totalDuration} -i "${outputAudioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p "${finalVideoPath}"`;

      await execAsync(mockVideoCmd);
      console.log(
        `[Delivery Worker] Master preview video generated: ${finalVideoPath}`
      );

      // Persist Render output in DB
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
  },
  { connection: redisConnection }
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
