import React, { useMemo, useState } from 'react';
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Globe,
  Home,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Thermometer,
  TrendingUp,
  Tv,
  Youtube,
  Zap,
  Bell,
} from 'lucide-react';
import { SettingHelpTip } from './SettingHelpTip';
import { SECTION_HELP } from './sectionHelpContent';
import type { ProjectListItem } from './ProjectsLibraryPanel';
import type { AppTab } from './appTabs';

type GlobalNavItem = {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  helpId?: string;
  badge?: number;
  accent?: 'default' | 'youtube' | 'sky' | 'amber';
};

const STUDIO_NAV: GlobalNavItem[] = [
  { id: 'agents', label: 'Studio Agents', icon: Bot, helpId: 'tab-agents' },
  { id: 'youtube-studio', label: 'Canal YouTube', icon: Youtube, helpId: 'tab-youtube-studio', accent: 'youtube' },
  { id: 'video-resurrector', label: 'Ressuscitador', icon: Zap, helpId: 'tab-video-resurrector', accent: 'amber' },
  { id: 'agent-reach', label: 'Pesquisa Web', icon: Globe, helpId: 'tab-agent-reach', accent: 'sky' },
  { id: 'trend-forecast', label: 'Radar Tendências', icon: TrendingUp, helpId: 'tab-trend-forecast', accent: 'amber' },
  { id: 'comfy-mcp', label: 'Comfy MCP', icon: Cloud, helpId: 'tab-comfy-mcp', accent: 'sky' },
];

type AppShellProps = {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  activeProject: string;
  projects: ProjectListItem[];
  recentProjects: string[];
  onSelectProject: (name: string) => void;
  onOpenCreator: () => void;
  formattedHeaderDate: string;
  headerTemperatureLabel: string;
  youtubeAlertCount?: number;
  onRefresh: () => void;
  projectBar?: React.ReactNode;
  children: React.ReactNode;
};

function NavHelp({ helpId }: { helpId?: string }) {
  if (!helpId || !SECTION_HELP[helpId]) return null;
  const help = SECTION_HELP[helpId];
  return (
    <span
      className="inline-flex opacity-60 hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <SettingHelpTip title={help.title} align="start">
        {help.body}
      </SettingHelpTip>
    </span>
  );
}

function SidebarLink({
  active,
  onClick,
  icon: Icon,
  label,
  helpId,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  helpId?: string;
  badge?: number;
}) {
  return (
    <li className={active ? 'dash-sidebar-item active' : 'dash-sidebar-item'}>
      <button type="button" onClick={onClick} className="dash-sidebar-link">
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        {badge != null && badge > 0 && (
          <span className="dash-badge">{badge > 99 ? '99+' : badge}</span>
        )}
        <NavHelp helpId={helpId} />
      </button>
    </li>
  );
}

