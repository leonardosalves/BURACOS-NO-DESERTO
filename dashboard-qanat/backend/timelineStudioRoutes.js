/**
 * API Timeline Studio — GET/PUT timeline_studio.json + stock Pexels/Pixabay
 */

import {
  loadTimelineStudio,
  saveTimelineStudio,
  migrateLegacyToTimelineStudio,
} from "./timelineStudioMigration.js";
import {
  searchTimelineStock,
  importTimelineStock,
  buildStockVideoClip,
} from "./timelineStudioStock.js";

export function registerTimelineStudioRoutes(
  app,
  { getProjectDir, workspaceDir }
) {
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

  app.get("/api/timeline-studio/stock/search", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const query = String(req.query?.q || req.query?.query || "").trim();
      const mediaType = req.query?.type === "image" ? "image" : "video";
      const provider = ["pexels", "pixabay", "all"].includes(
        req.query?.provider
      )
        ? req.query.provider
        : "all";
      const perPage = Math.min(
        24,
        Math.max(4, Number(req.query?.per_page) || 12)
      );

      const result = await searchTimelineStock({
        workspaceDir,
        projDir,
        query,
        mediaType,
        provider,
        perPage,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/stock/import", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { item, query, playhead, duration } = req.body || {};
      if (!item || typeof item !== "object") {
        return res.status(400).json({ error: "Campo item é obrigatório" });
      }

      const importResult = await importTimelineStock({
        workspaceDir,
        projDir,
        item,
        query,
      });

      const clip = buildStockVideoClip({
        importResult,
        playhead: Number(playhead) || 0,
        duration: duration != null ? Number(duration) : undefined,
      });

      res.json({ ok: true, import: importResult, clip });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
