/**
 * SEMANTIC VISUAL DIRECTOR — Collage B-roll (Fase 1)
 *
 * Interpreta roteiros educativos de Geografia de forma genérica:
 * análise global + por linha + âncoras + modo visual + validação.
 * Não hardcoda lugares (Groenlândia, África, etc.) — extrai do texto.
 *
 * Integra com collageBroll.js mantendo campos legados do Gate 1.
 */

import {
  normalizeCollageMode,
  parseCollageMetaphorResponse,
} from "./collageBroll.js";

/** Ontologia genérica — tipos, não nomes de lugares. */
export const GEO_ONTOLOGY = Object.freeze({
  POLITICAL_GEOGRAPHY: [
    "país",
    "pais",
    "estado",
    "município",
    "municipio",
    "capital",
    "fronteira",
    "território",
    "territorio",
    "disputa",
    "bloco econômico",
    "bloco economico",
    "country",
    "border",
    "territory",
  ],
  PHYSICAL_GEOGRAPHY: [
    "continente",
    "relevo",
    "montanha",
    "cordilheira",
    "planalto",
    "planície",
    "planicie",
    "vale",
    "deserto",
    "floresta",
    "bioma",
    "solo",
    "serra",
    "mountain",
    "desert",
    "forest",
    "continent",
  ],
  HYDROGRAPHY: [
    "rio",
    "afluente",
    "nascente",
    "foz",
    "delta",
    "lago",
    "aquífero",
    "aquifero",
    "bacia",
    "oceano",
    "mar",
    "corrente",
    "estuario",
    "estuário",
    "river",
    "lake",
    "ocean",
    "tributary",
  ],
  CLIMATOLOGY: [
    "clima",
    "temperatura",
    "chuva",
    "precipitação",
    "precipitacao",
    "umidade",
    "massa de ar",
    "seca",
    "tempestade",
    "aridez",
    "evaporação",
    "evaporacao",
    "climate",
    "humidity",
    "drought",
  ],
  GEOLOGY: [
    "placa",
    "tectônica",
    "tectonica",
    "falha",
    "vulcão",
    "vulcao",
    "terremoto",
    "erosão",
    "erosao",
    "rocha",
    "tectonic",
    "volcano",
    "earthquake",
  ],
  HUMAN_GEOGRAPHY: [
    "população",
    "populacao",
    "densidade",
    "migração",
    "migracao",
    "urbanização",
    "urbanizacao",
    "cidade",
    "costa",
    "interior",
    "ocupação",
    "ocupacao",
    "population",
    "migration",
    "urban",
  ],
  ECONOMIC_GEOGRAPHY: [
    "agricultura",
    "indústria",
    "industria",
    "mineração",
    "mineracao",
    "comércio",
    "comercio",
    "porto",
    "ferrovia",
    "rodovia",
    "energia",
    "recurso",
    "canal",
    "rota",
    "trade",
    "port",
    "resource",
  ],
  CARTOGRAPHY: [
    "mapa",
    "escala",
    "projeção",
    "projecao",
    "coordenada",
    "latitude",
    "longitude",
    "orientação",
    "orientacao",
    "distorção",
    "distorcao",
    "mercator",
    "globo",
    "map",
    "projection",
    "scale",
    "distortion",
  ],
});

export const VISUAL_MODES = Object.freeze([
  "literal",
  "comparative",
  "map_based",
  "process",
  "causal",
  "spatial",
  "temporal",
  "data_driven",
  "hybrid",
  "abstract",
]);

export const FIDELITY_LEVELS = Object.freeze([
  "literal",
  "balanced",
  "creative",
]);

export const GEO_SUBDOMAIN_PRESETS = Object.freeze([
  "auto",
  "fisica",
  "humana",
  "politica",
  "economica",
  "urbana",
  "ambiental",
  "cartografia",
  "geopolitica",
  "historica",
  "desastres",
]);

/** Detecta categorias ontológicas por palavras-tipo (não por nomes de lugares). */
export function detectOntologyCategories(text = "") {
  const lower = String(text || "").toLowerCase();
  const hit = [];
  for (const [cat, keywords] of Object.entries(GEO_ONTOLOGY)) {
    if (keywords.some((k) => lower.includes(k))) hit.push(cat);
  }
  return hit;
}

/**
 * Extração genérica de entidades candidatas do texto.
 * Não usa lista de países — capitalização + padrões numéricos/direcionais.
 */
export function extractDynamicEntities(text = "") {
  const raw = String(text || "").trim();
  const locations = [];
  const numbers = [];
  const directions = [];
  const geographicEntities = [];

  // Números e proporções (com ou sem unidade)
  for (const m of raw.matchAll(
    /\b(\d+(?:[.,]\d+)?\s*(?:%|km|m|°|graus?|milhões?|milhoes?|bilhões?|bilhoes?|habitantes?)?)\b/gi
  )) {
    numbers.push(m[1].trim());
  }

  // Direções geográficas genéricas
  const dirRe =
    /\b(norte|sul|leste|oeste|nordeste|noroeste|sudeste|sudoeste|north|south|east|west|coastal|interior|costeir[oa]s?)\b/gi;
  for (const m of raw.matchAll(dirRe)) {
    const d = m[1].toLowerCase();
    if (!directions.includes(d)) directions.push(d);
  }

  // Sequências capitalizadas (nomes próprios potenciais) — PT/EN
  // Inclui "do/da/de/dos/das" no meio (ex.: Deserto do Atacama, Rio da Prata)
  // NÃO usar \b: em JS, \b só vê ASCII — "África"/"Egito" no início com acento falham.
  // Fronteira Unicode: não precedido/seguido de letra/número.
  const properRe =
    /(?<![\p{L}\p{N}_])([A-ZÁÉÍÓÚÂÊÔÃÕÀÜ][\p{L}']+(?:\s+(?:d[eao]s?|del?|van|von|da|do|de|e|the|of)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÀÜ][\p{L}']+)*)(?![\p{L}\p{N}_])/gu;
  for (const m of raw.matchAll(properRe)) {
    const name = m[1].trim();
    if (name.length < 3) continue;
    // Evita início de frase genérico sozinho se for palavra comum
    const skip =
      /^(Este|Essa|Esse|Isso|Quando|Como|Onde|The|This|That|A|O|As|Os)$/i;
    if (skip.test(name) && !name.includes(" ")) continue;
    if (!locations.includes(name)) locations.push(name);
    if (!geographicEntities.includes(name)) geographicEntities.push(name);
  }

  // Tipos geográficos mencionados (rio X, deserto Y, mapa, etc.)
  const typeHits = [];
  for (const [cat, keywords] of Object.entries(GEO_ONTOLOGY)) {
    for (const k of keywords) {
      if (raw.toLowerCase().includes(k) && !typeHits.includes(k)) {
        typeHits.push(k);
      }
    }
  }

  return {
    locations,
    geographicEntities,
    physicalPhenomena: typeHits.filter((t) =>
      [
        ...GEO_ONTOLOGY.CLIMATOLOGY,
        ...GEO_ONTOLOGY.GEOLOGY,
        ...GEO_ONTOLOGY.PHYSICAL_GEOGRAPHY,
      ].some((k) => k === t)
    ),
    humanElements: typeHits.filter((t) =>
      [
        ...GEO_ONTOLOGY.HUMAN_GEOGRAPHY,
        ...GEO_ONTOLOGY.ECONOMIC_GEOGRAPHY,
      ].some((k) => k === t)
    ),
    numbers,
    directions,
    ontologyCategories: detectOntologyCategories(raw),
    typeKeywords: typeHits,
  };
}

