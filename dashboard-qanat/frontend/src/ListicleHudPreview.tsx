type HudStyle = 'full' | 'compact' | 'auto';

type PreviewItem = {
  rank: number;
  title: string;
};

type Props = {
  rankCount: number;
  rankOrder: 'desc' | 'asc';
  hudStyle: HudStyle;
  items?: PreviewItem[];
  accentColor?: string;
};

const TITLE_WARN_CHARS = 60;

function resolveHudStyle(hudStyle: HudStyle, rankCount: number) {
  if (hudStyle === 'auto') return rankCount > 8 ? 'compact' : 'full';
  return hudStyle;
}

function buildPreviewItems(rankCount: number, rankOrder: 'desc' | 'asc', items: PreviewItem[] = []) {
  if (items.length) return items.slice(0, 3);
  const ranks = Array.from({ length: Math.min(3, rankCount) }, (_, i) => (
    rankOrder === 'desc' ? rankCount - i : i + 1
  ));
  return ranks.map((rank) => ({
    rank,
    title: rank === (rankOrder === 'desc' ? 1 : rankCount)
      ? 'Item destaque do ranking'
      : `Item #${rank} do ranking`,
  }));
}

export function ListicleHudPreview({
  rankCount,
  rankOrder,
  hudStyle,
  items = [],
  accentColor = '#C5A880',
}: Props) {
  const effectiveStyle = resolveHudStyle(hudStyle, rankCount);
  const previewItems = buildPreviewItems(rankCount, rankOrder, items);
  const longTitles = [...items, ...previewItems]
    .filter((item) => item.title.length > TITLE_WARN_CHARS);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Preview do HUD no vídeo
        </p>
        <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
          estilo {effectiveStyle}
        </span>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden border border-zinc-800"
        style={{ aspectRatio: '9 / 16', maxHeight: 280 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black" />
        <div
          className="absolute inset-x-0 top-0 h-[38%]"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
        />

        <div className="absolute top-4 left-3 right-3 space-y-2">
          {previewItems.map((item) => (
            <div
              key={item.rank}
              className="rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(0,0,0,0.88)',
                border: `2px solid ${accentColor}66`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.45)`,
              }}
            >
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="font-cinzel text-white font-extrabold text-xl tracking-wide">
                  #{item.rank}
                </span>
                <span
                  className="font-sans font-extrabold text-sm uppercase tracking-widest"
                  style={{ color: accentColor }}
                >
                  Top {rankCount}
                </span>
              </div>

              {effectiveStyle === 'full' && (
                <div
                  className="mt-2 pt-2 flex items-center justify-center gap-2"
                  style={{ borderTop: `1px solid ${accentColor}33` }}
                >
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow"
                    aria-hidden
                  >
                    🧭
                  </span>
                  <p className="text-white text-sm font-semibold leading-snug break-words text-center">
                    {item.title}
                  </p>
                </div>
              )}

              <div className="mt-2 flex justify-center gap-1.5">
                {Array.from({ length: Math.min(rankCount, 8) }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      background: i < item.rank ? accentColor : 'rgba(255,255,255,0.22)',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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