export declare const MAX_RETENTION_POST_SPEECH_HOLD_SEC: number;

export declare function isAssetFixedDurationLocked(asset: { fixed_locked?: boolean }): boolean;

export declare function computeChainedSceneDuration(
  asset: { audio_start?: number; speech_end?: number; fixed_locked?: boolean },
  allAssets: Array<{ audio_start?: number }>,
  assetIndex: number,
  blockEnd?: number,
): number | null;

export declare function computeAssetDuration(
  asset: { fixed?: number | null; synced_to_speech?: boolean; audio_start?: number; speech_end?: number; fixed_locked?: boolean },
  allAssets: Array<{ fixed?: number | null; audio_start?: number }>,
  blockDuration: number,
  options?: { assetIndex?: number; blockEnd?: number },
): number;

export declare function recalculateBlockSequentialAudioStarts(options: {
  assets?: Array<Record<string, unknown>>;
  blockDuration?: number;
  anchorStart?: number;
  resolveDuration?: (
    asset: Record<string, unknown>,
    allAssets: Array<Record<string, unknown>>,
    blockDuration: number,
  ) => number;
  preserveUntilIndex?: number;
  clearSpeechSync?: boolean;
}): Array<Record<string, unknown>>;