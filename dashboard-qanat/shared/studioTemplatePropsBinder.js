/**
 * Preenche dataSlots do contrato Template Studio com dados da narração e pesquisa.
 */

import { resolvePlaceWithResearch } from "./motionResearchProps.js";

const YEAR_GLOBAL_RE = /\b(1\d{3}|20\d{2})\b/g;
const STAT_VALUE_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|mil\b|milh[oõ]es?|bilh[oõ]es?|anos?|vítimas?|vitimas?|mortos?|feridos?|ve[ií]culos?)?/gi;

const PLACEHOLDER_TEXT_RE =
  /^(COMPARA[ÇC][AÃ]O|TESTE|DADO|IMPACTO|REVELA[ÇC][AÃ]O|CRONOLOGIA|T[IÍ]TULO|SUBT[IÍ]TULO)$/i;

function blockContextForScene(scene = {}, researchContext = {}) {
  const ref = String(scene.scene_ref || "").trim();
  if (ref && researchContext.bySceneRef?.get(ref)) {
    return researchContext.bySceneRef.get(ref);
  }
  const block = Number(scene.block) || 1;
  return (
    researchContext.bySceneRef?.get(`block-${block}`) || {
      facts: researchContext.globalFacts || [],
      sources: researchContext.globalSources || [],
      narration: scene.narration_text || "",
    }
  );
}

function parseStatFromText(facts = [], narration = "") {
  const haystack = [...facts, narration].join("\n");
  const matches = [...haystack.matchAll(STAT_VALUE_RE)];
  if (!matches.length) return null;
  const m = matches[0];
  let value = Number(String(m[1]).replace(",", "."));
  const unit = String(m[2] || "").toLowerCase();
  let suffix = "";
  if (unit.includes("%") || unit.includes("cento")) suffix = "%";
  else if (unit.includes("mil")) {
    value = Math.round(value * 1000);
    suffix = "";
  }
  const label =
    facts[0]?.split(/[.!?]/)[0]?.slice(0, 48).trim() ||
    narration.split(/[.!?]/)[0]?.slice(0, 48).trim() ||
    "DADO TÉCNICO";
  return {
    value: Number.isFinite(value) ? Math.round(value) : 0,
    suffix,
    label: label.toUpperCase(),
  };
}

