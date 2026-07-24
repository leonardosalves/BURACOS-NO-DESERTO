/**
 * API — planejamento e sync de motion scenes (cenas Remotion)
 */

import fs from "fs";
import path from "path";
import {
  applyMotionScenesToVisualPrompts,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
  unsuppressMotionSceneIds,
} from "./motionScenePlanner.js";
import { MOTION_TRACK_ID } from "../shared/motionSceneCatalog.js";
import { enrichMotionScenesWithAssets } from "./motionSceneAssetService.js";
import {
  resolveMotionScenesForEnrichment,
  studioNeedsMotionOrchestration,
} from "../shared/motionSceneAssetEnrichment.js";
import {
  dedupeMotionScenesAgainstOverlays,
  enrichMotionScenesWithLlm,
} from "./motionSceneLlmEnrichment.js";
import {
  loadTimelineStudio,
  mergeMissingBrollFromConfig,
  mergeRemotionFromStoryboard,
  saveTimelineStudio,
  syncStudioTimingToStoryboard,
} from "./timelineStudioMigration.js";
import { stripSuppressedRemotionClips } from "../shared/timelineStudioRemotionSuppress.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";
import { orchestrateProduction } from "./productionOrchestrator.js";
import { ensureMotionScenesQuality } from "./motionSceneQualityService.js";
import { assessMotionScenesPlan } from "../shared/motionSceneQuality.js";

function readJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function registerMotionSceneRoutes(
  app,
  { getProjectDir, workspaceDir, callGemini, getApiKey, parseAiJson }
) {
  app.post("/api/ai/creator/orchestrate-production", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const result = await orchestrateProduction(
        projDir,
        {
          workspaceDir,
          callGemini,
          getApiKey,
          parseAiJson,
        },
        {
          useLlm: req.body?.use_llm !== false,
          fetchSatellite: req.body?.fetch_satellite !== false,
          syncTimeline: req.body?.sync_timeline !== false,
          rebuildAssetSlots: req.body?.rebuild_asset_slots !== false,
          persist: req.body?.persist !== false,
          restoreSuppressedMotion:
            req.body?.restore_suppressed_motion !== false,
        }
      );
      if (result.reason === "no_visual_prompts") {
        return res.status(400).json(result);
      }
      res.json({
        ok: Boolean(result.orchestration_ok),
        orchestration_ok: Boolean(result.orchestration_ok),
        motion_count: result.motion_count ?? result.motion_scenes?.length ?? 0,
        timeline_motion_count: result.timeline_motion_count ?? 0,
        timeline_template_count: result.timeline_template_count ?? 0,
        pending_assets: result.production?.pending_asset_slots || 0,
        timeline_synced: result.timeline_synced,
        production: result.production,
        storyboard: result.storyboard,
        config: { timeline_assets: result.timeline_assets },
        studio: result.studio,
        quality: result.quality,
        review: result.storyboard?.motion_scenes_meta?.review || null,
        satellite: result.satellite,
        llm: result.llm,
        zero_motion_reason: result.zero_motion_reason || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/creator/plan-motion-scenes", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const persist = req.body?.persist !== false;
      const result = await orchestrateProduction(
        projDir,
        {
          workspaceDir,
          callGemini,
          getApiKey,
          parseAiJson,
        },
        {
          useLlm: req.body?.use_llm !== false,
          fetchSatellite: req.body?.fetch_satellite !== false,
          syncTimeline: false,
          rebuildAssetSlots: false,
          persist,
        }
      );
      if (result.reason === "no_visual_prompts") {
        return res.status(400).json(result);
      }
      res.json({
        ok: true,
        count: result.motion_count ?? result.motion_scenes?.length ?? 0,
        motion_scenes: result.motion_scenes,
        niche_pack: result.storyboard?.motion_scenes_meta?.niche_pack,
        planned_at: result.storyboard?.motion_scenes_meta?.planned_at,
        planner_version: result.storyboard?.motion_scenes_meta?.planner_version,
        source: result.storyboard?.motion_scenes_meta?.source,
        review: result.storyboard?.motion_scenes_meta?.review || null,
        llm: result.llm,
        satellite: result.satellite,
        quality: result.quality,
        persisted: persist,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/creator/motion-scenes/satellite", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const workspaceConfig = readJsonSafe(
        path.join(workspaceDir, "config_qanat.json"),
        {}
      );
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      const { studio: rawStudio } = loadTimelineStudio(projDir);
      const motionScenes =
        req.body?.motion_scenes ||
        resolveMotionScenesForEnrichment(storyboard, rawStudio);

      const enriched = await enrichMotionScenesWithAssets(
        projDir,
        motionScenes,
        { config, workspaceConfig }
      );

      const qc = await ensureMotionScenesQuality(
        projDir,
        enriched.motion_scenes,
        { config, workspaceConfig }
      );

      const nextStoryboard = {
        ...storyboard,
        motion_scenes: qc.motion_scenes,
        motion_scenes_meta: {
          ...(storyboard.motion_scenes_meta || {}),
          satellite: {
            enriched: enriched.enriched,
            results: enriched.results,
            at: new Date().toISOString(),
          },
          quality: {
            ok: qc.quality.ok,
            score: qc.quality.score,
            failed_count: qc.quality.failed_count,
            auto_fixed: qc.auto_fixed,
            scenes: qc.quality.scenes,
            checked_at: qc.quality.checked_at,
          },
        },
      };
      fs.writeFileSync(
        path.join(projDir, "storyboard.json"),
        JSON.stringify(nextStoryboard, null, 2),
        "utf8"
      );

      let studio = null;
      if (enriched.enriched > 0 || qc.auto_fixed) {
        const blockTimings = readJsonSafe(
          path.join(projDir, "block_timings.json"),
          {}
        );
        let nextStudio = syncMotionScenesToStudio(rawStudio, qc.motion_scenes);
        nextStudio = mergeMissingBrollFromConfig(
          nextStudio,
          config,
          blockTimings
        );
        nextStudio = upsertMusicClipInStudio(nextStudio, config, projDir);
        studio = saveTimelineStudio(projDir, nextStudio);
      }

      res.json({
        ok: true,
        ...enriched,
        motion_scenes: qc.motion_scenes,
        quality: qc.quality,
        auto_fixed: qc.auto_fixed,
        studio,
        timeline_synced: Boolean(studio),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ai/creator/motion-scenes/quality", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      const motionScenes = storyboard.motion_scenes || [];
      const quality = assessMotionScenesPlan(motionScenes, projDir);
      res.json({ ok: true, quality, motion_count: motionScenes.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/projects/storyboard/motion-scenes", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const motionScenes = req.body?.motion_scenes;
      if (!Array.isArray(motionScenes)) {
        return res
          .status(400)
          .json({ error: "motion_scenes deve ser um array." });
      }
      const storyboardPath = path.join(projDir, "storyboard.json");
      const storyboard = readJsonSafe(storyboardPath, {});
      if (
        !Array.isArray(storyboard.visual_prompts) ||
        storyboard.visual_prompts.length === 0
      ) {
        return res.status(400).json({
          error:
            "Storyboard sem visual_prompts — carregue o roteiro do projeto antes de salvar templates.",
        });
      }
      const normalizedScenes = motionScenes.map((ms) => ({
        ...ms,
        media_mode: ms?.media_mode || "remotion",
      }));
      const next = applyMotionScenesToVisualPrompts(
        { ...storyboard, motion_scenes: normalizedScenes },
        normalizedScenes
      );
      next.motion_scenes_meta = {
        ...(next.motion_scenes_meta || {}),
        edited_at: new Date().toISOString(),
        source: "motion_timeline_editor",
      };
      fs.writeFileSync(storyboardPath, JSON.stringify(next, null, 2), "utf8");

      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const blockTimings = readJsonSafe(
        path.join(projDir, "block_timings.json"),
        {}
      );
      const { studio: rawStudio } = loadTimelineStudio(projDir);
      let studio = unsuppressMotionSceneIds(rawStudio, normalizedScenes);
      studio = {
        ...studio,
        suppressedMotionSceneIds: [],
        suppressedRemotionFingerprints: [],
      };
      studio = syncMotionScenesToStudio(studio, normalizedScenes);
      studio = stripSuppressedRemotionClips(studio);
      studio = mergeMissingBrollFromConfig(studio, config, blockTimings);
      studio = upsertMusicClipInStudio(studio, config, projDir);
      const savedStudio = saveTimelineStudio(projDir, studio);
      const timingSync = syncStudioTimingToStoryboard(projDir, savedStudio);
      const motionScenesOut =
        timingSync.motion_scenes?.length > 0
          ? timingSync.motion_scenes
          : next.motion_scenes;
      const timelineMotionCount = (savedStudio.clips || []).filter(
        (c) => c?.trackId === MOTION_TRACK_ID
      ).length;

      res.json({
        ok: true,
        motion_scenes: motionScenesOut,
        count: motionScenesOut.length,
        saved_at: next.motion_scenes_meta.edited_at,
        timeline_synced: true,
        timeline_motion_count: timelineMotionCount,
        motion_scenes_timing_synced: timingSync.changed,
        studio: savedStudio,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ai/creator/motion-scenes", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      res.json({
        ok: true,
        motion_scenes: storyboard.motion_scenes || [],
        meta: storyboard.motion_scenes_meta || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/auto-orchestrate-motion", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const useLlm = req.body?.use_llm === true;
      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const workspaceConfig = readJsonSafe(
        path.join(workspaceDir, "config_qanat.json"),
        {}
      );
      const blockTimings = readJsonSafe(
        path.join(projDir, "block_timings.json"),
        {}
      );
      let storyboard = readJsonSafe(path.join(projDir, "storyboard.json"), {});
      const { studio: rawStudio } = loadTimelineStudio(projDir);

      if (
        !studioNeedsMotionOrchestration(
          rawStudio.clips || [],
          storyboard,
          rawStudio
        ) &&
        !req.body?.force
      ) {
        return res.json({
          ok: true,
          skipped: true,
          reason: "nothing_to_orchestrate",
          studio: rawStudio,
        });
      }

      let motionScenes = resolveMotionScenesForEnrichment(
        storyboard,
        rawStudio
      );

      if (!motionScenes.length && storyboard.visual_prompts?.length) {
        const orch = await orchestrateProduction(
          projDir,
          {
            workspaceDir,
            callGemini,
            getApiKey,
            parseAiJson,
          },
          {
            useLlm,
            fetchSatellite: true,
            syncTimeline: false,
            rebuildAssetSlots: false,
            persist: true,
          }
        );
        motionScenes = orch.motion_scenes || [];
        storyboard = orch.storyboard || storyboard;
      }

      if (!motionScenes.length) {
        return res.json({
          ok: true,
          skipped: true,
          reason: "no_motion_scenes",
          studio: rawStudio,
        });
      }

      const enriched = await enrichMotionScenesWithAssets(
        projDir,
        motionScenes,
        { config, workspaceConfig }
      );

      const qc = await ensureMotionScenesQuality(
        projDir,
        enriched.motion_scenes,
        { config, workspaceConfig, autoFix: true, maxPasses: 2 }
      );

      storyboard = applyMotionScenesToVisualPrompts(
        { ...storyboard, motion_scenes: qc.motion_scenes },
        qc.motion_scenes
      );
      storyboard.motion_scenes = qc.motion_scenes;
      storyboard.motion_scenes_meta = {
        ...(storyboard.motion_scenes_meta || {}),
        auto_orchestrated_at: new Date().toISOString(),
        assets: {
          enriched: enriched.enriched,
          results: enriched.results,
        },
        quality: {
          ok: qc.quality.ok,
          score: qc.quality.score,
          failed_count: qc.quality.failed_count,
          auto_fixed: qc.auto_fixed,
        },
      };
      fs.writeFileSync(
        path.join(projDir, "storyboard.json"),
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );

      const restoreSuppressed = req.body?.restore_suppressed_motion === true;
      let baseStudio = rawStudio;
      if (restoreSuppressed) {
        baseStudio = unsuppressMotionSceneIds(rawStudio, qc.motion_scenes);
        baseStudio = {
          ...baseStudio,
          suppressedMotionSceneIds: [],
          suppressedRemotionFingerprints: [],
        };
      }
      storyboard.motion_scenes = qc.motion_scenes;
      const overlayMerged = mergeRemotionFromStoryboard(
        baseStudio,
        storyboard,
        {
          syncMotion: true,
        }
      );
      let studio = stripSuppressedRemotionClips(overlayMerged.studio);
      studio = mergeMissingBrollFromConfig(studio, config, blockTimings);
      studio = upsertMusicClipInStudio(studio, config, projDir);
      studio = stripSuppressedRemotionClips(studio);
      const saved = saveTimelineStudio(projDir, studio);

      res.json({
        ok: true,
        motion_count: qc.motion_scenes.length,
        remotion_restored: Number(overlayMerged.remotionRestored) || 0,
        enriched: enriched.enriched,
        results: enriched.results,
        quality: qc.quality,
        auto_fixed: qc.auto_fixed,
        studio: saved,
        motion_scenes: qc.motion_scenes,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/motion-scenes/sync", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const motionScenes =
        req.body?.motion_scenes || storyboard.motion_scenes || [];

      if (!Array.isArray(motionScenes) || motionScenes.length === 0) {
        return res.status(400).json({
          error:
            "Nenhuma motion scene encontrada. Execute plan-motion-scenes primeiro.",
        });
      }

      const blockTimings = readJsonSafe(
        path.join(projDir, "block_timings.json"),
        {}
      );
      const { studio: rawStudio } = loadTimelineStudio(projDir);
      const restoreSuppressed = req.body?.restore_suppressed_motion === true;
      let studio = rawStudio;
      if (restoreSuppressed) {
        studio = unsuppressMotionSceneIds(rawStudio, motionScenes);
        studio = {
          ...studio,
          suppressedMotionSceneIds: [],
          suppressedRemotionFingerprints: [],
        };
      }
      studio = syncMotionScenesToStudio(studio, motionScenes);
      studio = stripSuppressedRemotionClips(studio);
      studio = mergeMissingBrollFromConfig(studio, config, blockTimings);
      studio = upsertMusicClipInStudio(studio, config, projDir);
      const saved = saveTimelineStudio(projDir, studio);

      res.json({
        ok: true,
        synced: motionScenes.length,
        brollRestored: Number(studio.brollRestored) || 0,
        studio: saved,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/creator/render-template-policy/apply", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const policy = req.body?.render_template_policy || {};
      const configPath = path.join(projDir, "config_qanat.json");
      let config = readJsonSafe(configPath, {});
      if (req.body?.persist !== false) {
        config = { ...config, render_template_policy: policy };
        try {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        } catch (err) {
          console.warn(
            "[render-template-policy] Falha ao persistir config:",
            err.message
          );
        }
      }
      res.json({
        ok: true,
        message: "Policy de templates configurada com sucesso",
        injected_count: 0,
        motion_count: 0,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
