/**
 * Resolve o termo de busca de stock/B-roll por cena (UI Creator).
 * Prioridade: sujeito visual do PROMPT da cena → stock_query que bata com a cena
 * → tags/narração. Nunca usa o tema global do vídeo se a cena mostra outra coisa.
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
  "uma",
  "este",
  "esta",
  "esse",
  "essa",
  "isso",
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

function normalizeComparable(text = ""): string {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectRejectTitles(
  options: {
    projectTitle?: string;
    strategyTitle?: string;
    rejectTitles?: string[];
  } = {}
): string[] {
  const titles = [
    options.projectTitle,
    options.strategyTitle,
    ...(options.rejectTitles || []),
  ]
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  return [...new Set(titles)];
}

export function looksLikeProjectTitle(
  query = "",
  rejectTitles: string[] = []
): boolean {
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

function isGenericQuery(query = ""): boolean {
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

function isCgiOrRenderJunk(text = ""): boolean {
  const t = String(text || "");
  if (!t.trim()) return false;
  const hits = t.match(CGI_RENDER_NOISE_RE);
  if (!hits) return false;
  // Se metade+ das palavras “fortes” forem lixo de render → é prompt PRO, não assunto
  const strong = strongTokens(t);
  if (strong.length === 0) return hits.length >= 2;
  const junkHits = strong.filter((w) => CGI_RENDER_NOISE_RE.test(w)).length;
  CGI_RENDER_NOISE_RE.lastIndex = 0;
  return (
    hits.length >= 2 || junkHits >= Math.max(1, Math.ceil(strong.length * 0.4))
  );
}

function stripStyleAndPolicyNoise(text = ""): string {
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

function stripShotLanguage(text = ""): string {
  let t = String(text || "").trim();
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

function clipToVisualSubject(text = ""): string {
  let t = String(text || "").trim();
  t = t.replace(
    /\b(?:bathed in|illuminated by|lit by|cast in|surrounded by|set against)\b.*/i,
    ""
  );
  t = t.replace(
    /\b(?:with|featuring|highlighting|showcasing|displaying)\s+(?:sleek|clean|modern|soft|dramatic|beautiful|minimalist|elegant)\b.*/i,
    ""
  );
  t = t.replace(
    /\bwith\s+(?:sleek|clean|modern|soft|dramatic|beautiful|minimalist|elegant|sharp)\b.*/i,
    ""
  );
  return t.replace(/\s{2,}/g, " ").trim();
}

