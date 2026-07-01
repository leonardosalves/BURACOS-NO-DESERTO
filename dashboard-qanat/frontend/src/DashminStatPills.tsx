import React from 'react';
import { Activity, CheckCircle2, UserPlus } from 'lucide-react';

type DashminStatPillsProps = {
  projectCount: number;
  outputCount: number;
  completedSteps: number;
  totalSteps: number;
};

export function DashminStatPills({ projectCount, outputCount, completedSteps, totalSteps }: DashminStatPillsProps) {
  return (
    <div className="dash-stat-pills">
      <div className="dash-stat-pill">
        <div className="dash-stat-pill-icon dash-stat-pill-icon-primary">
          <UserPlus className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="dash-stat-pill-label">Projetos</p>
          <p className="dash-stat-pill-value">{projectCount}</p>
          <p className="dash-stat-pill-sub">na biblioteca Lumiera</p>
        </div>
      </div>
      <div className="dash-stat-pill">
        <div className="dash-stat-pill-icon dash-stat-pill-icon-info">
          <Activity className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="dash-stat-pill-label">Atividade</p>
          <p className="dash-stat-pill-value">{outputCount}</p>
          <p className="dash-stat-pill-sub">vídeos no OUTPUT</p>
        </div>
      </div>
      <div className="dash-stat-pill">
        <div className="dash-stat-pill-icon dash-stat-pill-icon-success">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="dash-stat-pill-label">Tarefas concluídas</p>
          <p className="dash-stat-pill-value">
            {completedSteps}/{totalSteps}
          </p>
          <p className="dash-stat-pill-sub">pipeline do projeto ativo</p>
        </div>
      </div>
    </div>
  );
}