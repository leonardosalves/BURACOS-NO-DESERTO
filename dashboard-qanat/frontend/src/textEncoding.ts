/** Repara UTF-8 lido como Latin-1 + U+FFFD (espelha backend/textEncoding.js). */

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
  ["COMPARAO", "COMPARAÇÃO"],
  ["COMPARACAO", "COMPARAÇÃO"],
  ["Comparao", "Comparação"],
  ["Comparacao", "Comparação"],
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
  out = out.replace(/COMPAR\uFFFDA?\uFFFDO/gi, "COMPARAÇÃO");
  out = out.replace(/([A-Z]{2,})S\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1SÃO");
  out = out.replace(/([A-Z]{2,})\uFFFD([O])(?=\b|\s|[^A-Za-z])/g, "$1ÃO");
  out = out.replace(/([a-z]{2,})s\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1são");
  out = out.replace(/([a-z]{2,})\uFFFD([o])(?=\b|\s|[^a-z])/g, "$1ão");
  out = out.replace(/\uFFFD/g, "");
  return out;
}

export function repairMojibake(text: string): string {
  if (!text || (!text.includes("Ã") && !text.includes("Â") && !text.includes(REPLACEMENT_CHAR))) {
    return text;
  }
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

export function repairMojibakeDeep<T>(value: T): T {
  if (typeof value === "string") return repairMojibake(value) as T;
  if (Array.isArray(value)) return value.map(repairMojibakeDeep) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = repairMojibakeDeep(val);
    }
    return out as T;
  }
  return value;
}