function extractProperNouns(text = ""): string[] {
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

function contentTokens(
  text = "",
  { max = 8, minLen = 3 }: { max?: number; minLen?: number } = {}
): string[] {
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

function strongTokens(text = ""): string[] {
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

export function queryMatchesSceneSubject(query = "", prompt = ""): boolean {
  const q = String(query || "").trim();
  const p = String(prompt || "").trim();
  if (!q) return false;
  if (!p || p.length < 24) return true;

  const qTokens = strongTokens(q);
  if (!qTokens.length) return false;

  const pNorm = normalizeComparable(stripStyleAndPolicyNoise(p));
  const hits = qTokens.filter(
    (w) => pNorm.includes(w) || pNorm.includes(w.replace(/s$/, ""))
  );

  if (hits.length === 0) return false;
  if (qTokens.length <= 2) return hits.length >= 1;
  const need = Math.max(1, Math.ceil(qTokens.length * 0.34));
  return hits.length >= need;
}

export function extractStockQueryFromPrompt(prompt = ""): string {
  const raw = stripStyleAndPolicyNoise(prompt);
  if (!raw || raw.length < 8) return "";

  const proper = extractProperNouns(raw);
  let firstSentence = stripShotLanguage(raw.split(/[.!?]/)[0] || raw);
  firstSentence = clipToVisualSubject(firstSentence);

  const tokens = contentTokens(firstSentence, { max: 7, minLen: 3 });

  const parts: string[] = [];
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

  if (parts.length >= 2) {
    for (const name of proper.slice(0, 2)) {
      if (parts.length >= 6) break;
      if (parts.some((p) => p.toLowerCase() === name.toLowerCase())) continue;
      if (name.split(/\s+/).length <= 2) parts.push(name);
    }
  }

  const query = parts.join(" ").trim().slice(0, 80);
  if (query.length < 6 || isGenericQuery(query)) return "";
  return query;
}

/**
 * Extrai termos de busca a partir do significado da cena:
 * narração + descrição do que a cena mostra (NÃO prompt de render PRO).
 */
export function extractStockQueryFromNarration(narration = ""): string {
  const text = String(narration || "").trim();
  if (text.length < 8) return "";

  // Nomes próprios / lugares (Santa Catarina, Brasil, Mississippi…)
  const proper: string[] = [];
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

  const parts: string[] = [...proper.slice(0, 3)];
  for (const w of words) {
    if (parts.length >= 6) break;
    if (parts.some((p) => p.toLowerCase() === w.toLowerCase())) continue;
    // Evita repetir pedaço já coberto por nome próprio
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

/** Texto que descreve DO QUE A CENA TRATA (assunto), sem estilo de render. */
function collectSceneMeaningText(scene: Record<string, unknown> = {}): string {
  return [
    scene.visual_description,
    scene.visualDescription,
    scene.narration_text,
    scene.narration_excerpt,
    scene.narration,
    scene.narracao,
    scene.text_overlay,
    scene.function,
    // editor_notes às vezes repete a descrição útil no início
    scene.editor_notes,
  ]
    .map((v) => String(v || "").trim())
    .filter((v) => v.length >= 8 && !isCgiOrRenderJunk(v.slice(0, 120)))
    .join(". ");
}

/**
 * Prompts de geração (image/video/ai) — só usamos DEPOIS de limpar CGI PRO.
 * Nunca são a fonte principal da busca de stock.
 */
function collectGenerationPromptText(
  scene: Record<string, unknown> = {}
): string {
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

export function resolveStockSearchQuery(
  vp: Record<string, unknown> = {},
  options: {
    projectTitle?: string;
    strategyTitle?: string;
    rejectTitles?: string[];
  } = {}
): string {
  const rejectTitles = collectRejectTitles(options);
  const sceneMeaning = collectSceneMeaningText(vp);
  const generationPrompt = collectGenerationPromptText(vp);

  // 1) Narração + do que a cena trata (visual_description, overlay…)
  //    Ex.: "Santa Catarina … prósperos do Brasil" + "mapa … Santa Catarina"
  //    → busca "Santa Catarina Brasil mapa" — NÃO "unreal engine octane"
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

  // 2) stock_query manual só se NÃO for lixo CGI e não for genérico
  const directCandidates = [vp.stock_query, vp.stockQuery, vp.busca_termo]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const candidate of directCandidates) {
    if (isGenericQuery(candidate)) continue;
    if (isCgiOrRenderJunk(candidate)) continue;
    if (looksLikeProjectTitle(candidate, rejectTitles)) continue;
    // Tem que casar com o significado da cena (narração/descrição), não com prompt PRO
    if (sceneMeaning && !queryMatchesSceneSubject(candidate, sceneMeaning))
      continue;
    const wc = candidate.split(/\s+/).filter(Boolean).length;
    if (wc >= 2 || /[A-ZÀ-Ú]/.test(candidate)) {
      return candidate.slice(0, 80);
    }
  }

  // 3) identity_tags (se existirem e não forem CGI)
  const tags = Array.isArray(vp.identity_tags)
    ? (vp.identity_tags as unknown[])
    : Array.isArray(vp.identityTags)
      ? (vp.identityTags as unknown[])
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

  // 4) Só então: prompt de geração, DEPOIS de remover Unreal/Octane/CGI
  if (generationPrompt && !isCgiOrRenderJunk(generationPrompt.slice(0, 80))) {
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
  } else if (generationPrompt) {
    // Prompt é CGI mas pode ter assunto no final ("map of Brazil, Santa Catarina…")
    const cleaned = stripStyleAndPolicyNoise(generationPrompt);
    const fromPrompt = extractStockQueryFromPrompt(cleaned);
    if (
      fromPrompt.length >= 6 &&
      !isCgiOrRenderJunk(fromPrompt) &&
      !looksLikeProjectTitle(fromPrompt, rejectTitles) &&
      !isGenericQuery(fromPrompt)
    ) {
      // Se temos significado da cena, só aceita se casar
      if (!sceneMeaning || queryMatchesSceneSubject(fromPrompt, sceneMeaning)) {
        return fromPrompt;
      }
    }
  }

  const hook = String(vp.visual_hook || vp.visualHook || "").trim();
  if (
    hook.length >= 8 &&
    !isGenericQuery(hook) &&
    !isCgiOrRenderJunk(hook) &&
    !looksLikeProjectTitle(hook, rejectTitles)
  ) {
    return hook.slice(0, 80);
  }

  return "documentary detail object";
}