/**
 * Classifica intenção visual de forma heurística (sem lista por tema).
 */
export function classifyVisualIntent(line = "", entities = {}) {
  const lower = String(line || "").toLowerCase();
  const hasCompare =
    /\b(parece|maior|menor|quase|tamanho|compara|versus|vs\.?|do tamanho|maior que|menor que|igual|proporç|proporc)\b/i.test(
      lower
    ) || (entities.numbers || []).length > 0;
  const hasMap =
    /\b(mapa|projeç|projec|globo|escala|coordenad|latitude|longitude|distorç|distorc|cartograf)\b/i.test(
      lower
    );
  const hasCause =
    /\b(porque|devido|causa|faz com que|gera|provoca|decorrente|graças|gracas|por isso)\b/i.test(
      lower
    );
  const hasProcess =
    /\b(forma|formação|formacao|surge|atravessa|conecta|expande|substitui|avança|avanca|bloqueia|recebe)\b/i.test(
      lower
    );
  const hasSpatial =
    /\b(localiza|perto|próximo|proximo|ao redor|entre|fronteira|costa|interior|norte|sul|leste|oeste)\b/i.test(
      lower
    );
  const hasTemporal =
    /\b(durante|século|seculo|anos?|históric|historic|ao longo|antes|depois|antiga)\b/i.test(
      lower
    );
  const hasData =
    /\b(\d|%|milhões|milhoes|bilhões|bilhoes|habitantes|densidade)\b/i.test(
      lower
    );

  let recommendedVisualMode = "literal";
  if (hasMap) recommendedVisualMode = "map_based";
  else if (hasCompare) recommendedVisualMode = "comparative";
  else if (hasCause) recommendedVisualMode = "causal";
  else if (hasProcess) recommendedVisualMode = "process";
  else if (hasData) recommendedVisualMode = "data_driven";
  else if (hasSpatial) recommendedVisualMode = "spatial";
  else if (hasTemporal) recommendedVisualMode = "temporal";

  // Se há entidades concretas + compare, híbrido
  if (
    (entities.geographicEntities || []).length > 0 &&
    hasCompare &&
    recommendedVisualMode === "comparative"
  ) {
    recommendedVisualMode = "hybrid";
  }
  if ((entities.geographicEntities || []).length > 0 && hasMap) {
    recommendedVisualMode = "map_based";
  }

  return {
    visualIntent: hasCompare
      ? "comparison"
      : hasCause
        ? "cause_effect"
        : hasProcess
          ? "process"
          : hasSpatial
            ? "location"
            : "explain",
    recommendedVisualMode,
  };
}

/**
 * Âncoras semânticas dinâmicas a partir da linha + entidades.
 */
export function buildSemanticAnchors(line = "", entities = {}) {
  const anchors = new Set();
  for (const e of entities.geographicEntities || []) anchors.add(e);
  for (const e of entities.locations || []) anchors.add(e);
  for (const t of entities.typeKeywords || []) anchors.add(t);
  for (const n of entities.numbers || []) anchors.add(n);
  for (const d of entities.directions || []) anchors.add(d);

  // Verbos/ações relevantes (genéricos)
  const actionMatch = String(line).match(
    /\b(atravessa|bloqueia|conecta|expande|concentra|parece|distorce|recebe|substitui|encurta|vive|marca|cruza)\b/i
  );
  if (actionMatch) anchors.add(actionMatch[1].toLowerCase());

  return [...anchors].filter(Boolean).slice(0, 12);
}

/**
 * Análise local por linha (determinística) — base antes do LLM.
 */
export function analyzeLineLocally(line = "", index = 0) {
  const originalLine = String(line || "").trim();
  const entities = extractDynamicEntities(originalLine);
  const { visualIntent, recommendedVisualMode } = classifyVisualIntent(
    originalLine,
    entities
  );
  const anchors = buildSemanticAnchors(originalLine, entities);

  const comparison = /\b(parece|maior|menor|quase|tamanho|compara)\b/i.test(
    originalLine
  )
    ? originalLine
    : "";

  return {
    index,
    originalLine,
    plainMeaning: originalLine,
    newInformation: originalLine,
    subject: entities.geographicEntities[0] || entities.typeKeywords[0] || "",
    actionOrState: visualIntent,
    cause: "",
    consequence: "",
    comparison,
    locations: entities.locations,
    geographicEntities: entities.geographicEntities,
    physicalPhenomena: entities.physicalPhenomena,
    humanElements: entities.humanElements,
    numbers: entities.numbers,
    dates: [],
    directions: entities.directions,
    requiredVisualAnchors: anchors.slice(0, 6),
    optionalVisualElements: [],
    forbiddenSubstitutions: [
      "animais aleatórios sem função",
      "objetos genéricos no lugar de lugares citados",
      "símbolos incompreensíveis no lugar do mapa/território",
    ],
    visualIntent,
    recommendedVisualMode,
    dependsOnPreviousScene: index > 0,
    ontologyCategories: entities.ontologyCategories,
    typeKeywords: entities.typeKeywords || [],
  };
}

/**
 * Análise global heurística do roteiro (sem LLM).
 */
