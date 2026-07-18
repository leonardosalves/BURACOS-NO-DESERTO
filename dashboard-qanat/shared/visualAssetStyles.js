/**
 * Estilos de assets visuais do projeto (aba Criação + Visual PRO).
 * Persistido em config_qanat.json → visual_asset_style
 * Modo especial: visual_map_only_prompts (checkbox) → só prompts de mapas
 * adequados à época/tempo da narração.
 */

export const DEFAULT_VISUAL_ASSET_STYLE = "photorealistic";

/** Flag de projeto: gerar apenas prompts cartográficos / mapas. */
export const VISUAL_MAP_ONLY_CONFIG_KEY = "visual_map_only_prompts";

export const MAP_ONLY_PROMPT_CLAUSE =
  "historical cartographic map visualization only: period-accurate map style for the era of the event, geographic information design, clear territory/routes/landmarks labeled in the authentic historical language of that time when labels are essential, aged parchment or copperplate or satellite-era cartography matching the century, documentary map aesthetic, no people portraits, no lifestyle photography, no generic stock scenes";

/**
 * Precisão geográfica obrigatória — modelos de imagem inventam cidades/posição.
 * Preferir mapa SEM rótulos falsos a mapa “bonito” e mentiroso.
 */
export const MAP_GEO_ACCURACY_CLAUSE =
  "GEOGRAPHIC ACCURACY (MANDATORY, ZERO TOLERANCE FOR FAKE GEOGRAPHY): " +
  "do NOT invent, inventively place, or randomly pin cities, towns, rivers, or borders; " +
  "only label places if their relative position matches real-world geography for that region; " +
  "if unsure of exact coordinates, draw the correct regional SILHOUETTE / outline WITHOUT city name pins; " +
  "never scatter decorative pins with city names for aesthetic effect; " +
  "coastlines, state/province shapes, and north orientation must be roughly correct; " +
  "wrong city positions (e.g. placing inland towns on the wrong coast or swapping towns) are FORBIDDEN; " +
  "prefer an honest unlabeled territory map over a labeled map that lies";

/**
 * Rótulos cartográficos = idioma do PAÍS/território mostrado (flexível, sem engessar).
 * O prompt de geração pode estar em inglês; o TEXTO DENTRO do mapa segue o local real.
 * Ex.: mapa da França → francês; mapa dos EUA → inglês; mapa do Brasil → português;
 * mapa do Japão → japonês; Roma antiga → latim/topônimos da época.
 */
export const MAP_LABEL_LANGUAGE_CLAUSE =
  "MAP LABELS LANGUAGE (MANDATORY — ALWAYS BY COUNTRY/TERRITORY, NEVER HARDCODED TO ONE LANGUAGE): " +
  "any text painted ON the map (rivers, oceans, seas, mountains, states, provinces, cities, roads, compass rose, legend, cardinal directions) " +
  "MUST use the authentic official or historically correct language of the COUNTRY or region depicted on that map — " +
  "detect the country/region from the narration and scene (not from the English generation prompt); " +
  "examples ONLY as illustration, not as fixed rules: Brazil→Portuguese common nouns (Rio, Oceano…); France→French; USA/UK→English; Germany→German; Japan→Japanese; ancient Rome→Latin/period toponyms; " +
  "do NOT paint English common nouns (River, Ocean, Mountain, City, Coast) on a non-English-speaking country's map just because the image prompt is written in English; " +
  "do NOT force Portuguese on non-Brazilian maps; " +
  "proper place names keep their real local spelling; " +
  "if the map spans several countries, label each area in that area's language or use neutral unlabeled cartography";

/** @typedef {{ id: string, label: string, shortLabel: string, description: string, promptClause: string, look: string }} VisualAssetStyle */

