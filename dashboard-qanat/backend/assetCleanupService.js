import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { getFfmpegStatus } from "./pythonEnv.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);
const CLEANUP_DIR = path.join("ASSETS", "cleanup");
const JOBS_DIR = path.join(CLEANUP_DIR, ".jobs");
const AUDIT_FILE = "asset_cleanup_audit.json";

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, filePath);
}

function normalizeRelativeAsset(asset = "") {
  return String(asset || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function resolveProjectCleanupAsset(projDir, asset) {
  const rel = normalizeRelativeAsset(asset);
  if (!rel || rel.includes("..") || path.isAbsolute(rel)) {
    throw new Error("Caminho de asset inválido.");
  }
  const root = path.resolve(projDir);
  const candidates = [
    path.resolve(root, rel),
    path.resolve(root, "ASSETS", rel.replace(/^ASSETS\//i, "")),
  ];
  const source = candidates.find(
    (candidate) =>
      (candidate === root || candidate.startsWith(`${root}${path.sep}`)) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
  );
  if (!source) throw new Error("Asset não encontrado dentro do projeto.");
  const ext = path.extname(source).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) && !VIDEO_EXTENSIONS.has(ext)) {
    throw new Error(
      "Formato não suportado. Use PNG, JPG, WebP, MP4, MOV, M4V, WebM ou MKV."
    );
  }
  return {
    absolute: source,
    relative: normalizeRelativeAsset(path.relative(root, source)),
    extension: ext,
    mediaType: IMAGE_EXTENSIONS.has(ext) ? "image" : "video",
  };
}

function normalizeRect(rect = {}) {
  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width ?? rect.w);
  const height = Number(rect.height ?? rect.h);
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("Desenhe a área que precisa ser higienizada.");
  }
  if (width < 0.01 || height < 0.01) {
    throw new Error("A máscara é pequena demais.");
  }
  if (x < 0 || y < 0 || x + width > 1.001 || y + height > 1.001) {
    throw new Error("A máscara precisa permanecer dentro da imagem.");
  }
  if (width * height > 0.35) {
    throw new Error("A máscara pode cobrir no máximo 35% do quadro.");
  }
  return { x, y, width, height };
}

function pixelRect(rect, width, height) {
  const x = Math.max(0, Math.min(width - 2, Math.round(rect.x * width)));
  const y = Math.max(0, Math.min(height - 2, Math.round(rect.y * height)));
  const w = Math.max(2, Math.min(width - x, Math.round(rect.width * width)));
  const h = Math.max(2, Math.min(height - y, Math.round(rect.height * height)));
  return { x, y, width: w, height: h };
}

function pickNeighborSample(region, width, height) {
  const { x, y, width: w, height: h } = region;
  const options = [
    {
      score: x,
      left: Math.max(0, x - w),
      top: y,
      width: Math.min(w, x),
      height: h,
    },
    {
      score: width - (x + w),
      left: x + w,
      top: y,
      width: Math.min(w, width - (x + w)),
      height: h,
    },
    {
      score: y,
      left: x,
      top: Math.max(0, y - h),
      width: w,
      height: Math.min(h, y),
    },
    {
      score: height - (y + h),
      left: x,
      top: y + h,
      width: w,
      height: Math.min(h, height - (y + h)),
    },
  ].filter((item) => item.width >= 2 && item.height >= 2);
  return options.sort((a, b) => b.score - a.score)[0] || null;
}

