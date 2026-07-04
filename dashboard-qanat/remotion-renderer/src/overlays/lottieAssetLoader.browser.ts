import { lottieFileForKey } from "./listicleHudTheme";

const cache = new Map<string, object>();

export function getLottieAssetUrl(filename: string): string {
  return `/lottie_assets/${encodeURIComponent(filename)}`;
}

export async function fetchLottieAnimation(filename: string): Promise<object> {
  if (cache.has(filename)) return cache.get(filename)!;
  const res = await fetch(getLottieAssetUrl(filename));
  if (!res.ok) throw new Error(`Lottie fetch failed (${res.status}): ${filename}`);
  const data = (await res.json()) as object;
  cache.set(filename, data);
  return data;
}

export async function fetchLottieDataForKey(key?: string, seed?: number): Promise<object> {
  return fetchLottieAnimation(lottieFileForKey(key, seed));
}