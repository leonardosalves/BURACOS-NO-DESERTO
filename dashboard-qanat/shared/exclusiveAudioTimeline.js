/**
 * Mantém áudio/captions no mesmo relógio do conteúdo quando uma intro exclusiva
 * foi aplicada antes do B-roll. Recebe props antes e depois do layout para não
 * depender de a lista de cenas já ter sido deslocada por outra policy.
 */
export function alignExclusiveAudioTimeline(rawProps = {}, laidOutProps = {}) {
  const introDur = Number(laidOutProps?.exclusiveLayout?.introDur) || 0;
  if (introDur <= 0) return laidOutProps;

  const rawSfx = Array.isArray(rawProps.sfxTracks) ? rawProps.sfxTracks : [];
  const laidOutSfx = Array.isArray(laidOutProps.sfxTracks)
    ? laidOutProps.sfxTracks
    : [];
  const sfxTracks = laidOutSfx.map((track, index) => {
    const raw = rawSfx[index];
    if (!raw) return track;
    return {
      ...track,
      start: Number(raw.start || 0) + introDur,
      exclusive_timeline_shifted: true,
    };
  });

  const captions = (
    Array.isArray(rawProps.captions) ? rawProps.captions : []
  ).map((caption) => {
    const padMs = Math.round(introDur * 1000);
    return {
      ...caption,
      startMs: Math.max(0, Number(caption.startMs || 0) + padMs),
      endMs: Math.max(0, Number(caption.endMs || 0) + padMs),
      timestampMs:
        caption.timestampMs == null
          ? caption.timestampMs
          : Math.max(0, Number(caption.timestampMs) + padMs),
    };
  });

  const rawBgm = Array.isArray(rawProps.bgmTracks) ? rawProps.bgmTracks : [];
  const laidOutBgm = Array.isArray(laidOutProps.bgmTracks)
    ? laidOutProps.bgmTracks
    : [];
  const bgmTracks = laidOutBgm.map((track, index) => ({
    ...track,
    start: Math.max(introDur, Number(rawBgm[index]?.start || 0) + introDur),
  }));

  const bgmDuckPoints = Array.isArray(rawProps.bgmDuckPoints)
    ? rawProps.bgmDuckPoints.map((point) => {
        const value = Number(point);
        if (!Number.isFinite(value)) return point;
        return value >= 1000 ? value + introDur * 1000 : value + introDur;
      })
    : laidOutProps.bgmDuckPoints;

  return {
    ...laidOutProps,
    captions,
    sfxTracks,
    bgmTracks,
    bgmDuckPoints,
    exclusiveLayout: {
      ...laidOutProps.exclusiveLayout,
      timelineShifted: true,
    },
  };
}