function createFeatherMask(width, height) {
  const feather = Math.max(
    2,
    Math.min(16, Math.round(Math.min(width, height) * 0.12))
  );
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="soft"><feGaussianBlur stdDeviation="${feather / 2}"/></filter>
      </defs>
      <rect x="${feather / 2}" y="${feather / 2}"
        width="${Math.max(1, width - feather)}"
        height="${Math.max(1, height - feather)}"
        rx="${feather / 2}" fill="white" filter="url(#soft)"/>
    </svg>`
  );
}

async function processImage(source, destination, rect, method) {
  const metadata = await sharp(source).metadata();
  const width = Number(metadata.width);
  const height = Number(metadata.height);
  if (!width || !height)
    throw new Error("Não foi possível ler as dimensões da imagem.");
  const region = pixelRect(rect, width, height);
  let patch;
  if (method === "blur") {
    patch = await sharp(source)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .blur(
        Math.max(
          6,
          Math.min(24, Math.round(Math.min(region.width, region.height) / 6))
        )
      )
      .toBuffer();
  } else {
    const sample = pickNeighborSample(region, width, height);
    if (!sample)
      throw new Error("Não existe área vizinha suficiente para reconstruir.");
    const reconstructed = await sharp(source)
      .extract(sample)
      .resize(region.width, region.height, { fit: "fill" })
      .blur(1.4)
      .toBuffer();
    patch = await sharp(reconstructed)
      .joinChannel(createFeatherMask(region.width, region.height))
      .png()
      .toBuffer();
  }
  await sharp(source)
    .composite([{ input: patch, left: region.x, top: region.y, blend: "over" }])
    .toFile(destination);
  return { width, height, pixel_rect: region };
}

function ffprobeBinary(ffmpegBinary) {
  return ffmpegBinary.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
}

function runProcess(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            stderr.slice(-1200) || `Processo terminou com código ${code}.`
          )
        );
    });
  });
}

async function probeVideo(source, ffmpegBinary) {
  const result = await runProcess(ffprobeBinary(ffmpegBinary), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    source,
  ]);
  const parsed = JSON.parse(result.stdout || "{}");
  const stream = parsed.streams?.[0] || {};
  const width = Number(stream.width);
  const height = Number(stream.height);
  if (!width || !height)
    throw new Error("Não foi possível ler as dimensões do vídeo.");
  return { width, height };
}

export function buildVideoCleanupArgs({ source, destination, region }) {
  const sample = pickNeighborSample(
    region,
    region.frameWidth,
    region.frameHeight
  );
  if (!sample) {
    throw new Error("Não existe área vizinha suficiente para reconstruir.");
  }
  const filter = [
    "[0:v]split=2[base][sample]",
    `[sample]crop=${sample.width}:${sample.height}:${sample.left}:${sample.top},scale=${region.width}:${region.height}:flags=lanczos,gblur=sigma=1.4[patch]`,
    `[base][patch]overlay=${region.x}:${region.y}:format=auto[outv]`,
  ].join(";");
  return [
    "-y",
    "-i",
    source,
    "-map",
    "[outv]",
    "-map",
    "0:a?",
    "-filter_complex",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    destination,
  ];
}

async function processVideo(source, destination, rect) {
  const ff = getFfmpegStatus();
  if (!ff.binary)
    throw new Error("FFmpeg não encontrado para processar vídeo.");
  const dimensions = await probeVideo(source, ff.binary);
  const region = {
    ...pixelRect(rect, dimensions.width, dimensions.height),
    frameWidth: dimensions.width,
    frameHeight: dimensions.height,
  };
  await runProcess(
    ff.binary,
    buildVideoCleanupArgs({ source, destination, region })
  );
  return { ...dimensions, pixel_rect: region };
}

function jobPath(projDir, jobId) {
  return path.join(projDir, JOBS_DIR, `${jobId}.json`);
}

function appendAudit(projDir, event) {
  const file = path.join(projDir, AUDIT_FILE);
  let audit = { version: 1, events: [] };
  try {
    if (fs.existsSync(file)) audit = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  audit.events = [
    ...(audit.events || []),
    { at: new Date().toISOString(), ...event },
  ].slice(-500);
  atomicWriteJson(file, audit);
}

export async function createAssetCleanupResult(
  projDir,
  {
    asset,
    block,
    assetIndex,
    rect,
    method = "reconstruct",
    rightsConfirmed = false,
  } = {}
) {
  if (!rightsConfirmed) {
    const error = new Error(
      "Confirme que a mídia é sua ou possui licença para alterá-la."
    );
    error.code = "RIGHTS_CONFIRMATION_REQUIRED";
    throw error;
  }
  const source = resolveProjectCleanupAsset(projDir, asset);
  const normalizedRect = normalizeRect(rect);
  const jobId = crypto.randomUUID();
  const outputExt = source.mediaType === "video" ? ".mp4" : source.extension;
  const safeStem = path
    .basename(source.relative, path.extname(source.relative))
    .replace(/[^a-z0-9_-]+/gi, "_");
  const resultRelative = normalizeRelativeAsset(
    path.join(
      CLEANUP_DIR,
      `${safeStem}__cleaned__${jobId.slice(0, 8)}${outputExt}`
    )
  );
  const destination = path.join(projDir, resultRelative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const details =
    source.mediaType === "image"
      ? await processImage(source.absolute, destination, normalizedRect, method)
      : await processVideo(source.absolute, destination, normalizedRect);
  const job = {
    version: 1,
    id: jobId,
    status: "preview_ready",
    created_at: new Date().toISOString(),
    rights_confirmed: true,
    source_asset: source.relative,
    result_asset: resultRelative,
    media_type: source.mediaType,
    block: String(block ?? ""),
    asset_index: Number(assetIndex),
    method: source.mediaType === "video" ? "neighbor_patch" : method,
    rect: normalizedRect,
    ...details,
  };
  atomicWriteJson(jobPath(projDir, jobId), job);
  appendAudit(projDir, {
    type: "preview_created",
    job_id: jobId,
    source_asset: source.relative,
    result_asset: resultRelative,
    rights_confirmed: true,
  });
  return job;
}

export function readAssetCleanupJob(projDir, jobId) {
  const safeId = String(jobId || "").trim();
  if (!/^[a-f0-9-]{20,}$/i.test(safeId)) throw new Error("Trabalho inválido.");
  const file = jobPath(projDir, safeId);
  if (!fs.existsSync(file))
    throw new Error("Resultado de higienização não encontrado.");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function applyAssetCleanupResult(projDir, jobId) {
  const job = readAssetCleanupJob(projDir, jobId);
  const configPath = path.join(projDir, "config_qanat.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const blockKey = String(job.block || "");
  const index = Number(job.asset_index);
  const slots = config.timeline_assets?.[blockKey];
  const slot = Array.isArray(slots) ? slots[index] : null;
  if (!slot) throw new Error("A cena original não existe mais na timeline.");
  const current = normalizeRelativeAsset(slot.asset);
  if (current !== job.source_asset && current !== job.result_asset) {
    const error = new Error(
      "O asset da cena mudou; gere uma nova comparação antes de aplicar."
    );
    error.code = "ASSET_CLEANUP_SOURCE_CHANGED";
    error.current_asset = current;
    error.block = blockKey;
    error.asset_index = index;
    throw error;
  }
  slots[index] = {
    ...slot,
    asset: job.result_asset,
    cleanup_original_asset: job.source_asset,
    cleanup_job_id: job.id,
    cleanup_applied_at: new Date().toISOString(),
    rights_confirmed: true,
  };
  atomicWriteJson(configPath, config);
  const nextJob = {
    ...job,
    status: "applied",
    applied_at: new Date().toISOString(),
  };
  atomicWriteJson(jobPath(projDir, job.id), nextJob);
  appendAudit(projDir, {
    type: "applied",
    job_id: job.id,
    block: blockKey,
    asset_index: index,
  });
  return { job: nextJob, timeline_assets: config.timeline_assets };
}

export function revertAssetCleanupResult(projDir, jobId) {
  const job = readAssetCleanupJob(projDir, jobId);
  const configPath = path.join(projDir, "config_qanat.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const slots = config.timeline_assets?.[String(job.block || "")];
  const index = Number(job.asset_index);
  const slot = Array.isArray(slots) ? slots[index] : null;
  if (!slot || normalizeRelativeAsset(slot.asset) !== job.result_asset) {
    throw new Error("O resultado não está aplicado nesta cena.");
  }
  slots[index] = {
    ...slot,
    asset: job.source_asset,
    cleanup_reverted_at: new Date().toISOString(),
  };
  delete slots[index].cleanup_job_id;
  atomicWriteJson(configPath, config);
  const nextJob = {
    ...job,
    status: "reverted",
    reverted_at: new Date().toISOString(),
  };
  atomicWriteJson(jobPath(projDir, job.id), nextJob);
  appendAudit(projDir, { type: "reverted", job_id: job.id });
  return { job: nextJob, timeline_assets: config.timeline_assets };
}

export const ASSET_CLEANUP_SUPPORTED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
];
