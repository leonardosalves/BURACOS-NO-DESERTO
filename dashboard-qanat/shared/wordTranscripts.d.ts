export declare function flattenWordTranscripts(
  wordTranscripts: unknown[],
  options?: { synthesizeFromText?: boolean },
): Array<{ word: string; clean: string; start: number; end: number; segmentIndex?: number }>;