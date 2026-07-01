import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ExternalLink, Eye, Loader2, MessageCircle, RefreshCw,
  ThumbsUp, Users, Video, Youtube,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type ChannelOverview = {
  connected: boolean;
  scopesReady: boolean;
  channel: {
    id: string;
    title: string;
    thumbnailUrl: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    hiddenSubscriberCount?: boolean;
  } | null;
  fetchedAt?: string;
  scopeStatus?: {
    missingLabels?: string[];
    error?: string;
  };
  error?: string;
  details?: string;
  needsReauth?: boolean;
  hint?: string;
};

type VideoRow = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  metrics: {
    views: number;
    estimatedMinutesWatched: number;
    likes: number;
    comments: number;
    shares: number;
    subscribersGained: number;
  };
};

type VideosReport = {
  periodDays: number;
  startDate: string;
  endDate: string;
  videos: VideoRow[];
  fetchedAt?: string;
  reachNote?: string;
  error?: string;
  details?: string;
  needsReauth?: boolean;
  hint?: string;
};

type Props = {
  onGoToIntegrations: () => void;
  onRelinkYoutube: () => void;
  toast: (msg: string) => void;
};

function formatNumber(value: number) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('pt-BR');
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function YoutubeStudioPanel({ onGoToIntegrations, onRelinkYoutube, toast }: Props) {
  const [overview, setOverview] = useState<ChannelOverview | null>(null);
  const [videosReport, setVideosReport] = useState<VideosReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodDays, setPeriodDays] = useState(28);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [overviewRes, videosRes] = await Promise.all([
        fetch('/api/youtube/channel/overview'),
        fetch(`/api/youtube/channel/videos?days=${periodDays}&limit=25`),
      ]);

      const overviewData = await overviewRes.json().catch(() => ({}));
      const videosData = await videosRes.json().catch(() => ({}));

      if (!overviewRes.ok && overviewRes.status !== 403) {
        throw new Error(overviewData.details || overviewData.error || 'Falha ao carregar canal');
      }
      if (!videosRes.ok && videosRes.status !== 403) {
        throw new Error(videosData.details || videosData.error || 'Falha ao carregar vídeos');
      }

      setOverview(overviewData as ChannelOverview);
      setVideosReport(videosData as VideosReport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados do YouTube';
      toast(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodDays, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const needsReauth = Boolean(overview?.needsReauth || videosReport?.needsReauth);
  const notConnected = overview && !overview.connected;
  const scopesMissing = overview?.connected && !overview.scopesReady;

  if (loading && !overview) {
    return (
      <div className="glass-panel p-8 rounded-2xl flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando canal YouTube...</span>
      </div>
    );
  }

  return (
    <div className="lumiera-panel-stack animate-fade-in space-y-4">
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Canal YouTube"
            helpId="tab-youtube-studio"
            icon={<Youtube className="w-4 h-4 text-red-400" />}
            subtitle="Métricas do canal e desempenho dos vídeos — dados via YouTube Analytics API."
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 tabular-nums">
              Atualizado: {formatDateTime(videosReport?.fetchedAt || overview?.fetchedAt)}
            </span>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="text-[10px] text-zinc-400 hover:text-gold-400 transition flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {(notConnected || scopesMissing || needsReauth) && (
          <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 text-amber-200/90 text-[11px] leading-relaxed flex-1">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {notConnected && (
                  <p>YouTube não conectado. Configure credenciais e vincule a conta em Integrações.</p>
                )}
                {scopesMissing && !notConnected && (
                  <p>
                    Faltam permissões
                    {overview?.scopeStatus?.missingLabels?.length
                      ? `: ${overview.scopeStatus.missingLabels.join(', ')}.`
                      : '.'}
                    {' '}Revincule para autorizar analytics.
                  </p>
                )}
                {needsReauth && (
                  <p>{overview?.hint || videosReport?.hint || 'Revincule a conta do YouTube com todos os escopos.'}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onGoToIntegrations}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-300 hover:text-white"
              >
                Integrações
              </button>
              <button
                type="button"
                onClick={onRelinkYoutube}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-bold"
              >
                Revincular YouTube
              </button>
            </div>
          </div>
        )}

        {overview?.channel && (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {overview.channel.thumbnailUrl ? (
              <img
                src={overview.channel.thumbnailUrl}
                alt=""
                className="w-14 h-14 rounded-full border border-zinc-800 object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Youtube className="w-6 h-6 text-red-400/80" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white font-cinzel truncate">{overview.channel.title}</h2>
              <a
                href={`https://studio.youtube.com/channel/${overview.channel.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-500 hover:text-gold-400 inline-flex items-center gap-1 mt-0.5"
              >
                Abrir no YouTube Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {overview?.channel && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900/80">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5" /> Inscritos
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {overview.channel.hiddenSubscriberCount
                  ? 'Oculto'
                  : formatNumber(overview.channel.subscriberCount)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900/80">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
                <Eye className="w-3.5 h-3.5" /> Views totais
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatNumber(overview.channel.viewCount)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900/80">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
                <Video className="w-3.5 h-3.5" /> Vídeos
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatNumber(overview.channel.videoCount)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Desempenho por vídeo</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {videosReport?.startDate && videosReport?.endDate
                ? `${formatShortDate(videosReport.startDate)} — ${formatShortDate(videosReport.endDate)}`
                : `Últimos ${periodDays} dias`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 28, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  periodDays === days
                    ? 'bg-gold-500/15 text-gold-400 border-gold-500/30'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {videosReport?.reachNote && (
          <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed">{videosReport.reachNote}</p>
        )}

        {!videosReport?.videos?.length ? (
          <p className="text-[11px] text-zinc-500 py-6 text-center">
            {notConnected || scopesMissing || needsReauth
              ? 'Conecte o YouTube para ver a tabela de vídeos.'
              : 'Nenhum vídeo encontrado no período.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px] text-left text-[11px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800/80">
                  <th className="py-2 pr-3 font-medium w-12" />
                  <th className="py-2 pr-3 font-medium">Título</th>
                  <th className="py-2 pr-3 font-medium text-right tabular-nums">Views</th>
                  <th className="py-2 pr-3 font-medium text-right tabular-nums">Likes</th>
                  <th className="py-2 pr-3 font-medium text-right tabular-nums">Coment.</th>
                  <th className="py-2 font-medium text-right tabular-nums">Min.</th>
                </tr>
              </thead>
              <tbody>
                {videosReport.videos.map((video) => (
                  <tr key={video.videoId} className="border-b border-zinc-900/60 hover:bg-zinc-950/50">
                    <td className="py-2.5 pr-3">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="w-10 h-7 rounded object-cover border border-zinc-800"
                        />
                      ) : (
                        <div className="w-10 h-7 rounded bg-zinc-900 border border-zinc-800" />
                      )}
                    </td>
                    <td className="py-2.5 pr-3 max-w-[280px]">
                      <a
                        href={`https://youtu.be/${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-200 hover:text-gold-400 line-clamp-2 leading-snug"
                        title={video.title}
                      >
                        {video.title}
                      </a>
                      <span className="text-[9px] text-zinc-600 block mt-0.5">
                        {formatShortDate(video.publishedAt)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white tabular-nums font-medium">
                      {formatNumber(video.metrics.views)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">
                      <span className="inline-flex items-center justify-end gap-1">
                        <ThumbsUp className="w-3 h-3 opacity-50" />
                        {formatNumber(video.metrics.likes)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">
                      <span className="inline-flex items-center justify-end gap-1">
                        <MessageCircle className="w-3 h-3 opacity-50" />
                        {formatNumber(video.metrics.comments)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-zinc-400 tabular-nums">
                      {formatNumber(video.metrics.estimatedMinutesWatched)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}