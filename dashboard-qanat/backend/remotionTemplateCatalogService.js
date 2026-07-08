import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { APPROVED_ORCHESTRATION_TEMPLATES } from "../shared/motionSceneCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(
  __dirname,
  "data",
  "remotion-template-catalog.json"
);

function readCatalogFile() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) || {};
    }
  } catch {
    /* ignore */
  }
  return { niches: {}, updated_at: null };
}

function writeCatalogFile(data) {
  const dir = path.dirname(CATALOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function mapStudioTemplateToMotionId(template = {}) {
  const haystack = [
    template.name,
    template.category,
    template.subcategory,
    ...(Array.isArray(template.dataSlots) ? template.dataSlots : []),
    template.shortPreview,
    template.longPreview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/mapa|geo|location|satelite|satélite/.test(haystack))
    return "location-intro";
  if (/area|line|bar|chart|grafico|gráfico|pictogram/.test(haystack))
    return "bar-chart";
  if (/counter|numero|número|progress|ring|circular/.test(haystack))
    return "counter";
  if (/timeline|cronolog|process/.test(haystack)) return "timeline";
  if (/lower|terco|terço|third/.test(haystack)) return "lower-third";
  return null;
}

function normalizeCatalogTemplate(raw = {}) {
  const motionTemplateId = mapStudioTemplateToMotionId(raw);
  return {
    id: String(raw.id || "").trim(),
    name: String(raw.name || "").trim(),
    category: String(raw.category || "").trim(),
    subcategory: String(raw.subcategory || "").trim(),
    niche: String(raw.niche || "").trim(),
    status: raw.status === "approved" ? "approved" : "draft",
    description: String(raw.description || "").trim(),
    dataSlots: Array.isArray(raw.dataSlots) ? raw.dataSlots : [],
    motion_template_id: motionTemplateId,
    orchestration_ready: Boolean(
      motionTemplateId && APPROVED_ORCHESTRATION_TEMPLATES.has(motionTemplateId)
    ),
    shortPreview: raw.shortPreview || null,
    longPreview: raw.longPreview || null,
  };
}

export function loadRemotionTemplateCatalog() {
  return readCatalogFile();
}

export function getCatalogForNiche(niche = "") {
  const key = String(niche || "").trim() || "Geral";
  const catalog = readCatalogFile();
  const entry = catalog.niches?.[key] || { templates: [], updated_at: null };
  const templates = (Array.isArray(entry.templates) ? entry.templates : [])
    .map(normalizeCatalogTemplate)
    .filter((tpl) => tpl.id);
  return {
    niche: key,
    templates,
    approved: templates.filter((tpl) => tpl.status === "approved"),
    orchestration_ready: templates.filter((tpl) => tpl.orchestration_ready),
    updated_at: entry.updated_at || null,
  };
}

export function syncCatalogForNiche(niche = "", templates = []) {
  const key = String(niche || "").trim() || "Geral";
  const catalog = readCatalogFile();
  if (!catalog.niches) catalog.niches = {};

  const normalized = (Array.isArray(templates) ? templates : [])
    .map(normalizeCatalogTemplate)
    .filter((tpl) => tpl.id);

  catalog.niches[key] = {
    templates: normalized,
    updated_at: new Date().toISOString(),
  };
  catalog.updated_at = new Date().toISOString();
  writeCatalogFile(catalog);

  return {
    niche: key,
    count: normalized.length,
    approved_count: normalized.filter((tpl) => tpl.status === "approved")
      .length,
    orchestration_ready_count: normalized.filter(
      (tpl) => tpl.orchestration_ready
    ).length,
    updated_at: catalog.niches[key].updated_at,
  };
}

export function summarizeCatalogForLlm(niche = "") {
  const catalog = getCatalogForNiche(niche);
  const templates = catalog.approved.length
    ? catalog.approved
    : catalog.templates.filter((tpl) => tpl.status === "approved");
  return templates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    category: tpl.category,
    subcategory: tpl.subcategory,
    description: String(tpl.description || "").slice(0, 200),
    motion_template_id: tpl.motion_template_id,
    dataSlots: tpl.dataSlots,
  }));
}

export function resolveMotionTemplateIdsFromPack(pack = {}, niche = "") {
  if (!pack?.enabled) return [];
  const catalog = getCatalogForNiche(pack.niche || niche);
  const selectedIds = new Set(
    (Array.isArray(pack.template_ids) ? pack.template_ids : []).map((id) =>
      String(id).trim()
    )
  );
  if (!selectedIds.size) {
    return catalog.orchestration_ready
      .map((tpl) => tpl.motion_template_id)
      .filter(Boolean);
  }
  return [
    ...new Set(
      catalog.templates
        .filter((tpl) => selectedIds.has(tpl.id))
        .map((tpl) => tpl.motion_template_id)
        .filter(
          (motionId) =>
            motionId && APPROVED_ORCHESTRATION_TEMPLATES.has(motionId)
        )
    ),
  ];
}
