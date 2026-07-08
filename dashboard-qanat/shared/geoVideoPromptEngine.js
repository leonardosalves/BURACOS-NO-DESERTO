/**
 * Motor de prompts T2V para vídeos geográficos — substitui Blender/Cesium.
 * Gera instruções ricas para IA (Seedance, LTX, etc.): zoom contínuo Terra→alvo,
 * destaque territorial, órbita 360° em POIs e clima conforme narração.
 */

const WEATHER_PATTERNS = [
  {
    id: "storm",
    re: /\b(tempestade|trovão|raios|furacão|tornado|cyclone)\b/i,
    label: "tempestade dramática com nuvens carregadas e raios distantes",
  },
  {
    id: "rain",
    re: /\b(chuva|chuvoso|choveu|chovia|precipitação|monção)\b/i,
    label:
      "chuva realista, gotas visíveis, superfícies molhadas refletindo luz",
  },
  {
    id: "fog",
    re: /\b(neblina|névoa|nevoeiro|bruma|mist)\b/i,
    label: "névoa densa e atmosfera úmida limitando visibilidade",
  },
  {
    id: "snow",
    re: /\b(neve|nevando|inverno rigoroso|geada|gelo)\b/i,
    label: "neve cobrindo relevo e estruturas, céu cinza-inverno",
  },
  {
    id: "drought",
    re: /\b(seca|árido|deserto|estiagem|terras ressecadas)\b/i,
    label: "paisagem árida, solo ressecado, vegetação escassa",
  },
  {
    id: "clear",
    re: /\b(céu limpo|sol|ensolarado|dia claro|verão)\b/i,
    label: "céu limpo com luz solar nítida e sombras definidas",
  },
  {
    id: "sunset",
    re: /\b(pôr do sol|entardecer|golden hour|crepúsculo)\b/i,
    label: "luz dourada de entardecer, sombras longas, céu alaranjado",
  },
  {
    id: "night",
    re: /\b(noite|noturno|lua|estrelas|escuro)\b/i,
    label: "cena noturna com iluminação urbana ou lunar realista",
  },
];

const HISTORIC_ERA_PATTERNS = [
  { re: /\b(século\s*xxi|2000|2010|2020|atual|hoje)\b/i, era: "contemporâneo" },
  {
    re: /\b(século\s*xx|1900|guerra mundial|anos 50|anos 60|anos 70|anos 80|anos 90)\b/i,
    era: "século XX",
  },
  {
    re: /\b(século\s*xix|1800|império|colonial|revolução industrial)\b/i,
    era: "século XIX",
  },
  { re: /\b(século\s*xviii|1700)\b/i, era: "século XVIII" },
  {
    re: /\b(idade média|medieval|século\s*(xii|xiii|xiv|xv)|castelo|feudal)\b/i,
    era: "Idade Média",
  },
  {
    re: /\b(império romano|roma antiga|antiguidade|século\s*(i{1,3}v?|v|vi|vii|viii|ix|x)|ac\s*\.|d\.c\.|antes de cristo|a\.c\.)\b/i,
    era: "Antiguidade clássica",
  },
  {
    re: /\b(pré-históri|paleolítico|neolítico|idade da pedra|caverna)\b/i,
    era: "pré-história",
  },
  {
    re: /\b(mil\s+anos|séculos atrás|antigamente|naquela época|na época)\b/i,
    era: "período histórico remoto",
  },
];

const TERRITORY_LEVEL_LABELS = {
  globe: "planeta Terra inteiro visto do espaço",
  continent: "continente",
  region: "região geográfica ampla",
  country: "país inteiro",
  state: "estado ou província",
  city: "cidade ou município completo",
  district: "bairro ou distrito urbano",
  poi: "ponto de interesse específico",
};

const POI_KIND_LABELS = {
  bridge: "ponte",
  landmark: "monumento ou marco arquitetônico",
  fort: "fortaleza ou estrutura militar",
  building: "edifício",
  ruins: "ruínas históricas",
};

export function detectWeatherFromNarration(text = "") {
  const t = String(text || "");
  for (const row of WEATHER_PATTERNS) {
    if (row.re.test(t)) return { id: row.id, description: row.label };
  }
  return {
    id: "neutral",
    description: "clima neutro documental, iluminação natural equilibrada",
  };
}

export function detectHistoricalEra(text = "") {
  const t = String(text || "");
  for (const row of HISTORIC_ERA_PATTERNS) {
    if (row.re.test(t)) return row.era;
  }
  if (
    /\b(históric|antig|medieval|império|colônia|século|milênio|era)\b/i.test(t)
  ) {
    return "período histórico (inferido da narração)";
  }
  return null;
}