/** @type {VisualAssetStyle[]} */
export const VISUAL_ASSET_STYLES = [
  {
    id: "photorealistic",
    label: "Realista fotográfico",
    shortLabel: "Realista",
    description: "Fotografia documental, texturas reais, lentes modernas.",
    look: "photorealistic documentary photography",
    promptClause:
      "photorealistic photography, real-world materials and textures, natural light physics, sharp optical detail, no illustration or CGI look",
  },
  {
    id: "cinematic_film",
    label: "Cinema / film grain",
    shortLabel: "Cinema",
    description: "Look de cinema: grain, anamórfico, cor de filme.",
    look: "cinematic film still",
    promptClause:
      "cinematic film still, subtle film grain, anamorphic lens character, movie color grade, shallow depth of field, theatrical lighting",
  },
  {
    id: "hyperreal_3d",
    label: "3D hiper-realista",
    shortLabel: "3D real",
    description: "CGI fotorrealista (Unreal/Octane), superfícies perfeitas.",
    look: "hyperrealistic 3D CGI",
    promptClause:
      "hyperrealistic 3D CGI render, Unreal Engine / Octane quality, physically based materials, global illumination, ray-traced reflections, clean geometry",
  },
  {
    id: "stylized_3d",
    label: "3D estilizado",
    shortLabel: "3D styl",
    description: "3D de animação (Pixar/DreamWorks), formas suaves.",
    look: "stylized 3D animation",
    promptClause:
      "stylized 3D animation film look, soft rounded forms, expressive lighting, clean subsurface skin/materials, family-animation quality, not photoreal",
  },
  {
    id: "claymation",
    label: "Clay / stop-motion",
    shortLabel: "Clay",
    description: "Massa de modelar, stop-motion artesanal.",
    look: "claymation stop-motion",
    promptClause:
      "claymation stop-motion aesthetic, handmade clay textures, fingerprint imperfections, miniature set craft, tactile practical materials",
  },
  {
    id: "anime",
    label: "Anime / japonês",
    shortLabel: "Anime",
    description: "Animação japonesa, linhas limpas, cores saturadas.",
    look: "Japanese anime style",
    promptClause:
      "Japanese anime style, clean cel shading, expressive linework, vibrant but controlled color, cinematic anime keyframe composition",
  },
  {
    id: "comic_graphic",
    label: "HQ / graphic novel",
    shortLabel: "HQ",
    description: "Quadrinhos, ink, contraste gráfico.",
    look: "graphic novel comic art",
    promptClause:
      "graphic novel illustration, bold ink outlines, dramatic panel composition, high-contrast ink washes, comic-book rendering (not photo)",
  },
  {
    id: "watercolor",
    label: "Aquarela / ilustração",
    shortLabel: "Aquarela",
    description: "Pintura em aquarela, papel e pigmento.",
    look: "watercolor illustration",
    promptClause:
      "watercolor illustration on paper, soft pigment blooms, visible paper texture, delicate brush edges, hand-painted editorial look",
  },
  {
    id: "oil_painting",
    label: "Pintura a óleo",
    shortLabel: "Óleo",
    description: "Óleo clássico, pinceladas e impasto.",
    look: "classical oil painting",
    promptClause:
      "classical oil painting, visible brush strokes, rich impasto, museum canvas texture, old-master lighting and color harmony",
  },
  {
    id: "vintage_archive",
    label: "Arquivo vintage",
    shortLabel: "Arquivo",
    description: "Foto de arquivo, grain, cor desbotada de época.",
    look: "vintage archival photography",
    promptClause:
      "vintage archival photograph, period-accurate film stock, soft grain, slightly faded color or sepia, historical documentary authenticity",
  },
  {
    id: "noir_dark",
    label: "Noir / sombrio",
    shortLabel: "Noir",
    description: "Alto contraste, sombras profundas, tensão.",
    look: "dark cinematic noir",
    promptClause:
      "dark cinematic noir, high contrast, deep shadows, cold rim light, tense moody atmosphere, sparse highlights",
  },
  {
    id: "tech_neon",
    label: "Tech neon / cyber",
    shortLabel: "Neon",
    description: "Futurista, neon, painéis e brilho tech.",
    look: "tech neon cyber aesthetic",
    promptClause:
      "tech neon cyber aesthetic, emissive accents, dark premium surfaces, holographic UI-free environment, sharp modern industrial design",
  },
  {
    id: "miniature_tilt",
    label: "Miniatura / tilt-shift",
    shortLabel: "Mini",
    description: "Maquete, tilt-shift, escala de brinquedo.",
    look: "miniature tilt-shift model",
    promptClause:
      "miniature scale model look, tilt-shift shallow focus, tiny detailed props, diorama craftsmanship, toy-like scale perception",
  },
  {
    id: "isometric_diagram",
    label: "Isométrico / diagrama",
    shortLabel: "Iso",
    description: "Vista isométrica editorial, didática e limpa.",
    look: "isometric editorial diagram",
    promptClause:
      "clean isometric editorial illustration, diagram-friendly composition, precise geometry, soft ambient occlusion, informative visual clarity",
  },
];

