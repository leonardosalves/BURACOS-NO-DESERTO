import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import sharp from "sharp";

const THUMB_DIMS = {
  LONG: { width: 1280, height: 720 },
  SHORT: { width: 1080, height: 1920 },
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function escapeXml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeHex(color = "") {
  const c = String(color).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return "#D4AF37";
}

function wrapOverlayText(text = "", maxChars = 14) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function findProjectAsset(projectDir, fileName) {
  if (!fileName) return null;
  const safeName = path.basename(String(fileName).replace(/\\/g, "/"));
  const candidates = [
    path.join(projectDir, safeName),
    path.join(projectDir, "ASSETS", safeName),
    path.join(projectDir, "ASSETS", "images", safeName),
    path.join(projectDir, "ASSETS", "videos", safeName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function listImageCandidates(dir, scoreBase = 1) {
  if (!fs.existsSync(dir)) return [];
  const results = [];

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...listImageCandidates(fullPath, scoreBase));
      continue;
    }
    const ext = path.extname(entry).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    results.push({ path: fullPath, score: scoreBase + stat.size / 1_000_000 });
  }

  return results;
}

function extractVideoFrame(projectDir) {
  const outputDir = path.join(projectDir, "OUTPUT", "qanat_persa_video_final");
  if (!fs.existsSync(outputDir)) return null;

  const videos = fs.readdirSync(outputDir)
    .filter((file) => /\.(mp4|mov|webm)$/i.test(file))
    .map((file) => {
      const fullPath = path.join(outputDir, file);
      return { fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (videos.length === 0) return null;

  const tempDir = path.join(projectDir, "ASSETS", "youtube_thumbnails", "_tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const framePath = path.join(tempDir, `frame_${Date.now()}.jpg`);

  try {
    const cmd = `ffmpeg -y -ss 00:00:08 -i "${videos[0].fullPath}" -frames:v 1 -q:v 2 "${framePath}"`;
    execSync(cmd, { stdio: "pipe" });
    return fs.existsSync(framePath) ? framePath : null;
  } catch {
    return null;
  }
}

export function findHeroImagePath(projectDir, { storyboard = {}, config = {}, format = "LONG" } = {}) {
  const candidates = [];
  const preferredBlocks = format === "SHORT" ? ["2", "3", "4", "1"] : ["2", "3", "4", "5", "1"];
  const timeline = config.timeline_assets || {};

  for (let i = 0; i < preferredBlocks.length; i++) {
    const block = preferredBlocks[i];
    const assets = Array.isArray(timeline[block]) ? timeline[block] : [];
    for (const asset of assets) {
      const isImage = asset?.type === "image" || /\.(jpe?g|png|webp)$/i.test(asset?.asset || "");
      if (!isImage) continue;
      const resolved = findProjectAsset(projectDir, asset.asset);
      if (resolved) candidates.push({ path: resolved, score: 20 - i });
    }
  }

  for (const prompt of storyboard.visual_prompts || []) {
    const assetRef = prompt?.asset || prompt?.asset_path || prompt?.image;
    const resolved = findProjectAsset(projectDir, assetRef);
    if (resolved) candidates.push({ path: resolved, score: 12 });
  }

  candidates.push(...listImageCandidates(path.join(projectDir, "ASSETS", "images"), 8));
  candidates.push(...listImageCandidates(path.join(projectDir, "ASSETS"), 6));

  const framePath = extractVideoFrame(projectDir);
  if (framePath) candidates.push({ path: framePath, score: 14 });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.path || null;
}

function buildTextLinesSvg(lines, { x, startY, fontSize, fill, stroke = "rgba(0,0,0,0.85)", strokeWidth = 4, anchor = "start" }) {
  const lineHeight = fontSize * 1.08;
  return lines.map((line, index) => {
    const y = startY + index * lineHeight;
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke">${escapeXml(line)}</text>`;
  }).join("");
}

function buildOverlaySvg({ width, height, overlayText, colors = [], variantId = "A", format = "LONG" }) {
  const primary = normalizeHex(colors[0] || "#D4AF37");
  const accent = normalizeHex(colors[1] || "#00E5FF");
  const dark = normalizeHex(colors[2] || "#121214");
  const maxChars = format === "SHORT" ? 12 : 16;
  const fontSize = format === "SHORT" ? 78 : 68;
  const lines = wrapOverlayText(overlayText || "ASSISTA AGORA", maxChars);

  if (variantId === "B") {
    const panelWidth = Math.round(width * 0.46);
    const textX = Math.round(panelWidth * 0.1);
    const textY = format === "SHORT" ? 220 : 150;
    return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${panelWidth}" height="${height}" fill="${dark}" fill-opacity="0.88"/>
      <rect x="${panelWidth}" y="0" width="${width - panelWidth}" height="${height}" fill="url(#fade)"/>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${dark}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${dark}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${buildTextLinesSvg(lines, { x: textX, startY: textY, fontSize, fill: "#FFFFFF" })}
      <rect x="${textX}" y="${height - (format === "SHORT" ? 120 : 80)}" width="${Math.round(panelWidth * 0.55)}" height="8" fill="${accent}"/>
    </svg>`);
  }

  if (variantId === "C") {
    const textX = width / 2;
    const textY = format === "SHORT" ? height * 0.42 : height * 0.52;
    const bigFont = format === "SHORT" ? 96 : 84;
    return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#000000" fill-opacity="0.42"/>
      <circle cx="${width * 0.78}" cy="${height * 0.22}" r="${Math.round(width * 0.18)}" fill="${accent}" fill-opacity="0.18"/>
      ${buildTextLinesSvg(lines, { x: textX, startY: textY, fontSize: bigFont, fill: primary, anchor: "middle", strokeWidth: 6 })}
    </svg>`);
  }

  const textX = format === "SHORT" ? 64 : 56;
  const textY = format === "SHORT" ? 180 : 120;
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="55%" stop-color="#000000" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bottomFade)"/>
    ${buildTextLinesSvg(lines, { x: textX, startY: textY, fontSize, fill: primary })}
    <rect x="${textX}" y="${textY + lines.length * fontSize * 1.08 + 18}" width="${Math.min(width * 0.35, 280)}" height="6" fill="${accent}"/>
  </svg>`);
}

async function renderThumbnailVariant({
  sourcePath,
  outputPath,
  variant,
  format = "LONG",
  palette = [],
}) {
  const dims = THUMB_DIMS[format] || THUMB_DIMS.LONG;
  const variantId = variant?.id || "A";
  const overlayText = variant?.overlayText || variant?.label || "ASSISTA";

  let pipeline = sharp(sourcePath)
    .rotate()
    .resize(dims.width, dims.height, { fit: "cover", position: "attention" });

  if (variantId === "B") {
    pipeline = pipeline.modulate({ brightness: 1.05, saturation: 1.12 });
  } else if (variantId === "C") {
    pipeline = pipeline.blur(1.2).modulate({ brightness: 0.92 });
  } else {
    pipeline = pipeline.modulate({ brightness: 1.02, saturation: 1.08 });
  }

  const baseBuffer = await pipeline.jpeg({ quality: 92 }).toBuffer();
  const overlayBuffer = buildOverlaySvg({
    width: dims.width,
    height: dims.height,
    overlayText,
    colors: palette.length ? palette : variant?.colors || [],
    variantId,
    format,
  });

  await sharp(baseBuffer)
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(outputPath);
}

export async function generateYoutubeThumbnailImages({
  projectDir,
  projectName = "",
  thumbnails = [],
  format = "LONG",
  palette = [],
  storyboard = {},
  config = {},
}) {
  const heroPath = findHeroImagePath(projectDir, { storyboard, config, format });
  if (!heroPath) {
    throw new Error("Nenhuma imagem ou vídeo renderizado encontrado no projeto para gerar thumbnails.");
  }

  const outDir = path.join(projectDir, "ASSETS", "youtube_thumbnails");
  fs.mkdirSync(outDir, { recursive: true });

  const variants = thumbnails.slice(0, 3);
  const generated = [];

  for (const variant of variants) {
    const safeId = String(variant.id || "A").toUpperCase().replace(/[^A-Z0-9]/g, "") || "A";
    const fileName = `thumb_${safeId}_${format === "SHORT" ? "9x16" : "16x9"}.jpg`;
    const outputPath = path.join(outDir, fileName);

    await renderThumbnailVariant({
      sourcePath: heroPath,
      outputPath,
      variant: { ...variant, id: safeId },
      format,
      palette: palette.length ? palette : variant.colors || [],
    });

    generated.push({
      id: safeId,
      label: variant.label || `Variante ${safeId}`,
      overlayText: variant.overlayText || "",
      fileName: `youtube_thumbnails/${fileName}`,
      url: `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/youtube_thumbnails/${fileName}`,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    format,
    heroImage: path.relative(projectDir, heroPath).replace(/\\/g, "/"),
    variants: generated,
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  return {
    success: true,
    heroImage: manifest.heroImage,
    thumbnails: generated,
    outputDir: "ASSETS/youtube_thumbnails",
  };
}