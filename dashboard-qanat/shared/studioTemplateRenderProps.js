import {
  isTemplatePlaceholderValue,
  TEMPLATE_STRUCTURAL_PROP_KEYS,
} from "./studioTemplatePlaceholder.js";

/** Remove metadados de orquestração antes de passar props ao componente Studio. */
export function sanitizeStudioRenderProps(props = {}) {
  const skip = new Set([
    "template_studio_id",
    "template_studio_name",
    "template_studio_category",
    "template_studio_subcategory",
    "template_studio_motion_template_id",
    "studio_source_code",
    "studio_props",
    "studio_props_meta",
    "template_studio_data_slots",
    "studio_role",
    "studio_z_index",
    "studio_opacity",
    "geo_pip_composite",
    "geo_pip_mode",
    "geo_pip_window",
    "geo_pip_native",
    "geo_generation",
    "map_provider",
    "ai_video_prompt",
    "geo_prompt_brief",
    "boosted",
    "overlayType",
    "media_mode",
    "motion_scene",
    "motion_quality_ok",
    "motion_quality_score",
    "narration_text",
    "scene_ref",
    "block",
    "trigger",
    "presentation",
    "layout",
    "aspect_ratio",
    "timing_manual",
    "customStyle",
    "style",
  ]);
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (!skip.has(key) && value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Mescla props da cena/IA sem exampleProps genericos.
 * A duracao da cena sempre vence sobre o default do template.
 */
export function mergeStudioRenderProps({
  inputProps = {},
  exampleProps = {},
  durationInFrames,
  fps = 30,
} = {}) {
  const sanitized = sanitizeStudioRenderProps(inputProps);
  const studioProps =
    inputProps.studio_props && typeof inputProps.studio_props === "object"
      ? inputProps.studio_props
      : {};
  const sceneValues = { ...sanitized, ...studioProps };

  const out = {};
  for (const [key, value] of Object.entries(sceneValues)) {
    if (key === "studio_props") continue;
    if (!isTemplatePlaceholderValue(value, key)) {
      out[key] = value;
    }
  }

  for (const [key, value] of Object.entries(exampleProps)) {
    if (out[key] !== undefined) continue;
    if (!TEMPLATE_STRUCTURAL_PROP_KEYS.has(key)) continue;
    if (!isTemplatePlaceholderValue(value, key)) {
      out[key] = value;
    }
  }

  const resolvedDuration = Number(durationInFrames);
  if (Number.isFinite(resolvedDuration) && resolvedDuration > 0) {
    out.durationInFrames = Math.round(resolvedDuration);
  } else if (
    Number.isFinite(Number(out.durationInFrames)) &&
    Number(out.durationInFrames) > 0
  ) {
    out.durationInFrames = Math.round(Number(out.durationInFrames));
  }

  out.fps = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : 30;

  if (isGeoPipCompositeProps(inputProps)) {
    out.geoPipOverlayMode = true;
    out.transparentBackground = true;
    const reference = String(
      out.referencePoint ||
        sceneValues.referencePoint ||
        sceneValues.country ||
        sceneValues.location ||
        ""
    ).trim();
    const sector = String(
      out.scene_subject ||
        out.sectorLabel ||
        out.panelLabel ||
        out.subtitle ||
        sceneValues.scene_subject ||
        ""
    ).trim();
    if (reference) out.referencePoint = reference;
    if (sector) {
      out.scene_subject = sector;
      if (!out.subtitle || isTemplatePlaceholderValue(out.subtitle, "subtitle")) {
        out.subtitle = sector;
      }
      if (
        !out.sectorLabel ||
        isTemplatePlaceholderValue(out.sectorLabel, "sectorLabel")
      ) {
        out.sectorLabel = sector;
      }
      if (
        !out.panelLabel ||
        isTemplatePlaceholderValue(out.panelLabel, "panelLabel")
      ) {
        out.panelLabel = sector;
      }
    }
    for (const key of ["headline", "title", "text", "mainTitle", "mainContent"]) {
      if (isTemplatePlaceholderValue(out[key], key)) {
        delete out[key];
      }
    }
  }

  return out;
}

/** Indica modo PIP geo: mapa no slot, fundo transparente para B-roll. */
export function isGeoPipCompositeProps(props = {}) {
  if (props.geo_pip_composite) return true;
  const sub = String(props.template_studio_subcategory || "")
    .trim()
    .toLowerCase();
  if (!sub.includes("picture in picture")) return false;
  const sanitized = sanitizeStudioRenderProps(props);
  return Boolean(
    sanitized.flyover_video ||
    sanitized.backgroundImage ||
    sanitized.backgroundImageWide ||
    sanitized.location
  );
}