const STYLE_BY_ID = new Map(
  VISUAL_ASSET_STYLES.map((style) => [style.id, style])
);

export function listVisualAssetStyles() {
  return VISUAL_ASSET_STYLES.slice();
}

export function getVisualAssetStyle(styleId = DEFAULT_VISUAL_ASSET_STYLE) {
  const id = String(styleId || DEFAULT_VISUAL_ASSET_STYLE)
    .trim()
    .toLowerCase();
  return STYLE_BY_ID.get(id) || STYLE_BY_ID.get(DEFAULT_VISUAL_ASSET_STYLE);
}

export function normalizeVisualAssetStyleId(styleId = "") {
  return getVisualAssetStyle(styleId).id;
}

export function visualAssetStylePromptClause(styleId = "") {
  return getVisualAssetStyle(styleId).promptClause;
}

/**
 * Bloco de instrução em PT+EN para prompts de geração / VPE.
 * @param {string} styleId
 * @param {{ mapOnly?: boolean }} [opts]
 */
export function buildVisualAssetStyleDirective(styleId = "", opts = {}) {
  const style = getVisualAssetStyle(styleId);
  const mapOnly = opts.mapOnly === true;
  const mapBlock = mapOnly
    ? `\n\n${buildMapOnlyPromptsDirective().systemBlock}`
    : "";
  return {
    id: style.id,
    label: style.label,
    look: style.look,
    promptClause: style.promptClause,
    mapOnly,
    systemBlock: `ESTILO VISUAL DO PROJETO (OBRIGATÓRIO EM TODAS AS CENAS): ${style.label} (${style.id})
LOOK: ${style.look}
CLÁUSULA DE ESTILO (inglês, embutir em CADA prompt de imagem/vídeo): "${style.promptClause}"
- Não misture com outro estilo (ex.: se 3D estilizado, proibido photorealistic photography).
- Mantenha o mesmo look em todas as cenas do filme.
- O sujeito e a narração continuam fiéis ao roteiro; só a estética muda.${mapBlock}`,
  };
}

/**
 * Modo especial: somente prompts de mapas informativos,
 * adequados à idade/época do acontecimento na narração.
 */
