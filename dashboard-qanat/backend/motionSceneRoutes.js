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
import { enrichMotionScenesWithSatellite } from "./satelliteMapService.js";
import {
  dedupeMotionScenesAgainstOverlays,
  enrichMotionScenesWithLlm,
} from "./motionSceneLlmEnrichment.js";
import {
  loadTimelineStudio,
  saveTimelineStudio,
} from "./timelineStudioMigration.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";

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
      const motionScenes =
        req.body?.motion_scenes || storyboard.motion_scenes || [];

      const enriched = await enrichMotionScenesWithSatellite(
        projDir,
        motionScenes,
        { config, workspaceConfig }
      );

      const nextStoryboard = {
        ...storyboard,
        motion_scenes: enriched.motion_scenes,
        motion_scenes_meta: {
          ...(storyboard.motion_scenes_meta || {}),
          satellite: {
            enriched: enriched.enriched,
            results: enriched.results,
            at: new Date().toISOString(),
          },
        },
      };
      fs.writeFileSync(
        path.join(projDir, "storyboard.json"),
        JSON.stringify(nextStoryboard, null, 2),
        "utf8"
      );

      res.json({ ok: true, ...enriched });
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

      const { studio: rawStudio } = loadTimelineStudio(projDir);
      let studio = syncMotionScenesToStudio(rawStudio, motionScenes);
      studio = upsertMusicClipInStudio(studio, config, projDir);
      const saved = saveTimelineStudio(projDir, studio);

      res.json({
        ok: true,
        synced: motionScenes.length,
        studio: saved,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
