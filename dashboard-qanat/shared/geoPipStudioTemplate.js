/**
 * Cenas geo 9:16 usam template Image e Media / Picture in Picture:
 * mapa ou flyover no quadradinho PIP e local no slot "ponto de referência".
 */

import { bindGeoPipTemplateStudioProps } from "./geoPipTemplateProps.js";

export const GEO_PIP_CATEGORY = "image-media";
export const GEO_PIP_SUBCATEGORY = "Picture in Picture";

/** Janela do mapa/vídeo no frame 1080×1920 (template PIP técnico). */
export const GEO_PIP_MEDIA_WINDOW_9x16 = {
  leftPct: 52,
  topPct: 66,
  widthPct: 44,
  heightPct: 22,
  radiusPx: 14,
};

const GEO_TEMPLATES = new Set(["location-intro", "geo-map"]);

const REFERENCE_POINT_SLOTS = new Set([
  "referencePoint",
  "reference_point",
  "pontoReferencia",
  "ponto_referencia",
  "referenceLabel",
  "reference_label",
  "pipReference",
  "pip_reference",
]);

const PIP_TITLE_SLOTS = new Set([
  "pipTitle",
  "pip_title",
  "locationTitle",
  "location_title",
  "title",
  "headline",
]);

function subcategoryKey(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isVerticalAspect(aspectRatio = "") {
  return String(aspectRatio || "").trim() === "9:16";
}

export function isGeoMotionTemplate(templateId = "") {
  return GEO_TEMPLATES.has(String(templateId || "").trim());
}

export function isGeoPipShortScene(scene = {}) {
  const templateId = String(scene.template_id || "").trim();
  if (!isGeoMotionTemplate(templateId)) return false;
  const aspect = String(
    scene.props?.aspect_ratio || scene.aspect_ratio || "16:9"
  ).trim();
  return isVerticalAspect(aspect);
}

export function resolveGeoPipPresentation(aspectRatio = "16:9") {
  return isVerticalAspect(aspectRatio) ? "pip" : "fullscreen";
}

export function formatCoordDms(value, axis = "lat") {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const abs = Math.abs(num);
  const deg = Math.floor(abs);
  const min = Math.round((abs - deg) * 60);
  const hemi = axis === "lat" ? (num >= 0 ? "N" : "S") : num >= 0 ? "E" : "W";
  return `${deg}°${String(min).padStart(2, "0")}' ${hemi}`;
}

export function buildGeoPipStudioProps(scene = {}, template = {}) {
  const props = scene.props || {};
  const dataSlots = Array.isArray(template.dataSlots)
    ? template.dataSlots.map(String)
    : [];
  const bound = bindGeoPipTemplateStudioProps(
    {
      ...props,
      template_studio_subcategory: template.subcategory,
    },
    {
      narration: String(props.narration_text || ""),
      dataSlots,
      flyoverUrl: String(props.flyover_video || props.pipMediaUrl || "").trim(),
    }
  );

  return {
    studio_props: bound.studio_props,
    studio_props_meta: {
      filled_slots: bound.filled_slots,
      confidence: bound.filled_slots.length ? 0.85 : 0.4,
      mode: "geo_pip",
    },
  };
}

export function pickGeoPipStudioTemplate(catalog = {}, niche = "") {
  const approved = Array.isArray(catalog.approved) ? catalog.approved : [];
  const targetSub = subcategoryKey(GEO_PIP_SUBCATEGORY);
  const matches = approved.filter((tpl) => {
    if (!tpl?.orchestration_ready || !tpl?.has_source_code) return false;
    if (tpl.status !== "approved") return false;
    const cat = String(tpl.category || "")
      .trim()
      .toLowerCase();
    if (cat !== GEO_PIP_CATEGORY) return false;
    return subcategoryKey(tpl.subcategory) === targetSub;
  });
  if (!matches.length) return null;

  const nicheLower = String(niche || "")
    .trim()
    .toLowerCase();
  const nicheMatch = matches.find(
    (tpl) =>
      String(tpl.niche || "")
        .trim()
        .toLowerCase() === nicheLower
  );
  return nicheMatch || matches[0];
}

export function attachGeoPipStudioTemplate(
  scene = {},
  { niche = "", catalog = null, resolveSourceCode } = {}
) {
  if (!isGeoPipShortScene(scene)) return scene;

  const presentation = "pip";
  const nextProps = {
    ...(scene.props || {}),
    presentation,
    layout: presentation,
    aspect_ratio: scene.props?.aspect_ratio || "9:16",
    geo_pip_mode: "image-media-pip",
    geo_pip_composite: true,
    geo_pip_window: GEO_PIP_MEDIA_WINDOW_9x16,
  };

  const template = catalog ? pickGeoPipStudioTemplate(catalog, niche) : null;
  if (template?.id) {
    const sourceCode = resolveSourceCode
      ? resolveSourceCode(template, "9:16")
      : String(
          template.sourceCode?.short || template.sourceCode?.long || ""
        ).trim();
    const { studio_props, studio_props_meta } = buildGeoPipStudioProps(
      { ...scene, props: nextProps },
      template
    );
    return {
      ...scene,
      layout: presentation,
      props: {
        ...nextProps,
        template_studio_id: template.id,
        template_studio_name: template.name,
        template_studio_category: template.category,
        template_studio_subcategory: template.subcategory,
        template_studio_motion_template_id:
          template.motion_template_id || "location-intro",
        template_studio_data_slots: Array.isArray(template.dataSlots)
          ? template.dataSlots
          : [],
        studio_source_code: sourceCode,
        studio_props,
        studio_props_meta,
        pipTitle: studio_props.pipTitle || nextProps.location,
        pipMediaUrl: studio_props.pipMediaUrl || nextProps.pipMediaUrl,
        location: studio_props.location,
      },
    };
  }

  return {
    ...scene,
    layout: presentation,
    props: {
      ...nextProps,
      geo_pip_native: true,
      referencePoint: String(nextProps.location || "").trim(),
    },
  };
}
