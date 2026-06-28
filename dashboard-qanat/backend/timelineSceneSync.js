/**
 * Shared timeline scene timing logic — mirrors the editor preview in App.tsx
 * (getDynamicAssetWords + getAssetDuration) so render matches manual adjustments.
 */

const PORTUGUESE_STOP_WORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "para", "com", "por", "sob", "sobre", "sem",
  "que", "se", "e", "ou", "mas", "porem", "todavia", "contudo", "entretanto",
  "aqui", "ali", "la", "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
  "eu", "tu", "ele", "ela", "nos", "vos", "eles", "elas", "me", "te", "se", "lhe",
  "ao", "aos", "pelo", "pela", "pelos", "pelas", "num", "numa", "nuns", "numas",
  "como", "mais", "muito", "seus", "suas", "seu", "sua", "dele", "dela", "deles", "delas",
]);

function cleanText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function matchWords(w1, w2) {
  if (w1 === w2) return true;
  const s1 = w1.endsWith("s") ? w1.slice(0, -1) : w1;
  const s2 = w2.endsWith("s") ? w2.slice(0, -1) : w2;
  return s1 === s2 && s1.length > 3;
}

export function flattenWordTranscripts(wordTranscripts) {
  const flatList = [];
  if (!Array.isArray(wordTranscripts)) return flatList;

  for (const segment of wordTranscripts) {
    const segStart = segment.start_time || 0;
    if (segment.words && Array.isArray(segment.words) && segment.words.length > 0) {
      for (const w of segment.words) {
        let wStart = w.start;
        let wEnd = w.end;
        if (wStart < segStart) {
          wStart += segStart;
          wEnd += segStart;
        }
        const cleanArr = cleanText(w.word);
        flatList.push({
          word: w.word,
          clean: cleanArr[cleanArr.length - 1] || "",
          start: wStart,
          end: wEnd,
        });
      }
    }
  }
  return flatList;
}

export function findNarrationMatch(
  narrationText,
  flatTranscriptWords,
  { searchAfter = 0, searchBefore = Infinity } = {},
) {
  if (!narrationText || !flatTranscriptWords?.length) return null;

  const targetWords = cleanText(narrationText);
  if (targetWords.length === 0) return null;

  const eligible = flatTranscriptWords
    .map((w, idx) => ({ w, idx }))
    .filter(({ w }) => w.start >= searchAfter - 0.35 && w.start <= searchBefore + 0.5);

  if (eligible.length === 0) return null;

  const targetWeights = targetWords.map((w) => (PORTUGUESE_STOP_WORDS.has(w) ? 1 : 10));
  const maxPossibleScore = targetWeights.reduce((acc, val) => acc + val, 0);
  const N = targetWords.length;
  const W = N + 8;

  let bestScore = 0;
  let bestFirstMatchIdx = -1;
  let bestLastMatchIdx = -1;

  for (let i = 0; i <= eligible.length - Math.min(N, eligible.length); i++) {
    let score = 0;
    let firstMatchIdxInWindow = -1;
    let lastMatchIdxInWindow = -1;
    const matchedTargetIndices = new Set();
    const windowWords = eligible.slice(i, i + W);

    windowWords.forEach((entry, twIdx) => {
      const cleanTw = entry.w.clean;
      for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
        if (!matchedTargetIndices.has(tIdx) && matchWords(targetWords[tIdx], cleanTw)) {
          score += targetWeights[tIdx];
          matchedTargetIndices.add(tIdx);
          if (firstMatchIdxInWindow === -1) firstMatchIdxInWindow = twIdx;
          lastMatchIdxInWindow = twIdx;
          break;
        }
      }
    });

    const currentFirstAbs = eligible[i + firstMatchIdxInWindow]?.idx ?? -1;
    const currentLastAbs = eligible[i + lastMatchIdxInWindow]?.idx ?? -1;
    const currentSpan = currentLastAbs - currentFirstAbs;
    const bestSpan = bestLastMatchIdx - bestFirstMatchIdx;

    if (
      score > bestScore ||
      (score === bestScore &&
        score > 0 &&
        firstMatchIdxInWindow !== -1 &&
        (bestFirstMatchIdx === -1 || currentSpan < bestSpan))
    ) {
      bestScore = score;
      bestFirstMatchIdx = currentFirstAbs;
      bestLastMatchIdx = currentLastAbs;
    }
  }

  const threshold = Math.max(2, Math.min(11, Math.floor(maxPossibleScore * 0.5)));
  if (bestScore >= threshold && bestFirstMatchIdx !== -1 && bestLastMatchIdx !== -1) {
    const start = flatTranscriptWords[bestFirstMatchIdx].start;
    const end = flatTranscriptWords[bestLastMatchIdx].end;
    return { start, end, duration: end - start, bestFirstMatchIdx, bestLastMatchIdx };
  }
  return null;
}

