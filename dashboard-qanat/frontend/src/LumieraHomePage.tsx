import React from 'react';
import {
  ArrowRight,
  Clapperboard,
  Layers,
  Music,
  Share2,
  Sparkles,
  Tv,
  Upload,
  Wand2,
} from 'lucide-react';
import { DashminPageLayout } from './DashminPageLayout';
import { DashminStats } from './DashminStats';
import { DashminDashboard } from './DashminDashboard';
import { DashminActivityFeed } from './DashminActivityFeed';
import { DashminYoutubePulse } from './DashminYoutubePulse';
import { YoutubeStudioHomeCard } from './YoutubeStudioHomeCard';
import type { ProjectListItem } from './ProjectsLibraryPanel';

type WorkspaceStatusLike = {
  has_narration?: boolean;
  has_soundtrack?: boolean;
  has_highlight_clip?: boolean;
  has_config?: boolean;
};

type LumieraHomePageProps = {
  projects: ProjectListItem[];
  activeProject: string;
  recentProjects: string[];
  status?: WorkspaceStatusLike | null;
  videoQualityScore?: number;
  outputCount: number;
  youtubeAlerts?: number;
  rendering?: boolean;
  renderPercent?: number;
  viewsThreshold?: number;
  hotVideos?: { projectName?: string; videoId?: string; views48h?: number; format?: string }[];
  onOpenCreator: () => void;
  onOpenProjects: () => void;
  onOpenWorkflow: () => void;
  onOpenTimeline: () => void;
  onOpenMusic: () => void;
  onOpenRender: () => void;
  onOpenUpload: () => void;
  onOpenMetadata: () => void;
  onOpenYoutube: () => void;
};

const PIPELINE_STEPS = [
  {
    id: 'creator',
    label: '1. Ideias & Roteiro',
    desc: 'Wizard com IA — ganchos virais, narração e storyboard.',
    icon: Sparkles,
    accent: 'violet',
  },
  {
    id: 'workflow',
    label: '2. Workflow',
    desc: 'Narração, timings, assets e preparação do projeto.',
    icon: Wand2,
    accent: 'amber',
  },
  {
    id: 'timeline',
    label: '3. Roteiro & Tags',
    desc: 'Blocos, keywords, overlays e qualidade pré-render.',
    icon: Layers,
    accent: 'cyan',
  },
  {
    id: 'music',
    label: '4. Trilha BGM',
    desc: 'Mix Epidemic Sound e mood por bloco.',
    icon: Music,
    accent: 'emerald',
  },
  {
    id: 'render',
    label: '5. Render',
    desc: 'Remotion PRO, HyperFrames e saída em OUTPUT.',
    icon: Tv,
    accent: 'gold',
  },
  {
    id: 'upload',
    label: '6. Upload',
    desc: 'Metadados IA e publicação multi-plataforma.',
    icon: Share2,
    accent: 'rose',
  },
] as const;

