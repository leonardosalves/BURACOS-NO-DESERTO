/**
 * Cenas geo 9:16 usam template Image e Media / Picture in Picture:
 * mapa ou flyover no quadradinho PIP e local no slot "ponto de referência".
 */

import { bindGeoPipTemplateStudioProps } from "./geoPipTemplateProps.js";
import { resolveGeoPipReferenceLabel } from "./geoPipSceneText.js";

export const GEO_PIP_CATEGORY = "image-media";
export const GEO_PIP_SUBCATEGORY = "Picture in Picture";

/** Janela do mapa/vídeo no frame 1080×1920 (template PIP técnico). */
export const GEO_PIP_MEDIA_WINDOW_9x16 = {
  leftPct: 52,
  topPct: 7,
  widthPct: 44,
  heightPct: 22,
  radiusPx: 14,
};

/** Retângulo do quadradinho PIP alinhado ao template Studio (top-right 9:16). */
export function resolveGeoPipStudioPipWindowPct(props = {}, aspect = "9:16") {
  const studio = props.studio_props || {};
  const inset = Number(props.pipInset ?? studio.pipInset ?? 132) || 132;
  const pipWidth = Number(props.pipWidth ?? studio.pipWidth ?? 360) || 360;
  const pipHeight = Number(props.pipHeight ?? studio.pipHeight ?? 230) || 230;
  const position = String(
    props.pipPosition ?? studio.pipPosition ?? "top-right"
  ).toLowerCase();
  const vertical = String(aspect || "9:16").trim() === "9:16";
  const compW = vertical ? 1080 : 1920;
  const compH = vertical ? 1920 : 1080;
  const activeW = vertical
    ? Math.min(compW * 0.72, pipWidth)
    : Math.min(compW * 0.32, pipWidth);
  const activeH = vertical
    ? Math.min(compH * 0.22, pipHeight)
    : Math.min(compH * 0.3, pipHeight);
  const isRight = position.includes("right");
  const isBottom = position.includes("bottom");
  const topPx = isBottom
    ? null
    : vertical
      ? props.geoPipOverlayChrome || studio.geoPipOverlayChrome
        ? inset
        : 164
      : inset + 24;
  const bottomPx = isBottom ? (vertical ? 132 : inset) : null;

  const rect = {
    widthPct: (activeW / compW) * 100,
    heightPct: (activeH / compH) * 100,
    borderRadiusPx: 14,
  };
  if (isRight) rect.rightPct = (inset / compW) * 100;
  else rect.leftPct = (inset / compW) * 100;
  if (topPx != null) rect.topPct = (topPx / compH) * 100;
  if (bottomPx != null) rect.bottomPct = (bottomPx / compH) * 100;
  return rect;
}

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

function boundReferenceFromScene(props = {}) {
  return resolveGeoPipReferenceLabel(props);
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
    const referencePoint =
      boundReferenceFromScene({ ...nextProps, studio_props }) ||
      String(nextProps.location || "").trim();
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
        referencePoint,
        scene_subject: studio_props.location,
        pipTitle: "",
        pipMediaUrl: studio_props.pipMediaUrl || nextProps.pipMediaUrl,
        location: studio_props.location,
        showMainContentLabel: studio_props.showMainContentLabel,
        showPointerLines: studio_props.showPointerLines,
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