export function AppShell({
  activeTab,
  setActiveTab,
  activeProject,
  projects,
  recentProjects,
  onSelectProject,
  onOpenCreator,
  formattedHeaderDate,
  headerTemperatureLabel,
  youtubeAlertCount = 0,
  onRefresh,
  projectBar,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');

  const recentItems = useMemo(
    () =>
      recentProjects
        .map((name) => projects.find((p) => p.name === name))
        .filter((proj): proj is ProjectListItem => Boolean(proj))
        .slice(0, 8),
    [recentProjects, projects],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.niche || '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, projects]);

  return (
    <div className={`dash-shell ${sidebarOpen ? '' : 'dash-sidebar-collapsed'}`}>
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <button
            type="button"
            className="dash-brand"
            onClick={() => setActiveTab('home')}
            title="Lumiera Studio — Início"
          >
            <span className="dash-brand-icon">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="dash-brand-text">
              <span className="dash-brand-title">Lumiera</span>
              <span className="dash-brand-sub">Cinematic Studio</span>
            </span>
          </button>
          <button
            type="button"
            className="dash-sidebar-pin hidden lg:flex"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className="dash-sidebar-body">
          <p className="dash-nav-category">Produção</p>
          <ul className="dash-nav-list">
            <SidebarLink
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
              icon={Home}
              label="Início"
              helpId="tab-home"
            />
            <SidebarLink
              active={activeTab === 'creator'}
              onClick={onOpenCreator}
              icon={Sparkles}
              label="Novo Projeto com IA"
              helpId="tab-creator"
            />
            <SidebarLink
              active={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              icon={Tv}
              label="Biblioteca de Projetos"
              helpId="tab-projects"
            />
          </ul>

          {recentItems.length > 0 && (
            <>
              <div className="dash-nav-category-row">
                <p className="dash-nav-category">Recentes</p>
                <button
                  type="button"
                  className="dash-link-muted"
                  onClick={() => setActiveTab('projects')}
                >
                  Ver todos
                </button>
              </div>
              <ul className="dash-nav-list dash-recent-list">
                {recentItems.map((proj) => {
                  const isSelected = activeProject === proj.name;
                  const isShort = proj.format === 'SHORTS';
                  return (
                    <li key={proj.name} className={isSelected ? 'dash-sidebar-item active' : 'dash-sidebar-item'}>
                      <button
                        type="button"
                        onClick={() => onSelectProject(proj.name)}
                        className="dash-sidebar-link dash-sidebar-link-compact"
                      >
                        {isShort ? (
                          <Smartphone className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        ) : (
                          <Tv className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        )}
                        <span className="flex-1 text-left line-clamp-2 text-[13px]" title={proj.title || proj.name}>
                          {proj.title || proj.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <p className="dash-nav-category">Estúdio</p>
          <ul className="dash-nav-list">
            {STUDIO_NAV.map((item) => (
              <SidebarLink
                key={item.id}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                icon={item.icon}
                label={item.label}
                helpId={item.helpId}
                badge={item.id === 'youtube-studio' ? youtubeAlertCount : undefined}
              />
            ))}
          </ul>
        </div>

        <div className="dash-sidebar-footer">
          <span>v1.2.0 · Remotion & HyperFrames</span>
        </div>
      </aside>

      <div className="dash-main-column">
        <header className="dash-header">
          <div className="dash-header-left">
            <button
              type="button"
              className="dash-header-icon lg:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="dash-search-wrap">
              <Search className="w-4 h-4 text-dash-muted shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar projetos..."
                className="dash-search-input"
              />
              {searchResults.length > 0 && (
                <div className="dash-search-dropdown">
                  {searchResults.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className="dash-search-result"
                      onClick={() => {
                        onSelectProject(p.name);
                        setSearch('');
                      }}
                    >
                      <span className="font-semibold truncate">{p.title || p.name}</span>
                      <span className="text-[11px] text-dash-muted truncate">{p.niche || p.format}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dash-header-right">
            <div className="dash-status-chip hidden sm:flex">
              <span className="dash-status-dot" />
              <span>Servidor ativo</span>
              <span className="dash-header-divider" />
              <CalendarDays className="w-3.5 h-3.5 text-dash-primary" />
              <span>{formattedHeaderDate}</span>
              <span className="dash-header-divider" />
              <Thermometer className="w-3.5 h-3.5 text-dash-warning" />
              <span>{headerTemperatureLabel}</span>
            </div>

            {youtubeAlertCount > 0 && (
              <button
                type="button"
                className="dash-header-icon dash-header-icon-badge"
                onClick={() => setActiveTab('youtube-studio')}
                title="Alertas do canal"
              >
                <Bell className="w-4 h-4" />
                <span className="dash-icon-badge">{youtubeAlertCount > 99 ? '99+' : youtubeAlertCount}</span>
              </button>
            )}

            <button
              type="button"
              className={`dash-header-icon ${activeTab === 'settings' ? 'dash-header-icon-active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button type="button" className="dash-header-icon" onClick={onRefresh} title="Atualizar dados">
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="dash-user-pill" title={activeProject}>
              <span className="dash-user-avatar">L</span>
              <span className="dash-user-name hidden md:inline truncate max-w-[140px]">{activeProject}</span>
            </div>
          </div>
        </header>

        {projectBar}

        <main className="dash-main">
          <div className="dash-content">{children}</div>
        </main>
      </div>

      {!sidebarOpen && (
        <button
          type="button"
          className="dash-sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Fechar menu"
        />
      )}
    </div>
  );
}