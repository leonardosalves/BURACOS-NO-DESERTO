import {
  isTemplatePlaceholderValue,
  TEMPLATE_STRUCTURAL_PROP_KEYS,
} from "./studioTemplatePlaceholder.js";
import {
  GEO_PIP_FORCE_EMPTY_KEYS,
  GEO_PIP_OVERLAY_PROP_KEYS,
  isPictureInPictureStudioTemplate,
  mapGeoPipFlyoverToTemplateRenderProps,
  resolveStudioUserLockedSlots,
} from "./geoPipTemplateProps.js";

/** Tiles satélite legados — não fullscreen no template PIP. */
export const GEO_PIP_MAP_MEDIA_KEYS = [
  "backgroundImage",
  "backgroundImageWide",
];

/** Short 9:16 com mapa/vídeo geo no quadradinho PIP (global, todos os projetos). */
export function isGeoPipShortMode(props = {}) {
  const aspect = String(props.aspect_ratio || "16:9").trim();
  if (aspect !== "9:16") return false;
  if (props.geo_pip_composite) return true;
  if (String(props.geo_pip_mode || "").includes("pip")) return true;
  const pres = String(props.presentation || props.layout || "").trim();
  if (pres === "pip") return true;
  return isGeoPipCompositeProps(props);
}

/** Remove tiles satélite legados das props do template PIP. */
export function stripGeoPipMapMediaForTemplateProps(props = {}) {
  if (!props || typeof props !== "object") return props;
  const out = { ...props };
  for (const key of GEO_PIP_MAP_MEDIA_KEYS) {
    if (key in out) delete out[key];
  }
  return out;
}

export function pickGeoPipMapMediaProps(props = {}) {
  const src = props && typeof props === "object" ? props : {};
  return {
    flyover_video: String(src.flyover_video || src.pipMediaUrl || "").trim(),
    pipMediaUrl: String(src.pipMediaUrl || src.flyover_video || "").trim(),
    backgroundImage: String(src.backgroundImage || "").trim(),
    backgroundImageWide: String(src.backgroundImageWide || "").trim(),
  };
}

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
  const durationSecHint = Number(
    sceneValues.durationSeconds ??
      studioProps.durationSeconds ??
      inputProps.durationSeconds ??
      0
  );
  if (Number.isFinite(resolvedDuration) && resolvedDuration > 0) {
    out.durationInFrames = Math.round(resolvedDuration);
    out.durationSeconds =
      resolvedDuration / (Number(fps) > 0 ? Number(fps) : 30);
  } else if (Number.isFinite(durationSecHint) && durationSecHint > 0) {
    out.durationInFrames = Math.max(1, Math.round(durationSecHint * fps));
    out.durationSeconds = durationSecHint;
  } else if (
    Number.isFinite(Number(out.durationInFrames)) &&
    Number(out.durationInFrames) > 0
  ) {
    out.durationInFrames = Math.round(Number(out.durationInFrames));
  }

  out.fps = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : 30;

  if (
    isGeoPipShortMode(inputProps) ||
    isPictureInPictureStudioTemplate(inputProps)
  ) {
    const locked = resolveStudioUserLockedSlots(inputProps);
    const mapped = mapGeoPipFlyoverToTemplateRenderProps({
      ...inputProps,
      ...out,
    });
    const merged = { ...out, ...mapped };
    for (const key of GEO_PIP_MAP_MEDIA_KEYS) {
      if (key in merged) delete merged[key];
    }
    for (const key of GEO_PIP_FORCE_EMPTY_KEYS) {
      if (locked.has(key)) continue;
      if (key in mapped) merged[key] = mapped[key];
    }
    if (!locked.has("showMainContentLabel")) {
      if (mapped.showMainContentLabel !== undefined) {
        merged.showMainContentLabel = mapped.showMainContentLabel;
      }
    }
    if (!locked.has("showPointerLines")) {
      if (mapped.showPointerLines !== undefined) {
        merged.showPointerLines = mapped.showPointerLines;
      }
    }
    for (const key of GEO_PIP_OVERLAY_PROP_KEYS) {
      if (locked.has(key)) continue;
      if (key in mapped) merged[key] = mapped[key];
    }
    return merged;
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
    sanitized.pipMediaUrl ||
    sanitized.flyover_video ||
    sanitized.backgroundImage ||
    sanitized.backgroundImageWide ||
    sanitized.pipTitle ||
    sanitized.location
  );
}
