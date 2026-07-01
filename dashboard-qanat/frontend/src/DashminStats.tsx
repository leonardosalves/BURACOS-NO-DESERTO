import React from 'react';
import { FolderOpen, Play, Server, Youtube } from 'lucide-react';

type DashminStatsProps = {
  projectCount: number;
  recentCount: number;
  serverOnline?: boolean;
  youtubeAlerts?: number;
  activeProject: string;
};

export function DashminStats({
  projectCount,
  recentCount,
  serverOnline = true,
  youtubeAlerts = 0,
  activeProject,
}: DashminStatsProps) {
  const cards = [
    {
      title: 'Projetos',
      value: String(projectCount),
      subtitle: `${recentCount} recentes`,
      trend: 'up' as const,
      trendLabel: 'Biblioteca',
      icon: FolderOpen,
      accent: 'primary' as const,
    },
    {
      title: 'Projeto ativo',
      value: activeProject.length > 24 ? `${activeProject.slice(0, 24)}…` : activeProject,
      subtitle: 'Em produção agora',
      trend: 'neutral' as const,
      trendLabel: 'Workspace',
      icon: Play,
      accent: 'info' as const,
    },
    {
      title: 'Servidor',
      value: serverOnline ? 'Online' : 'Offline',
      subtitle: 'Backend porta 3005',
      trend: serverOnline ? ('up' as const) : ('down' as const),
      trendLabel: serverOnline ? 'Ativo' : 'Verificar',
      icon: Server,
      accent: serverOnline ? ('success' as const) : ('danger' as const),
    },
    {
      title: 'Canal YouTube',
      value: youtubeAlerts > 0 ? String(youtubeAlerts) : 'OK',
      subtitle: youtubeAlerts > 0 ? 'Alertas pendentes' : 'Sem alertas',
      trend: youtubeAlerts > 0 ? ('down' as const) : ('up' as const),
      trendLabel: youtubeAlerts > 0 ? 'Revisar' : 'Estável',
      icon: Youtube,
      accent: 'warning' as const,
    },
  ];

  return (
    <div className="dash-stat-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className={`dash-stat-card dash-stat-${card.accent}`}>
            <div className="dash-stat-card-top">
              <div>
                <p className="dash-stat-label">{card.title}</p>
                <p className="dash-stat-value">{card.value}</p>
              </div>
              <div className="dash-stat-icon-wrap">
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="dash-stat-card-bottom">
              <span className="dash-stat-sub">{card.subtitle}</span>
              <span className={`dash-stat-trend dash-stat-trend-${card.trend}`}>{card.trendLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}