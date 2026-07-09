import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { APPROVED_ORCHESTRATION_TEMPLATES } from "../shared/motionSceneCatalog.js";
import {
  isLegacySeedTemplateId,
  LEGACY_SEED_TEMPLATE_IDS,
} from "../shared/remotionTemplateLegacy.js";
import {
  DEFAULT_TEMPLATE_NICHES,
  mergeNicheLists,
  normalizeNicheLabel,
} from "../shared/remotionTemplateNiches.js";

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
    template.shortPreview,
    template.longPreview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/lower/.test(haystack)) return "lower-third";
  if (/timeline|cronolog|process|roadmap|steps/.test(haystack))
    return "timeline";
  if (/counter|contador|stat|circular|progress/.test(haystack))
    return "counter";
  if (/pie|donut|pictogram/.test(haystack)) return "pictogram-chart";
  if (/bar|bars|line|area|comparison|chart|grafico|grÃ¡fico/.test(haystack))
    return "bar-chart";
  if (/text|title|quote|chapter|glitch|typewriter|kinetic/.test(haystack))
    return "kinetic-text";

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

function normalizeSourceCode(raw = {}) {
  const src = raw.sourceCode;
  if (!src || typeof src !== "object") return null;
  const short = String(src.short || "").trim();
  const long = String(src.long || "").trim();
  if (!short && !long) return null;
  return { short, long };
}

function hasRunnableStudioSource(sourceCode = null) {
  const code = String(sourceCode?.short || sourceCode?.long || "").trim();
  if (!code) return false;
  return (
    /export\s+default\s+function/.test(code) &&
    /\buseCurrentFrame\s*\(/.test(code)
  );
}

function normalizeCatalogTemplate(raw = {}) {
  if (isLegacySeedTemplateId(raw.id)) return null;
  const motionTemplateId = mapStudioTemplateToMotionId(raw);
  const sourceCode = normalizeSourceCode(raw);
  const runnableSource = hasRunnableStudioSource(sourceCode);
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
      motionTemplateId &&
      APPROVED_ORCHESTRATION_TEMPLATES.has(motionTemplateId) &&
      runnableSource
    ),
    shortPreview: raw.shortPreview || null,
    longPreview: raw.longPreview || null,
    sourceCode,
    has_source_code: runnableSource,
  };
}

const TRIGGER_STUDIO_HINTS = {
  stat_number:
    /counter|contador|progress|circular|kpi|ring|stat|numero|número/i,
  comparison: /bar|comparison|compar|versus|chart|grafico|gráfico|line|area/i,
  timeline_date: /timeline|cronolog|process|roadmap|steps|etapa/i,
  historical_fact: /timeline|cronolog|histor|ano|date|process/i,
  location: /map|geo|location|satelite|satélite|flyover|pip/i,
  region_pin: /map|geo|pin|region|satelite|satélite/i,
  curiosity_punch: /counter|kinetic|text|title|impact/i,
};

