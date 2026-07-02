/** Repara UTF-8 lido como Latin-1 + U+FFFD em overlays (espelha backend/textEncoding.js). */

const REPLACEMENT_CHAR = "\uFFFD";

const PT_MOJIBAKE_LITERALS: [string, string][] = [
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

const PT_WORD_CORRUPTION_FIXES: [string, string][] = [
  ["PROPULSÒO", "PROPULSÃO"],
  ["PROPULSãO", "PROPULSÃO"],
  ["PROPULSÃƒO", "PROPULSÃO"],
  ["PROPULSÃ£O", "PROPULSÃO"],
  ["PropulsÒo", "Propulsão"],
];

function countMojibakeMarkers(s: string) {
  return (s.match(/Ã|Â/g) || []).length;
}

function applyPtMojibakeLiterals(text: string) {
  let out = text;
  for (const [bad, good] of PT_MOJIBAKE_LITERALS) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

function repairReplacementCharInPortuguese(text: string) {
  if (!text.includes(REPLACEMENT_CHAR)) return text;
  let out = text;
  out = out.replace(/([A-Z]{2,})S\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1SÃO");
  out = out.replace(/([A-Z]{2,})\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1ÃO");
  out = out.replace(/([a-z]{2,})s\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1são");
  out = out.replace(/([a-z]{2,})\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1ão");
  out = out.replace(/\uFFFD/g, "");
  return out;
}

export function repairMojibake(text: string): string {
  if (!text) return text;
  let out = text;

  for (let pass = 0; pass < 4; pass += 1) {
    if (!out.includes("Ã") && !out.includes("Â")) break;
    try {
      const bytes = new Uint8Array([...out].map((ch) => ch.charCodeAt(0) & 0xff));
      const repaired = new TextDecoder("utf-8").decode(bytes);
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

const OVERLAY_TEXT_KEYS = new Set([
  "title",
  "subtitle",
  "text",
  "label",
  "suffix",
  "description",
  "source",
  "location",
]);

export function repairOverlayPropsEncoding<T extends Record<string, unknown>>(props: T): T {
  if (!props || typeof props !== "object") return props;
  const out = { ...props } as T & Record<string, unknown>;

  for (const [key, val] of Object.entries(out)) {
    if (typeof val === "string" && OVERLAY_TEXT_KEYS.has(key)) {
      out[key] = repairMojibake(val);
    } else if (key === "events" && Array.isArray(val)) {
      out[key] = val.map((ev: Record<string, unknown>) => ({
        ...ev,
        year: typeof ev?.year === "string" ? repairMojibake(ev.year) : ev?.year,
        description: typeof ev?.description === "string" ? repairMojibake(ev.description) : ev?.description,
      }));
    } else if (key === "items" && Array.isArray(val)) {
      out[key] = val.map((it: Record<string, unknown>) => ({
        ...it,
        label: typeof it?.label === "string" ? repairMojibake(it.label) : it?.label,
        displayValue: typeof it?.displayValue === "string" ? repairMojibake(it.displayValue) : it?.displayValue,
      }));
    }
  }
  return out as T;
}