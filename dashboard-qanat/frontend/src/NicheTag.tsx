import React from 'react';
import { formatNicheLabel, getNicheTagStyle } from './nicheTagStyles';

type Props = {
  niche?: string;
  size?: 'xs' | 'sm';
  showDot?: boolean;
  className?: string;
};

export function NicheTag({ niche, size = 'xs', showDot = true, className = '' }: Props) {
  const label = formatNicheLabel(niche);
  const style = getNicheTagStyle(niche);
  const sizeClass = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-[8px] px-1.5 py-px';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wide shrink-0 max-w-[9rem] truncate ${sizeClass} ${style.bg} ${style.text} ${style.border} ${className}`}
      title={String(niche || 'Geral').trim() || 'Geral'}
    >
      {showDot ? <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}