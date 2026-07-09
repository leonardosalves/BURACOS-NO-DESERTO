/**
 * Preenche props de motion scenes com fatos de research_sources.
 */

import { enrichStudioTemplateScene } from "./studioTemplatePropsBinder.js";

const YEAR_GLOBAL_RE = /\b(1\d{3}|20\d{2})\b/g;
const STAT_VALUE_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|mil\b|milh[oõ]es?|bilh[oõ]es?|anos?|vítimas?|vitimas?|mortos?|feridos?)?/gi;

function parseStatFromFacts(facts = [], narration = "") {
  const haystack = [...facts, narration].join("\n");
  const matches = [...haystack.matchAll(STAT_VALUE_RE)];
  if (!matches.length) return null;
  const m = matches[0];
  let value = Number(String(m[1]).replace(",", "."));
  const unit = String(m[2] || "").toLowerCase();
  let suffix = "";
  if (unit.includes("%") || unit.includes("cento")) suffix = "%";
  const label =
    facts[0]?.split(/[.!?]/)[0]?.slice(0, 48).trim() ||
    narration.slice(0, 48).trim() ||
    "DADO TÉCNICO";
  return {
    value: Number.isFinite(value) ? Math.round(value) : 0,
    suffix,
    label: label.toUpperCase(),
  };
}

function extractYearsFromFacts(facts = [], narration = "") {
  const haystack = [...facts, narration].join(" ");
  return [...haystack.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
}

function extractLocationFromContext(text = "", researchContext = {}) {
  const combined = [
    researchContext.videoTopic || "",
    text,
    ...(researchContext.globalFacts || []).slice(0, 4),
  ].join(" ");

  const palace = combined.match(/pal[áa]cio\s*(ii|2|dois)/i);
  if (palace) {
    return {
      location: "Palácio II",
      region: "São Paulo",
      country: "Brasil",
    };
  }

  const building = combined.match(
    /\b(edif[ií]cio|pr[eé]dio|torre)\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][\wáàâãéèêíìîóòôõúùûç\s-]{2,40})/i
  );
  if (building?.[2]) {
    return {
      location: building[2].trim(),
      region: "São Paulo",
      country: "Brasil",
    };
  }

  const emMatch = text.match(
    /\b(?:em|na|no)\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,3})\b/
  );
  if (emMatch?.[1] && emMatch[1].length > 3) {
    return { location: emMatch[1], region: "", country: "Brasil" };
  }

  return null;
}

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

export function resolvePlaceWithResearch(text = "", researchContext = {}) {
  const fromResearch = extractLocationFromContext(text, researchContext);
  if (fromResearch) return fromResearch;

  if (researchContext.hasExplicitSources) {
    const topic = String(researchContext.videoTopic || "");
    if (topic.length > 4) {
      return { location: topic.slice(0, 48), region: "", country: "Brasil" };
    }
  }

  return null;
}

export function enrichMotionSceneProps(scene = {}, researchContext = {}) {
  const templateId = String(scene.template_id || "");
  const narration = String(scene.narration_text || "").trim();
  const blockCtx = blockContextForScene(scene, researchContext);
  const facts = blockCtx.facts || [];
  const sources = blockCtx.sources || [];
  const props = { ...(scene.props || {}) };
  const sourceLabel =
    sources[0]?.title || sources[0]?.url?.replace(/^https?:\/\//, "") || "";

  if (templateId === "counter") {
    const stat = parseStatFromFacts(facts, narration);
    if (stat?.value) {
      const placeholderValue =
        !Number.isFinite(Number(props.value)) ||
        Number(props.value) === 0 ||
        Number(props.value) === 100;
      const placeholderLabel =
        !props.label ||
        /^(DADO|IMPACTO|DADO T[EÉ]CNICO|COMPARAÇÃO)$/i.test(
          String(props.label)
        );
      if (placeholderValue) props.value = stat.value;
      if (placeholderLabel) props.label = stat.label;
      if (!props.suffix && stat.suffix) props.suffix = stat.suffix;
    }
    if (facts[0]) props.subtitle = facts[0].slice(0, 80);
    if (sourceLabel) props.source = sourceLabel.slice(0, 60);
  }

  if (templateId === "bar-chart" || templateId === "pictogram-chart") {
    const numericFacts = facts
      .map((fact, index) => {
        const match = fact.match(/(\d{1,4}(?:[.,]\d+)?)/);
        if (!match) return null;
        return {
          label:
            fact
              .split(/[:\-–]/)[0]
              ?.slice(0, 24)
              .trim() || `Item ${index + 1}`,
          value: Math.round(Number(String(match[1]).replace(",", "."))),
          color: index % 2 === 0 ? props.accentColor || "#22d3ee" : "#4f7cff",
        };
      })
      .filter(Boolean)
      .slice(0, 4);
    if (numericFacts.length >= 2) {
      props.title = props.title || "DADOS TÉCNICOS";
      if (templateId === "bar-chart") props.items = numericFacts;
      else props.segments = numericFacts;
      props.source = sourceLabel || props.source;
    }
  }

  if (templateId === "timeline") {
    const years = extractYearsFromFacts(facts, narration);
    if (years.length >= 2) {
      props.events = years.slice(0, 4).map((year, index) => ({
        year,
        label:
          facts[index]?.slice(0, 40) ||
          (index === 0
            ? "Início"
            : index === years.length - 1
              ? "Colapso"
              : "Marco"),
      }));
      props.title = props.title || "CRONOLOGIA";
    }
  }

  if (templateId === "lower-third") {
    const fact = facts[0] || narration.slice(0, 120);
    const year = extractYearsFromFacts(facts, narration)[0] || "";
    props.title = year ? `Em ${year}` : props.title || "FATO TÉCNICO";
    props.subtitle = fact.slice(0, 100);
    if (sourceLabel) props.source = sourceLabel.slice(0, 60);
  }

  if (templateId === "location-intro" || templateId === "geo-map") {
    const place = resolvePlaceWithResearch(narration, researchContext);
    if (place) {
      props.location = place.location;
      props.region = place.region || props.region;
      props.country = place.country || props.country;
      props.place_type = "poi";
    }
    if (facts[0]) props.subtitle = facts[0].slice(0, 80);
  }

  props.research_backed = facts.length > 0 || sources.length > 0;

  if (props.template_studio_id) {
    return enrichStudioTemplateScene({ ...scene, props }, { researchContext });
  }

  return { ...scene, props };
}

export function enrichMotionScenesWithResearch(
  motionScenes = [],
  researchContext = {}
) {
  return (Array.isArray(motionScenes) ? motionScenes : []).map((scene) =>
    enrichMotionSceneProps(scene, researchContext)
  );
}
