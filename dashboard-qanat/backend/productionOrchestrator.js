/**
 * Orquestração de produção — visual_prompts → motion_scenes + timeline_assets + Timeline Studio.
 * A IA planeja templates Remotion e slots de B-roll; o usuário gera/coloca os assets depois.
 */

import fs from "fs";
import path from "path";
import {
  applyMotionScenesToVisualPrompts,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
} from "./motionScenePlanner.js";
import { enrichMotionScenesWithSatellite } from "./satelliteMapService.js";
import {
  dedupeMotionScenesAgainstOverlays,
  enrichMotionScenesWithLlm,
} from "./motionSceneLlmEnrichment.js";
import {
  loadTimelineStudio,
  mergeMissingBrollFromConfig,
  migrateLegacyToTimelineStudio,
  saveTimelineStudio,
} from "./timelineStudioMigration.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";
import { ensureMotionScenesQuality } from "./motionSceneQualityService.js";
import { normalizeTimelineAssetSlots } from "../shared/timelineAssetDedupe.js";

function readJsonSafe(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function parseSceneOrder(sceneRef = "") {
  const m = String(sceneRef).match(/^(\d+)\.(\d+)$/);
  if (!m) return [999, 999];
  return [Number(m[1]), Number(m[2])];
}

export function inferAssetMediaType(vp = {}) {
  const t = String(vp.type || vp.media_mode || "").toLowerCase();
  if (/vídeo|video|clip|motion|seedance|ltx/.test(t)) return "video";
  return "image";
}

export function buildProductionMetaForVisualPrompt(
  vp = {},
  motionScene = null
) {
  const base = {
    scene_ref: String(vp.scene || vp.scene_ref || "").trim(),
    block: Number(vp.block) || 1,
    broll_type: inferAssetMediaType(vp),
    generate_from_prompt: String(vp.prompt || "").trim(),
    stock_query: String(vp.stock_query || "").trim(),
    data_type: motionScene?.trigger || vp.production?.data_type || null,
    motion_template_id:
      motionScene?.template_id || vp.motion_template_id || null,
    motion_scene_id: motionScene?.id || vp.motion_scene_id || null,
    template_props: motionScene?.props || vp.production?.template_props || null,
  };
  return base;
}

/**
 * Cria/atualiza slots em timeline_assets a partir de visual_prompts (asset vazio = Pendente).
 * Não sobrescreve slots com user_locked ou arquivo já escolhido pelo usuário.
 */
function isRemotionPrimaryScene(vp = {}, motion = null) {
  const mediaMode = String(
    vp.media_mode || motion?.media_mode || ""
  ).toLowerCase();
  return mediaMode === "remotion";
}

function visualPromptAssetPath(vp = {}) {
  const nested = vp.asset;
  if (nested && typeof nested === "object") {
    return String(nested.asset || "").trim();
  }
  return String(vp.asset || "").trim();
}

/** Remove slots vazios de motion (location-intro) que duplicam o bloco no Creator. */
export function pruneMotionOnlyAssetSlots(timelineAssets = {}) {
  const out = {};
  for (const [blockKey, rawSlots] of Object.entries(timelineAssets || {})) {
    const slots = Array.isArray(rawSlots) ? [...rawSlots] : [];
    const hasFilled = slots.some((s) => String(s?.asset || "").trim());
    const pruned = slots.filter((slot) => {
      if (String(slot?.asset || "").trim()) return true;
      if (slot?.user_locked) return true;
      if (!slot?.motion_template_id && !slot?.motion_scene_id) return true;
      if (!hasFilled) return true;
      return false;
    });
    if (pruned.length) out[blockKey] = pruned;
  }
  return out;
}

export function buildTimelineAssetSlotsFromVisualPrompts(
  visualPrompts = [],
  existingTimelineAssets = {},
  motionScenes = []
) {
  const motionByRef = new Map(
    (Array.isArray(motionScenes) ? motionScenes : [])
      .filter((ms) => ms?.scene_ref)
      .map((ms) => [String(ms.scene_ref), ms])
  );

  const merged = { ...existingTimelineAssets };

  for (const vp of visualPrompts) {
    const blockKey = String(Number(vp.block) || 1);
    const sceneRef = String(vp.scene || vp.scene_ref || "").trim();
    if (!sceneRef) continue;

    if (!merged[blockKey]) merged[blockKey] = [];
    const slots = [...merged[blockKey]];
    const idx = slots.findIndex((s) => String(s?.scene_ref || "") === sceneRef);
    const prev = idx >= 0 ? slots[idx] : null;
    const motion = motionByRef.get(sceneRef) || null;
    const production = buildProductionMetaForVisualPrompt(vp, motion);
    const vpAsset = visualPromptAssetPath(vp);
    const remotionPrimary = isRemotionPrimaryScene(vp, motion);

    if (prev?.user_locked) {
      slots[idx] = {
        ...prev,
        production,
        generation_prompt:
          prev.generation_prompt || production.generate_from_prompt,
      };
      merged[blockKey] = slots;
      continue;
    }

    if (prev?.asset && String(prev.asset).trim()) {
      slots[idx] = {
        ...prev,
        production,
        narration_segment:
          prev.narration_segment || String(vp.narration_text || "").trim(),
        generation_prompt:
          prev.generation_prompt || production.generate_from_prompt,
      };
      merged[blockKey] = slots;
      continue;
    }

    if (vpAsset) {
      const orphanIdx = slots.findIndex(
        (s) =>
          !String(s?.scene_ref || "").trim() &&
          String(s?.asset || "").trim() === vpAsset
      );
      if (orphanIdx >= 0) {
        slots[orphanIdx] = {
          ...slots[orphanIdx],
          scene_ref: sceneRef,
          production,
          narration_segment:
            slots[orphanIdx].narration_segment ||
            String(vp.narration_text || "").trim(),
          generation_prompt:
            slots[orphanIdx].generation_prompt ||
            production.generate_from_prompt,
        };
        if (
          idx >= 0 &&
          idx !== orphanIdx &&
          !String(prev?.asset || "").trim()
        ) {
          slots.splice(idx, 1);
        }
        merged[blockKey] = slots;
        continue;
      }
    }

    if (remotionPrimary && !vpAsset) {
      if (idx >= 0) {
        slots[idx] = {
          ...prev,
          production,
          motion_scene_id: production.motion_scene_id,
          motion_template_id: production.motion_template_id,
        };
        merged[blockKey] = slots;
      }
      continue;
    }

    const slot = {
      scene_ref: sceneRef,
      asset: "",
      type: production.broll_type,
      narration_segment: String(vp.narration_text || "").trim(),
      generation_prompt: production.generate_from_prompt,
      stock_query: production.stock_query,
      editor_notes: String(vp.editor_notes || "").trim(),
      orchestrated: true,
      orchestrated_at: new Date().toISOString(),
      motion_scene_id: production.motion_scene_id,
      motion_template_id: production.motion_template_id,
      production,
    };

    if (idx >= 0) slots[idx] = { ...prev, ...slot };
    else slots.push(slot);

    slots.sort((a, b) => {
      const [ab, as] = parseSceneOrder(a.scene_ref);
      const [bb, bs] = parseSceneOrder(b.scene_ref);
      return ab !== bb ? ab - bb : as - bs;
    });
    merged[blockKey] = slots;
  }

  return merged;
}

export function attachProductionToVisualPrompts(
  storyboard = {},
  motionScenes = []
) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const byRef = new Map(
    scenes.filter((ms) => ms.scene_ref).map((ms) => [String(ms.scene_ref), ms])
  );
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts.map((vp) => {
        const ref = String(vp.scene || vp.scene_ref || "").trim();
        const ms = ref ? byRef.get(ref) : null;
        const production = buildProductionMetaForVisualPrompt(vp, ms);
        return { ...vp, production };
      })
    : [];
  return { ...storyboard, visual_prompts: visualPrompts };
}

