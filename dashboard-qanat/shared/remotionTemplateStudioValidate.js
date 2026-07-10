/** Validação do Template Studio — original vs código final gerado. */

export const FORBIDDEN_FINAL_TERMS = [
  { pattern: /\bTODO\b/i, label: "TODO" },
  { pattern: /JSON\.stringify/i, label: "JSON.stringify" },
  { pattern: /<pre[\s>]/i, label: "<pre" },
  { pattern: /\bplaceholder\b/i, label: "placeholder" },
  { pattern: /substituir este bloco/i, label: "substituir este bloco" },
  { pattern: /CODIGO ORIGINAL/i, label: "CODIGO ORIGINAL" },
  { pattern: /BRIEFING:/i, label: "BRIEFING:" },
  {
    pattern: /c[oó]digo original do template/i,
    label: "código original do template",
  },
];

const COMMON_LAYOUT_DEFAULTS = [
  ["isVertical", "height > width"],
  ["padX", "isVertical ? 36 : 64"],
  ["padY", "isVertical ? 48 : 56"],
  ["chartTop", "isVertical ? 132 : 118"],
  [
    "titleFontSize",
    "isVertical ? Math.min(width * 0.13, 116) : Math.min(height * 0.16, 128)",
  ],
  [
    "subtitleFontSize",
    "isVertical ? Math.max(18, width * 0.038) : Math.max(18, height * 0.035)",
  ],
  [
    "labelFontSize",
    "isVertical ? Math.max(14, width * 0.03) : Math.max(13, height * 0.026)",
  ],
  [
    "chipFontSize",
    "isVertical ? Math.max(15, width * 0.034) : Math.max(15, height * 0.03)",
  ],
  [
    "bodyFontSize",
    "isVertical ? Math.max(16, width * 0.035) : Math.max(15, height * 0.03)",
  ],
  ["animDuration", "Math.round(fps * 2.8)"],
  ["maxValue", "100"],
];

function identifierDeclared(code, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `\\b(?:const|let|var|function|type|interface)\\s+${escaped}\\b|[,{]\\s*${escaped}\\s*(?:=|[,}])`
  ).test(code);
}

function identifierUsed(code, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(code);
}

/** Injeta consts de layout (padX, chartTop, etc.) quando o TSX usa mas nao declara. */
export function repairCommonTemplateLayoutVars(code) {
  const src = String(code || "");
  if (!src.trim()) return src;

  const missing = COMMON_LAYOUT_DEFAULTS.filter(
    ([name]) => identifierUsed(src, name) && !identifierDeclared(src, name)
  );
  if (!missing.length) return src;

  const hookMatch = src.match(
    /const\s*\{\s*width\s*,\s*height\s*(?:,\s*fps)?\s*\}\s*=\s*useVideoConfig\s*\(\s*\)\s*;/
  );
  if (!hookMatch?.index) return src;

  const insertAt = hookMatch.index + hookMatch[0].length;
  const declarations = missing
    .map(([name, expression]) => `\n  const ${name} = ${expression};`)
    .join("");

  return `${src.slice(0, insertAt)}${declarations}${src.slice(insertAt)}`;
}

const INCOMPLETE_ORIGINAL_MARKERS = [
  /c[oó]digo original do template/i,
  /^\/\/\s*(c[oó]digo|template|mock|exemplo)/im,
  /return\s*<\s*div[^>]*>\s*\.\.\./i,
  /return\s*<\s*div[^>]*>\s*\.{3}/i,
  /\{\s*\.\.\.\s*\}/,
  /\/\/\s*resto do codigo/i,
  /\/\/\s*\.\.\./,
];

export function extractTemplateTsxFromLlm(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const fenced = raw.match(/```(?:tsx|typescript|ts|jsx)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const useClientIdx = raw.indexOf('"use client"');
  if (useClientIdx >= 0) return raw.slice(useClientIdx).trim();
  const importIdx = raw.search(/^import\s/m);
  if (importIdx >= 0) return raw.slice(importIdx).trim();
  return raw;
}

export function validateOriginalTemplateCode(code) {
  const trimmed = String(code || "").trim();
  const errors = [];

  if (!trimmed) {
    errors.push(
      "Template Code incompleto. Cole o código original completo do template."
    );
    return { ok: false, errors };
  }

  if (trimmed.length < 120) {
    errors.push(
      "Template Code incompleto. Cole o código original completo do template."
    );
  }

  for (const marker of INCOMPLETE_ORIGINAL_MARKERS) {
    if (marker.test(trimmed)) {
      errors.push(
        "Template Code incompleto. Cole o código original completo do template."
      );
      break;
    }
  }

  const hasExport =
    /\bexport\s+default\s+function\b/.test(trimmed) ||
    /\bexport\s+default\s+function\s*\(/.test(trimmed) ||
    /\bexport\s+default\b/.test(trimmed) ||
    /\bexport\s+function\s+\w+/.test(trimmed);

  if (!hasExport) {
    errors.push("O código original precisa exportar um componente Remotion.");
  }

  const hasRemotion =
    /from\s+["']remotion["']/.test(trimmed) ||
    /\buseCurrentFrame\s*\(/.test(trimmed) ||
    /\buseVideoConfig\s*\(/.test(trimmed);

  if (!hasRemotion) {
    errors.push("O código original precisa usar imports ou hooks do Remotion.");
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function validateFinalTemplateCode(code) {
  const trimmed = String(code || "").trim();
  const errors = [];

  if (!trimmed) {
    errors.push(
      "Código final vazio. Gere o template com Assistir IA antes de salvar."
    );
    return { ok: false, errors };
  }

  for (const term of FORBIDDEN_FINAL_TERMS) {
    if (term.pattern.test(trimmed)) {
      errors.push(`Código inválido: contém termo proibido (${term.label}).`);
    }
  }

  if (!/from\s+["']remotion["']/.test(trimmed)) {
    errors.push("Código final precisa importar de remotion.");
  }

  if (!/\bexport\s+default\b/.test(trimmed)) {
    errors.push("Código final precisa ter export default.");
  }

  if (!/\bexport\s+const\s+exampleProps\b/.test(trimmed)) {
    errors.push("Código final precisa exportar exampleProps.");
  }

  if (
    !/\buseCurrentFrame\s*\(/.test(trimmed) &&
    !/\binterpolate\s*\(/.test(trimmed)
  ) {
    errors.push(
      "Código final precisa ter animação funcional (useCurrentFrame/interpolate)."
    );
  }

  if (!/\buseVideoConfig\s*\(/.test(trimmed)) {
    errors.push(
      "Código final precisa usar useVideoConfig para layout responsivo."
    );
  }

  if (!/<[A-Za-z]/.test(trimmed)) {
    errors.push("Código final precisa conter JSX visual finalizado.");
  }

  if (
    /\btype\s+\w+Props\s*=/.test(trimmed) ||
    /\binterface\s+\w+Props\b/.test(trimmed)
  ) {
    // ok
  } else {
    errors.push("Código final precisa declarar props tipadas.");
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
