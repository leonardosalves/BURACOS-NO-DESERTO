/** Referência Remotion 1080p — mesmas proporções de CaptionPreview / LumieraTimeline */
const REF_SHORT = { w: 1080, h: 1920 };
const REF_LONG = { w: 1920, h: 1080 };

export type OverlayPreviewMetrics = {
  refLabel: string;
  fontSizeTitle: string;
  fontSizeSubtitle: string;
  fontSizeDesc: string;
  fontSizeCounter: string;
  fontSizeKinetic: string;
  iconSize: string;
  positionPad: {
    bottom: string;
    top: string;
    left: string;
    right: string;
  };
  cardPadding: string;
  cardGap: string;
  maxWidth: string;
};

export function getOverlayPreviewMetrics(format: 'short' | 'long'): OverlayPreviewMetrics {
  const isShort = format === 'short';
  const ref = isShort ? REF_SHORT : REF_LONG;
  const cqw = (px: number) => `${((px / ref.w) * 100).toFixed(3)}cqw`;
  const pctH = (px: number) => `${((px / ref.h) * 100).toFixed(2)}%`;

  return {
    refLabel: isShort ? '1080×1920' : '1920×1080',
    fontSizeTitle: cqw(isShort ? 38 : 28),
    fontSizeSubtitle: cqw(isShort ? 24 : 18),
    fontSizeDesc: cqw(isShort ? 16 : 10.5),
    fontSizeCounter: cqw(isShort ? 120 : 96),
    fontSizeKinetic: cqw(isShort ? 72 : 56),
    iconSize: cqw(isShort ? 48 : 36),
    positionPad: {
      bottom: pctH(isShort ? 640 : 210),
      top: pctH(isShort ? 180 : 80),
      left: cqw(isShort ? 48 : 64),
      right: cqw(isShort ? 48 : 64),
    },
    cardPadding: isShort ? `${pctH(16)} ${cqw(20)}` : `${pctH(14)} ${cqw(28)}`,
    cardGap: cqw(isShort ? 16 : 12),
    maxWidth: cqw(isShort ? 860 : 640),
  };
}

export function overlayPreviewFrameClass(format: 'short' | 'long'): string {
  return format === 'short'
    ? 'w-full max-w-[min(100%,300px)] mx-auto'
    : 'w-full';
}