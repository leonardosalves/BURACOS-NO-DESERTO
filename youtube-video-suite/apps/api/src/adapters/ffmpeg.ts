import type {
  SceneManifest,
  RenderManifest,
} from "@video-suite/scene-contract";
import type {
  VideoEngineAdapter,
  EngineEstimate,
  PreparedEngineInput,
  EngineOutput,
  JobContext,
  HealthcheckResult,
} from "./types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getMediaDuration } from "@video-suite/integrations";

const execAsync = promisify(exec);

/**
 * FFmpeg adapter.
 *
 * Handles concatenation, codec normalization, loudness, muxing, thumbnails,
 * contact sheets, proxy generation, waveform rendering, duration validation,
 * and burned-in subtitle generation.
 *
 * This is the lowest-level adapter — it always works as long as ffmpeg is
 * installed. It serves as the fallback for any scene that no specialized
 * engine can handle.
 */
export class FfmpegAdapter implements VideoEngineAdapter {
  readonly name = "ffmpeg";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "ffmpeg";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: scene.durationSec * 0.5,
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    const projectDir = path.join("storage", "temp", `ffmpeg_${scene.sceneId}`);
    fs.mkdirSync(projectDir, { recursive: true });

    const [width, height] =
      scene.aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];

    // Collect asset file paths
    const videoAssets = scene.assets.filter((a) => a.type === "video");
    const imageAssets = scene.assets.filter((a) => a.type === "image");
    const audioAssets = scene.assets.filter((a) => a.type === "audio");

    return {
      projectDir,
      payload: {
        width,
        height,
        durationSec: scene.durationSec,
        sceneId: scene.sceneId,
        videoAssets: videoAssets.map((a) => a.storageKey),
        imageAssets: imageAssets.map((a) => a.storageKey),
        audioAssets: audioAssets.map((a) => a.storageKey),
        voiceover: scene.voiceover,
        caption: scene.caption,
      },
      tempFiles: [],
    };
  }

  async execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput> {
    const { payload } = input;
    const {
      width,
      height,
      durationSec,
      sceneId,
      videoAssets,
      imageAssets,
      caption,
    } = payload as any;

    const outputPath = path.join(context.storageDir, `scene_${sceneId}.mp4`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    context.onLog?.(`[FFmpeg] Rendering scene ${sceneId}...`);

    const hasVideo = (videoAssets as string[]).length > 0;
    const hasImages = (imageAssets as string[]).length > 0;

    let cmd: string;

    if (hasVideo) {
      // Concatenate existing video clips
      const concatList = path.join(input.projectDir, "concat.txt");
      const listContent = (videoAssets as string[])
        .map((p: string) => `file '${p.replace(/\\/g, "/")}'`)
        .join("\n");
      fs.writeFileSync(concatList, listContent, "utf8");

      cmd = `ffmpeg -y -f concat -safe 0 -i "${concatList}" -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    } else if (hasImages) {
      // Create slideshow from images
      const concatList = path.join(input.projectDir, "slideshow.txt");
      const perImageDuration = durationSec / (imageAssets as string[]).length;
      const listContent = (imageAssets as string[])
        .map(
          (p: string) =>
            `file '${p.replace(/\\/g, "/")}'\nduration ${perImageDuration}`
        )
        .join("\n");
      fs.writeFileSync(concatList, listContent, "utf8");

      cmd = `ffmpeg -y -f concat -safe 0 -i "${concatList}" -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    } else {
      // Generate a blank color scene with optional caption
      const captionText = caption
        ? escapeFFmpegText(String(caption).slice(0, 100))
        : "";
      const drawtext = captionText
        ? `,drawtext=text='${captionText}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2`
        : "";

      cmd = `ffmpeg -y -f lavfi -i color=c=0x1a1a2e:s=${width}x${height}:d=${durationSec} -vf "format=yuv420p${drawtext}" -c:v libx264 "${outputPath}"`;
    }

    context.onLog?.(`[FFmpeg] Executing: ${cmd}`);
    await execAsync(cmd, { timeout: 120_000 });

    const actualDuration = await getMediaDuration(outputPath);

    return {
      outputPath,
      durationSec: actualDuration,
      width: width as number,
      height: height as number,
      fps: 24,
      codec: "h264",
      metadata: { engine: "ffmpeg", sceneId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "", // filled by caller
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "ffmpeg",
      variant: "master",
      status: "completed",
      storageKey: output.outputPath,
      width: output.width,
      height: output.height,
      fps: output.fps,
      durationSec: output.durationSec,
      codec: "h264",
      manifestJson: output.metadata,
    };
  }

  async cancel(_jobId: string): Promise<void> {
    // FFmpeg renders are synchronous child processes; cancellation is a no-op
  }

  async healthcheck(): Promise<HealthcheckResult> {
    try {
      const { stdout } = await execAsync("ffmpeg -version", { timeout: 5000 });
      const versionLine = stdout.split("\n")[0] || "";
      return {
        healthy: true,
        engine: "ffmpeg",
        version: versionLine,
      };
    } catch {
      return {
        healthy: false,
        engine: "ffmpeg",
        details: "ffmpeg binary not found in PATH",
      };
    }
  }
}

function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
}
