import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getFfmpegStatus } from "./pythonEnv.js";

export const LUMIERA_EDITOR_FILE = "lumiera_editor.json";
export const LUMIERA_EDITOR_ASSET_DIR = path.join("ASSETS", "lumiera-editor");

function safeName(value = "asset") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "asset";
}

function atomicJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, filePath);
}

export function loadLumieraEditorProject(projectDir) {
  const filePath = path.join(projectDir, LUMIERA_EDITOR_FILE);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function saveLumieraEditorProject(projectDir, project) {
  if (!project || typeof project !== "object" || !Array.isArray(project.tracks)) {
    throw new Error("Projeto do Editor do Lumiera invalido");
  }
  const normalized = {
    ...project,
    version: Number(project.version) || 2,
    fps: Math.max(1, Math.round(Number(project.fps) || 30)),
    durationInFrames: Math.max(1, Math.round(Number(project.durationInFrames) || 1)),
    updatedAt: new Date().toISOString(),
  };
  atomicJson(path.join(projectDir, LUMIERA_EDITOR_FILE), normalized);
  return normalized;
}

export function buildLumieraAssetUrls(projectName, assetId, extension, kind) {
  const root = `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/lumiera-editor`;
  const original = `${root}/originals/${assetId}${extension}`;
  const proxyExt = kind === "audio" ? ".mp3" : kind === "video" ? ".mp4" : extension;
  return {
    originalSource: original,
    proxySource: `${root}/proxies/${assetId}${proxyExt}`,
    waveformSource: `${root}/waveforms/${assetId}.png`,
    thumbnailSources: [0, 1, 2].map((index) => `${root}/thumbnails/${assetId}-${index}.jpg`),
  };
}

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-2000) || `ffmpeg terminou com codigo ${code}`)));
  });
}

async function probeMedia(filePath, ffmpegBinary) {
  const ext = process.platform === "win32" ? ".exe" : "";
  const ffprobe = path.join(path.dirname(ffmpegBinary), `ffprobe${ext}`);
  if (!fs.existsSync(ffprobe)) return {};
  return new Promise((resolve) => {
    const child = spawn(ffprobe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath], { windowsHide: true });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.on("error", () => resolve({}));
    child.on("close", () => {
      try { resolve(JSON.parse(stdout)); } catch { resolve({}); }
    });
  });
}

export function normalizeLumieraProbe(probe, fps = 30) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video") || {};
  const audio = streams.find((stream) => stream.codec_type === "audio") || {};
  const duration = Number(probe?.format?.duration || video.duration || audio.duration) || 0;
  return {
    durationSeconds: duration,
    durationInFrames: Math.max(1, Math.round(duration * fps)),
    width: Number(video.width) || undefined,
    height: Number(video.height) || undefined,
    videoCodec: video.codec_name || undefined,
    audioCodec: audio.codec_name || undefined,
    sampleRate: Number(audio.sample_rate) || undefined,
  };
}

function renderSourceFromAsset(asset) {
  const source = String(asset?.originalSource || "");
  const marker = "/ASSETS/";
  const index = source.indexOf(marker);
  if (index < 0) return source;
  try { return `ASSETS/${decodeURIComponent(source.slice(index + marker.length))}`; }
  catch { return `ASSETS/${source.slice(index + marker.length)}`; }
}

