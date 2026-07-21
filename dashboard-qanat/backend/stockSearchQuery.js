/**
 * Resolve o termo de busca de stock/B-roll por cena.
 * Prioridade: sujeito visual do PROMPT da cena → stock_query que bata com a cena
 * → tags/narração. Nunca usa título do projeto nem o tema global se a cena mostra outra coisa.
 */

const GENERIC_QUERIES = new Set([
  "cinematic",
  "documentary",
  "documentary scene",
  "video",
  "image",
  "bird",
  "birds",
  "animal",
  "animals",
  "nature",
  "fish",
  "person",
  "people",
  "building",
  "bridge",
  "car",
  "plane",
  "ship",
  "city",
  "street",
  "landscape",
  "background",
  "abstract",
  "technology",
  "energy",
  "industrial",
  "modern",
  "architecture",
  "documentary detail object",
]);

/** Palavras de estilo/câmera — não entram na query de stock */
const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "into",
  "over",
  "under",
  "scene",
  "image",
  "video",
  "shot",
  "still",
  "photograph",
  "photo",
  "view",
  "angle",
  "wide",
  "close",
  "medium",
  "epic",
  "slightly",
  "full",
  "scale",
  "focus",
  "clean",
  "modern",
  "lines",
  "soft",
  "morning",
  "light",
  "high",
  "low",
  "that",
  "this",
  "these",
  "those",
  "their",
  "there",
  "which",
  "while",
  "where",
  "when",
  "about",
  "using",
  "showing",
  "depicting",
  "illustrating",
  "related",
  "style",
  "composition",
  "framing",
  "portrait",
  "landscape",
  "vertical",
  "horizontal",
  "generate",
  "strictly",
  "photorealistic",
  "hyperrealistic",
  "cinematic",
  "documentary",
  "volumetric",
  "dramatic",
  "ethereal",
  "gentle",
  "white",
  "dark",
  "grey",
  "gray",
  "blue",
  "cool",
  "warm",
  "sharp",
  "detail",
  "texture",
  "textures",
  "lighting",
  "highlighting",
  "representing",
  "visually",
  "within",
  "onto",
  "against",
  "across",
  "between",
  "through",
  "toward",
  "around",
  "above",
  "below",
  "behind",
  "before",
  "after",
  "during",
  "without",
  "source",
  "media",
  "overlay",
  "remotion",
  "seconds",
  "motion",
  "camera",
  "aerial",
  "drone",
  "descending",
  "ascending",
  "tracking",
  "dolly",
  "handheld",
  "push",
  "pull",
  "orbit",
  "whip",
  "pan",
  "zoom",
  "crane",
  "timelapse",
  "footage",
  "clip",
  "frame",
  "frames",
  "mobile",
  "widescreen",
  "reveal",
  "revealing",
  "sunlit",
  "sleek",
  "minimalist",
  "singular",
  "bathed",
  "bathe",
  "beautiful",
  "huge",
  "small",
  "large",
  "tiny",
  "ancient",
  "low-angle",
  "high-angle",
  "close-up",
  "establishing",
  "shallow",
  "depth",
  "field",
  "micro-contrast",
  "undertones",
  "tones",
  "watermark",
  "watermarks",
  "borders",
  "logos",
  "post",
  "added",
  "will",
  "been",
  "being",
  "have",
  "has",
  "are",
  "was",
  "were",
  "its",
  "his",
  "her",
  "our",
  "your",
]);

const PT_STOP = new Set([
  "para",
  "como",
  "quando",
  "onde",
  "porque",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "uma",
  "umas",
  "uns",
  "este",
  "esta",
  "esse",
  "essa",
  "isso",
  "aquele",
  "aquela",
  "muito",
  "mais",
  "menos",
  "também",
  "ainda",
  "sobre",
  "entre",
  "desde",
  "depois",
  "antes",
  "durante",
  "sem",
  "com",
  "que",
  "não",
  "nos",
  "nas",
  "dos",
  "das",
  "ele",
  "ela",
  "eles",
  "elas",
  "seu",
  "sua",
  "seus",
  "suas",
  "um",
  "o",
  "a",
  "os",
  "as",
  "de",
  "do",
  "da",
  "em",
  "no",
  "na",
]);

