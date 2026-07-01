import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  transform?: string;
  placement: 'above' | 'below';
};

const VIEWPORT_MARGIN = 12;
const GAP = 8;
const PANEL_WIDTH_ESTIMATE = 288;

function computeCoords(
  button: HTMLButtonElement,
  align: Align,
  panelWidth: number,
  panelHeight: number,
): TipCoords {
  const rect = button.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(panelWidth, vw - VIEWPORT_MARGIN * 2);
  const h = panelHeight;

  const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const placement: 'above' | 'below' =
    spaceBelow >= Math.min(h, 160) || spaceBelow >= spaceAbove ? 'below' : 'above';

  let top =
    placement === 'below'
      ? rect.bottom + GAP
      : rect.top - h - GAP;

  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - h - VIEWPORT_MARGIN));

  let left: number;
  let transform: string | undefined;

  if (align === 'end') {
    left = rect.right;
    transform = 'translateX(-100%)';
    if (left > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN;
    }
    if (left - w < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN + w;
      transform = 'translateX(-100%)';
    }
  } else if (align === 'start') {
    left = rect.left;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (left + w > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN - w;
    }
  } else {
    left = rect.left + rect.width / 2;
    transform = 'translateX(-50%)';
    const half = w / 2;
    if (left - half < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN + half;
    }
    if (left + half > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN - half;
    }
  }

  return { top, left, transform, placement };
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
    if (!buttonRef.current || !panelRef.current) return;
    const panel = panelRef.current;
    const w = panel.offsetWidth || PANEL_WIDTH_ESTIMATE;
    const h = panel.offsetHeight || 120;
    setCoords(computeCoords(buttonRef.current, align, w, h));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    refreshCoords();
  }, [open, refreshCoords, title, children]);

  useEffect(() => {
    if (!open) return;
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

  const panelVisible = open;
  const panelStyle: React.CSSProperties = coords
    ? {
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: coords.transform,
        zIndex: 99999,
        visibility: 'visible',
      }
    : {
        position: 'fixed',
        top: -9999,
        left: 0,
        zIndex: 99999,
        visibility: 'hidden',
        pointerEvents: 'none',
      };

  const panel = panelVisible
    ? createPortal(
        <div
          ref={panelRef}
          id={id}
          role="tooltip"
          style={panelStyle}
          className="dash-help-tip-panel w-[min(18rem,calc(100vw-1.5rem))] sm:w-[min(20rem,calc(100vw-2rem))] max-h-[min(50vh,16rem)] overflow-y-auto overflow-x-hidden overscroll-contain"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            if (!pinned) setHovered(false);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {coords && (
            <div
              className={`dash-help-tip-arrow pointer-events-none absolute w-2.5 h-2.5 rotate-45 ${
                coords.placement === 'below'
                  ? '-top-[5px] border-l border-t'
                  : '-bottom-[5px] border-r border-b'
              }`}
              style={{
                left: align === 'start' ? 14 : align === 'end' ? undefined : '50%',
                right: align === 'end' ? 14 : undefined,
                transform:
                  align === 'center'
                    ? 'translateX(-50%) rotate(45deg)'
                    : 'rotate(45deg)',
              }}
            />
          )}
          {title && (
            <p className="dash-help-tip-title break-words">
              {title}
            </p>
          )}
          <div className="dash-help-tip-body break-words [overflow-wrap:anywhere] [hyphens:auto]">
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
        className="relative inline-flex shrink-0 align-middle"
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
          className={`dash-help-tip-trigger ${open ? 'dash-help-tip-trigger-open' : ''}`}
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
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 ${className}`}>
      <Tag className="dash-typo-label break-words min-w-0">
        {children}
      </Tag>
      <SettingHelpTip title={helpTitle} align={align}>
        {help}
      </SettingHelpTip>
    </div>
  );
}