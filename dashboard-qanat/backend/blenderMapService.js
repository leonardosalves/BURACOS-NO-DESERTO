/**
 * Voo satélite location-intro via Blender headless + Python.
 * Substitui Cesium: gera MP4 local (terreno/textura + animação de câmera).
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildVirtualZoomKeyframes } from "../shared/cesiumFly.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, "..");
const BLENDER_SCRIPT = path.join(
  DASHBOARD_ROOT,
  "scripts",
  "blender",
  "location_intro_flyover.py"
);

const BLENDER_CANDIDATES_WIN = [
  process.env.BLENDER_PATH,
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe",
].filter(Boolean);

export function resolveBlenderExecutable() {
  const fromEnv = String(process.env.BLENDER_PATH || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  for (const candidate of BLENDER_CANDIDATES_WIN) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  if (process.platform !== "win32") {
    return "blender";
  }
  return "";
}

function quoteSpawnArg(arg) {
  const s = String(arg);
  if (/[\s"]/g.test(s)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function parseJsonLine(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* continue */
    }
  }
  return null;
}

export function runBlenderJob(jobPath, { onLog = () => {} } = {}) {
  const blender = resolveBlenderExecutable();
  if (!blender) {
    return Promise.reject(
      new Error(
        "blender_not_found — defina BLENDER_PATH ou instale Blender 4.x"
      )
    );
  }
  if (!fs.existsSync(BLENDER_SCRIPT)) {
    return Promise.reject(
      new Error(`blender_script_missing: ${BLENDER_SCRIPT}`)
    );
  }

  const args = ["--background", "--python", BLENDER_SCRIPT, "--", jobPath];

  return new Promise((resolve, reject) => {
    const spawnArgs =
      process.platform === "win32"
        ? [
            [quoteSpawnArg(blender), ...args.map(quoteSpawnArg)].join(" "),
            { shell: true, windowsHide: true },
          ]
        : [blender, args, { shell: false }];

    onLog(`[Blender] ${path.basename(blender)} ${args.join(" ")}`);
    const child = spawn(...spawnArgs);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      chunk
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => onLog(`[Blender] ${line}`));
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      const parsed = parseJsonLine(stdout);
      if (code !== 0 || !parsed?.ok) {
        reject(
          new Error(
            parsed?.error ||
              stderr.trim().slice(-800) ||
              stdout.trim().slice(-800) ||
              `Blender exit ${code}`
          )
        );
        return;
      }
      resolve(parsed);
    });
  });
}

/**
 * Renderiza MP4 de descida para location-intro.
 * @param {object} params — lat, lng, zoomLevels, textureWide, textureTight, boundaryPath, sceneKey, durationSec
 */
export async function renderLocationIntroFlyover(
  projDir,
  {
    lat,
    lng,
    zoomLevels = [],
    textureWide = "",
    textureTight = "",
    boundaryPath = "",
    sceneKey = "scene",
    durationSec = 8,
    accentColor = "#C5A889",
    placeType = "city",
    useBlenderGis = true,
    onLog = () => {},
  } = {}
) {
  const assetDir = path.join(projDir, "ASSETS", "satellite");
  fs.mkdirSync(assetDir, { recursive: true });

  const mp4Name = `${sceneKey}-flyover.mp4`;
  const outputMp4 = path.join(assetDir, mp4Name);
  const jobPath = path.join(assetDir, `${sceneKey}-blender-job.json`);

  const job = {
    lat,
    lng,
    zoom_levels: zoomLevels,
    duration_sec: durationSec,
    fps: 30,
    width: 1280,
    height: 720,
    output_mp4: outputMp4,
    texture_wide: textureWide,
    texture_tight: textureTight,
    boundary_geojson: boundaryPath || "",
    accent_color: accentColor,
    place_type: placeType,
    use_blender_gis: useBlenderGis,
  };

  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2), "utf8");
  await runBlenderJob(jobPath, { onLog });

  if (!fs.existsSync(outputMp4)) {
    throw new Error(`blender_render_missing: ${outputMp4}`);
  }

  return {
    flyover_video: `ASSETS/satellite/${mp4Name}`,
    flyover_path: outputMp4,
    job_path: jobPath,
    zoom_keyframes: buildVirtualZoomKeyframes(zoomLevels),
  };
}

export function isBlenderAvailable() {
  return Boolean(resolveBlenderExecutable());
}
