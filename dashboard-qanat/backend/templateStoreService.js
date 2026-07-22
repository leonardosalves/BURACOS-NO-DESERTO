/**
 * templateStoreService.js — PostgreSQL storage for motion templates.
 * Stores templates by category, niche, energy with TSX source and palettes.
 */
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.LUMIERA_DATABASE_URL ||
    "postgresql://lumiera@127.0.0.1:5432/lumiera",
});

/* ─── Schema ─── */

export async function ensureTemplateStoreDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS motion_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id VARCHAR(120) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(60) NOT NULL,
        niche VARCHAR(80),
        energy VARCHAR(20) DEFAULT 'medium',
        formats TEXT[] DEFAULT '{16:9,9:16}',
        tsx_source TEXT,
        palette JSONB,
        default_props JSONB,
        duration_seconds REAL DEFAULT 4.0,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS template_niches (
        id SERIAL PRIMARY KEY,
        niche VARCHAR(80) UNIQUE NOT NULL,
        label VARCHAR(120) NOT NULL,
        palette JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS template_categories (
        id SERIAL PRIMARY KEY,
        category VARCHAR(60) UNIQUE NOT NULL,
        label VARCHAR(120) NOT NULL,
        subcategories TEXT[] DEFAULT '{}',
        icon VARCHAR(40) DEFAULT 'film'
      );
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_motion_templates_category
        ON motion_templates(category);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_motion_templates_niche
        ON motion_templates(niche);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_motion_templates_approved
        ON motion_templates(approved);
    `);

    console.log("[TemplateStore] Database schema OK");
  } catch (err) {
    console.error("[TemplateStore] Erro ao assegurar schema:", err.message);
  } finally {
    client.release();
  }
}

/* ─── CRUD: Templates ─── */

export async function listTemplates({
  category,
  niche,
  energy,
  approved,
  limit = 200,
  offset = 0,
} = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }
  if (niche) {
    conditions.push(`niche = $${idx++}`);
    params.push(niche);
  }
  if (energy) {
    conditions.push(`energy = $${idx++}`);
    params.push(energy);
  }
  if (approved !== undefined) {
    conditions.push(`approved = $${idx++}`);
    params.push(approved);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT * FROM motion_templates ${where} ORDER BY category, name LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return rows;
}

export async function getTemplateById(id) {
  const { rows } = await pool.query(
    "SELECT * FROM motion_templates WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function getTemplateByTemplateId(templateId) {
  const { rows } = await pool.query(
    "SELECT * FROM motion_templates WHERE template_id = $1",
    [templateId]
  );
  return rows[0] || null;
}

export async function createTemplate(data) {
  const { rows } = await pool.query(
    `INSERT INTO motion_templates (template_id, name, category, niche, energy, formats, tsx_source, palette, default_props, duration_seconds, approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.template_id,
      data.name,
      data.category,
      data.niche || null,
      data.energy || "medium",
      data.formats || ["16:9", "9:16"],
      data.tsx_source || null,
      data.palette ? JSON.stringify(data.palette) : null,
      data.default_props ? JSON.stringify(data.default_props) : null,
      data.duration_seconds || 4.0,
      data.approved ?? false,
    ]
  );
  return rows[0];
}

export async function updateTemplate(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;

  const allowed = [
    "template_id",
    "name",
    "category",
    "niche",
    "energy",
    "formats",
    "tsx_source",
    "palette",
    "default_props",
    "duration_seconds",
    "approved",
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      const val =
        key === "palette" || key === "default_props"
          ? JSON.stringify(data[key])
          : data[key];
      fields.push(`${key} = $${idx++}`);
      params.push(val);
    }
  }
  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE motion_templates SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function deleteTemplate(id) {
  const { rowCount } = await pool.query(
    "DELETE FROM motion_templates WHERE id = $1",
    [id]
  );
  return rowCount > 0;
}

/* ─── CRUD: Niches ─── */

export async function listNiches() {
  const { rows } = await pool.query(
    "SELECT * FROM template_niches ORDER BY niche"
  );
  return rows;
}

export async function upsertNiche(niche, label, palette) {
  const { rows } = await pool.query(
    `INSERT INTO template_niches (niche, label, palette)
     VALUES ($1, $2, $3)
     ON CONFLICT (niche) DO UPDATE SET label = $2, palette = $3
     RETURNING *`,
    [niche, label, JSON.stringify(palette)]
  );
  return rows[0];
}

export async function updateNichePalette(niche, palette) {
  const { rows } = await pool.query(
    "UPDATE template_niches SET palette = $1 WHERE niche = $2 RETURNING *",
    [JSON.stringify(palette), niche]
  );
  return rows[0] || null;
}

/* ─── CRUD: Categories ─── */

export async function listCategories() {
  const { rows } = await pool.query(
    "SELECT * FROM template_categories ORDER BY category"
  );
  return rows;
}

export async function upsertCategory(category, label, subcategories, icon) {
  const { rows } = await pool.query(
    `INSERT INTO template_categories (category, label, subcategories, icon)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (category) DO UPDATE SET label = $2, subcategories = $3, icon = $4
     RETURNING *`,
    [category, label, subcategories || [], icon || "film"]
  );
  return rows[0];
}

/* ─── Seed ─── */

export async function seedTemplates(templates) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    for (const t of templates) {
      const existing = await client.query(
        "SELECT id FROM motion_templates WHERE template_id = $1",
        [t.template_id]
      );
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO motion_templates (template_id, name, category, niche, energy, formats, tsx_source, palette, default_props, duration_seconds, approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          t.template_id,
          t.name,
          t.category,
          t.niche || null,
          t.energy || "medium",
          t.formats || ["16:9", "9:16"],
          t.tsx_source || null,
          t.palette ? JSON.stringify(t.palette) : null,
          t.default_props ? JSON.stringify(t.default_props) : null,
          t.duration_seconds || 4.0,
          t.approved ?? true,
        ]
      );
      inserted++;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { inserted, skipped };
}

export async function seedNiches(niches) {
  for (const n of niches) {
    await upsertNiche(n.niche, n.label, n.palette);
  }
}

export async function seedCategories(categories) {
  for (const c of categories) {
    await upsertCategory(c.category, c.label, c.subcategories, c.icon);
  }
}
