/**
 * Migração legacy → timeline_studio.json (Fase 1 Timeline Studio)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { tightenStudioTimelineClips } from "../shared/timelineStudioTighten.js";
import {
  resolveStudioBgmSource,
  upsertMusicClipInStudio,
} from "../shared/timelineStudioMusic.js";
import {
  migrateStudioMotionClipsFromVideo,
  motionScenesToMotionClips,
  syncMotionScenesToStudio,
} from "./motionScenePlanner.js";
import {
  defaultMotionTrack,
  MOTION_TRACK_ID,
} from "../shared/motionSceneCatalog.js";
import {
  clipMatchesSuppression,
  collectSuppressionState,
  mergeDeletedClipSuppressions,
  storyboardRowMatchesSuppression,
  stripSuppressedRemotionClips,
} from "../shared/timelineStudioRemotionSuppress.js";
import {
  isRunnableStudioMotionScene,
  stripLegacyStudioOverlayClips,
} from "../shared/timelineStudioLegacyStrip.js";
import { enrichStudioSatelliteClips } from "../shared/timelineStudioSatelliteEnrich.js";
import { enrichGeoPipStudioClipsOnLoad } from "./geoPipTimelineEnrich.js";

const STUDIO_FILENAME = "timeline_studio.json";
const NARRATION_FILES = [
  "narracao_mestra_premium.mp3",
  "narracao_mestra.mp3",
  "narration_master.mp3",
];

const NICHE_PACK_MAP = {
  "documentary-history": "documentary-prestige",
  "documentary-prestige": "documentary-prestige",
  "data-journalist": "data-journalist",
  geography: "geography-explorer",
  "geography-explorer": "geography-explorer",
  mystery: "mystery-reveal",
  "mystery-reveal": "mystery-reveal",
  industrial: "industrial-impact",
  "industrial-impact": "industrial-impact",
  social: "social-proof",
  "social-proof": "social-proof",
};

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function defaultTracks() {
  return [
    {
      id: "voice",
      type: "voice",
      label: "Narração",
      locked: true,
      color: "#E91E8C",
      height: 36,
    },
    {
      id: "captions",
      type: "captions",
      label: "Legendas",
      color: "#7C4DFF",
      height: 28,
    },
    {
      id: "video",
      type: "video",
      label: "Vídeo / B-roll",
      color: "#1565C0",
      height: 44,
    },
    defaultMotionTrack(),
    {
      id: "overlays",
      type: "overlays",
      label: "Templates",
      color: "#00897B",
      height: 36,
    },
    { id: "sfx", type: "sfx", label: "Efeitos", color: "#FF6D00", height: 28 },
    {
      id: "music",
      type: "music",
      label: "Música",
      color: "#5C6BC0",
      height: 28,
    },
  ];
}

function resolveNichePack(config = {}, storyboard = {}) {
  const preset = String(storyboard.design_preset || config.design_preset || "")
    .trim()
    .toLowerCase();
  if (preset && NICHE_PACK_MAP[preset]) return NICHE_PACK_MAP[preset];
  const niche = String(
    config.niche || storyboard?.strategy?.niche || ""
  ).toLowerCase();
  if (/geograf|mapa|país|cidade|travel/.test(niche))
    return "geography-explorer";
  if (/dado|financ|econom|número|stat/.test(niche)) return "data-journalist";
  if (/mistério|misterio|enigma|conspira/.test(niche)) return "mystery-reveal";
  if (/industrial|engenharia|militar/.test(niche)) return "industrial-impact";
  return "documentary-prestige";
}

function segmentDuration(asset, blockDur, count) {
  const d = Number(asset?.duration ?? asset?.duration_seconds);
  if (Number.isFinite(d) && d > 0) return d;
  return blockDur / Math.max(1, count);
}

function migrateVideoClips(timelineAssets = {}, blockTimings = {}) {
  const starts = blockTimings.starts || [];
  const blockDurations = blockTimings.durations || [];
  const clips = [];
  const blockKeys = Object.keys(timelineAssets)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  let fallbackCursor = 0;
  for (const blockNum of blockKeys) {
    const blockKey = String(blockNum);
    const assets = timelineAssets[blockKey] || [];
    if (!assets.length) continue;

    const blockStart = Number.isFinite(starts[blockNum - 1])
      ? Number(starts[blockNum - 1])
      : fallbackCursor;
    const blockDur = Number.isFinite(blockDurations[blockNum - 1])
      ? Number(blockDurations[blockNum - 1])
      : assets.reduce(
          (sum, a) => sum + segmentDuration(a, 10, assets.length),
          0
        );

    let cursor = blockStart;
    assets.forEach((asset, idx) => {
      const assetPath = String(asset.asset || "").trim();
      if (!assetPath || assetPath.toLowerCase().startsWith("logos/")) {
        cursor += segmentDuration(asset, blockDur, assets.length);
        return;
      }
      const dur = segmentDuration(asset, blockDur, assets.length);
      const audioStart = Number(asset.audio_start);
      const start = Number.isFinite(audioStart) ? audioStart : cursor;
      clips.push({
        id: `video-${blockKey}-${idx}`,
        trackId: "video",
        start,
        duration: dur,
        label: assetPath.split("/").pop() || `Bloco ${blockKey}`,
        source: assetPath,
        props: {
          type: String(asset.type || "image"),
          blockKey,
          assetIndex: idx,
        },
        color: "#1565C0",
      });
      cursor = start + dur;
    });
    fallbackCursor = Math.max(fallbackCursor, cursor);
  }
  return clips;
}

/** Reinsere clips B-roll ausentes a partir de config.timeline_assets (não remove nada). */
export function mergeMissingBrollFromConfig(
  studio,
  config = {},
  blockTimings = {}
) {
  if (!studio || !Array.isArray(studio.clips)) return studio;

  const expected = migrateVideoClips(
    config.timeline_assets || {},
    blockTimings
  );
  if (!expected.length) return studio;

  const byId = new Map(studio.clips.map((c) => [c.id, c]));
  let restored = 0;
  for (const clip of expected) {
    if (!byId.has(clip.id)) {
      byId.set(clip.id, clip);
      restored += 1;
    }
  }
  if (!restored) return studio;

  const clips = [...byId.values()].sort(
    (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
  );
  return { ...studio, clips, brollRestored: restored };
}

/** Trilha overlays (InfoBar/OverlayPreview) desativada — use Template Studio. */
export function migrateOverlayClips() {
  return [];
}

function migrateMotionClips(storyboard = {}) {
  const runnableScenes = (
    Array.isArray(storyboard.motion_scenes) ? storyboard.motion_scenes : []
  ).filter((ms) => isRunnableStudioMotionScene(ms));
  return motionScenesToMotionClips(runnableScenes);
}

function migrateCaptionClips(wordTranscripts = []) {
  const clips = [];
  if (!Array.isArray(wordTranscripts)) return clips;

  for (const segment of wordTranscripts) {
    const segStart = Number(segment.start_time) || 0;
    const words = Array.isArray(segment.words) ? segment.words : [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const text = String(w.word || "").trim();
      if (!text) continue;
      const wStart = segStart + (Number(w.start) || 0);
      const wEnd = segStart + (Number(w.end) || wStart + 0.3);
      const dur = Math.max(0.08, wEnd - wStart);
      clips.push({
        id: `cap-${segStart}-${i}`,
        trackId: "captions",
        start: wStart,
        duration: dur,
        label: text,
        props: { text },
        color: "#7C4DFF",
      });
    }
  }
  return clips;
}

function probeAudioDurationSec(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    const dur = parseFloat(output);
    return Number.isFinite(dur) && dur > 0 ? dur : 0;
  } catch {
    return 0;
  }
}

