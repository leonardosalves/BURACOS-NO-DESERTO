import { resolveStockSearchQuery } from "./stockSearchQuery.js";
import { isVideoSceneType } from "./shared/mediaTypes.js";
import { stripAccents } from "./shared/commonUtils.js";

export const VISUAL_PROMPT_SPECIFICITY_RULES = `
ESPECIFICIDADE VISUAL (CRÍTICO — imagem E vídeo):
- O campo "prompt" é SEMPRE descrição visual em INGLÊS — NUNCA copie/cole narration_text no prompt.
- PROIBIDO: "illustrating: O segredo está no bico..." ou qualquer trecho da narração em português dentro do prompt.
- Traduza a ideia da cena para inglês visual: sujeito nomeado + ação + enquadramento (close-up, macro, wide shot).
- Se a narração cita bico triangular e fluxo de fluido → "macro close-up of triangular beak with fluid streaming along lateral edges".
- Se cita espécie (albatroz, falcão) → nome comum/científico em inglês + ação.
- stock_query: 2-5 palavras em inglês com sujeito específico + ação; nunca português.
- Vídeo IA: mesma regra — sujeito nomeado + movimento; prompt 100% em inglês.

FIDELIDADE AO REAL (imagem e vídeo):
- Se o assunto EXISTE na vida real (lugar, máquina, animal, pessoa, monumento, evento), peça representação fiel ao real — estilo documentário/foto de arquivo — NÃO invente cena fictícia sobre o tema.
- PROIBIDO substituir por "generic spaceship", "mysterious ancient structure" quando a narração nomeia o objeto real.
- Nomeie o sujeito real + aparência conhecida + "documentary photorealistic" / "archival footage style" quando couber.`;

const PT_STOPWORDS = new Set([
  "sobre",
  "quando",
  "porque",
  "entre",
  "desde",
  "ainda",
  "muito",
  "pouco",
  "todo",
  "toda",
  "todos",
  "todas",
  "esse",
  "essa",
  "isso",
  "aquilo",
  "onde",
  "como",
  "mais",
  "menos",
  "cada",
  "outro",
  "outra",
  "mesmo",
  "mesma",
  "depois",
  "antes",
  "então",
  "assim",
  "apenas",
  "sempre",
  "nunca",
  "você",
  "voce",
  "eles",
  "elas",
  "nosso",
  "nossa",
  "seu",
  "sua",
  "segredo",
  "está",
  "esta",
  "faz",
  "sem",
  "nao",
  "não",
  "que",
  "para",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "com",
  "uma",
  "uns",
]);

const GENERIC_PROMPT_PATTERNS = [
  /\b(a |an )?(random|generic|some)\s+(bird|animal|person|building|fish|car|plane|ship)\b/i,
  /\b(bird diving|a bird|random bird|generic bird|any bird)\b/i,
  /\bcinematic scene illustrating\b/i,
  /\billustrating:\s*/i,
  /\brelated to the topic\b/i,
  /\bthe topic\b/i,
  /\bdocumentary scene illustrating\b/i,
];

const SPECIES_PT_EN = {
  albatroz: "wandering albatross",
  "falcão-peregrino": "peregrine falcon",
  "falcao-peregrino": "peregrine falcon",
  peregrino: "peregrine falcon",
  atobá: "brown booby",
  atoba: "brown booby",
  máscara: "northern gannet",
  mascara: "northern gannet",
  "ganso-patola": "northern gannet",
  pelicano: "brown pelican",
  garça: "heron",
  garca: "heron",
  coruja: "owl",
  águia: "eagle",
  aguia: "eagle",
  tubarão: "shark",
  tubarao: "shark",
  baleia: "whale",
  golfinho: "dolphin",
  tigre: "tiger",
  leão: "lion",
  leao: "lion",
  elefante: "elephant",
  lobo: "wolf",
  urso: "bear",
  pinguim: "penguin",
  corvo: "crow",
  andorinha: "swallow",
};