export function buildMapOnlyPromptsDirective() {
  return {
    id: "map_only",
    label: "Somente mapas (época da narração)",
    promptClause: MAP_ONLY_PROMPT_CLAUSE,
    systemBlock: `MODO ESPECIAL ATIVO: PROMPTS SOMENTE DE MAPAS (OBRIGATÓRIO)
- TODAS as cenas devem ser MAPAS / cartografia informativa — proibido retrato, b-roll genérico, interiores, pessoas em close, objetos soltos sem geografia.
- Cada prompt descreve UM mapa (ou sequência cartográfica) que explica o trecho da narração: território, rotas, fronteiras, batalhas, viagens, impérios, cidades, rios, rotas comerciais, etc.
- A IDADE / ÉPOCA do mapa DEVE bater com o tempo do acontecimento na fala:
  · Antiguidade / Império Romano → mapa de pergaminho, rotas romanas, topônimos da época
  · Idade Média → carta náutica ou mapa feudal, iluminuras cartográficas
  · Séc. XVI–XVIII → mapa de cobre, portulano, impérios coloniais
  · Séc. XIX → mapa litográfico, ferrovias, impérios industriais
  · Séc. XX / guerras → mapa militar, topográfico, propaganda cartográfica da década
  · Contemporâneo → mapa satélite, GIS limpo, mapa político atual — só se a fala for atual
- Extraia da narração: LUGAR (país/cidade/região), EVENTO, DATA/ÉPOCA implícita, e o que o mapa deve ensinar (rota, fronteira, escala, antes/depois).
- PRECISÃO GEOGRÁFICA (CRÍTICO — modelos de imagem MENTIRAM posições de cidades):
  · NUNCA invente posição de cidade, vila, rio ou fronteira só para “enfeitar” o mapa.
  · Se for rotular cidades, a posição RELATIVA entre elas deve ser real (ex.: no litoral vs interior; quem fica a norte/sul/leste/oeste).
  · Se NÃO tiver certeza das coordenadas/relativas, DESENHE só o contorno correto da região SEM pins de nomes de cidades.
  · Proibido espalhar pins luminosos com nomes aleatórios (Blumenau/Brusque/Gaspar em posições inventadas = falha grave).
  · Prefira mapa honesto sem rótulos a mapa bonito e geograficamente falso.
  · Formato do estado/país e costa devem ser reconhecíveis (não inventar silhueta).
- IDIOMA DOS RÓTULOS NO MAPA (CRÍTICO — flexível por PAÍS, sem engessar):
  · Texto DENTRO da imagem do mapa = idioma oficial/histórico do PAÍS ou região que o mapa mostra.
  · Detecte o país pela narração/cena — NÃO pelo fato do prompt de geração estar em inglês.
  · Exemplos (só ilustração): mapa do Brasil → português; França → francês; EUA → inglês; Japão → japonês; Roma antiga → latim.
  · Proibido forçar português em mapa que não é do Brasil; proibido forçar inglês em mapa de país de outro idioma.
  · Nomes próprios reais mantêm a grafia local correta.
- Prefira type "imagem IA 2k" para mapas estáticos; use vídeo só se o mapa ANIMAR (linha de rota desenhando, zoom cartográfico, revelação de território).
- stock_query em inglês: ex. "roman empire map parchment", "medieval trade routes chart", "1940s military campaign map", "modern satellite map Denmark".
- Mantenha o ESTILO VISUAL do projeto (realista/3D/anime…) aplicado à cartografia (ex.: mapa em 3D estilizado, mapa anime, mapa noir).
- CLÁUSULA MAPA (inglês, embutir em CADA prompt): "${MAP_ONLY_PROMPT_CLAUSE}"
- CLÁUSULA GEO (inglês, embutir em CADA prompt de mapa): "${MAP_GEO_ACCURACY_CLAUSE}"
- CLÁUSULA IDIOMA DOS RÓTULOS (embutir em CADA prompt de mapa): "${MAP_LABEL_LANGUAGE_CLAUSE}"`,
  };
}

