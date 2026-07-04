export declare const PORTUGUESE_STOP_WORDS: ReadonlySet<string>;

export declare function cleanText(text: string): string[];

export declare function matchWords(w1: string, w2: string): boolean;

export type FlatTranscriptWord = {
  word: string;
  clean?: string;
  start: number;
  end: number;
};

export type NarrationMatchBounds = {
  searchAfter?: number;
  searchBefore?: number;
};

export type NarrationMatchResult = {
  start: number;
  end: number;
  duration: number;
  bestFirstMatchIdx: number;
  bestLastMatchIdx: number;
  matchedWords: number;
  totalWords: number;
};

export declare function findNarrationMatch(
  narrationText: string,
  flatTranscriptWords: FlatTranscriptWord[],
  bounds?: NarrationMatchBounds,
): NarrationMatchResult | null;

export declare const findBoundedNarrationMatch: typeof findNarrationMatch;