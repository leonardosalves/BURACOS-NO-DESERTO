export type StudioTrackType =
  "voice" | "captions" | "video" | "overlays" | "sfx" | "music";

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
  const vids = clipsOnTrack(clips, "video");
  return (
    vids.find((c) => playhead >= c.start && playhead < c.start + c.duration) ||
    null
  );
}
