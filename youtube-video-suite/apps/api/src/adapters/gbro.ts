import type {
  SceneManifest,
  RenderManifest,
} from "@video-suite/scene-contract";
import {
  VideoEngineAdapter,
  EngineEstimate,
  PreparedEngineInput,
  EngineOutput,
  JobContext,
  HealthcheckResult,
  getDrawtextFontOpt,
} from "./types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getMediaDuration } from "@video-suite/integrations";

const execAsync = promisify(exec);

const VENDOR_DIR = path.resolve("vendor/gbro-collage-broll");

/**
 * GbroCollage adapter.
 *
 * Motor de inserts editoriais de curta duração (~5s).
 *
 * Gate flow:
 * 1. Metaphor gate → approve visual metaphor
 * 2. Static frame gate → approve composition
 * 3. Motion gate → approve animation
 * 4. Final render
 *
 * Default style: 9:16, 24fps, flat color field, cutout with outline,
 * paper texture, halftone, short shadow, no generic fade.
 */
export class GbroCollageAdapter implements VideoEngineAdapter {
  readonly name = "gbro-collage-broll";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "gbro-collage-broll";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: Math.max(scene.durationSec * 4, 10),
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    const projectDir = path.join("storage", "temp", `gbro_${scene.sceneId}`);
    fs.mkdirSync(projectDir, { recursive: true });

    // gbro default is 9:16 / 24fps / ~5s / no audio
    const width = 1080;
    const height = 1920;
    const fps = 24;
    const durationSec = Math.min(scene.durationSec, 8); // gbro is for short inserts

    const gbroSpec = {
      scene_id: scene.sceneId,
      visual_metaphor: scene.visualMetaphor,
      palette: scene.paletteId,
      motion_profile: scene.motionProfile,
      duration_sec: durationSec,
      width,
      height,
      fps,
      style: {
        assembly: "assemble-from-empty",
        color_field: "flat",
        cutout: "outline",
        texture: "paper",
        halftone: true,
        shadow: "short",
        fade: "none",
      },
      assets: scene.assets
        .filter((a) => a.type === "image")
        .map((a) => ({
          type: a.type,
          role: a.role,
          path: a.storageKey,
        })),
    };

    const specPath = path.join(projectDir, "gbro-spec.json");
    fs.writeFileSync(specPath, JSON.stringify(gbroSpec, null, 2), "utf8");

    return {
      projectDir,
      payload: {
        specPath,
        width,
        height,
        fps,
        sceneId: scene.sceneId,
        durationSec,
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

    context.onLog?.(
      `[GbroCollage] Rendering editorial insert ${sceneId} (${durationSec}s)...`
    );

    try {
      // Try gbro render script
      const scriptPath = path.join(VENDOR_DIR, "scripts", "render.sh");
      if (fs.existsSync(scriptPath)) {
        const cmd = `bash "${scriptPath}" --spec "${(payload as any).specPath}" --output "${outputPath}"`;
        context.onLog?.(`[GbroCollage] Executing: ${cmd}`);
        await execAsync(cmd, { timeout: 120_000 });
      } else {
        throw new Error("gbro render script not found");
      }
    } catch (err: any) {
      context.onLog?.(
        `[GbroCollage] Script unavailable, generating collage fallback: ${err.message}`
      );

      // Fallback: paper-texture-style color card via FFmpeg
      // Uses warm beige + halftone-style noise for the collage aesthetic
      const fontOpt = getDrawtextFontOpt();
      const fallbackCmd = [
        "ffmpeg -y",
        `-f lavfi -i "color=c=0xF5E6D3:s=${width}x${height}:d=${durationSec},noise=c0s=15:allf=t+u"`,
        `-vf "drawtext=${fontOpt}text='B-Roll Insert':fontcolor=0x2C1810:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-30:shadowcolor=0xD4B896:shadowx=2:shadowy=2,drawtext=${fontOpt}text='${escapeFFmpegText(String(sceneId).slice(0, 8))}':fontcolor=0x8B7355:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+30"`,
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
      metadata: { engine: "gbro-collage-broll", sceneId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "",
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "gbro-collage-broll",
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
    const exists = fs.existsSync(VENDOR_DIR);
    return {
      healthy: exists,
      engine: "gbro-collage-broll",
      details: exists
        ? "gbro-collage-broll vendor directory found"
        : "vendor/gbro-collage-broll not found",
    };
  }
}

function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
}
