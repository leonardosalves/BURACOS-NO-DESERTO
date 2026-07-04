/**
 * Distribuição dinâmica de palavras Whisper por asset na timeline — espelha preview do editor.
 */

import type { BlockNarrationWord, TimelineAsset } from "./timelineNarrationSync";

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

export function getDynamicAssetWords({
  blockKey,
  assetIdx,
  blockNarrationWordsCache,
  timelineAssets,
  getAssetDuration,
}: {
  blockKey: string;
  assetIdx: number;
  blockNarrationWordsCache: Record<string, BlockNarrationWord[]>;
  timelineAssets: Record<string, TimelineAsset[]>;
  getAssetDuration: (blockKey: string, index: number) => number;
}): DynamicAssetWordsResult | null {
  const allBlockWords = blockNarrationWordsCache[blockKey] || [];
  if (allBlockWords.length === 0) return null;

  const narrationStart = allBlockWords[0].start;
  const narrationLastEnd = allBlockWords[allBlockWords.length - 1].end;
  const blockAssets = timelineAssets[blockKey] || [];
  const totalAssets = blockAssets.length;
  const currentAsset = blockAssets[assetIdx];

  let assetAudioStart: number;
  if (currentAsset?.audio_start !== undefined && currentAsset?.audio_start !== null) {
    assetAudioStart = Number(currentAsset.audio_start);
  } else {
    assetAudioStart = narrationStart;
    for (let i = 0; i < assetIdx; i += 1) {
      assetAudioStart += getAssetDuration(blockKey, i);
    }
  }

  const assetDuration = getAssetDuration(blockKey, assetIdx);
  const rawAssetAudioEnd = assetAudioStart + assetDuration;
  const speechEnd = Number(currentAsset?.speech_end);
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

  let totalEndTime = narrationStart;
  for (let i = 0; i < totalAssets; i += 1) {
    totalEndTime += getAssetDuration(blockKey, i);
  }
  const effectiveEnd = Math.max(totalEndTime, narrationLastEnd + 0.15);
  const coveredWords = allBlockWords.filter((w) => w.start < effectiveEnd - 0.05).length;

  return {
    words: assetWords,
    text: assetWords.map((w) => w.word).join(" "),
    assetAudioStart,
    assetAudioEnd,
    blockAudioStart: narrationStart,
    blockAudioEnd: narrationLastEnd,
    totalBlockWords: allBlockWords.length,
    coveredWords,
  };
}