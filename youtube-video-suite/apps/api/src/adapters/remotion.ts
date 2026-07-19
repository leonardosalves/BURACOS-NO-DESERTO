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

const VENDOR_DIR = path.resolve("vendor/remotion");

/**
 * Remotion adapter.
 *
 * Handles master timeline composition, multi-format variants (9:16 / 16:9),
 * intro/outro sequencing, React template rendering, and server-side export.
 *
 * Uses Remotion CLI for rendering. Generates a React composition dynamically
 * from the SceneManifest, then invokes `npx remotion render`.
 *
 * Before production commercial use, a Remotion license is required.
 */
export class RemotionAdapter implements VideoEngineAdapter {
  readonly name = "remotion";

  supports(scene: SceneManifest): boolean {
    return scene.engineHint === "remotion";
  }

  async estimate(scene: SceneManifest): Promise<EngineEstimate> {
    return {
      estimatedRenderTimeSec: scene.durationSec * 5,
      feasible: true,
    };
  }

  async prepare(scene: SceneManifest): Promise<PreparedEngineInput> {
    const projectDir = path.join(
      "storage",
      "temp",
      `remotion_${scene.sceneId}`
    );
    fs.mkdirSync(projectDir, { recursive: true });

    const [width, height] =
      scene.aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];
    const fps = 24;
    const durationInFrames = Math.ceil(scene.durationSec * fps);

    // Generate the Remotion composition as a TSX file
    const compositionTsx = buildRemotionComposition(
      scene,
      width,
      height,
      fps,
      durationInFrames
    );
    const compositionPath = path.join(projectDir, "Composition.tsx");
    fs.writeFileSync(compositionPath, compositionTsx, "utf8");

    // Generate the entry point that registers the composition
    const entryTsx = buildRemotionEntry(
      scene,
      width,
      height,
      fps,
      durationInFrames
    );
    const entryPath = path.join(projectDir, "index.tsx");
    fs.writeFileSync(entryPath, entryTsx, "utf8");

    // Generate a minimal package.json for the temp project
    const pkgJson = {
      name: `remotion-scene-${scene.sceneId}`,
      version: "1.0.0",
      private: true,
      dependencies: {
        remotion: "^4.0.0",
        "@remotion/cli": "^4.0.0",
        react: "^18.0.0",
        "react-dom": "^18.0.0",
      },
    };
    const pkgPath = path.join(projectDir, "package.json");
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2), "utf8");

    return {
      projectDir,
      payload: {
        compositionPath,
        entryPath,
        width,
        height,
        fps,
        durationInFrames,
        durationSec: scene.durationSec,
        sceneId: scene.sceneId,
        compositionId: `scene-${scene.sceneId.slice(0, 8)}`,
      },
      tempFiles: [compositionPath, entryPath, pkgPath],
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
      fps,
      durationSec,
      sceneId,
      compositionId,
      entryPath,
    } = payload as any;

    const outputPath = path.join(context.storageDir, `scene_${sceneId}.mp4`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    context.onLog?.(
      `[Remotion] Rendering scene ${sceneId} (${compositionId})...`
    );

    try {
      // Try Remotion CLI render
      const cmd = [
        `npx remotion render`,
        `--entry "${entryPath}"`,
        `"${compositionId}"`,
        `"${outputPath}"`,
        `--codec h264`,
        `--overwrite`,
      ].join(" ");

      context.onLog?.(`[Remotion] Executing: ${cmd}`);
      await execAsync(cmd, { timeout: 300_000, cwd: input.projectDir });
    } catch (err: any) {
      context.onLog?.(
        `[Remotion] CLI render unavailable, falling back to FFmpeg: ${err.message}`
      );

      // Fallback: generate a styled scene using FFmpeg
      const bgColor = "0x16213e";
      const fallbackCmd = [
        "ffmpeg -y",
        `-f lavfi -i color=c=${bgColor}:s=${width}x${height}:d=${durationSec}`,
        `-vf "drawtext=text='Scene ${escapeFFmpegText(String(sceneId).slice(0, 8))}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2"`,
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
      fps: fps as number,
      codec: "h264",
      metadata: { engine: "remotion", sceneId, compositionId },
    };
  }

  async normalize(output: EngineOutput): Promise<RenderManifest> {
    return {
      projectId: "", // filled by caller
      sceneId: (output.metadata.sceneId as string) || undefined,
      engine: "remotion",
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
    // Remotion renders can be long; cancellation would require tracking the child process
  }

  async healthcheck(): Promise<HealthcheckResult> {
    try {
      const { stdout } = await execAsync("npx remotion --version", {
        timeout: 10_000,
      });
      return {
        healthy: true,
        engine: "remotion",
        version: stdout.trim(),
      };
    } catch {
      return {
        healthy: false,
        engine: "remotion",
        details:
          "Remotion CLI not available. Install with: npm install @remotion/cli remotion",
      };
    }
  }
}

// ── Template Builders ───────────────────────────────────────────────────────

function buildRemotionComposition(
  scene: SceneManifest,
  width: number,
  height: number,
  fps: number,
  durationInFrames: number
): string {
  const bgGradient = paletteToGradient(scene.paletteId);
  const titleText = escapeJsx(scene.caption || scene.script.slice(0, 80));
  const subtitleText = escapeJsx(scene.visualMetaphor || "");

  return `import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const SceneComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title fade-in (first 30 frames)
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 30], [40, 0], { extrapolateRight: 'clamp' });

  // Subtitle fade-in (frames 20-50)
  const subtitleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' });

  // Fade-out (last 20 frames)
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      background: '${bgGradient}',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      opacity: fadeOut,
    }}>
      <h1 style={{
        color: 'white',
        fontSize: ${width > 1080 ? 64 : 48},
        fontWeight: 800,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 1.2,
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        opacity: titleOpacity,
        transform: \`translateY(\${titleY}px)\`,
      }}>
        ${titleText}
      </h1>

      <div style={{
        position: 'absolute',
        bottom: 80,
        left: 40,
        right: 40,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '16px 24px',
        opacity: subtitleOpacity,
      }}>
        <p style={{
          color: '#e0e0e0',
          fontSize: 22,
          lineHeight: 1.5,
          margin: 0,
        }}>
          ${subtitleText}
        </p>
      </div>
    </AbsoluteFill>
  );
};
`;
}

function buildRemotionEntry(
  scene: SceneManifest,
  width: number,
  height: number,
  fps: number,
  durationInFrames: number
): string {
  const compositionId = `scene-${scene.sceneId.slice(0, 8)}`;
  return `import { registerRoot, Composition } from 'remotion';
import { SceneComposition } from './Composition';

const Root: React.FC = () => {
  return (
    <Composition
      id="${compositionId}"
      component={SceneComposition}
      durationInFrames={${durationInFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};

registerRoot(Root);
`;
}

function paletteToGradient(paletteId: string): string {
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

function escapeJsx(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, " ");
}

function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
}
