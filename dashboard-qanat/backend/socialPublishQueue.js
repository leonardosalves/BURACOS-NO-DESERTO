import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const QUEUE_FILE = "social_publish_queue.json";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv"]);
const STATUSES = [
  "pending",
  "review",
  "scheduled",
  "posted",
  "failed",
  "dismissed",
];
const PLATFORMS = ["youtube", "instagram", "tiktok", "kwai"];

function queuePath(workspaceDir) {
  return path.join(workspaceDir, QUEUE_FILE);
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function loadSocialPublishQueue(workspaceDir) {
  const stored = readJsonSafe(queuePath(workspaceDir)) || {};
  const items = Array.isArray(stored.items) ? stored.items : [];
  return {
    items: items
      .filter((item) => item && item.id && item.projectSlug)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      ),
    updatedAt: stored.updatedAt || null,
  };
}

export function saveSocialPublishQueue(workspaceDir, items) {
  const payload = {
    items,
    updatedAt: new Date().toISOString(),
  };
  writeJson(queuePath(workspaceDir), payload);
  return payload;
}

export function findLatestOutputVideo(projDir) {
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  if (!fs.existsSync(outputDir)) return null;
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => {
      const stat = fs.statSync(path.join(outputDir, f));
      return { name: f, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.name || null;
}

export function enqueueSocialPublishItem(
  workspaceDir,
  {
    projectSlug,
    projectDir,
    videoFile = null,
    platforms = ["youtube"],
    status = "pending",
    scheduledAt = null,
    notes = "",
  } = {}
) {
  if (!projectSlug) throw new Error("projectSlug é obrigatório.");

  const resolvedVideo = videoFile || findLatestOutputVideo(projectDir);
  if (!resolvedVideo) {
    throw new Error("Nenhum vídeo em OUTPUT/qanat_persa_video_final.");
  }

  const normalizedPlatforms = [
    ...new Set(platforms.filter((p) => PLATFORMS.includes(p))),
  ];
  if (!normalizedPlatforms.length) {
    throw new Error("Selecione ao menos uma plataforma.");
  }

  const normalizedStatus = STATUSES.includes(status) ? status : "pending";
  const { items } = loadSocialPublishQueue(workspaceDir);

  const duplicate = items.find(
    (item) =>
      item.projectSlug === projectSlug &&
      item.videoFile === resolvedVideo &&
      !["posted", "dismissed"].includes(item.status)
  );
  if (duplicate) {
    return {
      item: duplicate,
      created: false,
      queue: loadSocialPublishQueue(workspaceDir),
    };
  }

  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    projectSlug,
    videoFile: resolvedVideo,
    platforms: normalizedPlatforms,
    status: normalizedStatus,
    scheduledAt: scheduledAt || null,
    notes: String(notes || "").trim(),
    createdAt: now,
    updatedAt: now,
    postedAt: null,
    lastError: null,
  };

  const nextItems = [item, ...items];
  saveSocialPublishQueue(workspaceDir, nextItems);
  return { item, created: true, queue: loadSocialPublishQueue(workspaceDir) };
}

export function updateSocialPublishItem(workspaceDir, id, patch = {}) {
  const { items } = loadSocialPublishQueue(workspaceDir);
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) throw new Error("Item da fila não encontrado.");

  const current = items[idx];
  const next = { ...current, updatedAt: new Date().toISOString() };

  if (patch.status && STATUSES.includes(patch.status)) {
    next.status = patch.status;
    if (patch.status === "posted") next.postedAt = new Date().toISOString();
  }
  if (patch.scheduledAt !== undefined)
    next.scheduledAt = patch.scheduledAt || null;
  if (Array.isArray(patch.platforms)) {
    const normalized = [
      ...new Set(patch.platforms.filter((p) => PLATFORMS.includes(p))),
    ];
    if (normalized.length) next.platforms = normalized;
  }
  if (typeof patch.notes === "string") next.notes = patch.notes.trim();
  if (typeof patch.lastError === "string") next.lastError = patch.lastError;

  items[idx] = next;
  saveSocialPublishQueue(workspaceDir, items);
  return { item: next, queue: loadSocialPublishQueue(workspaceDir) };
}

export function removeSocialPublishItem(workspaceDir, id) {
  const { items } = loadSocialPublishQueue(workspaceDir);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length)
    throw new Error("Item da fila não encontrado.");
  saveSocialPublishQueue(workspaceDir, filtered);
  return loadSocialPublishQueue(workspaceDir);
}

export function markSocialPublishPosted(
  workspaceDir,
  { projectSlug, videoFile } = {}
) {
  if (!projectSlug) return null;
  const { items } = loadSocialPublishQueue(workspaceDir);
  let changed = false;
  const next = items.map((item) => {
    if (
      item.projectSlug === projectSlug &&
      (!videoFile || item.videoFile === videoFile) &&
      ["pending", "review", "scheduled"].includes(item.status)
    ) {
      changed = true;
      return {
        ...item,
        status: "posted",
        postedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastError: null,
      };
    }
    return item;
  });
  if (changed) saveSocialPublishQueue(workspaceDir, next);
  return changed ? loadSocialPublishQueue(workspaceDir) : null;
}

export function getSocialPublishQueueSummary(workspaceDir) {
  const { items } = loadSocialPublishQueue(workspaceDir);
  const summary = { pending: 0, review: 0, scheduled: 0, posted: 0, failed: 0 };
  for (const item of items) {
    if (summary[item.status] !== undefined) summary[item.status] += 1;
  }
  return { ...summary, total: items.length };
}
