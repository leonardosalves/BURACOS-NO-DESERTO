/**
 * Repara UTF-8 interpretado erroneamente como Latin-1 (ex.: tÃ¡ → tá).
 * Mesma lógica de build_video.py / repair_mojibake.
 */
export function repairMojibake(text) {
  if (typeof text !== "string" || (!text.includes("Ã") && !text.includes("Â"))) {
    return text;
  }
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    const countMojibake = (s) => (s.match(/Ã|Â/g) || []).length;
    if (countMojibake(repaired) < countMojibake(text)) {
      return repaired;
    }
  } catch (_) {
    /* keep original */
  }
  return text;
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

/** Detecta se o objeto ainda contém sequências típicas de mojibake. */
export function hasMojibakeDeep(value) {
  if (typeof value === "string") {
    return value.includes("Ã") || value.includes("Â");
  }
  if (Array.isArray(value)) return value.some(hasMojibakeDeep);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMojibakeDeep);
  }
  return false;
}