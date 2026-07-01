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
  correr: "streaming",
  nadando: "swimming",
  nada: "swimming",
  ataca: "attacking",
  gira: "spinning",
  oscila: "oscillating wildly",
  balança: "swaying",
  balanca: "swaying",
  acumular: "pooling",
  correr: "streaming",
  fluir: "flowing",
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
};

const TERM_PT_EN = {
  triangular: "triangular",
  fluido: "fluid flow",
  água: "water flow",
  agua: "water flow",
  vento: "airflow",
  ar: "airflow",
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
    if (scanned.includes(key)) {
      found.push(glossary[pt]);
      scanned = scanned.replace(key, " ");
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
    if (/^[A-Za-z0-9][A-Za-z0-9\s.-]*$/.test(noun) && !subjects.includes(noun)) {
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
  if (/\b(ponte|city|paisagem|horizon|drone|aerial)\b/.test(lower)) {
    return "wide aerial shot";
  }
  if (/\b(multidão|crowd|exército|exercito)\b/.test(lower)) {
    return "wide shot";
  }
  return "cinematic medium shot";
}

function buildVisualFocalDescription(narration = "", anchors = {}) {
  const subjects = collectEnglishSubjects(narration, anchors);
  const modifiers = collectSceneModifiers(narration);
  const action = anchors.action;
  const shot = inferShotType(narration, subjects);

  const primary = subjects[0] || "subject";
  const modPrefix = modifiers.length ? `${modifiers[0]} ` : "";
  const detailParts = [
    ...modifiers.slice(1),
    ...subjects.slice(1),
  ].filter(Boolean);
  const actionPart = action ? ` with ${action}` : "";
  const detailPart = detailParts.length ? `, ${detailParts.join(", ")}` : "";

  if (subjects.length || modifiers.length || action) {
    return `${shot} of ${modPrefix}${primary}${actionPart}${detailPart}`;
  }
  return `${shot} of the exact subject described in this scene`;
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

  if (isVideo) {
    return `Photorealistic ${focal}. Exact subject and motion from this scene — not a generic substitute. Documentary science style, dramatic lighting, sharp motion detail, no text, max 10 seconds.`;
  }
  return `Photorealistic 2k ${focal}. Exact subject from this scene — not a generic alternative. Documentary science style, dramatic lighting, sharp detail, no text.`;
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