import React from 'react';
import { ChevronRight } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function EditorCollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  className = '',
}: Props) {
  return (
    <details
      className={`lumiera-collapsible-section glass-panel rounded-2xl ${className}`.trim()}
      open={defaultOpen || undefined}
    >
      <summary>
        <span className="flex items-center gap-2 min-w-0 normal-case tracking-normal font-semibold text-[11px] text-zinc-300">
          <ChevronRight className="w-3.5 h-3.5 shrink-0 lumiera-collapse-chevron" aria-hidden />
          <span className="truncate">{title}</span>
          {subtitle && (
            <span className="text-[9px] font-normal text-zinc-500 truncate hidden sm:inline">
              {subtitle}
            </span>
          )}
        </span>
        {badge != null && badge !== '' && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 shrink-0">
            {badge}
          </span>
        )}
      </summary>
      <div className="lumiera-collapsible-body">{children}</div>
    </details>
  );
}