/**
 * Quality gate para cenas Remotion — validação antes de sync/render.
 * Padrão OpenMontage reviewer: accurate, complete, constructive.
 */

import fs from "fs";
import path from "path";
import {
  FULLSCREEN_TEMPLATES,
  LOCATION_INTRO_DEFAULTS,
} from "./motionSceneCatalog.js";

export const MIN_CITY_KEYFRAMES = 5;
export const MAX_CITY_ZOOM_TO = 10;
export const MIN_LOCATION_INTRO_DURATION = 8;

function assetPath(projDir, rel = "") {
  const r = String(rel || "")
    .trim()
    .replace(/\\/g, "/");
  if (!r || !projDir) return "";
  return path.join(projDir, r);
}

function fileExists(projDir, rel) {
  const abs = assetPath(projDir, rel);
  return Boolean(abs && fs.existsSync(abs));
}

export function assessLocationIntroScene(scene = {}, { projDir = "" } = {}) {
  const props = scene.props || {};
  const issues = [];
  const placeType = String(props.place_type || "city");
  const keyframes = Array.isArray(props.zoom_keyframes)
    ? props.zoom_keyframes
    : [];

  if ((Number(scene.duration_seconds) || 0) < MIN_LOCATION_INTRO_DURATION) {
    issues.push({
      code: "duration_short",
      severity: "suggestion",
      message: `Duração ${scene.duration_seconds || 0}s < ${MIN_LOCATION_INTRO_DURATION}s`,
      proposed_fix: "Aumentar duration_seconds para pelo menos 8s",
    });
  }

  if (!Number(props.lat) || !Number(props.lng)) {
    issues.push({
      code: "missing_coords",
      severity: "critical",
      message: "Sem coordenadas geográficas",
      proposed_fix: "Re-baixar voo satélite (geocode)",
    });
  }

  const provider = String(props.map_provider || "").toLowerCase();
  const isCesium = provider === "cesium";
  const isBlender = provider === "blender";

  if (!isBlender && keyframes.length < MIN_CITY_KEYFRAMES) {
    issues.push({
      code: "insufficient_keyframes",
      severity: "critical",
      message: isCesium
        ? `Apenas ${keyframes.length} nível(is) de zoom — descida Cesium curta`
        : `Apenas ${keyframes.length} tile(s) — descida não fica suave`,
      proposed_fix: isCesium
        ? "Re-planejar location-intro (5+ zooms virtuais)"
        : "Re-baixar sequência satélite completa (5+ zooms)",
    });
  }

  const flyoverRel = String(props.flyover_video || "").trim();
  if (isBlender) {
    if (!flyoverRel) {
      issues.push({
        code: "missing_flyover_video",
        severity: "critical",
        message: "Voo Blender sem MP4 renderizado",
        proposed_fix: "Re-baixar voo satélite (Blender)",
      });
    } else if (projDir && !fileExists(projDir, flyoverRel)) {
      issues.push({
        code: "missing_flyover_file",
        severity: "critical",
        message: `MP4 ausente: ${flyoverRel}`,
        proposed_fix: "Re-renderizar voo no Blender",
      });
    }
  }

  const zoomTo = Number(props.zoom_to) || 14;
  if (placeType === "city" && zoomTo > MAX_CITY_ZOOM_TO) {
    issues.push({
      code: "zoom_too_tight",
      severity: "critical",
      message: `zoom_to=${zoomTo} — cidade e contorno ficam cortados no frame`,
      proposed_fix: `Re-baixar satélite com zoom final ≤ ${MAX_CITY_ZOOM_TO}`,
    });
  }

  if (placeType === "city" && !String(props.boundaryGeoJson || "").trim()) {
    issues.push({
      code: "missing_boundary",
      severity: "critical",
      message: "Cidade sem contorno OSM",
      proposed_fix: "Re-baixar voo satélite com boundary GeoJSON",
    });
  }

  if (!isCesium && !isBlender) {
    for (const kf of keyframes) {
      const rel = String(kf?.image || "").trim();
      if (!rel) {
        issues.push({
          code: "empty_keyframe",
          severity: "critical",
          message: "Keyframe sem imagem",
          proposed_fix: "Re-baixar tiles satélite",
        });
        continue;
      }
      if (projDir && !fileExists(projDir, rel)) {
        issues.push({
          code: "missing_tile_file",
          severity: "critical",
          message: `Arquivo ausente: ${rel}`,
          proposed_fix: "Re-baixar tiles satélite",
        });
      }
    }
  }

  const boundaryRel = String(props.boundaryGeoJson || "").trim();
  if (boundaryRel && projDir && !fileExists(projDir, boundaryRel)) {
    issues.push({
      code: "missing_boundary_file",
      severity: "critical",
      message: `Contorno ausente: ${boundaryRel}`,
      proposed_fix: "Re-baixar boundary OSM",
    });
  }

  if (String(props.fly_mode || "") !== "earth_descent") {
    issues.push({
      code: "wrong_fly_mode",
      severity: "suggestion",
      message: `fly_mode=${props.fly_mode || "?"}`,
      proposed_fix: "Usar earth_descent para descida suave",
    });
  }

  const critical = issues.filter((i) => i.severity === "critical");
  const autoFixable = critical.some((i) =>
    [
      "missing_coords",
      "insufficient_keyframes",
      "zoom_too_tight",
      "missing_boundary",
      "missing_tile_file",
      "missing_boundary_file",
      "empty_keyframe",
    ].includes(i.code)
  );

  return {
    ok: critical.length === 0,
    scene_id: String(scene.id || ""),
    scene_ref: String(scene.scene_ref || ""),
    template_id: "location-intro",
    issues,
    score: Math.max(
      0,
      100 - critical.length * 22 - (issues.length - critical.length) * 4
    ),
    auto_fixable: autoFixable,
  };
}