function migrateVoiceClip(projDir, blockTimings = {}) {
  const source = NARRATION_FILES.find((f) =>
    fs.existsSync(path.join(projDir, f))
  );
  if (!source) return null;

  let total =
    Number(blockTimings.total_duration) ||
    (blockTimings.durations || []).reduce((a, d) => a + (Number(d) || 0), 0) ||
    0;
  if (total <= 0) {
    total = probeAudioDurationSec(path.join(projDir, source));
  }
  if (total <= 0) total = 60;

  return {
    id: "voice-main",
    trackId: "voice",
    start: 0,
    duration: total,
    label: "Narração",
    source,
    color: "#E91E8C",
    locked: true,
  };
}

function migrateSfxClips(sfxTimeline = {}) {
  const events = sfxTimeline.sfx_events || sfxTimeline.events || [];
  return events.map((ev, i) => ({
    id: `sfx-${i}`,
    trackId: "sfx",
    start: Number(ev.time) || 0,
    duration: 0.6,
    label: String(ev.file || "sfx").replace(/\.[^.]+$/, ""),
    source: String(ev.file || ""),
    props: { volume: Number(ev.volume) || 0.05 },
    color: "#FF6D00",
  }));
}

function migrateMusicClip(config = {}, projDir) {
  const bgm = resolveStudioBgmSource(config, projDir);
  if (!bgm) return null;

  const total = Number(config.total_duration) || 120;
  return {
    id: "music-main",
    trackId: "music",
    start: 0,
    duration: total,
    label: String(bgm).split("/").pop(),
    source: String(bgm),
    color: "#5C6BC0",
    props: {
      volume:
        Number(config.project_music_volume ?? config.music_volume) || 0.15,
    },
  };
}

