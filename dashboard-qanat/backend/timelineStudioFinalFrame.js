import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv } from "./pythonEnv.js";
import {
  buildCaptionsFromStudio,
  buildOverlaysFromStudio,
  buildScenesFromStudio,
  loadStudioForRender,
  resolveStudioFormat,
  resolveStudioTotalDuration,
  shouldUseStudioForRender,
} from "./timelineStudioRenderSync.js";
import { fillSceneTimelineGaps } from "./timelineSceneSync.js";

const REMOTION_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../remotion-renderer"
);
const REMOTION_PUBLIC_DIR = path.join(REMOTION_DIR, "public");
const FPS = 30;

function safeProjectSlug(projectDir) {
  return path.basename(projectDir).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
}

function readProjectJson(projectDir, fileName, fallback = {}) {
  const filePath = path.join(projectDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function findProjectFile(projectDir, fileName) {
  if (!fileName) return null;
  const raw = String(fileName || "").replace(/\\/g, "/");
  if (/^https?:\/\//i.test(raw)) return raw;
  const safeName = path.basename(raw);
  const rel = raw.replace(/^ASSETS\//i, "");
  const candidates = [
    path.join(projectDir, raw),
    path.join(projectDir, safeName),
    path.join(projectDir, "ASSETS", rel),
    path.join(projectDir, "ASSETS", safeName),
    path.join(projectDir, "ASSETS", "satellite", safeName),
    path.join(projectDir, "ASSETS", "images", safeName),
    path.join(projectDir, "ASSETS", "videos", safeName),
    path.join(projectDir, "ASSETS", "audio", safeName),
    path.join(projectDir, "MUSICAS", safeName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function copyRemotionAsset(sourcePath, targetDir, prefix = "") {
  if (!sourcePath || /^https?:\/\//i.test(String(sourcePath))) return null;
  if (!fs.existsSync(sourcePath)) return null;
  fs.mkdirSync(targetDir, { recursive: true });
  const parsed = path.parse(sourcePath);
  const safeBase = `${prefix}${parsed.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const destName = `${safeBase}${parsed.ext.toLowerCase()}`;
  fs.copyFileSync(sourcePath, path.join(targetDir, destName));
  return destName;
}

function activeAt(items = [], time = 0) {
  return items.filter((item) => {
    const start = Number(item?.start) || 0;
    const duration = Number(item?.duration) || 0;
    return time >= start && time < start + duration;
  });
}

function spawnRemotionStill({ propsPath, outputPath, frame }) {
  return new Promise((resolve, reject) => {
    const args = [
      "remotion",
      "still",
      "src/index.ts",
      "LumieraTimeline",
      `"${outputPath}"`,
      "--props",
      `"${propsPath}"`,
      "--frame",
      String(frame),
      "--timeout",
      "120000",
    ];

    const child = spawn("npx", args, {
      cwd: REMOTION_DIR,
      shell: true,
      env: buildPythonSpawnEnv(),
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `Remotion still falhou (code ${code}). ${stderr || stdout}`.trim()
        )
      );
    });
  });
}

export async function renderTimelineStudioFinalFrame({
  projectDir,
  playhead = 0,
  resolution = "1080p",
}) {
  const studio = loadStudioForRender(projectDir);
  if (!shouldUseStudioForRender(studio)) {
    throw new Error("Timeline Studio ainda nao tem clips renderizaveis.");
  }

  const projectSlug = `${safeProjectSlug(projectDir)}_final_frame`;
  const publicProjectDir = path.join(
    REMOTION_PUBLIC_DIR,
    "projects",
    projectSlug
  );
  fs.rmSync(publicProjectDir, { recursive: true, force: true });
  fs.mkdirSync(publicProjectDir, { recursive: true });

  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const scenes = buildScenesFromStudio(studio, {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
    fillSceneTimelineGaps,
  });
  if (!scenes.length) {
    throw new Error("Nenhuma cena de video/imagem encontrada para o frame.");
  }

  const overlays = buildOverlaysFromStudio(studio, {
    projectDir,
    publicProjectDir,
    projectSlug,
    copyRemotionAsset,
    findProjectFile,
  });
  const captions = buildCaptionsFromStudio(studio);
  const totalDuration = resolveStudioTotalDuration(studio, scenes, 0);
  const safePlayhead = Math.min(
    Math.max(0, Number(playhead) || 0),
    Math.max(0, totalDuration - 1 / FPS)
  );
  const format = resolveStudioFormat(studio, config);
  const props = {
    projectName: path.basename(projectDir),
    format,
    resolution: resolution === "2k" ? "2k" : "1080p",
    totalDuration,
    scenes,
    captions,
    narration: null,
    narrationDuration: 0,
    bgmTracks: [],
    sfxTracks: [],
    overlays,
    musicVolume: 0,
    captionStyle: format === "16:9" ? "documentary" : "shorts-viral",
    captionMode: config.caption_mode || "caption-highlight",
    captionEffect: config.caption_effect || "caption-highlight",
    designPreset: config.design_preset || null,
    grainOverlay: false,
    vignette: config.vignette !== false,
    showProgressBar: false,
    accentColor: config.accent_color || "#C5A880",
    canvasBackground: config.canvas_background || "#050506",
  };

  const propsPath = path.join(publicProjectDir, "props_final_frame.json");
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf8");

  const outDir = path.join(projectDir, "ASSETS", "final_frames");
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `final_frame_${Date.now()}.png`;
  const outputPath = path.join(outDir, fileName);
  const frame = Math.max(0, Math.round(safePlayhead * FPS));
  await spawnRemotionStill({ propsPath, outputPath, frame });

  return {
    ok: true,
    fileName,
    relPath: `ASSETS/final_frames/${fileName}`,
    playhead: safePlayhead,
    frame,
    fps: FPS,
    format,
    resolution: props.resolution,
    sceneCount: scenes.length,
    overlayCount: overlays.length,
    captionCount: captions.length,
    activeSceneCount: activeAt(scenes, safePlayhead).length,
    activeOverlayCount: activeAt(overlays, safePlayhead).length,
    activeCaptionCount: captions.filter(
      (caption) =>
        safePlayhead * 1000 >= Number(caption.startMs || 0) &&
        safePlayhead * 1000 < Number(caption.endMs || 0)
    ).length,
  };
}
