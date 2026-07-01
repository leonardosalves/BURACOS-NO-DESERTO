import React from 'react';
import { Star } from 'lucide-react';

type DashRatingProps = {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
};

export function DashRating({ value, max = 5, onChange, readOnly, size = 'md' }: DashRatingProps) {
  return (
    <div className={`dash-rating dash-rating-${size}`} role={readOnly ? 'img' : 'group'} aria-label={`Avaliação ${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={`dash-rating-star ${filled ? 'filled' : ''}`}
            onClick={() => onChange?.(i + 1)}
            aria-label={`${i + 1} estrela(s)`}
          >
            <Star className="w-full h-full" fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}