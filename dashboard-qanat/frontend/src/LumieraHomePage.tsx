import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Circle,
  Clapperboard,
  Clock,
  FolderOpen,
  Globe,
  Layers,
  Music,
  Play,
  Share2,
  Smartphone,
  Sparkles,
  TrendingUp,
  Tv,
  Wand2,
  Wifi,
  WifiOff,
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

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────
   Pipeline Config
   ────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

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

function timeAgo(iso?: string) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
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

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

/** Barra de progresso animada do pipeline */
function PipelineProgress({
  steps,
  status,
  outputCount,
  rendering,
  renderPercent,
  onStepClick,
}: {
  steps: typeof PIPELINE_STEPS;
  status: WorkspaceStatus | null | undefined;
  outputCount: number;
  rendering?: boolean;
  renderPercent?: number;
  onStepClick: (tab: AppTab) => void;
}) {
  const doneCount = steps.filter((s) =>
    pipelineStepDone(s.doneKey, status, outputCount)
  ).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="lhome-pipeline">
      {/* Barra de progresso */}
      <div className="lhome-pipeline-track">
        <div className="lhome-pipeline-fill" style={{ width: `${pct}%` }} />
        {rendering && (
          <div
            className="lhome-pipeline-render-indicator"
            style={{ left: `${renderPercent ?? 50}%` }}
          />
        )}
      </div>

      {/* Steps */}
      <div className="lhome-pipeline-steps">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = pipelineStepDone(step.doneKey, status, outputCount);
          const isRendering = rendering && step.id === "render";

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.tab)}
              className={`lhome-pipeline-step ${done ? "is-done" : ""} ${isRendering ? "is-rendering" : ""}`}
              title={step.label}
            >
              <span className="lhome-pipeline-step-node">
                {done ? (
                  <Check className="w-3 h-3" />
                ) : isRendering ? (
                  <span className="lhome-pipeline-spinner" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="lhome-pipeline-step-label">{step.label}</span>
              {i < steps.length - 1 && (
                <span
                  className={`lhome-pipeline-connector ${done ? "is-done" : ""}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <span className="lhome-pipeline-pct">{pct}%</span>
    </div>
  );
}

/** Card de métrica com glow */
function MetricCard({
  value,
  label,
  icon: Icon,
  accent = "violet",
  onClick,
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  accent?: "violet" | "emerald" | "amber" | "rose" | "cyan";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lhome-metric lhome-metric-${accent}`}
    >
      <span className="lhome-metric-icon">
        <Icon className="w-4 h-4" />
      </span>
      <span className="lhome-metric-value">{value}</span>
      <span className="lhome-metric-label">{label}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */

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
  const [greeting, setGreeting] = useState("");

  // Health check
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

  // Greeting por horário
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 6) setGreeting("Boa madrugada");
    else if (h < 12) setGreeting("Bom dia");
    else if (h < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
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

  const navigateHome = useCallback(
    (target: HomeNavTarget) => {
      const map: Record<string, () => void> = {
        creator: onOpenCreator,
        upload: onOpenUpload,
        status: onOpenRender,
        ai: onOpenMetadata,
        workflow: onOpenWorkflow,
        music: onOpenMusic,
        timeline: onOpenTimeline,
        projects: onOpenProjects,
      };
      if (map[target]) {
        map[target]();
        return;
      }
      const tab = homeTabForNextStep(target);
      if (tab) setActiveTab(tab);
    },
    [
      onOpenCreator,
      onOpenUpload,
      onOpenRender,
      onOpenMetadata,
      onOpenWorkflow,
      onOpenMusic,
      onOpenTimeline,
      onOpenProjects,
      setActiveTab,
    ]
  );

  const handlePipelineClick = useCallback(
    (tab: AppTab) => {
      if (tab === "creator") onOpenCreator();
      else if (tab === "status") onOpenRender();
      else setActiveTab(tab);
    },
    [onOpenCreator, onOpenRender, setActiveTab]
  );

  /* ── Quick Actions (reorganizados com hierarquia) ── */
  const primaryActions = [
    {
      label: "Novo projeto IA",
      icon: Sparkles,
      desc: "Gerar com IA",
      onClick: onOpenCreator,
    },
    {
      label: "Flow Lab",
      icon: Clapperboard,
      desc: "Editor visual",
      onClick: () => setActiveTab("flow-lab"),
    },
    {
      label: "Biblioteca",
      icon: FolderOpen,
      desc: `${projects.length} projetos`,
      onClick: onOpenProjects,
    },
  ];

  const secondaryActions = [
    { label: "Workflow", icon: Wand2, onClick: onOpenWorkflow },
    { label: "Render", icon: Tv, onClick: onOpenRender },
    { label: "Metadados", icon: Zap, onClick: onOpenMetadata },
    {
      label: "YouTube",
      icon: Youtube,
      onClick: onOpenYoutube,
      badge: youtubeAlerts,
    },
    {
      label: "Tendências",
      icon: TrendingUp,
      onClick: () => setActiveTab("trend-forecast"),
    },
  ];

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
      subtitle={`${greeting} — retome de onde parou ou comece algo novo.`}
      breadcrumb={["Lumiera", "Início"]}
      icon={<Clapperboard className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2">
          {/* Status do servidor */}
          <span
            className={`lhome-server-badge ${serverOnline ? "is-online" : "is-offline"}`}
            title={serverOnline ? "Servidor online" : "Servidor offline"}
          >
            {serverOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {serverOnline ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            className="dash-btn-primary text-xs"
            onClick={onOpenCreator}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Novo projeto
          </button>
        </div>
      }
    >
      <div className="lhome space-y-6">
        {/* ═══════════════════════════════════════
            HERO — Próximo passo + Pipeline
            ═══════════════════════════════════════ */}
        <section className="lhome-hero">
          <div className="lhome-hero-content">
            <div className="lhome-hero-text">
              <span className="lhome-hero-eyebrow">{nextStep.eyebrow}</span>
              <h2 className="lhome-hero-title">{nextStep.title}</h2>
              <p className="lhome-hero-desc">{nextStep.description}</p>
              <div className="lhome-hero-actions">
                <button
                  type="button"
                  className="lhome-hero-btn-primary"
                  onClick={() => navigateHome(nextStep.primaryTab)}
                >
                  <Play className="w-4 h-4" />
                  {nextStep.primaryLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
                {nextStep.secondaryLabel && nextStep.secondaryTab && (
                  <button
                    type="button"
                    className="lhome-hero-btn-ghost"
                    onClick={() => navigateHome(nextStep.secondaryTab!)}
                  >
                    {nextStep.secondaryLabel}
                  </button>
                )}
              </div>
            </div>

            {/* Métricas laterais */}
            <div className="lhome-hero-metrics">
              <MetricCard
                value={`${progressPct}%`}
                label="Pipeline"
                icon={Layers}
                accent="violet"
              />
              {videoQualityScore != null && (
                <MetricCard
                  value={videoQualityScore}
                  label="Qualidade"
                  icon={Sparkles}
                  accent="emerald"
                />
              )}
              <MetricCard
                value={outputCount}
                label="Vídeos"
                icon={Tv}
                accent="amber"
                onClick={onOpenRender}
              />
              {youtubeAlerts > 0 && (
                <MetricCard
                  value={youtubeAlerts}
                  label="Alertas YT"
                  icon={Youtube}
                  accent="rose"
                  onClick={onOpenYoutube}
                />
              )}
            </div>
          </div>

          {/* Pipeline visual */}
          <div className="lhome-hero-pipeline">
            <PipelineProgress
              steps={PIPELINE_STEPS}
              status={status}
              outputCount={outputCount}
              rendering={rendering}
              renderPercent={renderPercent}
              onStepClick={handlePipelineClick}
            />
          </div>

          {/* Glow decorativo */}
          <div className="lhome-hero-glow" aria-hidden />
        </section>

        {/* ═══════════════════════════════════════
            AÇÕES PRIMÁRIAS (3 cards grandes)
            ═══════════════════════════════════════ */}
        <section className="lhome-primary-actions">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="lhome-primary-card"
                onClick={action.onClick}
              >
                <span className="lhome-primary-card-icon">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="lhome-primary-card-info">
                  <span className="lhome-primary-card-label">
                    {action.label}
                  </span>
                  <span className="lhome-primary-card-desc">{action.desc}</span>
                </span>
                <ChevronRight className="w-4 h-4 lhome-primary-card-arrow" />
              </button>
            );
          })}
        </section>

        {/* ═══════════════════════════════════════
            AÇÕES SECUNDÁRIAS (chips compactos)
            ═══════════════════════════════════════ */}
        <section className="lhome-secondary-actions">
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="lhome-secondary-chip"
                onClick={action.onClick}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{action.label}</span>
                {"badge" in action && action.badge ? (
                  <span className="lhome-secondary-badge">{action.badge}</span>
                ) : null}
              </button>
            );
          })}
        </section>

        {/* ═══════════════════════════════════════
            SPLIT: Projetos recentes + Dashboard
            ═══════════════════════════════════════ */}
        <div className="lhome-split">
          {/* Projetos recentes */}
          <section className="lhome-recent-panel">
            <div className="lhome-panel-header">
              <div>
                <span className="lhome-panel-eyebrow">Continuar</span>
                <h3 className="lhome-panel-title">Projetos recentes</h3>
              </div>
              <button
                type="button"
                className="lhome-panel-link"
                onClick={onOpenProjects}
              >
                Ver todos
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentItems.length === 0 ? (
              <div className="lhome-recent-empty">
                <FolderOpen className="w-8 h-8 text-dash-muted/40" />
                <p>Nenhum projeto ainda</p>
                <button
                  type="button"
                  className="lhome-recent-empty-btn"
                  onClick={onOpenCreator}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Criar com IA
                </button>
              </div>
            ) : (
              <ul className="lhome-recent-list">
                {recentItems.map((proj) => {
                  const isActive = proj.name === activeProject;
                  return (
                    <li key={proj.name}>
                      <button
                        type="button"
                        className={`lhome-recent-item ${isActive ? "is-active" : ""}`}
                        onClick={() => onSelectProject(proj.name)}
                      >
                        <span
                          className={`lhome-recent-thumb ${proj.format === "SHORTS" ? "is-shorts" : ""}`}
                        >
                          {proj.format === "SHORTS" ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : (
                            <Tv className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="lhome-recent-info">
                          <span className="lhome-recent-name">
                            {proj.title || proj.name}
                          </span>
                          <span className="lhome-recent-meta">
                            {proj.name}
                            {proj.modifiedAt && (
                              <>
                                <span className="lhome-recent-dot">·</span>
                                <Clock className="w-2.5 h-2.5 inline" />
                                {timeAgo(proj.modifiedAt)}
                              </>
                            )}
                          </span>
                        </span>
                        {proj.niche && (
                          <NicheTag
                            niche={proj.niche}
                            className="text-[9px] shrink-0"
                          />
                        )}
                        {isActive && (
                          <span className="lhome-recent-active-badge">
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

          {/* Dashboard */}
          <section className="lhome-dashboard-panel">
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

        {/* ═══════════════════════════════════════
            INSIGHTS: Activity + YouTube
            ═══════════════════════════════════════ */}
        <div className="lhome-insights">
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
          <div className="lhome-insights-side">
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

        {/* ═══════════════════════════════════════
            ESTÚDIO GLOBAL (chips)
            ═══════════════════════════════════════ */}
        <section className="lhome-studio">
          <span className="lhome-studio-label">Estúdio</span>
          <div className="lhome-studio-chips">
            {studioShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  type="button"
                  className="lhome-studio-chip"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════
          CSS (inline para não depender de arquivo externo)
          ═══════════════════════════════════════ */}
      <style>{`
        /* ── Layout ── */
        .lhome { --lhome-radius: 14px; }

        /* ── Hero ── */
        .lhome-hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--lhome-radius);
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 28px 28px 20px;
        }
        .lhome-hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .lhome-hero-content {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .lhome-hero-text { max-width: 560px; }
        .lhome-hero-eyebrow {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #a78bfa;
        }
        .lhome-hero-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin: 6px 0 8px;
          line-height: 1.25;
        }
        .lhome-hero-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
        }
        .lhome-hero-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .lhome-hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(139,92,246,0.3);
        }
        .lhome-hero-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(139,92,246,0.4);
        }
        .lhome-hero-btn-ghost {
          display: inline-flex;
          align-items: center;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lhome-hero-btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        /* ── Hero Metrics ── */
        .lhome-hero-metrics {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .lhome-metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          cursor: default;
          min-width: 80px;
          transition: all 0.2s;
        }
        .lhome-metric:hover { background: rgba(255,255,255,0.06); }
        .lhome-metric-icon { opacity: 0.5; margin-bottom: 4px; }
        .lhome-metric-value {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .lhome-metric-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.4);
        }
        .lhome-metric-violet .lhome-metric-icon { color: #a78bfa; }
        .lhome-metric-emerald .lhome-metric-icon { color: #34d399; }
        .lhome-metric-amber .lhome-metric-icon { color: #fbbf24; }
        .lhome-metric-rose .lhome-metric-icon { color: #fb7185; }
        .lhome-metric-cyan .lhome-metric-icon { color: #22d3ee; }

        /* ── Pipeline ── */
        .lhome-hero-pipeline {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 1;
        }
        .lhome-pipeline { position: relative; }
        .lhome-pipeline-track {
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
          margin-bottom: 14px;
          overflow: visible;
          position: relative;
        }
        .lhome-pipeline-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #a78bfa);
          border-radius: 3px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lhome-pipeline-render-indicator {
          position: absolute;
          top: -3px;
          width: 9px; height: 9px;
          background: #fbbf24;
          border-radius: 50%;
          transform: translateX(-50%);
          animation: lhome-pulse 1.5s infinite;
        }
        @keyframes lhome-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(251,191,36,0); }
        }
        .lhome-pipeline-steps {
          display: flex;
          justify-content: space-between;
          gap: 4px;
        }
        .lhome-pipeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.2s;
          position: relative;
          flex: 1;
        }
        .lhome-pipeline-step:hover { background: rgba(255,255,255,0.04); }
        .lhome-pipeline-step-node {
          width: 28px; height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.4);
          transition: all 0.3s;
        }
        .lhome-pipeline-step.is-done .lhome-pipeline-step-node {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.15);
          color: #a78bfa;
        }
        .lhome-pipeline-step.is-rendering .lhome-pipeline-step-node {
          border-color: #fbbf24;
          color: #fbbf24;
        }
        .lhome-pipeline-step-label {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }
        .lhome-pipeline-step.is-done .lhome-pipeline-step-label { color: #a78bfa; }
        .lhome-pipeline-connector {
          position: absolute;
          top: 18px;
          left: calc(50% + 18px);
          width: calc(100% - 36px);
          height: 2px;
          background: rgba(255,255,255,0.06);
        }
        .lhome-pipeline-connector.is-done { background: rgba(139,92,246,0.3); }
        .lhome-pipeline-spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(251,191,36,0.3);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: lhome-spin 0.8s linear infinite;
        }
        @keyframes lhome-spin { to { transform: rotate(360deg); } }
        .lhome-pipeline-pct {
          position: absolute;
          top: -2px; right: 0;
          font-size: 10px;
          font-weight: 700;
          color: #a78bfa;
        }

        /* ── Primary Actions ── */
        .lhome-primary-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .lhome-primary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-radius: var(--lhome-radius);
          border: 1px solid var(--dash-border, rgba(255,255,255,0.06));
          background: var(--dash-card-bg, rgba(255,255,255,0.02));
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .lhome-primary-card:hover {
          border-color: rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.04);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .lhome-primary-card-icon {
          width: 42px; height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05));
          color: #a78bfa;
          flex-shrink: 0;
        }
        .lhome-primary-card-info { flex: 1; min-width: 0; }
        .lhome-primary-card-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--dash-text, #fff);
        }
        .lhome-primary-card-desc {
          display: block;
          font-size: 11px;
          color: var(--dash-muted, rgba(255,255,255,0.4));
          margin-top: 2px;
        }
        .lhome-primary-card-arrow {
          color: var(--dash-muted, rgba(255,255,255,0.3));
          transition: transform 0.2s;
        }
        .lhome-primary-card:hover .lhome-primary-card-arrow {
          transform: translateX(3px);
          color: #a78bfa;
        }

        /* ── Secondary Actions ── */
        .lhome-secondary-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .lhome-secondary-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid var(--dash-border, rgba(255,255,255,0.06));
          background: var(--dash-card-bg, rgba(255,255,255,0.02));
          color: var(--dash-muted, rgba(255,255,255,0.5));
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lhome-secondary-chip:hover {
          border-color: rgba(139,92,246,0.3);
          color: var(--dash-text, #fff);
          background: rgba(139,92,246,0.06);
        }
        .lhome-secondary-badge {
          min-width: 16px; height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 0 4px;
        }

        /* ── Server Badge ── */
        .lhome-server-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
        }
        .lhome-server-badge.is-online {
          background: rgba(52,211,153,0.1);
          color: #34d399;
          border: 1px solid rgba(52,211,153,0.2);
        }
        .lhome-server-badge.is-offline {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.2);
        }

        /* ── Split ── */
        .lhome-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .lhome-split { grid-template-columns: 1fr; }
        }

        /* ── Recent Panel ── */
        .lhome-recent-panel {
          border-radius: var(--lhome-radius);
          border: 1px solid var(--dash-border, rgba(255,255,255,0.06));
          background: var(--dash-card-bg, rgba(255,255,255,0.02));
          padding: 20px;
        }
        .lhome-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .lhome-panel-eyebrow {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--dash-muted, rgba(255,255,255,0.35));
        }
        .lhome-panel-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--dash-text, #fff);
          margin-top: 2px;
        }
        .lhome-panel-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: #a78bfa;
          background: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .lhome-panel-link:hover { opacity: 0.7; }

        .lhome-recent-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 32px 16px;
          text-align: center;
        }
        .lhome-recent-empty p {
          font-size: 12px;
          color: var(--dash-muted, rgba(255,255,255,0.4));
        }
        .lhome-recent-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.08);
          color: #a78bfa;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lhome-recent-empty-btn:hover {
          background: rgba(139,92,246,0.15);
        }

        .lhome-recent-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lhome-recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .lhome-recent-item:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
        }
        .lhome-recent-item.is-active {
          background: rgba(139,92,246,0.06);
          border-color: rgba(139,92,246,0.15);
        }
        .lhome-recent-thumb {
          width: 34px; height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          color: var(--dash-muted, rgba(255,255,255,0.4));
          flex-shrink: 0;
        }
        .lhome-recent-thumb.is-shorts {
          background: rgba(251,113,133,0.08);
          color: #fb7185;
        }
        .lhome-recent-info { flex: 1; min-width: 0; }
        .lhome-recent-name {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--dash-text, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lhome-recent-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--dash-muted, rgba(255,255,255,0.35));
          margin-top: 2px;
        }
        .lhome-recent-dot { opacity: 0.4; }
        .lhome-recent-active-badge {
          font-size: 9px;
          font-weight: 700;
          color: #a78bfa;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(139,92,246,0.1);
          flex-shrink: 0;
        }

        /* ── Insights ── */
        .lhome-insights {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .lhome-insights { grid-template-columns: 1fr; }
        }
        .lhome-insights-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Studio ── */
        .lhome-studio {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-radius: var(--lhome-radius);
          border: 1px solid var(--dash-border, rgba(255,255,255,0.06));
          background: var(--dash-card-bg, rgba(255,255,255,0.02));
        }
        .lhome-studio-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--dash-muted, rgba(255,255,255,0.35));
          flex-shrink: 0;
        }
        .lhome-studio-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .lhome-studio-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(139,92,246,0.15);
          background: rgba(139,92,246,0.04);
          color: #c4b5fd;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lhome-studio-chip:hover {
          background: rgba(139,92,246,0.1);
          border-color: rgba(139,92,246,0.3);
          transform: translateY(-1px);
        }

        /* ── Dashboard panel ── */
        .lhome-dashboard-panel { min-width: 0; }

        /* ── Responsivo ── */
        @media (max-width: 640px) {
          .lhome-hero { padding: 20px 16px 16px; }
          .lhome-hero-title { font-size: 18px; }
          .lhome-hero-metrics { width: 100%; justify-content: flex-start; }
          .lhome-primary-actions { grid-template-columns: 1fr; }
          .lhome-pipeline-steps { gap: 2px; }
          .lhome-pipeline-step-label { font-size: 8px; }
        }
      `}</style>
    </DashminPageLayout>
  );
}
