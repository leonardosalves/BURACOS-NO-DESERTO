/** Narração por bloco/asset — sem vazamento entre blocos; split só quando o usuário pede. */

import {
  cleanText,
  findBoundedNarrationMatch,
  matchWords,
  type NarrationMatchResult,
} from "@lumiera/shared/narrationMatch.js";
import { getBlockNarrationAnchor as getBlockNarrationAnchorCore } from "@lumiera/shared/timelineNarration.js";
import { repairMojibake } from "./textEncoding";

export {
  findBoundedNarrationMatch,
  findBoundedNarrationMatch as findNarrationMatch,
} from "@lumiera/shared/narrationMatch.js";

export type BlockTimingStatus = {
  block_timings?: {
    starts?: number[];
    durations?: number[];
  };
};

export type TimelineAsset = {
  asset?: string;
  chunk_id?: string;
  type?: string;
  fixed?: number;
  fixed_locked?: boolean;
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
  storyboard?: {
    visual_prompts?: Array<{
      block?: number;
      narration_text?: string;
      narration_excerpt?: string;
    }>;
  };
  status?: BlockTimingStatus;
  getAssetDuration: (blockKey: string, index: number) => number;
};

/** Âncora de fala do bloco — mesma lógica do render (shared/timelineNarration). */
export function resolveBlockNarrationAnchor(
  ctx: NarrationSyncContext,
  blockNum: number,
  assets: TimelineAsset[],
  flatTranscriptWords: Array<{
    word: string;
    clean?: string;
    start: number;
    end: number;
  }>
): number | null {
  const bounds = getBlockTimeBounds(ctx.status, blockNum);
  return getBlockNarrationAnchorCore(blockNum, assets, flatTranscriptWords, {
    visualPrompts: ctx.storyboard?.visual_prompts || [],
    blockPhrases: ctx.config?.block_phrases || [],
    timelineAssets: ctx.config?.timeline_assets || {},
    blockStart: bounds.searchAfter,
    blockEnd: bounds.searchBefore,
  });
}

export function getBlockTimeBounds(
  status: BlockTimingStatus | undefined,
  blockNum: number
) {
  const starts = status?.block_timings?.starts;
  const durations = status?.block_timings?.durations;
  const blockStart = Number(starts?.[blockNum - 1]);
  const blockDuration = Number(durations?.[blockNum - 1]);
  const blockEnd =
    Number.isFinite(blockStart) && Number.isFinite(blockDuration)
      ? blockStart + blockDuration
      : Infinity;
  return {
    searchAfter: Number.isFinite(blockStart) ? blockStart : 0,
    searchBefore: blockEnd,
  };
}

/** Bounds estritos (sem margem fuzzy) — para cache de palavras por bloco, evita vazamento. */
export function getStrictBlockBounds(
  status: BlockTimingStatus | undefined,
  blockNum: number
) {
  const starts = status?.block_timings?.starts;
  const durations = status?.block_timings?.durations;
  const blockStart = Number(starts?.[blockNum - 1]);
  const blockDuration = Number(durations?.[blockNum - 1]);
  return {
    start: Number.isFinite(blockStart) ? blockStart : 0,
    end:
      Number.isFinite(blockStart) && Number.isFinite(blockDuration)
        ? blockStart + blockDuration
        : Infinity,
  };
}

export function getBlockNarrationText(
  ctx: NarrationSyncContext,
  blockNum: number
): string {
  const scenes = (ctx.storyboard?.visual_prompts || []).filter(
    (vp) => Number(vp.block) === blockNum
  );
  const sceneTexts = scenes
    .map((vp) =>
      repairMojibake(
        String(vp.narration_text || vp.narration_excerpt || "").trim()
      )
    )
    .filter(Boolean);
  if (sceneTexts.length > 0) return sceneTexts.join(" ");

  const bp = ctx.config?.block_phrases?.find(
    (x) => Number(x.block) === blockNum
  );
  const blockPhrase = repairMojibake(String(bp?.phrase || "").trim());
  if (blockPhrase) return blockPhrase;
  return "";
}