const CAPABILITIES = [
  {
    title: 'Remotion PRO',
    body: 'Timeline React com overlays cinéticos, lower thirds e infográficos automáticos por bloco.',
  },
  {
    title: 'HyperFrames AI',
    body: 'Catálogo HeyGen portado — transições, legendas virais e transparência ProRes.',
  },
  {
    title: 'IA · Metadados',
    body: 'Títulos A/B/C, descrição SEO, tags, thumbnails e adaptação Shorts/Longo.',
  },
  {
    title: 'Multi-upload',
    body: 'YouTube Shorts/Longo, Instagram Reels, TikTok e Kwai a partir do mesmo OUTPUT.',
  },
  {
    title: 'Canal YouTube',
    body: 'Analytics, alertas 48h, testes de título/thumbnail e fila editorial.',
  },
  {
    title: 'Studio Agents',
    body: 'Skills Hermes/OpenClaw — pesquisa, roteiro, overlays e QA por bundle.',
  },
];

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
}: LumieraHomePageProps) {
  const stepHandlers: Record<string, () => void> = {
    creator: onOpenCreator,
    workflow: onOpenWorkflow,
    timeline: onOpenTimeline,
    music: onOpenMusic,
    render: onOpenRender,
    upload: onOpenUpload,
  };

  return (
    <DashminPageLayout
      title="Início"
      subtitle="Estúdio de vídeos documentais e Shorts — do roteiro ao upload, com IA e Remotion."
      breadcrumb={['Lumiera', 'Início']}
      icon={<Clapperboard className="w-5 h-5" />}
      actions={(
        <button type="button" className="dash-btn-primary text-xs" onClick={onOpenCreator}>
          <Sparkles className="w-3.5 h-3.5" />
          Novo projeto
        </button>
      )}
    >
      <div className="lumiera-home space-y-6">
        <section className="lumiera-home-hero dash-card dash-card-highlight">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <p className="dash-card-eyebrow">Lumiera Cinematic Studio</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mt-1">
                Produza documentários e Shorts com pipeline guiado
              </h2>
              <p className="dash-card-desc mt-3">
                O Lumiera orquestra roteiro, narração, trilha, render Remotion/HyperFrames e publicação
                em YouTube, Instagram, TikTok e Kwai — tudo a partir de um workspace por projeto.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" className="dash-btn-primary text-xs" onClick={onOpenCreator}>
                  Começar com IA
                </button>
                <button type="button" className="dash-btn-ghost text-xs" onClick={onOpenProjects}>
                  Abrir biblioteca
                </button>
                <button type="button" className="dash-btn-ghost text-xs" onClick={onOpenMetadata}>
                  Metadados IA
                </button>
              </div>
            </div>
            <div className="lumiera-home-hero-meta shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wider text-dash-muted">Projeto ativo</p>
              <p className="text-sm font-bold text-white truncate max-w-[200px]" title={activeProject}>
                {activeProject}
              </p>
              <p className="text-[10px] text-dash-muted mt-3">v1.2.0 · Backend :3005</p>
              <p className="text-[10px] text-dash-muted">{projects.length} projetos · {outputCount} render(s)</p>
            </div>
          </div>
        </section>

        <DashminStats
          projectCount={projects.length}
          recentCount={recentProjects.length}
          youtubeAlerts={youtubeAlerts}
          activeProject={activeProject}
        />

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-white">Pipeline de produção</h3>
            <span className="text-[10px] text-dash-muted">Clique em uma etapa para abrir no workspace</span>
          </div>
          <div className="lumiera-home-pipeline">
            {PIPELINE_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={stepHandlers[step.id]}
                  className={`lumiera-home-step lumiera-home-step-${step.accent}`}
                >
                  <span className="lumiera-home-step-icon">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="lumiera-home-step-label">{step.label}</span>
                  <span className="lumiera-home-step-desc">{step.desc}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40 mt-2" />
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-white mb-3">Projeto ativo — progresso</h3>
          <DashminDashboard
            projects={projects}
            activeProject={activeProject}
            status={status}
            videoQualityScore={videoQualityScore}
            outputCount={outputCount}
            onOpenWorkflow={onOpenWorkflow}
            onOpenCreator={onOpenCreator}
            onOpenProjects={onOpenProjects}
          />
        </section>

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
          <h3 className="text-sm font-bold text-white mb-3">O que o programa faz</h3>
          <div className="lumiera-home-capabilities">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="dash-card min-w-0">
                <h4 className="text-sm font-bold text-white">{cap.title}</h4>
                <p className="text-[11px] text-dash-muted mt-2 leading-relaxed">{cap.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="dash-card-eyebrow">Próximo passo</p>
            <p className="text-sm text-white font-semibold">
              {outputCount > 0
                ? 'Vídeo renderizado — revise metadados e publique.'
                : status?.has_narration
                  ? 'Narração pronta — inicie o render na aba Render.'
                  : 'Complete o workflow ou crie um projeto novo com IA.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {outputCount > 0 ? (
              <button type="button" className="dash-btn-primary text-xs" onClick={onOpenUpload}>
                <Upload className="w-3.5 h-3.5" />
                Ir para Upload
              </button>
            ) : (
              <button type="button" className="dash-btn-primary text-xs" onClick={onOpenRender}>
                <Tv className="w-3.5 h-3.5" />
                Ir para Render
              </button>
            )}
          </div>
        </section>
      </div>
    </DashminPageLayout>
  );
}