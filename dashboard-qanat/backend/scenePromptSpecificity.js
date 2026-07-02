/**
 * Ancora prompts visuais (imagem e vídeo) no trecho da narração — sem colar o texto da narração.
 * Gera descrição visual em inglês com sujeito/ação/objeto específicos.
 */

import { resolveStockSearchQuery } from "./stockSearchQuery.js";

export const VISUAL_PROMPT_SPECIFICITY_RULES = `
ESPECIFICIDADE VISUAL (CRÍTICO — imagem E vídeo):
- O campo "prompt" é SEMPRE descrição visual em INGLÊS — NUNCA copie/cole narration_text no prompt.
- PROIBIDO: "illustrating: O segredo está no bico..." ou qualquer trecho da narração em português dentro do prompt.
- Traduza a ideia da cena para inglês visual: sujeito nomeado + ação + enquadramento (close-up, macro, wide shot).
- Se a narração cita bico triangular e fluxo de fluido → "macro close-up of triangular beak with fluid streaming along lateral edges".
- Se cita espécie (albatroz, falcão) → nome comum/científico em inglês + ação.
- stock_query: 2-5 palavras em inglês com sujeito específico + ação; nunca português.
- Vídeo IA: mesma regra — sujeito nomeado + movimento; prompt 100% em inglês.`;

const PT_STOPWORDS = new Set([
  "sobre", "quando", "porque", "entre", "desde", "ainda", "muito", "pouco", "todo", "toda",
  "todos", "todas", "esse", "essa", "isso", "aquilo", "onde", "como", "mais", "menos", "cada",
  "outro", "outra", "mesmo", "mesma", "depois", "antes", "então", "assim", "apenas", "sempre",
  "nunca", "você", "voce", "eles", "elas", "nosso", "nossa", "seu", "sua", "segredo", "está", "esta",
  "faz", "sem", "nao", "não", "que", "para", "pelo", "pela", "pelos", "pelas", "com", "uma", "uns",
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

function isVideoSceneType(type = "") {
  const t = String(type || "").toLowerCase();
  return t.includes("vídeo") || t.includes("video") || t.includes("mp4");
}

function normalizeText(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasPortugueseInPrompt(prompt = "") {
  return /[àáâãéêíóôõúç]/i.test(prompt)
    || /\b(o|a|os|as|que|para|pelo|pela|está|esta|segredo|fluido|bico)\b/i.test(prompt);
}

function findSpeciesInNarration(narration = "") {
  const lower = normalizeText(narration);
  let best = null;
  for (const [pt, en] of Object.entries(SPECIES_PT_EN)) {
    const key = normalizeText(pt);
    if (lower.includes(key) && (!best || key.length > best.pt.length)) {
      best = { pt, en };
    }
  }
  return best;
}

function findLongestGlossaryMatches(narration = "", glossary = {}) {
  const lower = normalizeText(narration);
  const found = [];
  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  let scanned = lower;
  for (const pt of keys) {
    const key = normalizeText(pt);
    // Use word boundary to avoid matching "ar" inside "arrastaram" etc.
    const re = new RegExp(`(?:^|[\\s,.;:!?()\\[\\]"'])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s,.;:!?()\\[\\]"'])`);
    if (re.test(scanned)) {
      found.push(glossary[pt]);
      scanned = scanned.replace(re, " ");
    }
  }
  return found;
}

function findActionInNarration(narration = "") {
  const matches = findLongestGlossaryMatches(narration, ACTION_PT_EN);
  return matches[0] || "";
}

function findObjectsInNarration(narration = "") {
  return findLongestGlossaryMatches(narration, OBJECT_PT_EN);
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

  for (const m of text.matchAll(/\b(1\d{3}|20\d{2})\b/g)) anchors.years.push(m[1]);
  for (const m of text.matchAll(/\b(\d+[\d.,]*)\s*(metros?|km|quilômetros?|milhas?|toneladas?|%|graus?)\b/gi)) {
    anchors.numbers.push(m[0]);
  }
  for (const m of text.matchAll(/\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç-]+(?:\s+(?:de|da|do|dos|das|del|della|e)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç-]+)*)\b/g)) {
    const phrase = m[1].trim();
    if (phrase.length >= 4 && !PT_STOPWORDS.has(phrase.split(/\s+/)[0].toLowerCase())) {
      anchors.properNouns.push(phrase);
    }
  }

  return anchors;
}

