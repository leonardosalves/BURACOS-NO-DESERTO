/** Nichos padrão do Template Studio (podem ser estendidos pelo usuário). */
export const DEFAULT_TEMPLATE_NICHES = [
  "Engenharia",
  "Historia",
  "Financas",
  "Tecnologia",
  "Misterio",
  "Natureza",
  "Geografia",
];

export function normalizeNicheLabel(raw = "") {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function mergeNicheLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const raw of Array.isArray(list) ? list : []) {
      const label = normalizeNicheLabel(raw);
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}
