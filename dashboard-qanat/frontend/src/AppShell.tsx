import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  Clapperboard,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Fingerprint,
  Globe,
  Home,
  HeartPulse,
  LayoutTemplate,
  Laugh,
  Layers,
  Lightbulb,
  Menu,
  PenTool,
  RefreshCw,
  RotateCcw,
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
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { BackendStatusBanner } from "./BackendStatusBanner";
import { SettingHelpTip } from "./SettingHelpTip";
import { SECTION_HELP } from "./sectionHelpContent";
import { useBackendHealth } from "./useBackendHealth";
import type { ProjectListItem } from "./ProjectsLibraryPanel";
import type { AppTab } from "./appTabs";
import type { CreatorIdeationMode } from "./creatorModeIdentity";

type GlobalNavItem = {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  helpId?: string;
  badge?: number;
  accent?: "default" | "youtube" | "sky" | "amber";
};

const STUDIO_NAV: GlobalNavItem[] = [
  {
    id: "project-health",
    label: "Saude do Sistema",
    icon: HeartPulse,
    helpId: "tab-project-health",
    accent: "sky",
  },
  { id: "agents", label: "Studio Agents", icon: Bot, helpId: "tab-agents" },
  {
    id: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    helpId: "tab-templates",
    accent: "sky",
  },
  {
    id: "flow-lab",
    label: "Flow Lab",
    icon: Clapperboard,
    helpId: "tab-flow-lab",
    accent: "amber",
  },
  {
    id: "youtube-studio",
    label: "Canal YouTube",
    icon: Youtube,
    helpId: "tab-youtube-studio",
    accent: "youtube",
  },
  {
    id: "video-resurrector",
    label: "Ressuscitador",
    icon: Zap,
    helpId: "tab-video-resurrector",
    accent: "amber",
  },
  {
    id: "agent-reach",
    label: "Pesquisa Web",
    icon: Globe,
    helpId: "tab-agent-reach",
    accent: "sky",
  },
  {
    id: "trend-forecast",
    label: "Radar Tendências",
    icon: TrendingUp,
    helpId: "tab-trend-forecast",
    accent: "amber",
  },
  {
    id: "comfy-mcp",
    label: "Comfy MCP",
    icon: Cloud,
    helpId: "tab-comfy-mcp",
    accent: "sky",
  },
  {
    id: "docs",
    label: "Documentação",
    icon: BookOpen,
    helpId: "tab-docs",
    accent: "sky",
  },
];

