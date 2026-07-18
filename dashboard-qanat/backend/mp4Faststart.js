/**
 * Move o atom moov para o início do MP4 (faststart) — preview no browser inicia na hora.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { buildPythonSpawnEnv, getFfmpegStatus } from "./pythonEnv.js";

/**
 * @param {string} filePath
 * @param {{ log?: (msg: string) => void }} [opts]
 * @returns {{ ok: boolean, skipped?: boolean, error?: string, path?: string }}
 */
export function ensureMp4Faststart(filePath, opts = {}) {
  const log = typeof opts.log === "function" ? opts.log : () => {};
  const src = String(filePath || "").trim();
  if (!src || !fs.existsSync(src)) {
    return { ok: false, error: "arquivo ausente" };
  }
  const ext = path.extname(src).toLowerCase();
  if (ext !== ".mp4" && ext !== ".m4v") {
    return { ok: true, skipped: true, path: src };
  }

  const ff = getFfmpegStatus();
  const ffmpegBin = ff.binary || "ffmpeg";
  const dir = path.dirname(src);
  const base = path.basename(src, ext);
  const tmp = path.join(dir, `${base}.faststart${ext}`);

  try {
    // -c copy: só reempacota; +faststart coloca moov no início
    const result = spawnSync(
      ffmpegBin,
      ["-y", "-i", src, "-c", "copy", "-movflags", "+faststart", tmp],
      {
        encoding: "utf8",
        env: buildPythonSpawnEnv(),
        windowsHide: true,
        timeout: 600000,
      }
    );

    if (result.status !== 0 || !fs.existsSync(tmp)) {
      const err =
        String(result.stderr || result.stdout || "").slice(-400) ||
        `ffmpeg exit ${result.status}`;
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      log(`[faststart] falhou (preview pode demorar): ${err.slice(0, 200)}`);
      return { ok: false, error: err, path: src };
    }

    const srcSize = fs.statSync(src).size;
    const tmpSize = fs.statSync(tmp).size;
    // Sanity: não substituir se ficou ridiculamente menor
    if (tmpSize < srcSize * 0.5) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      return { ok: false, error: "saída suspeita (muito menor)", path: src };
    }

    const bak = path.join(dir, `${base}.pre-faststart${ext}`);
    try {
      if (fs.existsSync(bak)) fs.unlinkSync(bak);
    } catch {
      /* ignore */
    }
    fs.renameSync(src, bak);
    fs.renameSync(tmp, src);
    try {
      fs.unlinkSync(bak);
    } catch {
      /* leave bak if locked */
    }
    log(
      `[faststart] OK — moov no início para preview no browser: ${path.basename(src)}`
    );
    return { ok: true, path: src };
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    log(`[faststart] erro: ${err.message}`);
    return { ok: false, error: err.message, path: src };
  }
}