export function buildTimelineStudioFromLumieraEditor(editor, existing = {}) {
  if (!editor || !Array.isArray(editor.tracks)) return existing;
  const fps = Math.max(1, Number(editor.fps) || 30);
  const assets = new Map((editor.assets || []).map((asset) => [asset.id, asset]));
  const trackMap = {
    video: "video",
    image: "video",
    audio: "music",
    caption: "captions",
    text: "overlays",
    lottie: "overlays",
    effect: "overlays",
    "motion-template": "motion",
  };
  const clips = editor.tracks.flatMap((track) => track.clips || []).map((clip) => {
    const trackId = trackMap[clip.type];
    if (!trackId) return null;
    const asset = clip.assetId ? assets.get(clip.assetId) : null;
    const start = Math.max(0, Number(clip.startFrame) / fps);
    const duration = Math.max(1 / fps, Number(clip.durationInFrames) / fps);
    const sourceStartFrame = Math.max(0, Number(clip.sourceStartFrame) || 0);
    const sourceEndFrame = Math.max(
      sourceStartFrame + 1,
      Number(clip.sourceEndFrame) || sourceStartFrame + Number(clip.durationInFrames)
    );
    const props = {
      ...(clip.props || {}),
      lumieraEditorClip: true,
      lumieraEditorType: clip.type,
      frameStart: clip.startFrame,
      durationInFrames: clip.durationInFrames,
      sourceStartFrame,
      sourceEndFrame,
      sourceStartSeconds: sourceStartFrame / fps,
      sourceEndSeconds: sourceEndFrame / fps,
    };
    if (clip.type === "motion-template") {
      props.motion_shot = {
        templateId: clip.templateId,
        props: clip.props || {},
        palette: clip.props?.palette,
        start_seconds: 0,
        duration_seconds: duration,
      };
      props.shotcraft = true;
      props.motion_scene = true;
      props.media_mode = "remotion";
    }
    if (clip.type === "caption" || clip.type === "text") props.text = clip.props?.text || clip.label || "";
    if (asset) props.source = renderSourceFromAsset(asset);
    const templateId = clip.type === "text"
      ? "kinetic-text"
      : clip.type === "lottie"
        ? "lottie-overlay"
        : clip.type === "effect"
          ? "effect-overlay"
          : clip.templateId;
    return {
      id: `lumiera-editor-${clip.id}`,
      trackId,
      start,
      duration,
      sourceStart: sourceStartFrame / fps,
      sourceEnd: sourceEndFrame / fps,
      label: clip.label || clip.templateId || clip.type,
      source: asset ? renderSourceFromAsset(asset) : clip.source,
      templateId,
      props,
      color: editor.tracks.find((item) => item.id === clip.trackId)?.color,
      ...(clip.type === "motion-template" ? { motionScene: true, motionScenePrimary: true } : {}),
    };
  }).filter(Boolean);
  const defaultTracks = [
    ["voice", "voice"], ["captions", "captions"], ["video", "video"],
    ["motion", "motion"], ["overlays", "overlays"], ["sfx", "sfx"], ["music", "music"],
  ].map(([id, type]) => ({ id, type, label: id }));
  const tracks = Array.isArray(existing.tracks) && existing.tracks.length ? existing.tracks : defaultTracks;
  return {
    ...existing,
    version: existing.version || 1,
    width: Number(editor.width) || existing.width || 1920,
    height: Number(editor.height) || existing.height || 1080,
    format: Number(editor.height) > Number(editor.width) ? "9:16" : "16:9",
    fps,
    background: editor.background || existing.background || "#0f0f18",
    duration: Math.max(Number(existing.duration) || 0, Number(editor.durationInFrames) / fps),
    tracks,
    clips: [
      ...(Array.isArray(existing.clips) ? existing.clips.filter((clip) => !clip?.props?.lumieraEditorClip) : []),
      ...clips,
    ],
  };
}

