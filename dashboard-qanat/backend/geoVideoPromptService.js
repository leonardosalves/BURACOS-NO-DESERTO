/**
 * Enriquecimento geográfico via prompts T2V — substitui Blender/Cesium/satélite.
 * GLOBAL: lê local e narração da cena do projeto em edição; não injeta cidade fixa.
 */

import {
  classifyPlaceType,
  geocodeLocation,
  resolveKnownCoordinates,
} from "./satelliteMapService.js";
import {
  buildGeoVideoPromptMeta,
  geoPromptBrief,
} from "../shared/geoVideoPromptEngine.js";

function resolveRenderDimensions(aspectRatio = "16:9") {
  if (aspectRatio === "9:16") {
    return { aspect_ratio: "9:16", width: 1080, height: 1920 };
  }
  return { aspect_ratio: "16:9", width: 1920, height: 1080 };
}

async function resolveCoords(scene = {}) {
  const props = scene?.props || {};
  const query = [props.location, props.region, props.country]
    .filter(Boolean)
    .join(", ");
  const narration = String(scene?.narration_text || "");

  let coords = resolveKnownCoordinates(narration, props);
  if (!coords) coords = resolveKnownCoordinates(query, props);
  if (!coords) coords = await geocodeLocation(query, props);
  if (!coords && narration) coords = await geocodeLocation(narration, props);
  return coords;
}

/**
 * Gera prompt T2V rico + metadados geo para location-intro ou geo-map.
 */
export async function enrichGeoSceneWithAiPrompt(
  _projDir,
  scene,
  { config = {} } = {}
) {
  const props = scene?.props || {};
  const templateId = String(scene.template_id || "location-intro");
  const narration = String(scene.narration_text || "").trim();
  const query = [props.location, props.region, props.country]
    .filter(Boolean)
    .join(", ");

  if (!query && !narration) {
    return { ok: false, reason: "no_location", query: "" };
  }

  const coords = await resolveCoords(scene);
  const classified = classifyPlaceType(narration, props);
  const explicitPlaceType = String(props.place_type || "").trim();
  const classification = {
    ...(props.fly_mode && explicitPlaceType
      ? {
          fly_mode: props.fly_mode,
          place_type: explicitPlaceType,
          structure_exists:
            props.structure_exists !== false &&
            explicitPlaceType !== "historic_site",
          poi_kind: classified.poi_kind || props.poi_kind,
        }
      : classified),
  };

  const aspectRatio = String(
    props.aspect_ratio || config.aspect_ratio || config.format || "16:9"
  ).trim();
  const renderDims = resolveRenderDimensions(aspectRatio);
  const durationSeconds = Math.max(
    4,
    Number(scene.duration_seconds) || Number(props.duration_seconds) || 8
  );

  const place = {
    location: props.location || coords?.label || "",
    region: props.region || "",
    country: props.country || "",
  };

  const meta = buildGeoVideoPromptMeta({
    place,
    classification,
    narration,
    templateId,
    aspectRatio: renderDims.aspect_ratio,
    durationSeconds,
    coords,
  });

  return {
    ok: true,
    kind: templateId,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    geocode_source: coords?.source || (coords ? "resolved" : "prompt_only"),
    map_provider: "ai_t2v",
    geo_generation: "ai_prompt",
    place_type: classification.place_type,
    poi_kind: classification.poi_kind,
    structure_exists: classification.structure_exists !== false,
    fly_mode: classification.fly_mode || "earth_descent",
    aspect_ratio: renderDims.aspect_ratio,
    ai_video_prompt: meta.ai_video_prompt,
    geo_prompt_brief: geoPromptBrief(meta),
    geo_prompt_mode: meta.geo_prompt_mode,
    geo_prompt_weather: meta.geo_prompt_weather,
    geo_prompt_era: meta.geo_prompt_era,
    geo_prompt_orbit_360: meta.geo_prompt_orbit_360,
    geo_prompt_territory_highlight: meta.geo_prompt_territory_highlight,
    geo_prompt_generated_at: meta.geo_prompt_generated_at,
    geo_prompt_engine: meta.geo_prompt_engine,
    variant: "ai_geo_video",
    map_style: "photoreal_satellite",
    subtitle: props.subtitle || place.location,
  };
}

/** @deprecated Use enrichGeoSceneWithAiPrompt — alias para rotas legadas. */
export async function fetchSatelliteAssetsForScene(projDir, scene, opts = {}) {
  return enrichGeoSceneWithAiPrompt(projDir, scene, opts);
}

/** @deprecated Use enrichGeoSceneWithAiPrompt — alias para geo-map. */
export async function fetchGeoMapAssetsForScene(projDir, scene, opts = {}) {
  const sceneWithTpl = {
    ...scene,
    template_id: scene?.template_id || "geo-map",
  };
  return enrichGeoSceneWithAiPrompt(projDir, sceneWithTpl, opts);
}

export function resolveMapEngine() {
  return "ai_t2v";
}
