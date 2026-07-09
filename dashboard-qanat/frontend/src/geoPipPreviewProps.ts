import {
  bindGeoPipTemplateStudioProps,
  pickUserLockedStudioValues,
  resolveGeoPipTimelineDurationSec,
  resolveGeoPipPreviewScrubSec,
  resolveStudioUserLockedSlots,
} from "@lumiera/shared/geoPipTemplateProps.js";
import { resolveGeoPipSceneNarration } from "@lumiera/shared/geoPipSceneText.js";
import { resolveMediaUrl } from "./timelineStudioMedia";
import type { StudioClip } from "./timelineStudioTypes";

export { resolveGeoPipPreviewScrubSec };

export function mergeGeoPipPreviewProps(
  clip: StudioClip,
  playhead: number,
  _wordTranscripts?: unknown,
  getAssetUrl?: (fileName: string) => string
): Record<string, unknown> {
  const base = (clip.props || {}) as Record<string, unknown>;
  const sceneNarration = resolveGeoPipSceneNarration(base);

  const dataSlots = Array.isArray(base.template_studio_data_slots)
    ? (base.template_studio_data_slots as string[])
    : [];

  const clipDurationSec = resolveGeoPipTimelineDurationSec(clip);
  const flyoverRaw = String(
    base.flyover_video || base.pipMediaUrl || ""
  ).trim();
  const locked = resolveStudioUserLockedSlots(base);
  const userLocked = pickUserLockedStudioValues(base, locked);

  const bound = bindGeoPipTemplateStudioProps(base, {
    narration: sceneNarration,
    dataSlots,
    flyoverUrl: flyoverRaw,
    flyoverDurationSec: clipDurationSec,
  });

  const pipMediaUrl = bound.pipMediaUrl
    ? getAssetUrl
      ? resolveMediaUrl(bound.pipMediaUrl, getAssetUrl)
      : bound.pipMediaUrl
    : "";

  const overlayChrome = locked.has("geoPipOverlayChrome")
    ? userLocked.geoPipOverlayChrome
    : true;
  const backgroundColor = locked.has("backgroundColor")
    ? userLocked.backgroundColor
    : "transparent";

  return {
    ...base,
    ...bound.studio_props,
    ...userLocked,
    studio_props: {
      ...(base.studio_props as Record<string, unknown>),
      ...bound.studio_props,
      ...userLocked,
      pipMediaUrl,
      mainMediaUrl: locked.has("mainMediaUrl") ? userLocked.mainMediaUrl : "",
    },
    pipTitle: locked.has("pipTitle") ? userLocked.pipTitle : bound.pipTitle,
    pipMediaUrl,
    location: locked.has("location") ? userLocked.location : bound.location,
    mainMediaUrl: locked.has("mainMediaUrl") ? userLocked.mainMediaUrl : "",
    narration_text: sceneNarration || base.narration_text,
    durationSeconds: clipDurationSec,
    durationInFrames: Math.max(1, Math.round(clipDurationSec * 30)),
    geoPipOverlayChrome: overlayChrome,
    backgroundColor,
  };
}
