import React from 'react';
import type { OverlayPreviewMetrics } from './overlayPreviewScale';
import { normalizeOverlayPosition } from './overlayFlexPosition';
import {
  overlayMotionTransform,
  type OverlayPreviewMotion,
} from './overlayPreviewMotion';

type ShellMode = 'anchored' | 'fullscreen' | 'flex';

type Props = {
  position?: string;
  pad?: OverlayPreviewMetrics['positionPad'];
  motion: Pick<OverlayPreviewMotion, 'opacity' | 'scale' | 'slideX' | 'slideY'>;
  mode?: ShellMode;
  flexStyle?: React.CSSProperties;
  className?: string;
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
};

function resolveAnchor(
  position: string,
  pad: OverlayPreviewMetrics['positionPad'],
): { shell: React.CSSProperties; anchorTransform: string } {
  const key = normalizeOverlayPosition(position, 'bottom-left');
  const base: React.CSSProperties = { position: 'absolute' };

  const map: Record<string, { shell: React.CSSProperties; anchorTransform: string }> = {
    'bottom-left': { shell: { ...base, bottom: pad.bottom, left: pad.left }, anchorTransform: '' },
    'bottom-right': { shell: { ...base, bottom: pad.bottom, right: pad.right }, anchorTransform: '' },
    'bottom-center': { shell: { ...base, bottom: pad.bottom, left: '50%' }, anchorTransform: 'translateX(-50%)' },
    'top-left': { shell: { ...base, top: pad.top, left: pad.left }, anchorTransform: '' },
    'top-right': { shell: { ...base, top: pad.top, right: pad.right }, anchorTransform: '' },
    'top-center': { shell: { ...base, top: pad.top, left: '50%' }, anchorTransform: 'translateX(-50%)' },
    center: { shell: { ...base, top: '50%', left: '50%' }, anchorTransform: 'translate(-50%, -50%)' },
    right: { shell: { ...base, bottom: pad.bottom, right: pad.right }, anchorTransform: '' },
  };

  return map[key] || map['bottom-left'];
}

function combineTransform(anchorTransform: string, motion: Props['motion']): string | undefined {
  const motionPart = overlayMotionTransform(motion);
  const parts = [anchorTransform, motionPart !== 'none' ? motionPart : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}

export function OverlayPreviewMotionShell({
  position = 'bottom-left',
  pad = { bottom: '0', top: '0', left: '0', right: '0' },
  motion,
  mode = 'anchored',
  flexStyle,
  className = '',
  contentStyle,
  children,
}: Props) {
  if (mode === 'fullscreen') {
    return (
      <div className={`absolute inset-0 z-10 pointer-events-none ${className}`.trim()}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: motion.opacity,
            transform: overlayMotionTransform(motion),
            filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.75))',
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  if (mode === 'flex') {
    return (
      <div
        className={`absolute inset-0 z-10 pointer-events-none ${className}`.trim()}
        style={flexStyle}
      >
        <div
          style={{
            opacity: motion.opacity,
            transform: overlayMotionTransform(motion),
            filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.75))',
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  const anchor = resolveAnchor(position, pad);
  return (
    <div className={className} style={anchor.shell}>
      <div
        style={{
          opacity: motion.opacity,
          transform: combineTransform(anchor.anchorTransform, motion),
          filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.75))',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}