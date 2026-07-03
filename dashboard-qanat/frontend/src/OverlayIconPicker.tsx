import React, { useMemo, useState } from 'react';
import {
  LOTTIE_ICON_CATALOG,
  SVG_ICON_CATALOG,
  type OverlayIconStyle,
} from './overlayIconCatalog';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';

type Props = {
  iconId?: string;
  iconStyle?: OverlayIconStyle;
  accentColor?: string;
  /** Chaves visuais já usadas em outros blocos (destacados no grid). */
  usedIconIds?: string[];
  resolveUsedVisualKey?: (iconId: string, style: OverlayIconStyle) => string;
  onChange: (iconId: string | undefined, style: OverlayIconStyle) => void;
};

export function OverlayIconPicker({
  iconId,
  iconStyle = 'lottie',
  accentColor = '#D4AF37',
  usedIconIds = [],
  resolveUsedVisualKey,
  onChange,
}: Props) {
  const usedSet = useMemo(() => new Set(usedIconIds), [usedIconIds]);
  const [tab, setTab] = useState<OverlayIconStyle>(iconStyle);
  const [filter, setFilter] = useState('');

  const catalog = tab === 'svg' ? SVG_ICON_CATALOG : LOTTIE_ICON_CATALOG;
  const categories = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const items = catalog.filter((i) =>
      !q || i.label.toLowerCase().includes(q) || i.id.includes(q) || i.category.toLowerCase().includes(q),
    );
    const groups = new Map<string, typeof items>();
    items.forEach((item) => {
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    });
    return [...groups.entries()];
  }, [catalog, filter]);

  return (
    <div className="space-y-2 pt-1 border-t border-[var(--dash-border)]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-300">Ícone</span>
        <div className="flex gap-1 p-0.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)]">
          {(['lottie', 'svg'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                tab === t
                  ? 'bg-[rgba(130,128,253,0.2)] text-[var(--dash-primary-light)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'lottie' ? 'Lottie' : 'SVG anim.'}
            </button>
          ))}
        </div>
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar ícone…"
        className="dash-input text-[10px] py-1.5"
      />

      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-0.5">
        {categories.map(([category, items]) => (
          <div key={category}>
            <p className="text-[8px] uppercase tracking-wider text-zinc-500 mb-1">{category}</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {items.map((item) => {
                const active = iconId === item.id && iconStyle === tab;
                const visualKey = resolveUsedVisualKey
                  ? resolveUsedVisualKey(item.id, tab)
                  : item.id;
                const usedElsewhere = usedSet.has(visualKey) && !active;
                return (
                  <button
                    key={`${tab}-${item.id}`}
                    type="button"
                    title={usedElsewhere ? `${item.label} (já usado em outro bloco)` : item.label}
                    onClick={() => onChange(item.id, tab)}
                    className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition ${
                      active
                        ? 'border-[var(--dash-primary-light)] bg-[rgba(130,128,253,0.15)]'
                        : usedElsewhere
                          ? 'border-amber-500/35 bg-amber-500/5 hover:border-amber-500/55'
                          : 'border-[var(--dash-border)] hover:border-[rgba(130,128,253,0.35)] bg-[var(--dash-bg)]'
                    }`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center overflow-hidden shrink-0">
                      <OverlayAnimatedIcon
                        iconId={item.id}
                        iconStyle="svg"
                        size={16}
                        color={accentColor}
                      />
                    </div>
                    <span className="text-[7px] text-zinc-400 truncate w-full text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {iconId && (
        <button
          type="button"
          onClick={() => onChange(undefined, tab)}
          className="text-[9px] text-zinc-500 hover:text-red-400 transition"
        >
          Remover ícone
        </button>
      )}
    </div>
  );
}