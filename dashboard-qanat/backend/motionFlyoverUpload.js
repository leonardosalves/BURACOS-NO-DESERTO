/**
 * Upload de MP4 gerado externamente (Grok / Google Flow) para cenas location-intro.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  ensureMotionTrack,
  motionScenesToMotionClips,
} from "./motionScenePlanner.js";
import {
  mergeMissingBrollFromConfig,
  saveTimelineStudio,
  STUDIO_FILENAME,
} from "./timelineStudioMigration.js";
import { studioMotionClipToMotionScene } from "./timelineStudioNichePacks.js";
import { MOTION_TRACK_ID } from "../shared/motionSceneCatalog.js";
import { buildGeoPipOverlayStudioProps } from "../shared/geoPipSceneText.js";
import { remotionClipFingerprint } from "../shared/timelineStudioRemotionSuppress.js";
import { upsertMusicClipInStudio } from "../shared/timelineStudioMusic.js";

export function probeFlyoverVideoDurationSec(absPath) {
  try {
    if (!absPath || !fs.existsSync(absPath)) return 0;
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${absPath}"`,
      { encoding: "utf8" }
    ).trim();
    const dur = parseFloat(output);
    return Number.isFinite(dur) && dur > 0 ? dur : 0;
  } catch {
    return 0;
  }
}

function applyGeoPipFlyoverBinding(target = {}, { relPath, durationSec, storyboard }) {
  const props =
    target.props && typeof target.props === "object" ? { ...target.props } : {};
  const motionScenes = Array.isArray(storyboard?.motion_scenes)
    ? storyboard.motion_scenes
    : [];
  const motionScene = motionScenes.find((ms) => motionSceneMatches(ms, target.id));
  const narration = String(
    motionScene?.narration_text || props.narration_text || ""
  ).trim();
  const dataSlots = Array.isArray(props.template_studio_data_slots)
    ? props.template_studio_data_slots
    : [];
  const overlay = buildGeoPipOverlayStudioProps(props, {
    narration,
    dataSlots,
    flyoverDurationSec: durationSec,
  });

  const nextProps = {
    ...props,
    ...overlay.studio_props,
    studio_props: {
      ...(props.studio_props || {}),
      ...overlay.studio_props,
    },
    flyover_video: relPath,
    map_provider: props.map_provider || "ai_t2v",
    geo_generation: props.geo_generation || "ai_prompt",
    geoPipOverlayMode: true,
    transparentBackground: true,
    referencePoint: overlay.referencePoint || props.referencePoint,
    scene_subject: overlay.scene_subject || props.scene_subject,
  };

  const next = {
    ...target,
    props: nextProps,
  };
  if (Number.isFinite(durationSec) && durationSec > 0) {
    next.duration = Math.max(0.5, durationSec);
  }
  return next;
}

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv"]);
const MOTION_CLIP_CACHE_DIR = ".lumiera-cache";

function readStudioRaw(projDir) {
  return readJsonSafe(path.join(projDir, STUDIO_FILENAME), {
    version: 1,
    clips: [],
    tracks: [],
  });
}

function motionClipSidecarPath(projDir, clipId = "") {
  const safeId = String(clipId || "geo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const cacheDir = path.join(projDir, MOTION_CLIP_CACHE_DIR);
  fs.mkdirSync(cacheDir, { recursive: true });
  return path.join(cacheDir, `motion-clip-${safeId}.json`);
}

export function writeMotionClipSidecar(projDir, clip = {}) {
  const clipId = String(clip.id || "").trim();
  if (!clipId) return;
  fs.writeFileSync(
    motionClipSidecarPath(projDir, clipId),
    JSON.stringify(clip, null, 2),
    "utf8"
  );
}

export function readMotionClipSidecar(projDir, clipId = "") {
  const sidecarPath = motionClipSidecarPath(projDir, clipId);
  if (!fs.existsSync(sidecarPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function reviveMotionClipSuppressions(studio = {}, clipId = "") {
  const needle = String(clipId || "").trim();
  if (!needle) return studio;
  const clip = findMotionClipInStudio(studio, needle);
  const clipFp = clip ? remotionClipFingerprint(clip) : "";
  const ids = Array.isArray(studio.suppressedMotionSceneIds)
    ? studio.suppressedMotionSceneIds
        .map((id) => String(id || "").trim())
        .filter((id) => id && id !== needle)
    : [];
  const fps = Array.isArray(studio.suppressedRemotionFingerprints)
    ? studio.suppressedRemotionFingerprints.filter((fp) => {
        const token = String(fp || "");
        if (!token) return false;
        if (token.includes(needle)) return false;
        if (clipFp && token === clipFp) return false;
        return true;
      })
    : [];
  return {
    ...studio,
    suppressedMotionSceneIds: ids,
    suppressedRemotionFingerprints: fps,
  };
}

/** Garante que o clip manual da timeline não se perde após patch de flyover. */
function ensureMotionClipInStudio(studio, motionId, motionScenes, projDir) {
  const needle = String(motionId || "").trim();
  if (!needle || findMotionClipInStudio(studio, needle)) return studio;

  const sidecar = readMotionClipSidecar(projDir, needle);
  if (sidecar) {
    const clips = Array.isArray(studio.clips) ? [...studio.clips] : [];
    clips.push({
      ...sidecar,
      trackId: sidecar.trackId || MOTION_TRACK_ID,
      motionScene: sidecar.motionScene !== false,
      motionScenePrimary: sidecar.motionScenePrimary !== false,
    });
    return { ...studio, clips };
  }

  const scene = (Array.isArray(motionScenes) ? motionScenes : []).find((ms) =>
    motionSceneMatches(ms, needle)
  );
  if (scene) {
    const built = motionScenesToMotionClips([scene]);
    if (built.length) {
      const clips = Array.isArray(studio.clips) ? [...studio.clips] : [];
      clips.push(built[0]);
      return { ...studio, clips };
    }
  }

  return studio;
}

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

