/**
 * API Timeline Studio — GET/PUT timeline_studio.json + stock Pexels/Pixabay
 */

import {
  saveTimelineStudio,
  loadTimelineStudio,
} from "./timelineStudioMigration.js";
import {
  searchTimelineStock,
  importTimelineStock,
  buildStockVideoClip,
} from "./timelineStudioStock.js";
import {
  listNichePackCatalog,
  buildStudioOverlayClip,
} from "./timelineStudioNichePacks.js";
import { handleTimelineStudioAsk } from "./timelineStudioAsk.js";
import fs from "fs";
import path from "path";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";

function readProjectConfig(projDir) {
  try {
    const configPath = path.join(projDir, "config_qanat.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return {};
}

function musicClipSnapshot(studio) {
  const clip = studio?.clips?.find((c) => c?.trackId === "music");
  if (!clip) return null;
  return {
    source: String(clip.source || ""),
    label: String(clip.label || ""),
    duration: Number(clip.duration) || 0,
    volume: Number(clip.props?.volume) || 0,
  };
}

function syncStudioMusicFromConfig(rawStudio, projDir) {
  const config = readProjectConfig(projDir);
  return upsertMusicClipInStudio(rawStudio, config, projDir);
}

export function registerTimelineStudioRoutes(
  app,
  { getProjectDir, workspaceDir, callGemini }
) {
  app.get("/api/timeline-studio", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const {
        studio: rawStudio,
        migrated,
        motionMigrated,
      } = loadTimelineStudio(projDir);
      const studio = syncStudioMusicFromConfig(rawStudio, projDir);
      const musicChanged =
        JSON.stringify(musicClipSnapshot(rawStudio)) !==
        JSON.stringify(musicClipSnapshot(studio));
      if (musicChanged) {
        saveTimelineStudio(projDir, studio);
      }
      res.json({
        ok: true,
        studio,
        migrated,
        motionMigrated: Boolean(motionMigrated),
        musicSynced: musicChanged,
      });
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
      const synced = syncStudioMusicFromConfig(studio, projDir);
      const saved = saveTimelineStudio(projDir, synced);
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

  app.get("/api/timeline-studio/niche-packs", (_req, res) => {
    try {
      res.json({ ok: true, packs: listNichePackCatalog() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/template/insert", (req, res) => {
    try {
      const { templateId, playhead, props, label } = req.body || {};
      if (!templateId) {
        return res.status(400).json({ error: "templateId é obrigatório" });
      }
      const clip = buildStudioOverlayClip({
        templateId: String(templateId),
        playhead: Number(playhead) || 0,
        props: props && typeof props === "object" ? props : {},
        label: label ? String(label) : undefined,
      });
      if (!clip) {
        return res
          .status(400)
          .json({ error: `Template desconhecido: ${templateId}` });
      }
      res.json({ ok: true, clip });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/ask", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { message, playhead, niche_pack, prefer_llm } = req.body || {};
      if (!String(message || "").trim()) {
        return res.status(400).json({ error: "Campo message é obrigatório" });
      }

      const result = await handleTimelineStudioAsk({
        message: String(message).trim(),
        playhead: Number(playhead) || 0,
        nichePack: String(niche_pack || "documentary-prestige"),
        callGemini,
        projDir,
        preferLlm: prefer_llm !== false,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
