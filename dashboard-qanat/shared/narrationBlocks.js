function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitStoredParagraphs(blockScript = "") {
  return String(blockScript || "")
    .split(/\n\s*\n+/)
    .map(cleanText)
    .filter(Boolean);
}

function searchableTextWithOffsets(value = "") {
  const source = String(value || "");
  let text = "";
  const offsets = [];
  let lastWasSpace = true;

  for (let index = 0; index < source.length; index += 1) {
    const normalized = source[index]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
    for (const char of normalized) {
      if (/[a-z0-9]/i.test(char)) {
        text += char;
        offsets.push(index);
        lastWasSpace = false;
      } else if (!lastWasSpace && text) {
        text += " ";
        offsets.push(index);
        lastWasSpace = true;
      }
    }
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    offsets.pop();
  }
  return { text, offsets };
}

function searchableText(value = "") {
  return searchableTextWithOffsets(value).text;
}

function findAnchorIndex(searchable, phrase, after = 0) {
  const normalizedPhrase = searchableText(phrase);
  if (!normalizedPhrase) return -1;
  const words = normalizedPhrase.split(" ").filter(Boolean);
  const candidates = [words, words.slice(0, 8), words.slice(0, 6), words.slice(0, 4)]
    .filter((candidate) => candidate.length >= 3)
    .map((candidate) => candidate.join(" "));

  for (const candidate of [...new Set(candidates)]) {
    const found = searchable.indexOf(candidate, after);
    if (found >= 0) return found;
  }
  return -1;
}

function splitByPhraseAnchors(narrativeScript, blockPhrases, blockCount) {
  if (!Array.isArray(blockPhrases) || blockPhrases.length < blockCount) return [];
  const source = String(narrativeScript || "").trim();
  const searchable = searchableTextWithOffsets(source);
  const boundaries = [0];
  let searchAfter = 0;

  for (let blockIndex = 1; blockIndex < blockCount; blockIndex += 1) {
    const phrase = blockPhrases[blockIndex]?.phrase;
    const normalizedIndex = findAnchorIndex(searchable.text, phrase, searchAfter);
    if (normalizedIndex < 0) return [];
    const sourceIndex = searchable.offsets[normalizedIndex];
    if (!Number.isFinite(sourceIndex) || sourceIndex <= boundaries.at(-1)) return [];
    boundaries.push(sourceIndex);
    searchAfter = normalizedIndex + 1;
  }

  boundaries.push(source.length);
  const chunks = boundaries.slice(0, -1).map((start, index) =>
    cleanText(source.slice(start, boundaries[index + 1]))
  );
  return chunks.length === blockCount && chunks.every(Boolean) ? chunks : [];
}

function sentenceSegments(narrativeScript = "") {
  const source = cleanText(narrativeScript);
  if (!source) return [];
  const sentences =
    source.match(/[^.!?…]+[.!?…]+(?:["”']+)?|[^.!?…]+$/g)?.map(cleanText).filter(Boolean) || [];
  return sentences.length ? sentences : [source];
}

function distributeSegments(segments, blockCount) {
  if (segments.length < blockCount) return [];
  const blocks = [];
  let cursor = 0;

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const blocksLeft = blockCount - blockIndex;
    if (blocksLeft === 1) {
      blocks.push(cleanText(segments.slice(cursor).join(" ")));
      break;
    }

    const remaining = segments.slice(cursor);
    const remainingWords = remaining.reduce(
      (sum, segment) => sum + segment.split(/\s+/).filter(Boolean).length,
      0
    );
    const targetWords = Math.max(1, Math.ceil(remainingWords / blocksLeft));
    let take = 0;
    let words = 0;
    const maxTake = remaining.length - (blocksLeft - 1);

    while (take < maxTake) {
      const segmentWords = remaining[take].split(/\s+/).filter(Boolean).length;
      if (take > 0 && words + segmentWords > targetWords) break;
      words += segmentWords;
      take += 1;
      if (words >= targetWords) break;
    }

    take = Math.max(1, take);
    blocks.push(cleanText(remaining.slice(0, take).join(" ")));
    cursor += take;
  }

  return blocks.length === blockCount && blocks.every(Boolean) ? blocks : [];
}

function splitByWords(narrativeScript, blockCount) {
  const words = cleanText(narrativeScript).split(/\s+/).filter(Boolean);
  if (words.length < blockCount) return [];
  const blocks = [];
  let cursor = 0;
  for (let index = 0; index < blockCount; index += 1) {
    const wordsLeft = words.length - cursor;
    const blocksLeft = blockCount - index;
    const take = Math.ceil(wordsLeft / blocksLeft);
    blocks.push(words.slice(cursor, cursor + take).join(" "));
    cursor += take;
  }
  return blocks;
}

export function splitNarrationIntoBlocks({
  narrativeScript = "",
  blockScript = "",
  blockPhrases = [],
  expectedBlocks,
} = {}) {
  const requested = Number(expectedBlocks);
  const blockCount = Math.max(
    1,
    Number.isFinite(requested) && requested > 0
      ? Math.floor(requested)
      : Array.isArray(blockPhrases) && blockPhrases.length
        ? blockPhrases.length
        : 1
  );
  const stored = splitStoredParagraphs(blockScript);
  if (stored.length === blockCount) return stored;

  const source = cleanText(narrativeScript || stored.join(" "));
  if (!source) return stored;

  const anchored = splitByPhraseAnchors(source, blockPhrases, blockCount);
  if (anchored.length === blockCount) return anchored;

  const balanced = distributeSegments(sentenceSegments(source), blockCount);
  if (balanced.length === blockCount) return balanced;

  return splitByWords(source, blockCount);
}

export function deriveNarrationBlockPhrases(paragraphs = [], existing = []) {
  return paragraphs.map((paragraph, index) => {
    const current = Array.isArray(existing) ? existing[index] : null;
    const phrase = cleanText(current?.phrase) ||
      cleanText(paragraph).split(/\s+/).slice(0, 7).join(" ");
    return { block: index + 1, phrase };
  });
}

