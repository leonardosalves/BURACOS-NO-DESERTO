import type React from "react";

/** Gemini às vezes retorna customStyle como array — React não aceita array em style={}. */
export function safeCustomStyle(value: unknown): Record<string, string | number> | undefined {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    const merged: Record<string, string | number> = {};
    for (const entry of value) {
      Object.assign(merged, safeCustomStyle(entry) || {});
    }
    return Object.keys(merged).length ? merged : undefined;
  }

  if (typeof value !== "object") return undefined;

  const out: Record<string, string | number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d+$/.test(key)) continue;
    if (raw == null) continue;
    if (typeof raw === "object") continue;
    if (typeof raw === "number" || typeof raw === "string") {
      out[key] = raw;
    }
  }

  return Object.keys(out).length ? out : undefined;
}

export function mergeCustomStyle(
  base: React.CSSProperties,
  customStyle: unknown,
): React.CSSProperties {
  const safe = safeCustomStyle(customStyle);
  return safe ? { ...base, ...safe } : base;
}

