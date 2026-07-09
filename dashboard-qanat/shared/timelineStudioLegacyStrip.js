import { hasRunnableStudioSource } from "./remotionTemplateStudioCatalog.js";

/** IDs do modo antigo (InfoBar / OverlayPreview) — nao sao Template Studio. */
export const LEGACY_OVERLAY_TEMPLATE_IDS = new Set([
  "pictogram-chart",
  "location-intro",
  "bar-chart",
  "counter",
  "lower-third",
  "timeline",
  "geo-map",
  "kinetic-text",
]);

export function clipStudioSourceCode(clip = {}) {
  return String(clip.props?.studio_source_code || "").trim();
}

export function isStudioTemplateClip(clip = {}) {
  const code = clipStudioSourceCode(clip);
  if (!code) return false;
  return hasRunnableStudioSource({ short: code, long: code });
}

export function isLegacyStudioOverlayClip(clip = {}) {
  if (isStudioTemplateClip(clip)) return false;
  if (clip.trackId === "overlays" || clip.legacyOverlay) return true;
  const tpl = String(clip.templateId || clip.props?.overlayType || "").trim();
  if (
    clip.trackId === "motion" ||
    clip.motionScene ||
    clip.motionScenePrimary
  ) {
    if (LEGACY_OVERLAY_TEMPLATE_IDS.has(tpl)) return true;
    if (clip.props?.motion_scene && !clipStudioSourceCode(clip)) return true;
  }
  return false;
}

export function stripLegacyStudioOverlayClips(clips = []) {
  const input = Array.isArray(clips) ? clips : [];
  const kept = input.filter((clip) => !isLegacyStudioOverlayClip(clip));
  return {
    clips: kept,
    removed: input.length - kept.length,
  };
}
