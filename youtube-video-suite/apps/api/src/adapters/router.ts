import type {
  SceneManifest,
  RenderManifest,
} from "@video-suite/scene-contract";
import type { VideoEngineAdapter, JobContext } from "./types.js";
import { HyperFramesAdapter } from "./hyperframes.js";
import { RemotionAdapter } from "./remotion.js";
import { FfmpegAdapter } from "./ffmpeg.js";

// ── Adapter Registry ────────────────────────────────────────────────────────

const adapters: VideoEngineAdapter[] = [
  new HyperFramesAdapter(),
  new RemotionAdapter(),
  new FfmpegAdapter(),
  // Future adapters:
  // new VoxDirectorAdapter(),
  // new VoxExplainerAdapter(),
  // new GbroCollageAdapter(),
];

/**
 * Find the first adapter that supports a given scene.
 * Falls back to FfmpegAdapter if no specialized adapter matches.
 */
export function routeScene(scene: SceneManifest): VideoEngineAdapter {
  const matched = adapters.find((adapter) => adapter.supports(scene));
  if (matched) return matched;

  // FFmpeg is always the fallback
  const ffmpeg = adapters.find((a) => a.name === "ffmpeg");
  if (ffmpeg) return ffmpeg;

  throw new Error(`No adapter found for engineHint: ${scene.engineHint}`);
}

/**
 * Render a single scene through the full adapter lifecycle:
 * prepare → execute → normalize.
 */
export async function renderScene(
  scene: SceneManifest,
  context: JobContext
): Promise<RenderManifest> {
  const adapter = routeScene(scene);
  context.onLog?.(
    `[Router] Scene ${scene.sceneId} routed to adapter: ${adapter.name}`
  );

  // 1. Prepare engine-specific input
  const input = await adapter.prepare(scene);
  context.onLog?.(`[Router] Prepared input in ${input.projectDir}`);

  // 2. Execute the render
  const output = await adapter.execute(input, context);
  context.onLog?.(
    `[Router] Render completed: ${output.outputPath} (${output.durationSec}s)`
  );

  // 3. Normalize output into RenderManifest
  const manifest = await adapter.normalize(output);
  manifest.projectId = context.projectId;
  manifest.sceneId = context.sceneId;

  return manifest;
}

/**
 * Get a list of all registered adapters.
 */
export function listAdapters(): VideoEngineAdapter[] {
  return [...adapters];
}

/**
 * Run healthchecks on all registered adapters.
 */
export async function healthcheckAll(): Promise<
  Record<string, { healthy: boolean; details?: string }>
> {
  const results: Record<string, { healthy: boolean; details?: string }> = {};
  for (const adapter of adapters) {
    const result = await adapter.healthcheck();
    results[adapter.name] = {
      healthy: result.healthy,
      details: result.details || result.version,
    };
  }
  return results;
}