export function motionSceneMatches(ms, motionId) {
  const needle = String(motionId || "").trim();
  if (!needle) return false;
  const id = String(ms?.id || "").trim();
  const ref = String(ms?.scene_ref || "").trim();
  if (id && id === needle) return true;
  if (ref && ref === needle) return true;
  if (ref && `ms-${ref}` === needle) return true;
  if (needle && `ms-${needle}` === id) return true;
  return false;
}

export function resolveFlyoverDest(
  projDir,
  motionId,
  filename = "geo-flyover.mp4"
) {
  const safeId = String(motionId || "geo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(String(filename || "")).toLowerCase() || ".mp4";
  if (!VIDEO_EXTS.has(ext)) {
    throw new Error("Formato inválido — use MP4, WebM ou MOV.");
  }
  const satelliteDir = path.join(projDir, "ASSETS", "satellite");
  fs.mkdirSync(satelliteDir, { recursive: true });
  const destName = `${safeId}-geo-flyover${ext}`;
  return {
    absPath: path.join(satelliteDir, destName),
    relPath: `ASSETS/satellite/${destName}`,
    fileName: destName,
  };
}

export function findMotionClipInStudio(studio, motionId) {
  const needle = String(motionId || "").trim();
  if (!needle || !Array.isArray(studio?.clips)) return null;
  return (
    studio.clips.find((clip) => String(clip?.id || "").trim() === needle) ||
    null
  );
}

/** Garante motion_scene no storyboard — cria a partir do clip da timeline se faltar. */
export function ensureMotionSceneForUpload(motionScenes, studio, motionId) {
  const needle = String(motionId || "").trim();
  const list = Array.isArray(motionScenes) ? [...motionScenes] : [];
  if (!needle) return list;
  if (list.some((ms) => motionSceneMatches(ms, needle))) return list;

  const clip = findMotionClipInStudio(studio, needle);
  if (!clip) return list;

  return [
    ...list.filter((ms) => !motionSceneMatches(ms, needle)),
    studioMotionClipToMotionScene(clip),
  ];
}

export function patchMotionSceneFlyover(
  motionScenes,
  motionId,
  relPath,
  studio = null,
  { durationSec = 0 } = {}
) {
  const needle = String(motionId || "").trim();
  if (!needle) return motionScenes;

  const applyFlyover = (ms) => {
    const bound = applyGeoPipFlyoverBinding(
      {
        ...ms,
        id: ms.id || needle,
        props: ms.props && typeof ms.props === "object" ? ms.props : {},
      },
      { relPath, durationSec, storyboard: { motion_scenes: motionScenes } }
    );
    return {
      ...ms,
      duration_seconds: bound.duration || ms.duration_seconds,
      props: bound.props,
    };
  };

  let found = false;
  const next = (Array.isArray(motionScenes) ? motionScenes : []).map((ms) => {
    if (!motionSceneMatches(ms, needle)) return ms;
    found = true;
    return applyFlyover(ms);
  });

  if (found) return next;

  const ensured = ensureMotionSceneForUpload(next, studio, needle);
  const retried = ensured.map((ms) => {
    if (!motionSceneMatches(ms, needle)) return ms;
    found = true;
    return applyFlyover(ms);
  });
  if (found) return retried;

  const clip = findMotionClipInStudio(studio, needle);
  if (clip) {
    return [...retried, applyFlyover(studioMotionClipToMotionScene(clip))];
  }

  throw new Error(
    `Cena motion "${needle}" não encontrada na timeline — adicione o template antes do upload.`
  );
}

export function patchStudioClipFlyover(
  studio,
  motionId,
  relPath,
  { durationSec = 0, storyboard = null } = {}
) {
  const needle = String(motionId || "").trim();
  if (!needle || !Array.isArray(studio?.clips)) return studio;
  let touched = false;
  const clips = studio.clips.map((clip) => {
    if (String(clip?.id || "").trim() !== needle) return clip;
    touched = true;
    return applyGeoPipFlyoverBinding(clip, {
      relPath,
      durationSec,
      storyboard,
    });
  });
  return touched ? { ...studio, clips } : studio;
}

/** Grava clip motion + motion_scene no disco antes do upload de flyover. */
export function ensureMotionClipForProject(projDir, clip = {}) {
  const clipId = String(clip.id || "").trim();
  if (!clipId) {
    throw new Error("clip.id é obrigatório para vincular vídeo geo.");
  }

  const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
  const aspectRatio = String(
    config.aspect_ratio || clip.props?.aspect_ratio || "16:9"
  ).trim();
  const isShort = aspectRatio === "9:16";

  let rawStudio = reviveMotionClipSuppressions(readStudioRaw(projDir), clipId);
  let clips = Array.isArray(rawStudio.clips) ? [...rawStudio.clips] : [];

  if (isShort) {
    clips = clips.filter(
      (c) =>
        c.trackId !== MOTION_TRACK_ID || String(c?.id || "").trim() === clipId
    );
  }

  const normalized = {
    ...clip,
    id: clipId,
    trackId: clip.trackId || MOTION_TRACK_ID,
    motionScene: clip.motionScene !== false,
    motionScenePrimary: clip.motionScenePrimary !== false,
    props: {
      ...(clip.props || {}),
      motion_scene: clip.props?.motion_scene !== false,
      manual_studio_insert: true,
      studio_user_locked: true,
    },
  };

  const idx = clips.findIndex((c) => String(c?.id || "").trim() === clipId);
  if (idx >= 0) {
    clips[idx] = { ...clips[idx], ...normalized };
  } else {
    clips.push(normalized);
  }

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
  studio = upsertMusicClipInStudio(studio, config, projDir);

  const storyboardPath = path.join(projDir, "storyboard.json");
  const storyboard = readJsonSafe(storyboardPath, {});
  const motionScene = studioMotionClipToMotionScene(normalized);
  if (isShort) {
    storyboard.motion_scenes = [motionScene];
  } else {
    const existing = Array.isArray(storyboard.motion_scenes)
      ? storyboard.motion_scenes
      : [];
    storyboard.motion_scenes = [
      ...existing.filter((ms) => String(ms?.id || "").trim() !== clipId),
      motionScene,
    ];
  }
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");

  const savedStudio = saveTimelineStudio(projDir, studio);
  writeMotionClipSidecar(projDir, normalized);
  return { studio: savedStudio, motion_scene: motionScene };
}

function resolveStudioForFlyoverUpload(projDir, motionId) {
  let rawStudio = reviveMotionClipSuppressions(
    readStudioRaw(projDir),
    motionId
  );
  let clip = findMotionClipInStudio(rawStudio, motionId);
  if (!clip) {
    const sidecar = readMotionClipSidecar(projDir, motionId);
    if (sidecar) {
      ensureMotionClipForProject(projDir, sidecar);
      rawStudio = reviveMotionClipSuppressions(
        readStudioRaw(projDir),
        motionId
      );
      clip = findMotionClipInStudio(rawStudio, motionId);
    }
  }
  return { rawStudio, clip };
}

export function persistFlyoverToProject(projDir, motionId, relPath) {
  const storyboardPath = path.join(projDir, "storyboard.json");

  const reloadFlyoverState = () => {
    const storyboard = readJsonSafe(storyboardPath, {});
    const rawStudio = reviveMotionClipSuppressions(
      readStudioRaw(projDir),
      motionId
    );
    const ensured = ensureMotionSceneForUpload(
      storyboard.motion_scenes || [],
      rawStudio,
      motionId
    );
    return { storyboard, rawStudio, ensured };
  };

  let { storyboard, rawStudio, ensured } = reloadFlyoverState();
  const hasBinding = () =>
    ensured.some((ms) => motionSceneMatches(ms, motionId)) ||
    Boolean(findMotionClipInStudio(rawStudio, motionId));

  if (!hasBinding()) {
    const sidecar = readMotionClipSidecar(projDir, motionId);
    if (sidecar) {
      ensureMotionClipForProject(projDir, sidecar);
    } else {
      const clip = findMotionClipInStudio(rawStudio, motionId);
      if (clip) ensureMotionClipForProject(projDir, clip);
    }
    ({ storyboard, rawStudio, ensured } = reloadFlyoverState());
  }

  if (!hasBinding()) {
    throw new Error(
      `Cena motion "${motionId}" não encontrada — adicione o template na timeline antes do upload.`
    );
  }

  const flyoverAbs = path.join(projDir, relPath.replace(/\//g, path.sep));
  const flyoverDurationSec = probeFlyoverVideoDurationSec(flyoverAbs);

  const motionScenes = patchMotionSceneFlyover(
    ensured,
    motionId,
    relPath,
    rawStudio,
    { durationSec: flyoverDurationSec }
  );
  const nextStoryboard = {
    ...storyboard,
    motion_scenes: motionScenes,
    motion_scenes_meta: {
      ...(storyboard.motion_scenes_meta || {}),
      flyover_upload: {
        motion_id: motionId,
        path: relPath,
        at: new Date().toISOString(),
      },
    },
  };
  fs.writeFileSync(
    storyboardPath,
    JSON.stringify(nextStoryboard, null, 2),
    "utf8"
  );

  const config = readJsonSafe(path.join(projDir, "config_qanat.json"), {});
  const blockTimings = readJsonSafe(
    path.join(projDir, "block_timings.json"),
    {}
  );
  let studio = reviveMotionClipSuppressions(
    patchStudioClipFlyover(rawStudio, motionId, relPath, {
      durationSec: flyoverDurationSec,
      storyboard: nextStoryboard,
    }),
    motionId
  );
  if (flyoverDurationSec > 0) {
    const clip = findMotionClipInStudio(studio, motionId);
    if (clip) {
      const end = (Number(clip.start) || 0) + flyoverDurationSec;
      if (end > Number(studio.totalDuration || 0)) {
        studio = { ...studio, totalDuration: end };
      }
    }
  }
  studio = ensureMotionClipInStudio(studio, motionId, motionScenes, projDir);
  studio = ensureMotionTrack(studio);
  studio = mergeMissingBrollFromConfig(studio, config, blockTimings);
  studio = upsertMusicClipInStudio(studio, config, projDir);
  const savedStudio = saveTimelineStudio(projDir, studio);

  return { motionScenes, savedStudio };
}

export function registerMotionFlyoverUploadRoute(app, { getProjectDir }) {
  app.post("/api/upload-motion-flyover", (req, res) => {
    const projDir = getProjectDir(req);
    const motionId = String(req.query.motion_id || "").trim();
    const filename = String(req.query.filename || "geo-flyover.mp4").trim();

    if (!motionId) {
      return res
        .status(400)
        .json({ error: "Parâmetro motion_id é obrigatório." });
    }

    let dest;
    try {
      dest = resolveFlyoverDest(projDir, motionId, filename);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const writeStream = fs.createWriteStream(dest.absPath);
    let finished = false;

    const fail = (status, message) => {
      if (res.headersSent || finished) return;
      finished = true;
      res.status(status).json({ error: message });
    };

    const succeed = (payload) => {
      if (res.headersSent || finished) return;
      finished = true;
      res.json(payload);
    };

    req.on("aborted", () => {
      writeStream.destroy();
    });

    req.on("error", (err) => {
      writeStream.destroy();
      fail(500, err.message || "Falha ao receber upload.");
    });

    writeStream.on("error", (err) => {
      fail(500, err.message || "Falha ao gravar arquivo.");
    });

    writeStream.on("finish", () => {
      try {
        const { motionScenes, savedStudio } = persistFlyoverToProject(
          projDir,
          motionId,
          dest.relPath
        );
        succeed({
          ok: true,
          message: `Vídeo geo salvo: ${dest.fileName}`,
          motion_id: motionId,
          flyover_video: dest.relPath,
          asset: dest.fileName,
          motion_scenes: motionScenes,
          studio: savedStudio,
        });
      } catch (err) {
        fail(500, err.message || "Falha ao vincular vídeo geo.");
      }
    });

    req.pipe(writeStream);
  });
}