function scoreStudioTemplateForTrigger(
  tpl,
  trigger,
  motionTemplateId,
  context = {}
) {
  let score = 0;
  const reasons = [];
  const haystack = [
    tpl.name,
    tpl.category,
    tpl.subcategory,
    tpl.description,
    tpl.shortPreview,
    tpl.longPreview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (tpl.motion_template_id === motionTemplateId) {
    score += 40;
    reasons.push("motion_template_id coincide com o trigger");
  } else {
    score -= 50;
  }

  const hint = TRIGGER_STUDIO_HINTS[trigger];
  if (hint?.test(haystack)) {
    score += 22;
    reasons.push(`subcategoria/nome encaixa no trigger ${trigger}`);
  }

  if (tpl.has_source_code) {
    score += 18;
    reasons.push("possui sourceCode para render dinamico");
  } else {
    score -= 8;
    reasons.push("sem sourceCode — render legado");
  }

  const preferred = new Set(
    (Array.isArray(context.preferredStudioIds)
      ? context.preferredStudioIds
      : []
    ).map((id) => String(id).trim())
  );
  if (!preferred.size || preferred.has(tpl.id)) {
    score += 10;
    reasons.push("aprovado no catalogo do nicho");
  }

  const previous = new Set(
    (Array.isArray(context.previousStudioIds)
      ? context.previousStudioIds
      : []
    ).map((id) => String(id).trim())
  );
  if (previous.has(tpl.id)) {
    score -= 20;
    reasons.push("penalizado para evitar repeticao visual");
  }

  return { score, reasons };
}

export function resolveStudioSourceCode(template = {}, aspectRatio = "16:9") {
  const src = template.sourceCode;
  if (!src) return "";
  const vertical = String(aspectRatio || "16:9") === "9:16";
  const primary = vertical ? src.short : src.long;
  const fallback = vertical ? src.long : src.short;
  return String(primary || fallback || "").trim();
}

export function pickStudioTemplateForTrigger({
  trigger = "",
  motionTemplateId = "",
  niche = "",
  aspectRatio = "16:9",
  preferredStudioIds = [],
  previousStudioIds = [],
} = {}) {
  const motionId = String(motionTemplateId || "").trim();
  if (!motionId) return null;

  const catalog = getCatalogForNiche(niche);
  const candidates = catalog.approved.filter(
    (tpl) =>
      tpl.orchestration_ready &&
      tpl.has_source_code &&
      tpl.motion_template_id === motionId &&
      tpl.status === "approved"
  );
  if (!candidates.length) return null;

  const scored = candidates
    .map((tpl) => ({
      tpl,
      ...scoreStudioTemplateForTrigger(tpl, trigger, motionId, {
        preferredStudioIds,
        previousStudioIds,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 0) return null;

  return {
    ...best.tpl,
    studio_pick_score: best.score,
    studio_pick_reasons: best.reasons,
    studio_source_code: resolveStudioSourceCode(best.tpl, aspectRatio),
    candidates: scored.slice(0, 4).map((entry) => ({
      id: entry.tpl.id,
      name: entry.tpl.name,
      score: entry.score,
      has_source_code: entry.tpl.has_source_code,
    })),
  };
}

export function attachStudioTemplateToScene(scene = {}, studioPick = null) {
  if (!scene || !studioPick?.id) return scene;
  const sourceCode = String(
    studioPick.studio_source_code ||
      resolveStudioSourceCode(studioPick, scene.props?.aspect_ratio)
  ).trim();
  if (!sourceCode) return scene;

  return {
    ...scene,
    template_id: studioPick.motion_template_id || scene.template_id,
    props: {
      ...(scene.props || {}),
      template_studio_id: studioPick.id,
      template_studio_name: studioPick.name,
      template_studio_category: studioPick.category,
      template_studio_subcategory: studioPick.subcategory,
      template_studio_motion_template_id: studioPick.motion_template_id,
      studio_source_code: sourceCode,
    },
    studio_template_decision: {
      score: studioPick.studio_pick_score,
      reasons: studioPick.studio_pick_reasons || [],
      candidates: studioPick.candidates || [],
    },
  };
}

function purgeLegacyTemplatesFromCatalog(catalog = {}) {
  if (!catalog.niches || typeof catalog.niches !== "object") return catalog;
  for (const nicheKey of Object.keys(catalog.niches)) {
    const entry = catalog.niches[nicheKey];
    if (!entry || !Array.isArray(entry.templates)) continue;
    entry.templates = entry.templates.filter(
      (tpl) => !isLegacySeedTemplateId(tpl?.id)
    );
  }
  return catalog;
}

export function purgeLegacySeedTemplatesFromCatalogFile() {
  const catalog = readCatalogFile();
  purgeLegacyTemplatesFromCatalog(catalog);
  writeCatalogFile(catalog);
  return {
    removed_ids: [...LEGACY_SEED_TEMPLATE_IDS],
    updated_at: new Date().toISOString(),
  };
}

export function loadRemotionTemplateCatalog() {
  return readCatalogFile();
}

export function listCatalogNiches() {
  const catalog = readCatalogFile();
  const fromFile = Object.keys(catalog.niches || {}).map((key) => {
    const entry = catalog.niches[key] || {};
    const templates = Array.isArray(entry.templates) ? entry.templates : [];
    const approved = templates.filter((tpl) => tpl?.status === "approved");
    return {
      niche: key,
      count: templates.length,
      approved_count: approved.length,
      updated_at: entry.updated_at || null,
    };
  });

  const merged = mergeNicheLists(
    DEFAULT_TEMPLATE_NICHES,
    fromFile.map((row) => row.niche)
  );

  const byKey = new Map(fromFile.map((row) => [row.niche.toLowerCase(), row]));
  return merged.map((niche) => {
    const existing = byKey.get(niche.toLowerCase());
    return (
      existing || {
        niche,
        count: 0,
        approved_count: 0,
        updated_at: null,
      }
    );
  });
}

export function createCatalogNiche(niche = "") {
  const key = normalizeNicheLabel(niche);
  if (!key) {
    return { ok: false, error: "Informe o nome do nicho." };
  }

  const catalog = readCatalogFile();
  if (!catalog.niches) catalog.niches = {};
  purgeLegacyTemplatesFromCatalog(catalog);

  const created = !catalog.niches[key];
  if (created) {
    catalog.niches[key] = {
      templates: [],
      updated_at: new Date().toISOString(),
    };
    catalog.updated_at = new Date().toISOString();
    writeCatalogFile(catalog);
  }

  const snapshot = getCatalogForNiche(key);
  return {
    ok: true,
    created,
    niche: key,
    count: snapshot.templates.length,
    approved_count: snapshot.approved.length,
    updated_at: snapshot.updated_at,
  };
}

export function getCatalogForNiche(niche = "") {
  const key = String(niche || "").trim() || "Geral";
  const catalog = readCatalogFile();
  const entry = catalog.niches?.[key] || { templates: [], updated_at: null };
  const templates = (Array.isArray(entry.templates) ? entry.templates : [])
    .map(normalizeCatalogTemplate)
    .filter((tpl) => tpl?.id);
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
    .filter((tpl) => tpl?.id);

  purgeLegacyTemplatesFromCatalog(catalog);

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
    has_source_code: Boolean(tpl.has_source_code),
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
