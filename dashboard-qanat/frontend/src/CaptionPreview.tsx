import React, { useEffect, useState } from 'react';
import type { CaptionModeId } from './captionConfig';

type CaptionPreviewProps = {
  format: 'short' | 'long';
  mode: CaptionModeId;
  accentColor?: string;
  bgmPulse?: boolean;
  className?: string;
};

const SHORT_WORDS = ['A', 'FÍSICA', 'IMPOSÍVEL'];
const LONG_WORDS = ['A', 'física'];
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function scramblePreview(text: string, progress: number, seed: number): string {
  if (progress >= 1) return text;
  return text
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ' ';
      const revealAt = (i + 1) / text.length;
      if (progress >= revealAt) return ch;
      return SCRAMBLE[(seed + i * 11) % SCRAMBLE.length];
    })
    .join('');
}

const PARTICLE_OFFSETS = [
  { x: -14, y: -10, c: '#FF4D6D' },
  { x: 12, y: -8, c: '#22D3EE' },
  { x: -8, y: 12, c: '#FACC15' },
  { x: 16, y: 6, c: '#A78BFA' },
  { x: -18, y: 4, c: '#4ADE80' },
  { x: 6, y: -14, c: '#FB923C' },
];

export function CaptionPreview({
  format,
  mode,
  accentColor = '#FACC15',
  bgmPulse = false,
  className = '',
}: CaptionPreviewProps) {
  const [tick, setTick] = useState(0);
  const [subTick, setSubTick] = useState(0);
  const isShort = format === 'short';
  const isSlam = mode === 'caption-kinetic-slam';
  const isPill = mode === 'caption-pill-karaoke';
  const isNeon = mode === 'caption-neon-glow';
  const isWeight = mode === 'caption-weight-shift';
  const isGradient = mode === 'caption-gradient-fill';
  const isHighlight = mode === 'caption-highlight';
  const isGlitch = mode === 'caption-glitch-rgb';
  const isMatrix = mode === 'caption-matrix-decode';
  const isWipe = mode === 'caption-clip-wipe';
  const isBurst = mode === 'caption-particle-burst';
  const words = isShort ? SHORT_WORDS : LONG_WORDS;
  const activeIndex = tick % words.length;
  const visibleWords = isSlam ? [words[activeIndex]] : words;
  const wipeProgress = (subTick % 8) / 8;
  const matrixProgress = Math.min(1, (subTick % 10) / 10);
  const burstFade = Math.max(0, 1 - (subTick % 6) / 6);

  useEffect(() => {
    const ms = isSlam ? 1100 : isShort ? 900 : 1400;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [isShort, isSlam]);

  useEffect(() => {
    const id = window.setInterval(() => setSubTick((t) => t + 1), 80);
    return () => window.clearInterval(id);
  }, [activeIndex, mode]);

  const pulse = isHighlight && bgmPulse;
  const glitchShift = (subTick % 4) - 2;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950 ${
        isGlitch ? 'caption-preview-scanlines' : ''
      } ${className}`.trim()}
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
          isSlam
            ? 'inset-0 items-center max-w-full'
            : isShort
              ? 'bottom-[28%] max-w-[88%]'
              : 'bottom-[18%] max-w-[90%]'
        }`}
      >
        <div
          className={`flex flex-wrap justify-center items-center gap-1.5 ${
            isPill ? 'rounded-full px-4 py-2 border border-white/10 bg-black/70 backdrop-blur-sm' : ''
          }`}
        >
          {visibleWords.map((word, index) => {
            const realIndex = isSlam ? activeIndex : index;
            const active = realIndex === activeIndex;
            const highlightActive = isHighlight && active;
            const slamActive = isSlam && active;
            const displayWord = isMatrix && active
              ? scramblePreview(word, matrixProgress, tick + realIndex)
              : word;

            let transform = 'scale(1)';
            if (highlightActive) transform = pulse ? 'scale(1.08)' : 'scale(1.1)';
            if (slamActive) transform = 'scale(1.15)';

            const gradientStyle = isGradient && active
              ? {
                  background: `linear-gradient(135deg, ${accentColor}, #F472B6, #22D3EE)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }
              : {};

            return (
              <span
                key={`${word}-${realIndex}`}
                className={`relative font-black uppercase tracking-wide transition-all duration-200 ${
                  isSlam ? 'text-2xl sm:text-3xl' : isShort ? 'text-lg sm:text-xl' : isWeight && !active ? 'text-sm font-light' : 'text-base'
                } ${pulse && highlightActive ? 'caption-preview-pulse' : ''}`}
                style={{
                  transform,
                  fontWeight: isWeight ? (active ? 900 : 300) : 900,
                  fontFamily: isMatrix && active && matrixProgress < 1 ? 'monospace' : undefined,
                  color: highlightActive
                    ? '#0A0A0A'
                    : isGlitch && active
                      ? '#E2E8F0'
                      : isNeon && active
                        ? '#22D3EE'
                        : isGradient && active
                          ? 'transparent'
                          : active
                            ? accentColor
                            : '#FFFFFF',
                  background: highlightActive
                    ? `linear-gradient(135deg, ${accentColor} 0%, #FDE047 100%)`
                    : 'transparent',
                  padding: highlightActive ? '2px 10px' : '0',
                  borderRadius: highlightActive ? '8px' : 0,
                  clipPath: isWipe && active
                    ? `inset(0 ${Math.round((1 - wipeProgress) * 100)}% 0 0)`
                    : undefined,
                  opacity: active ? 1 : isWeight ? 0.55 : 0.72,
                  textShadow: isGlitch && active
                    ? `${glitchShift - 2}px 0 #FF4D6D, ${glitchShift + 2}px 0 #22D3EE, 0 0 8px rgba(255,255,255,0.4)`
                    : isNeon && active
                      ? '0 0 12px #22D3EE, 0 0 20px #F472B6'
                      : active && !isHighlight && !isGradient
                        ? `0 0 10px ${accentColor}88`
                        : '0 2px 6px rgba(0,0,0,0.65)',
                  boxShadow: pulse && highlightActive ? `0 0 18px ${accentColor}55` : undefined,
                  ...gradientStyle,
                }}
              >
                {displayWord}
                {isBurst && active && burstFade > 0 && PARTICLE_OFFSETS.map((p, pi) => (
                  <span
                    key={pi}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 4,
                      height: 4,
                      left: '50%',
                      top: '50%',
                      marginLeft: p.x * burstFade,
                      marginTop: p.y * burstFade,
                      background: p.c,
                      opacity: burstFade,
                      boxShadow: `0 0 6px ${p.c}`,
                    }}
                  />
                ))}
              </span>
            );
          })}
        </div>
      </div>

      <div className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500 bg-black/40 px-2 py-0.5 rounded">
        {isShort ? '9:16' : '16:9'} · {mode.replace('caption-', '')}
      </div>
    </div>
  );
}