/**
 * Textos e duração para cenas PIP geo (local no ponto de referência, assunto da cena).
 */

import { bindGeoPipTemplateStudioProps } from "./geoPipTemplateProps.js";

const SCENE_SUBJECT_STOPWORDS = new Set([
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "e",
  "que",
  "se",
  "por",
  "para",
  "com",
  "ao",
  "aos",
  "à",
  "às",
]);

/** Assunto da cena a partir da narração — não é legenda palavra-a-palavra. */
export function extractSceneSubject(narration = "", maxLen = 72) {
  const raw = String(narration || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";

  const sentences = raw
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const pick = sentences[0] || raw;

  const cleaned = pick
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLen) return cleaned;

  const words = cleaned.split(" ").filter(Boolean);
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > maxLen) break;
    out = next;
  }
  return out || cleaned.slice(0, maxLen).trim();
}

function isGenericLocationPlaceholder(value = "") {
  const t = String(value || "")
    .trim()
    .toUpperCase();
  if (!t) return true;
  return (
    t === "LOCAL" ||
    t === "PIP LOCALIZAÇÃO" ||
    /^MAPA\s*[·•]/.test(t) ||
    /^(LOREM|PLACEHOLDER|EXEMPLO|SAMPLE)$/.test(t)
  );
}

/** Local real da cena geo (IA/orquestração) — ordem: referência → local → país → região. */
export function resolveGeoPipReferenceLabel(props = {}) {
  const studio = props.studio_props || {};
  const candidates = [
    props.referencePoint,
    studio.referencePoint,
    props.location,
    studio.location,
    props.country,
    studio.country,
    props.region,
    studio.region,
  ];
  for (const raw of candidates) {
    const v = String(raw || "").trim();
    if (v && !isGenericLocationPlaceholder(v)) return v;
  }
  return "";
}

/** Texto do setor/assunto abaixo do PIP — IA ou trecho narrado (não legenda). */
export function resolveGeoPipSectorLabel(props = {}, narration = "") {
  const studio = props.studio_props || {};
  const fromProps = [
    props.scene_subject,
    studio.scene_subject,
    props.sectorLabel,
    studio.sectorLabel,
    props.structuralSector,
    studio.structuralSector,
    props.panelLabel,
    studio.panelLabel,
    props.subtitle,
    studio.subtitle,
  ]
    .map((v) => String(v || "").trim())
    .find((v) => v && !isGenericSectorPlaceholder(v));
  if (fromProps) return fromProps;

  const narr = String(narration || props.narration_text || "").trim();
  const subject = extractSceneSubject(narr);
  if (subject) return subject;

  const region = String(props.region || "").trim();
  const country = String(props.country || "").trim();
  return [region, country].filter(Boolean).join(" · ") || "";
}

function isGenericSectorPlaceholder(value = "") {
  const t = String(value || "")
    .trim()
    .toUpperCase();
  if (!t) return true;
  return (
    /SETOR\s*ESTRUTURAL/.test(t) ||
    /VIS[AÃ]O\s*GERAL/.test(t) ||
    /CONTE[ÚU]DO\s*PRINCIPAL/.test(t) ||
    /^MAPA\s*[·•]/.test(t) ||
    t === "PIP LOCALIZAÇÃO"
  );
}

const PIP_SECTOR_SLOT_KEYS = new Set([
  "sectorLabel",
  "structuralSector",
  "structural_sector",
  "panelLabel",
  "statusText",
  "descriptorText",
  "subtitle",
  "subheadline",
  "scene_subject",
  "sceneSubject",
]);

const PIP_REFERENCE_SLOT_KEYS = new Set([
  "referencePoint",
  "reference_point",
  "pontoReferencia",
  "ponto_referencia",
  "referenceLabel",
  "reference_label",
  "pipReference",
  "pip_reference",
  "pipTitle",
  "pip_title",
]);

/**
 * Preenche studio_props para overlay PIP geo (local + assunto + duração opcional).
 */
export function buildGeoPipOverlayStudioProps(
  props = {},
  { narration = "", dataSlots = [], flyoverDurationSec = 0 } = {}
) {
  const bound = bindGeoPipTemplateStudioProps(props, {
    narration,
    dataSlots,
    flyoverUrl: String(props.flyover_video || props.pipMediaUrl || "").trim(),
    flyoverDurationSec,
  });

  return {
    studio_props: bound.studio_props,
    referencePoint: bound.pipTitle,
    scene_subject: bound.location,
    pipTitle: bound.pipTitle,
    pipMediaUrl: bound.pipMediaUrl,
    filled_slots: bound.filled_slots,
  };
}
