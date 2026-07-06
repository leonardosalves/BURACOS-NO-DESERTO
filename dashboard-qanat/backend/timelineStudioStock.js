/**
 * Busca e importação de stock (Pexels/Pixabay) para Timeline Studio — Fase 3
 */

import fs from "fs";
import path from "path";
import https from "https";
import { getWorkflowApiKeys } from "./workflowTools.js";
import { registerStockUsage } from "./mediaUsageRegistry.js";

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(urlObj, { method: "GET", headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpsGetJson(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.end();
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          downloadFile(res.headers.location, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (res.statusCode >= 400) {
          file.close();
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(destPath)));
      })
      .on("error", reject);
  });
}

function slugify(text = "") {
  return (
    String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "asset"
  );
}

function mapPexelsVideos(data = {}, query = "") {
  const items = [];
  for (const video of data.videos || []) {
    const file =
      video?.video_files?.find((f) => f.quality === "hd") ||
      video?.video_files?.[0];
    if (!file?.link) continue;
    items.push({
      id: `pexels-${video.id}`,
      sourceId: `pexels:${video.id}`,
      provider: "pexels",
      type: "video",
      previewUrl: video.image || file.link,
      downloadUrl: file.link,
      width: video.width,
      height: video.height,
      duration: Number(video.duration) || undefined,
      photographer: video.user?.name || "",
      query,
    });
  }
  return items;
}

function mapPexelsPhotos(data = {}, query = "") {
  const items = [];
  for (const photo of data.photos || []) {
    const downloadUrl = photo?.src?.large2x || photo?.src?.large;
    const previewUrl = photo?.src?.medium || downloadUrl;
    if (!downloadUrl) continue;
    items.push({
      id: `pexels-${photo.id}`,
      sourceId: `pexels:${photo.id}`,
      provider: "pexels",
      type: "image",
      previewUrl,
      downloadUrl,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer || "",
      query,
    });
  }
  return items;
}

function mapPixabayVideos(data = {}, query = "") {
  const items = [];
  for (const hit of data.hits || []) {
    const downloadUrl = hit?.videos?.medium?.url || hit?.videos?.small?.url;
    const previewUrl =
      hit?.videos?.tiny?.thumbnail ||
      hit?.videos?.small?.thumbnail ||
      downloadUrl;
    if (!downloadUrl) continue;
    items.push({
      id: `pixabay-${hit.id}`,
      sourceId: `pixabay:${hit.id}`,
      provider: "pixabay",
      type: "video",
      previewUrl,
      downloadUrl,
      width: hit.videos?.medium?.width,
      height: hit.videos?.medium?.height,
      duration: Number(hit.duration) || undefined,
      photographer: hit.user || "",
      query,
    });
  }
  return items;
}

function mapPixabayPhotos(data = {}, query = "") {
  const items = [];
  for (const hit of data.hits || []) {
    const downloadUrl = hit?.largeImageURL || hit?.webformatURL;
    const previewUrl = hit?.previewURL || downloadUrl;
    if (!downloadUrl) continue;
    items.push({
      id: `pixabay-${hit.id}`,
      sourceId: `pixabay:${hit.id}`,
      provider: "pixabay",
      type: "image",
      previewUrl,
      downloadUrl,
      width: hit.imageWidth,
      height: hit.imageHeight,
      photographer: hit.user || "",
      query,
    });
  }
  return items;
}

export async function searchTimelineStock({
  workspaceDir,
  projDir,
  query,
  mediaType = "video",
  provider = "all",
  perPage = 12,
}) {
  const q = String(query || "").trim();
  if (!q) {
    return { items: [], keys: { pexels: false, pixabay: false }, error: null };
  }

  const keys = getWorkflowApiKeys(workspaceDir, projDir);
  const isVideo = mediaType === "video";
  const items = [];
  const errors = [];

  if ((provider === "all" || provider === "pexels") && keys.pexels) {
    try {
      const url = isVideo
        ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${perPage}`
        : `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}`;
      const data = await httpsGetJson(url, { Authorization: keys.pexels });
      items.push(
        ...(isVideo ? mapPexelsVideos(data, q) : mapPexelsPhotos(data, q))
      );
    } catch (err) {
      errors.push(`Pexels: ${err.message}`);
    }
  }

  if ((provider === "all" || provider === "pixabay") && keys.pixabay) {
    try {
      const url = `https://pixabay.com/api/${isVideo ? "videos/" : ""}?key=${encodeURIComponent(keys.pixabay)}&q=${encodeURIComponent(q)}&per_page=${perPage}&safesearch=true`;
      const data = await httpsGetJson(url);
      items.push(
        ...(isVideo ? mapPixabayVideos(data, q) : mapPixabayPhotos(data, q))
      );
    } catch (err) {
      errors.push(`Pixabay: ${err.message}`);
    }
  }

  const keysConfigured = {
    pexels: !!keys.pexels,
    pixabay: !!keys.pixabay,
  };

  if (!keys.pexels && !keys.pixabay) {
    return {
      items: [],
      keys: keysConfigured,
      error: "Configure chaves Pexels/Pixabay em Configurações → API Keys.",
    };
  }

  return {
    items,
    keys: keysConfigured,
    error: items.length
      ? null
      : errors.join(" · ") || "Nenhum resultado encontrado.",
  };
}

export async function importTimelineStock({
  workspaceDir,
  projDir,
  item,
  query = "",
}) {
  if (!item?.downloadUrl || !item?.sourceId) {
    throw new Error("Item de stock inválido");
  }

  const assetsDir = path.join(projDir, "ASSETS");
  fs.mkdirSync(assetsDir, { recursive: true });

  const ext =
    item.type === "video"
      ? ".mp4"
      : item.downloadUrl.includes(".png")
        ? ".png"
        : ".jpg";
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const sourceTag = String(item.sourceId).replace(":", "_");
  const filename = `stock_${slugify(query || item.query || "broll")}_${sourceTag}_${stamp}${ext}`;
  const destPath = path.join(assetsDir, filename);

  await downloadFile(item.downloadUrl, destPath);

  const projectName = path.basename(projDir);
  if (workspaceDir) {
    registerStockUsage(workspaceDir, {
      sourceId: item.sourceId,
      relPath: filename,
      project: projectName,
      scene: "timeline-studio",
      query: query || item.query || "",
    });
  }

  const defaultDuration =
    item.type === "video"
      ? Math.min(12, Math.max(4, Number(item.duration) || 6))
      : 4;

  return {
    filename,
    relPath: filename,
    isVideo: item.type === "video",
    defaultDuration,
    provider: item.provider,
    sourceId: item.sourceId,
    label:
      item.photographer ||
      `${item.provider} ${item.type === "video" ? "vídeo" : "foto"}`,
  };
}

export function buildStockVideoClip({ importResult, playhead = 0, duration }) {
  const dur = duration ?? importResult.defaultDuration ?? 6;
  return {
    id: `video-stock-${Date.now()}`,
    trackId: "video",
    start: Math.max(0, Number(playhead) || 0),
    duration: dur,
    label: importResult.label || importResult.filename,
    source: importResult.filename,
    props: {
      type: importResult.isVideo ? "video" : "image",
      stockProvider: importResult.provider,
      stockSourceId: importResult.sourceId,
    },
    color: "#1565C0",
  };
}
