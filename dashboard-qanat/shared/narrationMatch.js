/**
 * Fonte única do algoritmo de match narração ↔ Whisper.
 * Usado pelo backend (render) e frontend (preview/editor).
 */

export const PORTUGUESE_STOP_WORDS = new Set([
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

export function cleanText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

export function matchWords(w1, w2) {
  if (w1 === w2) return true;
  const s1 = w1.endsWith("s") ? w1.slice(0, -1) : w1;
  const s2 = w2.endsWith("s") ? w2.slice(0, -1) : w2;
  return s1 === s2 && s1.length > 3;
}

/**
 * @param {string} narrationText
 * @param {Array<{ word: string, clean?: string, start: number, end: number }>} flatTranscriptWords
 * @param {{ searchAfter?: number, searchBefore?: number }} [bounds]
 */
export function findNarrationMatch(
  narrationText,
  flatTranscriptWords,
  { searchAfter = 0, searchBefore = Infinity } = {},
) {
  if (!narrationText || !flatTranscriptWords?.length) return null;

  const targetWords = cleanText(narrationText);
  if (targetWords.length === 0) return null;

  const eligible = flatTranscriptWords
    .map((w, idx) => ({
      w: {
        ...w,
        clean: w.clean || cleanText(w.word).pop() || "",
      },
      idx,
    }))
    .filter(({ w }) => w.start >= searchAfter - 0.35 && w.start <= searchBefore + 0.5);

  if (eligible.length === 0) return null;

  const targetWeights = targetWords.map((w) => (PORTUGUESE_STOP_WORDS.has(w) ? 1 : 10));
  const maxPossibleScore = targetWeights.reduce((acc, val) => acc + val, 0);
  const N = targetWords.length;
  const W = N + 8;

  let bestScore = 0;
  let bestFirstMatchIdx = -1;
  let bestLastMatchIdx = -1;
  let bestMatchedTargetIndices = new Set();
  let bestFirstMatchedTargetIdx = -1;
  let bestLastMatchedTargetIdx = -1;

  for (let i = 0; i <= eligible.length - Math.min(N, eligible.length); i++) {
    let score = 0;
    let firstMatchIdxInWindow = -1;
    let lastMatchIdxInWindow = -1;
    let firstMatchedTargetIdx = -1;
    let lastMatchedTargetIdx = -1;
    const matchedTargetIndices = new Set();
    const windowWords = eligible.slice(i, i + W);

    windowWords.forEach((entry, twIdx) => {
      const cleanTw = entry.w.clean;
      for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
        if (!matchedTargetIndices.has(tIdx) && matchWords(targetWords[tIdx], cleanTw)) {
          score += targetWeights[tIdx];
          matchedTargetIndices.add(tIdx);
          if (firstMatchIdxInWindow === -1) {
            firstMatchIdxInWindow = twIdx;
            firstMatchedTargetIdx = tIdx;
          }
          lastMatchIdxInWindow = twIdx;
          lastMatchedTargetIdx = tIdx;
          break;
        }
      }
    });

    const currentFirstAbs = eligible[i + firstMatchIdxInWindow]?.idx ?? -1;
    const currentLastAbs = eligible[i + lastMatchIdxInWindow]?.idx ?? -1;
    const currentSpan = currentLastAbs - currentFirstAbs;
    const bestSpan = bestLastMatchIdx - bestFirstMatchIdx;

    if (
      score > bestScore
      || (score === bestScore
        && score > 0
        && firstMatchIdxInWindow !== -1
        && (bestFirstMatchIdx === -1 || currentSpan < bestSpan))
    ) {
      bestScore = score;
      bestFirstMatchIdx = currentFirstAbs;
      bestLastMatchIdx = currentLastAbs;
      bestMatchedTargetIndices = matchedTargetIndices;
      bestFirstMatchedTargetIdx = firstMatchedTargetIdx;
      bestLastMatchedTargetIdx = lastMatchedTargetIdx;
    }
  }

  const threshold = Math.max(2, Math.min(11, Math.floor(maxPossibleScore * 0.5)));
  if (bestScore >= threshold && bestFirstMatchIdx !== -1 && bestLastMatchIdx !== -1) {
    const start = flatTranscriptWords[bestFirstMatchIdx].start;
    const end = flatTranscriptWords[bestLastMatchIdx].end;

    const matchedCount = bestMatchedTargetIndices.size;
    let avgWordDuration = 0.28;
    if (matchedCount >= 2 && end > start) {
      avgWordDuration = (end - start) / matchedCount;
    }
    avgWordDuration = Math.max(0.15, Math.min(0.45, avgWordDuration));

    let finalStart = start;
    if (bestFirstMatchedTargetIdx > 0) {
      finalStart = Math.max(searchAfter, start - (bestFirstMatchedTargetIdx * avgWordDuration));
    }

    let finalEnd = end;
    const unmatchedAtEnd = (N - 1) - bestLastMatchedTargetIdx;
    if (unmatchedAtEnd > 0) {
      finalEnd = Math.min(searchBefore, end + (unmatchedAtEnd * avgWordDuration));
    }

    return {
      start: parseFloat(finalStart.toFixed(3)),
      end: parseFloat(finalEnd.toFixed(3)),
      duration: parseFloat(Math.max(0.5, finalEnd - finalStart).toFixed(3)),
      bestFirstMatchIdx,
      bestLastMatchIdx,
      matchedWords: bestScore,
      totalWords: maxPossibleScore,
    };
  }
  return null;
}

/** Alias usado no frontend (mesma implementação). */
export const findBoundedNarrationMatch = findNarrationMatch;