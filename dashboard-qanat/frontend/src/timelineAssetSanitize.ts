/** Sanitiza timeline_assets — remove repetição consecutiva do mesmo arquivo no bloco. */

export type TimelineAssetRow = { asset?: string; [key: string]: unknown };

export function dedupeConsecutiveTimelineAssets<T extends TimelineAssetRow>(assets: T[]): T[] {
  if (!Array.isArray(assets) || assets.length <= 1) return assets || [];
  const result: T[] = [];
  for (const asset of assets) {
    const path = String(asset?.asset || "").trim();
    const last = result[result.length - 1];
    if (path && last && String(last?.asset || "").trim() === path) continue;
    result.push(asset);
  }
  return result;
}

export function sanitizeTimelineAssets(
  timeline: Record<string, TimelineAssetRow[]> | undefined,
): { timeline: Record<string, TimelineAssetRow[]>; removed: number } {
  const src = timeline || {};
  const next: Record<string, TimelineAssetRow[]> = {};
  let removed = 0;
  for (const blockKey of Object.keys(src)) {
    const before = src[blockKey] || [];
    const after = dedupeConsecutiveTimelineAssets(before);
    removed += Math.max(0, before.length - after.length);
    next[blockKey] = after;
  }
  return { timeline: next, removed };
}