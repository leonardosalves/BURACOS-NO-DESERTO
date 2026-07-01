/**
 * Ancora prompts visuais (imagem e vídeo) no trecho exato da narração da cena.
 * Evita prompts genéricos ("a bird") quando a narração cita espécie, objeto ou ação específica.
 */

import { resolveStockSearchQuery } from "./stockSearchQuery.js";

export const VISUAL_PROMPT_SPECIFICITY_RULES = `
ESPECIFICIDADE VISUAL (CRÍTICO — imagem E vídeo):
- Cada "prompt" deve retratar EXATAMENTE o que narration_text descreve naquela cena — mesma espécie, objeto, lugar, pessoa, data ou ação.
- PROIBIDO substituir por genéricos: "a bird" quando a narração diz "falcão-peregrino"; "a bridge" quando diz "Tacoma Narrows"; "ancient ruins" quando cita Pompeii.
- Se a narração nomeia espécie (pássaro, animal, peixe), inclua o nome comum ou científico em inglês no prompt (ex.: "northern gannet diving", "peregrine falcon stoop").
- Se a narração descreve ação (mergulha, cai, explode, voa), o prompt deve mostrar ESSA ação no sujeito correto.
- stock_query: 2-5 palavras em inglês com o sujeito específico + ação (ex.: "gannet plunge dive", não só "bird").
- Para vídeo IA: mesma regra — sujeito nomeado + movimento descrito na cena; nunca "random" ou "generic".
- Leia narration_text palavra por palavra antes de escrever prompt e stock_query.`;

const PT_STOPWORDS = new Set([
  "sobre", "quando", "porque", "entre", "desde", "ainda", "muito", "pouco", "todo", "toda",
  "todos", "todas", "esse", "essa", "isso", "aquilo", "onde", "como", "mais", "menos", "cada",
  "outro", "outra", "mesmo", "mesma", "depois", "antes", "então", "assim", "apenas", "sempre",
  "nunca", "você", "voce", "eles", "elas", "nosso", "nossa", "seu", "sua",
]);

const GENERIC_PROMPT_PATTERNS = [
  /\b(a |an )?(random|generic|some)\s+(bird|animal|person|building|fish|car|plane|ship)\b/i,
  /\b(bird diving|a bird|random bird|generic bird|any bird)\b/i,
  /\bcinematic scene illustrating\b/i,
  /\brelated to the topic\b/i,
  /\bthe topic\b/i,
  /\bdocumentary scene\b/i,
  /\billustrating:\s*[^.]{0,20}\.\s*documentary style/i,
];

const SPECIES_PT_EN = {
  "albatroz": "wandering albatross",
  "falcão-peregrino": "peregrine falcon",
  "falcao-peregrino": "peregrine falcon",
  "peregrino": "peregrine falcon",
  "atobá": "brown booby",
  "atoba": "brown booby",
  "máscara": "northern gannet",
  "mascara": "northern gannet",
  "ganso-patola": "northern gannet",
  "pelicano": "brown pelican",
  "garça": "heron",
  "garca": "heron",
  "coruja": "owl",
  "águia": "eagle",
  "aguia": "eagle",
  "tubarão": "shark",
  "tubarao": "shark",
  "baleia": "whale",
  "golfinho": "dolphin",
  "tigre": "tiger",
  "leão": "lion",
  "leao": "lion",
  "elefante": "elephant",
  "lobo": "wolf",
  "urso": "bear",
};

