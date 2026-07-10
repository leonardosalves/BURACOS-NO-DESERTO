import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedFfmpegDir = null;
let ffmpegResolved = false;
let cachedPythonDir = null;
let pythonResolved = false;

const FFMPEG_EXE = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

function dirHasFfmpeg(dir) {
  if (!dir) return false;
  try {
    return fs.existsSync(path.join(dir, FFMPEG_EXE));
  } catch {
    return false;
  }
}

function rememberFfmpegDir(dir) {
  if (!dirHasFfmpeg(dir)) return null;
  cachedFfmpegDir = dir;
  return dir;
}

function resolveFromEnvPath(raw) {
  const val = String(raw || "").trim();
  if (!val) return null;
  if (/ffmpeg(\.exe)?$/i.test(val) && fs.existsSync(val)) {
    return rememberFfmpegDir(path.dirname(val));
  }
  return rememberFfmpegDir(val);
}

function findFfmpegInPackages(packagesRoot, depth = 0) {
  if (!packagesRoot || !fs.existsSync(packagesRoot) || depth > 5) return null;
  let entries;
  try {
    entries = fs.readdirSync(packagesRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (!/ffmpeg/i.test(ent.name)) continue;
    const bin = path.join(packagesRoot, ent.name, "bin");
    if (rememberFfmpegDir(bin)) return cachedFfmpegDir;
    const nested = findFfmpegInPackages(
      path.join(packagesRoot, ent.name),
      depth + 1
    );
    if (nested) return nested;
  }
  return null;
}

function scanUsersWinGetFfmpeg() {
  const drive = process.env.SystemDrive || "C:";
  const usersRoot = path.join(drive, "Users");
  if (!fs.existsSync(usersRoot)) return null;
  let entries;
  try {
    entries = fs.readdirSync(usersRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (/^(Public|Default|Default User|All Users)$/i.test(ent.name)) continue;
    const linksDir = path.join(
      usersRoot,
      ent.name,
      "AppData",
      "Local",
      "Microsoft",
      "WinGet",
      "Links"
    );
    if (rememberFfmpegDir(linksDir)) return cachedFfmpegDir;
    const packagesRoot = path.join(
      usersRoot,
      ent.name,
      "AppData",
      "Local",
      "Microsoft",
      "WinGet",
      "Packages"
    );
    const fromPackages = findFfmpegInPackages(packagesRoot);
    if (fromPackages) return fromPackages;
  }
  return null;
}

function resolveFfmpegDir() {
  if (ffmpegResolved) return cachedFfmpegDir;
  ffmpegResolved = true;

  for (const key of ["FFMPEG_PATH", "LUMIERA_FFMPEG", "FFMPEG_BINARY"]) {
    const fromEnv = resolveFromEnvPath(process.env[key]);
    if (fromEnv) return fromEnv;
  }

  const staticCandidates = [
    "C:\\Lumiera\\tools\\ffmpeg\\bin",
    path.join(
      process.env.LUMIERA_ROOT || "C:\\Lumiera",
      "tools",
      "ffmpeg",
      "bin"
    ),
    path.resolve(__dirname, "..", "..", "tools", "ffmpeg", "bin"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links"),
    "C:\\ffmpeg\\bin",
    "C:\\Program Files\\ffmpeg\\bin",
    "C:\\ProgramData\\chocolatey\\bin",
  ];
  for (const dir of staticCandidates) {
    if (rememberFfmpegDir(dir)) return cachedFfmpegDir;
  }

  scanUsersWinGetFfmpeg();
  if (cachedFfmpegDir) return cachedFfmpegDir;

  try {
    const out = execSync("where ffmpeg", {
      encoding: "utf8",
      windowsHide: true,
      shell: true,
    }).trim();
    const exe = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /ffmpeg(\.exe)?$/i.test(l));
    if (exe && fs.existsSync(exe)) {
      return rememberFfmpegDir(path.dirname(exe));
    }
  } catch {
    /* where failed */
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
    const exe = cand.toLowerCase().endsWith(".exe")
      ? cand
      : path.join(cand, "python.exe");
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
    const exe = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.toLowerCase().endsWith(".exe"));
    if (exe && fs.existsSync(exe)) {
      cachedPythonDir = path.dirname(exe);
      return cachedPythonDir;
    }
  } catch {
    // ignore
  }

  return cachedPythonDir;
}

function resolveNodeDir() {
  const execDir = path.dirname(process.execPath);
  const npxExe = process.platform === "win32" ? "npx.cmd" : "npx";
  if (fs.existsSync(path.join(execDir, npxExe))) {
    return execDir;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\nodejs",
          "C:\\Program Files (x86)\\nodejs",
          path.join(process.env.APPDATA || "", "npm"),
        ]
      : ["/usr/local/bin", "/usr/bin", "/bin"];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, npxExe))) {
      return dir;
    }
  }

  return null;
}

/** Env vars for Python/Whisper/Kokoro subprocesses (ffmpeg + python on PATH). */
export function buildPythonSpawnEnv(extra = {}) {
  const env = { ...process.env, PYTHONUNBUFFERED: "1", ...extra };
  const sep = process.platform === "win32" ? ";" : ":";

  const ffmpegDir = resolveFfmpegDir();
  if (ffmpegDir && !env.PATH?.toLowerCase().includes(ffmpegDir.toLowerCase())) {
    env.PATH = `${ffmpegDir}${sep}${env.PATH || ""}`;
    env.FFMPEG_BINARY = path.join(ffmpegDir, FFMPEG_EXE);
  }

  const pythonDir = resolvePythonDir();
  if (pythonDir) {
    if (!env.PATH?.toLowerCase().includes(pythonDir.toLowerCase())) {
      env.PATH = `${pythonDir}${sep}${env.PATH || ""}`;
    }
    env.PYTHON_PATH = path.join(
      pythonDir,
      process.platform === "win32" ? "python.exe" : "python"
    );
  }

  const nodeDir = resolveNodeDir();
  if (nodeDir && !env.PATH?.toLowerCase().includes(nodeDir.toLowerCase())) {
    env.PATH = `${nodeDir}${sep}${env.PATH || ""}`;
  }

  return env;
}

export function getFfmpegStatus() {
  const dir = resolveFfmpegDir();
  return {
    found: Boolean(dir),
    dir: dir || null,
    binary: dir ? path.join(dir, FFMPEG_EXE) : null,
  };
}

/** Limpa cache (útil em testes). */
export function resetFfmpegCache() {
  cachedFfmpegDir = null;
  ffmpegResolved = false;
}
