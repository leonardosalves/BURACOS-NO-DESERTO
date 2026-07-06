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
  totalDuration: number
): StudioClip[] {
  const clip = findClip(clips, clipId);
  if (!clip || !isClipEditable(clip)) return clips;

  const initialStart = clip.start;
  const initialEnd = clip.start + clip.duration;

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