function resolveTotalDuration(blockTimings, clips) {
  if (Number(blockTimings?.total_duration) > 0)
    return Number(blockTimings.total_duration);
  const sum = (blockTimings?.durations || []).reduce(
    (a, d) => a + (Number(d) || 0),
    0
  );
  if (sum > 0) return sum;
  const end = clips.reduce(
    (max, c) =>
      Math.max(max, (Number(c.start) || 0) + (Number(c.duration) || 0)),
    0
  );
  return end > 0 ? end : 60;
}

export function migrateLegacyToTimelineStudio(projDir, { force = false } = {}) {
  const studioPath = path.join(projDir, STUDIO_FILENAME);
  if (!force && fs.existsSync(studioPath)) {
    const existing = readJson(studioPath);
    if (existing?.version >= 1 && Array.isArray(existing.clips)) {
      return { studio: existing, migrated: false, path: studioPath };
    }
  }

  const config = readJson(path.join(projDir, "config_qanat.json"), {}) || {};
  const storyboard = readJson(path.join(projDir, "storyboard.json"), {}) || {};
  const blockTimings =
    readJson(path.join(projDir, "block_timings.json"), {}) || {};
  const wordTranscripts =
    readJson(path.join(projDir, "word_transcripts.json"), []) || [];
  const sfxTimeline =
    readJson(path.join(projDir, "sfx_timeline.json"), {}) || {};

  const clips = [
    ...migrateVideoClips(config.timeline_assets || {}, blockTimings),
    ...migrateOverlayClips(storyboard),
    ...migrateMotionClips(storyboard),
    ...migrateCaptionClips(wordTranscripts),
    ...migrateSfxClips(sfxTimeline),
  ];

  const voice = migrateVoiceClip(projDir, blockTimings);
  if (voice) clips.unshift(voice);

  const music = migrateMusicClip(config, projDir);
  if (music) clips.push(music);

  const sortedClips = clips.sort((a, b) => a.start - b.start);
  const { clips: tightenedClips } = tightenStudioTimelineClips(sortedClips);

  const format = config.aspect_ratio === "9:16" ? "9:16" : "16:9";
  let studio = {
    version: 1,
    format,
    niche_pack: resolveNichePack(config, storyboard),
    playhead: 0,
    zoom: 1,
    pixelsPerSecond: format === "9:16" ? 48 : 40,
    tracks: defaultTracks(),
    clips: tightenedClips,
    totalDuration: resolveTotalDuration(blockTimings, tightenedClips),
    migratedAt: new Date().toISOString(),
    migratedFrom: [
      "timeline_assets",
      "storyboard.overlays",
      "word_transcripts",
      "sfx_timeline",
    ],
  };

  studio = upsertMusicClipInStudio(studio, config, projDir);

  fs.writeFileSync(studioPath, JSON.stringify(studio, null, 2), "utf8");
  return { studio, migrated: true, path: studioPath };
}

function studioMotionMigrationFingerprint(studio = {}) {
  return JSON.stringify({
    tracks: (studio.tracks || []).map((t) => t.id),
    clips: (studio.clips || []).map((c) => ({
      id: c.id,
      trackId: c.trackId,
      presentation: c.props?.presentation,
      layout: c.props?.layout,
    })),
  });
}

function narrationClipsFingerprint(clips = []) {
  const voice = clips.filter((c) => c.trackId === "voice");
  const captions = clips.filter((c) => c.trackId === "captions");
  return JSON.stringify({
    voice: voice.map((c) => ({
      id: c.id,
      source: c.source,
      duration: c.duration,
    })),
    captionCount: captions.length,
    captionSample: captions.slice(0, 5).map((c) => ({
      start: c.start,
      duration: c.duration,
      label: c.label,
    })),
  });
}

