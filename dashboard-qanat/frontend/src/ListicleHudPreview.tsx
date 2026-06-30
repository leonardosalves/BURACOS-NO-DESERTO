import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import {
  hudThemeStyles,
  lottieDataForKey,
  lottieIconBadgeStyle,
  lottieVariantSeed,
  resolveLottieKey,
  type ListicleHudTheme,
} from '@lumiera/overlays/listicleHudTheme';

type HudStyle = 'full' | 'compact' | 'auto';

export type HudPreviewItem = {
  rank: number;
  title: string;
  visualHook?: string;
};

export type HudPreviewListItem = {
  rank?: number;
  title?: string;
  name?: string;
  visual_hook?: string;
  hook?: string;
};

type Props = {
  rankCount: number;
  rankOrder: 'desc' | 'asc';
  hudStyle: HudStyle;
  items?: HudPreviewItem[];
  hasRealListItems?: boolean;
  accentColor?: string;
  hudTheme?: ListicleHudTheme;
  videoSeed?: string;
};

const TITLE_WARN_CHARS = 60;

export function shortenHudTitle(raw: string, maxLen = TITLE_WARN_CHARS): string {
  if (!raw) return '';
  let t = raw.trim();
  const paren = t.indexOf('(');
  if (paren > 10) t = t.slice(0, paren).trim();
  const dashExplain = t.match(/^(.{8,50}?)\s*[—–-]\s+/);
  if (dashExplain) t = dashExplain[1].trim();
  if (t.length > maxLen) {
    const cut = t.lastIndexOf(' ', maxLen - 1);
    t = `${(cut > 20 ? t.slice(0, cut) : t.slice(0, maxLen - 1)).trim()}…`;
  }
  return t;
}

/** Monta itens do HUD a partir de list_items do roteiro (não sample_items das ideias). */
export function buildHudPreviewItems(
  rankCount: number,
  rankOrder: 'desc' | 'asc',
  listItems: HudPreviewListItem[] = [],
): { items: HudPreviewItem[]; hasRealListItems: boolean } {
  const ranks = rankOrder === 'desc'
    ? Array.from({ length: rankCount }, (_, i) => rankCount - i)
    : Array.from({ length: rankCount }, (_, i) => i + 1);

  const byRank = new Map<number, { title: string; visualHook: string }>();
  for (const entry of listItems) {
    const rank = Number(entry.rank);
    const title = shortenHudTitle(String(entry.title || entry.name || '').trim());
    const visualHook = String(entry.visual_hook || entry.hook || '').trim();
    if (Number.isFinite(rank) && rank > 0 && title) {
      byRank.set(rank, { title, visualHook });
    }
  }

  if (byRank.size === 0 && listItems.length > 0) {
    const ordered = [...listItems];
    if (rankOrder === 'desc') ordered.reverse();
    ordered.forEach((entry, idx) => {
      const rank = ranks[idx];
      if (!rank || byRank.has(rank)) return;
      const title = shortenHudTitle(String(entry.title || entry.name || '').trim());
      const visualHook = String(entry.visual_hook || entry.hook || '').trim();
      if (title) byRank.set(rank, { title, visualHook });
    });
  }

  const hasRealListItems = byRank.size > 0;
  const items = ranks.map((rank) => {
    const hit = byRank.get(rank);
    return {
      rank,
      title: hit?.title || `Item #${rank}`,
      visualHook: hit?.visualHook || '',
    };
  });

  return { items, hasRealListItems };
}

function resolveHudStyle(hudStyle: HudStyle, rankCount: number) {
  if (hudStyle === 'auto') return rankCount > 8 ? 'compact' : 'full';
  return hudStyle;
}

function filledProgress(rank: number, rankCount: number, rankOrder: 'desc' | 'asc') {
  return rankOrder === 'desc' ? rankCount - rank + 1 : rank;
}

