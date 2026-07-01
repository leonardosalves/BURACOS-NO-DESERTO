import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Radio,
  Sparkles,
  Upload,
  Youtube,
} from 'lucide-react';
import type { ProjectListItem } from './ProjectsLibraryPanel';

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'render';
};

type DashminActivityFeedProps = {
  activeProject: string;
  projects: ProjectListItem[];
  recentProjects: string[];
  hasNarration?: boolean;
  outputCount?: number;
  videoQualityScore?: number;
  youtubeAlerts?: number;
  rendering?: boolean;
  renderPercent?: number;
  onOpenYoutube?: () => void;
  onOpenWorkflow?: () => void;
};

function iconForType(type: ActivityItem['type']) {
  switch (type) {
    case 'success':
      return CheckCircle2;
    case 'warning':
      return AlertTriangle;
    case 'render':
      return Film;
    default:
      return Radio;
  }
}

function toneClass(type: ActivityItem['type']) {
  switch (type) {
    case 'success':
      return 'dash-activity-success';
    case 'warning':
      return 'dash-activity-warning';
    case 'render':
      return 'dash-activity-render';
    default:
      return 'dash-activity-info';
  }
}

export function DashminActivityFeed({
  activeProject,
  projects,
  recentProjects,
  hasNarration,
  outputCount = 0,
  videoQualityScore,
  youtubeAlerts = 0,
  rendering,
  renderPercent,
  onOpenYoutube,
  onOpenWorkflow,
}: DashminActivityFeedProps) {
  const items = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];
    const now = 'Agora';

    if (rendering) {
      list.push({
        id: 'render-live',
        title: 'Render em andamento',
        detail: renderPercent != null ? `${renderPercent}% · ${activeProject}` : activeProject,
        time: now,
        type: 'render',
      });
    }

    if (youtubeAlerts > 0) {
      list.push({
        id: 'yt-alerts',
        title: `${youtubeAlerts} alerta(s) no canal`,
        detail: 'Comentários ou views 48h — revisar no YouTube Studio',
        time: 'Recente',
        type: 'warning',
      });
    }

    if (videoQualityScore != null) {
      list.push({
        id: 'quality',
        title: `Qualidade pré-render: ${videoQualityScore}/100`,
        detail: videoQualityScore >= 80 ? 'Pipeline pronto para PRO' : 'Revise Workflow antes do render',
        time: 'Projeto ativo',
        type: videoQualityScore >= 80 ? 'success' : 'info',
      });
    }

    if (hasNarration) {
      list.push({
        id: 'narration',
        title: 'Narração sincronizada',
        detail: activeProject,
        time: 'Pipeline',
        type: 'success',
      });
    } else {
      list.push({
        id: 'no-narration',
        title: 'Narração pendente',
        detail: 'Abra Workflow para gerar TTS e timings',
        time: 'Ação',
        type: 'warning',
      });
    }

    if (outputCount > 0) {
      list.push({
        id: 'outputs',
        title: `${outputCount} vídeo(s) no OUTPUT`,
        detail: 'Pronto para metadados e upload',
        time: 'Render',
        type: 'success',
      });
    }

    recentProjects.slice(0, 3).forEach((name, idx) => {
      const proj = projects.find((p) => p.name === name);
      list.push({
        id: `recent-${name}`,
        title: proj?.title || name,
        detail: `${proj?.format === 'SHORTS' ? 'Short' : 'Longo'} · ${proj?.niche || 'Geral'}`,
        time: idx === 0 ? 'Último' : 'Recente',
        type: 'info',
      });
    });

    return list.slice(0, 8);
  }, [
    activeProject,
    projects,
    recentProjects,
    hasNarration,
    outputCount,
    videoQualityScore,
    youtubeAlerts,
    rendering,
    renderPercent,
  ]);

  return (
    <div className="dash-card dash-activity-card">
      <div className="dash-card-header mb-4">
        <div>
          <p className="dash-card-eyebrow">Tempo real</p>
          <h3 className="dash-card-title text-base">Atividade do estúdio</h3>
        </div>
        <Radio className="w-5 h-5 text-dash-success shrink-0 animate-pulse" />
      </div>
      <ul className="dash-activity-list">
        {items.map((item) => {
          const Icon = iconForType(item.type);
          return (
            <li key={item.id} className={`dash-activity-item ${toneClass(item.type)}`}>
              <span className="dash-activity-icon">
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="dash-activity-title">{item.title}</p>
                <p className="dash-activity-detail">{item.detail}</p>
              </div>
              <span className="dash-activity-time">{item.time}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-dash-border">
        {youtubeAlerts > 0 && onOpenYoutube && (
          <button type="button" className="dash-btn-ghost text-[11px] py-1.5 px-3" onClick={onOpenYoutube}>
            <Youtube className="w-3.5 h-3.5" />
            Canal YouTube
          </button>
        )}
        {onOpenWorkflow && (
          <button type="button" className="dash-btn-ghost text-[11px] py-1.5 px-3" onClick={onOpenWorkflow}>
            <Sparkles className="w-3.5 h-3.5" />
            Workflow
          </button>
        )}
        <button type="button" className="dash-btn-ghost text-[11px] py-1.5 px-3" disabled title="Em breve">
          <Upload className="w-3.5 h-3.5" />
          Upload queue
        </button>
      </div>
    </div>
  );
}