/**
 * Reconstrói trilhas voice + captions a partir de block_timings, word_transcripts
 * e arquivo de narração no disco — fonte de verdade pós-TTS/Whisper.
 */
export function syncNarrationToTimelineStudio(projDir, studio) {
  if (!studio || !Array.isArray(studio.clips)) {
    return { studio, changed: false };
  }

  const blockTimings =
    readJson(path.join(projDir, "block_timings.json"), {}) || {};
  const wordTranscripts =
    readJson(path.join(projDir, "word_transcripts.json"), []) || [];

  const beforeFp = narrationClipsFingerprint(studio.clips);
  const beforeTotal = Number(studio.totalDuration) || 0;

  const otherClips = studio.clips.filter(
    (c) => c.trackId !== "voice" && c.trackId !== "captions"
  );
  const narrationClips = [...migrateCaptionClips(wordTranscripts)];
  const voice = migrateVoiceClip(projDir, blockTimings);
  if (voice) narrationClips.unshift(voice);

  const merged = [...otherClips, ...narrationClips].sort(
    (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
  );
  const { clips: tightenedClips } = tightenStudioTimelineClips(merged);
  const totalDuration = resolveTotalDuration(blockTimings, tightenedClips);

  const nextStudio = {
    ...studio,
    clips: tightenedClips,
    totalDuration,
  };

  const afterFp = narrationClipsFingerprint(tightenedClips);
  const changed =
    beforeFp !== afterFp || Math.abs(beforeTotal - totalDuration) > 0.01;

  return { studio: nextStudio, changed };
}

/** Sincroniza narração no disco e persiste quando necessário. */
export function applyNarrationSyncToProject(projDir, studio = null) {
  const studioPath = path.join(projDir, STUDIO_FILENAME);
  let base = studio;
  if (!base) {
    if (fs.existsSync(studioPath)) {
      base = readJson(studioPath, null);
    } else {
      const migrated = migrateLegacyToTimelineStudio(projDir);
      return {
        studio: migrated.studio,
        changed: Boolean(migrated.migrated),
        created: Boolean(migrated.migrated),
      };
    }
  }
  const { studio: next, changed } = syncNarrationToTimelineStudio(
    projDir,
    base
  );
  if (changed) saveTimelineStudio(projDir, next);
  return { studio: next, changed, created: false };
}

function repairStudioOnLoad(projDir, studio) {
  const storyboard = readStoryboardJson(projDir);
  let next = migrateStudioMotionClipsFromVideo(studio);
  const suppression = collectSuppressionState(next);
  if (suppression.ids.size > 0 || suppression.fingerprints.size > 0) {
    pruneStoryboardRemotionSources(projDir, next);
    next = stripSuppressedRemotionClips(next);
  }
  next = enrichStudioSatelliteClips(next);
  const merged = mergeRemotionFromStoryboard(next, storyboard);
  next = stripSuppressedRemotionClips(merged.studio);
  next = enrichStudioSatelliteClips(next);
  const { studio: withNarration } = syncNarrationToTimelineStudio(
    projDir,
    next
  );
  const { studio: withGeoPip, changed: geoPipChanged } =
    enrichGeoPipStudioClipsOnLoad(withNarration, projDir, storyboard);
  if (geoPipChanged) saveTimelineStudio(projDir, withGeoPip);
  return withGeoPip;
}

export function loadTimelineStudio(projDir) {
  const result = migrateLegacyToTimelineStudio(projDir);
  if (!result?.studio) return result;

  const beforeFp = JSON.stringify({
    motion: studioMotionMigrationFingerprint(result.studio),
    clips: (result.studio.clips || []).map((c) => c.id),
    sup: result.studio.suppressedMotionSceneIds,
    narration: narrationClipsFingerprint(result.studio.clips),
  });
  const studio = repairStudioOnLoad(projDir, result.studio);
  const afterFp = JSON.stringify({
    motion: studioMotionMigrationFingerprint(studio),
    clips: (studio.clips || []).map((c) => c.id),
    sup: studio.suppressedMotionSceneIds,
    narration: narrationClipsFingerprint(studio.clips),
  });

  if (beforeFp !== afterFp) {
    saveTimelineStudio(projDir, studio);
    result.motionMigrated = true;
  }
  result.studio = studio;
  return result;
}

function remotionClipFingerprint(clips = []) {
  return JSON.stringify(
    clips
      .filter((c) => c?.trackId === "motion" || c?.trackId === "overlays")
      .map((c) => ({
        id: c.id,
        trackId: c.trackId,
        start: c.start,
        templateId: c.templateId,
        props: c.props,
      }))
  );
}

function readStoryboardJson(projDir) {
  try {
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) return {};
    return JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
  } catch {
    return {};
  }
}