const ACTION_PT_EN = {
  mergulha: "plunge-diving",
  mergulhão: "plunge-diving",
  mergulhao: "plunge-diving",
  voa: "flying",
  voando: "flying",
  cai: "falling",
  caiu: "falling",
  desaba: "collapsing",
  desabou: "collapsed",
  explode: "exploding",
  explodiu: "exploded",
  quebra: "breaking apart",
  quebrou: "breaking apart",
  corre: "moving fast",
  correndo: "running",
  nadando: "swimming",
  nada: "swimming",
  ataca: "attacking",
  gira: "spinning",
  giraram: "rotating",
  oscila: "oscillating wildly",
  balança: "swaying",
  balanca: "swaying",
  acumular: "pooling",
  fluir: "flowing",
  arrastaram: "dragging",
  arrastou: "dragging",
  arrastar: "dragging",
  moveram: "moving",
  mover: "moving",
  moveu: "moving",
  cortaria: "cutting",
  cortou: "cutting",
  demolir: "demolishing",
  demoliu: "demolished",
  construiu: "building",
  construir: "constructing",
  expandir: "expanding",
  expandiu: "expanding",
  ergueu: "lifting",
  erguer: "lifting",
  levantou: "raising",
  transportou: "transporting",
  transportar: "transporting",
  repetiu: "repeating",
  manteve: "maintaining",
  funcionando: "operating",
  trabalharam: "working",
  trabalhando: "working",
};

const OBJECT_PT_EN = {
  ponte: "bridge",
  navio: "ship",
  avião: "airplane",
  aviao: "airplane",
  trem: "train",
  castelo: "castle",
  templo: "temple",
  vulcão: "volcano",
  vulcao: "volcano",
  iceberg: "iceberg",
  glaciar: "glacier",
  cratera: "crater",
  foguete: "rocket",
  satélite: "satellite",
  satelite: "satellite",
  bico: "beak",
  asa: "wing",
  asas: "wings",
  pena: "feather",
  penas: "feathers",
  motor: "engine",
  hélice: "propeller",
  helice: "propeller",
  prédio: "building",
  predio: "building",
  edifício: "building",
  edificio: "building",
  casa: "house",
  cidade: "city",
  rua: "street",
  estrada: "road",
  torre: "tower",
  usina: "power plant",
  fábrica: "factory",
  fabrica: "factory",
  barragem: "dam",
  túnel: "tunnel",
  tunel: "tunnel",
  muro: "wall",
  pilar: "pillar",
  coluna: "column",
  viga: "beam",
  fundação: "foundation",
  fundacao: "foundation",
  trilho: "rail",
  trilhos: "rails",
  telefônica: "telephone company building",
  telefonica: "telephone company building",
  escola: "school",
  igreja: "church",
  palácio: "palace",
  palacio: "palace",
  pirâmide: "pyramid",
  piramide: "pyramid",
  estátua: "statue",
  estatua: "statue",
  monumento: "monument",
  represa: "dam",
  rio: "river",
  montanha: "mountain",
  deserto: "desert",
  floresta: "forest",
  oceano: "ocean",
  ilha: "island",
  caverna: "cave",
  submarino: "submarine",
  helicóptero: "helicopter",
  helicoptero: "helicopter",
  caminhão: "truck",
  caminhao: "truck",
  guindaste: "crane",
  escavadeira: "excavator",
  máquina: "machine",
  maquina: "machine",
  sistema: "system",
  bloco: "block",
};

const TERM_PT_EN = {
  triangular: "triangular",
  fluido: "fluid flow",
  água: "water flow",
  agua: "water flow",
  vento: "airflow",
  lateral: "lateral edge",
  laterais: "lateral edges",
  frente: "front edge",
  pressão: "air pressure",
  pressao: "air pressure",
  aerodinâmica: "aerodynamic",
  aerodinamica: "aerodynamic",
  turbulência: "turbulence",
  turbulencia: "turbulence",
  estrutura: "structure",
  concreto: "concrete",
  aço: "steel",
  aco: "steel",
  engenheiros: "engineers",
  engenheiro: "engineer",
  funcionários: "workers",
  funcionarios: "workers",
  operários: "workers",
  operarios: "workers",
  toneladas: "tons",
  metros: "meters",
  quilômetros: "kilometers",
  quilometros: "kilometers",
  elétrica: "electrical",
  eletrica: "electrical",
  eletricidade: "electricity",
  hidráulico: "hydraulic",
  hidraulico: "hydraulic",
  subterrâneo: "underground",
  subterraneo: "underground",
  histórica: "historic",
  historica: "historic",
  histórico: "historic",
  historico: "historic",
  antigo: "old",
  moderno: "modern",
  gigante: "massive",
  enorme: "enormous",
  inteiro: "entire",
};

