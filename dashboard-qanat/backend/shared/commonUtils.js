/**
 * Utilitários compartilhados — JSON seguro, datas e YouTube Data API.
 */
import fs from "fs";

/** Lê JSON com fallback. `fallback` padrão = null (compatível com videoResurrector). */
export function readJsonSafe(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Escrita atômica — evita corromper o state se o processo cair no meio do write. */
export function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysSince(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * GET genérico na YouTube Data API v3.
 * `onError` permite hooks como throwIfInsufficientScope (videoResurrector).
 */
export async function youtubeDataGet(accessToken, apiPath, params = {}, { onError } = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${apiPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Falha na API YouTube (${apiPath}).`;
    if (typeof onError === "function") onError(message);
    throw new Error(message);
  }
  return data;
}
