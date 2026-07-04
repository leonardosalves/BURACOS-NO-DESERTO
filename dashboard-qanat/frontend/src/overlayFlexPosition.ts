import type { CSSProperties } from 'react';
import type { OverlayPreviewMetrics } from './overlayPreviewScale';

export type OverlayScreenPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'right';

export function normalizeOverlayPosition(
  position?: string,
  fallback: OverlayScreenPosition = 'bottom-left',
): OverlayScreenPosition {
  const raw = String(position || '').trim();
  if (raw === 'right') return 'bottom-right';
  const allowed: OverlayScreenPosition[] = [
    'top-left', 'top-center', 'top-right', 'center',
    'bottom-left', 'bottom-center', 'bottom-right',
  ];
  if (allowed.includes(raw as OverlayScreenPosition)) return raw as OverlayScreenPosition;
  return fallback;
}

/** Flex no quadro do preview — espelha overlayPositionUtils do Remotion em %. */
export function overlayPreviewFlexStyle(
  position: string | undefined,
  metrics: OverlayPreviewMetrics,
  fallback: OverlayScreenPosition = 'bottom-right',
): CSSProperties {
  const pos = normalizeOverlayPosition(position, fallback);
  const pad = metrics.positionPad;

  const map: Record<OverlayScreenPosition, CSSProperties> = {
    'top-left': {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      padding: `${pad.top} ${pad.right} 0 ${pad.left}`,
    },
    'top-center': {
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: `${pad.top} ${pad.right} 0 ${pad.left}`,
    },
    'top-right': {
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      padding: `${pad.top} ${pad.right} 0 ${pad.left}`,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    'bottom-left': {
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      padding: `0 ${pad.right} ${pad.bottom} ${pad.left}`,
    },
    'bottom-center': {
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: `0 ${pad.right} ${pad.bottom} ${pad.left}`,
    },
    'bottom-right': {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      padding: `0 ${pad.right} ${pad.bottom} ${pad.left}`,
    },
    right: {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      padding: `0 ${pad.right} ${pad.bottom} ${pad.left}`,
    },
  };

  return {
    display: 'flex',
    flexDirection: 'column',
    ...map[pos],
  };
}