function normalizeText(text = "") {
  return stripAccents(String(text || "").toLowerCase());
}

/** Pré-compila entradas UMA vez no load do módulo — não por cena. */
function compileGlossary(glossary) {
  return Object.entries(glossary)
    .map(([pt, en]) => {
      const key = normalizeText(pt).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return {
        en,
        len: key.length,
        re: new RegExp(
          `(?:^|[\\s,.;:!?()\\[\\]"'])${key}(?=$|[\\s,.;:!?()\\[\\]"'])`
        ),
      };
    })
    .sort((a, b) => b.len - a.len);
}

const COMPILED_ACTIONS = compileGlossary(ACTION_PT_EN);
const COMPILED_OBJECTS = compileGlossary(OBJECT_PT_EN);
const COMPILED_TERMS = compileGlossary(TERM_PT_EN);

const SPECIES_COMPILED = Object.entries(SPECIES_PT_EN).map(([pt, en]) => ({
  key: normalizeText(pt),
  en,
}));
const FALLBACK_STYLE_IMAGE =
  "Documentary science style, dramatic lighting, sharp detail, no text overlay.";
const FALLBACK_STYLE_VIDEO =
  "Documentary science style, dramatic lighting, sharp motion detail, no text overlay, max 10 seconds.";
const FALLBACK_STYLE_MARKER = /Documentary science style, dramatic lighting/i;

function hasPortugueseInPrompt(prompt = "") {
  // Accented characters are a strong Portuguese indicator
  if (/[àáâãéêíóôõúç]/i.test(prompt)) return true;
  // Check for distinctly Portuguese words (3+ chars to avoid "a"/"o" false positives with English)
  // NEVER match single-letter words like "a", "o" — they are also English articles/prepositions
  const ptWords =
    /\b(que|para|pelo|pela|está|esta|esse|essa|isso|como|mais|sobre|quando|porque|entre|desde|ainda|muito|cada|outro|outra|mesmo|mesma|segredo|fluido|bico|onde|você|voce|nosso|nossa|então|entao)\b/i;
  return ptWords.test(prompt);
}

function findSpeciesInNarration(narration = "") {
  const lower = normalizeText(narration);
  let best = null;
  for (const { key, en } of SPECIES_COMPILED) {
    if (lower.includes(key) && (!best || key.length > best.pt.length)) {
      best = { pt: key, en };
    }
  }
  return best;
}

function findLongestGlossaryMatches(narration = "", compiled = []) {
  let scanned = normalizeText(narration);
  const found = [];
  for (const { en, re } of compiled) {
    if (re.test(scanned)) {
      found.push(en);
      scanned = scanned.replace(re, " ");
    }
  }
  return found;
}

function findActionInNarration(narration = "") {
  const matches = findLongestGlossaryMatches(narration, COMPILED_ACTIONS);
  return matches[0] || "";
}

function findObjectsInNarration(narration = "") {
  return findLongestGlossaryMatches(narration, COMPILED_OBJECTS);
}

function collectSceneModifiers(narration = "") {
  return findLongestGlossaryMatches(narration, COMPILED_TERMS);
}

export function extractSceneAnchors(narration = "") {
  const text = String(narration || "").trim();
  const anchors = {
    species: findSpeciesInNarration(text),
    action: findActionInNarration(text),
    objects: findObjectsInNarration(text),
    properNouns: [],
    years: [],
    numbers: [],
  };

  for (const m of text.matchAll(/\b(1\d{3}|20\d{2})\b/g))
    anchors.years.push(m[1]);
  for (const m of text.matchAll(
    /\b(\d+[\d.,]*)\s*(metros?|km|quilômetros?|milhas?|toneladas?|%|graus?)\b/gi
  )) {
    anchors.numbers.push(m[0]);
  }
  for (const m of text.matchAll(
    /\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç-]+(?:\s+(?:de|da|do|dos|das|del|della|e)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç-]+)*)\b/g
  )) {
    const phrase = m[1].trim();
    const prefix = text.slice(0, m.index ?? 0);
    const startsSentence = !prefix.trim() || /[.!?]\s*$/.test(prefix);
    if (startsSentence && !/\s/.test(phrase)) continue;
    if (
      phrase.length >= 4 &&
      !PT_STOPWORDS.has(phrase.split(/\s+/)[0].toLowerCase())
    ) {
      anchors.properNouns.push(phrase);
    }
  }

  return anchors;
}

