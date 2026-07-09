import {
  bindGeoPipTemplateStudioProps,
  resolveGeoPipTimelineDurationSec,
  resolveGeoPipPreviewScrubSec,
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

  return {
    ...base,
    ...bound.studio_props,
    studio_props: {
      ...(base.studio_props as Record<string, unknown>),
      ...bound.studio_props,
      pipMediaUrl,
      mainMediaUrl: "",
    },
    pipTitle: bound.pipTitle,
    pipMediaUrl,
    location: bound.location,
    mainMediaUrl: "",
    narration_text: sceneNarration || base.narration_text,
    durationSeconds: clipDurationSec,
    durationInFrames: Math.max(1, Math.round(clipDurationSec * 30)),
    geoPipOverlayChrome: true,
    backgroundColor: "transparent",
  };
}
