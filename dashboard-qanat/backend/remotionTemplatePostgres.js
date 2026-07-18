import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY_CATALOG_PATH = path.join(
  __dirname,
  "data",
  "remotion-template-catalog.json"
);

let pool;
let readyPromise;

function dedupeTemplates(templates = []) {
  const byId = new Map();
  for (const template of Array.isArray(templates) ? templates : []) {
    const id = String(template?.id || "").trim();
    if (!id) continue;
    byId.set(id, template);
  }
  return [...byId.values()];
}

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
      console.error("[Template Studio/PostgreSQL] pool:", error.message)
    );
  }
  return pool;
}

function normalizeNiche(value = "") {
  return String(value || "").trim() || "Engenharia";
}

function nicheKey(value = "") {
  return normalizeNiche(value).toLocaleLowerCase("pt-BR");
}

function readLegacyCatalog() {
  try {
    return JSON.parse(fs.readFileSync(LEGACY_CATALOG_PATH, "utf8"));
  } catch {
    return { niches: {} };
  }
}

export async function ensureTemplateStudioDatabase() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS remotion_template_catalogs (
        niche_key TEXT PRIMARY KEY,
        niche TEXT NOT NULL,
        templates JSONB NOT NULL DEFAULT '[]'::jsonb,
        categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        deleted_catalog JSONB NOT NULL DEFAULT '{"categories":[],"subcategories":[],"templates":[]}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS remotion_template_catalog_versions (
        id BIGSERIAL PRIMARY KEY,
        niche_key TEXT NOT NULL,
        template_count INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        reason TEXT NOT NULL DEFAULT 'sync',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const count = Number(
      (
        await db.query(
          "SELECT COUNT(*)::int AS count FROM remotion_template_catalogs"
        )
      ).rows[0]?.count || 0
    );
    if (count === 0) {
      const legacy = readLegacyCatalog();
      for (const [niche, entry] of Object.entries(legacy.niches || {})) {
        const templates = Array.isArray(entry.templates) ? entry.templates : [];
        const categories = Array.isArray(entry.categories)
          ? entry.categories
          : [];
        const deletedCatalog = entry.deleted_catalog || {
          categories: [],
          subcategories: [],
          templates: [],
        };
        await db.query(
          `INSERT INTO remotion_template_catalogs
            (niche_key, niche, templates, categories, deleted_catalog, updated_at)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
           ON CONFLICT (niche_key) DO NOTHING`,
          [
            nicheKey(niche),
            normalizeNiche(niche),
            JSON.stringify(templates),
            JSON.stringify(categories),
            JSON.stringify(deletedCatalog),
          ]
        );
        await db.query(
          `INSERT INTO remotion_template_catalog_versions
            (niche_key, template_count, snapshot, reason)
           VALUES ($1, $2, $3::jsonb, 'initial-json-migration')`,
          [
            nicheKey(niche),
            templates.length,
            JSON.stringify({
              niche: normalizeNiche(niche),
              templates,
              categories,
              deleted_catalog: deletedCatalog,
            }),
          ]
        );
      }
    }
    return true;
  })().catch((error) => {
    readyPromise = undefined;
    throw error;
  });
  return readyPromise;
}

export async function listTemplateCatalogNiches() {
  await ensureTemplateStudioDatabase();
  const result = await getPool().query(
    `SELECT niche, templates, jsonb_array_length(templates)::int AS count, updated_at
       FROM remotion_template_catalogs ORDER BY LOWER(niche)`
  );
  return result.rows.map(({ templates, count: _count, ...row }) => {
    const uniqueTemplates = dedupeTemplates(templates);
    return {
      ...row,
      count: uniqueTemplates.length,
      approved_count: uniqueTemplates.filter(
        (template) => template?.status === "approved"
      ).length,
    };
  });
}

