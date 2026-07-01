import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Cloud,
  FolderOpen,
  PartyPopper,
  Plus,
} from 'lucide-react';
import type { ProjectListItem } from './ProjectsLibraryPanel';
import { DashminAnalyticsChart } from './DashminAnalyticsChart';
import { DashCardMenu } from './dashmin/ui';

type WorkspaceStatusLike = {
  has_narration?: boolean;
  has_soundtrack?: boolean;
  has_highlight_clip?: boolean;
  has_config?: boolean;
  assets_count?: number;
};

type TodoItem = {
  id: string;
  label: string;
  done: boolean;
  priority: 'urgent' | 'normal' | 'low';
  tag: string;
};

type DashminDashboardProps = {
  projects: ProjectListItem[];
  activeProject: string;
  status?: WorkspaceStatusLike | null;
  videoQualityScore?: number;
  outputCount?: number;
  onOpenWorkflow: () => void;
  onOpenCreator: () => void;
  onOpenProjects: () => void;
};

function priorityClass(priority: TodoItem['priority']) {
  if (priority === 'urgent') return 'dash-tag-urgent';
  if (priority === 'normal') return 'dash-tag-normal';
  return 'dash-tag-low';
}

export function DashminDashboard({
  projects,
  activeProject,
  status,
  videoQualityScore,
  outputCount = 0,
  onOpenWorkflow,
  onOpenCreator,
  onOpenProjects,
}: DashminDashboardProps) {
  const todoItems = useMemo<TodoItem[]>(() => {
    const s = status;
    return [
      {
        id: 'config',
        label: 'Configuração do projeto carregada',
        done: Boolean(s?.has_config),
        priority: 'normal',
        tag: 'Setup',
      },
      {
        id: 'narration',
        label: 'Narração e timings sincronizados',
        done: Boolean(s?.has_narration),
        priority: 'urgent',
        tag: 'Workflow',
      },
      {
        id: 'bgm',
        label: 'Trilha BGM definida',
        done: Boolean(s?.has_soundtrack),
        priority: 'normal',
        tag: 'Música',
      },
      {
        id: 'render',
        label: 'Vídeo renderizado no OUTPUT',
        done: outputCount > 0,
        priority: 'urgent',
        tag: 'Render',
      },
    ];
  }, [status, outputCount]);

  const doneCount = todoItems.filter((t) => t.done).length;
  const progressPct = Math.round((doneCount / todoItems.length) * 100);
  const storagePct = Math.min(100, Math.round((projects.length / 40) * 100));

  const congratsMessage =
    videoQualityScore != null && videoQualityScore >= 80
      ? 'Pipeline com alta qualidade — pronto para render PRO.'
      : doneCount === todoItems.length
        ? 'Todas as etapas do projeto ativo foram concluídas.'
        : `${doneCount} de ${todoItems.length} etapas prontas no projeto ativo.`;

  return (
    <div className="dash-dashboard-grid animate-fade-in">
      <div className="dash-card dash-card-highlight dash-span-2-lg">
        <div className="dash-card-header">
          <div>
            <p className="dash-card-eyebrow">Progresso do pipeline</p>
            <h3 className="dash-card-title">Parabéns!</h3>
            <p className="dash-card-desc">{congratsMessage}</p>
          </div>
          <div className="dash-congrats-ring" aria-hidden>
            <span className="dash-congrats-pct">{progressPct}%</span>
            <PartyPopper className="w-8 h-8 text-dash-primary opacity-80" />
          </div>
        </div>
        <div className="dash-progress-track">
          <div className="dash-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[11px] text-dash-muted mt-2 truncate" title={activeProject}>
          Projeto: <strong className="text-white">{activeProject}</strong>
        </p>
      </div>

      <div className="dash-card dash-card-analytics">
        <div className="dash-card-header mb-2">
          <div>
            <p className="dash-card-eyebrow">Biblioteca</p>
            <h3 className="dash-card-title text-base">Analytics</h3>
          </div>
          <DashCardMenu
            items={[
              { id: 'daily', label: 'Diário' },
              { id: 'monthly', label: 'Mensal' },
              { id: 'sort', label: 'Ordenar' },
            ]}
          />
        </div>
        <DashminAnalyticsChart projects={projects} />
      </div>

      <div className="dash-card dash-span-2-lg">
        <div className="dash-card-header mb-3">
          <div>
            <p className="dash-card-eyebrow">Hoje · pipeline</p>
            <h3 className="dash-card-title text-base">Lista de tarefas</h3>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="dash-icon-btn" onClick={onOpenWorkflow} title="Abrir Workflow">
              <Plus className="w-4 h-4" />
            </button>
            <DashCardMenu
              items={[
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta semana' },
                { id: 'all', label: 'Todas' },
              ]}
            />
          </div>
        </div>
        <ul className="dash-todo-list">
          {todoItems.map((item) => (
            <li key={item.id} className={`dash-todo-item ${item.done ? 'done' : ''}`}>
              <span className="dash-todo-check">
                {item.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="dash-todo-text">{item.label}</p>
                <span className={`dash-todo-tag ${priorityClass(item.priority)}`}>{item.tag}</span>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="dash-link-btn mt-3" onClick={onOpenWorkflow}>
          Abrir Workflow e Tarefas →
        </button>
      </div>

      <div className="dash-card">
        <div className="dash-card-header mb-4">
          <div>
            <p className="dash-card-eyebrow">Workspace</p>
            <h3 className="dash-card-title text-base">Armazenamento</h3>
          </div>
          <Cloud className="w-5 h-5 text-dash-info shrink-0" />
        </div>
        <div className="dash-storage-ring">
          <svg viewBox="0 0 120 120" className="w-28 h-28 mx-auto">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1a2230" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#8280fd"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${storagePct * 3.27} 327`}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="58" textAnchor="middle" className="fill-white text-xl font-bold">
              {storagePct}%
            </text>
            <text x="60" y="74" textAnchor="middle" className="fill-dash-muted text-[9px]">
              usado
            </text>
          </svg>
        </div>
        <p className="text-center text-[11px] text-dash-muted mt-2">
          {projects.length} projeto(s) na biblioteca
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <button type="button" className="dash-btn-primary w-full text-xs" onClick={onOpenProjects}>
            <FolderOpen className="w-3.5 h-3.5" />
            Ver biblioteca
          </button>
          <button type="button" className="dash-btn-ghost w-full text-xs" onClick={onOpenCreator}>
            Novo projeto com IA
          </button>
        </div>
      </div>
    </div>
  );
}