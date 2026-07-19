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
import { randomUUID } from "crypto";
import { getMediaDuration } from "@video-suite/integrations";

const execAsync = promisify(exec);

const VENDOR_DIR = path.resolve("vendor/hyperframes");

/**
 * HyperFrames adapter.
 *
 * Converts a SceneManifest into a minimal HyperFrames project
 * (HTML + GSAP composition) and renders it via the CLI.
 *
 * Responsible for: titles, cards, maps, overlays, lower-thirds, captions,
 * diagrams, chapter markers, and deterministic HTML/CSS/GSAP renders.
 */
export class HyperFramesAdapter implements VideoEngineAdapter {
  readonly name = "hyperframes";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "hyperframes";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: scene.durationSec * 3,
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    // Create a temporary project directory for this scene
    const projectDir = path.join("storage", "temp", `hf_${scene.sceneId}`);
    fs.mkdirSync(projectDir, { recursive: true });

    const [width, height] =
      scene.aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];

    // Generate the HTML composition file
    const htmlContent = buildCompositionHtml(scene, width, height);
    const htmlPath = path.join(projectDir, "index.html");
    fs.writeFileSync(htmlPath, htmlContent, "utf8");

    // Generate hyperframes.json project config
    const configContent = {
      composition: {
        width,
        height,
        fps: 24,
        duration: scene.durationSec,
      },
      output: {
        format: "mp4",
        codec: "h264",
      },
    };
    const configPath = path.join(projectDir, "hyperframes.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(configContent, null, 2),
      "utf8"
    );

    return {
      projectDir,
      payload: {
        htmlPath,
        configPath,
        width,
        height,
        durationSec: scene.durationSec,
        sceneId: scene.sceneId,
      },
      tempFiles: [htmlPath, configPath],
    };
  }

  async execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput> {
    const { projectDir, payload } = input;
    const { width, height, durationSec, sceneId } = payload as any;

    const outputPath = path.join(context.storageDir, `scene_${sceneId}.mp4`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    context.onLog?.(`[HyperFrames] Rendering scene ${sceneId}...`);

    try {
      // Try the HyperFrames CLI render
      const cliPath = path.join(
        VENDOR_DIR,
        "node_modules",
        ".bin",
        "hyperframes"
      );
      const cmd = `"${cliPath}" render "${projectDir}" --output "${outputPath}" --width ${width} --height ${height} --fps 24`;
      context.onLog?.(`[HyperFrames] Executing: ${cmd}`);
      await execAsync(cmd, { timeout: 120_000 });
    } catch (err: any) {
      context.onLog?.(
        `[HyperFrames] CLI render unavailable, falling back to FFmpeg still-image render: ${err.message}`
      );

      // Fallback: generate a simple title card video using FFmpeg
      const fallbackCmd = [
        "ffmpeg -y",
        `-f lavfi -i color=c=0x1a1a2e:s=${width}x${height}:d=${durationSec}`,
        `-vf "drawtext=text='${escapeFFmpegText(truncate(payload.sceneId as string, 30))}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2"`,
        `-c:v libx264 -pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(fallbackCmd, { timeout: 60_000 });
    }

    // Read actual output duration
    const actualDuration = await getMediaDuration(outputPath);

    return {
      outputPath,
      durationSec: actualDuration,
      width: width as number,
      height: height as number,
      fps: 24,
      codec: "h264",
      metadata: { engine: "hyperframes", sceneId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "", // filled by caller
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "hyperframes",
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
    // HyperFrames CLI renders are short-lived; cancellation is a no-op
  }

  async healthcheck(): Promise<HealthcheckResult> {
    try {
      const cliPath = path.join(
        VENDOR_DIR,
        "node_modules",
        ".bin",
        "hyperframes"
      );
      const { stdout } = await execAsync(`"${cliPath}" --version`, {
        timeout: 5000,
      });
      return {
        healthy: true,
        engine: "hyperframes",
        version: stdout.trim(),
      };
    } catch {
      return {
        healthy: false,
        engine: "hyperframes",
        details:
          "HyperFrames CLI not found or not installed in vendor/hyperframes",
      };
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildCompositionHtml(
  scene: SceneManifest,
  width: number,
  height: number
): string {
  const bgColor = paletteToColor(scene.paletteId);
  const titleText = scene.caption || scene.script.slice(0, 80);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${bgColor};
      font-family: 'Inter', 'Segoe UI', sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title-card {
      text-align: center;
      padding: 40px;
      max-width: 80%;
    }
    .title-card h1 {
      color: #fff;
      font-size: ${width > 1080 ? 64 : 48}px;
      font-weight: 800;
      line-height: 1.2;
      text-shadow: 0 4px 20px rgba(0,0,0,0.5);
      opacity: 0;
    }
    .lower-third {
      position: absolute;
      bottom: 60px;
      left: 40px;
      right: 40px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 24px;
      opacity: 0;
    }
    .lower-third p {
      color: #e0e0e0;
      font-size: 22px;
      line-height: 1.4;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
</head>
<body>
  <div class="title-card">
    <h1 id="title">${escapeHtml(titleText)}</h1>
  </div>
  <div class="lower-third" id="lowerThird">
    <p>${escapeHtml(scene.visualMetaphor || "")}</p>
  </div>

  <script>
    const duration = ${scene.durationSec};
    const tl = gsap.timeline({ paused: true });

    tl.to('#title', { opacity: 1, y: -20, duration: 0.8, ease: 'power2.out' }, 0.2);
    tl.to('#lowerThird', { opacity: 1, y: -10, duration: 0.6, ease: 'power2.out' }, 1.0);
    tl.to('#title', { opacity: 0, duration: 0.5 }, duration - 0.8);
    tl.to('#lowerThird', { opacity: 0, duration: 0.4 }, duration - 0.6);

    // HyperFrames seek protocol
    window.__hf = {
      duration,
      seek(time) { tl.seek(time); },
    };
  </script>
</body>
</html>`;
}

function paletteToColor(paletteId: string): string {
  const palettes: Record<string, string> = {
    sepia: "linear-gradient(135deg, #704214, #a0522d)",
    neon: "linear-gradient(135deg, #0d0221, #1a0533, #2d1b69)",
    earth: "linear-gradient(135deg, #2d5016, #1a3a0a)",
    ocean: "linear-gradient(135deg, #0a1628, #0d2137)",
    fire: "linear-gradient(135deg, #4a0e0e, #8b1a1a)",
    default: "linear-gradient(135deg, #1a1a2e, #16213e)",
  };
  return palettes[paletteId] || palettes.default;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}
