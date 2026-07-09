/**
 * QC + auto-remediação de motion scenes antes de entregar na timeline.
 */

import {
  assessMotionScenesPlan,
  normalizeMotionSceneMetadata,
} from "../shared/motionSceneQuality.js";
import { enrichGeoSceneWithAiPrompt } from "./geoVideoPromptService.js";
import {
  getCatalogForNiche,
  resolveStudioSourceCode,
} from "./remotionTemplateCatalogService.js";
import {
  attachGeoPipStudioTemplate,
  isGeoPipShortScene,
} from "../shared/geoPipStudioTemplate.js";

const GEO_FIX_CODES = new Set([
  "missing_ai_prompt",
  "missing_location",
  "missing_coords",
  "legacy_ai_prompt",
  "missing_negative_prompt",
]);

function sceneNeedsSatelliteRefetch(scene, assessment) {
  const tpl = String(scene.template_id || "");
  if (tpl !== "location-intro" && tpl !== "geo-map") return false;
  if (!assessment || assessment.ok) return false;
  return (assessment.issues || []).some((i) => GEO_FIX_CODES.has(i.code));
}

function applyGeoPromptToScene(scene, fetched) {
  if (!fetched?.ok) return { scene, ok: false, reason: fetched?.reason };
  scene.props = {
    ...(scene.props || {}),
    lat: fetched.lat ?? scene.props?.lat,
    lng: fetched.lng ?? scene.props?.lng,
    map_provider: fetched.map_provider || "ai_t2v",
    geo_generation: fetched.geo_generation || "ai_prompt",
    ai_video_prompt: fetched.ai_video_prompt,
    ai_video_negative_prompt: fetched.ai_video_negative_prompt,
    geo_prompt_shotlist: fetched.geo_prompt_shotlist,
    geo_prompt_brief: fetched.geo_prompt_brief,
    geo_prompt_mode: fetched.geo_prompt_mode,
    geo_prompt_weather: fetched.geo_prompt_weather,
    geo_prompt_era: fetched.geo_prompt_era,
    geo_prompt_target: fetched.geo_prompt_target,
    geo_prompt_orbit_360: fetched.geo_prompt_orbit_360,
    geo_prompt_territory_highlight: fetched.geo_prompt_territory_highlight,
    geo_prompt_generated_at: fetched.geo_prompt_generated_at,
    geo_prompt_engine: fetched.geo_prompt_engine,
    fly_mode: fetched.fly_mode,
    place_type: fetched.place_type,
    poi_kind: fetched.poi_kind,
    structure_exists: fetched.structure_exists,
    aspect_ratio: fetched.aspect_ratio,
    variant: fetched.variant || "ai_geo_video",
    map_style: fetched.map_style || "photoreal_satellite",
    geocode_source: fetched.geocode_source,
  };
  return { scene, ok: true };
}

/**
 * Valida cenas e re-baixa satélite automaticamente quando necessário.
 * @returns {{ motion_scenes, quality, remediation }}
 */
export async function ensureMotionScenesQuality(
  projDir,
  motionScenes = [],
  { config = {}, workspaceConfig = {}, maxPasses = 2, autoFix = true } = {}
) {
  let scenes = (Array.isArray(motionScenes) ? motionScenes : []).map((ms) =>
    normalizeMotionSceneMetadata(ms)
  );
  const remediation = [];

  for (let pass = 0; pass < maxPasses; pass++) {
    const qc = assessMotionScenesPlan(scenes, projDir);
    remediation.push({
      pass: pass + 1,
      before: { ok: qc.ok, score: qc.score, failed_count: qc.failed_count },
    });

    if (qc.ok || !autoFix) break;

    const byId = new Map(qc.scenes.map((r) => [r.scene_id, r]));
    let fixedAny = false;

    for (let i = 0; i < scenes.length; i++) {
      const ms = scenes[i];
      const assessment = byId.get(String(ms.id || ""));
      if (!sceneNeedsSatelliteRefetch(ms, assessment)) continue;

      try {
        const fetched = await enrichGeoSceneWithAiPrompt(projDir, ms, {
          config,
          workspaceConfig,
        });
        const applied = applyGeoPromptToScene(ms, fetched);
        let nextScene = applied.scene;
        if (applied.ok && isGeoPipShortScene(nextScene)) {
          const niche = String(
            config.niche || nextScene.props?.niche || ""
          ).trim();
          const catalog = niche ? getCatalogForNiche(niche) : { approved: [] };
          nextScene = attachGeoPipStudioTemplate(nextScene, {
            niche,
            catalog,
            resolveSourceCode: resolveStudioSourceCode,
          });
        }
        scenes[i] = normalizeMotionSceneMetadata(nextScene);
        remediation.push({
          pass: pass + 1,
          scene_id: ms.id,
          action: "regenerate_geo_prompt",
          ok: applied.ok,
          reason: applied.reason || null,
        });
        if (applied.ok) fixedAny = true;
      } catch (err) {
        remediation.push({
          pass: pass + 1,
          scene_id: ms.id,
          action: "regenerate_geo_prompt",
          ok: false,
          reason: err.message,
        });
      }
    }

    if (!fixedAny) break;
  }

  const quality = assessMotionScenesPlan(scenes, projDir);
  scenes = scenes.map((ms) => ({
    ...ms,
    quality: quality.scenes.find((r) => r.scene_id === String(ms.id || "")) || {
      ok: true,
      score: 100,
      issues: [],
    },
  }));

  return {
    motion_scenes: scenes,
    quality,
    remediation,
    auto_fixed: remediation.some(
      (r) => r.action === "regenerate_geo_prompt" && r.ok
    ),
  };
}