export function resolveGeoAnimationMode(classification = {}) {
  const placeType = String(classification.place_type || "city");
  const poiKind = String(classification.poi_kind || "");
  const structureExists = classification.structure_exists !== false;
  const isHistoric = placeType === "historic_site" || !structureExists;

  if (placeType === "poi" || placeType === "historic_site") {
    return {
      mode: isHistoric
        ? "earth_descent_historic_orbit"
        : "earth_descent_poi_orbit",
      needs_orbit_360: true,
      needs_territory_highlight: false,
      final_subject: POI_KIND_LABELS[poiKind] || "estrutura arquitetônica",
    };
  }
  if (placeType === "city") {
    return {
      mode: "earth_descent_territory",
      needs_orbit_360: false,
      needs_territory_highlight: true,
      territory_level: "city",
      final_subject: "contorno administrativo completo da cidade",
    };
  }
  if (/\b(pa[ií]s|nação|country)\b/i.test(placeType)) {
    return {
      mode: "earth_descent_territory",
      needs_orbit_360: false,
      needs_territory_highlight: true,
      territory_level: "country",
      final_subject: "fronteiras nacionais completas",
    };
  }
  return {
    mode: "earth_descent_territory",
    needs_orbit_360: false,
    needs_territory_highlight: true,
    territory_level: placeType === "region" ? "region" : "country",
    final_subject: "área territorial destacada no mapa",
  };
}

function buildZoomStages(place = {}, animation = {}) {
  const levels = ["globe", "continent", "region", "country"];
  if (place.region) levels.push("region");
  if (place.country) levels.push("country");
  if (animation.territory_level === "city" || place.location) {
    levels.push("state", "city");
  }
  if (animation.needs_orbit_360) {
    levels.push("poi");
  }
  return [...new Set(levels)].map((id) => TERRITORY_LEVEL_LABELS[id] || id);
}

function aspectRatioFraming(aspectRatio = "16:9") {
  if (aspectRatio === "9:16") {
    return "composição vertical 9:16, sujeito centralizado, movimento de câmera adaptado ao formato Shorts";
  }
  return "composição widescreen cinematográfica 16:9, profundidade de campo ampla, estética documental premium";
}

function realismBlock() {
  return [
    "FOTORREALISMO ABSOLUTO: texturas de satélite e fotogrametria de altíssima fidelidade.",
    "Topografia geológica correta: relevo, montanhas, rios, costas e bacias hidrográficas fiéis ao local real.",
    "Geometria urbana e infraestrutura proporcionalmente correta — sem distorções de IA.",
    "PROIBIDO: mapas estilizados, ilustrações, cartoon, CGI genérico, transições artificiais ou morphing entre frames.",
    "PROIBIDO: cortes, dissolves, wipes ou jump cuts — apenas movimento de câmera contínuo.",
  ].join(" ");
}

function cameraMotionBlock(zoomStages, animation, durationSec) {
  const lines = [
    `MOVIMENTO DE CÂMERA (contínuo, ${durationSec}s, sem cortes):`,
    `1. Abertura: ${zoomStages[0]} — atmosfera azul, continentes e nuvens reais.`,
  ];
  zoomStages.slice(1).forEach((stage, i) => {
    lines.push(
      `${i + 2}. Zoom suave e ininterrupto aproximando até: ${stage}.`
    );
  });
  lines.push(
    "Velocidade: desaceleração cinematográfica ao se aproximar do alvo (ease-in-out, estilo Google Earth documental).",
    "Nenhum efeito de transição entre escalas — o zoom é um único movimento fluido através das camadas geográficas."
  );
  if (animation.needs_territory_highlight) {
    lines.push(
      `DESTAQUE TERRITORIAL: ao atingir o nível final, sobrepor no mapa satélite real um contorno luminoso (stroke dourado/branco) delimitando ${animation.final_subject}, com preenchimento semi-transparente cobrindo TODO o território administrativo — país, região, estado, cidade ou bairro conforme o contexto.`
    );
  }
  if (animation.needs_orbit_360) {
    lines.push(
      `ÓRBITA FINAL 360°: após o zoom, câmera desce ao nível do objeto e executa órbita lenta e contínua de 360 graus ao redor de ${animation.final_subject}, mostrando geometria arquitetônica, materiais, proporções e contexto urbano/paisagístico real.`,
      "A órbita deve revelar frentes, laterais, estrutura de vãos, pilaragem, arcos ou volumetria conforme o tipo de construção."
    );
  }
  return lines.join("\n");
}

function historicBlock(era, structureExists, location) {
  if (!era && structureExists !== false) return "";
  const lines = ["CONTEXTO HISTÓRICO:"];
  if (era) {
    lines.push(
      `Período visual: ${era}. Reconstrução documental do local como existia ou seria percebido nessa época.`
    );
  }
  if (structureExists === false) {
    lines.push(
      `A estrutura em ${location} não existe mais ou está em ruínas — mostrar vestígios arqueológicos, fundações, muros parcialmente de pé ou reconstrução histórica verossímil, SEM elementos arquitetônicos modernos incompatíveis com o período.`
    );
  } else if (era) {
    lines.push(
      "Remover anacronismos: veículos, prédios modernos e infraestrutura contemporânea fora do período."
    );
  }
  return lines.join(" ");
}

