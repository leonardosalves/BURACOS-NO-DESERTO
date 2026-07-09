/**
 * Cenas geo 9:16 usam template Image e Media / Picture in Picture:
 * mapa ou flyover no quadradinho PIP e local no slot "ponto de referência".
 */

import {
  resolveGeoPipReferenceLabel,
  resolveGeoPipSectorLabel,
} from "./geoPipSceneText.js";

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
  const location = String(props.location || "").trim();
  const region = String(props.region || "").trim();
  const country = String(props.country || "").trim();
  const lat = Number(props.lat);
  const lng = Number(props.lng);
  const dataSlots = Array.isArray(template.dataSlots)
    ? template.dataSlots.map(String)
    : [];

  const studio = {};
  const filled = [];

  const assign = (key, value) => {
    if (value === undefined || value === null) return;
    const clean = String(value).trim();
    if (!clean) return;
    studio[key] = clean;
    filled.push(key);
  };

  for (const slot of dataSlots) {
    const key = String(slot || "").trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (REFERENCE_POINT_SLOTS.has(key) || lower.includes("referen")) {
      assign(key, resolveGeoPipReferenceLabel(props));
      continue;
    }
    if (PIP_TITLE_SLOTS.has(key)) {
      assign(key, resolveGeoPipReferenceLabel(props) || location);
      continue;
    }
    if (
      lower === "subtitle" ||
      lower === "descriptortext" ||
      lower.includes("sector") ||
      lower.includes("setor") ||
      lower === "panellabel" ||
      lower === "statustext"
    ) {
      assign(
        key,
        resolveGeoPipSectorLabel(props, String(props.narration_text || ""))
      );
      continue;
    }
    if (lower === "location") {
      assign(key, location);
      continue;
    }
    if (lower === "region") {
      assign(key, region);
      continue;
    }
    if (lower === "country") {
      assign(key, country);
      continue;
    }
    if (/lat/i.test(key) && Number.isFinite(lat)) {
      assign(key, formatCoordDms(lat, "lat"));
      continue;
    }
    if (/lng|lon/i.test(key) && Number.isFinite(lng)) {
      assign(key, formatCoordDms(lng, "lng"));
    }
  }

  if (!filled.length) {
    assign("referencePoint", resolveGeoPipReferenceLabel(props));
    assign("pipTitle", resolveGeoPipReferenceLabel(props) || location);
    assign(
      "subtitle",
      resolveGeoPipSectorLabel(props, String(props.narration_text || ""))
    );
    assign(
      "sectorLabel",
      resolveGeoPipSectorLabel(props, String(props.narration_text || ""))
    );
    if (Number.isFinite(lat)) assign("latLabel", formatCoordDms(lat, "lat"));
    if (Number.isFinite(lng)) assign("lngLabel", formatCoordDms(lng, "lng"));
  }

  return {
    studio_props: studio,
    studio_props_meta: {
      filled_slots: filled,
      confidence: filled.length ? 0.85 : 0.4,
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
        referencePoint: studio_props.referencePoint || nextProps.location,
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