export function analyzeScriptLocally(
  lines = [],
  { subdomainPreset = "auto" } = {}
) {
  const full = (Array.isArray(lines) ? lines : []).join(" ");
  const entities = extractDynamicEntities(full);
  const cats = detectOntologyCategories(full);

  let subdomain = subdomainPreset !== "auto" ? subdomainPreset : "geografia";
  if (subdomainPreset === "auto") {
    if (cats.includes("CARTOGRAPHY")) subdomain = "cartografia";
    else if (cats.includes("HYDROGRAPHY")) subdomain = "fisica";
    else if (cats.includes("CLIMATOLOGY")) subdomain = "fisica";
    else if (cats.includes("GEOLOGY")) subdomain = "fisica";
    else if (cats.includes("HUMAN_GEOGRAPHY")) subdomain = "humana";
    else if (cats.includes("ECONOMIC_GEOGRAPHY")) subdomain = "economica";
    else if (cats.includes("POLITICAL_GEOGRAPHY")) subdomain = "politica";
    else subdomain = "fisica";
  }

  return {
    domain: "geografia",
    subdomain,
    mainTopic:
      entities.geographicEntities.slice(0, 3).join(", ") ||
      "geografia educativa",
    thesis: full.slice(0, 200),
    educationalGoal:
      "explicar relações geográficas do roteiro com clareza visual",
    geographicScale: entities.locations.length > 2 ? "multi_scale" : "regional",
    timeContext: "atual",
    locations: entities.locations,
    phenomena: entities.typeKeywords,
    recurringVisualElements: [
      ...entities.geographicEntities.slice(0, 4),
      ...entities.typeKeywords.slice(0, 4),
    ].slice(0, 8),
    tone: "educativo e curioso",
    factualSensitivity: "high",
    ontologyCategories: cats,
  };
}

/**
 * Validação semântica de uma proposta visual vs. análise da linha.
 * Scores 0–100.
 */
