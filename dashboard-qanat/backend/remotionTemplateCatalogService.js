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

function pickCanonicalNicheLabel(current = "", candidate = "") {
  const cur = String(current || "").trim();
  const next = String(candidate || "").trim();
  if (!cur) return next;
  if (!next) return cur;
  const curUpper = cur === cur.toUpperCase();
  const nextUpper = next === next.toUpperCase();
  if (curUpper && !nextUpper) return next;
  if (nextUpper && !curUpper) return cur;
  return cur.length <= next.length ? cur : next;
}

function canonicalizeCatalogNiches(catalog = {}) {
  if (!catalog.niches || typeof catalog.niches !== "object") {
    catalog.niches = {};
    return catalog;
  }
  const buckets = new Map();
  for (const [key, entry] of Object.entries(catalog.niches)) {
    const lower = String(key || "")
      .trim()
      .toLowerCase();
    if (!lower) continue;
    const label = normalizeNicheLabel(key) || key;
    const bucket = buckets.get(lower) || {
      niche: label,
      templates: [],
      updated_at: entry?.updated_at || null,
    };
    bucket.niche = pickCanonicalNicheLabel(bucket.niche, label);
    const templates = Array.isArray(entry?.templates) ? entry.templates : [];
    const seen = new Set(bucket.templates.map((tpl) => String(tpl?.id || "")));
    for (const tpl of templates) {
      const id = String(tpl?.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      bucket.templates.push(tpl);
    }
    if (entry?.updated_at) bucket.updated_at = entry.updated_at;
    buckets.set(lower, bucket);
  }
  catalog.niches = Object.fromEntries(
    [...buckets.values()].map((bucket) => [
      bucket.niche,
      { templates: bucket.templates, updated_at: bucket.updated_at },
    ])
  );
  return catalog;
}

function readCatalogFile() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      return canonicalizeCatalogNiches(
        JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) || {}
      );
    }
  } catch {
    /* ignore */
  }
  return { niches: {}, updated_at: null };
}

function writeCatalogFile(data) {
  const dir = path.dirname(CATALOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  canonicalizeCatalogNiches(data);
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

export function hasRunnableStudioSource(sourceCode = null) {
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

/** Remove nichos de teste que poluem o catalogo de producao. */
export function purgeTestNichesFromCatalogFile() {
  const catalog = readCatalogFile();
  if (!catalog.niches) return { removed: 0, niches: [] };
  const removed = [];
  for (const key of Object.keys(catalog.niches)) {
    if (/^__/.test(key)) {
      delete catalog.niches[key];
      removed.push(key);
    }
  }
  if (removed.length) {
    catalog.updated_at = new Date().toISOString();
    writeCatalogFile(catalog);
  }
  return { removed: removed.length, niches: removed };
}

/** Remove do JSON entradas sem TSX Remotion executavel (sync antigo so com metadados). */
export function pruneCatalogEntriesWithoutSource() {
  const catalog = readCatalogFile();
  if (!catalog.niches) return { removed: 0, niches: [] };

  let removed = 0;
  const niches = [];
  for (const nicheKey of Object.keys(catalog.niches)) {
    const entry = catalog.niches[nicheKey];
    if (!Array.isArray(entry?.templates)) continue;
    const before = entry.templates.length;
    entry.templates = entry.templates.filter((raw) => {
      if (isLegacySeedTemplateId(raw?.id)) return false;
      return hasRunnableStudioSource(normalizeSourceCode(raw));
    });
    const delta = before - entry.templates.length;
    if (delta > 0) {
      removed += delta;
      niches.push({ niche: nicheKey, removed: delta });
      entry.updated_at = new Date().toISOString();
    }
  }
  if (removed > 0) {
    catalog.updated_at = new Date().toISOString();
    writeCatalogFile(catalog);
  }
  return { removed, niches };
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

function resolveCatalogNicheKey(catalog = {}, niche = "") {
  const normalized = normalizeNicheLabel(niche) || "Geral";
  const niches = catalog.niches || {};
  const lower = normalized.toLowerCase();
  const existing = Object.keys(niches).find((k) => k.toLowerCase() === lower);
  return existing || normalized;
}

export function createCatalogNiche(niche = "") {
  const key = normalizeNicheLabel(niche);
  if (!key) {
    return { ok: false, error: "Informe o nome do nicho." };
  }

  const catalog = readCatalogFile();
  if (!catalog.niches) catalog.niches = {};
  purgeLegacyTemplatesFromCatalog(catalog);

  const existingKey = resolveCatalogNicheKey(catalog, key);
  const created = !catalog.niches[existingKey];
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
  const catalog = readCatalogFile();
  const key = resolveCatalogNicheKey(catalog, niche);
  const entry = catalog.niches?.[key] || { templates: [], updated_at: null };
  const templates = (Array.isArray(entry.templates) ? entry.templates : [])
    .map(normalizeCatalogTemplate)
    .filter((tpl) => tpl?.id);
  return {
    niche: normalizeNicheLabel(niche) || key,
    templates,
    approved: templates.filter((tpl) => tpl.status === "approved"),
    orchestration_ready: templates.filter((tpl) => tpl.orchestration_ready),
    studio_ready: templates.filter(
      (tpl) => tpl.orchestration_ready && tpl.has_source_code
    ),
    updated_at: entry.updated_at || null,
  };
}

export function syncCatalogForNiche(niche = "", templates = []) {
  const key = normalizeNicheLabel(niche) || "Geral";
  const catalog = readCatalogFile();
  if (!catalog.niches) catalog.niches = {};

  const normalized = (Array.isArray(templates) ? templates : [])
    .map(normalizeCatalogTemplate)
    .filter((tpl) => tpl?.id);

  purgeLegacyTemplatesFromCatalog(catalog);

  const legacyKey = resolveCatalogNicheKey(catalog, key);
  if (legacyKey !== key && catalog.niches[legacyKey]) {
    delete catalog.niches[legacyKey];
  }

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
