/**
 * Gbro Collage B-roll — metáforas e specs para paper-collage assemble B-roll.
 * Ref: https://github.com/pyang5166/gbro-collage-broll
 * Modos: editorial (padrão) | geo (mapas, territórios, cartografia)
 */

export const COLLAGE_MODES = Object.freeze(["editorial", "geo"]);

export const COLLAGE_PALETTE = Object.freeze([
  {
    id: "burnt-orange",
    label: "Laranja queimado",
    hex: "#C45C26",
    mood: "tempo, labor, urgência",
  },
  {
    id: "mustard",
    label: "Mostarda",
    hex: "#D4A017",
    mood: "alerta, ferramenta, vazamento",
  },
  {
    id: "deep-green",
    label: "Verde-musgo",
    hex: "#1F4D3A",
    mood: "cognição, reset, sistema",
  },
  {
    id: "deep-purple",
    label: "Roxo profundo",
    hex: "#3D2463",
    mood: "norma, memória, longo prazo",
  },
  {
    id: "teal",
    label: "Turquesa",
    hex: "#0D7377",
    mood: "julgamento, colaboração, execução",
  },
  {
    id: "crimson",
    label: "Carmesim",
    hex: "#9B1B30",
    mood: "tensão, risco, corte",
  },
  {
    id: "cream",
    label: "Creme",
    hex: "#F5E6C8",
    mood: "arquivo, papel, neutral",
  },
]);

/** Paleta cartográfica para modo geo */
export const GEO_COLLAGE_PALETTE = Object.freeze([
  {
    id: "ocean-ink",
    label: "Azul oceano",
    hex: "#0B3D5C",
    mood: "mapa náutico, mar, rotas",
  },
  {
    id: "parchment",
    label: "Pergaminho",
    hex: "#E8D5A3",
    mood: "atlas antigo, império, história",
  },
  {
    id: "military-green",
    label: "Verde militar",
    hex: "#3D4F2F",
    mood: "campanha, fronteira, estratégia",
  },
  {
    id: "desert-sand",
    label: "Areia",
    hex: "#C4A574",
    mood: "deserto, caravana, rota terrestre",
  },
  {
    id: "arctic-slate",
    label: "Ardósia polar",
    hex: "#4A5568",
    mood: "expedição, gelo, latitude alta",
  },
  {
    id: "crimson-border",
    label: "Vermelho fronteira",
    hex: "#8B1E3F",
    mood: "conflito, divisão, tratado",
  },
  {
    id: "forest-canopy",
    label: "Verde floresta",
    hex: "#1B4332",
    mood: "bacia, selva, bioma",
  },
]);

export function normalizeCollageMode(mode) {
  const m = String(mode || "editorial")
    .trim()
    .toLowerCase();
  if (m === "geo" || m === "map" || m === "maps" || m === "geographic") {
    return "geo";
  }
  return "editorial";
}