/** Adjetivos de estilo que sozinhos não ajudam stock; em compostos (residential trash) mantemos se há substantivo */
const STYLE_ADJECTIVES = new Set([
  "sleek",
  "minimalist",
  "modern",
  "ancient",
  "beautiful",
  "huge",
  "small",
  "large",
  "tiny",
  "dramatic",
  "epic",
  "soft",
  "clean",
  "bright",
  "dark",
  "cool",
  "warm",
  "industrial",
]);

function normalizeComparable(text = "") {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectRejectTitles({
  projectTitle = "",
  strategyTitle = "",
  rejectTitles = [],
} = {}) {
  const titles = [projectTitle, strategyTitle, ...rejectTitles]
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  return [...new Set(titles)];
}

export function looksLikeProjectTitle(query = "", rejectTitles = []) {
  const q = normalizeComparable(query);
  if (!q || q.length < 10) return false;

  for (const title of rejectTitles) {
    const t = normalizeComparable(title);
    if (!t || t.length < 10) continue;
    if (q === t) return true;
    if (q.includes(t) || t.includes(q)) return true;
  }

  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 7 && /[àáâãéêíóôõúç]/i.test(query)) return true;

  return false;
}

function isGenericQuery(query = "") {
  const lower = normalizeComparable(query);
  if (!lower) return true;
  if (GENERIC_QUERIES.has(lower)) return true;
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 1 && GENERIC_QUERIES.has(words[0])) return true;
  if (words.length <= 2 && words.every((w) => GENERIC_QUERIES.has(w)))
    return true;
  return false;
}

/** Lixo de engenharia visual PRO / render — NUNCA vai para busca de stock. */
const CGI_RENDER_NOISE_RE =
  /\b(unreal(?:\s*engine)?|octane(?:\s*render)?|cgi|3d\s*cgi|3d\s*render|ray[-\s]?trac(?:ed|ing)?|path[-\s]?trac(?:ed|ing)?|global\s+illumination|physically\s+based(?:\s+materials)?|pbr|clean\s+geometry|hyperrealistic(?:\s+3d)?|v[-\s]?ray|cycles|blender|cinema\s*4d|redshift|arnold|midjourney|stable\s*diffusion|runway|seedance|luma\s*ai|volumetric\s+lighting|micro[-\s]?contrast|undertones?)\b/gi;

function isCgiOrRenderJunk(text = "") {
  const t = String(text || "");
  if (!t.trim()) return false;
  const hits = t.match(CGI_RENDER_NOISE_RE);
  if (!hits) return false;
  const strong = strongTokens(t);
  if (strong.length === 0) return hits.length >= 2;
  const junkHits = strong.filter((w) => CGI_RENDER_NOISE_RE.test(w)).length;
  CGI_RENDER_NOISE_RE.lastIndex = 0;
  return (
    hits.length >= 2 || junkHits >= Math.max(1, Math.ceil(strong.length * 0.4))
  );
}

