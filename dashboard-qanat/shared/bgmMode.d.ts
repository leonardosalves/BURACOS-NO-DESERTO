export type BgmModeId = "single" | "block" | "emotion";

export declare function resolveBgmMode(
  config?: Record<string, unknown>,
  storyboard?: Record<string, unknown>,
  format?: "SHORT" | "LONG" | string,
): BgmModeId;