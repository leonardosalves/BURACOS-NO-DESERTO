import React, { useEffect, useState } from 'react';
import type { CaptionStyleId, LongCaptionEffectId, ShortCaptionEffectId } from './captionConfig';

type CaptionPreviewProps = {
  format: 'short' | 'long';
  style: CaptionStyleId;
  effect: ShortCaptionEffectId | LongCaptionEffectId;
  accentColor?: string;
  className?: string;
};

const SHORT_WORDS = ['A', 'FÍSICA', 'IMPOSÍVEL'];
const LONG_WORDS = ['A', 'física'];

export function CaptionPreview({
  format,
  style,
  effect,
  accentColor = '#FACC15',
  className = '',
}: CaptionPreviewProps) {
  const [tick, setTick] = useState(0);
  const isShort = format === 'short';
  const isViral = style === 'shorts-viral';
  const words = isShort ? SHORT_WORDS : LONG_WORDS;
  const activeIndex = tick % words.length;

  useEffect(() => {
    const ms = isShort ? 900 : 1400;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [isShort]);

  const shortEffect = effect as ShortCaptionEffectId;
  const longEffect = effect as LongCaptionEffectId;
  const pulse = isShort && shortEffect === 'viral-pulse';
  const pop = isShort && isViral && shortEffect === 'viral-pop';
  const staticHighlight = isShort && shortEffect === 'viral-static';

  const showPill = !isShort && isViral === false && longEffect === 'doc-pill';
  const glowOnly = !isShort && longEffect === 'doc-glow';
  const minimal = !isShort && longEffect === 'doc-minimal';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950 ${className}`.trim()}
      style={{ aspectRatio: isShort ? '9 / 16' : '16 / 9' }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: isShort
            ? 'linear-gradient(160deg, #1a1a2e 0%, #0f0f14 45%, #2d1f3d 100%)'
            : 'linear-gradient(180deg, #1c1917 0%, #0c0a09 60%, #1e293b 100%)',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      <div
        className={`absolute left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1.5 px-3 ${
          isShort ? 'bottom-[28%] max-w-[88%]' : 'bottom-[18%] max-w-[90%]'
        }`}
      >
        <div
          className={`flex flex-wrap justify-center items-center gap-1.5 ${
            showPill ? 'rounded-full px-4 py-2 border border-white/10 bg-black/70 backdrop-blur-sm' : ''
          }`}
        >
          {words.map((word, index) => {
            const active = index === activeIndex;
            const viralActive = isViral && active;
            const docActive = !isViral && active;

            let transform = 'scale(1)';
            if (viralActive && pop) transform = 'scale(1.12)';
            if (viralActive && pulse) transform = 'scale(1.08)';
            if (viralActive && staticHighlight) transform = 'scale(1)';

            return (
              <span
                key={`${word}-${index}`}
                className={`font-black uppercase tracking-wide transition-all duration-200 ${
                  isShort ? 'text-lg sm:text-xl' : minimal ? 'text-sm' : 'text-base'
                } ${pulse && viralActive ? 'caption-preview-pulse' : ''}`}
                style={{
                  transform,
                  color: viralActive
                    ? '#0A0A0A'
                    : docActive
                      ? accentColor
                      : '#FFFFFF',
                  background: viralActive
                    ? `linear-gradient(135deg, ${accentColor} 0%, #FDE047 100%)`
                    : 'transparent',
                  padding: viralActive ? '2px 10px' : '0',
                  borderRadius: viralActive ? '8px' : 0,
                  opacity: active ? 1 : isViral ? 0.88 : 0.72,
                  textShadow: glowOnly && docActive
                    ? `0 0 14px ${accentColor}99`
                    : docActive && !showPill
                      ? '0 0 10px rgba(250,204,21,0.45)'
                      : '0 2px 6px rgba(0,0,0,0.65)',
                  boxShadow: pulse && viralActive ? `0 0 18px ${accentColor}55` : undefined,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      <div className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500 bg-black/40 px-2 py-0.5 rounded">
        {isShort ? '9:16' : '16:9'} · preview
      </div>
    </div>
  );
}