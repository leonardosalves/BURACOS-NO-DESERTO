export type StudioTrackType =
  "voice" | "captions" | "video" | "motion" | "overlays" | "sfx" | "music";

export type StudioTrack = {
  id: string;
  type: StudioTrackType;
  label: string;
  locked?: boolean;
  color?: string;
  height?: number;
};

export type StudioClip = {
  id: string;
  trackId: string;
  start: number;
  duration: number;
  label?: string;
  source?: string;
  templateId?: string;
  props?: Record<string, unknown>;
  color?: string;
  locked?: boolean;
  durationLocked?: boolean;
  legacyOverlay?: boolean;
  motionScene?: boolean;
  motionScenePrimary?: boolean;
};

export type TimelineStudioState = {
  version: number;
  format: "16:9" | "9:16";
  niche_pack: string;
  playhead: number;
  zoom: number;
  pixelsPerSecond?: number;
  tracks: StudioTrack[];
  clips: StudioClip[];
  suppressedMotionSceneIds?: string[];
  suppressedRemotionFingerprints?: string[];
  totalDuration?: number;
  migratedAt?: string;
  updatedAt?: string;
};

export function formatStudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function clipAtPlayhead(
  clips: StudioClip[],
  playhead: number
): StudioClip | null {
  return (
    clips.find((c) => playhead >= c.start && playhead < c.start + c.duration) ||
    null
  );
}

export function clipsOnTrack(
  clips: StudioClip[],
  trackId: string
): StudioClip[] {
  return clips
    .filter((c) => c.trackId === trackId)
    .sort((a, b) => a.start - b.start);
}

export function activeCaptionAt(
  clips: StudioClip[],
  playhead: number
): StudioClip | null {
  const caps = clipsOnTrack(clips, "captions");
  return (
    caps.find((c) => playhead >= c.start && playhead < c.start + c.duration) ||
    null
  );
}

export function activeVideoAt(
  clips: StudioClip[],
  playhead: number
): StudioClip | null {
  const vids = clipsOnTrack(clips, "video").filter((c) =>
    Boolean(String(c.source || "").trim())
  );
  return (
    vids.find((c) => playhead >= c.start && playhead < c.start + c.duration) ||
    null
  );
}

/** Preview: clip no playhead ou o B-roll com source mais próximo (evita «Sem mídia» em gaps). */
export function previewVideoAt(
  clips: StudioClip[],
  playhead: number
): StudioClip | null {
  const direct = activeVideoAt(clips, playhead);
  if (direct) return direct;

  const vids = clipsOnTrack(clips, "video").filter((c) =>
    Boolean(String(c.source || "").trim())
  );
  if (!vids.length) return null;

  let best: StudioClip | null = null;
  let bestDist = Infinity;
  for (const clip of vids) {
    const end = clip.start + clip.duration;
    let dist = 0;
    if (playhead < clip.start) dist = clip.start - playhead;
    else if (playhead >= end) dist = playhead - end;
    if (dist < bestDist) {
      bestDist = dist;
      best = clip;
    }
  }
  return bestDist <= 45 ? best : vids[0] || null;
}

export function activeMotionAt(
  clips: StudioClip[],
  playhead: number
): StudioClip[] {
  return clipsOnTrack(clips, "motion").filter(
    (c) => playhead >= c.start && playhead < c.start + c.duration
  );
}

const MOTION_TRACK: StudioTrack = {
  id: "motion",
  type: "motion",
  label: "Cenas Remotion",
  color: "#6A1B9A",
  height: 36,
};

/** Garante trilha motion quando há clips ou após migração legada. */
export function ensureMotionTrackInStudio(
  studio: TimelineStudioState
): TimelineStudioState {
  const hasMotionClips = studio.clips.some((c) => c.trackId === "motion");
  if (!hasMotionClips && studio.tracks.some((t) => t.id === "motion")) {
    return studio;
  }
  if (studio.tracks.some((t) => t.id === "motion")) return studio;
  const tracks = [...studio.tracks];
  const videoIdx = tracks.findIndex((t) => t.id === "video");
  tracks.splice(videoIdx >= 0 ? videoIdx + 1 : tracks.length, 0, MOTION_TRACK);
  return { ...studio, tracks };
}
