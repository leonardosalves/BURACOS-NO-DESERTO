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
    <div className={className}>
      <div className={`flex flex-wrap items-center gap-2 ${trailing ? 'justify-between' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon}
          <h3
            className={`font-cinzel font-bold text-white tracking-wide flex items-center gap-2 min-w-0 ${sizeClasses[size]} ${titleClassName}`}
          >
            <span className="truncate">{title}</span>
            {showHelp && resolved && (
              <SettingHelpTip title={resolved.title} align={align}>
                {resolved.body}
              </SettingHelpTip>
            )}
          </h3>
        </div>
        {trailing}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">{subtitle}</div>
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
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{children}</span>
      {resolved && (
        <SettingHelpTip title={resolved.title} align={align}>
          {resolved.body}
        </SettingHelpTip>
      )}
    </span>
  );
}