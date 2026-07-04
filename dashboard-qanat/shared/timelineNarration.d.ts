export type NarrationTextContext = {
  visualPrompts?: Array<{ block?: number; narration_text?: string; narration_excerpt?: string }>;
  blockPhrases?: Array<{ block?: number; phrase?: string }>;
  timelineAssets?: Record<string, Array<{ narration_segment?: string }>>;
  blockStart?: number;
  blockEnd?: number;
};

export type FlatTranscriptWord = {
  word: string;
  clean?: string;
  start: number;
  end: number;
};

export declare function getAssetNarrationText(
  blockNum: number,
  assetIdx: number,
  context?: NarrationTextContext,
): string;

export declare function getBlockNarrationText(
  blockNum: number,
  context?: NarrationTextContext,
): string;

export declare function getBlockNarrationAnchor(
  blockNum: number,
  assets: Array<Record<string, unknown>>,
  flatTranscriptWords: FlatTranscriptWord[],
  context?: NarrationTextContext,
): number | null;