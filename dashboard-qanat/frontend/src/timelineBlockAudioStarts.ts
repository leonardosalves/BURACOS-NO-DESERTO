/**
 * Reancoragem de audio_start por bloco — extraído do App.tsx para paridade editor/render.
 */

import {
  computeAssetDuration,
  recalculateBlockSequentialAudioStarts,
} from "@lumiera/shared/timelineAudioStarts.js";
import {
  resolveBlockNarrationAnchor,
  type BlockNarrationWord,
  type NarrationSyncContext,
  type TimelineAsset,
} from "./timelineNarrationSync";

export function resolveBlockAudioAnchorStart({
  ctx,
  blockNum,
  blockKey,
  assets,
  flatTranscriptWords,
  blockNarrationWordsCache,
  blockTimingStart = 0,
}: {
  ctx: NarrationSyncContext;
  blockNum: number;
  blockKey: string;
  assets: TimelineAsset[];
  flatTranscriptWords: Array<{ word: string; clean?: string; start: number; end: number }>;
  blockNarrationWordsCache: Record<string, BlockNarrationWord[]>;
  blockTimingStart?: number;
}): number {
  const allBlockWords = blockNarrationWordsCache[blockKey] || [];
  const matchedAnchor = resolveBlockNarrationAnchor(ctx, blockNum, assets, flatTranscriptWords);
  const cacheAnchor = allBlockWords.length > 0 ? allBlockWords[0].start : null;
  return matchedAnchor ?? cacheAnchor ?? blockTimingStart;
}

export function recalculateBlockAudioStarts({
  blockKey,
  assets,
  blockDuration,
  ctx,
  flatTranscriptWords,
  blockNarrationWordsCache,
  blockTimingStart = 0,
  preserveUntilIndex = -1,
}: {
  blockKey: string;
  assets: TimelineAsset[];
  blockDuration: number;
  ctx: NarrationSyncContext;
  flatTranscriptWords: Array<{ word: string; clean?: string; start: number; end: number }>;
  blockNarrationWordsCache: Record<string, BlockNarrationWord[]>;
  blockTimingStart?: number;
  preserveUntilIndex?: number;
}): TimelineAsset[] {
  const blockNum = parseInt(blockKey, 10);
  const anchorStart = resolveBlockAudioAnchorStart({
    ctx,
    blockNum,
    blockKey,
    assets,
    flatTranscriptWords,
    blockNarrationWordsCache,
    blockTimingStart,
  });
  return recalculateBlockSequentialAudioStarts({
    assets,
    blockDuration,
    anchorStart,
    preserveUntilIndex,
    resolveDuration: (asset, all) => computeAssetDuration(asset, all, blockDuration),
  });
}

export function enrichTimelineAudioStarts<T extends { timeline_assets?: Record<string, TimelineAsset[]> }>(
  cfg: T,
  recalculateBlock: (blockKey: string, assets: TimelineAsset[]) => TimelineAsset[],
  options?: { force?: boolean },
): T {
  const timelineAssets = { ...(cfg.timeline_assets || {}) };
  Object.keys(timelineAssets).forEach((blockKey) => {
    const assets = timelineAssets[blockKey];
    if (!assets?.length) return;
    const speechSynced = assets.some((a) => a.synced_to_speech);
    if (options?.force || !speechSynced) {
      timelineAssets[blockKey] = recalculateBlock(blockKey, assets);
    }
  });
  return { ...cfg, timeline_assets: timelineAssets };
}