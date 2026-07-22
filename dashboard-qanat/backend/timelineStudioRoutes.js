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
import { getWorkflowApiKeys } from "./workflowTools.js";
import { resolveStockSearchQuery } from "./stockSearchQuery.js";
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
import {
  ingestLumieraEditorAsset,
  hydrateLumieraEditorFromTimelineStudio,
  loadLumieraEditorProject,
  saveLumieraEditorProject,
} from "./lumieraEditorStorage.js";

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
  app.get("/api/lumiera-editor/project", (req, res) => {
    try {
      const projectDir = getProjectDir(req);
      let project = loadLumieraEditorProject(projectDir);
      let imported = 0;
      if (project) {
        const { studio } = loadTimelineStudio(projectDir);
        const hydrated = hydrateLumieraEditorFromTimelineStudio(
          project,
          studio,
          path.basename(projectDir)
        );
        project = hydrated.project;
        imported = hydrated.imported;
        if (hydrated.changed) project = saveLumieraEditorProject(projectDir, project);
      }
      res.json({ ok: true, project, imported });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/lumiera-editor/project", (req, res) => {
    try {
      const project = saveLumieraEditorProject(
        getProjectDir(req),
        req.body?.project || req.body
      );
      res.json({ ok: true, project });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/lumiera-editor/assets", async (req, res) => {
    const projectDir = getProjectDir(req);
    const projectName = path.basename(projectDir);
    let originalName = String(req.headers["x-file-name"] || "asset.bin");
    try { originalName = decodeURIComponent(originalName); } catch { /* already decoded */ }
    const kind = String(req.headers["x-media-kind"] || "video");
    if (!["video", "audio", "image", "lottie"].includes(kind)) {
      return res.status(400).json({ error: "Tipo de midia invalido" });
    }
    const stagingDir = path.join(projectDir, ".lumiera-ingest");
    fs.mkdirSync(stagingDir, { recursive: true });
    const stagingPath = path.join(
      stagingDir,
      `${Date.now()}-${Math.random().toString(36).slice(2)}.upload`
    );
    const output = fs.createWriteStream(stagingPath, { flags: "wx" });
    let bytes = 0;
    let aborted = false;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 4 * 1024 * 1024 * 1024) {
        aborted = true;
        req.destroy(new Error("Arquivo excede o limite de 4 GB"));
      }
    });
    req.pipe(output);
    output.on("error", (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    output.on("finish", async () => {
      if (aborted) return;
      try {
        const asset = await ingestLumieraEditorAsset({
          projectDir,
          projectName,
          inputPath: stagingPath,
          originalName,
          mimeType: String(req.headers["content-type"] || "application/octet-stream"),
          kind,
          fps: Number(req.query?.fps) || 30,
        });
        res.json({ ok: true, asset });
      } catch (err) {
        try { if (fs.existsSync(stagingPath)) fs.unlinkSync(stagingPath); } catch { /* ignore */ }
        res.status(500).json({ error: err.message });
      }
    });
  });

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

  app.post("/api/timeline-studio/stock/ai-context-query", async (req, res) => {
    try {
      const { narration_text, visual_description, prompt, video_theme } = req.body || {};
      const contextText = [
        narration_text ? `Narração da cena: "${narration_text}"` : "",
        visual_description ? `Descrição visual: "${visual_description}"` : "",
        prompt ? `Prompt visual: "${prompt}"` : "",
        video_theme ? `Tema do vídeo: "${video_theme}"` : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (!contextText.trim()) {
        return res.status(400).json({ error: "Contexto da cena é necessário." });
      }

      const projDir = getProjectDir(req);
      const keys = getWorkflowApiKeys ? getWorkflowApiKeys(workspaceDir, projDir) : {};
      const apiKey = keys.gemini || process.env.GEMINI_API_KEY;

      const systemPrompt = `Você é um curador de banco de imagens/vídeos (Pexels, Pixabay, Bing).
Analise o CONTEXTO SEMÂNTICO COMPLETO da cena a seguir e deduza o assunto visual exato em INGLÊS (2 a 4 palavras) para buscar vídeos/fotos correspondentes.

Exemplo 1:
Narração: "Nossos técnicos, verdadeiros mestres da mecânica, reparam cada máquina."
Resultado: industrial mechanics repairing heavy machinery

Exemplo 2:
Narração: "O navio partiu em direção ao horizonte sob sol forte."
Resultado: cargo ship sailing ocean horizon

Regras:
1. Responda APENAS com a string de busca em inglês (2 a 4 palavras).
2. NUNCA traduza palavra por palavra do português.
3. NUNCA inclua palavras de enquadramento (close up, medium shot, foco, dois).
4. Sem pontuação, sem aspas.`;

      let query = "";
      if (apiKey && typeof callGemini === "function") {
        query = await callGemini(
          apiKey,
          `${systemPrompt}\n\nContexto da cena:\n${contextText}`,
          { maxOutputTokens: 60, temperature: 0.2 }
        );
      }

      query = String(query || "").replace(/["']/g, "").replace(/\n/g, " ").trim();
      if (!query) {
        query = resolveStockSearchQuery(
          { narration_text, visual_description, prompt },
          {}
        );
      }

      res.json({ ok: true, ai_query: query });
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

      let motionScene = null;
      if (isShotcraft && clip.props?.motion_shot) {
        // Shotcraft: grava motion_shot no storyboard (fonte do ShotcraftLayer)
        const shot = clip.props.motion_shot;
        const prompts = Array.isArray(storyboard.visual_prompts)
          ? [...storyboard.visual_prompts]
          : [];
        if (prompts.length) {
          // Prefer primeira cena sem shot; senão a 1ª
          let idx = prompts.findIndex((vp) => !vp?.motion_shot?.templateId);
          if (idx < 0) idx = 0;
          prompts[idx] = {
            ...prompts[idx],
            motion_shot: shot,
            suggested_shot: shot.templateId,
          };
          storyboard.visual_prompts = prompts;
        }
        const planCenas = Array.isArray(storyboard.motion_plan?.cenas)
          ? [...storyboard.motion_plan.cenas]
          : prompts.map((vp, i) => ({
              scene_ref: vp.scene || vp.scene_id || i + 1,
              motion_shot: null,
            }));
        // Atualiza plan.cenas alinhado
        if (planCenas.length) {
          let pIdx = planCenas.findIndex((c) => !c?.motion_shot?.templateId);
          if (pIdx < 0) pIdx = 0;
          planCenas[pIdx] = {
            ...planCenas[pIdx],
            motion_shot: shot,
          };
        }
        storyboard.motion_plan = {
          ...(storyboard.motion_plan || {}),
          cenas: planCenas,
          niche:
            storyboard.motion_plan?.niche ||
            config.niche ||
            safeProps.niche ||
            "",
        };
        motionScene = {
          id: clip.id,
          template_id: shot.templateId,
          media_mode: "shotcraft",
          start_hint: clip.start,
          duration_seconds: clip.duration,
          props: { motion_shot: shot, shotcraft: true },
        };
      } else {
        motionScene = studioMotionClipToMotionScene(clip);
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
      res.json({
        ok: true,
        clip,
        studio: saved,
        motion_scene: motionScene,
        shotcraft: Boolean(isShotcraft),
      });
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
