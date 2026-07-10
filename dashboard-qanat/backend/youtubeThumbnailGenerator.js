import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import sharp from "sharp";
import { isListicleProject } from "./videoProEnhancements.js";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

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

function listVideoCandidates(dir, scoreBase = 1, maxDepth = 3, depth = 0) {
  if (!fs.existsSync(dir) || depth > maxDepth) return [];
  const results = [];

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(
        ...listVideoCandidates(
          fullPath,
          scoreBase - depth * 0.5,
          maxDepth,
          depth + 1
        )
      );
      continue;
    }

    if (!/\.(mp4|mov|webm)$/i.test(entry)) continue;
    results.push({
      fullPath,
      mtime: stat.mtimeMs,
      score: scoreBase + stat.size / 5_000_000,
    });
  }

  return results;
}

function extractVideoFrame(projectDir, videoPath = null) {
  const tempDir = path.join(projectDir, "ASSETS", "youtube_thumbnails", "_tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const framePath = path.join(tempDir, `frame_${Date.now()}.jpg`);

  const tryExtract = (sourcePath, seek = "00:00:03") => {
    if (!sourcePath || !fs.existsSync(sourcePath)) return null;
    try {
      const cmd = `ffmpeg -y -ss ${seek} -i "${sourcePath}" -frames:v 1 -q:v 2 "${framePath}"`;
      execSync(cmd, { stdio: "pipe", env: buildPythonSpawnEnv() });
      return fs.existsSync(framePath) ? framePath : null;
    } catch {
      return null;
    }
  };

  if (videoPath) {
    const frame = tryExtract(videoPath);
    if (frame) return frame;
  }

  const videoDirs = [
    path.join(projectDir, "OUTPUT", "qanat_persa_video_final"),
    path.join(projectDir, "OUTPUT"),
    path.join(projectDir, "temp_clips"),
    path.join(projectDir, "ASSETS", "videos"),
  ];

  const videos = videoDirs
    .flatMap((dir, index) => listVideoCandidates(dir, 12 - index))
    .sort((a, b) => b.score - a.score || b.mtime - a.mtime);

  for (const video of videos) {
    const frame = tryExtract(
      video.fullPath,
      videos[0] === video ? "00:00:08" : "00:00:01"
    );
    if (frame) return frame;
  }

  return null;
}

async function createPlaceholderHero(projectDir, palette = []) {
  const tempDir = path.join(projectDir, "ASSETS", "youtube_thumbnails", "_tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const outPath = path.join(tempDir, `placeholder_${Date.now()}.jpg`);
  const c1 = normalizeHex(palette[2] || "#121214").replace("#", "");
  const c2 = normalizeHex(palette[0] || "#D4AF37").replace("#", "");

  const svg =
    Buffer.from(`<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#${c1}"/>
        <stop offset="100%" stop-color="#${c2}" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
  </svg>`);

  await sharp(svg).jpeg({ quality: 90 }).toFile(outPath);
  return outPath;
}

export function findHeroImagePath(
  projectDir,
  { storyboard = {}, config = {}, format = "LONG" } = {}
) {
  const candidates = [];
  const preferredBlocks =
    format === "SHORT" ? ["2", "3", "4", "1"] : ["2", "3", "4", "5", "1"];
  const timeline = config.timeline_assets || {};

  for (let i = 0; i < preferredBlocks.length; i++) {
    const block = preferredBlocks[i];
    const assets = Array.isArray(timeline[block]) ? timeline[block] : [];
    for (const asset of assets) {
      const isImage =
        asset?.type === "image" ||
        /\.(jpe?g|png|webp)$/i.test(asset?.asset || "");
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

  candidates.push(
    ...listImageCandidates(path.join(projectDir, "ASSETS", "images"), 8)
  );
  candidates.push(...listImageCandidates(path.join(projectDir, "ASSETS"), 6));

  const framePath = extractVideoFrame(projectDir);
  if (framePath) candidates.push({ path: framePath, score: 14 });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.path || null;
}

export async function resolveHeroImagePath(
  projectDir,
  context = {},
  palette = []
) {
  const staticHero = findHeroImagePath(projectDir, context);
  if (staticHero) return staticHero;
  const frame = extractVideoFrame(projectDir);
  if (frame) return frame;
  return createPlaceholderHero(projectDir, palette);
}

function buildTextLinesSvg(
  lines,
  {
    x,
    startY,
    fontSize,
    fill,
    stroke = "rgba(0,0,0,0.85)",
    strokeWidth = 4,
    anchor = "start",
  }
) {
  const lineHeight = fontSize * 1.08;
  return lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke">${escapeXml(line)}</text>`;
    })
    .join("");
}

function buildListicleHudBadgeSvg({
  width,
  rankCount = 3,
  accent = "#D4AF37",
  format = "LONG",
}) {
  if (format !== "SHORT" || !rankCount) return "";
  const badgeW = Math.round(Math.min(width * 0.52, 320));
  const badgeH = 74;
  const x = Math.round((width - badgeW) / 2);
  const y = 108;
  const rankLabel = Math.max(1, Number(rankCount) || 3);
  return `
    <rect x="${x}" y="${y}" width="${badgeW}" height="${badgeH}" rx="37" fill="rgba(0,0,0,0.88)" stroke="${accent}" stroke-width="3"/>
    <text x="${x + 42}" y="${y + 48}" font-family="Georgia, 'Times New Roman', serif" font-size="36" font-weight="800" fill="#FFFFFF" stroke="#000000" stroke-width="2.5" paint-order="stroke">#${rankLabel}</text>
    <text x="${x + 128}" y="${y + 48}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="${accent}" stroke="#000000" stroke-width="1.5" paint-order="stroke">TOP ${rankLabel}</text>
  `;
}

function buildOverlaySvg({
  width,
  height,
  overlayText,
  colors = [],
  variantId = "A",
  format = "LONG",
  listicleRank = 0,
}) {
  const primary = normalizeHex(colors[0] || "#D4AF37");
  const accent = normalizeHex(colors[1] || "#00E5FF");
  const dark = normalizeHex(colors[2] || "#121214");
  const maxChars = format === "SHORT" ? 12 : 16;
  const fontSize = format === "SHORT" ? 78 : 68;
  const lines = wrapOverlayText(overlayText || "ASSISTA AGORA", maxChars);
  const hudBadge = buildListicleHudBadgeSvg({
    width,
    rankCount: listicleRank,
    accent: primary,
    format,
  });

  if (variantId === "B") {
    const panelWidth = Math.round(width * 0.46);
    const textX = Math.round(panelWidth * 0.1);
    const textY = format === "SHORT" ? 220 : 150;
    return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${hudBadge}
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
      ${hudBadge}
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
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.72"/>
        <stop offset="45%" stop-color="#000000" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#topFade)"/>
    ${hudBadge}
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
  listicleRank = 0,
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
    listicleRank,
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
  const heroPath = await resolveHeroImagePath(
    projectDir,
    { storyboard, config, format },
    palette.length ? palette : thumbnails[0]?.colors || []
  );

  const listicleRank = isListicleProject(config, storyboard)
    ? Number(config.rank_count || storyboard?.listicle?.rank_count || 0)
    : 0;

  const outDir = path.join(projectDir, "ASSETS", "youtube_thumbnails");
  fs.mkdirSync(outDir, { recursive: true });

  const variants = thumbnails.slice(0, 3);
  const generated = [];

  for (const variant of variants) {
    const safeId =
      String(variant.id || "A")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "") || "A";
    const fileName = `thumb_${safeId}_${format === "SHORT" ? "9x16" : "16x9"}.jpg`;
    const outputPath = path.join(outDir, fileName);

    await renderThumbnailVariant({
      sourcePath: heroPath,
      outputPath,
      variant: { ...variant, id: safeId },
      format,
      palette: palette.length ? palette : variant.colors || [],
      listicleRank,
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
    "utf8"
  );

  return {
    success: true,
    heroImage: manifest.heroImage,
    thumbnails: generated,
    outputDir: "ASSETS/youtube_thumbnails",
  };
}
