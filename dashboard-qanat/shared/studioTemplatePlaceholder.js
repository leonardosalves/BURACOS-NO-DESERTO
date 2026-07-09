const TEMPLATE_PLACEHOLDER_TEXT_RE =
  /^(COMPARA[ÇC][AÃ]O|TESTE|DADO|IMPACTO|REVELA[ÇC][AÃ]O|CRONOLOGIA|T[IÍ]TULO|SUBT[IÍ]TULO|OVERVIEW|VIS[AÃ]O\s*GERAL(\s*DA\s*OPERA[ÇC][AÃ]O)?|RESUMO\s*T[EÉ]CNICO|CONTE[ÚU]DO\s*PRINCIPAL|ANO\s*DA\s*MISS[AÃ]O|MATERIAL\s*COMPOSI[ÇC][AÃ]O|PONTO\s*DE\s*REFER[EÊ]NCIA(\s*\/\s*PIP)?|JANELA\s*PIP(\s*T[EÉ]CNICA\s*ATIVA)?|PIP\s*LOCALIZA[ÇC][AÃ]O|PICTURE\s*IN\s*PICTURE(\s*DRAFT)?|SETOR\s*ESTRUTURAL(\s*[A-Z0-9-]+)?|MAPA\s*[·•]\s*ROTA(\s*[·•]\s*SETOR)?|LOCAL|LOREM|PLACEHOLDER|EXEMPLO|SAMPLE|HEADLINE|SUBHEAD|DESCRIPTOR)$/i;

const TEMPLATE_PLACEHOLDER_LOOSE_RE =
  /^(est\.?\s*\d{4}|lorem\s+ipsum|your\s+text|insert\s+here|t[ií]tulo\s+aqui|subt[ií]tulo\s+aqui)$/i;

export const TEMPLATE_STRUCTURAL_PROP_KEYS = new Set([
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "delayPerChar",
  "fontFamily",
  "fontWeight",
]);

/**
 * Detecta valores genericos de exampleProps que nao devem vazar no render.
 * @param {unknown} value
 * @param {string} [key]
 */
export function isTemplatePlaceholderValue(value, key = "") {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return true;
    if (TEMPLATE_PLACEHOLDER_TEXT_RE.test(t)) return true;
    if (TEMPLATE_PLACEHOLDER_LOOSE_RE.test(t)) return true;
    if (/^x{3,}$/i.test(t)) return true;
    return false;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return true;
    const slot = String(key || "").toLowerCase();
    if (
      (slot === "value" || slot === "count" || slot === "total") &&
      value === 0
    ) {
      return true;
    }
    return false;
  }
  if (Array.isArray(value)) {
    if (!value.length) return true;
    return value.every((item) => {
      if (item && typeof item === "object") {
        const label = String(
          item.label || item.title || item.name || ""
        ).trim();
        const text = String(item.text || item.headline || "").trim();
        return (
          (!label || isTemplatePlaceholderValue(label, "label")) &&
          (!text || isTemplatePlaceholderValue(text, "text"))
        );
      }
      return isTemplatePlaceholderValue(item, key);
    });
  }
  return false;
}
