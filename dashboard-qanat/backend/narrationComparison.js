import { cleanText } from "../shared/narrationMatch.js";

function lcsDiff(expected, actual) {
  const rows = Array.from(
    { length: expected.length + 1 },
    () => new Uint16Array(actual.length + 1)
  );
  for (let i = expected.length - 1; i >= 0; i -= 1)
    for (let j = actual.length - 1; j >= 0; j -= 1)
      rows[i][j] =
        expected[i] === actual[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const missing = [],
    unexpected = [];
  let i = 0,
    j = 0;
  while (i < expected.length && j < actual.length) {
    if (expected[i] === actual[j]) {
      i++;
      j++;
    } else if (rows[i + 1][j] >= rows[i][j + 1]) missing.push(expected[i++]);
    else unexpected.push(actual[j++]);
  }
  while (i < expected.length) missing.push(expected[i++]);
  while (j < actual.length) unexpected.push(actual[j++]);
  return { matched: rows[0][0], missing, unexpected };
}

export function compareNarrationChunksWithWhisper(plan = {}, flatWords = []) {
  return (plan.chunks || []).map((chunk) => {
    const expected = cleanText(chunk.text || "");
    const start = Number(chunk.start_s),
      end = Number(chunk.end_s);
    const actual = flatWords
      .filter(
        (w) =>
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          (Number(w.start) >= start - 0.08 && Number(w.start) < end + 0.12)
      )
      .map((w) => w.clean || cleanText(w.word || "").at(-1))
      .filter(Boolean);
    if (!actual.length)
      return {
        chunk_id: chunk.id,
        block: chunk.block,
        status: "pending",
        coverage: 0,
        missing: expected.slice(0, 20),
        unexpected: [],
      };
    const diff = lcsDiff(expected, actual);
    const coverage = expected.length
      ? Math.round((diff.matched / expected.length) * 100)
      : 100;
    return {
      chunk_id: chunk.id,
      block: chunk.block,
      status: coverage >= 92 ? "ok" : coverage >= 75 ? "warning" : "failed",
      coverage,
      expected_words: expected.length,
      transcribed_words: actual.length,
      missing: diff.missing.slice(0, 20),
      unexpected: diff.unexpected.slice(0, 20),
    };
  });
}