function collectEnglishSubjects(narration = "", anchors = {}) {
  const subjects = [];
  if (anchors.species?.en) subjects.push(anchors.species.en);
  subjects.push(...(anchors.objects || []));
  for (const noun of anchors.properNouns || []) {
    // Accept proper nouns with accented characters (Indianápolis, São Paulo, etc.)
    if (noun.length >= 3 && !subjects.includes(noun)) {
      subjects.push(noun);
    }
  }
  return [...new Set(subjects.filter(Boolean))];
}

function isPromptNarrationPaste(prompt = "", narration = "") {
  const p = normalizeText(prompt);
  const n = normalizeText(narration);
  if (!n || !p) return false;
  if (/illustrating:/i.test(prompt)) return true;
  if (hasPortugueseInPrompt(prompt)) return true;

  const words = n.split(/\s+/).filter((w) => w.length >= 5);
  if (words.length >= 2) {
    const matched = words.filter((w) => p.includes(w));
    if (matched.length >= Math.min(3, words.length)) return true;
  }
  return false;
}

function inferShotType(narration = "", subjects = []) {
  const lower = normalizeText(narration);
  if (
    /\b(bico|macro|close|detalhe|textura)\b/.test(lower) ||
    subjects.includes("beak")
  ) {
    return "macro close-up";
  }
  if (
    /\b(ponte|cidade|city|paisagem|horizon|drone|aerial|rua|estrada|panorama)\b/.test(
      lower
    )
  ) {
    return "wide aerial shot";
  }
  if (
    /\b(multidao|crowd|exercito|funcionarios|operarios|trabalhadores|pessoas)\b/.test(
      lower
    )
  ) {
    return "wide shot";
  }
  if (
    /\b(predio|edificio|torre|fabrica|usina|igreja|palacio|monumento|escola|telefonica)\b/.test(
      lower
    )
  ) {
    return "cinematic wide shot";
  }
  if (/\b(interior|dentro|sala|escritorio|laboratorio)\b/.test(lower)) {
    return "cinematic interior shot";
  }
  return "cinematic medium shot";
}

function inferKnownVisualMechanism(narration = "") {
  const lower = normalizeText(narration);
  if (
    /\bbloque\w*\b.*\bqueda livre\b.*\bcorda\b.*\barrebent\w*\b/.test(lower)
  ) {
    return "cutaway close-up of a historically accurate mechanical safety brake snapping into a toothed guide rail as the primary load-bearing rope breaks, visibly arresting the suspended platform before it can enter free fall";
  }
  return "";
}

function buildVisualFocalDescription(narration = "", anchors = {}) {
  const knownMechanism = inferKnownVisualMechanism(narration);
  if (knownMechanism) return knownMechanism;

  const subjects = collectEnglishSubjects(narration, anchors);
  const modifiers = collectSceneModifiers(narration);
  const normalizedNarration = normalizeText(narration);
  const hypotheticalFlying =
    /\b(temia\w*|temendo|medo|receio|achavam|acreditavam|parecia|poderia|pudesse|como se)\b/.test(
      normalizedNarration
    ) &&
    /\b(voa|voando|voar|voasse|levitar|levitasse)\b/.test(normalizedNarration);
  const action = hypotheticalFlying ? "" : anchors.action;
  const shot = inferShotType(narration, subjects);

  // Filter out modifiers that are just noise without matching subjects
  const meaningfulModifiers = modifiers.filter((m) => {
    // Don't use standalone adjectives like "airflow" or "water flow" without a real subject
    if (
      !subjects.length &&
      ["airflow", "water flow", "fluid flow", "air pressure"].includes(m)
    )
      return false;
    return true;
  });

  const primary = subjects[0] || null;
  const detailParts = [...meaningfulModifiers, ...subjects.slice(1)].filter(
    Boolean
  );
  const actionPart = action ? ` ${action}` : "";

  // If we have a proper subject, build a coherent description
  if (primary) {
    const details = detailParts.length ? `, ${detailParts.join(", ")}` : "";
    const realityConstraint = hypotheticalFlying
      ? ". The building remains firmly grounded and structurally realistic; show the fear through strong wind and worried observers, never a flying or levitating building"
      : "";
    return `${shot} of ${primary}${actionPart}${details}${realityConstraint}`;
  }

  // If we only have action or modifiers but no subject, build with what we have
  if (action && meaningfulModifiers.length) {
    return `${shot} of ${meaningfulModifiers[0]} ${action}`;
  }
  if (action) {
    return `${shot}, ${action}`;
  }
  if (meaningfulModifiers.length) {
    return `${shot} of ${meaningfulModifiers.join(", ")}`;
  }

  // Nunca reutilize palavras portuguesas como se fossem uma descrição em inglês.
  // Este marcador seguro continua classificado como fallback e obriga reparo por IA.
  return `${shot} of a historically plausible physical mechanism at the critical moment of action`;
}

