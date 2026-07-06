/**
 * Timeline Studio → Remotion render (Fase 5)
 * Converte timeline_studio.json em scenes, overlays e captions para prepareRemotionRender.
 */

import fs from "fs";
import path from "path";
import { STUDIO_FILENAME } from "./timelineStudioMigration.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";

function clipsOnTrack(clips, trackId) {
  return (Array.isArray(clips) ? clips : [])
    .filter((c) => c?.trackId === trackId)
    .sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
}

export function loadStudioForRender(projDir) {
  const studioPath = path.join(projDir, STUDIO_FILENAME);
  if (!fs.existsSync(studioPath)) return null;
  try {
    const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    if (!(studio?.version >= 1 && Array.isArray(studio.clips))) return null;
    let config = {};
    try {
      config = JSON.parse(
        fs.readFileSync(path.join(projDir, "config_qanat.json"), "utf8")
      );
    } catch {
      config = {};
    }
    return upsertMusicClipInStudio(studio, config, projDir);
  } catch {
    return null;
  }
  return null;
}

/** Studio ativo quando há clips editados (updatedAt) ou vídeo migrado com source. */
export function shouldUseStudioForRender(studio) {
  if (!studio || !Array.isArray(studio.clips) || studio.clips.length === 0)
    return false;
  if (studio.updatedAt) return true;
  return studio.clips.some(
    (c) =>
      c.trackId === "video" &&
      (String(c.source || "").trim() || isRemotionVideoClip(c))
  );
}

function inferAssetType(clip) {
  const fromProps = String(clip?.props?.type || "").toLowerCase();
  if (fromProps === "video" || fromProps === "image") return fromProps;
  const src = String(clip?.source || "").toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(src)) return "video";
  return "image";
}

function isRemotionVideoClip(clip) {
  return (
    clip?.props?.media_mode === "remotion" &&
    Boolean(String(clip?.templateId || "").trim())
  );
}

function resolveProjectAssetPath(projectDir, relPath, findProjectFile) {
  const rel = String(relPath || "")
    .trim()
    .replace(/\\/g, "/");
  if (!rel || /^https?:\/\//i.test(rel) || rel.startsWith("projects/")) {
    return null;
  }
  const direct = path.join(projectDir, rel);
  if (fs.existsSync(direct)) return direct;
  return (
    findProjectFile(projectDir, rel) ||
    findProjectFile(projectDir, path.basename(rel))
  );
}

function copyRelAssetToPublic(
  relPath,
  {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  },
  prefix = "motion_"
) {
  const rel = String(relPath || "").trim();
  if (!rel || /^https?:\/\//i.test(rel) || rel.startsWith("projects/")) {
    return rel;
  }
  const source = resolveProjectAssetPath(projectDir, rel, findProjectFile);
  const copied = copyRemotionAsset(source, publicProjectDir, prefix);
  return copied ? `projects/${projectSlug}/${copied}` : rel;
}

export function copyMotionPropsAssets(
  props = {},
  {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  },
  prefix = "motion_"
) {
  const p = { ...props };
  const assetCtx = {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  };

  for (const key of [
    "backgroundImage",
    "backgroundImageWide",
    "boundaryGeoJson",
  ]) {
    const copied = copyRelAssetToPublic(p[key], assetCtx, `${prefix}${key}_`);
    if (copied) p[key] = copied;
  }

  if (Array.isArray(p.zoom_keyframes)) {
    p.zoom_keyframes = p.zoom_keyframes.map((kf, i) => {
      if (!kf || typeof kf !== "object") return kf;
      const image = copyRelAssetToPublic(
        kf.image,
        assetCtx,
        `${prefix}zk${i}_`
      );
      return image ? { ...kf, image } : kf;
    });
  }

  return p;
}