export function getAssetNarrationText(blockNum, assetIdx, { visualPrompts = [], blockPhrases = [] } = {}) {
  const blockScenes = visualPrompts.filter((vp) => Number(vp?.block) === blockNum);
  if (blockScenes.length > assetIdx && blockScenes[assetIdx]?.narration_text) {
    return blockScenes[assetIdx].narration_text;
  }
  const bp = blockPhrases.find((x) => Number(x?.block) === blockNum);
  return bp?.phrase || "";
}

/** Same formula as getAssetDuration() in App.tsx */
export function computeAssetDuration(asset, allAssets, blockDuration) {
  if (asset?.fixed !== undefined && asset?.fixed !== null) {
    return Number(asset.fixed);
  }
  const sumFixed = allAssets.reduce((acc, c) => acc + (c?.fixed ? Number(c.fixed) : 0), 0);
  const flexibleClips = allAssets.filter((c) => c?.fixed === undefined || c?.fixed === null);
  const nFlex = flexibleClips.length;
  if (nFlex > 0) {
    const remaining = Math.max(0.5 * nFlex, blockDuration - sumFixed);
    return remaining / nFlex;
  }
  return 0.5;
}

/**
 * Block narration anchor = timestamp of the first matched word across all assets
 * (same as blockNarrationWordsCache[0].start in the editor).
 */
export function getBlockNarrationText(blockNum, context = {}) {
  const { visualPrompts = [], blockPhrases = [] } = context;
  const scenes = visualPrompts.filter((vp) => Number(vp?.block) === blockNum);
  const sceneTexts = scenes
    .map((vp) => String(vp?.narration_text || vp?.narration_excerpt || "").trim())
    .filter(Boolean);
  if (sceneTexts.length > 0) return sceneTexts.join(" ");
  const bp = blockPhrases.find((x) => Number(x?.block) === blockNum);
  return String(bp?.phrase || "").trim();
}

export function getBlockNarrationAnchor(blockNum, assets, flatTranscriptWords, context = {}) {
  const searchAfter = Number(context.blockStart);
  const searchBefore = Number(context.blockEnd);
  const bounds = {
    searchAfter: Number.isFinite(searchAfter) ? searchAfter : 0,
    searchBefore: Number.isFinite(searchBefore) ? searchBefore : Infinity,
  };

  const blockText = getBlockNarrationText(blockNum, context);
  if (blockText) {
    const blockMatch = findNarrationMatch(blockText, flatTranscriptWords, bounds);
    if (blockMatch) return blockMatch.start;
  }

  const allStarts = [];
  for (let idx = 0; idx < assets.length; idx++) {
    const narrationText = getAssetNarrationText(blockNum, idx, context);
    const matched = findNarrationMatch(narrationText, flatTranscriptWords, bounds);
    if (matched) allStarts.push(matched.start);
  }
  if (allStarts.length > 0) return Math.min(...allStarts);
  return null;
}

/**
 * Build { start, duration } for each asset in a block.
 * Prefers persisted audio_start; falls back to transcript-anchored sequential layout.
 */
export function buildBlockSceneTimings(blockNum, assets, blockDuration, flatTranscriptWords, context = {}) {
  if (!Array.isArray(assets) || assets.length === 0) return [];

  const narrationAnchor = getBlockNarrationAnchor(blockNum, assets, flatTranscriptWords, context);
  const fallbackBlockStart = Number(context.blockStart);
  const anchor = narrationAnchor ?? (Number.isFinite(fallbackBlockStart) ? fallbackBlockStart : 0);

  let sequentialCursor = anchor;
  const timings = [];

  assets.forEach((asset, index) => {
    const duration = Math.max(0.5, computeAssetDuration(asset, assets, blockDuration));
    let start;

    if (asset?.audio_start !== undefined && asset?.audio_start !== null && Number.isFinite(Number(asset.audio_start))) {
      start = Number(asset.audio_start);
      sequentialCursor = start + duration;
    } else {
      start = sequentialCursor;
      sequentialCursor += duration;
    }

    timings.push({ index, start, duration, asset });
  });

  return timings;
}

export function blockHasExplicitSync(assets) {
  return Array.isArray(assets) && assets.some((item) => Number.isFinite(Number(item?.audio_start)));
}