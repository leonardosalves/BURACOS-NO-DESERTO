/**
 * Repara UTF-8 interpretado erroneamente como Latin-1 (ex.: tÃ¡ → tá).
 * Mesma família de build_video.py / repair_mojibake — estendido para overlays IA.
 */

const REPLACEMENT_CHAR = "\uFFFD";

/** Substituições diretas após reparo latin1 (ordem: sequências longas primeiro). */
const PT_MOJIBAKE_LITERALS = [
  ["ÃƒÂ£", "ã"],
  ["ÃƒÂµ", "õ"],
  ["ÃƒÂ¡", "á"],
  ["ÃƒÂ©", "é"],
  ["ÃƒÂ­", "í"],
  ["ÃƒÂ³", "ó"],
  ["ÃƒÂº", "ú"],
  ["ÃƒÂ§", "ç"],
  ["ÃƒÂ", "Ã"],
  ["Ãƒ", "Ã"],
  ["Ã£", "ã"],
  ["Ãµ", "õ"],
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã§", "ç"],
  ["Ã‰", "É"],
  ["Ãš", "Ú"],
  ["Âº", "º"],
  ["Âª", "ª"],
  ["Â°", "°"],
  ["Â·", "·"],
  ["Â«", "«"],
  ["Â»", "»"],
  ["Â", ""],
];

/** Palavras técnicas frequentes em overlays (após reparo parcial). */
const PT_WORD_CORRUPTION_FIXES = [
  ["PROPULSÒO", "PROPULSÃO"],
  ["PROPULSãO", "PROPULSÃO"],
  ["PROPULSÃƒO", "PROPULSÃO"],
  ["PROPULSÃ£O", "PROPULSÃO"],
  ["PropulsÒo", "Propulsão"],
];

const OVERLAY_TEXT_KEYS = new Set([
  "title",
  "subtitle",
  "text",
  "label",
  "suffix",
  "description",
  "source",
  "location",
  "name",
  "year",
  "displayValue",
]);

function countMojibakeMarkers(s) {
  return (String(s).match(/Ã|Â/g) || []).length;
}

function applyPtMojibakeLiterals(text) {
  let out = text;
  for (const [bad, good] of PT_MOJIBAKE_LITERALS) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

/** U+FFFD no meio de palavras PT (ex.: PROPULSO → PROPULSÃO). */
function repairReplacementCharInPortuguese(text) {
  if (!text || !text.includes(REPLACEMENT_CHAR)) return text;
  let out = text;
  out = out.replace(/([A-Z]{2,})S\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1SÃO");
  out = out.replace(/([A-Z]{2,})\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1ÃO");
  out = out.replace(/([a-z]{2,})s\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1são");
  out = out.replace(/([a-z]{2,})\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1ão");
  out = out.replace(/\uFFFD/g, "");
  return out;
}

export function repairMojibake(text) {
  if (typeof text !== "string" || !text) return text;
  let out = text;

  for (let pass = 0; pass < 4; pass += 1) {
    if (!out.includes("Ã") && !out.includes("Â")) break;
    try {
      const repaired = Buffer.from(out, "latin1").toString("utf8");
      if (countMojibakeMarkers(repaired) < countMojibakeMarkers(out)) {
        out = repaired;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  out = applyPtMojibakeLiterals(out);
  out = repairReplacementCharInPortuguese(out);
  for (const [bad, good] of PT_WORD_CORRUPTION_FIXES) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

export function repairMojibakeDeep(value) {
  if (typeof value === "string") return repairMojibake(value);
  if (Array.isArray(value)) return value.map(repairMojibakeDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = repairMojibakeDeep(val);
    }
    return out;
  }
  return value;
}

export function repairStoryboardEncoding(storyboard) {
  return repairMojibakeDeep(storyboard);
}

/** Repara strings de texto em props de um overlay (lower-third, counter, etc.). */
export function repairOverlayItemEncoding(overlay) {
  if (!overlay || typeof overlay !== "object") return overlay;
  const next = { ...overlay };
  if (next.props && typeof next.props === "object") {
    next.props = repairOverlayPropsEncoding(next.props);
  }
  for (const key of ["title", "text", "label", "subtitle"]) {
    if (typeof next[key] === "string") next[key] = repairMojibake(next[key]);
  }
  return next;
}

export function repairOverlayPropsEncoding(props) {
  if (!props || typeof props !== "object") return props;
  const out = { ...props };

  for (const [key, val] of Object.entries(out)) {
    if (typeof val === "string" && OVERLAY_TEXT_KEYS.has(key)) {
      out[key] = repairMojibake(val);
    } else if (key === "events" && Array.isArray(val)) {
      out.events = val.map((ev) => ({
        ...ev,
        year: typeof ev?.year === "string" ? repairMojibake(ev.year) : ev?.year,
        description: typeof ev?.description === "string" ? repairMojibake(ev.description) : ev?.description,
      }));
    } else if (key === "items" && Array.isArray(val)) {
      out.items = val.map((it) => ({
        ...it,
        label: typeof it?.label === "string" ? repairMojibake(it.label) : it?.label,
        displayValue: typeof it?.displayValue === "string" ? repairMojibake(it.displayValue) : it?.displayValue,
      }));
    }
  }
  return out;
}

export function repairOverlaysEncoding(overlays = []) {
  if (!Array.isArray(overlays)) return [];
  return overlays.map(repairOverlayItemEncoding);
}

/** Detecta texto corrompido (mojibake ou caractere de substituição Unicode). */
export function hasMojibakeDeep(value) {
  if (typeof value === "string") {
    return value.includes("Ã") || value.includes("Â") || value.includes(REPLACEMENT_CHAR);
  }
  if (Array.isArray(value)) return value.some(hasMojibakeDeep);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMojibakeDeep);
  }
  return false;
}