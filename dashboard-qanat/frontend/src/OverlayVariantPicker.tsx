import React from 'react';
import { infoCardVariantStyle, lowerThirdVariantShell } from './overlayPreviewStyles';

type VariantOption = { id: string; label: string };

type Props = {
  overlayType: string;
  variants: VariantOption[];
  value: string;
  accentColor?: string;
  theme?: string;
  onChange: (variantId: string) => void;
};

function SwatchContent({
  overlayType,
  variantId,
  accent,
  theme,
}: {
  overlayType: string;
  variantId: string;
  accent: string;
  theme: string;
}) {
  if (overlayType === 'lower-third') {
    const shell = lowerThirdVariantShell(variantId, accent, theme);
    return (
      <div className="absolute inset-0 flex items-end p-1">
        <div style={{ ...shell.container, fontSize: '5px', maxWidth: '100%' }}>
          <span style={{ ...shell.title, fontSize: '6px', lineHeight: 1 }}>TÍTULO</span>
        </div>
      </div>
    );
  }

  if (overlayType === 'info-card') {
    const style = infoCardVariantStyle(variantId, accent, theme);
    return (
      <div className="absolute inset-0 flex items-start p-1">
        <div style={{ ...style, fontSize: '5px', padding: '3px 4px', width: '88%' }}>
          <div style={{ width: 4, height: 4, borderRadius: 2, background: accent, marginBottom: 2 }} />
          <div style={{ height: 2, width: '70%', background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center text-[7px] text-zinc-500 uppercase">
      {variantId}
    </div>
  );
}

export function OverlayVariantPicker({
  overlayType,
  variants,
  value,
  accentColor = '#D4AF37',
  theme = 'classic',
  onChange,
}: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
      {variants.map((v) => {
        const active = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            title={v.label}
            onClick={() => onChange(v.id)}
            className={`overlay-variant-swatch ${active ? 'overlay-variant-swatch--active' : 'overlay-variant-swatch--idle'}`}
          >
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background: 'linear-gradient(160deg, #1a1a2e, #0f0f14)',
              }}
            />
            <SwatchContent
              overlayType={overlayType}
              variantId={v.id}
              accent={accentColor}
              theme={theme}
            />
            <span className="absolute bottom-0 inset-x-0 text-center text-[6px] font-bold uppercase truncate px-0.5 py-0.5 bg-black/55 text-zinc-300">
              {v.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}