export function isMapOnlyPromptsEnabled(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

/**
 * Garante que o prompt contenha a cláusula de estilo (sem duplicar).
 * @param {string} prompt
 * @param {string} styleId
 * @param {{ mapOnly?: boolean }} [opts]
 */
export function enforceVisualAssetStyleInPrompt(
  prompt = "",
  styleId = DEFAULT_VISUAL_ASSET_STYLE,
  opts = {}
) {
  const text = String(prompt || "").trim();
  if (!text) return text;
  const style = getVisualAssetStyle(styleId);
  const clause = style.promptClause;
  const lower = text.toLowerCase();
  // Já tem trecho característico do estilo
  const markers = clause
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 12)
    .slice(0, 2);
  let next = text;
  if (!markers.some((marker) => lower.includes(marker))) {
    // Remove trails genéricos de photorealistic quando o estilo não é realista
    let cleaned = text;
    if (style.id !== "photorealistic" && style.id !== "cinematic_film") {
      cleaned = cleaned
        .replace(
          /\bphotorealistic(?:\s*,?\s*(?:2[kK]|8[kK])?\s*(?:resolution)?(?:\s*,?\s*highly detailed)?)\b/gi,
          " "
        )
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    const base = cleaned || text;
    const sep = /[.!?]$/.test(base) ? " " : ". ";
    next = `${base}${sep}Style: ${clause}.`.replace(/\s{2,}/g, " ").trim();
  }

  if (opts.mapOnly === true || isMapOnlyPromptsEnabled(opts.mapOnly)) {
    next = enforceMapOnlyInPrompt(next);
  } else if (
    /\b(map|mapa|cartograph|atlas|satellite map|territor|mapa de|map of)\b/i.test(
      next
    )
  ) {
    // Cenas de mapa fora do modo map-only ainda não podem inventar cidades
    next = enforceMapOnlyInPrompt(next);
  }
  return next;
}

/**
 * Força linguagem cartográfica no prompt quando o modo mapas está ativo.
 */
export function enforceMapOnlyInPrompt(prompt = "") {
  const text = String(prompt || "").trim();
  if (!text) return text;
  const lower = text.toLowerCase();
  const hasMap =
    /\b(map|mapa|cartograph|atlas|chart|portolan|gis|satellite map|territor)\b/i.test(
      lower
    );
  let next = text;
  if (!hasMap) {
    const sep = /[.!?]$/.test(next) ? " " : ". ";
    next = `${next}${sep}Show as a period-accurate informative map of the place and event described, matching the historical era of the narration.`;
  }
  if (
    !lower.includes("cartographic") &&
    !lower.includes("period-accurate map")
  ) {
    const sep = /[.!?]$/.test(next) ? " " : ". ";
    next = `${next}${sep}${MAP_ONLY_PROMPT_CLAUSE}.`;
  }
  // Sempre reforça precisão geográfica em prompts de mapa
  if (
    !lower.includes("geographic accuracy") &&
    !lower.includes("zero tolerance for fake geography") &&
    !lower.includes("do not invent")
  ) {
    const sep = /[.!?]$/.test(next) ? " " : ". ";
    next = `${next}${sep}${MAP_GEO_ACCURACY_CLAUSE}.`;
  }
  // Idioma dos rótulos = país/território do mapa (flexível; nunca engessar um só idioma)
  if (
    !lower.includes("map labels language") &&
    !lower.includes("always by country")
  ) {
    const sep = /[.!?]$/.test(next) ? " " : ". ";
    next = `${next}${sep}${MAP_LABEL_LANGUAGE_CLAUSE}.`;
  }
  // Se o prompt pede várias cidades/pins sem afirmar precisão → força silhueta sem pins inventados
  const namesManyCities =
    /\b(cidades?|cities|towns?|pins?|marcadores?|highlighted cities|rotular cidades)\b/i.test(
      next
    );
  if (
    namesManyCities &&
    !/\b(accurate relative positions|real-world geography|sem pins inventados|unlabeled silhouette)\b/i.test(
      next
    )
  ) {
    const sep = /[.!?]$/.test(next) ? " " : ". ";
    next = `${next}${sep}If city names are shown, each pin MUST sit at a correct relative location; otherwise omit all city name pins and show only the accurate regional outline.`;
  }
  return next.replace(/\s{2,}/g, " ").trim();
}
