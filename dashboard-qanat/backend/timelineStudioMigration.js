/**
 * Migração legacy → timeline_studio.json (Fase 1 Timeline Studio)
 */

import fs from "fs";
import path from "path";
import { tightenStudioTimelineClips } from "../shared/timelineStudioTighten.js";
import {
  resolveStudioBgmSource,
  upsertMusicClipInStudio,
} from "../shared/timelineStudioMusic.js";

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

function migrateOverlayClips(storyboard = {}) {
  const overlays =
    Array.isArray(storyboard.overlays) && storyboard.overlays.length
      ? storyboard.overlays
      : storyboard.overlays_ai || [];
  return overlays
    .filter((o) => o && o.type)
    .map((o, i) => ({
      id: String(o.id || `overlay-${i + 1}`),
      trackId: "overlays",
      start: Number(o.start) || 0,
      duration: Number(o.duration) || 4,
      label: String(
        o.props?.title || o.props?.text || o.props?.location || o.type
      ),
      templateId: o.type,
      props: { ...(o.props || {}), overlayType: o.type },
      color: "#00897B",
      legacyOverlay: true,
    }));
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

function migrateVoiceClip(projDir, blockTimings = {}) {
  const total =
    Number(blockTimings.total_duration) ||
    (blockTimings.durations || []).reduce((a, d) => a + (Number(d) || 0), 0) ||
    60;

  const source = NARRATION_FILES.find((f) =>
    fs.existsSync(path.join(projDir, f))
  );
  if (!source) return null;

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

export function loadTimelineStudio(projDir) {
  const result = migrateLegacyToTimelineStudio(projDir);
  const config = readJson(path.join(projDir, "config_qanat.json"), {}) || {};
  return {
    ...result,
    studio: upsertMusicClipInStudio(result.studio, config, projDir),
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