function writeStoryboardJson(projDir, storyboard) {
  const storyboardPath = path.join(projDir, "storyboard.json");
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");
}

function isStudioMotionClip(clip = {}) {
  return Boolean(
    clip.trackId === MOTION_TRACK_ID ||
    clip.motionScene ||
    clip.motionScenePrimary ||
    clip.props?.motion_scene
  );
}

/**
 * Propaga start/duration dos clips motion da timeline → motion_scenes do storyboard.
 * Fonte de verdade após edição no Editor Timing (timeline_studio.json).
 */
export function syncStudioTimingToStoryboard(projDir, studio = {}) {
  const storyboardPath = path.join(projDir, "storyboard.json");
  if (!fs.existsSync(storyboardPath)) {
    return { changed: false, motion_scenes: [] };
  }

  let storyboard;
  try {
    storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
  } catch {
    return { changed: false, motion_scenes: [] };
  }

  const motionScenes = Array.isArray(storyboard.motion_scenes)
    ? storyboard.motion_scenes
    : [];
  if (!motionScenes.length) {
    return { changed: false, motion_scenes: [] };
  }

  const motionClips = (studio.clips || []).filter(isStudioMotionClip);
  if (!motionClips.length) {
    return { changed: false, motion_scenes: motionScenes };
  }

  const clipById = new Map();
  for (const clip of motionClips) {
    const id = String(clip.id || "").trim();
    if (id) clipById.set(id, clip);
    const motionId = String(clip.props?.motion_scene_id || "").trim();
    if (motionId) clipById.set(motionId, clip);
  }

  let changed = false;
  const nextScenes = motionScenes.map((ms) => {
    const id = String(ms?.id || "").trim();
    const clip = clipById.get(id);
    if (!clip) return ms;

    const start = Math.max(0, Number(clip.start) || 0);
    const duration = Math.max(0.5, Number(clip.duration) || 4);
    const prevStart = Number(ms.start_hint) || 0;
    const prevDur = Number(ms.duration_seconds) || 4;

    if (
      Math.abs(start - prevStart) < 0.001 &&
      Math.abs(duration - prevDur) < 0.001
    ) {
      return ms;
    }

    changed = true;
    return {
      ...ms,
      start_hint: start,
      duration_seconds: duration,
    };
  });

  if (!changed) {
    return { changed: false, motion_scenes: motionScenes };
  }

  storyboard.motion_scenes = nextScenes;
  writeStoryboardJson(projDir, storyboard);
  return { changed: true, motion_scenes: nextScenes };
}

/**
 * Persistência atômica: supressões + prune storyboard + remove clips bloqueados.
 */
export function finalizeStudioForDisk(
  projDir,
  studio,
  { previousStudio = null, mergeStoryboard = false } = {}
) {
  const storyboard = readStoryboardJson(projDir);
  let next = studio;

  if (previousStudio) {
    next = mergeDeletedClipSuppressions(storyboard, previousStudio, next);
  }

  const suppression = collectSuppressionState(next);
  if (suppression.ids.size > 0 || suppression.fingerprints.size > 0) {
    pruneStoryboardRemotionSources(projDir, next);
    next = stripSuppressedRemotionClips(next);
  }

  if (mergeStoryboard) {
    const merged = mergeRemotionFromStoryboard(next, storyboard);
    next = stripSuppressedRemotionClips(merged.studio);
  } else {
    next = stripSuppressedRemotionClips(next);
  }
  next = enrichStudioSatelliteClips(next);

  syncStudioTimingToStoryboard(projDir, next);
  return saveTimelineStudio(projDir, next);
}

/**
 * Remove do storyboard cenas/templates que o usuário excluiu na timeline.
 * Evita que GET /api/timeline-studio as restaure no F5.
 */
