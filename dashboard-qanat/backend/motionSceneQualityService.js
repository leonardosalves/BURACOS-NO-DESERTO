/**
 * QC + auto-remediação de motion scenes antes de entregar na timeline.
 */

import {
  assessMotionScenesPlan,
  normalizeMotionSceneMetadata,
} from "../shared/motionSceneQuality.js";
import { fetchSatelliteAssetsForScene } from "./satelliteMapService.js";

const SATELLITE_FIX_CODES = new Set([
  "missing_coords",
  "insufficient_keyframes",
  "zoom_too_tight",
  "missing_boundary",
  "missing_tile_file",
  "missing_boundary_file",
  "empty_keyframe",
]);

function sceneNeedsSatelliteRefetch(scene, assessment) {
  if (String(scene.template_id) !== "location-intro") return false;
  if (!assessment || assessment.ok) return false;
  return (assessment.issues || []).some(
    (i) => i.severity === "critical" && SATELLITE_FIX_CODES.has(i.code)
  );
}

function applySatelliteFetchToScene(scene, fetched) {
  if (!fetched?.ok) return { scene, ok: false, reason: fetched?.reason };
  scene.props = {
    ...(scene.props || {}),
    lat: fetched.lat,
    lng: fetched.lng,
    backgroundImage: fetched.backgroundImage,
    backgroundImageWide: fetched.backgroundImageWide,
    zoom_keyframes: fetched.zoom_keyframes,
    zoom_from: fetched.zoom_from,
    zoom_to: fetched.zoom_to,
    fly_mode: fetched.fly_mode,
    place_type: fetched.place_type,
    boundaryGeoJson: fetched.boundaryGeoJson || "",
    map_provider: fetched.map_provider,
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
        const fetched = await fetchSatelliteAssetsForScene(projDir, ms, {
          config,
          workspaceConfig,
        });
        const applied = applySatelliteFetchToScene(ms, fetched);
        scenes[i] = normalizeMotionSceneMetadata(applied.scene);
        remediation.push({
          pass: pass + 1,
          scene_id: ms.id,
          action: "refetch_satellite",
          ok: applied.ok,
          reason: applied.reason || null,
        });
        if (applied.ok) fixedAny = true;
      } catch (err) {
        remediation.push({
          pass: pass + 1,
          scene_id: ms.id,
          action: "refetch_satellite",
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
      (r) => r.action === "refetch_satellite" && r.ok
    ),
  };
}
