import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FlaskConical, Loader2, Trophy } from 'lucide-react';

type Ranking = {
  id: string;
  text: string;
  isActive?: boolean;
  periodViews?: number | null;
};

type ExperimentRow = {
  projectName: string;
  videoId: string;
  title: string;
  format?: string;
  experiment?: { activeVariantId?: string; rotateHours?: number };
  rankings?: Ranking[];
  winner?: { variantId: string; views: number; title?: string } | null;
  analytics?: { views: number } | null;
  error?: string;
};

type Props = {
  toast: (msg: string) => void;
  onSelectProject?: (projectName: string) => void;
  onRefreshSummary?: () => void;
};

function projectUrl(path: string, projectName: string) {
  return `${path}?project=${encodeURIComponent(projectName)}`;
}

export function YoutubeStudioTitleAb({ toast, onSelectProject, onRefreshSummary }: Props) {
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/youtube/channel/title-experiments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar A/B');
      setExperiments(data.experiments || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro A/B');
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const applyWinner = async (projectName: string) => {
    setActing(projectName);
    try {
      const res = await fetch(projectUrl('/api/youtube/title-experiment/apply-winner', projectName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha');
      toast(`Vencedor aplicado em ${projectName}.`);
      load();
      onRefreshSummary?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro');
    } finally {
      setActing(null);
    }
  };

  const stopExperiment = async (projectName: string) => {
    setActing(projectName);
    try {
      const res = await fetch(projectUrl('/api/youtube/title-experiment/stop', projectName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha');
      toast(`Teste encerrado: ${projectName}`);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-2 text-zinc-500 text-[11px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando testes A/B…
      </div>
    );
  }

  if (!experiments.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl">
        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
          <FlaskConical className="w-3.5 h-3.5 text-violet-400" />
          Nenhum teste A/B de título ativo. Inicie no projeto (Upload → Metadados).
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-violet-400" />
          Testes A/B de título ({experiments.length})
        </h3>
        <button
          type="button"
          onClick={load}
          className="dash-btn-ghost text-[9px] px-2 py-1"
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-3">
        {experiments.map((row) => (
          <div key={row.projectName} className="dash-settings-card rounded-xl space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{row.title}</p>
                <p className="text-[9px] text-cyan-400/90">{row.projectName} · {row.format || '—'}</p>
                <a
                  href={`https://youtu.be/${row.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] text-[var(--dash-muted)] hover:text-[var(--dash-primary)] inline-flex items-center gap-0.5 mt-0.5"
                >
                  {row.videoId} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-right text-[9px] text-zinc-500">
                {row.analytics != null && <p>{row.analytics.views.toLocaleString('pt-BR')} views (período)</p>}
                {row.experiment?.activeVariantId && (
                  <p>Ativa: <span className="text-violet-300">var. {row.experiment.activeVariantId}</span></p>
                )}
              </div>
            </div>

            {row.error && <p className="text-[9px] text-amber-400">{row.error}</p>}

            {(row.rankings?.length ?? 0) > 0 && (
              <ul className="space-y-1">
                {row.rankings!.map((r) => (
                  <li
                    key={r.id}
                    className={`flex items-center justify-between gap-2 text-[9px] px-2 py-1 rounded border ${
                      r.isActive ? 'dash-studio-tab-active' : 'dash-option-btn border-transparent'
                    }`}
                  >
                    <span className="text-zinc-300 truncate">
                      <span className="font-bold text-violet-300 mr-1">{r.id}</span>
                      {r.text}
                    </span>
                    <span className="text-zinc-500 shrink-0 tabular-nums">
                      {typeof r.periodViews === 'number' ? `${r.periodViews} views` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {row.winner && (
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Líder: variante {row.winner.variantId} ({row.winner.views} views)
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {onSelectProject && (
                <button
                  type="button"
                  onClick={() => onSelectProject(row.projectName)}
                  className="text-[8px] px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"
                >
                  Abrir projeto
                </button>
              )}
              <button
                type="button"
                disabled={acting === row.projectName || !row.winner}
                onClick={() => applyWinner(row.projectName)}
                className="text-[8px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 disabled:opacity-40"
              >
                {acting === row.projectName ? '…' : 'Aplicar vencedor'}
              </button>
              <button
                type="button"
                disabled={acting === row.projectName}
                onClick={() => stopExperiment(row.projectName)}
                className="text-[8px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-500"
              >
                Encerrar teste
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}