/**
 * Pipeline completo: motion scenes + slots de assets + sync Timeline Studio.
 */
export async function orchestrateProduction(
  projDir,
  { workspaceDir = "", callGemini, getApiKey, parseAiJson } = {},
  {
    useLlm = false,
    fetchSatellite = true,
    syncTimeline = true,
    rebuildAssetSlots = true,
    persist = true,
  } = {}
) {
  const storyboardPath = path.join(projDir, "storyboard.json");
  const configPath = path.join(projDir, "config_qanat.json");
  let storyboard = readJsonSafe(storyboardPath, {}) || {};
  let config = readJsonSafe(configPath, {}) || {};
  const workspaceConfig = readJsonSafe(
    path.join(workspaceDir, "config_qanat.json"),
    {}
  );
  const blockTimings = readJsonSafe(
    path.join(projDir, "block_timings.json"),
    {}
  );

  if (
    !Array.isArray(storyboard.visual_prompts) ||
    storyboard.visual_prompts.length === 0
  ) {
    return {
      ok: false,
      reason: "no_visual_prompts",
      storyboard,
      config,
    };
  }

  let plan = planMotionScenesFromStoryboard(storyboard, config, blockTimings);
  let llmMeta = null;

  if (useLlm && callGemini && getApiKey && parseAiJson) {
    const llmResult = await enrichMotionScenesWithLlm(plan, {
      storyboard,
      config,
      overlaysAi: storyboard.overlays_ai || [],
      callGemini,
      getApiKey,
      projDir,
      parseAiJson,
    });
    plan = llmResult.plan;
    llmMeta = llmResult.llm;
  }

  const deduped = dedupeMotionScenesAgainstOverlays(
    plan.motion_scenes,
    storyboard.overlays_ai || []
  );
  if (deduped.removed.length) {
    plan = {
      ...plan,
      motion_scenes: deduped.scenes,
      dedupe_removed: deduped.removed,
    };
  }

  let satelliteMeta = null;
  if (fetchSatellite && plan.motion_scenes.length > 0) {
    const enriched = await enrichMotionScenesWithSatellite(
      projDir,
      plan.motion_scenes,
      { config, workspaceConfig }
    );
    plan = { ...plan, motion_scenes: enriched.motion_scenes };
    satelliteMeta = {
      enriched: enriched.enriched,
      results: enriched.results,
    };
  }

  let qualityMeta = null;
  if (plan.motion_scenes.length > 0) {
    const qc = await ensureMotionScenesQuality(projDir, plan.motion_scenes, {
      config,
      workspaceConfig,
      autoFix: true,
      maxPasses: 2,
    });
    plan = { ...plan, motion_scenes: qc.motion_scenes };
    qualityMeta = {
      ok: qc.quality.ok,
      score: qc.quality.score,
      failed_count: qc.quality.failed_count,
      auto_fixed: qc.auto_fixed,
      remediation: qc.remediation,
      scenes: qc.quality.scenes,
      checked_at: qc.quality.checked_at,
    };
    if (qc.auto_fixed) {
      satelliteMeta = {
        ...(satelliteMeta || {}),
        qc_refetch: true,
      };
    }
  }

  storyboard = applyMotionScenesToVisualPrompts(
    { ...storyboard, motion_scenes: plan.motion_scenes },
    plan.motion_scenes
  );
  storyboard = attachProductionToVisualPrompts(storyboard, plan.motion_scenes);

  let timelineAssets = config.timeline_assets || {};
  if (rebuildAssetSlots) {
    const built = buildTimelineAssetSlotsFromVisualPrompts(
      storyboard.visual_prompts,
      timelineAssets,
      plan.motion_scenes
    );
    timelineAssets = normalizeTimelineAssetSlots(built, {
      pruneMotionOnly: pruneMotionOnlyAssetSlots,
    }).timeline;
    config = { ...config, timeline_assets: timelineAssets };
  }

  storyboard.motion_scenes = plan.motion_scenes;
  storyboard.motion_scenes_meta = {
    ...(storyboard.motion_scenes_meta || {}),
    planned_at: plan.planned_at,
    planner_version: plan.planner_version,
    source: plan.source,
    niche_pack: plan.niche_pack,
    llm: llmMeta,
    dedupe_removed: plan.dedupe_removed || llmMeta?.dedupe_removed || [],
    satellite: satelliteMeta,
    quality: qualityMeta,
  };

  const slotCount = Object.values(timelineAssets).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const pendingSlots = Object.values(timelineAssets).reduce((n, arr) => {
    if (!Array.isArray(arr)) return n;
    return n + arr.filter((s) => !String(s?.asset || "").trim()).length;
  }, 0);

  storyboard.production_orchestration = {
    orchestrated_at: new Date().toISOString(),
    motion_scene_count: plan.motion_scenes.length,
    asset_slot_count: slotCount,
    pending_asset_slots: pendingSlots,
    version: 1,
  };

  let studio = null;
  let timelineSynced = false;

  if (syncTimeline && plan.motion_scenes.length > 0) {
    migrateLegacyToTimelineStudio(projDir, { force: false });
    const { studio: rawStudio } = loadTimelineStudio(projDir);
    let nextStudio = syncMotionScenesToStudio(rawStudio, plan.motion_scenes);
    nextStudio = mergeMissingBrollFromConfig(nextStudio, config, blockTimings);
    nextStudio = upsertMusicClipInStudio(nextStudio, config, projDir);
    studio = saveTimelineStudio(projDir, nextStudio);
    timelineSynced = true;
  }

  if (persist) {
    writeJson(storyboardPath, storyboard);
    writeJson(configPath, config);
  }

  return {
    ok: true,
    storyboard,
    config,
    timeline_assets: timelineAssets,
    motion_scenes: plan.motion_scenes,
    studio,
    timeline_synced: timelineSynced,
    production: storyboard.production_orchestration,
    llm: llmMeta,
    satellite: satelliteMeta,
    quality: qualityMeta,
  };
}