const ACTION_PT_EN = {
  mergulha: "plunge-diving into the ocean",
  mergulhão: "plunge-diving",
  mergulhao: "plunge-diving",
  voa: "flying in flight",
  voando: "flying",
  cai: "falling",
  caiu: "falling",
  desaba: "collapsing",
  desabou: "collapsed",
  explode: "exploding",
  explodiu: "exploded",
  quebra: "breaking apart",
  quebrou: "breaking apart",
  corre: "running",
  nadando: "swimming",
  nada: "swimming",
  ataca: "attacking",
  gira: "spinning",
  oscila: "oscillating wildly",
  balança: "swaying",
  balanca: "swaying",
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

function findActionInNarration(narration = "") {
  const lower = normalizeText(narration);
  for (const [pt, en] of Object.entries(ACTION_PT_EN)) {
    if (lower.includes(normalizeText(pt))) return en;
  }
  return "";
}

function findObjectsInNarration(narration = "") {
  const lower = normalizeText(narration);
  const found = [];
  for (const [pt, en] of Object.entries(OBJECT_PT_EN)) {
    if (lower.includes(normalizeText(pt))) found.push(en);
  }
  return found;
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
  for (const m of text.matchAll(/["'«"]([^"'»"]{3,80})["'»"]/g)) {
    anchors.properNouns.push(m[1].trim());
  }

  return anchors;
}

function buildEnglishSubjectPhrase(anchors = {}, narration = "") {
  const parts = [];
  if (anchors.species?.en) parts.push(anchors.species.en);
  if (anchors.properNouns?.length) parts.push(anchors.properNouns[0]);
  if (anchors.objects?.length) parts.push(anchors.objects[0]);
  if (parts.length) return parts.join(", ");

  const words = String(narration || "")
    .replace(/[^\w\sà-úÀ-Ú-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !PT_STOPWORDS.has(w.toLowerCase()))
    .slice(0, 4);
  return words.join(" ");
}

function buildEnglishActionPhrase(anchors = {}) {
  if (anchors.action) return anchors.action;
  return "";
}

export function isPromptTooGeneric(prompt = "", narration = "") {
  const p = String(prompt || "").trim();
  const n = String(narration || "").trim();
  if (!n) return !p;
  if (!p) return true;
  if (GENERIC_PROMPT_PATTERNS.some((re) => re.test(p))) return true;

  const species = findSpeciesInNarration(n);
  if (species) {
    const promptNorm = normalizeText(p);
    const speciesTokens = species.en.split(/\s+/).filter((t) => t.length >= 4);
    if (!speciesTokens.some((tok) => promptNorm.includes(normalizeText(tok)))) return true;
  }

  if (/\b(mergulh|pássaro|passaro|ave|animal)\b/i.test(n) && /\b(a bird|bird diving|random bird|generic bird|some bird)\b/i.test(p)) {
    return true;
  }

  const proper = extractSceneAnchors(n).properNouns;
  if (proper.length) {
    const promptNorm = normalizeText(p);
    const hasProper = proper.some((name) => {
      const token = normalizeText(name).split(/\s+/).find((w) => w.length >= 5);
      return token && promptNorm.includes(token);
    });
    if (!hasProper) return true;
  }

  return false;
}

export function buildSceneSpecificPrompt(vp = {}) {
  const narration = String(vp.narration_text || vp.narracao || "").trim();
  const anchors = extractSceneAnchors(narration);
  const subject = buildEnglishSubjectPhrase(anchors, narration);
  const action = buildEnglishActionPhrase(anchors);
  const isVideo = isVideoSceneType(vp.type);

  const focalParts = [subject, action].filter(Boolean);
  const focal = focalParts.length
    ? focalParts.join(" ")
    : narration.slice(0, 140);

  if (isVideo) {
    return `Photorealistic cinematic video of ${focal}. Exact species, object and action from this scene narration — not a generic substitute. Documentary style, dramatic lighting, sharp motion detail, no text, max 10 seconds.`;
  }
  return `Photorealistic 2k cinematic still of ${focal}. Exact species, object and subject from this scene narration — not a generic random alternative. Documentary style, dramatic lighting, sharp detail, no text.`;
}

function isStockGeneric(stock = "") {
  const s = String(stock || "").trim().toLowerCase();
  return !s || ["cinematic", "documentary", "bird", "animal", "nature", "video", "image"].includes(s);
}

/** Corrige prompts e stock_query genéricos com base em narration_text. */
export function enrichVisualPromptsSpecificity(visualPrompts = [], options = {}) {
  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0) return visualPrompts;

  return visualPrompts.map((vp) => {
    const narration = String(vp.narration_text || vp.narracao || "").trim();
    const currentPrompt = String(vp.prompt || vp.visual_prompt || "").trim();
    const needsPromptFix = !currentPrompt || isPromptTooGeneric(currentPrompt, narration);
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