export declare function computeAssetDuration(
  asset: { fixed?: number | null },
  allAssets: Array<{ fixed?: number | null }>,
  blockDuration: number,
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