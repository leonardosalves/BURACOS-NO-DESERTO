import { lottieFileForKey } from "./listicleHudTheme";
import { LOTTIE_ASSET_MAP } from "./lottieAssetMap.generated";
import { LOTTIE_DEFAULT_FILE } from "./lottieRegistry.generated";

const cache = new Map<string, object>();

export function lottieDataForKey(key?: string, seed?: number): object {
  const filename = lottieFileForKey(key, seed);
  if (cache.has(filename)) return cache.get(filename)!;

  const data = LOTTIE_ASSET_MAP[filename] ?? LOTTIE_ASSET_MAP[LOTTIE_DEFAULT_FILE];
  if (!data) {
    throw new Error(`Lottie asset not found in bundle map: ${filename}`);
  }
  cache.set(filename, data);
  return data;
}