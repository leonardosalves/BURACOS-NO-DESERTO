import fs from "fs";
import path from "path";
import {
  createCanvaDesign,
  downloadCanvaFile,
  exportCanvaDesign,
  getCanvaConnectionStatus,
  uploadCanvaAsset,
} from "./canvaClient.js";
import { generateYoutubeThumbnailImages } from "./youtubeThumbnailGenerator.js";

const THUMB_DIMS = {
  LONG: { width: 1280, height: 720 },
  SHORT: { width: 1080, height: 1920 },
};

function buildCanvaDesignQuery(variant, format, strategy = {}) {
  const aspect = format === "SHORT" ? "9:16 vertical (YouTube Shorts cover)" : "16:9 horizontal (YouTube thumbnail)";
  return [
    "YouTube thumbnail design for maximum CTR.",
    `Format: ${aspect}.`,
    `Variant ${variant.id} — ${variant.label || "Thumbnail"}.`,
    variant.overlayText ? `Bold overlay text (max 5 words): "${variant.overlayText}".` : "",
    variant.pairedTitle ? `Pairs with title: ${variant.pairedTitle}.` : "",
    variant.composition ? `Composition: ${variant.composition}.` : "",
    variant.focalElement ? `Visual focus: ${variant.focalElement}.` : "",
    variant.colors?.length ? `Color palette: ${variant.colors.join(", ")}.` : "",
    strategy.profileLabel ? `Creative profile: ${strategy.profileLabel}.` : "",
    strategy.rpm ? `Niche RPM: ${strategy.rpm}.` : "",
    "High contrast, readable on mobile, no tiny text, no watermark.",
  ].filter(Boolean).join(" ");
}

export async function generateCanvaThumbnailImages({
  workspaceDir,
  projectDir,
  projectName,
  thumbnails = [],
  format = "LONG",
  palette = [],
  storyboard = {},
  config = {},
  strategy = {},
}) {
  const status = getCanvaConnectionStatus(workspaceDir);
  if (!status.connected) {
    throw new Error("Canva não conectado. Configure Client ID/Secret e vincule a conta.");
  }

  const localResult = await generateYoutubeThumbnailImages({
    projectDir,
    projectName,
    thumbnails,
    format,
    palette,
    storyboard,
    config,
  });

  const dims = THUMB_DIMS[format] || THUMB_DIMS.LONG;
  const outDir = path.join(projectDir, "ASSETS", "youtube_thumbnails");
  const canvaVariants = [];

  for (const local of localResult.thumbnails || []) {
    const variantMeta = thumbnails.find((t) => String(t.id).toUpperCase() === String(local.id).toUpperCase()) || {};
    const localPath = path.join(projectDir, "ASSETS", local.fileName);
    if (!fs.existsSync(localPath)) continue;

    const asset = await uploadCanvaAsset(
      workspaceDir,
      localPath,
      `lumiera-${projectName}-${local.id}`.slice(0, 50),
    );

    const designRes = await createCanvaDesign(workspaceDir, {
      width: dims.width,
      height: dims.height,
      assetId: asset.id,
      title: buildCanvaDesignQuery({ ...variantMeta, id: local.id }, format, strategy).slice(0, 255),
    });

    const design = designRes?.design;
    if (!design?.id) {
      throw new Error(`Canva não criou design para variante ${local.id}.`);
    }

    const exported = await exportCanvaDesign(workspaceDir, design.id, {
      type: "jpg",
      quality: 95,
      width: dims.width,
      height: dims.height,
    });

    const fileName = `canva_thumb_${local.id}_${format === "SHORT" ? "9x16" : "16x9"}.jpg`;
    const outputPath = path.join(outDir, fileName);
    await downloadCanvaFile(exported.downloadUrl, outputPath);

    canvaVariants.push({
      id: local.id,
      label: local.label || variantMeta.label,
      overlayText: local.overlayText || variantMeta.overlayText,
      fileName: `youtube_thumbnails/${fileName}`,
      url: `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/youtube_thumbnails/${fileName}`,
      source: "canva",
      designId: design.id,
      editUrl: design.urls?.edit_url || null,
      viewUrl: design.urls?.view_url || null,
      canvaThumbnail: design.thumbnail?.url || null,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    format,
    provider: "canva",
    heroImage: localResult.heroImage,
    variants: canvaVariants,
    localVariants: localResult.thumbnails,
  };

  fs.writeFileSync(path.join(outDir, "canva_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    success: true,
    provider: "canva",
    heroImage: localResult.heroImage,
    thumbnails: canvaVariants,
    localThumbnails: localResult.thumbnails,
    outputDir: "ASSETS/youtube_thumbnails",
  };
}