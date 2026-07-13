/**
 * Persistência de resultados salvos do Radar de Tendências.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { buildNicheDetailBreakdown } from "./pioneerNicheDiscovery.js";

const STORE_VERSION = 1;

function storePath(workspaceDir) {
  return path.join(workspaceDir, "trend_radar_saves.json");
}

function readStore(workspaceDir) {
  const file = storePath(workspaceDir);
  if (!fs.existsSync(file)) {
    return { version: STORE_VERSION, items: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      version: STORE_VERSION,
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch {
    return { version: STORE_VERSION, items: [] };
  }
}

function writeStore(workspaceDir, store) {
  const file = storePath(workspaceDir);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        version: STORE_VERSION,
        updatedAt: new Date().toISOString(),
        items: store.items || [],
      },
      null,
      2
    ),
    "utf8"
  );
}

function newId() {
  return crypto.randomUUID();
}

export function listTrendRadarSaves(workspaceDir) {
  const store = readStore(workspaceDir);
  const items = [...store.items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  return {
    ok: true,
    total: items.length,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      label: item.label,
      savedAt: item.savedAt,
      discoveryMode: item.discoveryMode,
      nicheFilter: item.nicheFilter,
      format: item.format,
      status: item.status,
      pioneerScore: item.pioneerScore,
      macroNiche: item.macroNiche,
    })),
  };
}

export function getTrendRadarSave(workspaceDir, id) {
  const store = readStore(workspaceDir);
  const item = store.items.find((row) => row.id === id);
  if (!item) return { ok: false, error: "Item salvo não encontrado." };
  return { ok: true, item };
}

export function updateTrendRadarSuggestion(
  workspaceDir,
  id,
  suggestion = {},
  { nicheLabel = "" } = {}
) {
  const store = readStore(workspaceDir);
  const index = store.items.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false, error: "Item salvo nÃ£o encontrado." };

  const current = store.items[index];
  if (current.type === "scan") {
    const targetLabel = String(nicheLabel || "").trim();
    const nicheIndex = (current.niches || []).findIndex(
      (entry) => String(entry?.label || "").trim() === targetLabel
    );
    if (nicheIndex < 0) {
      return {
        ok: false,
        error: "A perspectiva aberta nao foi encontrada nesta varredura.",
      };
    }

    const target = current.niches[nicheIndex];
    const previous = target?.aspects?.firstVideo || null;
    const history = Array.isArray(target?.suggestionHistory)
      ? [...target.suggestionHistory]
      : [];
    if (previous?.idea) {
      history.push({ ...previous, replacedAt: new Date().toISOString() });
    }

    const updatedTarget = {
      ...target,
      aspects: {
        ...(target?.aspects || {}),
        ...suggestion.aspects,
        firstVideo: suggestion.firstVideo,
      },
      raw: {
        ...(target?.raw || {}),
        firstVideoIdea: suggestion.firstVideo?.idea || "",
        firstVideoHook: suggestion.firstVideo?.hook || "",
        currentCaseAngle: suggestion.aspects?.specificAngle || "",
        youtubeSearchQuery:
          suggestion.aspects?.searchQuery ||
          target?.raw?.youtubeSearchQuery ||
          "",
      },
      suggestionHistory: history.slice(-30),
      suggestionUpdatedAt: new Date().toISOString(),
    };
    const updated = {
      ...current,
      niches: current.niches.map((entry, entryIndex) =>
        entryIndex === nicheIndex ? updatedTarget : entry
      ),
      suggestionUpdatedAt: new Date().toISOString(),
    };
    store.items[index] = updated;
    writeStore(workspaceDir, store);
    return { ok: true, item: updated, niche: updatedTarget };
  }
  if (current.type !== "niche") {
    return {
      ok: false,
      error: "Abra um nicho individual para gerar uma nova sugestÃ£o.",
    };
  }

  const previous = current.detail?.aspects?.firstVideo || null;
  const history = Array.isArray(current.suggestionHistory)
    ? [...current.suggestionHistory]
    : [];
  if (previous?.idea) {
    history.push({ ...previous, replacedAt: new Date().toISOString() });
  }

  const aspects = {
    ...(current.detail?.aspects || {}),
    ...suggestion.aspects,
    firstVideo: suggestion.firstVideo,
  };
  const niche = {
    ...(current.niche || {}),
    firstVideoIdea: suggestion.firstVideo?.idea || "",
    firstVideoHook: suggestion.firstVideo?.hook || "",
    currentCaseAngle: suggestion.aspects?.specificAngle || "",
    youtubeSearchQuery:
      suggestion.aspects?.searchQuery ||
      current.niche?.youtubeSearchQuery ||
      "",
  };

  const updated = {
    ...current,
    niche,
    detail: {
      ...(current.detail || {}),
      aspects,
      raw: { ...(current.detail?.raw || {}), ...niche },
    },
    suggestionHistory: history.slice(-30),
    suggestionUpdatedAt: new Date().toISOString(),
  };
  store.items[index] = updated;
  writeStore(workspaceDir, store);
  return { ok: true, item: updated };
}

export function saveTrendRadarNiche(
  workspaceDir,
  {
    niche = {},
    discoveryMode = "virgin",
    nicheFilter = "",
    format = "SHORTS",
    scanSummary = null,
  } = {}
) {
  const savedAt = new Date().toISOString();
  const detail = buildNicheDetailBreakdown(niche, {
    discoveryMode,
    nicheFilter: nicheFilter || null,
    format,
    savedAt,
  });

  const item = {
    id: newId(),
    type: "niche",
    savedAt,
    label: detail.label,
    discoveryMode,
    nicheFilter: nicheFilter || null,
    format,
    status: niche.status || detail.status,
    pioneerScore: niche.pioneerScore ?? detail.pioneerScore,
    macroNiche: niche.macroNiche || null,
    scanSummary,
    niche,
    detail,
  };

  const store = readStore(workspaceDir);
  store.items.unshift(item);
  writeStore(workspaceDir, store);
  return { ok: true, item };
}

export function saveTrendRadarScan(
  workspaceDir,
  {
    discovery = {},
    discoveryMode = "virgin",
    nicheFilter = "",
    format = "SHORTS",
    label = "",
  } = {}
) {
  const savedAt = new Date().toISOString();
  const niches = Array.isArray(discovery?.pioneerNiches)
    ? discovery.pioneerNiches
    : [];
  const item = {
    id: newId(),
    type: "scan",
    savedAt,
    label:
      label ||
      `Varredura ${discoveryMode === "chosen" ? nicheFilter || "focada" : "virgem"} — ${niches.length} nicho(s)`,
    discoveryMode,
    nicheFilter: nicheFilter || discovery?.baseNiche || null,
    format: format || discovery?.format || "SHORTS",
    status: niches[0]?.status || null,
    pioneerScore: niches[0]?.pioneerScore ?? null,
    macroNiche: niches[0]?.macroNiche || null,
    summary: discovery?.summary || null,
    discovery,
    niches: niches.map((n) =>
      buildNicheDetailBreakdown(n, {
        discoveryMode,
        nicheFilter: nicheFilter || discovery?.baseNiche || null,
        format: format || discovery?.format || "SHORTS",
        savedAt,
      })
    ),
  };

  const store = readStore(workspaceDir);
  store.items.unshift(item);
  writeStore(workspaceDir, store);
  return { ok: true, item };
}

export function deleteTrendRadarSave(workspaceDir, id) {
  const store = readStore(workspaceDir);
  const before = store.items.length;
  store.items = store.items.filter((row) => row.id !== id);
  if (store.items.length === before) {
    return { ok: false, error: "Item salvo não encontrado." };
  }
  writeStore(workspaceDir, store);
  return { ok: true, deleted: id };
}
