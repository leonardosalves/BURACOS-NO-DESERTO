/**
 * templateRoutes.js — REST API for motion template management.
 * Mounted at /api/templates in server.js
 *
 * Route order matters: static paths must be registered before /:id.
 */
import { Router } from "express";
import {
  ensureTemplateStoreDatabase,
  listTemplates,
  getTemplateById,
  getTemplateByTemplateId,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listNiches,
  upsertNiche,
  updateNichePalette,
  listCategories,
  upsertCategory,
  seedTemplates,
  seedNiches,
  seedCategories,
} from "./templateStoreService.js";
import { buildSeedData } from "./templateSeedData.js";

const router = Router();

// Ensure DB schema on first import
ensureTemplateStoreDatabase().catch((err) =>
  console.error("[TemplateRoutes] Init error:", err.message)
);

/* ─── List + seed (static) ─── */

router.get("/", async (req, res) => {
  try {
    const { category, niche, energy, approved, limit, offset } = req.query;
    const rows = await listTemplates({
      category,
      niche,
      energy,
      approved: approved !== undefined ? approved === "true" : undefined,
      limit: limit ? parseInt(limit, 10) : 200,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ ok: true, templates: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/seed", async (req, res) => {
  try {
    const { templates, niches, categories } = buildSeedData();
    await seedCategories(categories);
    await seedNiches(niches);
    const result = await seedTemplates(templates);
    res.json({ ok: true, ...result, total_seed: templates.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─── Niches (static paths before /:id) ─── */

router.get("/niches/list", async (req, res) => {
  try {
    const rows = await listNiches();
    res.json({ ok: true, niches: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/niches/:niche/palette", async (req, res) => {
  try {
    const row = await updateNichePalette(
      req.params.niche,
      req.body.palette || req.body
    );
    if (!row)
      return res.status(404).json({ ok: false, error: "Niche not found" });
    res.json({ ok: true, niche: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/niches", async (req, res) => {
  try {
    const { niche, label, palette } = req.body || {};
    if (!niche || !label) {
      return res
        .status(400)
        .json({ ok: false, error: "niche and label required" });
    }
    const row = await upsertNiche(niche, label, palette || {});
    res.json({ ok: true, niche: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─── Categories ─── */

router.get("/categories/list", async (req, res) => {
  try {
    const rows = await listCategories();
    res.json({ ok: true, categories: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { category, label, subcategories, icon } = req.body || {};
    if (!category || !label) {
      return res
        .status(400)
        .json({ ok: false, error: "category and label required" });
    }
    const row = await upsertCategory(category, label, subcategories, icon);
    res.json({ ok: true, category: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─── Lookup by template_id (before UUID :id) ─── */

router.get("/by-template-id/:templateId", async (req, res) => {
  try {
    const row = await getTemplateByTemplateId(req.params.templateId);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, template: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─── CRUD by UUID ─── */

router.get("/:id", async (req, res) => {
  try {
    const row = await getTemplateById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, template: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.template_id || !data.name || !data.category) {
      return res
        .status(400)
        .json({ ok: false, error: "template_id, name, category required" });
    }
    const row = await createTemplate(data);
    res.status(201).json({ ok: true, template: row });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ ok: false, error: "template_id already exists" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const row = await updateTemplate(req.params.id, req.body || {});
    if (!row) {
      return res
        .status(404)
        .json({ ok: false, error: "Not found or no changes" });
    }
    res.json({ ok: true, template: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteTemplate(req.params.id);
    if (!deleted)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
