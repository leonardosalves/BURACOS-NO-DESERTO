/**
 * Sonoplastia por bloco — analisa texto/ritmo da narração e orienta
 * ponto de entrada na faixa (climax mode) e intensidade de ducking.
 */

const MOOD_KEYWORDS = {
  tension: [
    /perigo|amea[cç]a|crise|imposs[ií]vel|segredo|mist[eé]rio|medo|urgente|problema|falha|risco|colapso|guerra|choque/i,
    /danger|crisis|threat|impossible|secret|mystery|fear|urgent|problem|failure|risk/i,
  ],
  epic: [
    /revolu[cç][aã]o|futuro|universo|hipers[oô]n|milh[oõ]es|gigante|[eé]pico|colossal|impulso|velocidade|marte|espa[cç]o|nave|propuls/i,
    /revolution|future|universe|hypersonic|millions|giant|epic|colossal|thrust|velocity|spacecraft/i,
  ],
  wonder: [
    /imagine|ser[aá] que|descoberta|incr[ií]vel|surpreendente|mist[eé]rio|como [eé]|por que|curioso|fen[oô]meno/i,
    /imagine|discovery|incredible|surprising|wonder|curious|phenomenon|what if/i,
  ],
  calm: [
    /repouse|calma|sil[eê]ncio|pausa|reflex[aã]o|contemple|suave|gentil|tranquil|sereno/i,
    /calm|quiet|pause|reflect|gentle|soft|serene|peaceful/i,
  ],
  resolve: [
    /conclus[aã]o|portanto|assim|finalmente|resultado|solu[cç][aã]o|camino|pr[oó]ximo passo|futuro pr[oó]ximo/i,
    /conclusion|therefore|finally|result|solution|next step|moving forward/i,
  ],
};

const CLIMAX_MODE_SEARCH = {
  intro: "ambient cinematic soft piano documentary",
  calm: "calm ambient documentary underscore gentle",
  wonder: "curious discovery ambient light documentary",
  tension: "dark cinematic tension strings documentary",
  epic: "epic cinematic orchestral documentary trailer",
  climax: "epic climax orchestral cinematic documentary",
  resolve: "hopeful cinematic resolve documentary uplifting",
  neutral: "cinematic documentary underscore neutral",
};

function scoreMoodFromText(text = "") {
  const sample = String(text).toLowerCase();
  const scores = { tension: 0, epic: 0, wonder: 0, calm: 0, resolve: 0 };
  for (const [mood, patterns] of Object.entries(MOOD_KEYWORDS)) {
    for (const pattern of patterns) {
      const matches = sample.match(new RegExp(pattern.source, pattern.flags.includes("i") ? "gi" : "g"));
      if (matches) scores[mood] += matches.length;
    }
  }
  return scores;
}

