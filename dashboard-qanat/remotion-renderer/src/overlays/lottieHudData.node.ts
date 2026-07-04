import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { lottieFileForKey } from "./listicleHudTheme";

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "lottie_assets");
const syncCache = new Map<string, object>();

export function readLottieAnimationSync(filename: string): object {
  if (syncCache.has(filename)) return syncCache.get(filename)!;
  const full = path.join(ASSETS_DIR, filename);
  const data = JSON.parse(fs.readFileSync(full, "utf8")) as object;
  syncCache.set(filename, data);
  return data;
}

/** Síncrono — só para Remotion/Node (render). */
export function lottieDataForKey(key?: string, seed?: number): object {
  return readLottieAnimationSync(lottieFileForKey(key, seed));
}