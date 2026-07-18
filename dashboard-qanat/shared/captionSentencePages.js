const SENTENCE_END_RE = /[.!?…]["'”’)]*$/u;
const CLAUSE_END_RE = /[,;:—–-]["'”’)]*$/u;
const SOFT_BREAK_WORDS = new Set([
  "e",
  "mas",
  "porque",
  "quando",
  "enquanto",
  "porém",
  "portanto",
  "então",
  "embora",
  "contudo",
  "assim",
  "já",
  "and",
  "but",
  "because",
  "when",
  "while",
  "however",
  "therefore",
  "then",
]);

function cleanText(word) {
  return String(word?.text ?? word?.word ?? "").trim();
}

function pageLength(words) {
  return words.reduce((total, word) => total + cleanText(word).length + 1, 0);
}

function sentenceGroups(captions, pauseThresholdMs) {
  const groups = [];
  let current = [];
  for (const caption of captions) {
    const previous = current[current.length - 1];
    const gap = previous ? caption.startMs - previous.endMs : 0;
    if (
      current.length &&
      (SENTENCE_END_RE.test(cleanText(previous)) || gap > pauseThresholdMs)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(caption);
  }
  if (current.length) groups.push(current);
  return groups;
}

function bestLongSentenceCut(words, maxCharacters, maxWords) {
  let hardLimit = Math.min(words.length - 1, maxWords);
  let characters = 0;
  for (let i = 0; i < words.length; i += 1) {
    characters += cleanText(words[i]).length + 1;
    if (characters > maxCharacters) {
      hardLimit = Math.min(hardLimit, Math.max(1, i));
      break;
    }
  }
  const earliestNatural = Math.max(1, Math.floor(hardLimit * 0.52));
  for (let cut = hardLimit; cut >= earliestNatural; cut -= 1) {
    const before = cleanText(words[cut - 1]);
    const after = cleanText(words[cut]).toLocaleLowerCase("pt-BR");
    if (CLAUSE_END_RE.test(before) || SOFT_BREAK_WORDS.has(after)) return cut;
  }
  return Math.max(1, hardLimit);
}

function splitLongSentence(words, maxCharacters, maxWords) {
  const pages = [];
  let remaining = [...words];
  while (remaining.length) {
    if (
      remaining.length <= maxWords &&
      pageLength(remaining) <= maxCharacters
    ) {
      pages.push(remaining);
      break;
    }
    const cut = bestLongSentenceCut(remaining, maxCharacters, maxWords);
    pages.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  return pages;
}

function canSharePage(left, right, maxCharacters, maxWords, pauseThresholdMs) {
  if (!left?.length || !right?.length) return false;
  const gap = right[0].startMs - left[left.length - 1].endMs;
  const combined = [...left, ...right];
  return (
    gap <= pauseThresholdMs &&
    combined.length <= maxWords &&
    pageLength(combined) <= maxCharacters
  );
}

function coalesceShortPages(pages, options) {
  const {
    maxCharacters,
    maxWords,
    minWords,
    minPageDurationMs,
    pauseThresholdMs,
  } = options;
  const result = [];
  for (let index = 0; index < pages.length; index += 1) {
    let page = pages[index];
    const duration = page[page.length - 1].endMs - page[0].startMs;
    const isTooBrief = page.length < minWords || duration < minPageDurationMs;
    const next = pages[index + 1];

    if (
      isTooBrief &&
      canSharePage(page, next, maxCharacters, maxWords, pauseThresholdMs)
    ) {
      page = [...page, ...next];
      index += 1;
    } else if (
      isTooBrief &&
      result.length &&
      canSharePage(
        result[result.length - 1],
        page,
        maxCharacters,
        maxWords,
        pauseThresholdMs
      )
    ) {
      result[result.length - 1] = [...result[result.length - 1], ...page];
      continue;
    }
    result.push(page);
  }
  return result;
}

/**
 * Agrupa palavras em páginas por frase. Uma frase nunca compartilha página com
 * a próxima; frases longas só são quebradas em limites naturais e cada página
 * é dimensionada para no máximo duas linhas no renderizador.
 */
export function groupCaptionsIntoSentencePages(captions = [], options = {}) {
  const maxCharacters = Math.max(24, Number(options.maxCharacters) || 72);
  const maxWords = Math.max(6, Number(options.maxWords) || 16);
  const pauseThresholdMs = Math.max(
    700,
    Number(options.pauseThresholdMs) || 1200
  );
  const minWords = Math.max(2, Number(options.minWords) || 4);
  const minPageDurationMs = Math.max(
    500,
    Number(options.minPageDurationMs) || 900
  );
  const safe = (Array.isArray(captions) ? captions : [])
    .filter(
      (caption) =>
        cleanText(caption) &&
        Number.isFinite(Number(caption.startMs)) &&
        Number.isFinite(Number(caption.endMs))
    )
    .map((caption) => ({
      ...caption,
      startMs: Number(caption.startMs),
      endMs: Math.max(Number(caption.startMs) + 40, Number(caption.endMs)),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const sentencePages = sentenceGroups(safe, pauseThresholdMs).flatMap(
    (sentence) => splitLongSentence(sentence, maxCharacters, maxWords)
  );
  return coalesceShortPages(sentencePages, {
    maxCharacters,
    maxWords,
    minWords,
    minPageDurationMs,
    pauseThresholdMs,
  }).map((words) => ({
    words,
    startMs: words[0].startMs,
    endMs: words[words.length - 1].endMs,
  }));
}

/** Retorna uma ou duas linhas balanceadas; nunca cria terceira linha. */
export function balanceCaptionLines(words = [], singleLineCharacters = 28) {
  const safe = Array.isArray(words) ? words : [];
  if (safe.length < 2 || pageLength(safe) <= singleLineCharacters)
    return [safe];
  let bestCut = 1;
  let bestDifference = Number.POSITIVE_INFINITY;
  for (let cut = 1; cut < safe.length; cut += 1) {
    const left = pageLength(safe.slice(0, cut));
    const right = pageLength(safe.slice(cut));
    const difference = Math.abs(left - right);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestCut = cut;
    }
  }
  return [safe.slice(0, bestCut), safe.slice(bestCut)];
}
