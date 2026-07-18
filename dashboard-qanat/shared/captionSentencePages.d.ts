export type TimedCaptionWord = {
  text: string;
  startMs: number;
  endMs: number;
  [key: string]: unknown;
};

export type CaptionSentencePage<T extends TimedCaptionWord = TimedCaptionWord> =
  {
    words: T[];
    startMs: number;
    endMs: number;
  };

export function groupCaptionsIntoSentencePages<T extends TimedCaptionWord>(
  captions?: T[],
  options?: {
    maxCharacters?: number;
    maxWords?: number;
    pauseThresholdMs?: number;
    minWords?: number;
    minPageDurationMs?: number;
  }
): Array<CaptionSentencePage<T>>;

export function balanceCaptionLines<T extends { text?: string; word?: string }>(
  words?: T[],
  singleLineCharacters?: number
): T[][];
