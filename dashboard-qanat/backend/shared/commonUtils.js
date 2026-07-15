/**
 * Utilitários compartilhados — JSON seguro, datas e YouTube Data API.
 */
import fs from "fs";
import { spawn } from "child_process";

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

/** Remove acentos — padrão repetido em 4+ arquivos. */
export function stripAccents(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** User-Agent de navegador para fetches externos (TikTok oEmbed, redirects). */
export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Janela de datas para YouTube Analytics (usado em channelAnalytics e studioAdvanced). */
export function periodDates(days = 28) {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { startDate, endDate };
}

/** Runner de processo com timeout — movido de videoUnderstandingService. */
export function runCommand(cmd, args, { timeoutMs = 120_000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: false,
      windowsHide: true,
      env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${cmd} timeout ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else {
        reject(
          new Error(
            (stderr || stdout || `${cmd} exit ${code}`).trim().split(/\r?\n/)[0]
          )
        );
      }
    });
  });
}