/** Remove do storyboard overlays legados e motion scenes sem TSX do Template Studio. */
export function purgeLegacyStoryboardRemotion(storyboard = {}) {
  if (!storyboard || typeof storyboard !== "object") {
    return { storyboard, changed: false };
  }
  const next = { ...storyboard };
  let changed = false;

  for (const key of ["overlays_ai", "overlays"]) {
    if (!Array.isArray(next[key]) || !next[key].length) continue;
    next[key] = [];
    changed = true;
  }

  if (Array.isArray(next.motion_scenes)) {
    const filtered = next.motion_scenes.filter((ms) =>
      isRunnableStudioMotionScene(ms)
    );
    if (filtered.length !== next.motion_scenes.length) {
      next.motion_scenes = filtered;
      changed = true;
    }
  }

  return { storyboard: next, changed };
}

export function pruneStoryboardRemotionSources(projDir, studioOrIds = {}) {
  const state =
    studioOrIds &&
    typeof studioOrIds === "object" &&
    !Array.isArray(studioOrIds)
      ? collectSuppressionState(studioOrIds)
      : {
          ids: new Set(
            (Array.isArray(studioOrIds) ? studioOrIds : [])
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          ),
          fingerprints: new Set(),
        };
  if (!state.ids.size && !state.fingerprints.size) return false;

  const storyboardPath = path.join(projDir, "storyboard.json");
  if (!fs.existsSync(storyboardPath)) return false;

  let storyboard;
  try {
    storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
  } catch {
    return false;
  }

  let changed = false;

  if (Array.isArray(storyboard.motion_scenes)) {
    const next = storyboard.motion_scenes.filter(
      (ms) => !storyboardRowMatchesSuppression(ms, "motion", state)
    );
    if (next.length !== storyboard.motion_scenes.length) {
      storyboard.motion_scenes = next;
      changed = true;
    }
  }

  for (const key of ["overlays_ai", "overlays"]) {
    if (!Array.isArray(storyboard[key])) continue;
    const next = storyboard[key].filter(
      (o) => !storyboardRowMatchesSuppression(o, "overlays", state)
    );
    if (next.length !== storyboard[key].length) {
      storyboard[key] = next;
      changed = true;
    }
  }

  if (Array.isArray(storyboard.visual_prompts)) {
    storyboard.visual_prompts = storyboard.visual_prompts.map((vp) => {
      const motionId = String(vp?.motion_scene_id || "").trim();
      if (!motionId || !state.ids.has(motionId)) return vp;
      changed = true;
      const next = { ...vp };
      delete next.motion_scene_id;
      delete next.motion_template_id;
      if (next.media_mode === "remotion") next.media_mode = "video";
      return next;
    });
  }

  if (changed) {
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(storyboard, null, 2),
      "utf8"
    );
  }
  return changed;
}

/**
 * Sincroniza motion_scenes + overlays_ai do storyboard para clips da timeline.
 * motion → trilha "Cenas Remotion"; counter/timeline/etc. → trilha "Templates".
 * Não limpa suppressedMotionSceneIds — exclusões do usuário persistem no F5.
 */
export function mergeRemotionFromStoryboard(
  studio,
  storyboard = {},
  { syncMotion = true } = {}
) {
  if (!studio || !Array.isArray(studio.clips)) {
    return { studio, remotionRestored: 0, motionSynced: 0 };
  }

  const suppression = collectSuppressionState(studio);
  const beforeFp = remotionClipFingerprint(studio.clips);

  let next = studio;
  if (syncMotion) {
    next = syncMotionScenesToStudio(next, storyboard.motion_scenes || []);
  }

  const byId = new Map(next.clips.map((c) => [c.id, c]));

  const clips = [...byId.values()]
    .filter((c) => !clipMatchesSuppression(c, suppression))
    .sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
  const legacyStrip = stripLegacyStudioOverlayClips(clips);
  const mergedStudio = { ...next, clips: legacyStrip.clips };
  const afterFp = remotionClipFingerprint(mergedStudio.clips);
  const motionSynced = afterFp !== beforeFp ? 1 : 0;

  if (!motionSynced && legacyStrip.removed === 0) {
    return { studio: next, remotionRestored: 0, motionSynced: 0 };
  }

  return {
    studio: mergedStudio,
    remotionRestored: 0,
    motionSynced,
  };
}

export function saveTimelineStudio(projDir, studio) {
  const studioPath = path.join(projDir, STUDIO_FILENAME);
  const payload = {
    ...studio,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(studioPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export { STUDIO_FILENAME };
