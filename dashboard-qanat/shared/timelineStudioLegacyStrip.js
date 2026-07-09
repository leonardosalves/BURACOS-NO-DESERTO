import { hasRunnableStudioSource } from "./remotionTemplateStudioCatalog.js";

/** IDs do modo antigo (InfoBar / OverlayPreview) — nao sao Template Studio. */
export const LEGACY_OVERLAY_TEMPLATE_IDS = new Set([
  "pictogram-chart",
  "bar-chart",
  "counter",
  "lower-third",
  "timeline",
  "kinetic-text",
]);

/** Mapas/geo continuam no pipeline nativo (sem TSX do Studio). */
export const GEO_MOTION_TEMPLATE_IDS = new Set(["location-intro", "geo-map"]);

export function isGeoMotionTemplateId(templateId = "") {
  return GEO_MOTION_TEMPLATE_IDS.has(String(templateId || "").trim());
}

export function clipStudioSourceCode(clip = {}) {
  return String(clip.props?.studio_source_code || "").trim();
}

export function isStudioTemplateClip(clip = {}) {
  const code = clipStudioSourceCode(clip);
  if (!code) return false;
  return hasRunnableStudioSource({ short: code, long: code });
}

export function isRunnableStudioMotionScene(ms = {}) {
  if (isGeoMotionTemplateId(ms.template_id)) return true;
  const code = String(ms.props?.studio_source_code || "").trim();
  if (!code) return false;
  return hasRunnableStudioSource({ short: code, long: code });
}

export function isLegacyStudioOverlayClip(clip = {}) {
  if (isStudioTemplateClip(clip)) return false;
  if (
    isGeoMotionTemplateId(
      clip.templateId || clip.props?.overlayType || clip.props?.template_id
    )
  ) {
    return false;
  }
  if (clip.trackId === "overlays" || clip.legacyOverlay) return true;
  const tpl = String(clip.templateId || clip.props?.overlayType || "").trim();
  if (
    clip.trackId === "motion" ||
    clip.motionScene ||
    clip.motionScenePrimary ||
    clip.props?.motion_scene
  ) {
    return true;
  }
  if (LEGACY_OVERLAY_TEMPLATE_IDS.has(tpl)) return true;
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
