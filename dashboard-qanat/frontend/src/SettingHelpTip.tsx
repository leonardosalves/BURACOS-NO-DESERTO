import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

type Align = 'start' | 'center' | 'end';

type HelpTipProps = {
  title?: string;
  children: React.ReactNode;
  align?: Align;
};

export function SettingHelpTip({ title, children, align = 'center' }: HelpTipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const open = pinned || hovered;

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pinned]);

  const alignClass =
    align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <div
      ref={rootRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="O que é esta configuração?"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinned((v) => !v);
        }}
        className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition ${
          open
            ? 'border-gold-500/60 bg-gold-500/15 text-gold-400'
            : 'border-zinc-600/70 bg-zinc-900/90 text-zinc-500 hover:text-gold-400 hover:border-gold-500/40'
        }`}
      >
        <HelpCircle className="w-3 h-3" strokeWidth={2.25} />
      </button>

      {open && (
        <div
          id={id}
          role="tooltip"
          className={`absolute z-[80] top-[calc(100%+6px)] ${alignClass} w-60 max-w-[min(15rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-700/90 bg-zinc-950/98 px-3 py-2.5 shadow-2xl shadow-black/60`}
        >
          <div
            className={`absolute -top-1 w-2 h-2 rotate-45 border-l border-t border-zinc-700/90 bg-zinc-950/98 ${
              align === 'start' ? 'left-3' : align === 'end' ? 'right-3' : 'left-1/2 -translate-x-1/2'
            }`}
          />
          {title && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-gold-400 mb-1 pr-1">
              {title}
            </p>
          )}
          <div className="text-[10px] text-zinc-300 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
}

type LabelProps = {
  children: React.ReactNode;
  help: React.ReactNode;
  helpTitle?: string;
  className?: string;
  align?: Align;
  as?: 'label' | 'span' | 'p';
};

export function SettingLabel({
  children,
  help,
  helpTitle,
  className = '',
  align = 'center',
  as = 'span',
}: LabelProps) {
  const Tag = as;
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${className}`}>
      <Tag className="text-[10px] text-gold-500 font-bold uppercase tracking-wider truncate">
        {children}
      </Tag>
      <SettingHelpTip title={helpTitle} align={align}>
        {help}
      </SettingHelpTip>
    </div>
  );
}