export function assessKineticTextScene(scene = {}) {
  const props = scene.props || {};
  const issues = [];
  if (!String(props.text || "").trim()) {
    issues.push({
      code: "missing_text",
      severity: "critical",
      message: "kinetic-text sem props.text",
      proposed_fix: "Preencher texto da cena no storyboard",
    });
  }
  if (props.presentation === "pip" || props.layout === "pip") {
    issues.push({
      code: "wrong_layout_metadata",
      severity: "suggestion",
      message: "kinetic-text marcado como PIP — deve ser fullscreen",
      proposed_fix: "layout: fullscreen (evita sobrepor legendas)",
    });
  }
  const critical = issues.filter((i) => i.severity === "critical");
  return {
    ok: critical.length === 0,
    scene_id: String(scene.id || ""),
    scene_ref: String(scene.scene_ref || ""),
    template_id: "kinetic-text",
    issues,
    score: Math.max(0, 100 - critical.length * 30),
    auto_fixable: false,
  };
}

export function normalizeMotionSceneMetadata(scene = {}) {
  const templateId = String(scene.template_id || "");
  const forceFullscreen =
    templateId === "location-intro" || FULLSCREEN_TEMPLATES.has(templateId);
  if (!forceFullscreen) return scene;
  const layout = "fullscreen";
  return {
    ...scene,
    layout,
    props: {
      ...(scene.props || {}),
      layout,
      presentation: "fullscreen",
    },
  };
}

export function assessMotionScene(scene = {}, ctx = {}) {
  const templateId = String(scene.template_id || "");
  if (templateId === "location-intro") {
    return assessLocationIntroScene(scene, ctx);
  }
  if (templateId === "kinetic-text") {
    return assessKineticTextScene(scene);
  }
  return {
    ok: true,
    scene_id: String(scene.id || ""),
    scene_ref: String(scene.scene_ref || ""),
    template_id: templateId,
    issues: [],
    score: 100,
    auto_fixable: false,
  };
}

export function assessMotionScenesPlan(motionScenes = [], projDir = "") {
  const scenes = (Array.isArray(motionScenes) ? motionScenes : []).map((ms) =>
    assessMotionScene(ms, { projDir })
  );
  const failed = scenes.filter((r) => !r.ok);
  const score = scenes.length
    ? Math.round(scenes.reduce((n, r) => n + r.score, 0) / scenes.length)
    : 100;

  return {
    ok: failed.length === 0,
    score,
    checked_at: new Date().toISOString(),
    planner_min_duration: MIN_LOCATION_INTRO_DURATION,
    planner_max_city_zoom: MAX_CITY_ZOOM_TO,
    scenes,
    failed_count: failed.length,
    auto_fixable_ids: scenes
      .filter((r) => !r.ok && r.auto_fixable)
      .map((r) => r.scene_id),
    location_intro_defaults: LOCATION_INTRO_DEFAULTS,
  };
}
