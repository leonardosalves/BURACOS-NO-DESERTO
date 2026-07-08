/**
 * Enriquecimento de motion scenes por template — mapa, contadores, gráficos, etc.
 */

import {
  isGeoTemplate,
  motionSceneNeedsAssetEnrichment,
} from "../shared/motionSceneAssetEnrichment.js";
import { buildPropsForTemplate } from "./motionScenePlanner.js";
import { enrichGeoSceneWithAiPrompt } from "./geoVideoPromptService.js";

function applyGeoFetchToScene(scene, fetched) {
  if (!fetched?.ok) return { scene, ok: false, reason: fetched?.reason };
  scene.props = {
    ...(scene.props || {}),
    lat: fetched.lat ?? scene.props?.lat,
    lng: fetched.lng ?? scene.props?.lng,
    map_provider: fetched.map_provider || "ai_t2v",
    geo_generation: fetched.geo_generation || "ai_prompt",
    ai_video_prompt: fetched.ai_video_prompt || scene.props?.ai_video_prompt,
    geo_prompt_brief: fetched.geo_prompt_brief,
    geo_prompt_mode: fetched.geo_prompt_mode,
    geo_prompt_weather: fetched.geo_prompt_weather,
    geo_prompt_era: fetched.geo_prompt_era,
    geo_prompt_orbit_360: fetched.geo_prompt_orbit_360,
    geo_prompt_territory_highlight: fetched.geo_prompt_territory_highlight,
    geo_prompt_generated_at: fetched.geo_prompt_generated_at,
    geo_prompt_engine: fetched.geo_prompt_engine,
    fly_mode: fetched.fly_mode || scene.props?.fly_mode,
    place_type: fetched.place_type || scene.props?.place_type,
    poi_kind: fetched.poi_kind,
    structure_exists: fetched.structure_exists,
    aspect_ratio: fetched.aspect_ratio || scene.props?.aspect_ratio,
    variant: fetched.variant || "ai_geo_video",
    map_style: fetched.map_style || "photoreal_satellite",
    geocode_source: fetched.geocode_source,
    subtitle: fetched.subtitle ?? scene.props?.subtitle,
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
      if (templateId === "location-intro" || templateId === "geo-map") {
        const fetched = await enrichGeoSceneWithAiPrompt(projDir, scene, {
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
        await new Promise((r) => setTimeout(r, 200));
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