/** Divide o texto do bloco proporcionalmente à duração de cada asset (ação explícita do usuário). */
export function splitNarrationAmongAssets(
  ctx: NarrationSyncContext,
  blockKey: string,
  assetIdx: number
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
    wordStart += Math.max(
      1,
      Math.round((durations[i] / totalDur) * words.length)
    );
  }
  const wordCount = Math.max(
    1,
    Math.round((durations[assetIdx] / totalDur) * words.length)
  );
  const sliceEnd =
    assetIdx === assets.length - 1 ? words.length : wordStart + wordCount;
  return words.slice(wordStart, sliceEnd).join(" ");
}

/** Aplica split em todos os assets do bloco — retorna cópia atualizada do array. */
export function applySplitNarrationToBlockAssets(
  ctx: NarrationSyncContext,
  blockKey: string
): TimelineAsset[] {
  const assets = [...(ctx.config?.timeline_assets?.[blockKey] || [])];
  return assets.map((asset, idx) => ({
    ...asset,
    narration_segment: splitNarrationAmongAssets(ctx, blockKey, idx),
  }));
}

export function getAssetNarrationText(
  ctx: NarrationSyncContext,
  blockKey: string,
  assetIdx: number
): string {
  const blockNum = parseInt(blockKey, 10);
  const scenes = (ctx.storyboard?.visual_prompts || []).filter(
    (vp) => Number(vp.block) === blockNum
  );
  if (scenes.length > assetIdx) {
    const sceneText = repairMojibake(
      String(
        scenes[assetIdx]?.narration_text ||
          scenes[assetIdx]?.narration_excerpt ||
          ""
      ).trim()
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

export type NarrationMatchCache = Record<string, NarrationMatchResult>;

export function buildNarrationMatchesCache({
  timelineAssets,
  flatTranscriptWords,
  status,
  getAssetText,
  getBlockText,
}: {
  timelineAssets: Record<string, TimelineAsset[]>;
  flatTranscriptWords: Array<{
    word: string;
    clean?: string;
    start: number;
    end: number;
  }>;
  status?: BlockTimingStatus;
  getAssetText: (blockKey: string, idx: number) => string;
  getBlockText: (blockNum: number) => string;
}): NarrationMatchCache {
  const cache: NarrationMatchCache = {};
  if (!flatTranscriptWords?.length) return cache;

  Object.keys(timelineAssets).forEach((blockKey) => {
    const blockNum = parseInt(blockKey, 10);
    if (!Number.isFinite(blockNum)) return;
    const bounds = getBlockTimeBounds(status, blockNum);
    const assets = timelineAssets[blockKey] || [];
    assets.forEach((_, idx) => {
      const narrationText = getAssetText(blockKey, idx);
      if (!narrationText) return;
      const key = narrationCacheKey(blockNum, narrationText);
      if (cache[key]) return;
      const hit = findBoundedNarrationMatch(
        narrationText,
        flatTranscriptWords,
        bounds
      );
      if (hit) cache[key] = hit;
    });
    const blockText = getBlockText(blockNum);
    if (blockText) {
      const key = narrationCacheKey(blockNum, blockText);
      if (!cache[key]) {
        const hit = findBoundedNarrationMatch(
          blockText,
          flatTranscriptWords,
          bounds
        );
        if (hit) cache[key] = hit;
      }
    }
  });

  return cache;
}

export function lookupNarrationTimestamps(
  narrationText: string,
  blockNum: number,
  cache: NarrationMatchCache,
  flatTranscriptWords: Array<{
    word: string;
    clean?: string;
    start: number;
    end: number;
  }>,
  status?: BlockTimingStatus
): NarrationMatchResult | null {
  if (!narrationText || !Number.isFinite(blockNum)) return null;
  const cacheKey = narrationCacheKey(blockNum, narrationText);
  if (cache[cacheKey]) return cache[cacheKey];
  const bounds = getBlockTimeBounds(status, blockNum);
  return findBoundedNarrationMatch(narrationText, flatTranscriptWords, bounds);
}

type TranscriptSegment = {
  block?: number;
  chunk_id?: string;
  index?: number;
  start_time?: number;
  end_time?: number;
  duration?: number;
  words?: Array<{ word: string; start: number; end: number }>;
};

/** Palavras do bloco a partir dos segmentos Whisper (campo block) — evita vazamento por block_timings largo. */
export function collectBlockWordsFromTranscriptSegments(
  wordTranscripts: TranscriptSegment[],
  blockNum: number
): Array<{ word: string; start: number; end: number }> {
  if (!Array.isArray(wordTranscripts)) return [];
  const segs = wordTranscripts
    .filter((s) => Number(s.block) === blockNum)
    .sort(
      (a, b) =>
        Number(a.index) - Number(b.index) ||
        Number(a.start_time) - Number(b.start_time)
    );

  const out: Array<{ word: string; start: number; end: number }> = [];
  for (const seg of segs) {
    const segStart = Number(seg.start_time) || 0;
    const segDuration =
      seg.duration ?? Math.max(0.5, (seg.end_time || 0) - segStart);
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

/** 1 segmento Whisper/chunk = 1 asset — evita misturar palavras por janela de tempo errada. */
export function collectAssetWordsFromTranscriptSegments(
  wordTranscripts: TranscriptSegment[],
  blockNum: number,
  asset: TimelineAsset | undefined,
  assetIdx: number
): BlockNarrationWord[] {
  if (!Array.isArray(wordTranscripts)) return [];
  const segs = wordTranscripts
    .filter((s) => Number(s.block) === blockNum)
    .sort(
      (a, b) =>
        Number(a.index) - Number(b.index) ||
        Number(a.start_time) - Number(b.start_time)
    );

  const chunkId = String(asset?.chunk_id || "").trim();
  let seg = chunkId
    ? segs.find((s) => String(s.chunk_id || "") === chunkId)
    : undefined;
  if (!seg && segs.length > 0) {
    seg = segs[Math.min(Math.max(assetIdx, 0), segs.length - 1)];
  }
  if (!seg?.words?.length) return [];

  const segStart = Number(seg.start_time) || 0;
  const segDuration =
    Number(seg.duration) ||
    Math.max(0.5, (Number(seg.end_time) || segStart) - segStart);

  return (seg.words || [])
    .map((w) => {
      let wStart = Number(w.start);
      let wEnd = Number(w.end);
      if (wStart <= segDuration + 0.5) {
        wStart += segStart;
        wEnd += segStart;
      }
      const token = String(w.word || "").trim();
      return {
        word: repairMojibake(token),
        start: wStart,
        end: wEnd,
      };
    })
    .filter((w) => w.word.length > 0);
}

export function transcriptsUseChunkSegments(
  wordTranscripts: TranscriptSegment[]
): boolean {
  return (
    Array.isArray(wordTranscripts) &&
    wordTranscripts.some((s) => String(s.chunk_id || "").trim().length > 0)
  );
}

/** Converte audio_start block-relative (0-based) para tempo global na narração master. */
export function resolveGlobalAudioTime(
  value: number,
  blockStart: number,
  blockAssets: TimelineAsset[]
): number {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(blockStart) || blockStart <= 0.05) return value;
  const starts = blockAssets
    .map((a) => Number(a.audio_start))
    .filter((n) => Number.isFinite(n));
  if (!starts.length) return value;
  if (Math.max(...starts) < blockStart - 0.25) return blockStart + value;
  return value;
}

/** Alinha palavras do roteiro/storyboard aos timestamps do Whisper (mesma lógica do App.tsx). */
export function mapStoryboardWordsWithTiming(
  narrationText: string,
  flatTranscriptWords: Array<{
    word: string;
    clean?: string;
    start: number;
    end: number;
  }>,
  bestFirstMatchIdx: number,
  bestLastMatchIdx: number
): Array<{ word: string; start: number; end: number }> {
  const rawWords = narrationText.split(/\s+/).filter(Boolean);
  if (
    bestFirstMatchIdx < 0 ||
    bestLastMatchIdx < 0 ||
    !flatTranscriptWords?.length
  ) {
    return rawWords.map((w) => ({
      word: repairMojibake(w),
      start: 0,
      end: 999999,
    }));
  }

  let transcriptIdx = bestFirstMatchIdx;
  const result: Array<{ word: string; start: number; end: number }> = [];

  for (let i = 0; i < rawWords.length; i++) {
    const part = rawWords[i];
    const cleanedPart = cleanText(part)[0] || "";
    let matched = false;
    const searchLimit = Math.min(
      transcriptIdx + 12,
      flatTranscriptWords.length
    );

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
        : flatTranscriptWords[
            Math.min(transcriptIdx, flatTranscriptWords.length - 1)
          ]?.start || 0;
      result.push({
        word: repairMojibake(part),
        start: fallbackStart,
        end: fallbackStart + 0.3,
      });
    }
  }

  return result;
}

export type BlockNarrationWord = { word: string; start: number; end: number };

/** Palavras com timestamp por bloco — segmentos Whisper ou match no transcript flat. */
export function buildBlockNarrationWordsCache({
  timelineAssets,
  flatTranscriptWords,
  wordTranscripts,
  ctx,
}: {
  timelineAssets: Record<string, TimelineAsset[]>;
  flatTranscriptWords: Array<{
    word: string;
    clean?: string;
    start: number;
    end: number;
  }>;
  wordTranscripts: TranscriptSegment[];
  ctx: NarrationSyncContext;
}): Record<string, BlockNarrationWord[]> {
  const cache: Record<string, BlockNarrationWord[]> = {};
  if (!timelineAssets || !flatTranscriptWords?.length) return cache;

  Object.keys(timelineAssets).forEach((blockKey) => {
    const allWords: BlockNarrationWord[] = [];
    const seenPositions = new Set<string>();
    const blockNum = parseInt(blockKey, 10);

    const segmentWords = collectBlockWordsFromTranscriptSegments(
      wordTranscripts,
      blockNum
    );
    if (segmentWords.length > 0) {
      segmentWords.forEach((w) => {
        const key = `${w.start.toFixed(3)}-${w.word}`;
        if (!seenPositions.has(key)) {
          allWords.push(w);
          seenPositions.add(key);
        }
      });
    } else {
      const blockText = getBlockNarrationText(ctx, blockNum);
      if (blockText) {
        const bounds = getBlockTimeBounds(ctx.status, blockNum);
        const strictBounds = getStrictBlockBounds(ctx.status, blockNum);
        const matched = findBoundedNarrationMatch(
          blockText,
          flatTranscriptWords,
          bounds
        );
        if (matched) {
          const words = mapStoryboardWordsWithTiming(
            blockText,
            flatTranscriptWords,
            matched.bestFirstMatchIdx,
            matched.bestLastMatchIdx
          );
          words.forEach((w) => {
            if (
              w.start < strictBounds.start - 0.05 ||
              w.start >= strictBounds.end
            )
              return;
            const key = `${w.start.toFixed(3)}-${w.word}`;
            if (!seenPositions.has(key)) {
              allWords.push(w);
              seenPositions.add(key);
            }
          });
        }
      }
    }

    allWords.sort((a, b) => a.start - b.start);
    cache[blockKey] = allWords;
  });

  return cache;
}

export function swapBlockVisualPromptsInStoryboard(
  storyboard: { visual_prompts?: any[] },
  blockNum: number,
  assetIdxA: number,
  assetIdxB: number
) {
  const prompts = storyboard?.visual_prompts;
  if (!prompts?.length) return storyboard;
  const indices = prompts
    .map((vp, i) => (Number(vp.block) === blockNum ? i : -1))
    .filter((i) => i >= 0);
  const absA = indices[assetIdxA];
  const absB = indices[assetIdxB];
  if (absA === undefined || absB === undefined || absA === absB)
    return storyboard;
  const next = [...prompts];
  const temp = next[absA];
  next[absA] = next[absB];
  next[absB] = temp;
  return { ...storyboard, visual_prompts: next };
}
