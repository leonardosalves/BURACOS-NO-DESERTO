import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';
import { blockProgressDesignTokens, markerCenterPercent } from './blockProgressBarDesign';
import {
  resolveBlockProgressTitleFontStack,
  type BlockProgressTitleFontId,
} from './blockProgressBarTitles';
import type { BlockProgressMarkerDraft, BlockProgressBarDraft } from './BlockProgressBarEditor';

type Props = {
  blocks: BlockProgressMarkerDraft[];
  design: BlockProgressBarDraft['design'];
  iconSize: number;
  defaultIconStyle: BlockProgressBarDraft['defaultIconStyle'];
  showBlockTitles?: boolean;
  titleFont?: BlockProgressTitleFontId;
  titleFontSize?: number;
  titleColor?: string;
  accentColor?: string;
  isShortFormat: boolean;
  totalDuration?: number;
};

function blockTitleLabel(marker: BlockProgressMarkerDraft) {
  return String(marker.title || marker.label || `Bloco ${marker.block}`).trim();
}

const LOOP_MS = 9000;

export function BlockProgressBarPreview({
  blocks,
  design,
  iconSize,
  defaultIconStyle,
  showBlockTitles = false,
  titleFont = 'inter',
  titleFontSize,
  titleColor = '#FFFFFF',
  accentColor = '#D4AF37',
  isShortFormat,
  totalDuration: totalDurationProp,
}: Props) {
  const resolvedTitleSize = titleFontSize || (isShortFormat ? 9 : 10);
  const titleFontStack = resolveBlockProgressTitleFontStack(titleFont);
  const slotWidthPct = Math.max(56, Math.floor((100 - 4) / Math.max(1, blocks.length)));
  const [playing, setPlaying] = useState(true);
  const [activeBlock, setActiveBlock] = useState<number | null>(blocks[0]?.block ?? null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<number | null>(blocks[0]?.block ?? null);

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
      const fill = progressFillRef.current;
      if (fill) {
        if (isShortFormat) {
          fill.style.height = `${pct * 100}%`;
        } else {
          fill.style.width = `calc((100% - 32px) * ${pct})`;
        }
      }
      const active = blocks.find((b) => currentSec >= b.start && currentSec < b.start + b.duration);
      const nextActive = active?.block ?? null;
      if (nextActive !== activeBlockRef.current) {
        activeBlockRef.current = nextActive;
        setActiveBlock(nextActive);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, blocks, totalDuration, isShortFormat]);

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
                ref={progressFillRef}
                className="absolute bottom-0 left-0 w-full rounded-full"
                style={{
                  height: '0%',
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
                  className="absolute flex flex-col items-start gap-0.5 transition-transform duration-200 max-w-[calc(100%-36px)]"
                  style={{
                    left: 10 + tokens.trackH + tokens.iconGap + 4,
                    top: `calc(40px + (100% - 100px) * ${pct / 100})`,
                    transform: `translateY(-50%) scale(${active ? 1.08 : 0.9})`,
                    transformOrigin: 'top left',
                    opacity: active ? 1 : 0.4,
                    filter: active ? `drop-shadow(0 0 6px ${accentColor}99)` : 'none',
                  }}
                >
                  <div className="shrink-0" style={{ width: size, height: size }}>
                    <OverlayAnimatedIcon
                      iconId={marker.iconType}
                      iconStyle={marker.iconStyle || defaultIconStyle}
                      fill
                      color={active ? accentColor : `${accentColor}88`}
                    />
                  </div>
                  {showBlockTitles && (
                    <span
                      className="leading-snug drop-shadow-sm font-semibold text-left break-words"
                      style={{
                        fontFamily: titleFontStack,
                        fontSize: active ? resolvedTitleSize : Math.max(7, resolvedTitleSize - 1),
                        color: active ? titleColor : `${titleColor}88`,
                        maxWidth: 'calc(100% - 8px)',
                      }}
                    >
                      {blockTitleLabel(marker)}
                    </span>
                  )}
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
              ref={progressFillRef}
              className="absolute rounded-full"
              style={{
                top: 10,
                left: 16,
                width: '0%',
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
                  className="absolute flex flex-col items-center gap-0.5 transition-transform duration-200"
                  style={{
                    left: `calc(16px + (100% - 32px) * ${pct / 100})`,
                    top: 10 + tokens.trackH + tokens.iconGap,
                    transform: `translateX(-50%) scale(${active ? 1.08 : 0.88})`,
                    transformOrigin: 'top center',
                    opacity: active ? 1 : 0.4,
                    filter: active ? `drop-shadow(0 0 8px ${accentColor}99)` : 'none',
                    width: `${slotWidthPct}%`,
                    maxWidth: 140,
                  }}
                >
                  <div className="shrink-0" style={{ width: size, height: size }}>
                    <OverlayAnimatedIcon
                      iconId={marker.iconType}
                      iconStyle={marker.iconStyle || defaultIconStyle}
                      fill
                      color={active ? accentColor : `${accentColor}88`}
                    />
                  </div>
                  {showBlockTitles && (
                    <span
                      className="leading-snug drop-shadow-sm font-semibold text-center break-words w-full"
                      style={{
                        fontFamily: titleFontStack,
                        fontSize: active ? resolvedTitleSize : Math.max(7, resolvedTitleSize - 1),
                        color: active ? titleColor : `${titleColor}88`,
                      }}
                    >
                      {blockTitleLabel(marker)}
                    </span>
                  )}
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