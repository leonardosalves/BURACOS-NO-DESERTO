import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export type DashCardMenuItem = {
  id: string;
  label: string;
  onClick?: () => void;
};

type DashCardMenuProps = {
  items: DashCardMenuItem[];
  align?: 'left' | 'right';
};

export function DashCardMenu({ items, align = 'right' }: DashCardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className={`dash-card-menu ${align === 'left' ? 'dash-card-menu-left' : ''}`} ref={ref}>
      <button type="button" className="dash-card-menu-trigger" onClick={() => setOpen((v) => !v)} aria-label="Opções">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="dash-card-menu-dropdown">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dash-card-menu-item"
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}