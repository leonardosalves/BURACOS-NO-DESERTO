import { z } from "zod";

export const SceneAssetSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["video", "image", "audio"]),
  role: z.enum(["background", "voiceover", "music", "overlay"]),
  storageKey: z.string(),
  mimeType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSec: z.number().optional(),
});

export const SceneManifestSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  aspectRatio: z.enum(["9:16", "16:9"]),
  durationSec: z.number().positive(),
  engineHint: z.enum([
    "vox-director",
    "vox-explainer",
    "gbro-collage-broll",
    "hyperframes",
    "remotion",
    "ffmpeg",
  ]),
  script: z.string(),
  caption: z.string(),
  paletteId: z.string(),
  motionProfile: z.string(),
  assets: z.array(SceneAssetSchema),
  voiceover: z
    .object({
      storageKey: z.string(),
      durationSec: z.number(),
      language: z.string(),
      voiceId: z.string(),
    })
    .optional(),
  music: z
    .object({
      storageKey: z.string(),
      volume: z.number().min(0).max(1),
    })
    .optional(),
  renderSettings: z.record(z.any()).optional(),
  qaChecks: z.array(z.string()).optional(),
  status: z.enum([
    "pending",
    "metaphor_approved",
    "style_approved",
    "rendered",
  ]),
  version: z.number().int().positive(),
});

export const ProjectManifestSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  format: z.enum(["SHORTS", "LONG"]),
  aspectRatio: z.enum(["9:16", "16:9"]),
  language: z.string(),
  fps: z.number().int().positive().default(24),
  targetDurationSec: z.number().int().positive(),
  nicheId: z.string(),
  status: z.enum(["draft", "planning", "generating", "completed", "failed"]),
  version: z.number().int().positive(),
  scenes: z.array(SceneManifestSchema),
});

export const RenderManifestSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid().optional(),
  engine: z.enum([
    "remotion",
    "hyperframes",
    "gbro-collage-broll",
    "vox-director",
    "vox-explainer",
  ]),
  variant: z.enum(["master", "9_16_fallback"]),
  status: z.enum(["rendering", "completed", "failed"]),
  storageKey: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  durationSec: z.number().positive(),
  codec: z.enum(["h264", "vp9"]),
  manifestJson: z.any(),
});

export type SceneAsset = z.infer<typeof SceneAssetSchema>;
export type SceneManifest = z.infer<typeof SceneManifestSchema>;
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
export type RenderManifest = z.infer<typeof RenderManifestSchema>;
