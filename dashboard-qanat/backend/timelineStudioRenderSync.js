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
import {
  buildMotionPlan,
  applyMotionPlanToStoryboard,
  motionPlanFromStoryboard,
} from "./motionDirector.js";
import { normalizeMotionShot } from "./shotcraftPropsMap.js";
import { tagStoryboardWithMotion } from "./creatorSceneTagger.js";

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
  // Só usa Studio se tiver pelo menos 1 clip na track "video"
  return studio.clips.some((c) => c.trackId === "video");
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
  if (!projectDir || !publicProjectDir || typeof copyRemotionAsset !== "function" || typeof findProjectFile !== "function") {
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
  const rawProps = { ...(clip.props || {}) };
  const requestedType = String(clip.templateId || rawProps.overlayType || "").trim();
  const type = rawProps.shotcraft && rawProps.motion_shot?.templateId
    ? "shotcraft"
    : requestedType;
  if (!type) return null;
  delete rawProps.overlayType;
  const props =
    clip.trackId === MOTION_TRACK_ID
      ? copyMotionPropsAssets(rawProps, assetCtx, `mo${index + 1}_`)
      : rawProps;
  if (type === "lottie-overlay" && props.source) {
    props.source = copyRelAssetToPublic(
      props.source,
      assetCtx,
      `lo${index + 1}_`
    );
  }
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
  const videoClips = clipsOnTrack(studio.clips, "video");

  const scenes = [];
  videoClips.forEach((clip, index) => {
    const blockKey = clip.props?.blockKey ?? clip.props?.block;
    const block = Number.isFinite(Number(blockKey))
      ? Number(blockKey)
      : index + 1;
    const start = Number(clip.start) || 0;
    const duration = Math.max(0.08, Number(clip.duration) || 1);
    const sourceStart = Math.max(
      0,
      Number(clip.sourceStart ?? clip.props?.sourceStartSeconds) || 0
    );
    const sourceEnd = Math.max(
      sourceStart + duration,
      Number(clip.sourceEnd ?? clip.props?.sourceEndSeconds) || sourceStart + duration
    );

    // Tenta copiar asset; se não existir, cena continua com fundo escuro
    let copiedName = "";
    const sourceStr = String(clip.source || "").trim();
    if (sourceStr) {
      const sourcePath = findProjectFile(projectDir, clip.source);
      copiedName =
        copyRemotionAsset(
          sourcePath,
          publicProjectDir,
          `studio_v${index + 1}_`
        ) || "";
    }

    const assetType = copiedName ? inferAssetType(clip) : "image";
    const isVideo = assetType === "video";
    // Vídeo: bed diegético sob narração; imagem fica muda (SFX na trilha).
    const volume = Number.isFinite(Number(clip.props?.volume))
      ? Math.min(1, Math.max(0, Number(clip.props.volume)))
      : isVideo
        ? 0.28
        : 0;
    const playbackRate = Number.isFinite(Number(clip.props?.playback_rate))
      ? Math.min(2, Math.max(0.25, Number(clip.props.playback_rate)))
      : 1;
    const fadeInS = isVideo
      ? Number.isFinite(Number(clip.props?.fadeInS ?? clip.props?.fade_in_s))
        ? Math.max(0.05, Number(clip.props.fadeInS ?? clip.props.fade_in_s))
        : 0.32
      : 0;
    const fadeOutS = isVideo
      ? Number.isFinite(Number(clip.props?.fadeOutS ?? clip.props?.fade_out_s))
        ? Math.max(0.05, Number(clip.props.fadeOutS ?? clip.props.fade_out_s))
        : 0.42
      : 0;

    scenes.push({
      block,
      scene_id: String(clip.id || `studio.${index + 1}`),
      asset: copiedName ? `projects/${projectSlug}/${copiedName}` : "",
      type: assetType,
      start,
      duration,
      sourceStart,
      sourceEnd,
      durationLocked: Boolean(clip.locked),
      narrationText:
        clip.props?.narration_text || clip.props?.narrationText || "",
      editorNotes: "",
      volume,
      playback_rate: playbackRate,
      fadeInS,
      fadeOutS,
      motion_shot: clip.props?.motion_shot || null,
      camera_move: clip.props?.camera_move || undefined,
      transicao_entrada: clip.props?.transicao_entrada || undefined,
      transicao_style: clip.props?.transicao_style || undefined,
      visual_filter:
        clip.props?.visual_filter || clip.props?.filter_props?.css || undefined,
    });
  });

  const coverageEnd =
    Number(studio.totalDuration) > 0
      ? Number(studio.totalDuration)
      : scenes.reduce((max, s) => Math.max(max, s.start + s.duration), 1);

  return fillSceneTimelineGaps(scenes, coverageEnd);
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
    Boolean(clip?.props?.lumieraEditorClip) ||
    isStudioTemplateClip(clip) ||
    isGeoMotionTemplateId(clip.templateId);

  const overlayClips = clipsOnTrack(studio.clips, "overlays").filter(
    (clip) => clip?.props?.lumieraEditorClip && (clip.templateId || clip.props?.overlayType)
  );
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
  if (Number(studio?.width) > 0 && Number(studio?.height) > 0)
    return Number(studio.height) > Number(studio.width) ? "9:16" : "16:9";
  if (
    config &&
    (config.aspect_ratio === "9:16" || config.aspect_ratio === "16:9")
  ) {
    return config.aspect_ratio;
  }
  return "9:16";
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

function transcodeVideoForRemotion(source, dest, fps = 30) {
  const ffmpegInfo = getFfmpegStatus();
  const ffmpegBin = ffmpegInfo.binary || "ffmpeg";
  const tempDest = dest + ".tmp.mp4";

  // Flags recomendadas pela Remotion: libx264, pix_fmt yuv420p, GOP=1, sem B-frames
  const cmd = `"${ffmpegBin}" -y -i "${source}" -filter:v "framerate=fps=${fps}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level:v 4.0 -g 1 -bf 0 -crf 20 -c:a aac -b:a 128k -movflags +faststart "${tempDest}"`;

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
  remotionPublicDir,
  fps = 30
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
          transcodeVideoForRemotion(source, dest, fps);
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

/**
 * Gera/aplica motion plan (shotcraft) no storyboard e devolve o plan.
 * Usado pelo prepareRemotionRender para injetar motion_shot nas cenas.
 */
export function resolveMotionPlanForRender(storyboard = {}, config = {}) {
  try {
    const format =
      String(config.video_format || "").toUpperCase() === "SHORTS" ||
      String(config.video_format || "").toUpperCase() === "SHORT"
        ? "9:16"
        : "16:9";
    const niche =
      config.niche ||
      storyboard.strategy?.niche ||
      storyboard.motion_niche ||
      storyboard._vpe_checklist?.nicho_detectado ||
      "";
    let sb = storyboard;
    if (!sb.motion_tagged && Array.isArray(sb.visual_prompts)) {
      sb = tagStoryboardWithMotion(sb, { format, niche });
    }

    // Editor do Lumiera: visual_prompts.motion_shot é a fonte de verdade
    const fromVp = motionPlanFromStoryboard(sb);
    if (fromVp?.cenas?.some((c) => c.motion_shot?.templateId)) {
      return { storyboard: sb, motionPlan: fromVp };
    }

    if (sb.motion_plan?.cenas?.length) {
      return { storyboard: sb, motionPlan: sb.motion_plan };
    }
    const plan = buildMotionPlan({ storyboard: sb, niche, format });
    const next = applyMotionPlanToStoryboard(sb, plan);
    return { storyboard: next, motionPlan: next.motion_plan || plan };
  } catch (err) {
    console.warn(
      "[timelineStudioRenderSync] resolveMotionPlanForRender:",
      err?.message || err
    );
    return { storyboard, motionPlan: storyboard.motion_plan || null };
  }
}

/**
 * Injeta motion_shot / camera_move / transicao nas cenas do Remotion
 * a partir do motion plan (por índice ou scene_ref).
 */
export function enrichRemotionScenesWithMotionPlan(
  scenes = [],
  motionPlan = null
) {
  if (!Array.isArray(scenes) || !scenes.length || !motionPlan?.cenas?.length) {
    return scenes;
  }
  const byRef = new Map(motionPlan.cenas.map((c) => [String(c.scene_ref), c]));
  return scenes.map((scene, i) => {
    const key = String(scene.scene_id || scene.scene || i + 1);
    const motion = byRef.get(key) || motionPlan.cenas[i] || null;
    if (!motion) {
      return scene.motion_shot
        ? { ...scene, motion_shot: normalizeMotionShot(scene.motion_shot) }
        : scene;
    }
    // Prefer shot da cena (storyboard/editor); completa com o plan se faltar
    const rawShot = scene.motion_shot || motion.motion_shot || null;
    const motion_shot = rawShot ? normalizeMotionShot(rawShot) : null;
    return {
      ...scene,
      motion_shot,
      camera_move: scene.camera_move || motion.camera_move || undefined,
      transicao_entrada:
        scene.transicao_entrada || motion.transicao_entrada || undefined,
      transicao_style:
        scene.transicao_style || motion.transicao_style || undefined,
      visual_filter: scene.visual_filter || motion.visual_filter || undefined,
    };
  });
}