type AppShellProps = {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  activeProject: string;
  projects: ProjectListItem[];
  recentProjects: string[];
  onSelectProject: (name: string) => void;
  creatorMode: CreatorIdeationMode;
  onSelectCreatorMode: (mode: CreatorIdeationMode) => void;
  formattedHeaderDate: string;
  headerTemperatureLabel: string;
  youtubeAlertCount?: number;
  resurrectorAlertCount?: number;
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
      <SettingHelpTip title={help.title} align="start" nested>
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
    <li className={active ? "dash-sidebar-item active" : "dash-sidebar-item"}>
      <button type="button" onClick={onClick} className="dash-sidebar-link">
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        {badge != null && badge > 0 && (
          <span className="dash-badge">{badge > 99 ? "99+" : badge}</span>
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
  creatorMode,
  onSelectCreatorMode,
  formattedHeaderDate,
  headerTemperatureLabel,
  youtubeAlertCount = 0,
  resurrectorAlertCount = 0,
  onRefresh,
  projectBar,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceRestarting, setServiceRestarting] = useState(false);
  const [opsCanRestart, setOpsCanRestart] = useState(
    typeof navigator !== "undefined" && /Win/i.test(navigator.userAgent || "")
  );
  const [opsWindowsService, setOpsWindowsService] = useState(false);
  const {
    online: backendOnline,
    checking: backendChecking,
    recheck: recheckBackend,
  } = useBackendHealth(10_000);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/ops/service");
        if (!res.ok) return;
        const data = (await res.json()) as {
          canRestart?: boolean;
          windowsService?: boolean;
        };
        setOpsCanRestart(Boolean(data.canRestart));
        setOpsWindowsService(Boolean(data.windowsService));
      } catch {
        /* backend antigo sem rota ops */
      }
    })();
  }, [backendOnline]);

  const handleRestartService = useCallback(async () => {
    if (serviceRestarting) return;
    const label = opsWindowsService
      ? "Reiniciar o serviço LumieraBackend? Leva ~10–20s."
      : "Reiniciar o backend Lumiera?";
    if (!window.confirm(label)) return;

    setServiceRestarting(true);
    const toastId = toast.loading("Reiniciando serviço Lumiera…");
    try {
      const res = await fetch("/api/ops/restart-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Falha ao agendar reinício.");
      }
      toast.loading(data.message || "Aguardando backend voltar…", {
        id: toastId,
      });

      const deadline = Date.now() + 90000;
      let up = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500));
        up = await recheckBackend();
        if (up) break;
      }

      if (up) {
        toast.success("Serviço Lumiera reiniciado.", { id: toastId });
        onRefresh();
      } else {
        toast.error(
          "Reinício agendado, mas o backend ainda não respondeu — tente Atualizar em instantes.",
          { id: toastId, duration: 8000 }
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao reiniciar serviço.",
        { id: toastId }
      );
    } finally {
      setServiceRestarting(false);
    }
  }, [serviceRestarting, opsWindowsService, recheckBackend, onRefresh]);

  const recentItems = useMemo(
    () =>
      recentProjects
        .map((name) => projects.find((p) => p.name === name))
        .filter((proj): proj is ProjectListItem => Boolean(proj))
        .slice(0, 8),
    [recentProjects, projects]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.niche || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [search, projects]);

  return (
    <div
      className={`dash-shell ${sidebarOpen ? "" : "dash-sidebar-collapsed"}`}
    >
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <button
            type="button"
            className="dash-brand"
            onClick={() => setActiveTab("home")}
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
            title={sidebarOpen ? "Recolher menu" : "Expandir menu"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="dash-sidebar-body">
          <p className="dash-nav-category">Produção</p>
          <ul className="dash-nav-list">
            <SidebarLink
              active={activeTab === "home"}
              onClick={() => setActiveTab("home")}
              icon={Home}
              label="Início"
              helpId="tab-home"
            />
            <SidebarLink
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
              icon={Tv}
              label="Biblioteca de Projetos"
              helpId="tab-projects"
            />
          </ul>

          <p className="dash-nav-category">Criadores</p>
          <ul className="dash-nav-list">
            <SidebarLink
              active={activeTab === "creator" && creatorMode === "ai"}
              onClick={() => onSelectCreatorMode("ai")}
              icon={Lightbulb}
              label="Radar de Ideias"
              helpId="tab-creator"
            />
            <SidebarLink
              active={activeTab === "creator" && creatorMode === "custom"}
              onClick={() => onSelectCreatorMode("custom")}
              icon={PenTool}
              label="Oficina Autoral"
              helpId="creator-script-strategy"
            />
            <SidebarLink
              active={activeTab === "creator" && creatorMode === "listicle"}
              onClick={() => onSelectCreatorMode("listicle")}
              icon={BarChart3}
              label="Ranking Lab"
              helpId="creator-listicle"
            />
            <SidebarLink
              active={
                activeTab === "creator" && creatorMode === "historical-witness"
              }
              onClick={() => onSelectCreatorMode("historical-witness")}
              icon={Clapperboard}
              label="História Viva"
              helpId="creator-step-ideas"
            />
            <SidebarLink
              active={activeTab === "humor-facts"}
              onClick={() => setActiveTab("humor-facts")}
              icon={Laugh}
              label="Fatos com Graca"
              helpId="tab-humor-facts"
            />
            <SidebarLink
              active={activeTab === "collage-broll"}
              onClick={() => setActiveTab("collage-broll")}
              icon={Layers}
              label="Collage B-roll"
              helpId="tab-collage-broll"
            />
            <SidebarLink
              active={
                activeTab === "video-reverse-engineering" ||
                (activeTab === "creator" &&
                  creatorMode === "video-reverse-engineering")
              }
              onClick={() => setActiveTab("video-reverse-engineering")}
              icon={Fingerprint}
              label="Engenharia Reversa"
              helpId="tab-video-reverse-engineering"
            />
          </ul>

          {recentItems.length > 0 && (
            <>
              <div className="dash-nav-category-row">
                <p className="dash-nav-category">Recentes</p>
                <button
                  type="button"
                  className="dash-link-muted"
                  onClick={() => setActiveTab("projects")}
                >
                  Ver todos
                </button>
              </div>
              <ul className="dash-nav-list dash-recent-list">
                {recentItems.map((proj) => {
                  const isSelected = activeProject === proj.name;
                  const isShort = proj.format === "SHORTS";
                  return (
                    <li
                      key={proj.name}
                      className={
                        isSelected
                          ? "dash-sidebar-item active"
                          : "dash-sidebar-item"
                      }
                    >
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
                        <span
                          className="flex-1 text-left line-clamp-2 text-[13px]"
                          title={proj.title || proj.name}
                        >
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
                badge={
                  item.id === "youtube-studio"
                    ? youtubeAlertCount
                    : item.id === "video-resurrector"
                      ? resurrectorAlertCount
                      : undefined
                }
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
                        setSearch("");
                      }}
                    >
                      <span className="font-semibold truncate">
                        {p.title || p.name}
                      </span>
                      <span className="text-[11px] text-dash-muted truncate">
                        {p.niche || p.format}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dash-header-right">
            <div className="dash-status-chip hidden sm:flex">
              <span
                className={`dash-status-dot ${backendOnline ? "" : "dash-status-dot-offline"}`}
              />
              <span>
                {backendOnline ? "Servidor ativo" : "Servidor offline"}
              </span>
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
                onClick={() => setActiveTab("youtube-studio")}
                title="Alertas do canal"
              >
                <Bell className="w-4 h-4" />
                <span className="dash-icon-badge">
                  {youtubeAlertCount > 99 ? "99+" : youtubeAlertCount}
                </span>
              </button>
            )}

            <button
              type="button"
              className={`dash-header-icon ${activeTab === "settings" ? "dash-header-icon-active" : ""}`}
              onClick={() => setActiveTab("settings")}
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>

            {opsCanRestart && (
              <button
                type="button"
                className={`dash-header-icon ${serviceRestarting ? "opacity-60" : ""}`}
                onClick={() => void handleRestartService()}
                disabled={serviceRestarting}
                title={
                  opsWindowsService
                    ? "Reiniciar serviço Windows LumieraBackend"
                    : "Reiniciar backend Lumiera"
                }
              >
                <RotateCcw
                  className={`w-4 h-4 ${serviceRestarting ? "animate-spin" : ""}`}
                />
              </button>
            )}

            <button
              type="button"
              className="dash-header-icon"
              onClick={onRefresh}
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="dash-user-pill" title={activeProject}>
              <span className="dash-user-avatar">L</span>
              <span className="dash-user-name hidden md:inline truncate max-w-[140px]">
                {activeProject}
              </span>
            </div>
          </div>
        </header>

        {projectBar}

        <BackendStatusBanner
          online={backendOnline}
          checking={backendChecking}
          onRetry={() => {
            void recheckBackend();
          }}
        />

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