function stripStyleAndPolicyNoise(text = "") {
  return String(text || "")
    .replace(CGI_RENDER_NOISE_RE, " ")
    .replace(/hyperrealistic\s+3D\s+CGI\s+render[^.]*\.?/gi, " ")
    .replace(
      /historical\s+cartographic\s+map\s+visualization\s+only:?/gi,
      " map "
    )
    .replace(/Clean source media:.*/gi, " ")
    .replace(/Diegetic sound only:.*/gi, " ")
    .replace(/Cinematic motion[^.]*\.?/gi, " ")
    .replace(/max\s*\d{1,2}\s*seconds?[^.]*\.?/gi, " ")
    .replace(/Vertical\s*9\s*:\s*16[^.]*\.?/gi, " ")
    .replace(/Horizontal\s*16\s*:\s*9[^.]*\.?/gi, " ")
    .replace(/generate strictly as[^.]*\.?/gi, " ")
    .replace(
      /\b(photorealistic|hyperrealistic|cinematic|documentary|volumetric lighting|soft morning light|golden hour|dramatic lighting|shallow depth of field|high micro-contrast|cool blue undertones|warm tones|no text|no watermark|remotion overlay|portrait framing|landscape framing|full-frame mobile framing|high detail|ultra detailed|period-accurate|geographic information design|documentary map aesthetic)\b/gi,
      " "
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Remove prefixos de linguagem de câmera / shot para sobrar o sujeito visual.
 */
function stripShotLanguage(text = "") {
  let t = String(text || "").trim();
  // "Cinematic low-angle shot of X" / "Medium shot of X" / "Epic wide aerial still of X"
  t = t.replace(
    /^(?:(?:[A-Za-z][\w-]*)\s+){0,5}(?:shot|photograph|still|view|image|footage|frame|close-up)\s+(?:of\s+)?/i,
    ""
  );
  t = t.replace(
    /^(?:close-up|wide(?:\s+shot)?|establishing(?:\s+shot)?|low-angle|high-angle|aerial|medium)\s+(?:shot\s+)?(?:of\s+)?/i,
    ""
  );
  t = t.replace(/^(?:a|an|the)\s+/i, "");
  t = t.replace(/\bfocus on\b/gi, " ");
  t = t.replace(/\brevealing\b/gi, " ");
  return t.trim();
}

/**
 * Corta cláusulas de estilo depois do sujeito principal
 * ("… building with sleek architecture" → "… building")
 * Mantém ação curta útil para stock ("garbage truck emptying trash bins").
 */
function clipToVisualSubject(text = "") {
  let t = String(text || "").trim();
  // Cláusulas de ambientação / estilo
  t = t.replace(
    /\b(?:bathed in|illuminated by|lit by|cast in|surrounded by|set against)\b.*/i,
    ""
  );
  t = t.replace(
    /\b(?:with|featuring|highlighting|showcasing|displaying)\s+(?:sleek|clean|modern|soft|dramatic|beautiful|minimalist|elegant)\b.*/i,
    ""
  );
  // "with sleek architecture and clean lines" — corta "with" + adjetivo de estilo
  t = t.replace(
    /\bwith\s+(?:sleek|clean|modern|soft|dramatic|beautiful|minimalist|elegant|sharp)\b.*/i,
    ""
  );
  return t.replace(/\s{2,}/g, " ").trim();
}

function extractProperNouns(text = "") {
  const matches = String(text || "").match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g
  );
  if (!matches) return [];
  return matches
    .map((m) => m.trim())
    .filter(
      (m) =>
        m.length >= 3 &&
        !/^(The|A|An|And|With|From|Into|Epic|Medium|Wide|Close|Focus|Clean|Cinematic|Photorealistic|Vertical|Horizontal)$/i.test(
          m
        ) &&
        !STOP_WORDS.has(m.toLowerCase())
    );
}

function contentTokens(text = "", { max = 8, minLen = 3 } = {}) {
  return String(text || "")
    .replace(/[^\w\sà-úÀ-Ú-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        w.length >= minLen &&
        !STOP_WORDS.has(w.toLowerCase()) &&
        !PT_STOP.has(w.toLowerCase()) &&
        !/^\d+$/.test(w) &&
        !STYLE_ADJECTIVES.has(w.toLowerCase())
    )
    .slice(0, max);
}

/**
 * Tokens "fortes" de uma query para checar se ela descreve o mesmo assunto do prompt.
 */
function strongTokens(text = "") {
  return normalizeComparable(text)
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !STOP_WORDS.has(w) &&
        !PT_STOP.has(w) &&
        !STYLE_ADJECTIVES.has(w) &&
        !GENERIC_QUERIES.has(w)
    );
}

/**
 * stock_query "Copenhill plant" vs prompt de prédio residencial → false.
 * stock_query "trash bin Copenhagen" vs prompt de garbage truck → true.
 */
export function queryMatchesSceneSubject(query = "", prompt = "") {
  const q = String(query || "").trim();
  const p = String(prompt || "").trim();
  if (!q) return false;
  if (!p || p.length < 24) return true; // sem prompt rico, não rejeita

  const qTokens = strongTokens(q);
  if (!qTokens.length) return false;

  const pNorm = normalizeComparable(stripStyleAndPolicyNoise(p));
  const hits = qTokens.filter(
    (w) => pNorm.includes(w) || pNorm.includes(w.replace(/s$/, ""))
  );

  // Exige overlap real com o que a cena mostra
  if (hits.length === 0) return false;
  if (qTokens.length <= 2) return hits.length >= 1;
  // Pelo menos 1/3 das palavras fortes, mínimo 1
  const need = Math.max(1, Math.ceil(qTokens.length * 0.34));
  return hits.length >= need;
}

/**
 * Extrai sujeito visual concreto do prompt (inglês) para Pexels/Pixabay/Bing.
 */
export function extractStockQueryFromPrompt(prompt = "") {
  const raw = stripStyleAndPolicyNoise(prompt);
  if (!raw || raw.length < 8) return "";

  const proper = extractProperNouns(raw);
  let firstSentence = stripShotLanguage(raw.split(/[.!?]/)[0] || raw);
  firstSentence = clipToVisualSubject(firstSentence);

  const tokens = contentTokens(firstSentence, { max: 7, minLen: 3 });

  const parts = [];
  // Lugar/nome próprio só se aparecer na 1ª frase (evita puxar tema de outra parte do prompt)
  const firstNorm = normalizeComparable(firstSentence);
  for (const name of proper.slice(0, 2)) {
    if (!firstNorm.includes(normalizeComparable(name))) continue;
    if (!parts.some((p) => p.toLowerCase() === name.toLowerCase())) {
      parts.push(name);
    }
  }
  for (const token of tokens) {
    if (parts.length >= 6) break;
    if (parts.some((p) => p.toLowerCase() === token.toLowerCase())) continue;
    parts.push(token);
  }

  // Se o sujeito ficou curto, puxa substantivos da 2ª frase (ex.: ação / detalhe)
  if (parts.length < 3) {
    const second = clipToVisualSubject(
      stripShotLanguage(raw.split(/[.!?]/)[1] || "")
    );
    for (const token of contentTokens(second, { max: 4, minLen: 4 })) {
      if (parts.length >= 6) break;
      if (parts.some((p) => p.toLowerCase() === token.toLowerCase())) continue;
      parts.push(token);
    }
  }

  // Anexa lugar próprio do prompt inteiro se ainda não entrou (Copenhagen, Copenhill)
  if (parts.length >= 2) {
    for (const name of proper.slice(0, 2)) {
      if (parts.length >= 6) break;
      if (parts.some((p) => p.toLowerCase() === name.toLowerCase())) continue;
      // Só lugares/entidades curtas
      if (name.split(/\s+/).length <= 2) parts.push(name);
    }
  }

  let query = parts.join(" ").trim().slice(0, 80);
  if (query.length < 6 || isGenericQuery(query)) return "";
  return query;
}

/**
 * Extrai termos a partir do significado da cena (narração + o que a cena mostra).
 * NÃO usa prompt de render Visual PRO.
 */
export function extractStockQueryFromNarration(narration = "") {
  const text = String(narration || "").trim();
  if (text.length < 8) return "";

  const proper = [];
  const multi = text.match(
    /\b([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})\b/g
  );
  if (multi) {
    for (const m of multi) {
      const n = m.trim();
      if (n.length < 3) continue;
      if (PT_STOP.has(n.toLowerCase()) || STOP_WORDS.has(n.toLowerCase()))
        continue;
      if (/^(Já|Se|Por|Que|Como|Uma|Um|Os|As|No|Na|The|A|An)$/i.test(n))
        continue;
      if (!proper.some((p) => p.toLowerCase() === n.toLowerCase())) {
        proper.push(n);
      }
    }
  }

  const words = text
    .replace(/[^\w\sà-úÀ-Ú-]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !PT_STOP.has(w.toLowerCase()) &&
        !STOP_WORDS.has(w.toLowerCase()) &&
        !/^(perguntou|destaca|estados|mais|como|porque|porquê|hiper-?realista|realista|animado|sutilmente|centraliza|inicialmente|seguinte|seguidamente)$/i.test(
          w
        )
    );

  const parts = [...proper.slice(0, 3)];
  for (const w of words) {
    if (parts.length >= 6) break;
    if (parts.some((p) => p.toLowerCase() === w.toLowerCase())) continue;
    if (
      proper.some((p) =>
        normalizeComparable(p).includes(normalizeComparable(w))
      )
    )
      continue;
    parts.push(w);
  }

  const query = parts.join(" ").slice(0, 80).trim();
  if (query.length < 6 || isGenericQuery(query) || isCgiOrRenderJunk(query))
    return "";
  return query;
}

/** Texto do ASSUNTO da cena — sem estilo de render PRO. */
function collectSceneMeaningText(scene = {}) {
  return [
    scene.visual_description,
    scene.visualDescription,
    scene.narration_text,
    scene.narration_excerpt,
    scene.narration,
    scene.narracao,
    scene.text_overlay,
    scene.function,
    scene.editor_notes,
  ]
    .map((v) => String(v || "").trim())
    .filter((v) => v.length >= 8 && !isCgiOrRenderJunk(v.slice(0, 120)))
    .join(". ");
}

function collectGenerationPromptText(scene = {}) {
  return [
    scene.prompt,
    scene.visual_prompt,
    scene.image_prompt,
    scene.prompt_visual,
    scene.video_prompt,
    scene.ai_video_prompt,
  ]
    .map((v) => String(v || "").trim())
    .filter((v) => v.length >= 12)
    .join(" ");
}

/** Fallback de busca específico por nicho (nunca genérico puro). */
const NICHE_FALLBACK_QUERIES = {
  engineering: "industrial machinery construction site",
  history: "historical site period architecture",
  mystery: "ancient ruins archaeological site",
  science: "scientific laboratory research equipment",
  tech: "modern technology laboratory equipment",
  geography: "natural landscape geographic terrain",
  true_crime: "forensic investigation crime scene detail",
  horror: "dark atmospheric empty corridor",
  finance: "modern office financial district",
  food: "food preparation kitchen ingredients",
  sports: "athletic stadium sports action",
  pets: "domestic animal close up portrait",
  luxury: "premium interior luxury detail",
  motivation: "sunrise silhouette mountain ridge",
  default: "documentary detail object",
};

/**
 * Resolve fallback de stock por nicho (canal / VPE).
 * @param {string} niche
 * @returns {string|null}
 */
export function resolveNicheFallbackQuery(niche = "") {
  const t = String(niche || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!t) return null;
  if (NICHE_FALLBACK_QUERIES[t]) return NICHE_FALLBACK_QUERIES[t];
  if (/engenh|constru|industrial|maquina|estrutura/.test(t))
    return NICHE_FALLBACK_QUERIES.engineering;
  if (/histor|guerra|seculo|empire/.test(t)) return NICHE_FALLBACK_QUERIES.history;
  if (/mister|arqueol|ruina|ancient/.test(t))
    return NICHE_FALLBACK_QUERIES.mystery;
  if (/cienc|science|biolog|fisic/.test(t)) return NICHE_FALLBACK_QUERIES.science;
  if (/tecnolog|digital|software|robot/.test(t)) return NICHE_FALLBACK_QUERIES.tech;
  if (/geograf|natureza|paisagem|wildlife/.test(t))
    return NICHE_FALLBACK_QUERIES.geography;
  return null;
}

function isUsableDirectStockQuery(candidate, options = {}) {
  const rejectTitles = options.rejectTitles || [];
  const sceneMeaning = options.sceneMeaning || "";
  const preferSceneStockQuery = options.preferSceneStockQuery === true;
  if (!candidate || isGenericQuery(candidate)) return false;
  if (isCgiOrRenderJunk(candidate)) return false;
  if (looksLikeProjectTitle(candidate, rejectTitles)) return false;
  // Com preferSceneStockQuery (pós-VPE), aceita stock_query mesmo se a narração
  // for fraca e o match de sujeito falhar — ainda bloqueia CGI/genérico.
  if (
    sceneMeaning &&
    !preferSceneStockQuery &&
    !queryMatchesSceneSubject(candidate, sceneMeaning)
  ) {
    return false;
  }
  const wc = candidate.split(/\s+/).filter(Boolean).length;
  return wc >= 2 || /[A-ZÀ-Ú]/.test(candidate);
}

/**
 * Busca de stock: verifica a NARRAÇÃO e do que a CENA trata.
 * Nunca prioriza prompt de Engenharia Visual PRO (Unreal/Octane/CGI).
 * options: { niche, preferSceneStockQuery, strategyTitle, projectTitle, rejectTitles }
 */
export function resolveStockSearchQuery(vp = {}, options = {}) {
  const rejectTitles = collectRejectTitles(options);
  const scene = vp || {};
  const sceneMeaning = collectSceneMeaningText(scene);
  const generationPrompt = collectGenerationPromptText(scene);
  const preferSceneStockQuery = options.preferSceneStockQuery === true;

  const directCandidates = [
    scene.stock_query,
    scene.stockQuery,
    scene.busca_termo,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  // 0) Pós-VPE: prioriza stock_query da cena se for concreto e limpo
  if (preferSceneStockQuery) {
    for (const candidate of directCandidates) {
      if (
        isUsableDirectStockQuery(candidate, {
          rejectTitles,
          sceneMeaning,
          preferSceneStockQuery: true,
        })
      ) {
        return candidate.slice(0, 80);
      }
    }
  }

  // 1) Narração + descrição do que a cena mostra
  if (sceneMeaning) {
    const fromMeaning = extractStockQueryFromNarration(sceneMeaning);
    if (
      fromMeaning.length >= 6 &&
      !looksLikeProjectTitle(fromMeaning, rejectTitles) &&
      !isGenericQuery(fromMeaning) &&
      !isCgiOrRenderJunk(fromMeaning)
    ) {
      return fromMeaning;
    }
  }

  // 2) stock_query manual — só se não for CGI e casar com o assunto da cena
  for (const candidate of directCandidates) {
    if (
      isUsableDirectStockQuery(candidate, {
        rejectTitles,
        sceneMeaning,
        preferSceneStockQuery: false,
      })
    ) {
      return candidate.slice(0, 80);
    }
  }

  // 3) identity_tags
  const tags = Array.isArray(scene.identity_tags)
    ? scene.identity_tags
    : Array.isArray(scene.identityTags)
      ? scene.identityTags
      : [];
  if (tags.length) {
    const fromTags = tags
      .map((t) =>
        String(t || "")
          .replace(/[-_]+/g, " ")
          .replace(/\b(still|shot|tag|scene)\b/gi, "")
          .trim()
      )
      .filter((t) => t.length >= 4 && !isCgiOrRenderJunk(t))
      .slice(0, 3)
      .join(" ")
      .trim();
    if (
      fromTags.length >= 6 &&
      !isGenericQuery(fromTags) &&
      !looksLikeProjectTitle(fromTags, rejectTitles) &&
      (!sceneMeaning || queryMatchesSceneSubject(fromTags, sceneMeaning))
    ) {
      return fromTags.slice(0, 80);
    }
  }

  // 4) Prompt de geração só depois de limpar Unreal/Octane/CGI
  if (generationPrompt) {
    const cleaned = stripStyleAndPolicyNoise(generationPrompt);
    const fromPrompt = extractStockQueryFromPrompt(cleaned);
    if (
      fromPrompt.length >= 6 &&
      !isCgiOrRenderJunk(fromPrompt) &&
      !looksLikeProjectTitle(fromPrompt, rejectTitles) &&
      !isGenericQuery(fromPrompt) &&
      (!sceneMeaning || queryMatchesSceneSubject(fromPrompt, sceneMeaning))
    ) {
      return fromPrompt;
    }
  }

  const hook = String(scene.visual_hook || scene.visualHook || "").trim();
  if (
    hook.length >= 8 &&
    !isGenericQuery(hook) &&
    !isCgiOrRenderJunk(hook) &&
    !looksLikeProjectTitle(hook, rejectTitles)
  ) {
    return hook.slice(0, 80);
  }

  return (
    resolveNicheFallbackQuery(options.niche) || "documentary detail object"
  );
}