function projectAssetUrl(projectName, source) {
  const value = String(source || "").replace(/\\/g, "/");
  if (!value || /^(https?:|blob:|data:|\/api\/)/i.test(value)) return value;
  const relative = value.replace(/^\/?ASSETS\//i, "");
  return `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/${relative
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function hydrateLumieraEditorFromTimelineStudio(editor, studio, projectName) {
  if (!editor || !Array.isArray(editor.tracks) || editor.studioImportVersion >= 1) {
    return { project: editor, changed: false, imported: 0 };
  }
  const fps = Math.max(1, Number(editor.fps) || 30);
  const clips = Array.isArray(studio?.clips) ? studio.clips : [];
  const assets = [...(editor.assets || [])];
  const additions = new Map();
  let imported = 0;

  const ensureAsset = (studioClip, kind) => {
    if (!studioClip.source) return undefined;
    const id = `studio-asset-${studioClip.id}`;
    if (!assets.some((asset) => asset.id === id)) {
      const source = projectAssetUrl(projectName, studioClip.source);
      assets.push({
        id,
        name: path.basename(String(studioClip.source)),
        kind,
        originalSource: source,
        proxySource: source,
        status: "ready",
      });
    }
    return id;
  };

  for (const studioClip of clips) {
    const sourceTrack = String(studioClip.trackId || "");
    let trackId = "";
    let type = "";
    let assetKind = "";
    if (sourceTrack === "video") {
      const image = /\.(png|jpe?g|webp|gif|avif)$/i.test(String(studioClip.source || ""));
      trackId = image ? "images" : "video";
      type = image ? "image" : "video";
      assetKind = type;
    } else if (["voice", "music", "sfx", "audio"].includes(sourceTrack)) {
      trackId = "audio";
      type = "audio";
      assetKind = "audio";
    } else if (sourceTrack === "captions") {
      trackId = "captions";
      type = "caption";
    } else if (sourceTrack === "overlays") {
      trackId = "text";
      type = "text";
    } else {
      continue;
    }
    const id = `studio-${studioClip.id}`;
    if (editor.tracks.some((track) => track.clips?.some((clip) => clip.id === id))) continue;
    const startFrame = Math.max(0, Math.round((Number(studioClip.start) || 0) * fps));
    const durationInFrames = Math.max(1, Math.round((Number(studioClip.duration) || 1 / fps) * fps));
    const sourceStartFrame = Math.max(
      0,
      Math.round(
        (Number(studioClip.sourceStart ?? studioClip.props?.sourceStartSeconds) || 0) * fps
      )
    );
    const clip = {
      id,
      trackId,
      type,
      startFrame,
      durationInFrames,
      sourceStartFrame,
      sourceEndFrame: sourceStartFrame + durationInFrames,
      label: studioClip.label || path.basename(String(studioClip.source || type)),
      assetId: assetKind ? ensureAsset(studioClip, assetKind) : undefined,
      props: {
        ...(studioClip.props || {}),
        text: studioClip.props?.text || studioClip.label,
        importedFromTimelineStudio: true,
        sourceTrack,
      },
    };
    additions.set(trackId, [...(additions.get(trackId) || []), clip]);
    imported += 1;
  }

  const project = {
    ...editor,
    assets,
    studioImportVersion: 1,
    studioImportedAt: new Date().toISOString(),
    durationInFrames: Math.max(
      editor.durationInFrames || 1,
      ...Array.from(additions.values()).flat().map((clip) => clip.startFrame + clip.durationInFrames)
    ),
    tracks: editor.tracks.map((track) => ({
      ...track,
      clips: [...(track.clips || []), ...(additions.get(track.id) || [])],
    })),
  };
  return { project, changed: true, imported };
}

export async function ingestLumieraEditorAsset({ projectDir, projectName, inputPath, originalName, mimeType, kind, fps = 30 }) {
  const id = `asset-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const extension = path.extname(originalName) || (kind === "video" ? ".mp4" : kind === "audio" ? ".wav" : kind === "image" ? ".png" : ".json");
  const baseDir = path.join(projectDir, LUMIERA_EDITOR_ASSET_DIR);
  const dirs = Object.fromEntries(["originals", "proxies", "waveforms", "thumbnails"].map((name) => [name, path.join(baseDir, name)]));
  Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  const originalPath = path.join(dirs.originals, `${id}${extension}`);
  fs.renameSync(inputPath, originalPath);

  const urls = buildLumieraAssetUrls(projectName, id, extension, kind);
  const ffmpeg = getFfmpegStatus().binary;
  const probe = ffmpeg ? await probeMedia(originalPath, ffmpeg) : {};
  const metadata = normalizeLumieraProbe(probe, fps);
  const failures = [];
  let proxyReady = false;

  if (kind === "image" || kind === "lottie") {
    fs.copyFileSync(originalPath, path.join(dirs.proxies, `${id}${extension}`));
    proxyReady = true;
  } else if (ffmpeg) {
    try {
      const proxyPath = path.join(dirs.proxies, `${id}${kind === "audio" ? ".mp3" : ".mp4"}`);
      const args = kind === "video"
        ? ["-y", "-i", originalPath, "-vf", "scale=min(1280\\,iw):-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-movflags", "+faststart", proxyPath]
        : ["-y", "-i", originalPath, "-vn", "-c:a", "libmp3lame", "-q:a", "5", proxyPath];
      await run(ffmpeg, args);
      proxyReady = true;
    } catch (error) { failures.push(`proxy: ${error.message}`); }

    try {
      await run(ffmpeg, ["-y", "-i", originalPath, "-filter_complex", "showwavespic=s=1200x180:colors=5b5bf7", "-frames:v", "1", path.join(dirs.waveforms, `${id}.png`)]);
    } catch (error) { failures.push(`waveform: ${error.message}`); }

    if (kind === "video") {
      const duration = Math.max(1, metadata.durationSeconds || 1);
      for (let index = 0; index < 3; index += 1) {
        try {
          await run(ffmpeg, ["-y", "-ss", String((duration * (index + 1)) / 4), "-i", originalPath, "-frames:v", "1", "-vf", "scale=480:-2", path.join(dirs.thumbnails, `${id}-${index}.jpg`)]);
        } catch (error) { failures.push(`thumbnail ${index + 1}: ${error.message}`); }
      }
    }
  }

  return {
    id,
    name: safeName(originalName),
    kind,
    mimeType,
    ...metadata,
    originalSource: urls.originalSource,
    proxySource: proxyReady ? urls.proxySource : urls.originalSource,
    waveformSource: fs.existsSync(path.join(dirs.waveforms, `${id}.png`)) ? urls.waveformSource : undefined,
    thumbnailSources: urls.thumbnailSources.filter((_, index) => fs.existsSync(path.join(dirs.thumbnails, `${id}-${index}.jpg`))),
    status: failures.length && !proxyReady ? "failed" : "ready",
    ingestionWarnings: failures,
  };
}

export function createLumieraRenderSnapshot(projectDir, options = {}) {
  const editor = loadLumieraEditorProject(projectDir);
  const timestamp = new Date().toISOString();
  const renderProject = editor ? structuredClone(editor) : null;
  if (renderProject) {
    renderProject.assets = (renderProject.assets || []).map((asset) => ({
      ...asset,
      proxySource: asset.originalSource,
      renderSource: asset.originalSource,
    }));
  }
  const files = {};
  for (const name of ["config_qanat.json", "storyboard.json", "timeline_studio.json", "block_timings.json", "word_transcripts.json", "words.json"]) {
    const filePath = path.join(projectDir, name);
    if (fs.existsSync(filePath)) {
      try { files[name] = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { /* immutable snapshot only includes valid JSON */ }
    }
  }
  const payload = { version: 1, createdAt: timestamp, fps: Number(options.fps) || renderProject?.fps || 30, editor: renderProject, files };
  if (renderProject) {
    payload.files["timeline_studio.json"] = buildTimelineStudioFromLumieraEditor(
      renderProject,
      payload.files["timeline_studio.json"] || {}
    );
  }
  const hash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const snapshotDir = path.join(projectDir, "RENDER_SNAPSHOTS");
  const fileName = `${timestamp.replace(/[:.]/g, "-")}-${hash.slice(0, 12)}.json`;
  const snapshotPath = path.join(snapshotDir, fileName);
  atomicJson(snapshotPath, { ...payload, sha256: hash });
  return { snapshotPath, hash, snapshot: { ...payload, sha256: hash } };
}