export function buildScenesFromStudio(
  studio,
  {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
    fillSceneTimelineGaps,
  }
) {
  const videoClips = clipsOnTrack(studio.clips, "video").filter(
    (c) => String(c.source || "").trim() || isRemotionVideoClip(c)
  );

  const assetCtx = {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  };

  const scenes = [];
  videoClips.forEach((clip, index) => {
    const blockKey = clip.props?.blockKey ?? clip.props?.block;
    const block = Number.isFinite(Number(blockKey))
      ? Number(blockKey)
      : index + 1;
    const start = Number(clip.start) || 0;
    const duration = Math.max(0.08, Number(clip.duration) || 1);

    if (isRemotionVideoClip(clip)) {
      const rawProps = { ...(clip.props || {}) };
      delete rawProps.overlayType;
      const remotionProps = copyMotionPropsAssets(
        rawProps,
        assetCtx,
        `rv${index + 1}_`
      );
      scenes.push({
        block,
        scene_id: String(
          clip.props?.scene_ref || clip.id || `studio.remotion.${index + 1}`
        ),
        asset: "",
        type: "remotion",
        remotionTemplate: String(clip.templateId),
        remotionProps,
        start,
        duration,
        durationLocked: Boolean(clip.locked),
        narrationText: "",
        editorNotes: "",
        volume: 0,
        playback_rate: 1,
      });
      return;
    }

    const sourcePath = findProjectFile(projectDir, clip.source);
    const copiedName = copyRemotionAsset(
      sourcePath,
      publicProjectDir,
      `studio_v${index + 1}_`
    );
    if (!copiedName) return;

    const volume = Number.isFinite(Number(clip.props?.volume))
      ? Math.min(1, Math.max(0, Number(clip.props.volume)))
      : 0;
    const playbackRate = Number.isFinite(Number(clip.props?.playback_rate))
      ? Math.min(2, Math.max(0.25, Number(clip.props.playback_rate)))
      : 1;

    scenes.push({
      block,
      scene_id: String(clip.id || `studio.${index + 1}`),
      asset: `projects/${projectSlug}/${copiedName}`,
      type: inferAssetType(clip),
      start,
      duration,
      durationLocked: Boolean(clip.locked),
      narrationText: "",
      editorNotes: "",
      volume,
      playback_rate: playbackRate,
    });
  });

  const coverageEnd =
    Number(studio.totalDuration) > 0
      ? Number(studio.totalDuration)
      : scenes.reduce((max, s) => Math.max(max, s.start + s.duration), 1);

  return fillSceneTimelineGaps(
    scenes.filter((s) => s.asset || s.type === "remotion"),
    coverageEnd
  );
}

export function buildOverlaysFromStudio(studio) {
  const primaryRemotion = clipsOnTrack(studio.clips, "video").filter(
    (c) => c.motionScenePrimary || isRemotionVideoClip(c)
  );
  const primaryKeys = new Set(
    primaryRemotion.map(
      (c) => `${String(c.templateId)}::${(Number(c.start) || 0).toFixed(1)}`
    )
  );

  return clipsOnTrack(studio.clips, "overlays")
    .filter((c) => c.templateId || c.props?.overlayType)
    .filter((clip) => {
      if (!clip.motionScene) return true;
      const key = `${String(clip.templateId)}::${(Number(clip.start) || 0).toFixed(1)}`;
      return !primaryKeys.has(key);
    })
    .map((clip) => {
      const type = String(
        clip.templateId || clip.props?.overlayType || ""
      ).trim();
      if (!type) return null;
      const rawProps = { ...(clip.props || {}) };
      delete rawProps.overlayType;
      return {
        id: String(clip.id || `studio-overlay-${type}`),
        type,
        start: Number(clip.start) || 0,
        duration: Math.max(0.5, Number(clip.duration) || 4),
        props: rawProps,
        timing_manual: true,
      };
    })
    .filter(Boolean);
}

export function buildCaptionsFromStudio(studio) {
  return clipsOnTrack(studio.clips, "captions")
    .map((clip) => {
      const start = Number(clip.start) || 0;
      const end = start + Math.max(0.08, Number(clip.duration) || 0.3);
      const text = String(clip.props?.text || clip.label || "").trimStart();
      if (!text) return null;
      return {
        text,
        startMs: Math.max(0, Math.round(start * 1000)),
        endMs: Math.max(0, Math.round(end * 1000)),
        timestampMs: Math.max(0, Math.round(start * 1000)),
        confidence: null,
      };
    })
    .filter(Boolean);
}

export function resolveStudioTotalDuration(
  studio,
  scenes,
  narrationDuration = 0
) {
  const fromStudio = Number(studio?.totalDuration);
  const fromScenes = scenes.reduce(
    (max, s) =>
      Math.max(max, (Number(s.start) || 0) + (Number(s.duration) || 0)),
    0
  );
  return Math.max(
    Number.isFinite(fromStudio) && fromStudio > 0 ? fromStudio : 0,
    fromScenes,
    Number(narrationDuration) || 0,
    1
  );
}

export function resolveStudioFormat(studio, config = {}) {
  if (studio?.format === "9:16" || studio?.format === "16:9")
    return studio.format;
  return config.aspect_ratio === "16:9" ? "16:9" : "9:16";
}