function HudPreviewLottie({
  animationData,
  size,
  accentColor,
  isClimax,
}: {
  animationData: object;
  size: number;
  accentColor: string;
  isClimax: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const badge = lottieIconBadgeStyle(size, accentColor, isClimax);

  useEffect(() => {
    if (!ref.current) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    return () => {
      anim.destroy();
    };
  }, [animationData]);

  return (
    <div className="flex items-center justify-center flex-shrink-0" style={badge.shell}>
      <div ref={ref} style={badge.lottie} />
    </div>
  );
}

export function ListicleHudPreview({
  rankCount,
  rankOrder,
  hudStyle,
  items = [],
  hasRealListItems = false,
  accentColor = '#C5A880',
  hudTheme = 'ancient',
  videoSeed = '',
}: Props) {
  const effectiveStyle = resolveHudStyle(hudStyle, rankCount);
  const previewItems = items;
  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, Math.max(0, previewItems.length - 1));
  const active = previewItems[safeIdx] ?? previewItems[0];

  const longTitles = previewItems.filter((item) => item.title.length > TITLE_WARN_CHARS);

  if (!active) return null;

  const climaxRank = rankOrder === 'desc' ? 1 : rankCount;
  const isClimax = active.rank === climaxRank;
  const progress = filledProgress(active.rank, rankCount, rankOrder);
  const theme = hudThemeStyles(hudTheme, accentColor, isClimax);
  const lottieKey = resolveLottieKey({
    isClimax,
    rank: active.rank,
    title: active.title,
    visualHook: active.visualHook || '',
    videoSeed,
  });
  const lottieData = lottieDataForKey(
    lottieKey,
    lottieVariantSeed([videoSeed, active.rank, active.title, active.visualHook || '', lottieKey]),
  );
  const dotCount = Math.min(rankCount, 8);
  const useBar = rankCount > 8;
  const lottieSize = effectiveStyle === 'compact' ? 40 : 52;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Preview do HUD (igual ao vídeo)
        </p>
        <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
          estilo {effectiveStyle}
        </span>
      </div>

      <p className="text-[10px] text-zinc-500 leading-relaxed">
        O HUD só aparece no <span className="text-zinc-300">1º item da lista</span> — não na intro.
        Ícone Lottie fica só ao lado do título, escolhido pelo texto do item.
      </p>

      {!hasRealListItems && (
        <p className="text-[10px] text-amber-400/90 leading-relaxed rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          Os títulos reais do TOP# aparecem aqui depois de gerar o roteiro (campo <span className="font-mono text-amber-200/90">list_items</span>).
          Não usamos os exemplos das ideias sugeridas.
        </p>
      )}

      {previewItems.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {previewItems.map((item, idx) => (
            <button
              key={`tab-${item.rank}`}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                idx === safeIdx
                  ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              #{item.rank}
            </button>
          ))}
        </div>
      )}

      <div
        className="relative rounded-2xl overflow-hidden border border-zinc-800 mx-auto"
        style={{ aspectRatio: '9 / 16', maxHeight: 320, maxWidth: 200 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 via-zinc-900 to-black" />
        <div
          className="absolute inset-x-0 top-0 h-[38%] pointer-events-none"
          style={{ background: theme.topGradient }}
        />

        <div className="absolute top-5 left-2 right-2">
          <div
            className="rounded-[18px] px-4 py-3 flex flex-col gap-2.5"
            style={{
              background: theme.cardBackground,
              border: `2.5px solid ${theme.borderColor}`,
              boxShadow: theme.glow,
            }}
          >
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <span
                className="font-cinzel font-extrabold tracking-wide leading-none"
                style={{
                  fontSize: 28,
                  color: isClimax ? '#FFE9A8' : '#FFFFFF',
                  textShadow: '0 0 2px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.75)',
                }}
              >
                #{active.rank}
              </span>
              <span
                className="font-sans font-extrabold uppercase tracking-widest leading-none"
                style={{ fontSize: 16, color: accentColor }}
              >
                Top {rankCount}
              </span>
            </div>

            {effectiveStyle === 'full' && active.title && (
              <div
                className="flex items-center justify-center gap-2 pt-2"
                style={{ borderTop: `1px solid ${theme.divider}` }}
              >
                <HudPreviewLottie
                  animationData={lottieData}
                  size={lottieSize}
                  accentColor={accentColor}
                  isClimax={isClimax}
                />
                <p
                  className="text-white text-xs font-bold leading-snug break-words text-center"
                  style={{
                    textShadow: '0 0 2px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.75)',
                  }}
                >
                  {active.title}
                </p>
              </div>
            )}

            <div className="flex justify-center pt-0.5">
              {useBar ? (
                <div className="flex items-center gap-2 w-full max-w-[140px]">
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(progress / rankCount) * 100}%`,
                        background: `linear-gradient(90deg, ${accentColor}, ${isClimax ? '#FFE9A8' : accentColor})`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-extrabold text-white/95 min-w-[36px] text-right">
                    {progress}/{rankCount}
                  </span>
                </div>
              ) : (
                <div className="flex gap-1.5 items-center">
                  {Array.from({ length: dotCount }, (_, i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: i < progress ? accentColor : 'rgba(255,255,255,0.22)',
                        boxShadow: i < progress ? `0 0 10px ${accentColor}` : 'none',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {isClimax && (
          <div
            className="absolute top-1 left-1 right-1 rounded-lg px-2 py-1 text-center"
            style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${accentColor}44` }}
          >
            <p className="text-[8px] text-zinc-300 uppercase tracking-wider">
              Recap animado no topo neste momento
            </p>
          </div>
        )}
      </div>

      <p className="text-[9px] text-zinc-600 text-center">
        Ícone atual: <span className="text-zinc-400">{lottieKey}</span>
        {active.title ? ` — detectado em “${active.title.slice(0, 40)}${active.title.length > 40 ? '…' : ''}”` : ''}
      </p>

      {longTitles.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wide">
            Títulos longos detectados
          </p>
          <ul className="mt-1 space-y-1">
            {longTitles.map((item) => (
              <li key={`warn-${item.rank}-${item.title}`} className="text-[10px] text-amber-200/90 leading-relaxed">
                #{item.rank} — {item.title.length} caracteres (ideal ≤ {TITLE_WARN_CHARS})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function warnLongListicleTitles(titles: string[], limit = TITLE_WARN_CHARS) {
  return titles
    .map((title, index) => ({ title: title.trim(), index }))
    .filter((entry) => entry.title.length > limit);
}