import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Clapperboard,
  FolderOpen,
  Globe,
  Layers,
  Music,
  Share2,
  Smartphone,
  Sparkles,
  TrendingUp,
  Tv,
  Wand2,
  Youtube,
  Zap,
} from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";
import { DashminStats } from "./DashminStats";
import { DashminDashboard } from "./DashminDashboard";
import { DashminActivityFeed } from "./DashminActivityFeed";
import { DashminYoutubePulse } from "./DashminYoutubePulse";
import { YoutubeStudioHomeCard } from "./YoutubeStudioHomeCard";
import { NicheTag } from "./NicheTag";
import type { ProjectListItem } from "./ProjectsLibraryPanel";
import type { AppTab } from "./appTabs";
import type { WorkspaceStatus } from "./appTypes";
import {
  deriveHomeNextStep,
  homeTabForNextStep,
  type HomeNavTarget,
} from "./homeNextStep";

type LumieraHomePageProps = {
  projects: ProjectListItem[];
  activeProject: string;
  recentProjects: string[];
  status?: WorkspaceStatus | null;
  videoQualityScore?: number;
  outputCount: number;
  youtubeAlerts?: number;
  rendering?: boolean;
  renderPercent?: number;
  viewsThreshold?: number;
  hotVideos?: {
    projectName?: string;
    videoId?: string;
    views48h?: number;
    format?: string;
  }[];
  onOpenCreator: () => void;
  onOpenProjects: () => void;
  onOpenWorkflow: () => void;
  onOpenTimeline: () => void;
  onOpenMusic: () => void;
  onOpenRender: () => void;
  onOpenUpload: () => void;
  onOpenMetadata: () => void;
  onOpenYoutube: () => void;
  onSelectProject: (name: string) => void;
  setActiveTab: (tab: AppTab) => void;
};

const PIPELINE_STEPS = [
  {
    id: "creator",
    label: "Ideias",
    icon: Sparkles,
    tab: "creator" as AppTab,
    doneKey: null,
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: Wand2,
    tab: "workflow" as AppTab,
    doneKey: "has_narration" as const,
  },
  {
    id: "timeline",
    label: "Roteiro",
    icon: Layers,
    tab: "timeline" as AppTab,
    doneKey: null,
  },
  {
    id: "music",
    label: "BGM",
    icon: Music,
    tab: "music" as AppTab,
    doneKey: "has_soundtrack" as const,
  },
  {
    id: "render",
    label: "Render",
    icon: Tv,
    tab: "status" as AppTab,
    doneKey: "render" as const,
  },
  {
    id: "upload",
    label: "Upload",
    icon: Share2,
    tab: "upload" as AppTab,
    doneKey: "upload" as const,
  },
] as const;