/**
 * Prompt principal T2V para location-intro (zoom Terra → alvo).
 */
export function buildGeoZoomVideoPrompt({
  place = {},
  classification = {},
  narration = "",
  aspectRatio = "16:9",
  durationSeconds = 8,
  coords = null,
} = {}) {
  const weather = detectWeatherFromNarration(narration);
  const era = detectHistoricalEra(narration);
  const animation = resolveGeoAnimationMode(classification);
  const zoomStages = buildZoomStages(place, animation);
  const durationSec = Math.max(6, Math.min(20, Number(durationSeconds) || 8));
  const location = [place.location, place.region, place.country]
    .filter(Boolean)
    .join(", ");
  const coordHint =
    coords?.lat && coords?.lng
      ? `Coordenadas de referência: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}.`
      : "";

  const sections = [
    "[LUMIERA GEO AI VIDEO — ZOOM TERRESTRE CONTÍNUO]",
    `Local alvo: ${location || "localização geográfica da narração"}.`,
    coordHint,
    `Tipo de cena: ${animation.mode}.`,
    aspectRatioFraming(aspectRatio),
    realismBlock(),
    cameraMotionBlock(zoomStages, animation, durationSec),
    historicBlock(era, classification.structure_exists, place.location),
    `CLIMA E ATMOSFERA: ${weather.description} — integrar ao relevo, nuvens e iluminação conforme a narração.`,
    `NARRAÇÃO (contexto visual): ${String(narration || "")
      .trim()
      .slice(0, 400)}`,
    `Duração alvo: ${durationSec} segundos. Movimento suave, documental, estilo National Geographic / Google Earth premium.`,
    "Qualquer texto visível na imagem deve estar em português do Brasil.",
  ].filter(Boolean);

  return sections.join("\n\n");
}

/**
 * Prompt para geo-map (pin regional com destaque territorial).
 */
export function buildGeoMapVideoPrompt({
  place = {},
  narration = "",
  aspectRatio = "16:9",
  durationSeconds = 5,
  coords = null,
} = {}) {
  const weather = detectWeatherFromNarration(narration);
  const durationSec = Math.max(4, Math.min(12, Number(durationSeconds) || 5));
  const location = [place.location, place.region, place.country]
    .filter(Boolean)
    .join(", ");
  const coordHint =
    coords?.lat && coords?.lng
      ? `Coordenadas: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}.`
      : "";

  return [
    "[LUMIERA GEO AI VIDEO — MAPA REGIONAL]",
    `Região: ${location}.`,
    coordHint,
    aspectRatioFraming(aspectRatio),
    realismBlock(),
    "MOVIMENTO: zoom contínuo do globo terrestre até a região/país, sem cortes.",
    `DESTAQUE: contorno luminoso e preenchimento semi-transparente sobre TODO o território de ${place.region || place.country || place.location}.`,
    `CLIMA: ${weather.description}.`,
    narration ? `Contexto: ${narration.slice(0, 300)}` : "",
    `Duração: ${durationSec}s.`,
    "Texto visível em português do Brasil.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildGeoVideoPromptMeta({
  place = {},
  classification = {},
  narration = "",
  templateId = "location-intro",
  aspectRatio = "16:9",
  durationSeconds = 8,
  coords = null,
} = {}) {
  const animation = resolveGeoAnimationMode(classification);
  const weather = detectWeatherFromNarration(narration);
  const era = detectHistoricalEra(narration);
  const prompt =
    templateId === "geo-map"
      ? buildGeoMapVideoPrompt({
          place,
          narration,
          aspectRatio,
          durationSeconds,
          coords,
        })
      : buildGeoZoomVideoPrompt({
          place,
          classification,
          narration,
          aspectRatio,
          durationSeconds,
          coords,
        });

  return {
    ai_video_prompt: prompt,
    geo_prompt_mode: animation.mode,
    geo_prompt_weather: weather.id,
    geo_prompt_era: era,
    geo_prompt_orbit_360: animation.needs_orbit_360,
    geo_prompt_territory_highlight: animation.needs_territory_highlight,
    geo_prompt_generated_at: new Date().toISOString(),
    geo_prompt_engine: "lumiera-geo-v1",
  };
}

export function geoPromptBrief(meta = {}) {
  const bits = ["IA Geo"];
  if (meta.geo_prompt_orbit_360) bits.push("360°");
  if (meta.geo_prompt_territory_highlight) bits.push("território");
  if (meta.geo_prompt_weather && meta.geo_prompt_weather !== "neutral") {
    bits.push(meta.geo_prompt_weather);
  }
  if (meta.geo_prompt_era) bits.push(meta.geo_prompt_era);
  return bits.join(" · ");
}
