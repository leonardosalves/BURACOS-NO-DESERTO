import React from 'react';
import { OVERLAY_POSITION_GRID, OVERLAY_POSITIONS } from './overlayEditorConfig';

type Props = {
  overlayType: string;
  value?: string;
  onChange: (positionId: string) => void;
  compact?: boolean;
};

export function OverlayPositionPicker({ overlayType, value, onChange, compact = false }: Props) {
  const allowed = new Set((OVERLAY_POSITIONS[overlayType] || []).map((p) => p.id));
  const active = value && allowed.has(value) ? value : null;

  return (
    <div className={`inline-grid grid-cols-3 gap-1 ${compact ? 'w-[108px]' : 'w-[132px]'}`}>
      {OVERLAY_POSITION_GRID.map((cell) => {
        const enabled = allowed.has(cell.id);
        const isActive = active === cell.id;
        return (
          <button
            key={cell.id}
            type="button"
            disabled={!enabled}
            title={
              enabled
                ? (OVERLAY_POSITIONS[overlayType]?.find((p) => p.id === cell.id)?.label || cell.id)
                : 'Posição não disponível para este tipo'
            }
            onClick={() => enabled && onChange(cell.id)}
            className={[
              'aspect-square rounded-md border text-[10px] font-bold transition flex items-center justify-center',
              enabled
                ? isActive
                  ? 'border-[rgba(130,128,253,0.7)] bg-[rgba(130,128,253,0.28)] text-violet-100 shadow-[0_0_12px_rgba(130,128,253,0.25)]'
                  : 'border-[var(--dash-border)] bg-[var(--dash-bg)] text-zinc-400 hover:border-[rgba(130,128,253,0.45)] hover:text-zinc-200'
                : 'border-transparent bg-transparent text-transparent cursor-not-allowed pointer-events-none',
            ].join(' ')}
            style={{
              gridRow: cell.row + 1,
              gridColumn: cell.col + 1,
            }}
          >
            {enabled ? cell.label : ''}
          </button>
        );
      })}
    </div>
  );
}