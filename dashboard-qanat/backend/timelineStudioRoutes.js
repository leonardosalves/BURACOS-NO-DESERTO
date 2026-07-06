/**
 * API Timeline Studio — GET/PUT timeline_studio.json
 */

import {
  loadTimelineStudio,
  saveTimelineStudio,
  migrateLegacyToTimelineStudio,
} from "./timelineStudioMigration.js";

export function registerTimelineStudioRoutes(app, { getProjectDir }) {
  app.get("/api/timeline-studio", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { studio, migrated } = loadTimelineStudio(projDir);
      res.json({ ok: true, studio, migrated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/timeline-studio", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const studio = req.body?.studio || req.body;
      if (!studio || typeof studio !== "object") {
        return res
          .status(400)
          .json({ error: "Corpo inválido — esperado { studio: {...} }" });
      }
      const saved = saveTimelineStudio(projDir, studio);
      res.json({ ok: true, studio: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/remigrate", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { studio, migrated } = migrateLegacyToTimelineStudio(projDir, {
        force: true,
      });
      res.json({ ok: true, studio, migrated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