export async function getTemplateCatalog(niche) {
  await ensureTemplateStudioDatabase();
  const clean = normalizeNiche(niche);
  const result = await getPool().query(
    `SELECT niche, templates, categories, deleted_catalog, updated_at
       FROM remotion_template_catalogs WHERE niche_key = $1`,
    [nicheKey(clean)]
  );
  const row = result.rows[0];
  const templates = dedupeTemplates(row?.templates);
  return {
    niche: row?.niche || clean,
    templates,
    categories: Array.isArray(row?.categories) ? row.categories : [],
    deleted_catalog: row?.deleted_catalog || {
      categories: [],
      subcategories: [],
      templates: [],
    },
    approved: templates.filter((item) => item?.status === "approved"),
    orchestration_ready: templates.filter(
      (item) =>
        item?.status === "approved" && item?.orchestration_ready !== false
    ),
    updated_at: row?.updated_at || null,
  };
}

export async function upsertTemplateCatalog(
  niche,
  templates,
  { categories, deletedCatalog, reason = "sync" } = {}
) {
  await ensureTemplateStudioDatabase();
  const clean = normalizeNiche(niche);
  const safeTemplates = dedupeTemplates(templates);
  const current = await getTemplateCatalog(clean);
  const safeCategories = Array.isArray(categories)
    ? categories
    : current.categories;
  const safeDeleted = deletedCatalog || current.deleted_catalog;
  const db = getPool();
  await db.query("BEGIN");
  try {
    await db.query(
      `INSERT INTO remotion_template_catalogs
        (niche_key, niche, templates, categories, deleted_catalog, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
       ON CONFLICT (niche_key) DO UPDATE SET
         niche = EXCLUDED.niche,
         templates = EXCLUDED.templates,
         categories = EXCLUDED.categories,
         deleted_catalog = EXCLUDED.deleted_catalog,
         updated_at = NOW()`,
      [
        nicheKey(clean),
        clean,
        JSON.stringify(safeTemplates),
        JSON.stringify(safeCategories),
        JSON.stringify(safeDeleted),
      ]
    );
    await db.query(
      `INSERT INTO remotion_template_catalog_versions
        (niche_key, template_count, snapshot, reason)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [
        nicheKey(clean),
        safeTemplates.length,
        JSON.stringify({
          niche: clean,
          templates: safeTemplates,
          categories: safeCategories,
          deleted_catalog: safeDeleted,
        }),
        reason,
      ]
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
  return { niche: clean, count: safeTemplates.length };
}

export async function createTemplateCatalogNiche(niche) {
  const clean = normalizeNiche(niche);
  const existing = await getTemplateCatalog(clean);
  if (existing.updated_at) return { ok: true, niche: clean, created: false };
  await upsertTemplateCatalog(clean, [], { reason: "create-niche" });
  return { ok: true, niche: clean, created: true };
}

export async function deleteTemplateCatalogNiche(niche) {
  await ensureTemplateStudioDatabase();
  const clean = normalizeNiche(niche);
  const result = await getPool().query(
    "DELETE FROM remotion_template_catalogs WHERE niche_key = $1",
    [nicheKey(clean)]
  );
  return { ok: true, niche: clean, deleted: result.rowCount > 0 };
}

export async function exportTemplateCatalogDatabase() {
  await ensureTemplateStudioDatabase();
  const result = await getPool().query(
    `SELECT niche, templates, categories, deleted_catalog, updated_at
       FROM remotion_template_catalogs ORDER BY LOWER(niche)`
  );
  const niches = {};
  for (const row of result.rows) {
    niches[row.niche] = {
      templates: dedupeTemplates(row.templates),
      categories: row.categories || [],
      deleted_catalog: row.deleted_catalog || {},
      updated_at: row.updated_at,
    };
  }
  return { version: 2, exported_at: new Date().toISOString(), niches };
}

export async function importTemplateCatalogDatabase(payload = {}) {
  const entries = Object.entries(payload.niches || {});
  let imported = 0;
  for (const [niche, entry] of entries) {
    const templates = Array.isArray(entry?.templates) ? entry.templates : [];
    await upsertTemplateCatalog(niche, templates, {
      categories: entry?.categories || [],
      deletedCatalog: entry?.deleted_catalog,
      reason: "import-backup",
    });
    imported += templates.length;
  }
  return { ok: true, imported, niches: entries.map(([niche]) => niche) };
}

export async function writeTemplateCatalogBackupFile() {
  const payload = await exportTemplateCatalogDatabase();
  fs.writeFileSync(
    LEGACY_CATALOG_PATH,
    `${JSON.stringify(payload, null, 2)}\n`
  );
  return payload;
}