function formatModified(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function pipelineStepDone(
  key: (typeof PIPELINE_STEPS)[number]["doneKey"],
  status: WorkspaceStatus | null | undefined,
  outputCount: number
): boolean {
  if (key === "render" || key === "upload") return outputCount > 0;
  if (!key || !status) return false;
  return Boolean(status[key]);
}

export function LumieraHomePage({
  projects,
  activeProject,
  recentProjects,
  status,
  videoQualityScore,
  outputCount,
  youtubeAlerts = 0,
  rendering,
  renderPercent,
  viewsThreshold = 100,
  hotVideos,
  onOpenCreator,
  onOpenProjects,
  onOpenWorkflow,
  onOpenTimeline,
  onOpenMusic,
  onOpenRender,
  onOpenUpload,
  onOpenMetadata,
  onOpenYoutube,
  onSelectProject,
  setActiveTab,
}: LumieraHomePageProps) {
  const [serverOnline, setServerOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health", {
          signal: AbortSignal.timeout(4000),
        });
        if (!cancelled) setServerOnline(res.ok);
      } catch {
        if (!cancelled) setServerOnline(false);
      }
    };
    void check();
    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const nextStep = useMemo(
    () =>
      deriveHomeNextStep({
        status,
        outputCount,
        rendering,
        renderPercent,
        videoQualityScore,
      }),
    [status, outputCount, rendering, renderPercent, videoQualityScore]
  );

  const progressPct = useMemo(() => {
    const checks = [
      Boolean(status?.has_config),
      Boolean(status?.has_narration),
      Boolean(status?.has_soundtrack),
      outputCount > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [status, outputCount]);

  const recentItems = useMemo(() => {
    const names =
      recentProjects.length > 0 ? recentProjects : projects.map((p) => p.name);
    return names
      .slice(0, 5)
      .map(
        (name) => projects.find((p) => p.name === name) ?? { name, path: name }
      )
      .filter(Boolean) as ProjectListItem[];
  }, [recentProjects, projects]);

  const navigateHome = (target: HomeNavTarget) => {
    if (target === "creator") {
      onOpenCreator();
      return;
    }
    if (target === "upload") {
      onOpenUpload();
      return;
    }
    if (target === "status") {
      onOpenRender();
      return;
    }
    if (target === "ai") {
      onOpenMetadata();
      return;
    }
    if (target === "workflow") {
      onOpenWorkflow();
      return;
    }
    if (target === "music") {
      onOpenMusic();
      return;
    }
    if (target === "timeline") {
      onOpenTimeline();
      return;
    }
    if (target === "projects") {
      onOpenProjects();
      return;
    }
    const tab = homeTabForNextStep(target);
    if (tab) setActiveTab(tab);
  };

  const quickActions = [
    {
      label: "Novo projeto IA",
      icon: Sparkles,
      accent: "violet",
      onClick: onOpenCreator,
    },
    {
      label: "Flow Lab",
      icon: Clapperboard,
      accent: "amber",
      onClick: () => setActiveTab("flow-lab"),
    },
    {
      label: "Biblioteca",
      icon: FolderOpen,
      accent: "cyan",
      onClick: onOpenProjects,
    },
    {
      label: "Workflow",
      icon: Wand2,
      accent: "amber",
      onClick: onOpenWorkflow,
    },
    { label: "Render", icon: Tv, accent: "gold", onClick: onOpenRender },
    {
      label: "Metadados",
      icon: Zap,
      accent: "violet",
      onClick: onOpenMetadata,
    },
    { label: "YouTube", icon: Youtube, accent: "rose", onClick: onOpenYoutube },
    {
      label: "Tendências",
      icon: TrendingUp,
      accent: "emerald",
      onClick: () => setActiveTab("trend-forecast"),
    },
  ] as const;

  const studioShortcuts = [
    { label: "Studio Agents", icon: Bot, tab: "agents" as AppTab },
    { label: "Pesquisa Web", icon: Globe, tab: "agent-reach" as AppTab },
    { label: "Ressuscitador", icon: Zap, tab: "video-resurrector" as AppTab },
  ];

  const todoNav: Record<string, () => void> = {
    config: onOpenProjects,
    narration: onOpenWorkflow,
    bgm: onOpenMusic,
    render: onOpenRender,
  };

  return (
    <DashminPageLayout
      title="Início"
      subtitle="Painel de comando — retome de onde parou ou abra um atalho do estúdio."
      breadcrumb={["Lumiera", "Início"]}
      icon={<Clapperboard className="w-5 h-5" />}
      actions={
        <button
          type="button"
          className="dash-btn-primary text-xs"
          onClick={onOpenCreator}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Novo projeto
        </button>
      }
    >
      <div className="lumiera-home space-y-5">
        <section className="lumiera-home-command dash-card dash-card-highlight">
          <div className="flex flex-wrap gap-5 items-start justify-between">
            <div className="min-w-0 flex-1 max-w-2xl">
              <p className="dash-card-eyebrow">{nextStep.eyebrow}</p>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1 leading-snug">
                {nextStep.title}
              </h2>
              <p className="text-[12px] text-dash-muted mt-2 leading-relaxed">
                {nextStep.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  className="dash-btn-primary text-xs"
                  onClick={() => navigateHome(nextStep.primaryTab)}
                >
                  {nextStep.primaryLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {nextStep.secondaryLabel && nextStep.secondaryTab && (
                  <button
                    type="button"
                    className="dash-btn-ghost text-xs"
                    onClick={() => navigateHome(nextStep.secondaryTab!)}
                  >
                    {nextStep.secondaryLabel}
                  </button>
                )}
              </div>
            </div>

            <div className="lumiera-home-command-aside shrink-0 flex flex-wrap sm:flex-nowrap gap-3">
              <div className="lumiera-home-metric">
                <span className="lumiera-home-metric-value">
                  {progressPct}%
                </span>
                <span className="lumiera-home-metric-label">Pipeline</span>
              </div>
              {videoQualityScore != null && (
                <div className="lumiera-home-metric">
                  <span className="lumiera-home-metric-value">
                    {videoQualityScore}
                  </span>
                  <span className="lumiera-home-metric-label">Qualidade</span>
                </div>
              )}
              <div className="lumiera-home-metric">
                <span
                  className="lumiera-home-metric-value truncate max-w-[120px]"
                  title={activeProject}
                >
                  {activeProject.length > 14
                    ? `${activeProject.slice(0, 14)}…`
                    : activeProject}
                </span>
                <span className="lumiera-home-metric-label">Projeto ativo</span>
              </div>
            </div>
          </div>

          <div className="lumiera-home-pipeline-strip mt-5 pt-4 border-t border-dash-border-soft">
            {PIPELINE_STEPS.map((step) => {
              const Icon = step.icon;
              const done = pipelineStepDone(step.doneKey, status, outputCount);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.tab === "creator") onOpenCreator();
                    else if (step.tab === "status") onOpenRender();
                    else setActiveTab(step.tab);
                  }}
                  className={`lumiera-home-pipeline-chip ${done ? "is-done" : ""}`}
                  title={step.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                  {done && <span className="lumiera-home-pipeline-dot" />}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-dash-muted uppercase tracking-wider mb-2">
            Atalhos rápidos
          </h3>
          <div className="lumiera-home-quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`lumiera-home-quick lumiera-home-quick-${action.accent}`}
                >
                  <span className="lumiera-home-quick-icon">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="lumiera-home-quick-label">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <DashminStats
          projectCount={projects.length}
          recentCount={recentProjects.length}
          serverOnline={serverOnline}
          youtubeAlerts={youtubeAlerts}
          activeProject={activeProject}
        />

        <div className="lumiera-home-split">
          <section className="dash-card min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="dash-card-eyebrow">Continuar</p>
                <h3 className="dash-card-title text-base">Projetos recentes</h3>
              </div>
              <button
                type="button"
                className="dash-link-btn text-[11px]"
                onClick={onOpenProjects}
              >
                Ver todos
              </button>
            </div>
            {recentItems.length === 0 ? (
              <p className="text-[11px] text-dash-muted py-4 text-center">
                Nenhum projeto ainda —{" "}
                <button
                  type="button"
                  className="text-dash-primary underline"
                  onClick={onOpenCreator}
                >
                  criar com IA
                </button>
              </p>
            ) : (
              <ul className="lumiera-home-recent-list">
                {recentItems.map((proj) => {
                  const isActive = proj.name === activeProject;
                  return (
                    <li key={proj.name}>
                      <button
                        type="button"
                        className={`lumiera-home-recent-item ${isActive ? "is-active" : ""}`}
                        onClick={() => onSelectProject(proj.name)}
                      >
                        <span className="lumiera-home-recent-icon">
                          {proj.format === "SHORTS" ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : (
                            <Tv className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-xs font-semibold text-white truncate">
                            {proj.title || proj.name}
                          </span>
                          <span className="block text-[10px] text-dash-muted truncate">
                            {proj.name}
                            {proj.modifiedAt
                              ? ` · ${formatModified(proj.modifiedAt)}`
                              : ""}
                          </span>
                        </span>
                        {proj.niche && (
                          <NicheTag
                            niche={proj.niche}
                            className="text-[9px] shrink-0"
                          />
                        )}
                        {isActive && (
                          <span className="text-[9px] font-bold text-dash-primary shrink-0">
                            Ativo
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <DashminDashboard
              projects={projects}
              activeProject={activeProject}
              status={status}
              videoQualityScore={videoQualityScore}
              outputCount={outputCount}
              onOpenWorkflow={onOpenWorkflow}
              onOpenCreator={onOpenCreator}
              onOpenProjects={onOpenProjects}
              onTodoNavigate={todoNav}
            />
          </section>
        </div>

        <div className="dash-insights-row">
          <DashminActivityFeed
            activeProject={activeProject}
            projects={projects}
            recentProjects={recentProjects}
            hasNarration={status?.has_narration}
            outputCount={outputCount}
            videoQualityScore={videoQualityScore}
            youtubeAlerts={youtubeAlerts}
            rendering={rendering}
            renderPercent={renderPercent}
            onOpenYoutube={onOpenYoutube}
            onOpenWorkflow={onOpenWorkflow}
          />
          <div className="space-y-4 min-w-0">
            <DashminYoutubePulse
              hotVideos={hotVideos}
              viewsThreshold={viewsThreshold}
              onOpenYoutube={onOpenYoutube}
            />
            <YoutubeStudioHomeCard
              viewsThreshold={viewsThreshold}
              onOpenPanel={onOpenYoutube}
            />
          </div>
        </div>

        <section>
          <h3 className="text-xs font-bold text-dash-muted uppercase tracking-wider mb-2">
            Estúdio global
          </h3>
          <div className="lumiera-home-studio-row">
            {studioShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  type="button"
                  className="lumiera-home-studio-chip"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <Icon className="w-4 h-4 text-dash-primary" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </DashminPageLayout>
  );
}
