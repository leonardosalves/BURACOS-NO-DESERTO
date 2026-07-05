/**
 * Distribuição dinâmica de palavras Whisper por asset na timeline — espelha preview do editor.
 */

import type { BlockNarrationWord, TimelineAsset } from "./timelineNarrationSync";
import {
  collectAssetWordsFromTranscriptSegments,
  resolveGlobalAudioTime,
  transcriptsUseChunkSegments,
} from "./timelineNarrationSync";

type TranscriptSegment = {
  block?: number;
  index?: number;
  chunk_id?: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
  words?: Array<{ word: string; start: number; end: number }>;
};

export type DynamicAssetWordsResult = {
  words: BlockNarrationWord[];
  text: string;
  assetAudioStart: number;
  assetAudioEnd: number;
  blockAudioStart: number;
  blockAudioEnd: number;
  totalBlockWords: number;
  coveredWords: number;
};

function computeCoverage(
  allBlockWords: BlockNarrationWord[],
  blockAssets: TimelineAsset[],
  blockKey: string,
  getAssetDuration: (blockKey: string, index: number) => number,
  narrationStart: number,
  narrationLastEnd: number,
  blockStart: number,
): number {
  let totalEndTime = narrationStart;
  for (let i = 0; i < blockAssets.length; i += 1) {
    const asset = blockAssets[i];
    const rawStart = Number(asset?.audio_start);
    if (Number.isFinite(rawStart)) {
      const globalStart = resolveGlobalAudioTime(rawStart, blockStart, blockAssets);
      const dur = getAssetDuration(blockKey, i);
      totalEndTime = Math.max(totalEndTime, globalStart + dur);
      continue;
    }
    totalEndTime += getAssetDuration(blockKey, i);
  }
  const effectiveEnd = Math.max(totalEndTime, narrationLastEnd + 0.15);
  return allBlockWords.filter((w) => w.start < effectiveEnd - 0.05).length;
}

export function getDynamicAssetWords({
  blockKey,
  assetIdx,
  blockNarrationWordsCache,
  timelineAssets,
  getAssetDuration,
  wordTranscripts = [],
  blockStarts = [],
  preferChunkSegments = false,
}: {
  blockKey: string;
  assetIdx: number;
  blockNarrationWordsCache: Record<string, BlockNarrationWord[]>;
  timelineAssets: Record<string, TimelineAsset[]>;
  getAssetDuration: (blockKey: string, index: number) => number;
  wordTranscripts?: TranscriptSegment[];
  blockStarts?: number[];
  preferChunkSegments?: boolean;
}): DynamicAssetWordsResult | null {
  const allBlockWords = blockNarrationWordsCache[blockKey] || [];
  if (allBlockWords.length === 0) return null;

  const narrationStart = allBlockWords[0].start;
  const narrationLastEnd = allBlockWords[allBlockWords.length - 1].end;
  const blockAssets = timelineAssets[blockKey] || [];
  const totalAssets = blockAssets.length;
  const currentAsset = blockAssets[assetIdx];
  const blockNum = parseInt(blockKey, 10);
  const blockStart = blockStarts?.[blockNum - 1] ?? narrationStart;

  const useChunkSegments = preferChunkSegments
    || transcriptsUseChunkSegments(wordTranscripts)
    || blockAssets.some((a) => a.synced_to_speech === true && String(a.chunk_id || "").trim());

  if (useChunkSegments && wordTranscripts.length > 0) {
    const segmentWords = collectAssetWordsFromTranscriptSegments(
      wordTranscripts,
      blockNum,
      currentAsset,
      assetIdx,
    );
    if (segmentWords.length > 0) {
      const rawStart = Number(currentAsset?.audio_start);
      const rawEnd = Number(currentAsset?.speech_end);
      const assetAudioStart = Number.isFinite(rawStart)
        ? resolveGlobalAudioTime(rawStart, blockStart, blockAssets)
        : segmentWords[0].start;
      const speechEnd = Number.isFinite(rawEnd)
        ? resolveGlobalAudioTime(rawEnd, blockStart, blockAssets)
        : segmentWords[segmentWords.length - 1].end;
      const assetAudioEnd = Math.max(speechEnd, segmentWords[segmentWords.length - 1].end) + 0.12;

      return {
        words: segmentWords,
        text: segmentWords.map((w) => w.word).join(" "),
        assetAudioStart,
        assetAudioEnd,
        blockAudioStart: narrationStart,
        blockAudioEnd: narrationLastEnd,
        totalBlockWords: allBlockWords.length,
        coveredWords: computeCoverage(
          allBlockWords,
          blockAssets,
          blockKey,
          getAssetDuration,
          narrationStart,
          narrationLastEnd,
          blockStart,
        ),
      };
    }
  }

  let assetAudioStart: number;
  if (currentAsset?.audio_start !== undefined && currentAsset?.audio_start !== null) {
    assetAudioStart = resolveGlobalAudioTime(
      Number(currentAsset.audio_start),
      blockStart,
      blockAssets,
    );
  } else {
    assetAudioStart = narrationStart;
    for (let i = 0; i < assetIdx; i += 1) {
      assetAudioStart += getAssetDuration(blockKey, i);
    }
  }

  const assetDuration = getAssetDuration(blockKey, assetIdx);
  const rawAssetAudioEnd = assetAudioStart + assetDuration;
  const speechEndRaw = Number(currentAsset?.speech_end);
  const speechEnd = Number.isFinite(speechEndRaw)
    ? resolveGlobalAudioTime(speechEndRaw, blockStart, blockAssets)
    : NaN;
  const isLastAsset = assetIdx === totalAssets - 1;

  const assetAudioEnd = Number.isFinite(speechEnd) && speechEnd > assetAudioStart
    ? speechEnd + 0.12
    : (isLastAsset
      ? Math.min(narrationLastEnd + 0.15, rawAssetAudioEnd)
      : rawAssetAudioEnd);

  let assetWords: BlockNarrationWord[];
  if (Number.isFinite(speechEnd) && speechEnd > assetAudioStart) {
    assetWords = allBlockWords.filter((w) =>
      w.start >= assetAudioStart - 0.10 && w.end <= speechEnd + 0.08,
    );
  } else if (isLastAsset) {
    assetWords = allBlockWords.filter((w) =>
      w.start >= assetAudioStart - 0.10 && w.start <= narrationLastEnd + 0.08,
    );
  } else {
    assetWords = allBlockWords.filter((w) =>
      w.start >= assetAudioStart - 0.10 && w.start < assetAudioEnd - 0.05,
    );
  }

  return {
    words: assetWords,
    text: assetWords.map((w) => w.word).join(" "),
    assetAudioStart,
    assetAudioEnd,
    blockAudioStart: narrationStart,
    blockAudioEnd: narrationLastEnd,
    totalBlockWords: allBlockWords.length,
    coveredWords: computeCoverage(
      allBlockWords,
      blockAssets,
      blockKey,
      getAssetDuration,
      narrationStart,
      narrationLastEnd,
      blockStart,
    ),
  };
}