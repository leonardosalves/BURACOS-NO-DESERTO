import type {
  SceneManifest,
  RenderManifest,
} from "@video-suite/scene-contract";

// ── Supporting Types ────────────────────────────────────────────────────────

export interface EngineEstimate {
  /** Estimated render duration in seconds */
  estimatedRenderTimeSec: number;
  /** Whether the engine can handle this scene */
  feasible: boolean;
  /** Reason if not feasible */
  reason?: string;
}

export interface PreparedEngineInput {
  /** Engine-specific project directory or config path */
  projectDir: string;
  /** Engine-specific input payload (varies by adapter) */
  payload: Record<string, unknown>;
  /** Temporary files created during prepare that should be cleaned up */
  tempFiles: string[];
}

export interface EngineOutput {
  /** Path to the rendered output video file */
  outputPath: string;
  /** Duration of the rendered output in seconds */
  durationSec: number;
  /** Width of the output */
  width: number;
  /** Height of the output */
  height: number;
  /** FPS of the output */
  fps: number;
  /** Codec used */
  codec: string;
  /** Engine-specific metadata */
  metadata: Record<string, unknown>;
}

export interface JobContext {
  /** Unique job ID from BullMQ */
  jobId: string;
  /** Project ID */
  projectId: string;
  /** Scene ID */
  sceneId: string;
  /** Base storage directory */
  storageDir: string;
  /** Progress callback */
  onProgress?: (percent: number, message: string) => void;
  /** Log callback */
  onLog?: (message: string) => void;
}

export interface HealthcheckResult {
  /** Whether the engine is available and operational */
  healthy: boolean;
  /** Engine name */
  engine: string;
  /** Version string if available */
  version?: string;
  /** Details about any issues */
  details?: string;
}

// ── VideoEngineAdapter Interface ────────────────────────────────────────────

/**
 * Common interface for all video engine adapters.
 *
 * Each adapter wraps a vendor engine (HyperFrames, Remotion, gbro, vox, ffmpeg)
 * and transforms SceneManifest data into engine-specific input, executes the
 * render, and normalizes the output back into a RenderManifest.
 *
 * No adapter may depend on UI components.
 */
export interface VideoEngineAdapter {
  /** Human-readable engine name */
  readonly name: string;

  /** Returns true if this adapter can render the given scene */
  supports(scene: SceneManifest): boolean;

  /** Estimate render time and feasibility without executing */
  estimate(scene: SceneManifest): Promise<EngineEstimate>;

  /** Transform a SceneManifest into engine-specific input */
  prepare(scene: SceneManifest): Promise<PreparedEngineInput>;

  /** Execute the render with the prepared input */
  execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput>;

  /** Normalize engine output into a standard RenderManifest */
  normalize(output: EngineOutput): Promise<RenderManifest>;

  /** Cancel a running render job */
  cancel(jobId: string): Promise<void>;

  /** Check if the engine dependencies are available */
  healthcheck(): Promise<HealthcheckResult>;
}
