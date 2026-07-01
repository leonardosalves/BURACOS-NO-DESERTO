import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, TrendingUp, Youtube } from 'lucide-react';
import { getYoutubeViewsThreshold } from './youtubeStudioPrefs';

type Snapshot = {
  available: boolean;
  connected?: boolean;
  scopesReady?: boolean;
  projectName?: string;
  videoId?: string;
  title?: string;
  views48h?: number;
  isHot?: boolean;
  studioUrl?: string;
  watchUrl?: string;
  reason?: string;
};

type Props = {
  projectName: string;
  videoId?: string;
  onOpenYoutubePanel?: () => void;
  toast?: (msg: string) => void;
};

function formatNumber(value: number) {
  const n = Number(value || 0);
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('pt-BR');
}

export function ProjectYoutubeCard({ projectName, videoId, onOpenYoutubePanel, toast }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSnapshot = useCallback(async () => {
    if (!projectName || !videoId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        project: projectName,
        viewsThreshold: String(getYoutubeViewsThreshold()),
      });
      const res = await fetch(`/api/youtube/channel/project-snapshot?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSnapshot(data as Snapshot);
    } catch {
      toast?.('Erro ao carregar métricas YouTube do projeto.');
    } finally {
      setLoading(false);
    }
  }, [projectName, toast, videoId]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  if (!videoId) return null;

  return (
    <div className="bg-zinc-950/60 border border-red-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-400" />
          <span className="text-[10px] font-bold text-red-300 uppercase tracking-wide">YouTube · Projeto</span>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
      </div>

      {snapshot?.available ? (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-2">
            <span className="text-zinc-500 block">Views 48h</span>
            <span className={`font-bold tabular-nums ${snapshot.isHot ? 'text-amber-400' : 'text-white'}`}>
              {formatNumber(snapshot.views48h || 0)}
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-2">
            <span className="text-zinc-500 block">Status</span>
            <span className="text-white font-bold inline-flex items-center gap-1">
              {snapshot.isHot ? (
                <>
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  Em alta
                </>
              ) : (
                'Normal'
              )}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[9px] text-zinc-500">
          {!snapshot?.connected
            ? 'Conecte o YouTube em Integrações para ver métricas aqui.'
            : 'Métricas indisponíveis no momento.'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {snapshot?.watchUrl && (
          <a
            href={snapshot.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white inline-flex items-center gap-1"
          >
            Ver vídeo <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {onOpenYoutubePanel && (
          <button
            type="button"
            onClick={onOpenYoutubePanel}
            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 hover:text-red-200"
          >
            Abrir Canal YouTube
          </button>
        )}
        <button
          type="button"
          onClick={loadSnapshot}
          className="text-[9px] text-zinc-500 hover:text-zinc-300"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}