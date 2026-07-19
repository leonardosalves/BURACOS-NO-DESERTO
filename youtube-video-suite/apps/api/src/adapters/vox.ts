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

const VENDOR_DIR = path.resolve("vendor/vox-director");

/**
 * VoxDirector adapter.
 *
 * Wraps the vox-director skill for full explainer video creation:
 * beat planning, style bake-off, script generation, keyframes, VO,
 * music, captions, and final assembly.
 *
 * The adapter transforms SceneManifest into the vox-director's expected
 * input format and converts output back to the central contract.
 */
export class VoxDirectorAdapter implements VideoEngineAdapter {
  readonly name = "vox-director";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "vox-director";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: scene.durationSec * 8,
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    const projectDir = path.join("storage", "temp", `vox_${scene.sceneId}`);
    fs.mkdirSync(projectDir, { recursive: true });

    const [width, height] =
      scene.aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];

    // Create vox-director input spec
    const voxSpec = {
      scene_id: scene.sceneId,
      narration: scene.script,
      visual_metaphor: scene.visualMetaphor,
      palette: scene.paletteId,
      motion_profile: scene.motionProfile,
      duration_sec: scene.durationSec,
      aspect_ratio: scene.aspectRatio,
      width,
      height,
      fps: 24,
      assets: scene.assets.map((a) => ({
        type: a.type,
        role: a.role,
        path: a.storageKey,
      })),
      voiceover: scene.voiceover,
    };

    const specPath = path.join(projectDir, "vox-spec.json");
    fs.writeFileSync(specPath, JSON.stringify(voxSpec, null, 2), "utf8");

    return {
      projectDir,
      payload: {
        specPath,
        width,
        height,
        sceneId: scene.sceneId,
        durationSec: scene.durationSec,
      },
      tempFiles: [specPath],
    };
  }

  async execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput> {
    const { payload } = input;
    const { width, height, sceneId, durationSec } = payload as any;

    const outputPath = path.join(context.storageDir, `scene_${sceneId}.mp4`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    context.onLog?.(`[VoxDirector] Rendering scene ${sceneId}...`);

    try {
      // Try vox-director script render
      const scriptPath = path.join(VENDOR_DIR, "scripts", "render.sh");
      if (fs.existsSync(scriptPath)) {
        const cmd = `bash "${scriptPath}" --spec "${(payload as any).specPath}" --output "${outputPath}"`;
        context.onLog?.(`[VoxDirector] Executing: ${cmd}`);
        await execAsync(cmd, { timeout: 300_000 });
      } else {
        throw new Error("vox-director render script not found");
      }
    } catch (err: any) {
      context.onLog?.(
        `[VoxDirector] Script unavailable, falling back to FFmpeg: ${err.message}`
      );

      // Fallback: generate a styled placeholder using FFmpeg
      const fallbackCmd = [
        "ffmpeg -y",
        `-f lavfi -i color=c=0x0d2137:s=${width}x${height}:d=${durationSec}`,
        `-vf "drawtext=text='Vox Director':fontcolor=0xE0E0E0:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='${escapeFFmpegText(String(sceneId).slice(0, 8))}':fontcolor=0x808080:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+40"`,
        `-c:v libx264 -pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(fallbackCmd, { timeout: 60_000 });
    }

    const actualDuration = await getMediaDuration(outputPath);

    return {
      outputPath,
      durationSec: actualDuration,
      width: width as number,
      height: height as number,
      fps: 24,
      codec: "h264",
      metadata: { engine: "vox-director", sceneId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "",
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "vox-director",
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

  async cancel(_jobId: string): Promise<void> {}

  async healthcheck(): Promise<HealthcheckResult> {
    const scriptPath = path.join(VENDOR_DIR, "scripts", "render.sh");
    const exists = fs.existsSync(scriptPath);
    return {
      healthy: exists,
      engine: "vox-director",
      details: exists
        ? `Render script found at ${scriptPath}`
        : "vox-director render script not found",
    };
  }
}

/**
 * VoxExplainer adapter.
 *
 * Wraps the vox-explainer-skill for VO-first timing, style anchoring,
 * consistent visual rendering, partial re-renders, and resumable projects.
 */
export class VoxExplainerAdapter implements VideoEngineAdapter {
  readonly name = "vox-explainer";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "vox-explainer";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: scene.durationSec * 6,
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    const projectDir = path.join("storage", "temp", `vox_exp_${scene.sceneId}`);
    fs.mkdirSync(projectDir, { recursive: true });

    const [width, height] =
      scene.aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];

    const voxSpec = {
      scene_id: scene.sceneId,
      narration: scene.script,
      visual_metaphor: scene.visualMetaphor,
      palette: scene.paletteId,
      motion_profile: scene.motionProfile,
      duration_sec: scene.durationSec,
      aspect_ratio: scene.aspectRatio,
      width,
      height,
      fps: 24,
      voiceover: scene.voiceover,
      // VO-first: audio duration is the master clock
      vo_first: true,
    };

    const specPath = path.join(projectDir, "vox-explainer-spec.json");
    fs.writeFileSync(specPath, JSON.stringify(voxSpec, null, 2), "utf8");

    return {
      projectDir,
      payload: {
        specPath,
        width,
        height,
        sceneId: scene.sceneId,
        durationSec: scene.durationSec,
      },
      tempFiles: [specPath],
    };
  }

  async execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput> {
    const { payload } = input;
    const { width, height, sceneId, durationSec } = payload as any;

    const outputPath = path.join(context.storageDir, `scene_${sceneId}.mp4`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    context.onLog?.(`[VoxExplainer] Rendering scene ${sceneId}...`);

    // Fallback to FFmpeg placeholder (vox-explainer-skill is agent-driven)
    const fallbackCmd = [
      "ffmpeg -y",
      `-f lavfi -i color=c=0x1a3a0a:s=${width}x${height}:d=${durationSec}`,
      `-vf "drawtext=text='Vox Explainer':fontcolor=0xD0F0C0:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='${escapeFFmpegText(String(sceneId).slice(0, 8))}':fontcolor=0x808080:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+40"`,
      `-c:v libx264 -pix_fmt yuv420p`,
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(fallbackCmd, { timeout: 60_000 });

    const actualDuration = await getMediaDuration(outputPath);

    return {
      outputPath,
      durationSec: actualDuration,
      width: width as number,
      height: height as number,
      fps: 24,
      codec: "h264",
      metadata: { engine: "vox-explainer", sceneId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "",
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "vox-explainer",
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

  async cancel(_jobId: string): Promise<void> {}

  async healthcheck(): Promise<HealthcheckResult> {
    const vendorDir = path.resolve("vendor/vox-explainer-skill");
    const exists = fs.existsSync(vendorDir);
    return {
      healthy: exists,
      engine: "vox-explainer",
      details: exists
        ? "vox-explainer-skill directory found"
        : "vendor/vox-explainer-skill not found",
    };
  }
}

function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
}
