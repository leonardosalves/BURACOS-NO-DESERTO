import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';
import { blockProgressDesignTokens, markerCenterPercent } from './blockProgressBarDesign';
import type { BlockProgressMarkerDraft, BlockProgressBarDraft } from './BlockProgressBarEditor';

type Props = {
  blocks: BlockProgressMarkerDraft[];
  design: BlockProgressBarDraft['design'];
  iconSize: number;
  defaultIconStyle: BlockProgressBarDraft['defaultIconStyle'];
  accentColor?: string;
  isShortFormat: boolean;
  totalDuration?: number;
};

const LOOP_MS = 9000;

export function BlockProgressBarPreview({
  blocks,
  design,
  iconSize,
  defaultIconStyle,
  accentColor = '#D4AF37',
  isShortFormat,
  totalDuration: totalDurationProp,
}: Props) {
  const [playing, setPlaying] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [activeBlock, setActiveBlock] = useState<number | null>(blocks[0]?.block ?? null);

  const totalDuration = totalDurationProp
    || blocks.reduce((max, b) => Math.max(max, b.start + b.duration), 0)
    || 120;

  const tokens = blockProgressDesignTokens(design, accentColor);

  useEffect(() => {
    if (!playing || blocks.length === 0) return undefined;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - started) % LOOP_MS;
      const pct = elapsed / LOOP_MS;
      const currentSec = pct * totalDuration;
      setProgressPct(pct * 100);
      const active = blocks.find((b) => currentSec >= b.start && currentSec < b.start + b.duration);
      setActiveBlock(active?.block ?? null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, blocks, totalDuration]);

  const iconPx = (marker: BlockProgressMarkerDraft) => Math.round(marker.iconSize || iconSize);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
          Preview animado
        </p>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="dash-btn-ghost text-[9px] px-2 py-1 flex items-center gap-1"
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? 'Pausar' : 'Reproduzir'}
        </button>
      </div>
      <div
        className={`relative rounded-xl border border-[var(--dash-border)] overflow-hidden bg-zinc-950 ${
          isShortFormat ? 'aspect-[9/16] max-w-[160px] mx-auto' : 'aspect-video w-full'
        }`}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: isShortFormat
              ? 'linear-gradient(160deg, #1a1a2e, #0f0f14 50%, #2d1f3d)'
              : 'linear-gradient(180deg, #1c1917, #0c0a09 55%, #1e293b)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />

        {isShortFormat ? (
          <>
            <div
              className="absolute rounded-full overflow-hidden"
              style={{
                left: 10,
                top: 40,
                width: tokens.trackH,
                height: 'calc(100% - 100px)',
                background: tokens.trackBg,
              }}
            >
              <div
                className="absolute bottom-0 left-0 w-full rounded-full"
                style={{
                  height: `${progressPct}%`,
                  background: tokens.fill,
                  boxShadow: tokens.fillGlow,
                  transition: playing ? 'none' : 'height 0.2s',
                }}
              />
            </div>
            {blocks.map((marker) => {
              const pct = markerCenterPercent(marker.start, marker.duration, totalDuration);
              const active = marker.block === activeBlock;
              const size = iconPx(marker);
              return (
                <div
                  key={marker.block}
                  className="absolute transition-transform duration-200"
                  style={{
                    left: 10 + tokens.trackH + tokens.iconGap + 4,
                    top: `calc(40px + (100% - 100px) * ${pct / 100})`,
                    transform: `translateY(-50%) scale(${active ? 1.15 : 0.88})`,
                    opacity: active ? 1 : 0.4,
                    filter: active ? `drop-shadow(0 0 6px ${accentColor}99)` : 'none',
                    width: size,
                    height: size,
                  }}
                >
                  <OverlayAnimatedIcon
                    iconId={marker.iconType}
                    iconStyle={marker.iconStyle || defaultIconStyle}
                    fill
                    color={active ? accentColor : `${accentColor}88`}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div
              className="absolute rounded-full"
              style={{
                top: 10,
                left: 16,
                right: 16,
                height: tokens.trackH,
                background: tokens.trackBg,
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 10,
                left: 16,
                width: `calc((100% - 32px) * ${progressPct / 100})`,
                height: tokens.trackH,
                background: tokens.fill,
                boxShadow: tokens.fillGlow,
                transition: playing ? 'none' : 'width 0.2s',
              }}
            />
            {design === 'documentary' && (
              <div
                className="absolute"
                style={{ top: 10 + tokens.trackH + 1, left: 16, right: 16, height: 1, background: `${accentColor}33` }}
              />
            )}
            {blocks.map((marker) => {
              const pct = markerCenterPercent(marker.start, marker.duration, totalDuration);
              const active = marker.block === activeBlock;
              const size = iconPx(marker);
              return (
                <div
                  key={marker.block}
                  className="absolute transition-transform duration-200"
                  style={{
                    left: `calc(16px + (100% - 32px) * ${pct / 100})`,
                    top: 10 + tokens.trackH + tokens.iconGap,
                    transform: `translateX(-50%) scale(${active ? 1.12 : 0.86})`,
                    opacity: active ? 1 : 0.4,
                    filter: active ? `drop-shadow(0 0 8px ${accentColor}99)` : 'none',
                    width: size,
                    height: size,
                  }}
                >
                  <OverlayAnimatedIcon
                    iconId={marker.iconType}
                    iconStyle={marker.iconStyle || defaultIconStyle}
                    fill
                    color={active ? accentColor : `${accentColor}88`}
                  />
                </div>
              );
            })}
          </>
        )}

        <span className="absolute bottom-1.5 right-2 text-[7px] text-zinc-500 uppercase tracking-wider">
          {design}
        </span>
        {activeBlock != null && (
          <span className="absolute bottom-1.5 left-2 text-[7px] text-violet-300/90 font-mono">
            bloco {activeBlock}
          </span>
        )}
      </div>
    </div>
  );
}