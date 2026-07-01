/** Repara UTF-8 lido como Latin-1 (ex.: tÃ¡ → tá, AntÃ¡rtida → Antártida). */
export function repairMojibake(text: string): string {
  if (!text || (!text.includes("Ã") && !text.includes("Â"))) {
    return text;
  }
  try {
    const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8").decode(bytes);
    const count = (s: string) => (s.match(/Ã|Â/g) || []).length;
    if (count(repaired) < count(text)) {
      return repaired;
    }
  } catch {
    /* keep original */
  }
  return text;
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