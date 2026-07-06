/**
 * API — planejamento e sync de motion scenes (cenas Remotion)
 */

import fs from "fs";
import path from "path";
import {
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
} from "./motionScenePlanner.js";
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

export function registerMotionSceneRoutes(app, { getProjectDir }) {
  app.post("/api/ai/creator/plan-motion-scenes", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const persist = req.body?.persist !== false;
      const storyboard = readJsonSafe(
        path.join(projDir, "storyboard.json"),
        {}
      );
      const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
      const blockTimings = readJsonSafe(
        path.join(projDir, "block_timings.json"),
        {}
      );

      const plan = planMotionScenesFromStoryboard(
        storyboard,
        config,
        blockTimings
      );

      if (persist) {
        const nextStoryboard = {
          ...storyboard,
          motion_scenes: plan.motion_scenes,
          motion_scenes_meta: {
            planned_at: plan.planned_at,
            planner_version: plan.planner_version,
            source: plan.source,
            niche_pack: plan.niche_pack,
          },
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
        persisted: persist,
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
