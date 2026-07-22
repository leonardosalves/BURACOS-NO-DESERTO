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
  purgeLegacyStoryboardRemotion,
  finalizeStudioForDisk,
  applyNarrationSyncToProject,
  syncStudioTimingToStoryboard,
  syncStudioBrollToTimelineAssets,
} from "./timelineStudioMigration.js";
import {
  searchTimelineStock,
  importTimelineStock,
  buildStockVideoClip,
} from "./timelineStudioStock.js";
import {
  listNichePackCatalog,
  buildStudioCatalogMotionClip,
  buildShotcraftOverlayClip,
  studioMotionClipToMotionScene,
} from "./timelineStudioNichePacks.js";
import { MOTION_TRACK_ID } from "../shared/motionSceneCatalog.js";
import {
  ensureMotionClipForProject,
  writeMotionClipSidecar,
} from "./motionFlyoverUpload.js";
import { enrichStudioTemplateScene } from "../shared/studioTemplatePropsBinder.js";
import { buildGeoPipOverlayStudioProps } from "../shared/geoPipSceneText.js";
import { handleTimelineStudioAsk } from "./timelineStudioAsk.js";
import { renderTimelineStudioFinalFrame } from "./timelineStudioFinalFrame.js";
import { stripSuppressedRemotionClips } from "../shared/timelineStudioRemotionSuppress.js";
import {
  isRunnableStudioMotionScene,
  stripLegacyStudioOverlayClips,
} from "../shared/timelineStudioLegacyStrip.js";
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
  { getProjectDir, getProjectContext, workspaceDir, callGemini }
) {
  app.get("/api/timeline-studio", (req, res) => {
    try {
      const projectCtx = getProjectContext
        ? getProjectContext(req)
        : {
            requestedName: "",
            resolved: true,
            resolvedName: null,
            fallbackWorkspace: false,
            projDir: getProjectDir(req),
          };
      const projDir = projectCtx.projDir;
      const light =
        req.query.light === "1" ||
        String(req.query.sync || "").toLowerCase() === "0";
      const {
        studio: rawStudio,
        migrated,
        motionMigrated,
      } = loadTimelineStudio(projDir);
      const narrationSync = applyNarrationSyncToProject(projDir, rawStudio);
      let studio = light
        ? stripSuppressedRemotionClips(narrationSync.studio)
        : syncStudioMusicFromConfig(narrationSync.studio, projDir);
      const narrationSynced = Boolean(narrationSync.changed);
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
            let storyboard = JSON.parse(
              fs.readFileSync(storyboardPath, "utf8")
            );
            const storyboardPurged = purgeLegacyStoryboardRemotion(storyboard);
            if (storyboardPurged.changed) {
              storyboard = storyboardPurged.storyboard;
              fs.writeFileSync(
                storyboardPath,
                JSON.stringify(storyboard, null, 2),
                "utf8"
              );
            }
            const motionInStoryboard = (storyboard.motion_scenes || []).length;
            const motionInStudio = (studio.clips || []).filter(
              (c) => c?.trackId === "motion"
            ).length;
            if (motionInStoryboard > 0 && motionInStudio === 0) {
              studio = {
                ...studio,
                suppressedMotionSceneIds: [],
                suppressedRemotionFingerprints: [],
              };
            }
            pruneStoryboardRemotionSources(projDir, studio);
            const hasRemotionSource = (storyboard.motion_scenes || []).some(
              (ms) => isRunnableStudioMotionScene(ms)
            );
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
              const beforeSuppressed = JSON.stringify({
                ids: studio.suppressedMotionSceneIds || [],
                fps: studio.suppressedRemotionFingerprints || [],
              });
              const remotionMerged = mergeRemotionFromStoryboard(
                studio,
                storyboard
              );
              remotionRestored = Number(remotionMerged.remotionRestored) || 0;
              motionSynced = Number(remotionMerged.motionSynced) || 0;
              studio = stripSuppressedRemotionClips(remotionMerged.studio);
              const afterFp = remotionFingerprint(studio.clips);
              const afterSuppressed = JSON.stringify({
                ids: studio.suppressedMotionSceneIds || [],
                fps: studio.suppressedRemotionFingerprints || [],
              });
              if (
                afterFp !== beforeFp ||
                afterSuppressed !== beforeSuppressed ||
                remotionRestored > 0 ||
                motionSynced > 0
              ) {
                remotionChanged = true;
              }
            } else {
              studio = stripSuppressedRemotionClips(studio);
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
        if (
          musicChanged ||
          brollRestored > 0 ||
          remotionChanged ||
          narrationSynced
        ) {
          saveTimelineStudio(projDir, studio);
        }
      } else if (narrationSynced) {
        saveTimelineStudio(projDir, studio);
      }

      const legacyStrip = stripLegacyStudioOverlayClips(studio.clips || []);
      let legacyStripped = 0;
      if (legacyStrip.removed > 0) {
        studio = { ...studio, clips: legacyStrip.clips };
        legacyStripped = legacyStrip.removed;
        saveTimelineStudio(projDir, studio);
      }

      const timingSync = syncStudioTimingToStoryboard(projDir, studio);
      const brollSync = syncStudioBrollToTimelineAssets(projDir, studio);

      res.json({
        ok: true,
        studio,
        migrated,
        motionMigrated: Boolean(motionMigrated),
        light,
        musicSynced: musicChanged,
        narrationSynced,
        brollRestored,
        remotionRestored,
        motionSynced,
        legacyStripped,
        motion_scenes: timingSync.motion_scenes,
        motion_scenes_synced: timingSync.changed,
        timeline_assets: brollSync.timeline_assets,
        timeline_assets_synced: brollSync.changed,
        projectResolved: projectCtx.resolved !== false,
        requestedProject: projectCtx.requestedName || null,
        resolvedProject: projectCtx.resolvedName || null,
        projectFallbackWorkspace: Boolean(projectCtx.fallbackWorkspace),
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
      const withNarration = applyNarrationSyncToProject(projDir, studio).studio;
      const synced = syncStudioMusicFromConfig(withNarration, projDir);
      const legacyStrip = stripLegacyStudioOverlayClips(synced.clips || []);
      const strippedStudio =
        legacyStrip.removed > 0
          ? { ...synced, clips: legacyStrip.clips }
          : synced;
      const saved = finalizeStudioForDisk(projDir, strippedStudio, {
        previousStudio,
        mergeStoryboard: false,
      });
      const timingSync = syncStudioTimingToStoryboard(projDir, saved);
      const brollSync = syncStudioBrollToTimelineAssets(projDir, saved);
      res.json({
        ok: true,
        studio: saved,
        motion_scenes: timingSync.motion_scenes,
        motion_scenes_synced: timingSync.changed,
        timeline_assets: brollSync.timeline_assets,
        timeline_assets_synced: brollSync.changed,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/remigrate", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { studio: before } = loadTimelineStudio(projDir);
      const suppressions = {
        suppressedMotionSceneIds: before?.suppressedMotionSceneIds || [],
        suppressedRemotionFingerprints:
          before?.suppressedRemotionFingerprints || [],
      };
      const { migrated } = migrateLegacyToTimelineStudio(projDir, {
        force: true,
      });
      const { studio, motionMigrated } = loadTimelineStudio(projDir);
      const withSuppressions = {
        ...studio,
        ...suppressions,
      };
      const synced = syncStudioMusicFromConfig(withSuppressions, projDir);
      const saved = finalizeStudioForDisk(projDir, synced, {
        mergeStoryboard: false,
      });
      res.json({
        ok: true,
        studio: saved,
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
      const projDir = getProjectDir(req);
      const { templateId, playhead, props, label, duration } = req.body || {};
      if (!templateId) {
        return res.status(400).json({ error: "templateId é obrigatório" });
      }
      const safeProps = props && typeof props === "object" ? props : {};
      const studioSource = String(safeProps.studio_source_code || "").trim();
      const isShotcraft =
        Boolean(safeProps.shotcraft) ||
        Boolean(safeProps.shotcraft_template_id) ||
        Boolean(safeProps.motion_shot?.templateId) ||
        String(safeProps.media_mode || "") === "shotcraft";

      let clip = null;
      if (studioSource) {
        clip = buildStudioCatalogMotionClip({
          templateId: String(templateId),
          playhead: Number(playhead) || 0,
          props: safeProps,
          label: label ? String(label) : undefined,
          duration,
        });
      } else if (isShotcraft) {
        clip = buildShotcraftOverlayClip({
          templateId: String(
            safeProps.shotcraft_template_id ||
              safeProps.motion_shot?.templateId ||
              templateId
          ),
          playhead: Number(playhead) || 0,
          props: safeProps,
          label: label ? String(label) : undefined,
          duration,
          palette: safeProps.palette,
        });
      } else {
        return res.status(400).json({
          error:
            "Informe studio_source_code (Template Studio) ou shotcraft/motion_shot (Editor do Lumiera / video-shotcraft).",
        });
      }
      if (!clip) {
        return res.status(400).json({
          error:
            "Template invalido (sem sourceCode, shotcraft id ou templateId).",
        });
      }

      const config = readProjectConfig(projDir);
      const aspectRatio = String(
        config.aspect_ratio || safeProps.aspect_ratio || "16:9"
      ).trim();
      const isShort = aspectRatio === "9:16";

      const { studio: rawStudio } = loadTimelineStudio(projDir);
      let clips = Array.isArray(rawStudio.clips) ? [...rawStudio.clips] : [];
      if (isShort) {
        clips = clips.filter((c) => c.trackId !== MOTION_TRACK_ID);
      }
      clips.push(clip);

      let totalDuration = Number(rawStudio.totalDuration) || 120;
      for (const c of clips) {
        const end = (Number(c.start) || 0) + (Number(c.duration) || 0);
        if (end > totalDuration) totalDuration = end;
      }

      let studio = {
        ...rawStudio,
        clips,
        totalDuration,
        updatedAt: new Date().toISOString(),
      };
      studio = syncStudioMusicFromConfig(studio, projDir);

      const storyboardPath = path.join(projDir, "storyboard.json");
      let storyboard = {};
      if (fs.existsSync(storyboardPath)) {
        storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      }

      if (safeProps.geo_pip_composite) {
        const geoScene = (storyboard.motion_scenes || []).find(
          (ms) =>
            Boolean(
              String(ms?.props?.location || ms?.props?.country || "").trim()
            ) || Boolean(String(ms?.narration_text || "").trim())
        );
        const narration = String(
          geoScene?.narration_text || safeProps.narration_text || ""
        ).trim();
        const dataSlots = Array.isArray(safeProps.template_studio_data_slots)
          ? safeProps.template_studio_data_slots
          : [];
        const overlay = buildGeoPipOverlayStudioProps(
          { ...safeProps, ...(geoScene?.props || {}) },
          { narration, dataSlots }
        );
        clip = {
          ...clip,
          props: {
            ...clip.props,
            ...overlay.studio_props,
            studio_props: {
              ...(clip.props?.studio_props || {}),
              ...overlay.studio_props,
            },
            referencePoint: overlay.referencePoint,
            scene_subject: overlay.scene_subject,
            narration_text: narration || clip.props?.narration_text,
            location:
              safeProps.location ||
              geoScene?.props?.location ||
              overlay.referencePoint,
            country: safeProps.country || geoScene?.props?.country,
          },
        };
      }

      let motionScene = studioMotionClipToMotionScene(clip);
      motionScene = enrichStudioTemplateScene(motionScene, { config });
      if (motionScene.props) {
        clip = {
          ...clip,
          props: { ...clip.props, ...motionScene.props },
          duration:
            Number(motionScene.duration_seconds) > 0
              ? Number(motionScene.duration_seconds)
              : clip.duration,
        };
      }
      const clipIdx = clips.findIndex((c) => String(c?.id || "") === clip.id);
      if (clipIdx >= 0) clips[clipIdx] = clip;
      studio = { ...studio, clips };
      if (isShort) {
        storyboard.motion_scenes = [motionScene];
      } else {
        const existing = Array.isArray(storyboard.motion_scenes)
          ? storyboard.motion_scenes
          : [];
        storyboard.motion_scenes = [
          ...existing.filter((ms) => String(ms?.id || "") !== clip.id),
          motionScene,
        ];
      }
      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );

      const saved = saveTimelineStudio(projDir, studio);
      writeMotionClipSidecar(projDir, clip);
      res.json({ ok: true, clip, studio: saved, motion_scene: motionScene });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timeline-studio/motion-clip/ensure", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const clip = req.body?.clip;
      if (!clip || typeof clip !== "object" || !clip.id) {
        return res
          .status(400)
          .json({ error: "Campo clip com id é obrigatório." });
      }
      const result = ensureMotionClipForProject(projDir, clip);
      res.json({ ok: true, ...result });
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

  app.post("/api/timeline-studio/final-frame", async (req, res) => {
    try {
      const projectCtx = getProjectContext
        ? getProjectContext(req)
        : {
            requestedName: "",
            resolved: true,
            resolvedName: null,
            fallbackWorkspace: false,
            projDir: getProjectDir(req),
          };
      const projDir = projectCtx.projDir;
      const result = await renderTimelineStudioFinalFrame({
        projectDir: projDir,
        playhead: Number(req.body?.playhead) || 0,
        resolution: req.body?.resolution === "2k" ? "2k" : "1080p",
      });
      const projectName = projectCtx.resolvedName || path.basename(projDir);
      res.json({
        ...result,
        projectName,
        url: `/api/projects-media/${encodeURIComponent(projectName)}/${result.relPath
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/")}`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
