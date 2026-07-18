import React from "react";
import { Map, Palette } from "lucide-react";
import {
  DEFAULT_VISUAL_ASSET_STYLE,
  VISUAL_ASSET_STYLES,
  getVisualAssetStyle,
} from "@lumiera/shared/visualAssetStyles.js";

type StyleOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
};

export type VisualAssetStylePickerProps = {
  value?: string | null;
  onChange: (styleId: string) => void;
  mapOnly?: boolean;
  onMapOnlyChange?: (enabled: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function VisualAssetStylePicker({
  value,
  onChange,
  mapOnly = false,
  onMapOnlyChange,
  disabled = false,
  compact = false,
  className = "",
}: VisualAssetStylePickerProps) {
  const styles = VISUAL_ASSET_STYLES as StyleOption[];
  const current = getVisualAssetStyle(
    String(value || DEFAULT_VISUAL_ASSET_STYLE)
  ) as StyleOption;

  if (compact) {
    return (
      <div
        className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ${className}`}
      >
        <label className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          <Palette className="h-3 w-3 shrink-0 text-fuchsia-300/80" />
          <select
            value={current.id}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-[10px] font-semibold text-zinc-100 outline-none focus:border-fuchsia-400/40 disabled:opacity-50"
            title={current.description}
          >
            {styles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </label>
        {onMapOnlyChange && (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[9px] font-bold text-emerald-200/90">
            <input
              type="checkbox"
              checked={mapOnly}
              disabled={disabled}
              onChange={(e) => onMapOnlyChange(e.target.checked)}
              className="accent-emerald-500"
            />
            <Map className="h-3 w-3" />
            Mapas
          </label>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-black/25 p-3 sm:p-4 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200/90">
            <Palette className="h-3.5 w-3.5" />
            Estilo visual dos assets
          </p>
          <p className="mt-1 max-w-xl text-[11px] leading-5 text-zinc-500">
            Vale para todas as ferramentas de criação e para o botão{" "}
            <span className="text-zinc-300">Engenharia Visual PRO</span>. O
            projeto inteiro usa o mesmo look.
          </p>
        </div>
        <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2.5 py-1 text-[9px] font-bold text-fuchsia-200">
          {current.label}
          {mapOnly ? " · mapas" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {styles.map((style) => {
          const active = style.id === current.id;
          return (
            <button
              key={style.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(style.id)}
              title={style.description}
              className={`rounded-xl border px-2.5 py-2 text-left transition ${
                active
                  ? "border-fuchsia-400/40 bg-fuchsia-500/15 shadow-[0_0_0_1px_rgba(232,121,249,0.15)]"
                  : "border-white/[0.06] bg-zinc-950/50 hover:border-white/15 hover:bg-zinc-900/70"
              } disabled:opacity-50`}
            >
              <span
                className={`block text-[10px] font-black tracking-tight ${
                  active ? "text-fuchsia-100" : "text-zinc-200"
                }`}
              >
                {style.shortLabel || style.label}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[8px] leading-3.5 text-zinc-500">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>
      {onMapOnlyChange && (
        <label
          className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
            mapOnly
              ? "border-emerald-400/35 bg-emerald-500/10"
              : "border-white/[0.06] bg-zinc-950/40 hover:border-emerald-500/25"
          }`}
        >
          <input
            type="checkbox"
            checked={mapOnly}
            disabled={disabled}
            onChange={(e) => onMapOnlyChange(e.target.checked)}
            className="mt-0.5 accent-emerald-500"
          />
          <span className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-100">
              <Map className="h-3.5 w-3.5" />
              Somente prompts de mapas
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">
              Gera só cartografia informativa alinhada à narração — o mapa
              respeita a idade/época do acontecimento (romano, medieval, séc.
              XX, satélite atual, etc.). Combina com o estilo visual acima.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
