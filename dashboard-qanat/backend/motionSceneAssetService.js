/**
 * Enriquecimento de motion scenes por template — mapa, contadores, gráficos, etc.
 */

import {
  isGeoTemplate,
  motionSceneNeedsAssetEnrichment,
} from "../shared/motionSceneAssetEnrichment.js";
import { buildPropsForTemplate } from "./motionScenePlanner.js";
import {
  fetchSatelliteAssetsForScene,
  fetchGeoMapAssetsForScene,
} from "./satelliteMapService.js";

function applyGeoFetchToScene(scene, fetched) {
  if (!fetched?.ok) return { scene, ok: false, reason: fetched?.reason };
  scene.props = {
    ...(scene.props || {}),
    lat: fetched.lat,
    lng: fetched.lng,
    backgroundImage: fetched.backgroundImage || scene.props?.backgroundImage,
    backgroundImageWide:
      fetched.backgroundImageWide || scene.props?.backgroundImageWide,
    zoom_keyframes: fetched.zoom_keyframes || scene.props?.zoom_keyframes,
    zoom_from: fetched.zoom_from ?? scene.props?.zoom_from,
    zoom_to: fetched.zoom_to ?? scene.props?.zoom_to,
    fly_mode: fetched.fly_mode || scene.props?.fly_mode,
    place_type: fetched.place_type || scene.props?.place_type,
    structure_exists: fetched.structure_exists,
    aspect_ratio: fetched.aspect_ratio || scene.props?.aspect_ratio,
    boundaryGeoJson: fetched.boundaryGeoJson || "",
    map_provider: fetched.map_provider,
    geocode_source: fetched.geocode_source,
    cesium_ion_token: fetched.cesium_ion_token || "",
    google_maps_api_key: fetched.google_maps_api_key || "",
    flyover_video: fetched.flyover_video || "",
  };
  return { scene, ok: true, kind: fetched.kind || "geo" };
}

function applyNarrationPropsToScene(
  scene,
  accentColor = "#D4AF37",
  config = {}
) {
  const narration = String(scene.narration_text || "").trim();
  if (!narration) return { scene, ok: false, reason: "no_narration" };
  const aspectRatio = String(
    config.aspect_ratio || config.format || scene.props?.aspect_ratio || "16:9"
  );
  const fresh = buildPropsForTemplate(
    scene.template_id,
    scene.trigger,
    narration,
    accentColor,
    aspectRatio
  );
  scene.props = { ...(scene.props || {}), ...fresh };
  return { scene, ok: true, kind: "narration_props" };
}

/**
 * Enriquece cada motion scene conforme template_id (mapa, dados, texto, etc.).
 */
export async function enrichMotionScenesWithAssets(
  projDir,
  motionScenes = [],
  { config = {}, workspaceConfig = {}, maxScenes = 12, accentColor } = {}
) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const accent = String(accentColor || config.accent_color || "#D4AF37");
  const pending = scenes.filter((s) => motionSceneNeedsAssetEnrichment(s));
  const toProcess = pending.slice(0, maxScenes);

  const results = [];
  let enriched = 0;

  for (const scene of toProcess) {
    const templateId = String(scene.template_id || "");
    try {
      if (templateId === "location-intro") {
        const fetched = await fetchSatelliteAssetsForScene(projDir, scene, {
          config,
          workspaceConfig,
        });
        const applied = applyGeoFetchToScene(scene, fetched);
        results.push({
          id: scene.id,
          template_id: templateId,
          ...applied,
          reason: applied.reason || null,
        });
        if (applied.ok) enriched += 1;
      } else if (templateId === "geo-map") {
        const fetched = await fetchGeoMapAssetsForScene(projDir, scene, {
          config,
          workspaceConfig,
        });
        const applied = applyGeoFetchToScene(scene, fetched);
        results.push({
          id: scene.id,
          template_id: templateId,
          ...applied,
          reason: applied.reason || null,
        });
        if (applied.ok) enriched += 1;
      } else if (!isGeoTemplate(templateId)) {
        const applied = applyNarrationPropsToScene(scene, accent, config);
        results.push({
          id: scene.id,
          template_id: templateId,
          ...applied,
          reason: applied.reason || null,
        });
        if (applied.ok) enriched += 1;
      } else {
        results.push({
          id: scene.id,
          template_id: templateId,
          ok: false,
          reason: "unsupported_template",
        });
      }

      if (isGeoTemplate(templateId)) {
        await new Promise((r) => setTimeout(r, 900));
      }
    } catch (err) {
      results.push({
        id: scene.id,
        template_id: templateId,
        ok: false,
        reason: err.message,
      });
    }
  }

  return { motion_scenes: scenes, enriched, results };
}
