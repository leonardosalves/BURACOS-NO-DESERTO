/**
 * Textos e duração para cenas PIP geo (local no ponto de referência, assunto da cena).
 */

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

/** Rótulo do ponto de referência — país ou local do vídeo geo. */
export function resolveGeoPipReferenceLabel(props = {}) {
  const country = String(props.country || "").trim();
  const location = String(props.location || "").trim();
  const region = String(props.region || "").trim();
  const ref = String(props.referencePoint || "").trim();
  if (country) return country;
  if (location) return location;
  if (region) return region;
  return ref;
}

/** Texto do setor/assunto abaixo do PIP — tema do trecho narrado. */
export function resolveGeoPipSectorLabel(props = {}, narration = "") {
  const fromProps = String(
    props.sectorLabel ||
      props.structuralSector ||
      props.panelLabel ||
      props.statusText ||
      props.descriptorText ||
      props.scene_subject ||
      ""
  ).trim();
  if (fromProps && !isGenericSectorPlaceholder(fromProps)) return fromProps;

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
  const slots = Array.isArray(dataSlots)
    ? dataSlots.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const slotSet = new Set(slots);
  const hasSlots = slotSet.size > 0;

  const reference = resolveGeoPipReferenceLabel(props);
  const sector = resolveGeoPipSectorLabel(props, narration);
  const studio = { ...(props.studio_props || {}) };
  const filled = [];

  const assign = (key, value) => {
    if (!key || value === undefined || value === null) return;
    const clean = String(value).trim();
    if (!clean) return;
    studio[key] = clean;
    if (!filled.includes(key)) filled.push(key);
  };

  const wants = (keys) =>
    !hasSlots || keys.some((k) => slotSet.has(k) || [...slotSet].some((s) => s.toLowerCase() === k.toLowerCase()));

  if (reference && wants([...PIP_REFERENCE_SLOT_KEYS])) {
    for (const key of slots.length ? slots : [...PIP_REFERENCE_SLOT_KEYS]) {
      if (
        PIP_REFERENCE_SLOT_KEYS.has(key) ||
        String(key).toLowerCase().includes("referen") ||
        PIP_REFERENCE_SLOT_KEYS.has(key.replace(/_/g, ""))
      ) {
        assign(key, reference);
      }
    }
    if (!hasSlots) {
      assign("referencePoint", reference);
      assign("pipTitle", reference);
    }
  }

  if (sector && wants([...PIP_SECTOR_SLOT_KEYS])) {
    for (const key of slots.length ? slots : [...PIP_SECTOR_SLOT_KEYS]) {
      const lower = String(key).toLowerCase();
      if (
        PIP_SECTOR_SLOT_KEYS.has(key) ||
        lower.includes("sector") ||
        lower.includes("setor") ||
        lower === "subtitle" ||
        lower === "descriptortext" ||
        lower === "panellabel" ||
        lower === "statustext"
      ) {
        assign(key, sector);
      }
    }
    if (!hasSlots) {
      assign("subtitle", sector);
      assign("sectorLabel", sector);
      assign("panelLabel", sector);
    }
  }

  assign("referencePoint", reference);
  assign("scene_subject", sector);
  assign("location", String(props.location || reference || "").trim());

  const dur = Number(flyoverDurationSec);
  if (Number.isFinite(dur) && dur > 0) {
    studio.durationSeconds = dur;
    studio.durationInFrames = Math.max(1, Math.round(dur * 30));
    filled.push("durationSeconds", "durationInFrames");
  }

  return {
    studio_props: studio,
    referencePoint: reference,
    scene_subject: sector,
    filled_slots: filled,
  };
}