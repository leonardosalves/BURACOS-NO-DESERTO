import React from 'react';
import { SettingHelpTip } from './SettingHelpTip';
import { SECTION_HELP, type SectionHelpEntry } from './sectionHelpContent';

type Align = 'start' | 'center' | 'end';

type SectionHeaderProps = {
  title: React.ReactNode;
  /** Chave em SECTION_HELP — usa title/body do catálogo se help não for passado */
  helpId?: string;
  help?: React.ReactNode;
  helpTitle?: string;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  titleClassName?: string;
  align?: Align;
  trailing?: React.ReactNode;
};

function resolveHelp(helpId?: string, help?: React.ReactNode, helpTitle?: string): SectionHelpEntry | null {
  if (helpId && SECTION_HELP[helpId]) {
    return {
      title: helpTitle || SECTION_HELP[helpId].title,
      body: help ?? SECTION_HELP[helpId].body,
    };
  }
  if (help) {
    return { title: helpTitle || 'Ajuda', body: help };
  }
  return null;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

export function SectionHeader({
  title,
  helpId,
  help,
  helpTitle,
  icon,
  subtitle,
  size = 'sm',
  className = '',
  titleClassName = '',
  align = 'start',
  trailing,
}: SectionHeaderProps) {
  const resolved = resolveHelp(helpId, help, helpTitle);
  const showHelp = Boolean(resolved);

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`flex flex-wrap items-start sm:items-center gap-x-2 gap-y-1 ${trailing ? 'justify-between' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
          {icon && <span className="shrink-0">{icon}</span>}
          <h3
            className={`font-cinzel font-bold text-white tracking-wide flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 ${sizeClasses[size]} ${titleClassName}`}
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere] leading-snug">{title}</span>
            {showHelp && resolved && (
              <span className="shrink-0 inline-flex">
                <SettingHelpTip title={resolved.title} align={align}>
                  {resolved.body}
                </SettingHelpTip>
              </span>
            )}
          </h3>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1 leading-relaxed font-sans break-words [overflow-wrap:anywhere] max-w-full">
          {subtitle}
        </div>
      )}
    </div>
  );
}

/** Rótulo compacto (cards, subseções) com ? */
export function SectionLabel({
  children,
  helpId,
  help,
  helpTitle,
  className = '',
  align = 'start',
}: {
  children: React.ReactNode;
  helpId?: string;
  help?: React.ReactNode;
  helpTitle?: string;
  className?: string;
  align?: Align;
}) {
  const resolved = resolveHelp(helpId, help, helpTitle);
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 max-w-full ${className}`}>
      <span className="break-words min-w-0">{children}</span>
      {resolved && (
        <span className="shrink-0 inline-flex">
          <SettingHelpTip title={resolved.title} align={align}>
            {resolved.body}
          </SettingHelpTip>
        </span>
      )}
    </span>
  );
}