/** Detecta prompts gerados pelo fallback buildSceneSpecificPrompt (glossário local). */
export function isSceneSpecificFallbackPrompt(prompt = "") {
  return (
    /^Photorealistic /i.test(String(prompt).trim()) &&
    FALLBACK_STYLE_MARKER.test(prompt)
  );
}

export function isPromptTooGeneric(prompt = "", narration = "") {
  const p = String(prompt || "").trim();
  const n = String(narration || "").trim();
  if (!n) return !p;
  if (!p) return true;
  if (isPromptNarrationPaste(p, n)) return true;
  if (GENERIC_PROMPT_PATTERNS.some((re) => re.test(p))) return true;

  const species = findSpeciesInNarration(n);
  if (species) {
    const promptNorm = normalizeText(p);
    const speciesTokens = species.en.split(/\s+/).filter((t) => t.length >= 4);
    if (!speciesTokens.some((tok) => promptNorm.includes(normalizeText(tok))))
      return true;
  }

  if (
    /\b(mergulh|pássaro|passaro|ave|animal|bico)\b/i.test(n) &&
    /\b(a bird|bird diving|random bird|generic bird|some bird)\b/i.test(p)
  ) {
    return true;
  }

  return false;
}

export function buildSceneSpecificPrompt(vp = {}) {
  const narration = String(vp.narration_text || vp.narracao || "").trim();
  const anchors = extractSceneAnchors(narration);
  const focal = buildVisualFocalDescription(narration, anchors);
  const isVideo = isVideoSceneType(vp.type);
  // Overlays são compostos depois no Remotion; nunca devem ser queimados na mídia-fonte.
  const hasTextOverlay = !!(vp.text_overlay || vp.impact_text);
  const langNote = hasTextOverlay
    ? " Leave clean negative space for a short overlay added later in post-production; do not render words, letters, subtitles or labels in the source media."
    : " No readable text, subtitles, labels, logos or watermarks in the source media.";

  if (isVideo) {
    return `Photorealistic ${focal}. ${FALLBACK_STYLE_VIDEO}${langNote}`;
  }
  return `Photorealistic 2k ${focal}. ${FALLBACK_STYLE_IMAGE}${langNote}`;
}

function isStockGeneric(stock = "") {
  const s = String(stock || "")
    .trim()
    .toLowerCase();
  return (
    !s ||
    [
      "cinematic",
      "documentary",
      "bird",
      "animal",
      "nature",
      "video",
      "image",
    ].includes(s)
  );
}

/** Corrige prompts que colam narração ou ficam genéricos. */
export function enrichVisualPromptsSpecificity(
  visualPrompts = [],
  options = {}
) {
  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0)
    return visualPrompts;

  return visualPrompts.map((vp) => {
    const narration = String(vp.narration_text || vp.narracao || "").trim();
    const currentPrompt = String(vp.prompt || vp.visual_prompt || "").trim();
    const needsPromptFix =
      !currentPrompt ||
      isPromptTooGeneric(currentPrompt, narration) ||
      isPromptNarrationPaste(currentPrompt, narration);

    if (!needsPromptFix) {
      const stock = String(vp.stock_query || "").trim();
      if (stock && !isStockGeneric(stock)) return vp;
      return {
        ...vp,
        stock_query: resolveStockSearchQuery(vp, options),
      };
    }

    const prompt = buildSceneSpecificPrompt(vp);
    const enriched = { ...vp, prompt, stock_query: "" };
    const stock_query = resolveStockSearchQuery(enriched, options);

    return { ...enriched, stock_query };
  });
}
