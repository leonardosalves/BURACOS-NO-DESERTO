/**
 * reverseEngineeringCache.js
 * Cache of Video Reverse Engineering results by (URL + format + mode + strategy).
 * Avoids reprocessing the same video (multimodal analysis + 2 LLM passes = expensive).
 *
 * Disable via env: REVERSE_CACHE=false
 * Default TTL: 24h (configurable via REVERSE_CACHE_TTL_HOURS)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_TTL_MS =
  (Number(process.env.REVERSE_CACHE_TTL_HOURS) || 24) * 60 * 60 * 1000;

function cacheDir(workspaceDir) {
  return path.join(workspaceDir, ".cache", "reverse-engineering");
}

export function isCacheEnabled() {
  return process.env.REVERSE_CACHE !== "false";
}

export function getCacheKey({ url, format, mode, mediaStrategy }) {
  const raw = [url, format, mode, mediaStrategy].join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function readCache(workspaceDir, key) {
  if (!isCacheEnabled()) return null;
  const file = path.join(cacheDir(workspaceDir), `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - (data.cached_at || 0) > CACHE_TTL_MS) {
      return null; // expired
    }
    return data.result || null;
  } catch {
    return null;
  }
}

export function writeCache(workspaceDir, key, result) {
  if (!isCacheEnabled()) return false;
  try {
    fs.mkdirSync(cacheDir(workspaceDir), { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir(workspaceDir), `${key}.json`),
      JSON.stringify({ cached_at: Date.now(), result }, null, 2),
      "utf8"
    );
    return true;
  } catch (err) {
    console.warn("[reverse-cache] falha ao salvar:", err.message);
    return false;
  }
}

export function clearCache(workspaceDir) {
  const dir = cacheDir(workspaceDir);
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) fs.unlinkSync(path.join(dir, f));
  return files.length;
}
