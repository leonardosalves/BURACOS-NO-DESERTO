// ── Video Engine Adapters ───────────────────────────────────────────────────
// Re-exports for convenience

export type {
  VideoEngineAdapter,
  EngineEstimate,
  PreparedEngineInput,
  EngineOutput,
  JobContext,
  HealthcheckResult,
} from "./types.js";

export { HyperFramesAdapter } from "./hyperframes.js";
export { RemotionAdapter } from "./remotion.js";
export { VoxDirectorAdapter, VoxExplainerAdapter } from "./vox.js";
export { GbroCollageAdapter } from "./gbro.js";
export { FfmpegAdapter } from "./ffmpeg.js";

export {
  routeScene,
  renderScene,
  listAdapters,
  healthcheckAll,
} from "./router.js";
