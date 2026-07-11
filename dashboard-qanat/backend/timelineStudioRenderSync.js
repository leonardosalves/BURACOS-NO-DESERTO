/**
 * Timeline Studio → Remotion render (Fase 5)
 * Converte timeline_studio.json em scenes, overlays e captions para prepareRemotionRender.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getFfmpegStatus, buildPythonSpawnEnv } from "./pythonEnv.js";
import { MOTION_TRACK_ID } from "../shared/motionSceneCatalog.js";
import { STUDIO_FILENAME } from "./timelineStudioMigration.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";
import {
  isGeoMotionTemplateId,
  isStudioTemplateClip,
} from "../shared/timelineStudioLegacyStrip.js";
import { attachStudioOverlayMeta } from "../shared/studioOverlayLayers.js";

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
    (c) => c.trackId === "video" && String(c.source || "").trim()
  );
}

function inferAssetType(clip) {
  const fromProps = String(clip?.props?.type || "").toLowerCase();
  if (fromProps === "video" || fromProps === "image") return fromProps;
  const src = String(clip?.source || "").toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(src)) return "video";
  return "image";
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

const MOTION_TOP_MEDIA_KEYS = [
  "backgroundImage",
  "backgroundImageWide",
  "boundaryGeoJson",
  "flyover_video",
  "pipMediaUrl",
  "mainMediaUrl",
];

const MOTION_STUDIO_PROPS_MEDIA_KEYS = [
  "pipMediaUrl",
  "mainMediaUrl",
  "flyover_video",
  "backgroundImage",
  "backgroundImageWide",
];

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

  for (const key of MOTION_TOP_MEDIA_KEYS) {
    const copied = copyRelAssetToPublic(p[key], assetCtx, `${prefix}${key}_`);
    if (copied) p[key] = copied;
  }

  if (p.studio_props && typeof p.studio_props === "object") {
    const studioProps = { ...p.studio_props };
    let studioChanged = false;
    for (const key of MOTION_STUDIO_PROPS_MEDIA_KEYS) {
      const copied = copyRelAssetToPublic(
        studioProps[key],
        assetCtx,
        `${prefix}sp_${key}_`
      );
      if (copied && copied !== studioProps[key]) {
        studioProps[key] = copied;
        studioChanged = true;
      }
    }
    if (studioChanged) p.studio_props = studioProps;
  }

  const publicFlyover = String(p.flyover_video || "").trim();
  if (publicFlyover.startsWith("projects/")) {
    for (const key of ["pipMediaUrl", "mainMediaUrl"]) {
      const current = String(p[key] || "").trim();
      if (!current || current.startsWith("ASSETS/")) p[key] = publicFlyover;
    }
    if (p.studio_props && typeof p.studio_props === "object") {
      const studioProps = { ...p.studio_props };
      let studioChanged = false;
      for (const key of ["pipMediaUrl", "mainMediaUrl"]) {
        const current = String(studioProps[key] || "").trim();
        if (!current || current.startsWith("ASSETS/")) {
          studioProps[key] = publicFlyover;
          studioChanged = true;
        }
      }
      if (studioChanged) p.studio_props = studioProps;
    }
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

function studioClipToOverlay(clip, assetCtx, index = 0) {
  const type = String(clip.templateId || clip.props?.overlayType || "").trim();
  if (!type) return null;
  const rawProps = { ...(clip.props || {}) };
  delete rawProps.overlayType;
  const props =
    clip.trackId === MOTION_TRACK_ID
      ? copyMotionPropsAssets(rawProps, assetCtx, `mo${index + 1}_`)
      : rawProps;
  return attachStudioOverlayMeta({
    id: String(clip.id || `studio-overlay-${type}`),
    type,
    start: Number(clip.start) || 0,
    duration: Math.max(0.5, Number(clip.duration) || 4),
    props,
    timing_manual: true,
    studio_z_index: rawProps.studio_z_index,
    studio_role: rawProps.studio_role,
    studio_opacity: rawProps.studio_opacity,
  });
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
  const videoClips = clipsOnTrack(studio.clips, "video").filter((c) =>
    String(c.source || "").trim()
  );

  const scenes = [];
  videoClips.forEach((clip, index) => {
    const blockKey = clip.props?.blockKey ?? clip.props?.block;
    const block = Number.isFinite(Number(blockKey))
      ? Number(blockKey)
      : index + 1;
    const start = Number(clip.start) || 0;
    const duration = Math.max(0.08, Number(clip.duration) || 1);

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
    scenes.filter((s) => s.asset),
    coverageEnd
  );
}

export function buildOverlaysFromStudio(
  studio,
  {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  } = {}
) {
  const assetCtx = {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  };

  const isRenderableStudioClip = (clip) =>
    isStudioTemplateClip(clip) || isGeoMotionTemplateId(clip.templateId);

  const overlayClips = [];
  const motionClips = clipsOnTrack(studio.clips, MOTION_TRACK_ID).filter(
    (c) => (c.templateId || c.props?.overlayType) && isRenderableStudioClip(c)
  );

  let motionIndex = 0;
  return [...overlayClips, ...motionClips]
    .map((clip) => {
      const out = studioClipToOverlay(
        clip,
        assetCtx,
        clip.trackId === MOTION_TRACK_ID ? motionIndex++ : 0
      );
      return out;
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

export function resolveScenesTimelineEnd(scenes = []) {
  return (Array.isArray(scenes) ? scenes : []).reduce(
    (max, s) =>
      Math.max(max, (Number(s.start) || 0) + (Number(s.duration) || 0)),
    0
  );
}

export function resolveStudioTotalDuration(
  studio,
  scenes,
  narrationDuration = 0,
  extraTailSec = 0
) {
  const fromStudio = Number(studio?.totalDuration);
  const fromScenes = resolveScenesTimelineEnd(scenes);
  return Math.max(
    Number.isFinite(fromStudio) && fromStudio > 0 ? fromStudio : 0,
    fromScenes + Math.max(0, Number(extraTailSec) || 0),
    Number(narrationDuration) || 0,
    1
  );
}

export function resolveStudioFormat(studio, config = {}) {
  if (studio?.format === "9:16" || studio?.format === "16:9")
    return studio.format;
  return config.aspect_ratio === "16:9" ? "16:9" : "9:16";
}

const RELATIVE_MEDIA_PREFIXES = ["ASSETS/", "MUSICAS/", "logos/"];

export function collectRelativeMediaPaths(value, paths = new Set()) {
  if (typeof value === "string") {
    const rel = value.trim().replace(/\\/g, "/");
    if (
      rel &&
      !/^https?:\/\//i.test(rel) &&
      !rel.startsWith("projects/") &&
      RELATIVE_MEDIA_PREFIXES.some((prefix) => rel.startsWith(prefix))
    ) {
      paths.add(rel);
    }
    return paths;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRelativeMediaPaths(item, paths);
    return paths;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectRelativeMediaPaths(item, paths);
    }
  }
  return paths;
}

function transcodeVideoForRemotion(source, dest) {
  const ffmpegInfo = getFfmpegStatus();
  const ffmpegBin = ffmpegInfo.binary || "ffmpeg";
  const tempDest = dest + ".tmp.mp4";

  // Flags recomendadas pela Remotion: libx264, pix_fmt yuv420p, GOP=1, sem B-frames
  const cmd = `"${ffmpegBin}" -y -i "${source}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level:v 4.0 -g 1 -bf 0 -crf 20 -c:a aac -b:a 128k -movflags +faststart "${tempDest}"`;

  try {
    execSync(cmd, { stdio: "ignore", env: buildPythonSpawnEnv() });
    if (fs.existsSync(tempDest)) {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      fs.renameSync(tempDest, dest);
      console.log(`[Remotion Transcode] Transcodificado com sucesso: ${dest}`);
    } else {
      throw new Error("Temporário não criado");
    }
  } catch (err) {
    if (fs.existsSync(tempDest)) {
      try {
        fs.unlinkSync(tempDest);
      } catch {}
    }
    throw err;
  }
}

/** Espelha ASSETS/ do projeto em remotion-renderer/public/ (fallback para staticFile). */
export function mirrorRelativeAssetsToRemotionPublic(
  relPaths,
  projectDir,
  remotionPublicDir
) {
  const mirrored = [];
  for (const rel of relPaths) {
    const normalized = String(rel || "")
      .trim()
      .replace(/\\/g, "/");
    if (!normalized) continue;
    const source = path.join(projectDir, normalized);
    if (!fs.existsSync(source)) continue;
    const dest = path.join(remotionPublicDir, normalized);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const ext = path.extname(source).toLowerCase();
    if (ext === ".mp4" || ext === ".mov" || ext === ".mkv" || ext === ".webm") {
      try {
        let needTranscode = true;
        if (fs.existsSync(dest)) {
          const mtimeSource = fs.statSync(source).mtimeMs;
          const mtimeDest = fs.statSync(dest).mtimeMs;
          if (mtimeDest >= mtimeSource) {
            needTranscode = false;
          }
        }
        if (needTranscode) {
          console.log(
            `[Remotion Transcode] Preparando codec compatível para ${normalized}...`
          );
          transcodeVideoForRemotion(source, dest);
        }
      } catch (err) {
        console.warn(
          `[Remotion Transcode] Falha ao transcodificar ${normalized}, copiando original:`,
          err.message
        );
        fs.copyFileSync(source, dest);
      }
    } else {
      fs.copyFileSync(source, dest);
    }
    mirrored.push(normalized);
  }
  return mirrored;
}
