/**
 * Alinha durações e audio_start dos assets ao match Whisper — bloco único ou todos.
 */

import type { NarrationMatchResult } from "@lumiera/shared/narrationMatch.js";
import type { TimelineAsset } from "./timelineNarrationSync";

export type SpeechAlignMode = "perSpeech" | "toBlockEnd";

export function alignBlockAssetsToTranscript(
  assets: TimelineAsset[],
  blockNum: number,
  getNarrationText: (assetIdx: number) => string,
  findTimestamps: (text: string, blockNum: number) => NarrationMatchResult | null,
  options: {
    blockEnd?: number;
    lastAssetMode?: SpeechAlignMode;
    setSpeechEnd?: boolean;
  } = {},
): { assets: TimelineAsset[]; alignedCount: number } {
  const updated = assets.map((a) => ({ ...a }));
  const lastAssetMode = options.lastAssetMode ?? "perSpeech";
  const setSpeechEnd = options.setSpeechEnd ?? false;
  const blockEnd = Number(options.blockEnd);

  const getNextMatchedStart = (startIdx: number): number | null => {
    for (let i = startIdx; i < updated.length; i += 1) {
      const text = getNarrationText(i);
      const match = findTimestamps(text, blockNum);
      if (match) return match.start;
    }
    return null;
  };

  let alignedCount = 0;
  updated.forEach((asset, idx) => {
    if (asset.fixed_locked) return;

    const narrationText = getNarrationText(idx);
    const matched = findTimestamps(narrationText, blockNum);
    if (!matched) return;

    if (setSpeechEnd) {
      asset.speech_end = parseFloat(matched.end.toFixed(3));
    }

    const isLast = idx === updated.length - 1;
    if (isLast && lastAssetMode === "toBlockEnd" && Number.isFinite(blockEnd)) {
      asset.fixed = parseFloat(Math.max(0.5, blockEnd - matched.start).toFixed(1));
    } else if (isLast) {
      asset.fixed = parseFloat(Math.max(0.5, matched.end - matched.start).toFixed(1));
    } else {
      const nextStart = getNextMatchedStart(idx + 1);
      asset.fixed = parseFloat(
        Math.max(0.5, (nextStart !== null ? nextStart - matched.start : matched.duration)).toFixed(1),
      );
    }

    delete asset.fixed_locked;
    asset.audio_start = parseFloat(matched.start.toFixed(3));
    asset.synced_to_speech = true;
    alignedCount += 1;
  });

  return { assets: updated, alignedCount };
}