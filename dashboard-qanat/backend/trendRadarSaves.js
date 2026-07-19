/**
 * Persistência de resultados salvos do Radar de Tendências no PostgreSQL.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import { buildNicheDetailBreakdown } from "./pioneerNicheDiscovery.js";

const { Pool } = pg;

let pool;
let readyPromise;

function databaseUrl() {
  return (
    String(process.env.LUMIERA_DATABASE_URL || "").trim() ||
    "postgresql://lumiera@127.0.0.1:5432/lumiera"
  );
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl(), max: 5 });
    pool.on("error", (error) =>
      console.error("[Trend Radar/PostgreSQL] pool:", error.message)
    );
  }
  return pool;
}

export async function ensureTrendRadarDatabase(workspaceDir) {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS trend_radar_saves (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL,
        label TEXT NOT NULL,
        discovery_mode TEXT NOT NULL,
        niche_filter TEXT,
        format TEXT NOT NULL,
        status TEXT,
        pioneer_score INTEGER,
        macro_niche TEXT,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Auto-migration from legacy JSON
    const file = path.join(workspaceDir, "trend_radar_saves.json");
    if (fs.existsSync(file)) {
      try {
        console.log(
          "[Trend Radar/PostgreSQL] Migrating legacy trend_radar_saves.json to database..."
        );
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        for (const item of items) {
          if (!item.id) continue;
          await db.query(
            `INSERT INTO trend_radar_saves
              (id, type, saved_at, label, discovery_mode, niche_filter, format, status, pioneer_score, macro_niche, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [
              item.id,
              item.type || "niche",
              item.savedAt || new Date().toISOString(),
              item.label || "Varredura",
              item.discoveryMode || "virgin",
              item.nicheFilter || null,
              item.format || "SHORTS",
              item.status || null,
              item.pioneerScore ?? null,
              item.macroNiche || null,
              JSON.stringify(item),
            ]
          );
        }
        console.log(
          `[Trend Radar/PostgreSQL] Successfully migrated ${items.length} items.`
        );

        // Rename the legacy file to prevent future migration checks
        fs.renameSync(file, file + ".bak");
        console.log(
          "[Trend Radar/PostgreSQL] Legacy file renamed to trend_radar_saves.json.bak"
        );
      } catch (err) {
        console.error(
          "[Trend Radar/PostgreSQL] Error migrating legacy trend_radar_saves.json:",
          err.message
        );
      }
    }
    return true;
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

function newId() {
  return crypto.randomUUID();
}

export async function listTrendRadarSaves(workspaceDir) {
  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  const res = await db.query(
    `SELECT id, type, label, saved_at AS "savedAt", discovery_mode AS "discoveryMode", 
            niche_filter AS "nicheFilter", format, status, pioneer_score AS "pioneerScore", 
            macro_niche AS "macroNiche"
     FROM trend_radar_saves 
     ORDER BY saved_at DESC`
  );
  return {
    ok: true,
    total: res.rows.length,
    items: res.rows,
  };
}

export async function getTrendRadarSave(workspaceDir, id) {
  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  const res = await db.query(
    `SELECT data FROM trend_radar_saves WHERE id = $1`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return { ok: false, error: "Item salvo não encontrado." };
  return { ok: true, item: row.data };
}

export async function updateTrendRadarSuggestion(
  workspaceDir,
  id,
  suggestion = {},
  { nicheLabel = "" } = {}
) {
  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  const currentRes = await db.query(
    `SELECT data FROM trend_radar_saves WHERE id = $1`,
    [id]
  );
  const row = currentRes.rows[0];
  if (!row) return { ok: false, error: "Item salvo não encontrado." };

  const current = row.data;
  let updated;
  let updatedTarget;

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

    updatedTarget = {
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
    updated = {
      ...current,
      niches: current.niches.map((entry, entryIndex) =>
        entryIndex === nicheIndex ? updatedTarget : entry
      ),
      suggestionUpdatedAt: new Date().toISOString(),
    };
  } else if (current.type === "niche") {
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

    updated = {
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
  } else {
    return {
      ok: false,
      error: "Abra um nicho individual para gerar uma nova sugestão.",
    };
  }

  // Update in DB
  await db.query(
    `UPDATE trend_radar_saves 
     SET data = $1, updated_at = NOW() 
     WHERE id = $2`,
    [JSON.stringify(updated), id]
  );

  if (current.type === "scan") {
    return { ok: true, item: updated, niche: updatedTarget };
  } else {
    return { ok: true, item: updated };
  }
}

export async function saveTrendRadarNiche(
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

  const id = newId();
  const item = {
    id,
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

  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  await db.query(
    `INSERT INTO trend_radar_saves 
      (id, type, saved_at, label, discovery_mode, niche_filter, format, status, pioneer_score, macro_niche, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      item.type,
      savedAt,
      item.label,
      discoveryMode,
      item.nicheFilter,
      format,
      item.status,
      item.pioneerScore,
      item.macroNiche,
      JSON.stringify(item),
    ]
  );

  return { ok: true, item };
}

export async function saveTrendRadarScan(
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

  const id = newId();
  const item = {
    id,
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

  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  await db.query(
    `INSERT INTO trend_radar_saves 
      (id, type, saved_at, label, discovery_mode, niche_filter, format, status, pioneer_score, macro_niche, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      item.type,
      savedAt,
      item.label,
      discoveryMode,
      item.nicheFilter,
      item.format,
      item.status,
      item.pioneerScore,
      item.macroNiche,
      JSON.stringify(item),
    ]
  );

  return { ok: true, item };
}

export async function deleteTrendRadarSave(workspaceDir, id) {
  await ensureTrendRadarDatabase(workspaceDir);
  const db = getPool();
  const res = await db.query(`DELETE FROM trend_radar_saves WHERE id = $1`, [
    id,
  ]);
  if (res.rowCount === 0) {
    return { ok: false, error: "Item salvo não encontrado." };
  }
  return { ok: true, deleted: id };
}