export function splitCollageLines(raw = "") {
  return String(raw || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter((l) => l.length >= 12);
}

export function buildCollageMetaphorPrompt(
  lines = [],
  {
    language = "pt",
    mode = "editorial",
    placeHint = "",
    countryHint = "",
    eraHint = "",
  } = {}
) {
  const list = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const numbered = list.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const langNote =
    language === "en"
      ? "Respond in English."
      : "Responda em português brasileiro.";
  const collageMode = normalizeCollageMode(mode);

  if (collageMode === "geo") {
    const placeCtx = [
      placeHint && `Local âncora sugerido: ${placeHint}`,
      countryHint && `País/região: ${countryHint}`,
      eraHint && `Época: ${eraHint}`,
    ]
      .filter(Boolean)
      .join("\n");

    return `Você é diretor de arte editorial + cartógrafo de papel, especializado em B-roll paper-collage GEOGRÁFICO (mapas, territórios, rotas).

${langNote}

MODO: GEO / MAPAS
Estilo visual: paper-collage + cartografia — recortes de mapa, contornos de país/cidade, rotas, pinos, bússolas, satélite em halftone, pergaminho, NÃO Google Maps UI realista.

TAREFA (Gate 1 — só metáfora, ZERO imagens/vídeo):
Para CADA linha de narração (~5s), proponha UM metáfora visual GEOGRÁFICA afiada.
Extraia ou infira o lugar real quando a fala citar cidade, país, rio, fronteira, império, rota, expedição.
Se não houver lugar explícito, invente metáfora cartográfica abstrata (ex.: arquipélago de decisões, fronteira de ideias) — sem inventar dados falsos de lugares reais.

${placeCtx ? `CONTEXTO DE LUGAR (use se combinar com a fala):\n${placeCtx}\n` : ""}
LINHAS:
${numbered || "(vazio)"}

REGRAS GEO:
- 1 metáfora por linha; 3–6 objetos-chave GRANDES e separáveis
- Preferir objetos: silhueta de país/continente, mapa dobrado, rota pontilhada, pino/bandeira de papel, bússola, régua de navegação, contorno de rio, bloco de cidade, satélite halftone, carta náutica, carimbo de porto
- Fundo = color field cartográfico (azul oceano, pergaminho, verde militar, areia, ardósia)
- Ordem assemble-from-empty: base mapa/território → rotas/contornos → pinos/POI → resultado
- SEM tipografia legível, SEM logo Google/Apple Maps, SEM UI, SEM nomes de rua legíveis (só formas de mapa)
- place_name / country / map_type devem ser preenchidos quando o lugar for real

map_type sugeridos: territory_outline | route_map | city_block | nautical | political_border | satellite_cutout | expedition | river_basin

Responda APENAS JSON válido:
{
  "items": [
    {
      "id": "c01",
      "line": "texto original",
      "mode": "geo",
      "core_meaning": "",
      "emotion": "",
      "visual_proposition": "uma frase com metáfora cartográfica",
      "place_name": "cidade/POI ou vazio",
      "region": "",
      "country": "",
      "map_type": "territory_outline",
      "era": "",
      "key_objects": ["silhueta do país", "rota pontilhada", "pino de papel"],
      "background_color": { "name": "ocean ink", "hex": "#0B3D5C" },
      "accent_colors": ["#E8D5A3", "#C45C26"],
      "assembly_order": ["1 mapa base", "2 contorno", "3 rota", "4 pino"],
      "action_verb": "traçar|cercar|cruzar|ancorar|expandir"
    }
  ]
}`;
  }

  return `Você é diretor de arte editorial especializado em B-roll paper-collage (halftone + cartolina).

${langNote}

TAREFA (Gate 1 — só metáfora, ZERO imagens/vídeo):
Para CADA linha de narração (~5s), proponha UM metáfora visual afiada (não literal, não lista a frase na tela).

LINHAS:
${numbered || "(vazio)"}

REGRAS:
- 1 metáfora por linha; 3–6 objetos-chave grandes e separáveis
- Fundo = color field plano forte (hex + nome)
- Elementos: recortes fotográficos halftone P&B + acentos de cartolina colorida
- Ordem de montagem assemble-from-empty: estrutura → sujeito/cartas → conexão → resultado
- SEM tipografia, SEM logo, SEM UI na cena
- Paletas sugeridas: laranja queimado, mostarda, verde-musgo, roxo profundo, turquesa, carmesim

Responda APENAS JSON válido:
{
  "items": [
    {
      "id": "c01",
      "line": "texto original",
      "mode": "editorial",
      "core_meaning": "",
      "emotion": "",
      "visual_proposition": "uma frase",
      "key_objects": ["", "", ""],
      "background_color": { "name": "", "hex": "#RRGGBB" },
      "accent_colors": ["#...", "#..."],
      "assembly_order": ["1...", "2...", "3..."],
      "action_verb": "abrir|conectar|arquivar|..."
    }
  ]
}`;
}

export function parseCollageMetaphorResponse(
  raw,
  fallbackLines = [],
  { mode = "editorial" } = {}
) {
  const collageMode = normalizeCollageMode(mode);
  let text = String(raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  const itemsIn = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : [];

  const lines = fallbackLines.length
    ? fallbackLines
    : itemsIn.map((it) => it.line || it.script || "");

  const defaultHex = collageMode === "geo" ? "#0B3D5C" : "#3D2463";
  const defaultName = collageMode === "geo" ? "ocean ink" : "deep purple";
  const defaultAccents =
    collageMode === "geo" ? ["#E8D5A3", "#C45C26"] : ["#F5E6C8", "#E85D04"];

  const items = lines.map((line, idx) => {
    const src = itemsIn[idx] || {};
    const bg = src.background_color || src.backgroundColor || {};
    const hex =
      String(bg.hex || src.background_hex || defaultHex).trim() || defaultHex;
    const name =
      String(bg.name || src.background_name || defaultName).trim() ||
      defaultName;
    const objects = Array.isArray(src.key_objects || src.keyObjects)
      ? (src.key_objects || src.keyObjects)
          .map(String)
          .filter(Boolean)
          .slice(0, 6)
      : [];
    while (objects.length < 3) {
      objects.push(
        collageMode === "geo"
          ? ["contorno territorial", "rota", "pino"][objects.length] ||
              `camada mapa ${objects.length + 1}`
          : `elemento ${objects.length + 1}`
      );
    }

    const assembly = Array.isArray(src.assembly_order || src.assemblyOrder)
      ? (src.assembly_order || src.assemblyOrder).map(String).filter(Boolean)
      : objects.map((o, i) => `${i + 1}. ${o}`);

    const itemMode = normalizeCollageMode(src.mode || collageMode);

    return {
      id: String(src.id || `c${String(idx + 1).padStart(2, "0")}`),
      line: String(src.line || src.script || line || "").trim(),
      mode: itemMode,
      core_meaning: String(src.core_meaning || src.coreMeaning || "").trim(),
      emotion: String(src.emotion || "").trim(),
      visual_proposition: String(
        src.visual_proposition || src.visualProposition || src.metaphor || ""
      ).trim(),
      place_name: String(
        src.place_name || src.placeName || src.location || ""
      ).trim(),
      region: String(src.region || "").trim(),
      country: String(src.country || "").trim(),
      map_type: String(src.map_type || src.mapType || "").trim(),
      era: String(src.era || "").trim(),
      key_objects: objects,
      background_color: { name, hex },
      accent_colors: Array.isArray(src.accent_colors || src.accentColors)
        ? (src.accent_colors || src.accentColors).map(String)
        : defaultAccents,
      assembly_order: assembly,
      action_verb: String(
        src.action_verb ||
          src.actionVerb ||
          (itemMode === "geo" ? "traçar" : "montar")
      ).trim(),
      status: "pending",
      gate: 1,
    };
  });

  return { items, mode: collageMode };
}

function isGeoItem(item) {
  return normalizeCollageMode(item?.mode) === "geo";
}

export function buildVisualSpec(item) {
  const geo = isGeoItem(item);
  const hex = item?.background_color?.hex || (geo ? "#0B3D5C" : "#3D2463");
  const name =
    item?.background_color?.name || (geo ? "ocean ink" : "deep purple");
  const objects = item?.key_objects || [];
  const placeBits = [item?.place_name, item?.region, item?.country]
    .filter(Boolean)
    .join(", ");

  return {
    script_meaning: item?.core_meaning || "",
    visual_metaphor: item?.visual_proposition || "",
    mode: geo ? "geo" : "editorial",
    place: {
      place_name: item?.place_name || "",
      region: item?.region || "",
      country: item?.country || "",
      map_type: item?.map_type || (geo ? "territory_outline" : ""),
      era: item?.era || "",
      label: placeBits,
    },
    style_signature: geo
      ? "flat cartographic color field, editorial paper-collage maps: cut-out country silhouettes, folded atlas sheets, dotted routes, paper pins, compass cut-outs, black-and-white halftone satellite fragments, cream keylines, soft paper shadows — NOT realistic Google Maps UI"
      : "flat bold color field, mixed black-and-white halfone cut-outs and colored cardstock accents, crisp cut edges, cream keylines, soft paper shadows, editorial paper collage".replace(
          "halfone",
          "halftone"
        ),
    aspect_ratio: "9:16",
    color_field: {
      background_hex: hex,
      background_name: name,
      accent_colors: item?.accent_colors || [],
      paper_grain: geo
        ? "fine map-paper fiber / parchment grain"
        : "fine uncoated-paper fiber",
    },
    elements: objects.map((what, i) => ({
      what,
      role:
        i === 0
          ? geo
            ? "map_base"
            : "structure"
          : i === objects.length - 1
            ? "result"
            : geo
              ? "route_or_poi"
              : "subject",
      motion: "slide in and snap into place",
      placement: i === 0 ? "center base" : "layered around territory",
    })),
    composition: {
      layout: "vertical 9:16 locked poster; geographic subject in middle 70%",
      negative_space: geo
        ? "generous ocean/parchment color-field around territory"
        : "generous clean color-field",
      final_frame: geo
        ? "assembled cartographic collage holding still"
        : "assembled editorial collage holding still",
    },
    motion_plan:
      item?.assembly_order?.join(" → ") ||
      (geo
        ? "map base first, contours second, routes, pin/POI last"
        : "structure first, subject second, action and result last"),
    avoid: geo
      ? "readable street names, Google/Apple Maps UI, GPS HUD, logos, watermarks, subtitles, photoreal 3D globe with UI, glossy CGI city"
      : "typography, readable letters, numerals, logos, watermark, UI, subtitles, glossy 3D, photoreal environment",
  };
}

export function buildImagegenPrompt(item) {
  const geo = isGeoItem(item);
  const hex = item?.background_color?.hex || (geo ? "#0B3D5C" : "#3D2463");
  const name =
    item?.background_color?.name || (geo ? "ocean ink" : "deep purple");
  const prop =
    item?.visual_proposition || item?.core_meaning || "editorial metaphor";
  const accents = (item?.accent_colors || ["cream", "teal"]).join(", ");
  const place = [item?.place_name, item?.region, item?.country]
    .filter(Boolean)
    .join(", ");
  const mapType = item?.map_type || "territory_outline";
  const era = item?.era ? ` Era: ${item.era}.` : "";

  if (geo) {
    return `Use case: ads-marketing
Asset type: final still frame for a 9:16 image-to-video geographic B-roll clip
Primary request: Create a finished editorial paper-collage MAP image expressing ${prop}.${place ? ` Place focus: ${place}.` : ""}${era}
Map type: ${mapType}.
Scene/backdrop: perfectly flat ${name} paper field ${hex} with subtle map-paper or parchment fiber.
Style/medium: premium editorial stop-motion paper collage of cartography — black-and-white halftone map/satellite cut-outs, country or city silhouettes as paper shapes, dotted paper routes, paper push-pin or flag, optional compass cardstock accents in ${accents}.
Composition/framing: vertical 9:16 locked poster frame; territory/route readable in the middle 70 percent; generous clean color-field negative space; 3–6 large separable paper map layers for assemble-from-empty animation.
Materials/textures: printed map grain, crisp cut edges of continents/countries, cream keylines, soft drop shadows, tactile atlas paper.
Constraints: geographic relationship must read at a glance — ${item?.core_meaning || prop}. Accurate silhouette feel for real places when named; abstract cartography if conceptual.
Avoid: no readable street names, no Google Maps UI, no Apple Maps chrome, no GPS HUD, no logos, no watermark, no subtitles, no photoreal 3D city flythrough, no clutter.`;
  }

  return `Use case: ads-marketing
Asset type: final still frame for a 9:16 image-to-video B-roll clip
Primary request: Create a finished editorial paper-collage image expressing ${prop}.
Scene/backdrop: perfectly flat ${name} paper field ${hex} with subtle uncoated paper fiber.
Style/medium: premium editorial stop-motion paper collage; black-and-white halftone photographic cut-outs mixed with selective ${accents} colored cardstock.
Composition/framing: vertical 9:16 locked poster frame; central subject within the middle 70 percent; generous clean color-field negative space; 3–6 large separable paper groups for later assemble-from-empty animation.
Materials/textures: visible printed haultone dots, crisp machine-cut edges, thin warm-cream paper keylines, soft low-opacity physical drop shadows.
Constraints: the visual relationship must be readable at a glance — ${item?.core_meaning || prop}.
Avoid: no typography, no readable letters, no numerals, no logos, no watermark, no UI, no subtitles, no glossy 3D, no photoreal environment, no clutter.`.replace(
    "haultone",
    "halftone"
  );
}

export function buildOmniPrompt(item) {
  const geo = isGeoItem(item);
  const hex = item?.background_color?.hex || (geo ? "#0B3D5C" : "#3D2463");
  const name = item?.background_color?.name || (geo ? "ocean" : "color");
  const order = (item?.assembly_order || item?.key_objects || [])
    .map(String)
    .join("; ");
  const place = [item?.place_name, item?.country].filter(Boolean).join(", ");

  if (geo) {
    return `Paper-collage stop-motion MAP assembly, using Image 1 as the exact empty first frame and Image 2 as the exact completed last frame. In one continuous locked-off vertical shot, open on the empty flat ${name} paper field${place ? ` (story of ${place})` : ""}.

Assemble the cartographic collage piece by piece with crisp physical stop-motion timing: ${order || "map base, territory outline, route line, pin or POI"}. End by holding the supplied completed map composition.

Preserve the exact 9:16 framing, ${hex} color field, map-paper grain, country/city silhouettes, dotted routes, cream keylines, crisp cut edges and soft shadows. Restrained tactile 2D paper craft only — cartography as collage, not live satellite UI.

No scene cuts, no camera movement, no zoom, no morphing, no new objects, no readable street labels, no Google Maps UI, no logos, no watermark, no sound.`;
  }

  return `Paper-collage stop-motion assembly, using Image 1 as the exact empty first frame and Image 2 as the exact completed last frame. In one continuous locked-off vertical shot, open on the empty flat ${name} paper field.

Assemble the scene piece by piece with crisp physical stop-motion timing: ${order || "structure, subjects, connectors, final result"}. End by holding the supplied completed composition.

Preserve the exact 9:16 framing, ${hex} color field, colored cardstock accents, uncoated paper grain, halfone dots, cream keylines, crisp cut edges and soft shadows. Restrained tactile 2D paper craft only.

No scene cuts, no camera movement, no zoom, no morphing, no new objects, no text, no letters, no numbers, no logos, no watermark, no UI, no sound.`.replace(
    "halfone",
    "halftone"
  );
}

export function buildOmniJob(
  item,
  {
    firstFrame = "frames/first-frame.png",
    lastFrame = "frames/last-frame.png",
    output = "omni/run-v01/final-5s.mp4",
  } = {}
) {
  return {
    prompt: buildOmniPrompt(item),
    image: [firstFrame, lastFrame],
    output,
    aspect_ratio: "9:16",
    duration: 5,
    model: "gemini-omni-flash-preview",
    item_id: item?.id,
    mode: normalizeCollageMode(item?.mode),
  };
}

/** Presets de animação paper-collage (sem morphing de territórios). */
export const COLLAGE_MOTION_PRESETS = Object.freeze([
  "slide_in",
  "slide_out",
  "unfold",
  "fold",
  "expand",
  "contract",
  "rotate_small",
  "layer_reveal",
  "paper_peel",
  "paper_drop",
  "pin_on_map",
  "route_draw",
  "map_zoom_local",
  "cross_section_open",
  "stack",
  "split",
  "assemble",
  "disassemble",
  "subtle_hold",
]);

/**
 * Classifica se a cena precisa de dois frames ou micro-motion.
 */
export function classifyAnimationMode(item = {}) {
  const blob = [
    item.visual_proposition,
    item.core_meaning,
    item.line,
    item.visualProposal?.composition,
    item.action_verb,
    ...(item.assembly_order || []),
    ...(item.key_objects || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const needsTwo =
    /\b(entra|entra[mr]|desliza|monta|montagem|abre|fecha|expande|contrai|cresce|surge|aparece|desaparece|substitui|compara|antes|depois|inunda|rota|linha|assemble|slide|open|close|expand|grow|enter|reveal|split|stack)\b/i.test(
      blob
    ) ||
    (item.key_objects || []).length >= 2 ||
    (item.assembly_order || []).length >= 2;

  if (!needsTwo && /\b(hold|vibr|sombra|parallax|micro)\b/i.test(blob)) {
    return "single_frame_micro_motion";
  }
  return needsTwo ? "start_end_frames" : "start_end_frames";
}

/**
 * Locked / moving / appearing elements a partir da proposta.
 */
export function buildFrameConsistency(item = {}) {
  const objects = (item.visualProposal?.objects || item.key_objects || []).map(
    String
  );
  const anchors = (
    item.lineAnalysis?.requiredVisualAnchors ||
    item.visualProposal?.semanticAnchors ||
    []
  ).map(String);
  const hex = item?.background_color?.hex || "#0B3D5C";
  const lockedElements = [
    "enquadramento 9:16",
    "fundo color field",
    `paleta ${hex}`,
    "textura de papel / halftone",
    "iluminação e sombras físicas",
    "identidade visual paper-collage",
    "orientação do mapa / direção espacial",
    "tamanho final dos objetos",
    "posição final dos objetos",
    "número de objetos previstos",
    ...anchors.slice(0, 6),
  ];
  const staticElements = [
    "fundo",
    "grade cartográfica se presente",
    "textura",
    "elementos decorativos de fundo",
  ];
  const movingElements = objects.slice(0, 6);
  const appearingElements = objects.slice(0, 4);
  const disappearingElements = [];
  const forbiddenChanges = [
    "morphing de silhuetas geográficas",
    "deformação de contornos de países/continentes",
    "mudança de fundo ou paleta",
    "objetos extras não previstos",
    "remoção de objetos obrigatórios",
    "texto, letras, logos, watermark",
    "corte de cena / câmera livre",
    "inversão de orientação geográfica",
  ];

  return {
    lockedElements: [...new Set(lockedElements)],
    staticElements,
    movingElements: [...new Set(movingElements)],
    appearingElements: [...new Set(appearingElements)],
    disappearingElements,
    forbiddenChanges,
  };
}

/**
 * Schema startFrame / endFrame / motion (Fase 1).
 */
export function buildDualFrameSpec(item = {}) {
  const animationMode = classifyAnimationMode(item);
  const consistency = buildFrameConsistency(item);
  const endPrompt = buildEndFrameImagePrompt(item);
  const startPrompt = buildStartFrameImagePrompt(item);
  const motionPrompt = buildMotionPrompt(item, consistency);
  const prop =
    item.visualProposal?.composition ||
    item.visual_proposition ||
    item.core_meaning ||
    "";

  const objects = consistency.movingElements;

  return {
    aspectRatio: "9:16",
    durationSeconds: 5,
    animationMode,
    endFrame: {
      description: `Composição final completa: ${prop}`,
      imagePrompt: endPrompt,
      imageUrl: item.endFrame?.imageUrl || item.still_url || "",
      imagePath: item.endFrame?.imagePath || item.still_path || "",
      status:
        item.endFrame?.status || (item.still_url ? "generated" : "pending"),
      approved: Boolean(item.endFrame?.approved || item.still_approved),
    },
    startFrame: {
      description:
        animationMode === "single_frame_micro_motion"
          ? "Mesma composição final com micro-movimento apenas"
          : `Estado inicial: elementos móveis fora/parciais; centro aberto. Objetos: ${objects.join(", ")}`,
      imagePrompt: startPrompt,
      imageUrl: item.startFrame?.imageUrl || item.first_frame_url || "",
      imagePath: item.startFrame?.imagePath || item.first_frame_path || "",
      status:
        item.startFrame?.status ||
        (item.first_frame_url ? "generated" : "pending"),
      approved: Boolean(item.startFrame?.approved),
      fromEndFrame: true,
    },
    motion: {
      description: "Passagem controlada start → end (assemble-from-empty)",
      videoPrompt: motionPrompt,
      durationSeconds: 5,
      preset: "assemble",
    },
    frameConsistency: consistency,
  };
}

export function buildEndFrameImagePrompt(item = {}) {
  // End frame = composição aprovada (fonte de verdade)
  return (
    buildImagegenPrompt(item) +
    `

END FRAME REQUIREMENTS:
- This is the FINAL completed composition of the paper collage.
- All intended paper cut-outs are fully visible and settled in their final positions.
- Centered finished assembly, readable in 5 seconds.
- Vertical 9:16 locked poster.
- No text, no labels, no letters, no logos, no watermark.
- This frame will be the exact last frame of the video.`
  );
}

export function buildStartFrameImagePrompt(item = {}) {
  const hex = item?.background_color?.hex || "#0B3D5C";
  const name =
    item?.background_color?.name ||
    (normalizeCollageMode(item?.mode) === "geo" ? "ocean ink" : "deep purple");
  const objects = (item.visualProposal?.objects || item.key_objects || []).map(
    String
  );
  const moving = objects.slice(0, 4);
  const geo = normalizeCollageMode(item?.mode) === "geo";

  const offscreenPlan =
    moving.length >= 2
      ? `Place the exact first cut-out "${moving[0]}" partially outside the upper-left edge. Place the exact second cut-out "${moving[1]}" partially outside the lower-right edge. Keep the center mostly empty.`
      : moving.length === 1
        ? `Place the exact cut-out "${moving[0]}" partially outside the frame edge, ready to slide in. Keep the center mostly empty.`
        : `Keep the center empty; only the flat paper field is visible.`;

  return `Use case: ads-marketing
Asset type: START FRAME (empty / pre-assembly) for 9:16 paper-collage image-to-video
Primary request: Create the INITIAL state of the same editorial paper collage that will finish as the approved end composition.
Scene/backdrop: perfectly flat ${name} paper field ${hex} with the SAME paper grain / parchment texture as the end frame.
Style/medium: premium editorial stop-motion paper collage${geo ? " of cartography" : ""}; black-and-white halftone; colored cardstock accents.
Composition/framing: vertical 9:16 locked poster — IDENTICAL framing to the end frame.
${offscreenPlan}
Preserve from the end frame: silhouettes, colors, scale, cut edges, shadows, palette, texture, lighting, object identity.
Constraints: fromEndFrame=true — do NOT invent a new design. Only reposition/hide elements for the start state.
Avoid: no new objects, no text, no labels, no letters, no logos, no watermark, no morphing of geographic shapes.`;
}

/**
 * Motion prompt — apenas a passagem entre frames (sem redescrever a cena).
 */
export function buildMotionPrompt(item = {}, consistency = null) {
  const cons = consistency || buildFrameConsistency(item);
  const moving = cons.movingElements || [];
  const order = (item.assembly_order || moving).map(String).join("; ");
  const geo = normalizeCollageMode(item?.mode) === "geo";

  const moveLine =
    moving.length >= 2
      ? `Animate the exact paper cut-out "${moving[0]}" sliding in from the upper-left while the exact paper cut-out "${moving[1]}" slides in from the lower-right. Additional pieces assemble in order: ${order}.`
      : moving.length === 1
        ? `Animate the exact paper cut-out "${moving[0]}" sliding into its final position with restrained handcrafted stop-motion steps.`
        : `Assemble the collage piece by piece with crisp physical stop-motion timing: ${order || "structure, subjects, result"}.`;

  return `Using the supplied start and end frames, ${moveLine}
Both pieces settle with softly shifting physical shadows.
Preserve the exact silhouettes${geo ? " of geographic shapes" : ""}, colors, scale, paper texture, background, grid and 9:16 framing.
Static elements (background, grid, texture) must not move.
End exactly on the supplied end frame.
No morphing, no new objects, no object removal, no scene cuts, no text, no letters, no logos, no watermark.
No camera movement, no zoom, no pan, no tilt.`;
}

/**
 * Valida se Gate 3 pode rodar (dois frames aprovados).
 */
export function canRunGate3(item = {}) {
  const endOk =
    Boolean(item.endFrame?.approved || item.still_approved) &&
    Boolean(
      item.endFrame?.imageUrl ||
      item.endFrame?.imagePath ||
      item.still_url ||
      item.still_path ||
      item.last_frame_path
    );
  const startOk =
    Boolean(item.startFrame?.approved) &&
    Boolean(
      item.startFrame?.imageUrl ||
      item.startFrame?.imagePath ||
      item.first_frame_url ||
      item.first_frame_path
    );
  // micro motion: only end frame required
  if (
    item.animationMode === "single_frame_micro_motion" ||
    item.motion?.preset === "subtle_hold"
  ) {
    return {
      ok: endOk,
      reason: endOk ? "" : "Aprove o End Frame antes do vídeo (micro-motion).",
    };
  }
  if (!endOk) {
    return { ok: false, reason: "Aprove o End Frame (Gate 2A) primeiro." };
  }
  if (!startOk) {
    return {
      ok: false,
      reason: "Aprove o Start Frame (Gate 2B) antes do Gate 3.",
    };
  }
  return { ok: true, reason: "" };
}

/**
 * Export package para Google Flow / Omni (start + end + motion).
 */
export function buildGoogleFlowExport(item = {}, sessionId = "") {
  const dual = item.endFrame ? item : { ...item, ...buildDualFrameSpec(item) };
  const id = item.id || "c01";
  return {
    sceneId: id,
    sessionId,
    aspectRatio: "9:16",
    durationSeconds: 5,
    animationMode:
      dual.animationMode || item.animationMode || "start_end_frames",
    startFrame: {
      prompt: dual.startFrame?.imagePrompt || buildStartFrameImagePrompt(item),
      imagePath:
        dual.startFrame?.imagePath ||
        item.first_frame_path ||
        `${id}/start_frame.png`,
      imageUrl: dual.startFrame?.imageUrl || item.first_frame_url || "",
      approved: Boolean(dual.startFrame?.approved),
    },
    endFrame: {
      prompt: dual.endFrame?.imagePrompt || buildEndFrameImagePrompt(item),
      imagePath:
        dual.endFrame?.imagePath ||
        item.still_path ||
        item.last_frame_path ||
        `${id}/end_frame.png`,
      imageUrl: dual.endFrame?.imageUrl || item.still_url || "",
      approved: Boolean(dual.endFrame?.approved || item.still_approved),
    },
    motionPrompt: dual.motion?.videoPrompt || buildMotionPrompt(item),
    lockedElements: dual.frameConsistency?.lockedElements || [],
    movingElements: dual.frameConsistency?.movingElements || [],
    forbiddenChanges: dual.frameConsistency?.forbiddenChanges || [],
    consistencyScore: dual.consistencyScore ?? null,
    // legado
    imagegen_prompt: dual.endFrame?.imagePrompt,
    omni_prompt: dual.motion?.videoPrompt,
    visual_proposition: item.visual_proposition,
  };
}