function pickDominantMood(scores, fallback = "neutral") {
  const entries = Object.entries(scores).filter(([, v]) => v > 0);
  if (entries.length === 0) return fallback;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function blockPhraseText(config, block) {
  const phrases = Array.isArray(config?.block_phrases) ? config.block_phrases : [];
  const hit = phrases.find((p) => Number(p?.block) === Number(block));
  if (hit?.phrase) return String(hit.phrase);
  if (typeof hit === "string") return hit;
  return "";
}

function wordsForBlock(wordTranscripts, block, blockStart, blockDuration) {
  const flat = [];
  for (const entry of wordTranscripts || []) {
    const words = Array.isArray(entry?.words) ? entry.words : Array.isArray(entry) ? entry : [];
    for (const w of words) flat.push(w);
  }
  if (flat.length === 0) return { text: "", wps: 0, wordCount: 0 };

  const end = blockStart + blockDuration;
  const inBlock = flat.filter((w) => {
    const t = Number(w?.start ?? w?.startTime ?? w?.begin);
    return Number.isFinite(t) && t >= blockStart - 0.05 && t < end + 0.05;
  });
  const text = inBlock.map((w) => String(w?.word || w?.text || "").trim()).filter(Boolean).join(" ");
  const wordCount = inBlock.length;
  const wps = blockDuration > 0 ? wordCount / blockDuration : 0;
  return { text, wps, wordCount };
}

function resolveArcMood(blockIndex, totalBlocks) {
  if (totalBlocks <= 1) return "neutral";
  if (blockIndex === 0) return "intro";
  if (blockIndex === totalBlocks - 1) return "climax";
  if (blockIndex === totalBlocks - 2 && totalBlocks >= 4) return "resolve";
  return null;
}

export function moodToClimaxMode(mood, pace = "normal") {
  switch (mood) {
    case "intro":
    case "calm":
      return pace === "fast" ? "rise" : "soft";
    case "wonder":
      return "rise";
    case "tension":
    case "epic":
    case "climax":
      return "peak";
    case "resolve":
      return pace === "slow" ? "soft" : "rise";
    default:
      return pace === "fast" ? "peak" : "rise";
  }
}

export function moodToDuckStrength(mood, pace = "normal") {
  if (mood === "climax" || mood === "epic" || pace === "fast") return "strong";
  if (mood === "calm" || mood === "intro" || mood === "wonder" || pace === "slow") return "light";
  return "normal";
}

export function moodToSearchTheme(mood, nicheMood) {
  return CLIMAX_MODE_SEARCH[mood] || nicheMood?.bgm || CLIMAX_MODE_SEARCH.neutral;
}

/**
 * @returns {Map<number, object>} block → plano de sonoplastia
 */
export function buildBlockSonoplastiaPlan({
  config = {},
  storyboard = {},
  blockNumbers = [],
  blockRanges = [],
  wordTranscripts = [],
  nicheMood = null,
}) {
  const plan = new Map();
  const totalBlocks = blockNumbers.length;
  const recommendations = Array.isArray(storyboard?.bgm_recommendations) ? storyboard.bgm_recommendations : [];

  blockNumbers.forEach((block, index) => {
    const range = blockRanges.find((r) => r.block === block) || { start: 0, duration: 8 };
    const phrase = blockPhraseText(config, block);
    const spoken = wordsForBlock(wordTranscripts, block, range.start, range.duration);
    const combinedText = [phrase, spoken.text, storyboard?.narrative_script || ""].filter(Boolean).join(" ");

    const scores = scoreMoodFromText(combinedText);
    const arcMood = resolveArcMood(index, totalBlocks);
    let mood = arcMood || pickDominantMood(scores, "neutral");

    if (arcMood && pickDominantMood(scores, null)) {
      const contentMood = pickDominantMood(scores, mood);
      if (scores[contentMood] >= 2) mood = contentMood;
    }

    const pace = spoken.wps > 2.6 ? "fast" : spoken.wps < 1.7 && spoken.wordCount > 4 ? "slow" : "normal";
    const climaxMode = moodToClimaxMode(mood, pace);
    const duckStrength = moodToDuckStrength(mood, pace);

    const rec = recommendations.find((r) => Number(r?.block) === Number(block));
    const searchTheme = String(rec?.search_theme || rec?.searchTheme || "").trim()
      || moodToSearchTheme(mood, nicheMood);

    plan.set(block, {
      block,
      mood,
      pace,
      climaxMode,
      duckStrength,
      searchTheme,
      phrasePreview: phrase.slice(0, 80),
      wordCount: spoken.wordCount,
      wordsPerSecond: Number(spoken.wps.toFixed(2)),
    });
  });

  return plan;
}

export function formatSonoplastiaLog(plan) {
  const lines = [];
  for (const entry of plan.values()) {
    lines.push(
      `[Sonoplastia] Bloco ${entry.block}: mood=${entry.mood} pace=${entry.pace}`
      + ` → entrada=${entry.climaxMode} duck=${entry.duckStrength}`
      + ` | busca="${entry.searchTheme}"`
      + ` | "${entry.phrasePreview}${entry.phrasePreview.length >= 80 ? "…" : ""}"`,
    );
  }
  return lines;
}

export function collectProjectBlockNumbers(config = {}, storyboard = {}, timings = {}) {
  const timelineAssets = config.timeline_assets || {};
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const fromTimings = Array.isArray(timings.durations)
    ? timings.durations.map((_, index) => index + 1)
    : [];

  return [...new Set([
    ...Object.keys(timelineAssets).map(Number).filter(Boolean),
    ...visualPrompts.map((prompt) => Number(prompt?.block || 0)).filter(Boolean),
    ...(Array.isArray(config.block_phrases)
      ? config.block_phrases.map((item) => Number(item?.block || 0)).filter(Boolean)
      : []),
    ...fromTimings,
  ])].sort((a, b) => a - b);
}

export function buildProjectBlockRanges(blockNumbers = [], timings = {}, fallbackDuration = 8) {
  return blockNumbers.map((block) => {
    const blockIndex = Math.max(0, block - 1);
    const start = Number(timings.starts?.[blockIndex]);
    const duration = Number(timings.durations?.[blockIndex]);
    return {
      block,
      start: Number.isFinite(start) ? start : 0,
      duration: Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration,
    };
  });
}

/** Blocos sem arquivo mapeado ou com arquivo ausente no disco. */
export function blocksNeedingBgmDownload(blockNumbers, mappings = [], fileExists = () => false) {
  const byBlock = new Map((mappings || []).map((m) => [Number(m.block), m]));
  return blockNumbers.filter((block) => {
    const mapping = byBlock.get(block);
    if (!mapping?.file) return true;
    return !fileExists(mapping.file);
  });
}

export function resolveBlockSearchTheme(block, sonoplastiaPlan, suggestion = null, nicheMood = null) {
  const fromStory = String(
    suggestion?.search_theme || suggestion?.searchTheme || suggestion?.recommendation || suggestion?.recomendacao || "",
  ).trim();
  if (fromStory) return fromStory;
  const plan = sonoplastiaPlan.get(block);
  if (plan?.searchTheme) return plan.searchTheme;
  return moodToSearchTheme("neutral", nicheMood);
}