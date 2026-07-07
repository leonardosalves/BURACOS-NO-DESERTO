/**
 * API — planejamento e sync de motion scenes (cenas Remotion)
 */

import fs from "fs";
import path from "path";
import {
  applyMotionScenesToVisualPrompts,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
} from "./motionScenePlanner.js";
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
} from "./timelineStudioMigration.js";
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
      if (!result.ok) {
        return res.status(400).json(result);
      }
      res.json({
        ok: true,
        motion_count: result.motion_scenes?.length || 0,
        pending_assets: result.production?.pending_asset_slots || 0,
        timeline_synced: result.timeline_synced,
        production: result.production,
        storyboard: result.storyboard,
        config: { timeline_assets: result.timeline_assets },
        studio: result.studio,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/creator/plan-motion-scenes", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const persist = req.body?.persist !== false;
      const fetchSatellite = req.body?.fetch_satellite !== false;
      const useLlm = req.body?.use_llm !== false;
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const workspaceConfig = readJsonSafe(
        path.join(workspaceDir, "config_qanat.json"),
        {}
      );
      const blockTimings = readJsonSafe(
        path.join(projDir, "block_timings.json"),
        {}
      );

      let plan = planMotionScenesFromStoryboard(
        storyboard,
        config,
        blockTimings
      );

      let llmMeta = null;
      if (useLlm) {
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
        const enriched = await enrichMotionScenesWithAssets(
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
        const qc = await ensureMotionScenesQuality(
          projDir,
          plan.motion_scenes,
          {
            config,
            workspaceConfig,
          }
        );
        plan = { ...plan, motion_scenes: qc.motion_scenes };
        qualityMeta = {
          ok: qc.quality.ok,
          score: qc.quality.score,
          failed_count: qc.quality.failed_count,
          auto_fixed: qc.auto_fixed,
          scenes: qc.quality.scenes,
          checked_at: qc.quality.checked_at,
        };
      }

      if (persist) {
        const nextStoryboard = applyMotionScenesToVisualPrompts(
          {
            ...storyboard,
            motion_scenes: plan.motion_scenes,
          },
          plan.motion_scenes
        );
        nextStoryboard.motion_scenes_meta = {
          planned_at: plan.planned_at,
          planner_version: plan.planner_version,
          source: plan.source,
          niche_pack: plan.niche_pack,
          llm: llmMeta,
          dedupe_removed: plan.dedupe_removed || llmMeta?.dedupe_removed || [],
          satellite: satelliteMeta,
          quality: qualityMeta,
        };
        fs.writeFileSync(
          path.join(projDir, "storyboard.json"),
          JSON.stringify(nextStoryboard, null, 2),
          "utf8"
        );
      }

      res.json({
        ok: true,
        count: plan.motion_scenes.length,
        ...plan,
        llm: llmMeta,
        satellite: satelliteMeta,
        quality: qualityMeta,
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
        !studioNeedsMotionOrchestration(rawStudio.clips || [], storyboard) &&
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
        let plan = planMotionScenesFromStoryboard(
          storyboard,
          config,
          blockTimings
        );
        if (useLlm) {
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
        }
        motionScenes = plan.motion_scenes || [];
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

      let studio = syncMotionScenesToStudio(rawStudio, qc.motion_scenes);
      const overlayMerged = mergeRemotionFromStoryboard(studio, storyboard, {
        syncMotion: false,
      });
      studio = overlayMerged.studio;
      studio = mergeMissingBrollFromConfig(studio, config, blockTimings);
      studio = upsertMusicClipInStudio(studio, config, projDir);
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
      let studio = syncMotionScenesToStudio(rawStudio, motionScenes);
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
}
