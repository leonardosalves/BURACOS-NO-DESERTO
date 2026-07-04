export type SceneAssetPreview = {
  asset?: string;
  type?: string;
  user_locked?: boolean;
  manual_asset?: boolean;
  volume?: number;
  playback_rate?: number;
};

export function inferAssetMediaType(asset: SceneAssetPreview | null | undefined): "image" | "video" | "none" {
  const path = String(asset?.asset || "").trim();
  if (!path) return "none";
  if (asset?.type === "video" || /\.(mp4|mov|webm|m4v|mkv)$/i.test(path)) return "video";
  return "image";
}

/**
 * Timeline manual/upload tem prioridade sobre binding antigo do storyboard (ex.: logo PNG).
 */
export function resolveScenePreviewAsset(
  storyboardAsset?: SceneAssetPreview | null,
  timelineAsset?: SceneAssetPreview | null,
): SceneAssetPreview | null {
  const story = storyboardAsset?.asset ? storyboardAsset : null;
  const timeline = timelineAsset?.asset ? timelineAsset : null;
  if (!story && !timeline) return null;

  if (timeline && (timeline.manual_asset || timeline.user_locked)) {
    return { ...timeline, type: inferAssetMediaType(timeline) === "video" ? "video" : timeline.type || "image" };
  }

  const preferred = story || timeline;
  const merged = { ...(timeline || {}), ...(story || {}) };
  const mediaType = inferAssetMediaType(merged);
  return {
    ...merged,
    type: mediaType === "video" ? "video" : mediaType === "image" ? "image" : merged.type,
  };
}

export function detectUploadMediaType(file: File, sceneIsVideo: boolean): "video" | "image" {
  const name = file.name.toLowerCase();
  if (/\.(mp4|mov|webm|m4v|mkv)$/i.test(name) || file.type.startsWith("video/")) return "video";
  if (sceneIsVideo && file.type.startsWith("video/")) return "video";
  return "image";
}

export const SCENE_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v";

/** Mescla assets da timeline no storyboard após reload (upload manual tem prioridade). */
export function mergeStoryboardWithTimelineAssets<T extends { visual_prompts?: any[] }>(
  storyboard: T | null | undefined,
  timelineAssets?: Record<string, SceneAssetPreview[] | undefined> | null,
): T | null | undefined {
  if (!storyboard?.visual_prompts?.length || !timelineAssets) return storyboard;

  const blockCounters: Record<string, number> = {};
  const visual_prompts = storyboard.visual_prompts.map((vp) => {
    const blockKey = String(vp?.block ?? 1);
    if (blockCounters[blockKey] === undefined) blockCounters[blockKey] = 0;
    const idx = blockCounters[blockKey]++;
    const tl = timelineAssets[blockKey]?.[idx];
    const resolved = resolveScenePreviewAsset(vp?.asset, tl);
    if (!resolved?.asset) return vp;
    return { ...vp, asset: resolved };
  });

  return { ...storyboard, visual_prompts };
}