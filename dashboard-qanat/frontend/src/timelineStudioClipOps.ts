import type { StudioClip } from "./timelineStudioTypes";

export const MIN_CLIP_DURATION = 0.08;
export const SNAP_STEP = 0.05;

export function snapTime(sec: number, step = SNAP_STEP): number {
  if (!Number.isFinite(sec)) return 0;
  return Math.round(sec / step) * step;
}

export function computeTotalDuration(
  clips: StudioClip[],
  fallback = 120
): number {
  let max = 0;
  for (const c of clips) {
    const end = (Number(c.start) || 0) + (Number(c.duration) || 0);
    if (end > max) max = end;
  }
  return Math.max(fallback, Math.ceil(max + 2));
}

export function findClip(clips: StudioClip[], id: string): StudioClip | null {
  return clips.find((c) => c.id === id) || null;
}

export function isClipEditable(clip: StudioClip): boolean {
  if (clip.locked) return false;
  if (clip.trackId === "voice") return false;
  return true;
}

export function updateClipInList(
  clips: StudioClip[],
  clipId: string,
  patch: Partial<StudioClip>
): StudioClip[] {
  return clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c));
}

export function moveClip(
  clips: StudioClip[],
  clipId: string,
  newStart: number,
  totalDuration: number
): StudioClip[] {
  const clip = findClip(clips, clipId);
  if (!clip || !isClipEditable(clip)) return clips;

  const start = snapTime(
    Math.max(0, Math.min(newStart, totalDuration - clip.duration))
  );
  return updateClipInList(clips, clipId, { start });
}

export function resizeClip(
  clips: StudioClip[],
  clipId: string,
  edge: "left" | "right",
  deltaSec: number,
  totalDuration: number,
  baseline?: { start: number; duration: number }
): StudioClip[] {
  const clip = findClip(clips, clipId);
  if (!clip || !isClipEditable(clip)) return clips;

  const initialStart = Number(baseline?.start ?? clip.start) || 0;
  const initialDuration = Number(baseline?.duration ?? clip.duration) || 0;
  const initialEnd = initialStart + initialDuration;

  if (edge === "left") {
    const newStart = snapTime(
      Math.max(
        0,
        Math.min(initialStart + deltaSec, initialEnd - MIN_CLIP_DURATION)
      )
    );
    const duration = snapTime(
      Math.max(MIN_CLIP_DURATION, initialEnd - newStart)
    );
    return updateClipInList(clips, clipId, { start: newStart, duration });
  }

  const newEnd = snapTime(
    Math.max(
      initialStart + MIN_CLIP_DURATION,
      Math.min(initialEnd + deltaSec, totalDuration)
    )
  );
  const duration = snapTime(Math.max(MIN_CLIP_DURATION, newEnd - initialStart));
  return updateClipInList(clips, clipId, { duration });
}

export function updateCaptionText(
  clips: StudioClip[],
  clipId: string,
  text: string
): StudioClip[] {
  const clip = findClip(clips, clipId);
  if (!clip || clip.trackId !== "captions") return clips;
  const trimmed = text.trim();
  return updateClipInList(clips, clipId, {
    label: trimmed,
    props: { ...clip.props, text: trimmed },
  });
}

export function deleteClip(clips: StudioClip[], clipId: string): StudioClip[] {
  const clip = findClip(clips, clipId);
  if (!clip || !isClipEditable(clip)) return clips;
  return clips.filter((c) => c.id !== clipId);
}

export function appendClip(
  clips: StudioClip[],
  clip: StudioClip
): StudioClip[] {
  return [...clips, clip];
}

const MIN_GAP_SEC = 0.02;

function isDurationLocked(clip: StudioClip): boolean {
  return Boolean(clip.locked || clip.durationLocked);
}

export function tightenTrackGaps(
  clips: StudioClip[],
  trackId: string,
  options: { maxGap?: number } = {}
): { clips: StudioClip[]; closed: number } {
  const maxGap = Number.isFinite(options.maxGap)
    ? (options.maxGap as number)
    : Infinity;
  const sorted = clips
    .filter((c) => c.trackId === trackId)
    .sort((a, b) => a.start - b.start);

  const patches = new Map<string, Partial<StudioClip>>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (isDurationLocked(curr)) continue;

    const currEnd = curr.start + curr.duration;
    const gap = next.start - currEnd;
    if (gap > MIN_GAP_SEC && gap <= maxGap) {
      patches.set(curr.id, { duration: curr.duration + gap });
    }
  }

  if (!patches.size) return { clips, closed: 0 };

  let closed = 0;
  const nextClips = clips.map((c) => {
    const patch = patches.get(c.id);
    if (!patch) return c;
    closed += 1;
    return { ...c, ...patch };
  });

  return { clips: nextClips, closed };
}

/** Vídeo: sem gaps. Legendas: só pausas curtas entre palavras. */
export function tightenStudioTimelineClips(clips: StudioClip[]): {
  clips: StudioClip[];
  closed: number;
} {
  let result = [...clips];
  let closed = 0;

  const video = tightenTrackGaps(result, "video", { maxGap: Infinity });
  result = video.clips;
  closed += video.closed;

  const caps = tightenTrackGaps(result, "captions", { maxGap: 1.5 });
  result = caps.clips;
  closed += caps.closed;

  return { clips: result, closed };
}

export type TimelineGap = { start: number; end: number; duration: number };

/** Calculates uncovered time across one or more visual tracks without double-counting overlaps. */
export function analyzeTimelineCoverage(
  clips: StudioClip[],
  trackIds: string[],
  totalDuration: number
): { coveredSeconds: number; coveragePercent: number; gaps: TimelineGap[] } {
  const total = Math.max(0, Number(totalDuration) || 0);
  if (!total) return { coveredSeconds: 0, coveragePercent: 0, gaps: [] };
  const allowed = new Set(trackIds);
  const ranges = clips
    .filter((clip) => allowed.has(clip.trackId) && Number(clip.duration) > 0)
    .map((clip) => ({
      start: Math.max(0, Number(clip.start) || 0),
      end: Math.min(
        total,
        (Number(clip.start) || 0) + (Number(clip.duration) || 0)
      ),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);
  const gaps: TimelineGap[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor + MIN_GAP_SEC) {
      gaps.push({
        start: cursor,
        end: range.start,
        duration: range.start - cursor,
      });
    }
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < total - MIN_GAP_SEC) {
    gaps.push({ start: cursor, end: total, duration: total - cursor });
  }
  const gapSeconds = gaps.reduce((sum, gap) => sum + gap.duration, 0);
  const coveredSeconds = Math.max(0, total - gapSeconds);
  return {
    coveredSeconds,
    coveragePercent: Math.round((coveredSeconds / total) * 100),
    gaps,
  };
}