export function validateVisualProposal({
  lineAnalysis = {},
  visualProposal = {},
  scriptAnalysis = {},
} = {}) {
  const anchors = [
    ...new Set(
      [
        ...(lineAnalysis.requiredVisualAnchors || []),
        ...(lineAnalysis.geographicEntities || []),
        ...(lineAnalysis.locations || []),
      ].map((a) => String(a).toLowerCase())
    ),
  ];

  const proposalText = [
    visualProposal.primarySubject,
    visualProposal.supportingMetaphor,
    visualProposal.composition,
    ...(visualProposal.semanticAnchors || []),
    ...(visualProposal.objects || []),
    ...(visualProposal.geographicRelationships || []),
    visualProposal.visual_proposition,
    ...(visualProposal.key_objects || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const covered = anchors.filter(
    (a) => a.length >= 2 && proposalText.includes(a.toLowerCase())
  );
  const missingAnchors = anchors.filter(
    (a) => a.length >= 2 && !proposalText.includes(a.toLowerCase())
  );
  const entityCoverage =
    anchors.length === 0
      ? 70
      : Math.round((covered.length / anchors.length) * 100);

  // Objetos irrelevantes: abstrações clássicas quando há entidades geográficas
  const abstractBan =
    /\b(balança|balanca|pena|ferro|espelho|relógio|relogio|fita|blocos de madeira|prato|lápis|lapis)\b/i;
  const hasGeoEntities = (lineAnalysis.geographicEntities || []).length > 0;
  const irrelevantObjects = [];
  if (hasGeoEntities && abstractBan.test(proposalText)) {
    irrelevantObjects.push(
      "metáfora abstrata genérica que substitui entidades geográficas"
    );
  }

  let factualRisk = 20;
  if ((visualProposal.inventedClaims || []).length) factualRisk = 80;
  if (/\b(maior país do mundo|sempre|nunca)\b/i.test(proposalText)) {
    factualRisk = Math.max(factualRisk, 50);
  }

  const mode = String(
    visualProposal.visualMode || lineAnalysis.recommendedVisualMode || ""
  );
  let geographicRelevance = 50;
  if (hasGeoEntities && entityCoverage >= 50) geographicRelevance = 85;
  if (hasGeoEntities && entityCoverage >= 75) geographicRelevance = 95;
  if (
    [
      "map_based",
      "spatial",
      "comparative",
      "literal",
      "hybrid",
      "process",
      "causal",
    ].includes(mode)
  ) {
    geographicRelevance = Math.max(geographicRelevance, 80);
  }
  if (mode === "abstract" && hasGeoEntities) geographicRelevance = 30;

  const objectCount = (
    visualProposal.objects ||
    visualProposal.key_objects ||
    []
  ).length;
  const fiveSecondClarity =
    objectCount === 0 ? 40 : objectCount <= 6 ? 85 : objectCount <= 8 ? 70 : 55;

  const semanticAlignment = Math.round(
    entityCoverage * 0.55 +
      geographicRelevance * 0.3 +
      (irrelevantObjects.length ? 20 : 90) * 0.15
  );

  const paperCollageFeasibility =
    objectCount >= 3 && objectCount <= 6 ? 90 : objectCount > 0 ? 70 : 40;

  let decision = "approve";
  let revisionInstruction = "";
  if (entityCoverage < 75 && hasGeoEntities) {
    decision = "regenerate";
    revisionInstruction =
      "Preservar todas as entidades geográficas citadas na linha; não substituir por metáfora abstrata.";
  } else if (geographicRelevance < 80 && hasGeoEntities) {
    decision = "regenerate";
    revisionInstruction =
      "Aumentar relevância geográfica: usar mapa, território, rio, relevo ou fenômeno da frase.";
  } else if (semanticAlignment < 80) {
    decision = "revise";
    revisionInstruction =
      "Alinhar objetos da colagem ao significado plano da frase e às âncoras semânticas.";
  } else if (fiveSecondClarity < 70) {
    decision = "revise";
    revisionInstruction =
      "Simplificar para no máximo 5–6 grupos de papel legíveis em 5s.";
  } else if (irrelevantObjects.length) {
    decision = "regenerate";
    revisionInstruction =
      "Remover metáforas genéricas (balança, pena, ferro, etc.) e reinstalar âncoras do texto.";
  }

  if (factualRisk >= 70) {
    decision = "revise";
    revisionInstruction =
      (revisionInstruction ? revisionInstruction + " " : "") +
      "Risco factual alto: não inventar formas territoriais nem relações não ditas no roteiro.";
  }

  return {
    semanticAlignment,
    entityCoverage,
    geographicRelevance,
    factualRisk,
    fiveSecondClarity,
    visualContinuity: 70,
    paperCollageFeasibility,
    missingAnchors,
    irrelevantObjects,
    possibleErrors:
      decision === "approve" ? [] : [revisionInstruction].filter(Boolean),
    decision,
    revisionInstruction,
  };
}

/**
 * Prompt LLM unificado: análise global + por linha + proposta visual + âncoras.
 * Fidelidade e preset influenciam regras.
 */
export function buildSemanticDirectorPrompt(
  lines = [],
  {
    language = "pt",
    fidelity = "balanced",
    subdomainPreset = "auto",
    placeHint = "",
    countryHint = "",
    eraHint = "",
  } = {}
) {
  const list = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const numbered = list.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const langNote =
    language === "en"
      ? "Respond in English inside JSON string values."
      : "Responda em português brasileiro nos valores de string do JSON.";

  const fidelityMap = {
    literal:
      "FIDELIDADE LITERAL: preservar quase todos os elementos concretos. Preferir visualMode literal, map_based, comparative, process, causal. Quase nunca abstract.",
    balanced:
      "FIDELIDADE EQUILIBRADA: preservar entidades principais; metáfora só como supportingMetaphor complementar, nunca no lugar do sujeito.",
    creative:
      "FIDELIDADE CRIATIVA: abstração permitida, mas requiredVisualAnchors e geographicEntities DEVEM aparecer nos objects.",
  };
  const fidelityRules = fidelityMap[fidelity] || fidelityMap.balanced;

  const placeCtx = [
    placeHint && `Local âncora opcional: ${placeHint}`,
    countryHint && `País/região opcional: ${countryHint}`,
    eraHint && `Época opcional: ${eraHint}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você é o SEMANTIC VISUAL DIRECTOR de um canal educativo de Geografia (paper-collage B-roll 5s, 9:16).

${langNote}

${fidelityRules}
Preset subdomínio: ${subdomainPreset} (auto = classifique).
${placeCtx ? `\nContexto opcional do usuário:\n${placeCtx}\n` : ""}

## PROBLEMA QUE VOCÊ DEVE EVITAR
NÃO transformar conceitos geográficos concretos em metáforas abstratas genéricas.
ERRADO: "mapa faz Groenlândia parecer África" → balança com pena e ferro.
CERTO: mapa/globo + silhuetas/áreas de papel das duas regiões + distorção de escala.
ERRADO: "Nilo atravessa áreas secas" → fita azul entre blocos de madeira.
CERTO: rio de papel azul atravessando deserto visto de cima.

## REGRA PRINCIPAL
Se a frase puder ser representada diretamente (lugar, rio, mapa, fronteira, população na costa), NÃO substitua o assunto por metáfora abstrata.
Metáfora só como complemento (hybrid), nunca apagando entidades.

## PRESERVAÇÃO DE ENTIDADES
Preserve nomes e entidades concretas do texto: países, cidades, rios, oceanos, montanhas, desertos, biomas, rotas, fenômenos, números, direções.
Extraia âncoras DINAMICAMENTE do texto — não invente listas fixas de lugares.

## MODOS visualMode
literal | comparative | map_based | process | causal | spatial | temporal | data_driven | hybrid | abstract
Use abstract SÓ se não houver representação concreta clara.

## ESTILO VISUAL (paper collage)
Color field + recortes de papel (mapa, território, rio, relevo, pinos, massas de ar como camadas de papel).
SEM tipografia legível na imagem, SEM UI de Google Maps, SEM logos.
Objetos: 3–6 grupos grandes separáveis (assemble-from-empty).

## ROTEIRO (linhas ~5s)
${numbered || "(vazio)"}

Responda APENAS JSON válido com esta estrutura:
{
  "scriptAnalysis": {
    "domain": "geografia",
    "subdomain": "fisica|humana|politica|economica|cartografia|geopolitica|historica|ambiental|urbana|desastres",
    "mainTopic": "",
    "thesis": "",
    "educationalGoal": "",
    "geographicScale": "local|regional|continental|global|multi_scale",
    "timeContext": "",
    "locations": [],
    "phenomena": [],
    "recurringVisualElements": [],
    "tone": "educativo e curioso",
    "factualSensitivity": "high"
  },
  "items": [
    {
      "id": "c01",
      "line": "texto original da linha",
      "mode": "geo",
      "lineAnalysis": {
        "plainMeaning": "",
        "newInformation": "",
        "subject": "",
        "actionOrState": "",
        "cause": "",
        "consequence": "",
        "comparison": "",
        "locations": [],
        "geographicEntities": [],
        "physicalPhenomena": [],
        "humanElements": [],
        "numbers": [],
        "dates": [],
        "directions": [],
        "requiredVisualAnchors": [],
        "optionalVisualElements": [],
        "forbiddenSubstitutions": [],
        "visualIntent": "",
        "recommendedVisualMode": "literal|comparative|map_based|process|causal|spatial|temporal|data_driven|hybrid|abstract",
        "dependsOnPreviousScene": false
      },
      "visualProposal": {
        "visualMode": "map_based",
        "primarySubject": "",
        "semanticAnchors": [],
        "supportingMetaphor": "",
        "composition": "",
        "objects": ["", "", ""],
        "geographicRelationships": [],
        "assemblySteps": ["1...", "2...", "3..."],
        "continuityFromPrevious": "",
        "transitionToNext": "",
        "editorOverlays": []
      },
      "core_meaning": "espelho de plainMeaning para UI legada",
      "emotion": "",
      "visual_proposition": "uma frase concreta da composição (NÃO metáfora abstrata vazia)",
      "place_name": "",
      "region": "",
      "country": "",
      "map_type": "territory_outline|route_map|comparative_map|process_diagram|hydrography|climate|tectonic|population|other",
      "era": "",
      "key_objects": ["mesmos objects, 3-6 itens"],
      "background_color": { "name": "", "hex": "#RRGGBB" },
      "accent_colors": ["#...", "#..."],
      "assembly_order": ["igual assemblySteps"],
      "action_verb": "",
      "generatedImageText": false,
      "editorOverlayLabels": [],
      "requiresFactValidation": false,
      "claimsToValidate": [],
      "confidence": 0.8
    }
  ]
}

Para CADA linha do roteiro deve existir exatamente um item, na mesma ordem.`;
}

/**
 * Parse resposta do director + enriquece com análise local e validação.
 */
export function parseSemanticDirectorResponse(
  raw,
  fallbackLines = [],
  { mode = "geo", fidelity = "balanced" } = {}
) {
  let text = String(raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  const lines = fallbackLines.length
    ? fallbackLines
    : (data?.items || []).map((it) => it.line || "");

  const localScript = analyzeScriptLocally(lines);
  const scriptAnalysis = {
    ...localScript,
    ...(data?.scriptAnalysis && typeof data.scriptAnalysis === "object"
      ? data.scriptAnalysis
      : {}),
    domain: "geografia",
    factualSensitivity: "high",
  };

  const itemsIn = Array.isArray(data?.items) ? data.items : [];
  const visualMemory = {
    persistentAssets: [...(scriptAnalysis.recurringVisualElements || [])],
    entityAppearance: {},
    mapOrientation: "",
    geographicColorRules: {},
    previousSceneState: {},
    cameraPattern: "locked-off vertical 9:16",
    visualProgression: [],
  };

  const items = lines.map((line, idx) => {
    const src = itemsIn[idx] || {};
    const localLine = analyzeLineLocally(line, idx);
    const lineAnalysis = {
      ...localLine,
      ...(src.lineAnalysis && typeof src.lineAnalysis === "object"
        ? src.lineAnalysis
        : {}),
      originalLine: line,
    };
    // Merge anchors: local + LLM
    const anchors = [
      ...new Set([
        ...(lineAnalysis.requiredVisualAnchors || []),
        ...(localLine.requiredVisualAnchors || []),
        ...(lineAnalysis.geographicEntities || []),
        ...(localLine.geographicEntities || []),
      ]),
    ];
    lineAnalysis.requiredVisualAnchors = anchors.slice(0, 10);
    lineAnalysis.geographicEntities = [
      ...new Set([
        ...(lineAnalysis.geographicEntities || []),
        ...(localLine.geographicEntities || []),
      ]),
    ];
    lineAnalysis.locations = [
      ...new Set([
        ...(lineAnalysis.locations || []),
        ...(localLine.locations || []),
      ]),
    ];

    const vpIn = src.visualProposal || src.visual_proposal || {};
    const keyObjects = Array.isArray(src.key_objects)
      ? src.key_objects.map(String)
      : Array.isArray(vpIn.objects)
        ? vpIn.objects.map(String)
        : localLine.requiredVisualAnchors.slice(0, 4);

    const objects =
      Array.isArray(vpIn.objects) && vpIn.objects.length
        ? vpIn.objects.map(String)
        : keyObjects;

    const visualMode =
      vpIn.visualMode ||
      lineAnalysis.recommendedVisualMode ||
      localLine.recommendedVisualMode ||
      "literal";

    const visualProposal = {
      visualMode,
      primarySubject: String(
        vpIn.primarySubject ||
          lineAnalysis.subject ||
          lineAnalysis.geographicEntities[0] ||
          ""
      ),
      semanticAnchors: Array.isArray(vpIn.semanticAnchors)
        ? vpIn.semanticAnchors.map(String)
        : anchors.slice(0, 8),
      supportingMetaphor: String(vpIn.supportingMetaphor || ""),
      composition: String(
        vpIn.composition ||
          src.visual_proposition ||
          lineAnalysis.plainMeaning ||
          ""
      ),
      objects: objects.slice(0, 6),
      geographicRelationships: Array.isArray(vpIn.geographicRelationships)
        ? vpIn.geographicRelationships.map(String)
        : [],
      assemblySteps: Array.isArray(vpIn.assemblySteps)
        ? vpIn.assemblySteps.map(String)
        : Array.isArray(src.assembly_order)
          ? src.assembly_order.map(String)
          : objects.map((o, i) => `${i + 1}. ${o}`),
      continuityFromPrevious: String(vpIn.continuityFromPrevious || ""),
      transitionToNext: String(vpIn.transitionToNext || ""),
      editorOverlays: Array.isArray(vpIn.editorOverlays)
        ? vpIn.editorOverlays
        : Array.isArray(src.editorOverlayLabels)
          ? src.editorOverlayLabels
          : [],
    };

    // Se LLM caiu em abstrato com entidades: forçar hybrid + objects das âncoras
    if (
      visualProposal.visualMode === "abstract" &&
      lineAnalysis.geographicEntities.length > 0
    ) {
      visualProposal.visualMode = "hybrid";
      if (!visualProposal.objects.length) {
        visualProposal.objects = lineAnalysis.requiredVisualAnchors.slice(0, 5);
      }
    }

    let validation = validateVisualProposal({
      lineAnalysis,
      visualProposal,
      scriptAnalysis,
    });

    // Até 1 auto-correção determinística se regenerate
    if (
      validation.decision === "regenerate" &&
      lineAnalysis.requiredVisualAnchors.length
    ) {
      visualProposal.objects = [
        ...new Set([
          ...lineAnalysis.requiredVisualAnchors.slice(0, 4),
          ...visualProposal.objects,
        ]),
      ].slice(0, 6);
      visualProposal.semanticAnchors = lineAnalysis.requiredVisualAnchors.slice(
        0,
        8
      );
      visualProposal.primarySubject =
        lineAnalysis.geographicEntities[0] ||
        lineAnalysis.requiredVisualAnchors[0] ||
        visualProposal.primarySubject;
      visualProposal.visualMode =
        lineAnalysis.recommendedVisualMode === "abstract"
          ? "literal"
          : lineAnalysis.recommendedVisualMode || "literal";
      visualProposal.composition =
        visualProposal.composition ||
        `Paper-collage of: ${visualProposal.objects.join(", ")}`;
      validation = validateVisualProposal({
        lineAnalysis,
        visualProposal,
        scriptAnalysis,
      });
      if (validation.decision === "regenerate") {
        validation = {
          ...validation,
          decision: "revise",
          revisionInstruction:
            validation.revisionInstruction ||
            "Revisar manualmente: entidades ainda sub-representadas.",
        };
      }
    }

    const bg = src.background_color || {};
    const hex = String(bg.hex || "#0B3D5C").trim() || "#0B3D5C";
    const name = String(bg.name || "ocean ink").trim() || "ocean ink";

    // Memória visual
    for (const ent of lineAnalysis.geographicEntities) {
      if (!visualMemory.entityAppearance[ent]) {
        visualMemory.entityAppearance[ent] = {
          firstScene: idx,
          colorHint: hex,
        };
      }
    }
    visualMemory.visualProgression.push({
      id: String(src.id || `c${String(idx + 1).padStart(2, "0")}`),
      primarySubject: visualProposal.primarySubject,
      visualMode: visualProposal.visualMode,
    });

    const legacyObjects =
      visualProposal.objects.length >= 3
        ? visualProposal.objects
        : keyObjects.length
          ? keyObjects
          : lineAnalysis.requiredVisualAnchors.slice(0, 4);

    while (legacyObjects.length < 3) {
      legacyObjects.push(`camada ${legacyObjects.length + 1}`);
    }

    return {
      id: String(src.id || `c${String(idx + 1).padStart(2, "0")}`),
      line,
      mode: normalizeCollageMode(src.mode || mode || "geo"),
      // legado UI
      core_meaning: String(
        src.core_meaning || lineAnalysis.plainMeaning || ""
      ).trim(),
      emotion: String(src.emotion || scriptAnalysis.tone || "").trim(),
      visual_proposition: String(
        src.visual_proposition ||
          visualProposal.composition ||
          visualProposal.primarySubject ||
          ""
      ).trim(),
      place_name: String(
        src.place_name || lineAnalysis.locations[0] || ""
      ).trim(),
      region: String(src.region || "").trim(),
      country: String(src.country || "").trim(),
      map_type: String(src.map_type || "").trim(),
      era: String(src.era || scriptAnalysis.timeContext || "").trim(),
      key_objects: legacyObjects.slice(0, 6),
      background_color: { name, hex },
      accent_colors: Array.isArray(src.accent_colors)
        ? src.accent_colors.map(String)
        : ["#E8D5A3", "#C45C26"],
      assembly_order:
        visualProposal.assemblySteps.length > 0
          ? visualProposal.assemblySteps
          : legacyObjects.map((o, i) => `${i + 1}. ${o}`),
      action_verb: String(
        src.action_verb || lineAnalysis.actionOrState || ""
      ).trim(),
      status: "pending",
      gate: 1,
      approvalStatus: "pending",
      // novos
      lineAnalysis,
      visualProposal,
      validation,
      fidelity,
      generatedImageText: false,
      editorOverlayLabels: visualProposal.editorOverlays || [],
      requiresFactValidation: Boolean(src.requiresFactValidation),
      claimsToValidate: Array.isArray(src.claimsToValidate)
        ? src.claimsToValidate
        : [],
      confidence: Number(src.confidence) || 0.75,
    };
  });

  return {
    scriptAnalysis,
    lineAnalysis: items.map((i) => i.lineAnalysis),
    items,
    visualMemory,
    fidelity,
    mode: normalizeCollageMode(mode),
  };
}

/** Ajustes rápidos (UI + API) — genéricos editorial e geo. */
export const QUICK_FIXES = Object.freeze([
  { id: "more_literal", label: "Mais literal" },
  { id: "more_geographic", label: "Mais geográfico" },
  { id: "use_map", label: "Usar mapa" },
  { id: "show_location", label: "Mostrar localização" },
  { id: "preserve_entities", label: "Preservar entidades" },
  { id: "fix_precision", label: "Corrigir precisão" },
  { id: "simplify", label: "Simplificar composição" },
  { id: "improve_continuity", label: "Melhorar continuidade" },
  { id: "remove_random", label: "Remover objetos aleatórios" },
  { id: "no_image_text", label: "Sem texto na imagem" },
  { id: "fix_scale", label: "Corrigir escala" },
  { id: "fix_direction", label: "Corrigir direção" },
  { id: "fix_era", label: "Corrigir período histórico" },
  { id: "keep_style", label: "Manter estilo atual" },
]);

export const REJECTION_REASONS = Object.freeze([
  { id: "not_narration", label: "Não representa a narração" },
  { id: "too_abstract", label: "Muito abstrato" },
  { id: "geo_error", label: "Erro geográfico" },
  { id: "history_error", label: "Erro histórico" },
  { id: "missing_entities", label: "Entidades ausentes" },
  { id: "confusing", label: "Composição confusa" },
  { id: "five_sec", label: "Impossível entender em 5 segundos" },
  { id: "random_objects", label: "Objetos aleatórios" },
  { id: "unwanted_text", label: "Texto indesejado" },
  { id: "wrong_style", label: "Estilo incorreto" },
  { id: "other", label: "Outro" },
]);

export const EDIT_SCOPES = Object.freeze([
  "all",
  "visualProposal",
  "objects",
  "assembly",
  "geo_precision",
  "composition",
  "transition",
  "labels",
  "style",
]);

const QUICK_FIX_RULES = {
  more_literal:
    "Preferir visualMode literal/map_based/process; eliminar metáfora abstrata dominante.",
  more_geographic:
    "Reforçar mapa, território, relevo, hidrografia ou localização; não abstrair lugares.",
  use_map:
    "Incluir mapa de papel / silhuetas territoriais como elemento principal.",
  show_location:
    "Deixar localização espacial legível (costa, interior, entre regiões).",
  preserve_entities:
    "Todos os nomes/entidades do preserveElements e da linha DEVEM aparecer nos objects.",
  fix_precision:
    "Corrigir relações espaciais, escala, direção e posições sem inventar fatos.",
  simplify: "No máximo 5 grupos de papel; legível em 5 segundos.",
  improve_continuity:
    "Alinhar cores, orientação e progressão com previousLine/nextLine.",
  remove_random: "Remover objetos sem função semântica na frase.",
  no_image_text: "generatedImageText=false; nomes só em editorOverlayLabels.",
  fix_scale: "Corrigir proporções/comparações de tamanho entre áreas.",
  fix_direction: "Corrigir norte/sul/leste/oeste e sentido de fluxo.",
  fix_era: "Respeitar época/período do contexto; sem anacronismos visuais.",
  keep_style:
    "Manter paleta background_color/accent_colors e estética paper-collage atual.",
};

/**
 * Snapshot de versão para histórico de card (cliente e API).
 */
export function snapshotCardVersion(item = {}, meta = {}) {
  return {
    version: Number(meta.version) || 1,
    createdAt: meta.createdAt || new Date().toISOString(),
    regenerationInstruction: meta.regenerationInstruction || "",
    quickFixes: Array.isArray(meta.quickFixes) ? meta.quickFixes : [],
    rejectionReasons: Array.isArray(meta.rejectionReasons)
      ? meta.rejectionReasons
      : [],
    proposal: {
      id: item.id,
      line: item.line,
      mode: item.mode,
      core_meaning: item.core_meaning,
      emotion: item.emotion,
      visual_proposition: item.visual_proposition,
      place_name: item.place_name,
      region: item.region,
      country: item.country,
      map_type: item.map_type,
      era: item.era,
      key_objects: item.key_objects || [],
      background_color: item.background_color,
      accent_colors: item.accent_colors || [],
      assembly_order: item.assembly_order || [],
      action_verb: item.action_verb,
      lineAnalysis: item.lineAnalysis || null,
      visualProposal: item.visualProposal || null,
      validation: item.validation || null,
    },
    validation: item.validation || null,
  };
}

/**
 * Diff legível entre proposta atual e candidata.
 */
export function summarizeCardChanges(previous = {}, candidate = {}) {
  const changes = [];
  const fields = [
    ["visual_proposition", "proposição visual"],
    ["core_meaning", "significado"],
    ["place_name", "lugar"],
    ["map_type", "tipo de mapa"],
    ["era", "época"],
  ];
  for (const [key, label] of fields) {
    const a = String(previous[key] || "").trim();
    const b = String(candidate[key] || "").trim();
    if (a && b && a !== b) changes.push(`${label} alterado`);
    else if (!a && b) changes.push(`${label} adicionado`);
  }
  const objA = JSON.stringify(previous.key_objects || []);
  const objB = JSON.stringify(candidate.key_objects || []);
  if (objA !== objB) changes.push("objetos alterados");
  const asmA = JSON.stringify(previous.assembly_order || []);
  const asmB = JSON.stringify(candidate.assembly_order || []);
  if (asmA !== asmB) changes.push("montagem alterada");

  const vA = previous.validation || {};
  const vB = candidate.validation || {};
  const scoreFields = [
    ["semanticAlignment", "alinhamento semântico"],
    ["entityCoverage", "cobertura de entidades"],
    ["geographicRelevance", "relevância geográfica"],
    ["fiveSecondClarity", "clareza 5s"],
  ];
  const scoreDiffs = [];
  for (const [k, label] of scoreFields) {
    const va = Number(vA[k]);
    const vb = Number(vB[k]);
    if (Number.isFinite(va) || Number.isFinite(vb)) {
      scoreDiffs.push({
        metric: k,
        label,
        before: Number.isFinite(va) ? va : null,
        after: Number.isFinite(vb) ? vb : null,
      });
    }
  }
  return { changes, scoreDiffs };
}

/**
 * Prompt de regeneração de UM card (diferente da geração em lote).
 */
export function buildCardRegenerationPrompt({
  fullScript = [],
  previousLine = "",
  currentLine = "",
  nextLine = "",
  globalContext = {},
  currentProposal = {},
  currentValidation = {},
  selectedQuickFixes = [],
  customInstruction = "",
  rejectionReasons = [],
  preserveElements = [],
  replaceElements = [],
  editScope = "all",
  mode = "geo",
  fidelity = "balanced",
  placeHint = "",
  countryHint = "",
  eraHint = "",
  language = "pt",
} = {}) {
  const collageMode = normalizeCollageMode(mode);
  const langNote =
    language === "en"
      ? "Respond in English inside JSON string values."
      : "Responda em português brasileiro nos valores de string do JSON.";

  const scriptList = (Array.isArray(fullScript) ? fullScript : [])
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n");

  const fixLines = (Array.isArray(selectedQuickFixes) ? selectedQuickFixes : [])
    .map((id) => QUICK_FIX_RULES[id] || id)
    .filter(Boolean);

  const scopeNote =
    {
      all: "Pode revisar a proposta visual completa, mas preserve elementos obrigatórios.",
      visualProposal:
        "Altere principalmente a proposição/composição visual; preserve objects se possível.",
      objects:
        "Altere principalmente key_objects/objects; preserve o sentido da composição.",
      assembly:
        "Altere SOMENTE assembly_order/assemblySteps; preserve objects, entities e proposição.",
      geo_precision:
        "Foque em precisão geográfica (posições, escala, direção, fronteiras); preserve estilo.",
      composition:
        "Ajuste composição espacial; preserve entidades e objetos principais.",
      transition:
        "Ajuste continuityFromPrevious / transitionToNext e montagem de transição.",
      labels: "Ajuste apenas editorOverlayLabels; sem texto na imagem gerada.",
      style:
        "Ajuste paleta e textura paper-collage; preserve conteúdo semântico.",
    }[editScope] || "Revise o necessário para corrigir o problema.";

  const modeBlock =
    collageMode === "geo"
      ? `MODO GEO/MAPAS:
- Preserve lugares, países, rios, continentes, direções, escalas, fronteiras, períodos e relações espaciais.
- NÃO substitua entidades geográficas concretas por objetos abstratos (balança, pena, ferro, fita genérica).
- Preferir visualMode: literal | map_based | comparative | process | causal | hybrid.
- generatedImageText=false; identificações em editorOverlayLabels.`
      : `MODO EDITORIAL:
- Metáfora paper-collage afiada, 3–6 objetos grandes separáveis.
- Sem tipografia legível na imagem.
- Se a instrução pedir mais literal, reduza abstração excessiva.`;

  return `Você está REVISANDO uma proposta visual já existente para um vídeo educativo em paper collage (B-roll 5s, 9:16).

${langNote}

## REGRAS DE REVISÃO
- NÃO crie uma cena completamente diferente sem necessidade.
- Preserve os elementos listados em preserveElements (obrigatórios).
- Corrija exatamente os problemas apontados (rejectionReasons + customInstruction + quickFixes).
- A proposta deve continuar coerente com o roteiro completo, a linha anterior e a linha seguinte.
- Escopo de edição: ${editScope} — ${scopeNote}
- Retorne APENAS JSON válido de UM item (não reescreva o lote inteiro).

${modeBlock}

Fidelidade desejada: ${fidelity}

## ROTEIRO COMPLETO
${scriptList || "(não informado)"}

## CONTEXTO DAS LINHAS
previousLine: ${previousLine || "(início)"}
currentLine: ${currentLine || currentProposal.line || ""}
nextLine: ${nextLine || "(fim)"}

## CONTEXTO GLOBAL (scriptAnalysis)
${JSON.stringify(globalContext || {}, null, 0)}

## CONTEXTO OPCIONAL DO USUÁRIO
Local/POI: ${placeHint || "—"}
País/Região: ${countryHint || "—"}
Época: ${eraHint || "—"}

## PROPOSTA ATUAL (não descartar sem motivo)
${JSON.stringify(
  {
    id: currentProposal.id,
    line: currentProposal.line || currentLine,
    mode: currentProposal.mode || collageMode,
    core_meaning: currentProposal.core_meaning,
    emotion: currentProposal.emotion,
    visual_proposition: currentProposal.visual_proposition,
    place_name: currentProposal.place_name,
    region: currentProposal.region,
    country: currentProposal.country,
    map_type: currentProposal.map_type,
    era: currentProposal.era,
    key_objects: currentProposal.key_objects,
    background_color: currentProposal.background_color,
    accent_colors: currentProposal.accent_colors,
    assembly_order: currentProposal.assembly_order,
    action_verb: currentProposal.action_verb,
    lineAnalysis: currentProposal.lineAnalysis,
    visualProposal: currentProposal.visualProposal,
  },
  null,
  0
)}

## VALIDAÇÃO ATUAL
${JSON.stringify(currentValidation || currentProposal.validation || {}, null, 0)}

## AJUSTES RÁPIDOS SELECIONADOS
${fixLines.length ? fixLines.map((x) => `- ${x}`).join("\n") : "- (nenhum)"}

## MOTIVOS DE REJEIÇÃO
${
  (Array.isArray(rejectionReasons) ? rejectionReasons : []).length
    ? rejectionReasons.map((r) => `- ${r}`).join("\n")
    : "- (nenhum)"
}

## INSTRUÇÃO PERSONALIZADA
${customInstruction || "(nenhuma)"}

## PRESERVE (obrigatório na nova versão)
${
  (Array.isArray(preserveElements) ? preserveElements : []).length
    ? preserveElements.map((p) => `- ${p}`).join("\n")
    : "- (derivar da linha e entidades)"
}

## REPLACE / REMOVER
${
  (Array.isArray(replaceElements) ? replaceElements : []).length
    ? replaceElements.map((p) => `- ${p}`).join("\n")
    : "- (nenhum)"
}

## SAÍDA (um único item)
{
  "item": {
    "id": "${currentProposal.id || "c01"}",
    "line": ${JSON.stringify(currentLine || currentProposal.line || "")},
    "mode": "${collageMode}",
    "core_meaning": "",
    "emotion": "",
    "visual_proposition": "",
    "place_name": "",
    "region": "",
    "country": "",
    "map_type": "",
    "era": "",
    "key_objects": ["", "", ""],
    "background_color": { "name": "", "hex": "#RRGGBB" },
    "accent_colors": ["#...", "#..."],
    "assembly_order": ["1...", "2...", "3..."],
    "action_verb": "",
    "lineAnalysis": {
      "plainMeaning": "",
      "geographicEntities": [],
      "requiredVisualAnchors": [],
      "recommendedVisualMode": "literal"
    },
    "visualProposal": {
      "visualMode": "literal",
      "primarySubject": "",
      "semanticAnchors": [],
      "supportingMetaphor": "",
      "composition": "",
      "objects": [],
      "assemblySteps": [],
      "editorOverlays": []
    },
    "generatedImageText": false,
    "editorOverlayLabels": []
  },
  "changes": ["lista curta do que mudou"],
  "warnings": []
}`;
}

/**
 * Parse resposta de regeneração de um card + validação.
 */
export function parseCardRegenerationResponse(
  raw,
  {
    currentItem = {},
    currentLine = "",
    mode = "geo",
    fidelity = "balanced",
    preserveElements = [],
  } = {}
) {
  let text = String(raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  const src =
    (data?.item && typeof data.item === "object" && data.item) ||
    (Array.isArray(data?.items) && data.items[0]) ||
    (data && !data.item && data.visual_proposition ? data : null) ||
    {};

  const line = String(currentLine || currentItem.line || src.line || "").trim();
  const collageMode = normalizeCollageMode(
    src.mode || currentItem.mode || mode
  );

  let candidate;
  if (collageMode === "geo") {
    const batch = parseSemanticDirectorResponse(
      JSON.stringify({
        scriptAnalysis: { domain: "geografia" },
        items: [
          {
            ...src,
            id: currentItem.id || src.id || "c01",
            line,
            mode: "geo",
          },
        ],
      }),
      [line],
      { mode: "geo", fidelity }
    );
    candidate = batch.items[0] || {};
  } else {
    const batch = parseCollageMetaphorResponse(
      JSON.stringify({
        items: [
          {
            ...src,
            id: currentItem.id || src.id || "c01",
            line,
            mode: "editorial",
            key_objects:
              src.key_objects ||
              src.visualProposal?.objects ||
              currentItem.key_objects,
            visual_proposition:
              src.visual_proposition ||
              src.visualProposal?.composition ||
              currentItem.visual_proposition,
          },
        ],
      }),
      [line],
      { mode: "editorial" }
    );
    candidate = batch.items[0] || {};
    candidate.visualProposal = src.visualProposal || {
      visualMode: "abstract",
      primarySubject: candidate.visual_proposition,
      composition: candidate.visual_proposition,
      objects: candidate.key_objects || [],
      semanticAnchors: preserveElements || [],
      assemblySteps: candidate.assembly_order || [],
    };
    candidate.lineAnalysis = src.lineAnalysis || analyzeLineLocally(line, 0);
  }

  candidate = {
    ...candidate,
    id: currentItem.id || candidate.id,
    line,
    mode: collageMode,
    status: "pending",
    gate: Number(currentItem.gate) || 1,
  };

  // Força âncoras preservadas na validação
  const lineAnalysis = {
    ...(candidate.lineAnalysis || analyzeLineLocally(line, 0)),
    requiredVisualAnchors: [
      ...new Set([
        ...(candidate.lineAnalysis?.requiredVisualAnchors || []),
        ...(Array.isArray(preserveElements) ? preserveElements : []),
      ]),
    ].slice(0, 12),
  };
  if (preserveElements?.length) {
    const ents = [
      ...new Set([
        ...(lineAnalysis.geographicEntities || []),
        ...preserveElements.filter((p) =>
          /[A-ZÁÉÍÓÚÂÊÔÃÕÀÜ]/.test(String(p)[0] || "")
        ),
      ]),
    ];
    lineAnalysis.geographicEntities = ents;
  }
  candidate.lineAnalysis = lineAnalysis;

  const visualProposal = candidate.visualProposal || {
    visualMode: collageMode === "geo" ? "literal" : "abstract",
    primarySubject: candidate.visual_proposition,
    objects: candidate.key_objects || [],
    composition: candidate.visual_proposition,
    semanticAnchors: preserveElements || [],
    assemblySteps: candidate.assembly_order || [],
  };
  candidate.visualProposal = visualProposal;

  const validation = validateVisualProposal({
    lineAnalysis,
    visualProposal,
  });
  candidate.validation = validation;
  candidate.approvalStatus = "pending";

  const { changes, scoreDiffs } = summarizeCardChanges(currentItem, candidate);
  const llmChanges = Array.isArray(data?.changes)
    ? data.changes.map(String)
    : [];
  const warnings = Array.isArray(data?.warnings)
    ? data.warnings.map(String)
    : [];

  return {
    cardId: candidate.id,
    previousVersion: snapshotCardVersion(currentItem, {
      version: Number(currentItem.activeVersion) || 1,
    }),
    candidateVersion: candidate,
    validation,
    changes: [...new Set([...llmChanges, ...changes])],
    scoreDiffs,
    warnings,
  };
}

/**
 * Lista de elementos candidatas a "preservar" a partir do card atual.
 */
export function listPreservableElements(item = {}) {
  const set = new Set();
  for (const x of item.lineAnalysis?.geographicEntities || [])
    set.add(String(x));
  for (const x of item.lineAnalysis?.requiredVisualAnchors || [])
    set.add(String(x));
  for (const x of item.visualProposal?.semanticAnchors || [])
    set.add(String(x));
  for (const x of item.visualProposal?.objects || item.key_objects || []) {
    set.add(String(x));
  }
  if (item.place_name) set.add(String(item.place_name));
  if (item.country) set.add(String(item.country));
  if (item.map_type) set.add(String(item.map_type));
  return [...set].filter((s) => s && s.length > 1).slice(0, 16);
}

/** @deprecated use buildCardRegenerationPrompt */
export function buildSingleLineRegenPrompt(opts = {}) {
  return buildCardRegenerationPrompt({
    currentLine: opts.line,
    globalContext: opts.scriptAnalysis,
    customInstruction: opts.instruction,
    fidelity: opts.fidelity || "balanced",
    mode: "geo",
  });
}