function collectSceneModifiers(narration = "") {
  return findLongestGlossaryMatches(narration, TERM_PT_EN);
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

function inferShotType(narration = "", terms = []) {
  const lower = normalizeText(narration);
  if (/\b(bico|macro|close|detalhe|textura)\b/.test(lower) || terms.includes("beak")) {
    return "macro close-up";
  }
  if (/\b(ponte|cidade|city|paisagem|horizon|drone|aerial|rua|estrada|panorama)\b/.test(lower)) {
    return "wide aerial shot";
  }
  if (/\b(multidao|crowd|exercito|funcionarios|operarios|trabalhadores|pessoas)\b/.test(lower)) {
    return "wide shot";
  }
  if (/\b(predio|edificio|torre|fabrica|usina|igreja|palacio|monumento|escola|telefonica)\b/.test(lower)) {
    return "cinematic wide shot";
  }
  if (/\b(interior|dentro|sala|escritorio|laboratorio)\b/.test(lower)) {
    return "cinematic interior shot";
  }
  return "cinematic medium shot";
}

function buildVisualFocalDescription(narration = "", anchors = {}) {
  const subjects = collectEnglishSubjects(narration, anchors);
  const modifiers = collectSceneModifiers(narration);
  const action = anchors.action;
  const shot = inferShotType(narration, subjects);

  // Filter out modifiers that are just noise without matching subjects
  const meaningfulModifiers = modifiers.filter((m) => {
    // Don't use standalone adjectives like "airflow" or "water flow" without a real subject
    if (!subjects.length && ["airflow", "water flow", "fluid flow", "air pressure"].includes(m)) return false;
    return true;
  });

  const primary = subjects[0] || null;
  const detailParts = [
    ...meaningfulModifiers,
    ...subjects.slice(1),
  ].filter(Boolean);
  const actionPart = action ? ` ${action}` : "";

  // If we have a proper subject, build a coherent description
  if (primary) {
    const details = detailParts.length ? `, ${detailParts.join(", ")}` : "";
    return `${shot} of ${primary}${actionPart}${details}`;
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

  // Absolute last resort — extract key nouns from narration directly
  const keyWords = extractKeyNounsFromNarration(narration);
  if (keyWords) {
    return `${shot} of ${keyWords}`;
  }
  return `${shot} depicting the scene described in the narration`;
}

/** Extract meaningful nouns from PT narration as a last-resort EN description. */
function extractKeyNounsFromNarration(narration = "") {
  const lower = normalizeText(narration);
  const words = lower.split(/\s+/).filter((w) => w.length >= 5 && !PT_STOPWORDS.has(w));
  // Try to find at least 2-3 meaningful words
  const meaningful = words.slice(0, 4);
  return meaningful.length >= 1 ? meaningful.join(" ") : null;
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
    if (!speciesTokens.some((tok) => promptNorm.includes(normalizeText(tok)))) return true;
  }

  if (/\b(mergulh|pássaro|passaro|ave|animal|bico)\b/i.test(n) && /\b(a bird|bird diving|random bird|generic bird|some bird)\b/i.test(p)) {
    return true;
  }

  return false;
}

export function buildSceneSpecificPrompt(vp = {}) {
  const narration = String(vp.narration_text || vp.narracao || "").trim();
  const anchors = extractSceneAnchors(narration);
  const focal = buildVisualFocalDescription(narration, anchors);
  const isVideo = isVideoSceneType(vp.type);
  // Check if scene has text_overlay or impact_text that should be in Portuguese
  const hasTextOverlay = !!(vp.text_overlay || vp.impact_text);
  const langNote = hasTextOverlay ? " Any visible text/words in the image must be in Portuguese (Brazilian)." : "";

  if (isVideo) {
    return `Photorealistic ${focal}. Documentary science style, dramatic lighting, sharp motion detail, no text overlay, max 10 seconds.${langNote}`;
  }
  return `Photorealistic 2k ${focal}. Documentary science style, dramatic lighting, sharp detail, no text overlay.${langNote}`;
}

function isStockGeneric(stock = "") {
  const s = String(stock || "").trim().toLowerCase();
  return !s || ["cinematic", "documentary", "bird", "animal", "nature", "video", "image"].includes(s);
}

/** Corrige prompts que colam narração ou ficam genéricos. */
export function enrichVisualPromptsSpecificity(visualPrompts = [], options = {}) {
  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0) return visualPrompts;

  return visualPrompts.map((vp) => {
    const narration = String(vp.narration_text || vp.narracao || "").trim();
    const currentPrompt = String(vp.prompt || vp.visual_prompt || "").trim();
    const needsPromptFix = !currentPrompt
      || isPromptTooGeneric(currentPrompt, narration)
      || isPromptNarrationPaste(currentPrompt, narration);

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