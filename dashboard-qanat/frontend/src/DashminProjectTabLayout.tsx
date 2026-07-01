import React from 'react';
import { ChevronRight } from 'lucide-react';
import { DASH_PROJECT_TAB_META, type DashProjectTabId } from './dashminProjectTabMeta';

type DashminProjectTabLayoutProps = {
  tab: DashProjectTabId;
  activeProject: string;
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  actions?: React.ReactNode;
};

export function DashminProjectTabLayout({
  tab,
  activeProject,
  children,
  className = '',
  showHeader = true,
  actions,
}: DashminProjectTabLayoutProps) {
  const meta = DASH_PROJECT_TAB_META[tab];
  const Icon = meta.icon;

  return (
    <div className={`dash-project-tab animate-fade-in min-w-0 ${className}`.trim()}>
      {showHeader && (
        <div className="dash-project-tab-head">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="dash-project-tab-icon shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <nav className="dash-project-tab-crumb" aria-label="Contexto do projeto">
                <span>Projeto</span>
                <ChevronRight className="w-3 h-3 opacity-50" />
                <span className="truncate max-w-[180px]" title={activeProject}>
                  {activeProject}
                </span>
                <ChevronRight className="w-3 h-3 opacity-50" />
                <span className="text-white">{meta.title}</span>
              </nav>
              <h2 className="dash-project-tab-title">{meta.title}</h2>
              <p className="dash-project-tab-sub">{meta.subtitle}</p>
            </div>
          </div>
          {actions && <div className="shrink-0 flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="dash-project-tab-body">{children}</div>
    </div>
  );
}