import { cleanText } from "./narrationMatch.js";

/**
 * Achata word_transcripts.json em lista de palavras com timestamps absolutos.
 */
export function flattenWordTranscripts(
  wordTranscripts,
  { synthesizeFromText = false } = {}
) {
  const flatList = [];
  if (!Array.isArray(wordTranscripts)) return flatList;

  wordTranscripts.forEach((segment, segIdx) => {
    const segStart = segment.start_time || 0;
    const segDuration =
      Number(segment.duration) ||
      Math.max(0.5, (segment.end_time || 0) - segStart);
    const segText = String(segment.text || "").trim();

    if (
      segment.words &&
      Array.isArray(segment.words) &&
      segment.words.length > 0
    ) {
      for (const w of segment.words) {
        let wStart = w.start;
        let wEnd = w.end;
        if (wStart <= segDuration + 0.5) {
          wStart += segStart;
          wEnd += segStart;
        }
        const cleanArr = cleanText(w.word);
        flatList.push({
          word: w.word,
          clean: cleanArr[cleanArr.length - 1] || "",
          start: wStart,
          end: wEnd,
          segmentIndex: segIdx,
        });
      }
    } else if (synthesizeFromText && segText) {
      const rawWords = segText.split(/\s+/).filter(Boolean);
      if (rawWords.length > 0) {
        const wordDuration = segDuration / rawWords.length;
        rawWords.forEach((word, wIdx) => {
          const cleanArr = cleanText(word);
          flatList.push({
            word,
            clean: cleanArr[cleanArr.length - 1] || "",
            start: segStart + wIdx * wordDuration,
            end: segStart + (wIdx + 1) * wordDuration,
            segmentIndex: segIdx,
          });
        });
      }
    }
  });

  return flatList;
}

export function sanitizeTranscriptSegmentWords(segment = {}) {
  if (
    segment?.words &&
    Array.isArray(segment.words) &&
    segment.words.length > 0
  ) {
    return segment.words.map((w) => ({
      word: String(w.word || "").trim(),
      start: Number(w.start) || 0,
      end: Number(w.end) || 0,
    }));
  }

  const text = String(segment?.text || "").trim();
  if (!text) return [];

  const rawWords = text.split(/\s+/).filter(Boolean);
  const duration =
    Number(segment?.duration) ||
    Math.max(
      0.5,
      Number(segment?.end_time || 0) - Number(segment?.start_time || 0)
    );

  const wordDuration = duration / Math.max(1, rawWords.length);
  return rawWords.map((word, index) => ({
    word,
    start: index * wordDuration,
    end: (index + 1) * wordDuration,
  }));
}
