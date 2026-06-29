/** Sanitiza timeline_assets — sem repetir o mesmo arquivo dentro do bloco. */

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

export function dedupeBlockUniqueAssets<T extends TimelineAssetRow>(
  assets: T[],
  pool: string[] = [],
): T[] {
  if (!Array.isArray(assets)) return [];
  const used = new Set<string>();
  const files = pool.length ? pool : assets.map((a) => String(a?.asset || "").trim()).filter(Boolean);
  let cursor = 0;
  const result: T[] = [];

  for (const asset of assets) {
    let path = String(asset?.asset || "").trim();
    if (!path) {
      result.push(asset);
      continue;
    }
    if (used.has(path)) {
      let replacement = "";
      for (let i = 0; i < files.length; i++) {
        const candidate = files[(cursor + i) % files.length];
        if (candidate && !used.has(candidate) && candidate !== path) {
          replacement = candidate;
          cursor = (cursor + i + 1) % files.length;
          break;
        }
      }
      if (!replacement) continue;
      path = replacement;
    }
    used.add(path);
    result.push({ ...asset, asset: path });
  }
  return result;
}

export function sanitizeTimelineAssets(
  timeline: Record<string, TimelineAssetRow[]> | undefined,
): { timeline: Record<string, TimelineAssetRow[]>; removed: number } {
  const src = timeline || {};
  const next: Record<string, TimelineAssetRow[]> = {};
  let removed = 0;

  const pool = Object.values(src)
    .flat()
    .map((a) => String(a?.asset || "").trim())
    .filter(Boolean);

  for (const blockKey of Object.keys(src)) {
    const before = src[blockKey] || [];
    const unique = dedupeBlockUniqueAssets(before, pool);
    const after = dedupeConsecutiveTimelineAssets(unique);
    removed += Math.max(0, before.length - after.length);
    next[blockKey] = after;
  }
  return { timeline: next, removed };
}