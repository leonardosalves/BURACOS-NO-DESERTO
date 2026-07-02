/** Narração por bloco/asset — sem vazamento entre blocos; split só quando o usuário pede. */

import { repairMojibake } from "./textEncoding";

export type BlockTimingStatus = {
  block_timings?: {
    starts?: number[];
    durations?: number[];
  };
};

export type TimelineAsset = {
  asset?: string;
  type?: string;
  fixed?: number;
  audio_start?: number;
  speech_end?: number;
  narration_segment?: string;
  synced_to_speech?: boolean;
};

export type NarrationSyncContext = {
  config?: {
    block_phrases?: { block: number; phrase: string }[];
    timeline_assets?: Record<string, TimelineAsset[]>;
  };
  storyboard?: { visual_prompts?: Array<{ block?: number; narration_text?: string; narration_excerpt?: string }> };
  status?: BlockTimingStatus;
  getAssetDuration: (blockKey: string, index: number) => number;
};

const STOP_WORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "para", "com", "por", "sob", "sobre", "sem", "que", "se", "e", "ou", "mas", "como", "mais", "muito",
]);

function cleanText(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function matchWords(w1: string, w2: string) {
  if (w1 === w2) return true;
  const s1 = w1.endsWith("s") ? w1.slice(0, -1) : w1;
  const s2 = w2.endsWith("s") ? w2.slice(0, -1) : w2;
  return s1 === s2 && s1.length > 3;
}

export function getBlockTimeBounds(status: BlockTimingStatus | undefined, blockNum: number) {
  const starts = status?.block_timings?.starts;
  const durations = status?.block_timings?.durations;
  const blockStart = Number(starts?.[blockNum - 1]);
  const blockDuration = Number(durations?.[blockNum - 1]);
  const blockEnd = Number.isFinite(blockStart) && Number.isFinite(blockDuration)
    ? blockStart + blockDuration
    : Infinity;
  return {
    searchAfter: Number.isFinite(blockStart) ? blockStart : 0,
    searchBefore: blockEnd,
  };
}

/** Bounds estritos (sem margem fuzzy) — para cache de palavras por bloco, evita vazamento. */
export function getStrictBlockBounds(status: BlockTimingStatus | undefined, blockNum: number) {
  const starts = status?.block_timings?.starts;
  const durations = status?.block_timings?.durations;
  const blockStart = Number(starts?.[blockNum - 1]);
  const blockDuration = Number(durations?.[blockNum - 1]);
  return {
    start: Number.isFinite(blockStart) ? blockStart : 0,
    end: Number.isFinite(blockStart) && Number.isFinite(blockDuration)
      ? blockStart + blockDuration
      : Infinity,
  };
}

export function getBlockNarrationText(ctx: NarrationSyncContext, blockNum: number): string {
  const scenes = (ctx.storyboard?.visual_prompts || []).filter((vp) => Number(vp.block) === blockNum);
  const sceneTexts = scenes
    .map((vp) => repairMojibake(String(vp.narration_text || vp.narration_excerpt || "").trim()))
    .filter(Boolean);
  if (sceneTexts.length > 0) return sceneTexts.join(" ");

  const bp = ctx.config?.block_phrases?.find((x) => Number(x.block) === blockNum);
  const blockPhrase = repairMojibake(String(bp?.phrase || "").trim());
  if (blockPhrase) return blockPhrase;
  return "";
}

/** Divide o texto do bloco proporcionalmente à duração de cada asset (ação explícita do usuário). */
export function splitNarrationAmongAssets(
  ctx: NarrationSyncContext,
  blockKey: string,
  assetIdx: number,
): string {
  const blockNum = parseInt(blockKey, 10);
  const full = getBlockNarrationText(ctx, blockNum);
  if (!full) return "";
  const assets = ctx.config?.timeline_assets?.[blockKey] || [];
  if (assets.length <= 1) return full;

  const words = full.split(/\s+/).filter(Boolean);
  if (words.length === 0) return full;

  const durations = assets.map((_, i) => ctx.getAssetDuration(blockKey, i));
  const totalDur = durations.reduce((a, b) => a + b, 0) || assets.length;

  let wordStart = 0;
  for (let i = 0; i < assetIdx; i++) {
    wordStart += Math.max(1, Math.round((durations[i] / totalDur) * words.length));
  }
  const wordCount = Math.max(1, Math.round((durations[assetIdx] / totalDur) * words.length));
  const sliceEnd = assetIdx === assets.length - 1 ? words.length : wordStart + wordCount;
  return words.slice(wordStart, sliceEnd).join(" ");
}

/** Aplica split em todos os assets do bloco — retorna cópia atualizada do array. */
export function applySplitNarrationToBlockAssets(
  ctx: NarrationSyncContext,
  blockKey: string,
): TimelineAsset[] {
  const assets = [...(ctx.config?.timeline_assets?.[blockKey] || [])];
  return assets.map((asset, idx) => ({
    ...asset,
    narration_segment: splitNarrationAmongAssets(ctx, blockKey, idx),
  }));
}

export function getAssetNarrationText(ctx: NarrationSyncContext, blockKey: string, assetIdx: number): string {
  const blockNum = parseInt(blockKey, 10);
  const scenes = (ctx.storyboard?.visual_prompts || []).filter((vp) => Number(vp.block) === blockNum);
  if (scenes.length > assetIdx) {
    const sceneText = repairMojibake(
      String(scenes[assetIdx]?.narration_text || scenes[assetIdx]?.narration_excerpt || "").trim(),
    );
    if (sceneText) return sceneText;
  }

  const assets = ctx.config?.timeline_assets?.[blockKey] || [];
  const asset = assets[assetIdx];
  const segment = repairMojibake(String(asset?.narration_segment || "").trim());
  if (segment) return segment;

  const blockText = getBlockNarrationText(ctx, blockNum);
  if (!blockText) return "";

  if (assets.length <= 1) return blockText;

  // Vários assets sem texto por cena: divide o bloco proporcionalmente à duração
  return splitNarrationAmongAssets(ctx, blockKey, assetIdx);
}

export function narrationCacheKey(blockNum: number, text: string) {
  return `${blockNum}::${text}`;
}

type TranscriptSegment = {
  block?: number;
  index?: number;
  start_time?: number;
  end_time?: number;
  words?: Array<{ word: string; start: number; end: number }>;
};

/** Palavras do bloco a partir dos segmentos Whisper (campo block) — evita vazamento por block_timings largo. */
export function collectBlockWordsFromTranscriptSegments(
  wordTranscripts: TranscriptSegment[],
  blockNum: number,
): Array<{ word: string; start: number; end: number }> {
  if (!Array.isArray(wordTranscripts)) return [];
  const segs = wordTranscripts
    .filter((s) => Number(s.block) === blockNum)
    .sort((a, b) => Number(a.index) - Number(b.index) || Number(a.start_time) - Number(b.start_time));

  const out: Array<{ word: string; start: number; end: number }> = [];
  for (const seg of segs) {
    const segStart = Number(seg.start_time) || 0;
    const segDuration = seg.duration ?? Math.max(0.5, (seg.end_time || 0) - segStart);
    for (const w of seg.words || []) {
      let wStart = Number(w.start);
      let wEnd = Number(w.end);
      if (wStart <= segDuration + 0.5) {
        wStart += segStart;
        wEnd += segStart;
      }
      const token = String(w.word || "").trim();
      out.push({
        word: repairMojibake(token),
        start: wStart,
        end: wEnd,
      });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Alinha palavras do roteiro/storyboard aos timestamps do Whisper (mesma lógica do App.tsx). */
export function mapStoryboardWordsWithTiming(
  narrationText: string,
  flatTranscriptWords: Array<{ word: string; clean?: string; start: number; end: number }>,
  bestFirstMatchIdx: number,
  bestLastMatchIdx: number,
): Array<{ word: string; start: number; end: number }> {
  const rawWords = narrationText.split(/\s+/).filter(Boolean);
  if (
    bestFirstMatchIdx < 0
    || bestLastMatchIdx < 0
    || !flatTranscriptWords?.length
  ) {
    return rawWords.map((w) => ({ word: repairMojibake(w), start: 0, end: 999999 }));
  }

  let transcriptIdx = bestFirstMatchIdx;
  const result: Array<{ word: string; start: number; end: number }> = [];

  for (let i = 0; i < rawWords.length; i++) {
    const part = rawWords[i];
    const cleanedPart = cleanText(part)[0] || "";
    let matched = false;
    const searchLimit = Math.min(transcriptIdx + 12, flatTranscriptWords.length);

    for (let tIdx = transcriptIdx; tIdx < searchLimit; tIdx++) {
      const tw = flatTranscriptWords[tIdx];
      const cleanTw = tw.clean || cleanText(tw.word).pop() || "";
      if (cleanedPart === cleanTw || matchWords(cleanedPart, cleanTw)) {
        result.push({
          word: repairMojibake(String(tw.word || "").trim()) || part,
          start: tw.start,
          end: tw.end,
        });
        transcriptIdx = tIdx + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const prevWord = result[result.length - 1];
      const fallbackStart = prevWord
        ? prevWord.end
        : (flatTranscriptWords[Math.min(transcriptIdx, flatTranscriptWords.length - 1)]?.start || 0);
      result.push({
        word: repairMojibake(part),
        start: fallbackStart,
        end: fallbackStart + 0.3,
      });
    }
  }

  return result;
}

export function findBoundedNarrationMatch(
  narrationText: string,
  flatTranscriptWords: Array<{ word: string; clean?: string; start: number; end: number }>,
  bounds: { searchAfter: number; searchBefore: number },
) {
  if (!narrationText || !flatTranscriptWords?.length) return null;

  const targetWords = cleanText(narrationText);
  if (targetWords.length === 0) return null;

  const eligible = flatTranscriptWords
    .map((w, idx) => ({
      w: { ...w, clean: w.clean || cleanText(w.word).pop() || "" },
      idx,
    }))
    .filter(({ w }) => w.start >= bounds.searchAfter - 0.35 && w.start <= bounds.searchBefore + 0.5);

  if (eligible.length === 0) return null;

  const targetWeights = targetWords.map((w) => (STOP_WORDS.has(w) ? 1 : 10));
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
    const matchedTargetIndices = new Set<number>();
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
      score > bestScore
      || (score === bestScore && score > 0 && firstMatchIdxInWindow !== -1
        && (bestFirstMatchIdx === -1 || currentSpan < bestSpan))
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
    return {
      start,
      end,
      duration: end - start,
      matchedWords: bestScore,
      totalWords: maxPossibleScore,
      bestFirstMatchIdx,
      bestLastMatchIdx,
    };
  }
  return null;
}

export function swapBlockVisualPromptsInStoryboard(
  storyboard: { visual_prompts?: any[] },
  blockNum: number,
  assetIdxA: number,
  assetIdxB: number,
) {
  const prompts = storyboard?.visual_prompts;
  if (!prompts?.length) return storyboard;
  const indices = prompts
    .map((vp, i) => (Number(vp.block) === blockNum ? i : -1))
    .filter((i) => i >= 0);
  const absA = indices[assetIdxA];
  const absB = indices[assetIdxB];
  if (absA === undefined || absB === undefined || absA === absB) return storyboard;
  const next = [...prompts];
  const temp = next[absA];
  next[absA] = next[absB];
  next[absB] = temp;
  return { ...storyboard, visual_prompts: next };
}