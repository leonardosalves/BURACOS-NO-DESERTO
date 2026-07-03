export type FilmstripSegment = {
  id: string;
  start: number;
  duration: number;
  asset?: string;
  assetType?: string;
  blockKey: string;
  blockLabel: string;
};

/** Paths herdados do config global — não são B-roll do projeto. */
const GHOST_ASSET_PREFIXES = ['logos/'];

export function isGhostTimelineAssetPath(assetPath?: string): boolean {
  const normalized = String(assetPath || '').trim().replace(/\\/g, '/').toLowerCase();
  if (!normalized) return true;
  return GHOST_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** Remove slots herdados (logos/*); mantém blocos vazios para placeholder na faixa. */
export function filterFilmstripSegmentsForPreview(segments: FilmstripSegment[]): FilmstripSegment[] {
  return segments.filter((seg) => !isGhostTimelineAssetPath(seg.asset));
}

export type BlockTimingsLike = {
  starts?: number[];
  durations?: number[];
  total_duration?: number;
};

function segmentDuration(asset: Record<string, unknown>, blockDur: number, count: number): number {
  const d = Number(asset.duration ?? asset.duration_seconds);
  if (Number.isFinite(d) && d > 0) return d;
  return blockDur / Math.max(1, count);
}

export function buildFilmstripSegments(
  timelineAssets: Record<string, Array<Record<string, unknown>>> = {},
  blockTimings?: BlockTimingsLike | null,
): FilmstripSegment[] {
  const starts = blockTimings?.starts || [];
  const blockDurations = blockTimings?.durations || [];
  const blockKeys = Object.keys(timelineAssets)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const segments: FilmstripSegment[] = [];
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
      : assets.reduce((sum, a) => sum + segmentDuration(a, 10, assets.length), 0);

    let cursor = blockStart;
    assets.forEach((asset, idx) => {
      const dur = segmentDuration(asset, blockDur, assets.length);
      const audioStart = Number(asset.audio_start);
      const start = Number.isFinite(audioStart) ? audioStart : cursor;
      segments.push({
        id: `${blockKey}-${idx}`,
        start,
        duration: dur,
        asset: String(asset.asset || '').trim() || undefined,
        assetType: String(asset.type || 'image'),
        blockKey,
        blockLabel: `Bloco ${blockKey}`,
      });
      cursor = start + dur;
    });

    fallbackCursor = Math.max(fallbackCursor, cursor);
  }

  return segments.sort((a, b) => a.start - b.start);
}

export function resolveTotalDuration(
  blockTimings: BlockTimingsLike | null | undefined,
  segments: FilmstripSegment[],
): number {
  if (blockTimings?.total_duration && blockTimings.total_duration > 0) {
    return blockTimings.total_duration;
  }
  const durs = blockTimings?.durations || [];
  const sum = durs.reduce((acc, d) => acc + (Number(d) || 0), 0);
  if (sum > 0) return sum;
  const end = segments.reduce((max, s) => Math.max(max, s.start + s.duration), 0);
  return end > 0 ? end : 60;
}