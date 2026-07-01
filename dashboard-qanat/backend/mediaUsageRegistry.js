/**
 * Registro de mídia stock já usada no canal — evita repetir a mesma foto/vídeo entre projetos.
 */

import fs from "fs";
import path from "path";

const REGISTRY_REL = path.join(".agents", "stock_usage_registry.json");
const MEDIA_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".png", ".jpg", ".jpeg", ".webp"]);

function registryPath(workspaceDir) {
  return path.join(workspaceDir, REGISTRY_REL);
}

export function loadStockUsageRegistry(workspaceDir) {
  const p = registryPath(workspaceDir);
  const empty = { bySourceId: {}, byRelPath: {} };
  if (!fs.existsSync(p)) return empty;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      bySourceId: data.bySourceId || {},
      byRelPath: data.byRelPath || {},
    };
  } catch {
    return empty;
  }
}

export function saveStockUsageRegistry(workspaceDir, registry) {
  const dir = path.dirname(registryPath(workspaceDir));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(registryPath(workspaceDir), JSON.stringify(registry, null, 2), "utf8");
}

export function registerStockUsage(workspaceDir, {
  sourceId = "",
  relPath = "",
  project = "",
  scene = "",
  query = "",
} = {}) {
  const registry = loadStockUsageRegistry(workspaceDir);
  const stamp = new Date().toISOString();
  if (sourceId) {
    const key = String(sourceId);
    const prev = registry.bySourceId[key] || { count: 0, projects: [] };
    registry.bySourceId[key] = {
      count: prev.count + 1,
      projects: [...new Set([...(prev.projects || []), project].filter(Boolean))],
      lastScene: scene,
      lastQuery: query,
      lastAt: stamp,
    };
  }
  if (relPath) {
    const key = String(relPath).replace(/\\/g, "/");
    registry.byRelPath[key] = {
      project,
      scene,
      query,
      sourceId: sourceId || null,
      at: stamp,
    };
  }
  saveStockUsageRegistry(workspaceDir, registry);
  return registry;
}

export function isSourceIdUsed(registry, sourceId) {
  if (!sourceId) return false;
  return Boolean(registry?.bySourceId?.[String(sourceId)]);
}

export function scanWorkspaceMediaPaths(workspaceDir, { longsDir, shortsDir } = {}) {
  const used = new Set();
  const roots = [];
  if (longsDir && fs.existsSync(longsDir)) roots.push(longsDir);
  if (shortsDir && fs.existsSync(shortsDir)) roots.push(shortsDir);

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) walk(full);
      else {
        const ext = path.extname(item).toLowerCase();
        if (MEDIA_EXTS.has(ext)) used.add(full.replace(/\\/g, "/"));
      }
    }
  };

  for (const root of roots) {
    for (const proj of fs.readdirSync(root)) {
      walk(path.join(root, proj, "ASSETS"));
    }
  }

  const registry = loadStockUsageRegistry(workspaceDir);
  for (const rel of Object.keys(registry.byRelPath || {})) {
    used.add(rel);
  }
  return used;
}

export function extractSourceIdFromFilename(filename = "") {
  const base = String(filename).replace(/\\/g, "/");
  const pexels = base.match(/(?:^|_)pexels_(\d+)(?:_|\.)/i);
  if (pexels) return `pexels:${pexels[1]}`;
  const pixabay = base.match(/(?:^|_)pixabay_(\d+)(?:_|\.)/i);
  if (pixabay) return `pixabay:${pixabay[1]}`;
  return "";
}

export function getUsedSourceIdSet(registry) {
  return new Set(Object.keys(registry?.bySourceId || {}));
}

export function isFilenameSourceUsedInOtherProject(filename, registry, currentProject = "") {
  const id = extractSourceIdFromFilename(filename);
  if (!id) return false;
  const entry = registry?.bySourceId?.[id];
  if (!entry?.projects?.length) return false;
  if (!currentProject) return entry.projects.length > 0;
  return entry.projects.some((p) => p && p !== currentProject);
}