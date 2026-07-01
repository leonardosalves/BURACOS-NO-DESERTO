import fs from "fs";
import path from "path";
import { execSync } from "child_process";

let cachedFfmpegDir = null;
let ffmpegResolved = false;
let cachedPythonDir = null;
let pythonResolved = false;

function resolveFfmpegDir() {
  if (ffmpegResolved) return cachedFfmpegDir;
  ffmpegResolved = true;

  try {
    const out = execSync("where ffmpeg", {
      encoding: "utf8",
      windowsHide: true,
      shell: true,
    }).trim();
    const exe = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.toLowerCase().endsWith(".exe"));
    if (exe && fs.existsSync(exe)) {
      cachedFfmpegDir = path.dirname(exe);
      return cachedFfmpegDir;
    }
  } catch {
    // where failed — try common install locations
  }

  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links"),
    "C:\\ffmpeg\\bin",
    "C:\\Program Files\\ffmpeg\\bin",
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "ffmpeg.exe"))) {
      cachedFfmpegDir = dir;
      break;
    }
  }
  return cachedFfmpegDir;
}

function resolvePythonDir() {
  if (pythonResolved) return cachedPythonDir;
  pythonResolved = true;

  const candidates = [
    process.env.PYTHON_PATH,
    process.env.LUMIERA_PYTHON,
    path.join(process.env.LOCALAPPDATA || "", "Python", "bin", "python.exe"),
    "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe",
  ].filter(Boolean);

  for (const cand of candidates) {
    const exe = cand.toLowerCase().endsWith(".exe") ? cand : path.join(cand, "python.exe");
    if (fs.existsSync(exe)) {
      cachedPythonDir = path.dirname(exe);
      return cachedPythonDir;
    }
  }

  try {
    const out = execSync("where python", {
      encoding: "utf8",
      windowsHide: true,
      shell: true,
    }).trim();
    const exe = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.toLowerCase().endsWith(".exe"));
    if (exe && fs.existsSync(exe)) {
      cachedPythonDir = path.dirname(exe);
      return cachedPythonDir;
    }
  } catch {
    // ignore
  }

  return cachedPythonDir;
}

/** Env vars for Python/Whisper/Kokoro subprocesses (ffmpeg + python on PATH). */
export function buildPythonSpawnEnv(extra = {}) {
  const env = { ...process.env, PYTHONUNBUFFERED: "1", ...extra };
  const sep = process.platform === "win32" ? ";" : ":";

  const ffmpegDir = resolveFfmpegDir();
  if (ffmpegDir && !env.PATH?.toLowerCase().includes(ffmpegDir.toLowerCase())) {
    env.PATH = `${ffmpegDir}${sep}${env.PATH || ""}`;
    env.FFMPEG_BINARY = path.join(ffmpegDir, "ffmpeg.exe");
  }

  const pythonDir = resolvePythonDir();
  if (pythonDir) {
    if (!env.PATH?.toLowerCase().includes(pythonDir.toLowerCase())) {
      env.PATH = `${pythonDir}${sep}${env.PATH || ""}`;
    }
    env.PYTHON_PATH = path.join(pythonDir, process.platform === "win32" ? "python.exe" : "python");
  }

  return env;
}

export function getFfmpegStatus() {
  const dir = resolveFfmpegDir();
  return {
    found: Boolean(dir),
    dir: dir || null,
    binary: dir ? path.join(dir, "ffmpeg.exe") : null,
  };
}