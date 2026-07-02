import type { CaptionModeId } from './captionConfig';
import { isWordByWordMode } from './captionConfig';

/** Referência Remotion 1080p — mesmas proporções de LumieraTimeline.tsx */
const REF_SHORT = { w: 1080, h: 1920 };
const REF_LONG = { w: 1920, h: 1080 };

export type CaptionPreviewMetrics = {
  fontSize: string;
  fontSizeEditorialInactive?: string;
  fontSizeEmoji?: string;
  paddingBottom: string;
  paddingX: string;
  columnGap: string;
  rowGap: string;
  highlightPadY: string;
  highlightPadX: string;
  highlightRadius: string;
  pillPad: string;
  particleSize: string;
  maxWidth: string;
};

export function getCaptionPreviewMetrics(format: 'short' | 'long', mode: CaptionModeId): CaptionPreviewMetrics {
  const isShort = format === 'short';
  const ref = isShort ? REF_SHORT : REF_LONG;
  const wordByWord = isWordByWordMode(mode);
  const isSlam = mode === 'caption-kinetic-slam';
  const isWeight = mode === 'caption-weight-shift';
  const isEditorial = mode === 'caption-editorial-emphasis';

  const cqw = (px: number) => `${((px / ref.w) * 100).toFixed(3)}cqw`;
  const pctH = (px: number) => `${((px / ref.h) * 100).toFixed(2)}%`;

  let fontPx = isShort
    ? (isSlam ? 88 : wordByWord ? 64 : isWeight ? 52 : 58)
    : (isSlam ? 72 : wordByWord ? 44 : isWeight ? 34 : 38);

  if (isEditorial) {
    fontPx = Math.round(fontPx * 1.35);
  }

  const padBottom = isSlam
    ? '0'
    : isShort
      ? (wordByWord ? pctH(220) : pctH(240))
      : pctH(70);

  return {
    fontSize: cqw(fontPx),
    fontSizeEditorialInactive: isEditorial ? cqw(Math.round(fontPx * 0.82 / 1.35)) : undefined,
    fontSizeEmoji: cqw(isShort ? 42 : 32),
    paddingBottom: padBottom,
    paddingX: isShort ? cqw(48) : cqw(180),
    columnGap: cqw(wordByWord ? 14 : isShort ? 22 : 16),
    rowGap: cqw(wordByWord ? 8 : isShort ? 12 : 8),
    highlightPadY: cqw(6),
    highlightPadX: cqw(18),
    highlightRadius: cqw(12),
    pillPad: isShort ? `${pctH(20)} ${cqw(40)}` : `${pctH(14)} ${cqw(28)}`,
    particleSize: cqw(isShort ? 8 : 6),
    maxWidth: isShort ? cqw(wordByWord ? 900 : 800) : cqw(1000),
  };
}