import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

type Align = 'start' | 'center' | 'end';

type HelpTipProps = {
  title?: string;
  children: React.ReactNode;
  align?: Align;
};

type TipCoords = {
  top: number;
  left: number;
  placement: Align;
};

function computeCoords(button: HTMLButtonElement, align: Align): TipCoords {
  const rect = button.getBoundingClientRect();
  const gap = 8;
  let left = rect.left + rect.width / 2;
  if (align === 'start') left = rect.left;
  if (align === 'end') left = rect.right;
  return {
    top: rect.bottom + gap,
    left,
    placement: align,
  };
}

export function SettingHelpTip({ title, children, align = 'center' }: HelpTipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<TipCoords | null>(null);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = pinned || hovered;

  const refreshCoords = useCallback(() => {
    if (!buttonRef.current) return;
    setCoords(computeCoords(buttonRef.current, align));
  }, [align]);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    refreshCoords();
    const onScrollOrResize = () => refreshCoords();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, refreshCoords]);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target)
        || panelRef.current?.contains(target)
      ) return;
      setPinned(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pinned]);

  const panelStyle: React.CSSProperties = coords
    ? {
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform:
          coords.placement === 'center'
            ? 'translateX(-50%)'
            : coords.placement === 'end'
              ? 'translateX(-100%)'
              : undefined,
        zIndex: 99999,
        backgroundColor: '#141418',
      }
    : { display: 'none' };

  const panel = open && coords
    ? createPortal(
        <div
          ref={panelRef}
          id={id}
          role="tooltip"
          style={panelStyle}
          className="w-60 max-w-[min(15rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-600 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            if (!pinned) setHovered(false);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="pointer-events-none absolute -top-[5px] w-2.5 h-2.5 rotate-45 border-l border-t border-zinc-600"
            style={{
              backgroundColor: '#141418',
              left: coords.placement === 'start' ? 14 : coords.placement === 'end' ? undefined : '50%',
              right: coords.placement === 'end' ? 14 : undefined,
              transform: coords.placement === 'center' ? 'translateX(-50%) rotate(45deg)' : 'rotate(45deg)',
            }}
          />
          {title && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-gold-300 mb-1.5">
              {title}
            </p>
          )}
          <div className="text-[10px] text-zinc-100 leading-relaxed font-sans normal-case tracking-normal">
            {children}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        ref={rootRef}
        className="relative inline-flex shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          if (!pinned) setHovered(false);
        }}
      >
        <button
          ref={buttonRef}
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
              ? 'border-gold-500 bg-gold-500/25 text-gold-300'
              : 'border-zinc-600 bg-zinc-900 text-zinc-500 hover:text-gold-400 hover:border-gold-500/50'
          }`}
          style={{ backgroundColor: open ? undefined : '#18181b' }}
        >
          <HelpCircle className="w-3 h-3" strokeWidth={2.25} />
        </button>
      </div>
      {panel}
    </>
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