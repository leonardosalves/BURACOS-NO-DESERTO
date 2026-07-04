import React from 'react';
import { hudThemeStyles } from '@lumiera/overlays/listicleHudTheme';
import type { OverlayPreviewMetrics } from './overlayPreviewScale';
import type { OverlayPreviewMotion } from './overlayPreviewMotion';
import { interpolateClamped } from './overlayPreviewMotion';
import { OverlayPreviewMotionShell } from './OverlayPreviewMotionShell';

type RenderCtx = {
  props: Record<string, unknown>;
  accentColor: string;
  metrics: OverlayPreviewMetrics;
  motion: OverlayPreviewMotion;
  isShort: boolean;
  position: string;
};

export function renderListicleStingerPreview(ctx: RenderCtx) {
  const { accentColor, motion } = ctx;
  const flashIn = interpolateClamped(motion.frame, [0, 3], [0, 0.85]);
  const flashOut = interpolateClamped(motion.frame, [3, Math.max(4, motion.totalFrames)], [0.85, 0]);
  const flash = Math.min(flashIn, flashOut);
  const lineScale = interpolateClamped(motion.frame, [0, 6], [0.2, 1.2]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}55 0%, transparent 65%)`,
          opacity: flash * motion.opacity,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          style={{
            width: '120%',
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            transform: `scaleX(${lineScale})`,
            opacity: flash * motion.opacity,
            boxShadow: `0 0 24px ${accentColor}`,
          }}
        />
      </div>
    </div>
  );
}

export function renderChapterStingerPreview(ctx: RenderCtx) {
  const { props, accentColor, metrics, motion, position } = ctx;
  const lineWidth = interpolateClamped(motion.frame, [0, 14], [0, 100]);
  const title = String(props.title || 'Capítulo');

  return (
    <OverlayPreviewMotionShell position="center" pad={metrics.positionPad} motion={motion}>
      <div className="flex flex-col items-center gap-[0.45em] text-center px-[0.8em]">
        <div
          style={{
            width: `${lineWidth}%`,
            maxWidth: '14em',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            boxShadow: `0 0 20px ${accentColor}88`,
          }}
        />
        <span
          style={{
            fontSize: metrics.fontSizeTitle,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#F5F0E8',
            textShadow: `0 2px 24px ${accentColor}66`,
          }}
        >
          {title}
        </span>
        {props.subtitle && (
          <span style={{ fontSize: metrics.fontSizeDesc, color: 'rgba(248,250,252,0.75)' }}>
            {String(props.subtitle)}
          </span>
        )}
        <div
          style={{
            width: `${lineWidth * 0.6}%`,
            maxWidth: '8em',
            height: 1,
            background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)`,
          }}
        />
      </div>
    </OverlayPreviewMotionShell>
  );
}

export function renderListicleRecapPreview(ctx: RenderCtx) {
  const { props, accentColor, metrics, motion, position } = ctx;
  const lines = Array.isArray(props.lines) ? props.lines : [];
  const sampleLines = lines.length > 0
    ? lines.slice(0, 3).map((line, i) => {
      const item = (line && typeof line === 'object' ? line : {}) as Record<string, unknown>;
      return {
        rank: Number(item.rank) || i + 1,
        title: String(item.title || `Item ${i + 1}`),
      };
    })
    : [
      { rank: 3, title: 'Terceiro lugar' },
      { rank: 2, title: 'Segundo lugar' },
      { rank: 1, title: 'Campeão' },
    ];

  return (
    <OverlayPreviewMotionShell
      position={String(props.position || position || 'top-center')}
      pad={metrics.positionPad}
      motion={motion}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45em',
          padding: metrics.cardPadding,
          borderRadius: '0.65em',
          background: 'rgba(0,0,0,0.88)',
          border: `2px solid ${accentColor}66`,
          backdropFilter: 'blur(14px)',
          boxShadow: `0 14px 36px rgba(0,0,0,0.55), 0 0 24px ${accentColor}28`,
          maxWidth: metrics.maxWidth,
        }}
      >
        <p style={{ fontSize: metrics.fontSizeSubtitle, fontWeight: 800, color: accentColor, textAlign: 'center' }}>
          {String(props.title || 'RECAP')}
        </p>
        {sampleLines.map((line, index) => {
          const reveal = interpolateClamped(motion.frame, [6 + index * 8, 16 + index * 8], [0, 1]);
          return (
            <div
              key={`${line.rank}-${index}`}
              style={{
                opacity: reveal,
                transform: `translateY(${(1 - reveal) * 8}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4em',
              }}
            >
              <span
                style={{
                  fontSize: metrics.fontSizeDesc,
                  fontWeight: 800,
                  color: line.rank === 1 ? accentColor : '#a1a1aa',
                  minWidth: '1.6em',
                }}
              >
                #{line.rank}
              </span>
              <span style={{ fontSize: metrics.fontSizeDesc, color: '#f4f4f5' }}>{line.title}</span>
            </div>
          );
        })}
        <p style={{ fontSize: metrics.fontSizeDesc, color: '#a1a1aa', textAlign: 'center', marginTop: '0.2em' }}>
          {String(props.cta || 'Qual você colocaria em 1º?')}
        </p>
      </div>
    </OverlayPreviewMotionShell>
  );
}

export function renderRankProgressPreview(ctx: RenderCtx) {
  const { props, accentColor, metrics, motion } = ctx;
  const total = Math.max(1, Number(props.total) || 5);
  const rank = Number(props.rank ?? props.current ?? 3);
  const progress = Number(props.progress ?? rank);
  const hudTheme = String(props.hudTheme || 'ancient');
  const theme = hudThemeStyles(hudTheme as 'ancient', accentColor, rank === 1);
  const fillPct = interpolateClamped(motion.frame, [10, 40], [0, (progress / total) * 100]);
  const title = String(props.title || `TOP ${rank}`);

  return (
    <OverlayPreviewMotionShell
      position="bottom-center"
      pad={metrics.positionPad}
      motion={motion}
    >
      <div
        style={{
          background: theme.cardBackground,
          border: `2px solid ${theme.borderColor}`,
          boxShadow: theme.glow,
          borderRadius: '0.65em',
          padding: metrics.cardPadding,
          minWidth: '10em',
          maxWidth: metrics.maxWidth,
        }}
      >
        <div className="flex items-center gap-[0.35em] mb-[0.35em]">
          <span style={{ fontSize: metrics.fontSizeSubtitle, fontWeight: 800, color: accentColor }}>
            #{rank}
          </span>
          <span style={{ fontSize: metrics.fontSizeDesc, color: '#f4f4f5', fontWeight: 600 }}>
            {title}
          </span>
        </div>
        <div
          style={{
            height: '0.35em',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.max(4, fillPct)}%`,
              height: '100%',
              borderRadius: 'inherit',
              background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})`,
              boxShadow: `0 0 10px ${accentColor}66`,
            }}
          />
        </div>
        <p style={{ fontSize: metrics.fontSizeDesc, color: '#a1a1aa', marginTop: '0.25em' }}>
          {progress}/{total}
        </p>
      </div>
    </OverlayPreviewMotionShell>
  );
}