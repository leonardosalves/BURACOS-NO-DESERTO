/**
 * Fecha espaços vazios entre clips consecutivos na mesma trilha.
 * Migração Whisper/audio_start deixa gaps que o render preenche via fillSceneTimelineGaps.
 */

const MIN_GAP = 0.02;

function isDurationLocked(clip) {
  return Boolean(clip?.locked || clip?.durationLocked);
}

/**
 * Estende a duração de cada clip até o início do próximo (até maxGap).
 * @param {Array} clips
 * @param {string} trackId
 * @param {{ maxGap?: number }} [options]
 */
export function tightenTrackGaps(clips, trackId, options = {}) {
  const maxGap = Number.isFinite(options.maxGap) ? options.maxGap : Infinity;
  const sorted = (Array.isArray(clips) ? clips : [])
    .filter((c) => c?.trackId === trackId)
    .sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));

  const patches = new Map();

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (isDurationLocked(curr)) continue;

    const currEnd = (Number(curr.start) || 0) + (Number(curr.duration) || 0);
    const gap = (Number(next.start) || 0) - currEnd;
    if (gap > MIN_GAP && gap <= maxGap) {
      patches.set(curr.id, {
        duration: (Number(curr.duration) || 0) + gap,
      });
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

/** Vídeo: preenche todos os gaps. Legendas: só pausas curtas entre palavras (< 1.5s). */
export function tightenStudioTimelineClips(clips) {
  let result = Array.isArray(clips) ? [...clips] : [];
  let closed = 0;

  const video = tightenTrackGaps(result, "video", { maxGap: Infinity });
  result = video.clips;
  closed += video.closed;

  const caps = tightenTrackGaps(result, "captions", { maxGap: 1.5 });
  result = caps.clips;
  closed += caps.closed;

  return { clips: result, closed };
}
