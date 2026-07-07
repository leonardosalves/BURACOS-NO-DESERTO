/**
 * API Timeline Studio — GET/PUT timeline_studio.json + stock Pexels/Pixabay
 */

import {
  saveTimelineStudio,
  loadTimelineStudio,
  migrateLegacyToTimelineStudio,
  mergeMissingBrollFromConfig,
  mergeRemotionFromStoryboard,
  pruneStoryboardRemotionSources,
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

function isMotionClip(clip) {
  return (
    clip?.trackId === "motion" ||
    clip?.motionScene ||
    clip?.motionScenePrimary ||
    clip?.props?.media_mode === "remotion" ||
    clip?.props?.motion_scene
  );
}

function isUserDeletableRemotionClip(clip) {
  return (
    isMotionClip(clip) ||
    clip?.trackId === "overlays" ||
    clip?.legacyOverlay ||
    Boolean(clip?.templateId)
  );
}

function mergeDeletedMotionSuppressions(previousStudio, nextStudio) {
  const previousMotionIds = new Set(
    (Array.isArray(previousStudio?.clips) ? previousStudio.clips : [])
      .filter(isUserDeletableRemotionClip)
      .map((clip) => String(clip.id || "").trim())
      .filter(Boolean)
  );
  if (!previousMotionIds.size) return nextStudio;

  const nextIds = new Set(
    (Array.isArray(nextStudio?.clips) ? nextStudio.clips : [])
      .map((clip) => String(clip.id || "").trim())
      .filter(Boolean)
  );
  const suppressed = new Set(
    (Array.isArray(nextStudio?.suppressedMotionSceneIds)
      ? nextStudio.suppressedMotionSceneIds
      : []
    )
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );

  for (const id of previousMotionIds) {
    if (!nextIds.has(id)) suppressed.add(id);
  }

  return { ...nextStudio, suppressedMotionSceneIds: [...suppressed] };
}

export function registerTimelineStudioRoutes(
  app,
  { getProjectDir, workspaceDir, callGemini }
) {
  app.get("/api/timeline-studio", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const light =
        req.query.light === "1" ||
        String(req.query.sync || "").toLowerCase() === "0";
      const {
        studio: rawStudio,
        migrated,
        motionMigrated,
      } = loadTimelineStudio(projDir);
      let studio = light
        ? rawStudio
        : syncStudioMusicFromConfig(rawStudio, projDir);
      const config = readProjectConfig(projDir);
      let brollRestored = 0;
      let remotionRestored = 0;
      let motionSynced = 0;
      let remotionChanged = false;
      let musicChanged = false;

      if (!light) {
        let blockTimings = {};
        try {
          const btPath = path.join(projDir, "block_timings.json");
          if (fs.existsSync(btPath)) {
            blockTimings = JSON.parse(fs.readFileSync(btPath, "utf8"));
          }
        } catch {
          /* ignore */
        }
        const merged = mergeMissingBrollFromConfig(
          studio,
          config,
          blockTimings
        );
        brollRestored = Number(merged.brollRestored) || 0;
        if (brollRestored > 0) studio = merged;

        try {
          const storyboardPath = path.join(projDir, "storyboard.json");
          if (fs.existsSync(storyboardPath)) {
            const storyboard = JSON.parse(
              fs.readFileSync(storyboardPath, "utf8")
            );
            const hasRemotionSource =
              (storyboard.motion_scenes || []).length > 0 ||
              (storyboard.overlays_ai || []).length > 0;
            if (hasRemotionSource) {
              const remotionFingerprint = (clips = []) =>
                JSON.stringify(
                  clips
                    .filter(
                      (c) =>
                        c?.trackId === "motion" || c?.trackId === "overlays"
                    )
                    .map((c) => ({
                      id: c.id,
                      trackId: c.trackId,
                      start: c.start,
                      templateId: c.templateId,
                      props: c.props,
                    }))
                );
              const beforeFp = remotionFingerprint(studio.clips);
              const beforeSuppressed = JSON.stringify(
                studio.suppressedMotionSceneIds || []
              );
              const remotionMerged = mergeRemotionFromStoryboard(
                studio,
                storyboard
              );
              remotionRestored = Number(remotionMerged.remotionRestored) || 0;
              motionSynced = Number(remotionMerged.motionSynced) || 0;
              const afterFp = remotionFingerprint(remotionMerged.studio.clips);
              const afterSuppressed = JSON.stringify(
                remotionMerged.studio.suppressedMotionSceneIds || []
              );
              if (
                afterFp !== beforeFp ||
                afterSuppressed !== beforeSuppressed ||
                remotionRestored > 0 ||
                motionSynced > 0
              ) {
                studio = remotionMerged.studio;
                remotionChanged = true;
              }
            }
          }
        } catch (storyboardErr) {
          console.warn(
            "[timeline-studio] storyboard remotion sync:",
            storyboardErr?.message || storyboardErr
          );
        }

        musicChanged =
          JSON.stringify(musicClipSnapshot(rawStudio)) !==
          JSON.stringify(musicClipSnapshot(studio));
        if (musicChanged || brollRestored > 0 || remotionChanged) {
          saveTimelineStudio(projDir, studio);
        }
      }

      res.json({
        ok: true,
        studio,
        migrated,
        motionMigrated: Boolean(motionMigrated),
        light,
        musicSynced: musicChanged,
        brollRestored,
        remotionRestored,
        motionSynced,
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
      const { studio: previousStudio } = loadTimelineStudio(projDir);
      const withSuppressions = mergeDeletedMotionSuppressions(
        previousStudio,
        studio
      );
      pruneStoryboardRemotionSources(
        projDir,
        withSuppressions.suppressedMotionSceneIds || []
      );
      const synced = syncStudioMusicFromConfig(withSuppressions, projDir);
      const saved = saveTimelineStudio(projDir, synced);
      res.json({ ok: true, studio: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/remigrate", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { migrated } = migrateLegacyToTimelineStudio(projDir, {
        force: true,
      });
      const { studio, motionMigrated } = loadTimelineStudio(projDir);
      const synced = syncStudioMusicFromConfig(studio, projDir);
      const musicChanged =
        JSON.stringify(musicClipSnapshot(studio)) !==
        JSON.stringify(musicClipSnapshot(synced));
      if (musicChanged) {
        saveTimelineStudio(projDir, synced);
      }
      res.json({
        ok: true,
        studio: musicChanged ? synced : studio,
        migrated,
        motionMigrated: Boolean(motionMigrated),
      });
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