function extractYears(facts = [], narration = "") {
  const haystack = [...facts, narration].join(" ");
  return [...haystack.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
}

function extractImpactText(narration = "", stat = null) {
  const trimmed = String(narration || "").trim();
  if (!trimmed) return "";
  if (stat?.value) {
    const unit = stat.suffix || "";
    const formatted =
      stat.value >= 1000
        ? `${Math.round(stat.value / 1000)} MIL`
        : String(stat.value);
    return `${formatted}${unit}`.trim().toUpperCase();
  }
  const sentence = trimmed.split(/[.!?]/)[0]?.trim() || trimmed;
  return sentence.slice(0, 60).toUpperCase();
}

function extractSubtitle(facts = [], narration = "", stat = null) {
  if (facts[1]) return String(facts[1]).slice(0, 80);
  if (facts[0] && stat?.label) {
    const rest = String(facts[0]).replace(stat.label, "").trim();
    if (rest.length > 8) return rest.slice(0, 80);
  }
  const parts = String(narration || "")
    .split(/[.!?]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts[1].slice(0, 80);
  return parts[0]?.slice(0, 80) || "";
}

function buildNumericItems(
  facts = [],
  narration = "",
  accentColor = "#D4AF37"
) {
  const items = [];
  const haystack = [...facts, narration].join("\n");
  const matches = [...haystack.matchAll(STAT_VALUE_RE)];
  for (let i = 0; i < matches.length && items.length < 4; i += 1) {
    const m = matches[i];
    const value = Math.round(Number(String(m[1]).replace(",", ".")));
    if (!Number.isFinite(value)) continue;
    const context = haystack
      .slice(Math.max(0, (m.index || 0) - 30), (m.index || 0) + 20)
      .replace(/\d+/g, "")
      .trim();
    items.push({
      label: context.slice(0, 20).trim() || `Item ${items.length + 1}`,
      value,
      color: i % 2 === 0 ? accentColor : "#4f7cff",
    });
  }
  return items;
}

function resolveBrandColors(config = {}, existing = {}) {
  const accent = String(
    config.accent_color || existing.accentColor || "#D4AF37"
  ).trim();
  return {
    primaryColor: accent,
    secondaryColor: "#4f7cff",
    accentColor: accent,
    backgroundColor: "#050506",
    textColor: "#ffffff",
  };
}

function resolveProjectCode(config = {}, scene = {}) {
  const raw = String(
    config.project_name ||
      config.video_title ||
      config.creator_project_name ||
      scene.props?.projectCode ||
      config.niche ||
      "LUMIERA"
  ).trim();
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

function resolveStatusText(researchContext = {}, facts = []) {
  if (facts.length > 0 || researchContext.globalFacts?.length) {
    return "DADO VERIFICADO";
  }
  return "ANÁLISE";
}

function isPlaceholderValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") {
    const t = value.trim();
    return !t || PLACEHOLDER_TEXT_RE.test(t);
  }
  if (typeof value === "number") return !Number.isFinite(value) || value === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function slotWanted(dataSlots, ...keys) {
  const set = new Set(
    (Array.isArray(dataSlots) ? dataSlots : []).map((s) =>
      String(s || "").trim()
    )
  );
  return keys.some((k) => set.has(k));
}

function templateFromScene(scene = {}) {
  const props = scene.props || {};
  return {
    id: props.template_studio_id,
    name: props.template_studio_name,
    category: props.template_studio_category,
    subcategory: props.template_studio_subcategory,
    dataSlots: Array.isArray(props.template_studio_data_slots)
      ? props.template_studio_data_slots
      : [],
  };
}

/**
 * @returns {{ studio_props: object, studio_props_meta: object }}
 */
export function bindStudioTemplateProps({
  template = {},
  scene = {},
  researchContext = {},
  config = {},
} = {}) {
  const dataSlots = Array.isArray(template.dataSlots) ? template.dataSlots : [];
  const narration = String(scene.narration_text || "").trim();
  const trigger = String(scene.trigger || "").trim();
  const category = String(template.category || "").toLowerCase();
  const subcategory = String(template.subcategory || "").toLowerCase();
  const blockCtx = blockContextForScene(scene, researchContext);
  const facts = blockCtx.facts || [];
  const sources = blockCtx.sources || [];
  const sourceLabel =
    sources[0]?.title || sources[0]?.url?.replace(/^https?:\/\//, "") || "";
  const stat = parseStatFromText(facts, narration);
  const years = extractYears(facts, narration);
  const place = resolvePlaceWithResearch(narration, researchContext);
  const colors = resolveBrandColors(config, scene.props || {});
  const out = {};
  const filled = [];
  const slotSources = {};

  const setSlot = (key, value, source = "heuristic") => {
    if (value === undefined || value === null) return;
    if (isPlaceholderValue(value)) return;
    out[key] = value;
    filled.push(key);
    slotSources[key] = source;
  };

  if (slotWanted(dataSlots, "text", "headline", "title")) {
    const headline =
      category === "chart-data" && stat?.label
        ? stat.label
        : extractImpactText(narration, stat);
    const key = slotWanted(dataSlots, "headline")
      ? "headline"
      : slotWanted(dataSlots, "title")
        ? "title"
        : "text";
    setSlot(key, headline, stat ? "narration+stat" : "narration");
  }

  if (slotWanted(dataSlots, "subtitle", "descriptorText")) {
    const key = slotWanted(dataSlots, "descriptorText")
      ? "descriptorText"
      : "subtitle";
    setSlot(key, extractSubtitle(facts, narration, stat), "narration");
  }

  if (slotWanted(dataSlots, "value")) {
    if (stat?.value) setSlot("value", stat.value, "narration");
  }

  if (slotWanted(dataSlots, "label")) {
    if (stat?.label) setSlot("label", stat.label, "narration");
  }

  if (slotWanted(dataSlots, "suffix") && stat?.suffix) {
    setSlot("suffix", stat.suffix, "narration");
  }

  if (slotWanted(dataSlots, "items", "segments", "bars", "series")) {
    const items = buildNumericItems(facts, narration, colors.accentColor);
    if (items.length >= 2) {
      const key = slotWanted(dataSlots, "segments")
        ? "segments"
        : slotWanted(dataSlots, "bars")
          ? "bars"
          : slotWanted(dataSlots, "series")
            ? "series"
            : "items";
      setSlot(key, items, "research");
    }
  }

  if (slotWanted(dataSlots, "events", "steps", "milestones")) {
    if (years.length >= 2) {
      const key = slotWanted(dataSlots, "steps")
        ? "steps"
        : slotWanted(dataSlots, "milestones")
          ? "milestones"
          : "events";
      setSlot(
        key,
        years.slice(0, 4).map((year, index) => ({
          year,
          label:
            facts[index]?.slice(0, 40) ||
            (index === 0
              ? "Início"
              : index === years.length - 1
                ? "Atual"
                : "Marco"),
        })),
        "narration"
      );
    }
  }

  if (slotWanted(dataSlots, "location")) {
    if (place?.location) setSlot("location", place.location, "geo");
  }
  if (slotWanted(dataSlots, "region") && place?.region) {
    setSlot("region", place.region, "geo");
  }
  if (slotWanted(dataSlots, "country") && place?.country) {
    setSlot("country", place.country, "geo");
  }

  if (slotWanted(dataSlots, "projectCode")) {
    setSlot("projectCode", resolveProjectCode(config, scene), "config");
  }

  if (slotWanted(dataSlots, "statusText", "panelLabel")) {
    const key = slotWanted(dataSlots, "panelLabel")
      ? "panelLabel"
      : "statusText";
    setSlot(key, resolveStatusText(researchContext, facts), "research");
  }

  if (slotWanted(dataSlots, "source") && sourceLabel) {
    setSlot("source", String(sourceLabel).slice(0, 60), "research");
  }

  for (const colorKey of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "textColor",
  ]) {
    if (slotWanted(dataSlots, colorKey) && colors[colorKey]) {
      setSlot(colorKey, colors[colorKey], "brand");
    }
  }

  if (slotWanted(dataSlots, "delayPerChar")) {
    const delay = /popping|kinetic|typewriter|scale/i.test(subcategory) ? 3 : 5;
    setSlot("delayPerChar", delay, "template");
  }

  if (slotWanted(dataSlots, "durationSeconds", "durationInFrames")) {
    const dur = Number(scene.duration_seconds) || 4;
    if (slotWanted(dataSlots, "durationInFrames")) {
      setSlot("durationInFrames", Math.round(dur * 30), "scene");
    } else {
      setSlot("durationSeconds", dur, "scene");
    }
  }

  const coverage =
    dataSlots.length > 0
      ? filled.length / dataSlots.length
      : filled.length > 0
        ? 1
        : 0;

  return {
    studio_props: out,
    studio_props_meta: {
      template_id: String(template.id || ""),
      template_name: String(template.name || ""),
      category,
      subcategory,
      trigger,
      confidence: Math.min(1, Math.round(coverage * 100) / 100),
      filled_slots: filled,
      slot_sources: slotSources,
      data_slots_total: dataSlots.length,
    },
  };
}

/** Aplica binder a uma motion scene que já tem template Studio anexado. */
export function enrichStudioTemplateScene(
  scene = {},
  { template = null, researchContext = {}, config = {} } = {}
) {
  const tpl = template?.id ? template : templateFromScene(scene);
  if (!tpl?.id && !scene.props?.template_studio_id) return scene;

  const { studio_props, studio_props_meta } = bindStudioTemplateProps({
    template: tpl,
    scene,
    researchContext,
    config,
  });

  if (!Object.keys(studio_props).length) return scene;

  return {
    ...scene,
    props: {
      ...(scene.props || {}),
      ...studio_props,
      studio_props,
      studio_props_meta,
    },
  };
}
