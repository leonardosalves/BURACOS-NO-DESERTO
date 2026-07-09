/**
 * Repara TSX salvo corrompido (UTF-8 / bullets viraram aspas quebradas).
 * Ex.: pipSubtitle = "MAPA " ROTA " SETOR" → "MAPA • ROTA • SETOR"
 */

const SPLIT_LITERAL_RE = /(=\s*)"([^"]*)"\s+([A-Z][A-Z0-9'° ]*)\s+"([^"]*)"/g;

const SINGLE_SPLIT_RE = /(=\s*)"([^"]*)"\s+([^",\n]+)",/g;

const MOJIBAKE_DEFAULTS = [
  [/mainTitle = "CONTEDO PRINCIPAL"/g, 'mainTitle = "CONTEÚDO PRINCIPAL"'],
  [/pipTag = "PONTO DE REFERNCIA"/g, 'pipTag = "PONTO DE REFERÊNCIA"'],
  [/distanceText = "DISTNCIA/g, 'distanceText = "DISTÂNCIA'],
  [
    /descriptorText = "JANELA PIP TCNICA/g,
    'descriptorText = "JANELA PIP TÉCNICA',
  ],
  [
    /coordinateText = "(\d{2})(\d{2})' S • (\d{2})(\d{2})' W"/g,
    "coordinateText = \"$1°$2' S • $3°$4' W\"",
  ],
];

export function repairCorruptedTemplateStringLiterals(code = "") {
  let src = String(code || "");
  if (!src.trim()) return src;

  let prev = "";
  let guard = 0;
  while (src !== prev && guard < 8) {
    prev = src;
    guard += 1;
    src = src.replace(
      SPLIT_LITERAL_RE,
      (_, prefix, partA, middle, partB) =>
        `${prefix}"${partA.trimEnd()} • ${middle.trim()} • ${partB.trim()}"`
    );
    src = src.replace(SINGLE_SPLIT_RE, (full, prefix, partA, tail) => {
      const t = String(tail || "").trim();
      if (!t || /^[A-Z][A-Z0-9' ]*$/.test(t)) return full;
      return `${prefix}"${partA.trimEnd()} • ${t}",`;
    });
  }

  for (const [pattern, replacement] of MOJIBAKE_DEFAULTS) {
    src = src.replace(pattern, replacement);
  }

  return src;
}
