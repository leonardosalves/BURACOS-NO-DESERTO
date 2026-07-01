import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ExternalLink, Eye, FolderOpen, Loader2, MessageCircle, MessageSquareReply,
  RefreshCw, Search, Send, ThumbsUp, TrendingUp, Users, Video, Youtube,
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

type CommentRow = {
  threadId: string;
  commentId: string;
  videoId: string;
  videoTitle: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  text: string;
  publishedAt: string;
  likeCount: number;
  replyCount: number;
  isAnswered: boolean;
  studioUrl: string;
  watchUrl: string | null;
};

type CommentsReport = {
  channelId: string;
  filter: string;
  keyword: string;
  comments: CommentRow[];
  totalFetched?: number;
  fetchedAt?: string;
  replyNote?: string;
  error?: string;
  details?: string;
  needsReauth?: boolean;
  hint?: string;
};

type CommentFilter = 'all' | 'unanswered';

type LumieraVideoRef = {
  projectName: string;
  videoId: string;
  format: string;
  niche?: string;
  title?: string;
};

export type YoutubeChannelAlerts = {
  badgeCount: number;
  unansweredComments: number;
  hotVideos: Array<{
    projectName: string;
    videoId: string;
    views48h: number;
    format: string;
  }>;
  lumieraVideoById?: Record<string, LumieraVideoRef>;
  alerts: Array<{
    type: string;
    count: number;
    label: string;
    videos?: Array<{ projectName: string; videoId: string; views48h: number }>;
  }>;
  pollIntervalMinutes?: number;
  views48hThreshold?: number;
  fetchedAt?: string;
};

type LumieraVideoRow = {
  projectName: string;
  format: string;
  videoId: string;
  title: string;
  niche?: string;
  thumbnailUrl?: string;
  views48h: number;
  metrics: VideoRow['metrics'];
  studioUrl?: string;
  watchUrl?: string;
};

type VideoDetail = {
  videoId: string;
  periodDays: number;
  analytics: {
    metrics: VideoRow['metrics'] | null;
    available?: boolean;
  };
  retention: {
    points?: Array<{ ratio: number; watchRatio: number }>;
    error?: string;
  };
  velocity: {
    views48h?: number;
    error?: string;
  };
};

type Props = {
  onGoToIntegrations: () => void;
  onRelinkYoutube: () => void;
  toast: (msg: string) => void;
  nicheKeyword?: string;
  alerts?: YoutubeChannelAlerts | null;
  onSelectProject?: (projectName: string) => void;
};

function RetentionSparkline({ points }: { points: Array<{ ratio: number; watchRatio: number }> }) {
  if (!points.length) {
    return <p className="text-[10px] text-zinc-600">Sem curva de retenção no período.</p>;
  }
  const sampled = points.filter((_, index) => index % 4 === 0);
  const max = Math.max(...sampled.map((point) => point.watchRatio), 0.01);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-px h-20 rounded-lg bg-zinc-950 border border-zinc-900 p-2">
        {sampled.map((point) => (
          <div
            key={point.ratio}
            className="flex-1 bg-gold-500/70 rounded-t-sm min-w-[2px]"
            style={{ height: `${Math.max(4, (point.watchRatio / max) * 100)}%` }}
            title={`${Math.round(point.ratio * 100)}% do vídeo · ${(point.watchRatio * 100).toFixed(0)}% assistindo`}
          />
        ))}
      </div>
      <p className="text-[9px] text-zinc-600">Retenção relativa ao longo do vídeo (Analytics API)</p>
    </div>
  );
}

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

export function YoutubeStudioPanel({
  onGoToIntegrations,
  onRelinkYoutube,
  toast,
  nicheKeyword = '',
  alerts = null,
  onSelectProject,
}: Props) {
  const [overview, setOverview] = useState<ChannelOverview | null>(null);
  const [videosReport, setVideosReport] = useState<VideosReport | null>(null);
  const [commentsReport, setCommentsReport] = useState<CommentsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [periodDays, setPeriodDays] = useState(28);
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [keywordInput, setKeywordInput] = useState(nicheKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [lumieraVideos, setLumieraVideos] = useState<LumieraVideoRow[]>([]);
  const [lumieraLoading, setLumieraLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [videoDetailLoading, setVideoDetailLoading] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (nicheKeyword && !appliedKeyword) {
      setKeywordInput(nicheKeyword);
    }
  }, [nicheKeyword, appliedKeyword]);

  const loadComments = useCallback(async (filter: CommentFilter, keyword: string) => {
    setCommentsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        filter,
      });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      const res = await fetch(`/api/youtube/channel/comments?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 403) {
        throw new Error(data.details || data.error || 'Falha ao carregar comentários');
      }
      setCommentsReport(data as CommentsReport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar comentários';
      toast(message);
    } finally {
      setCommentsLoading(false);
    }
  }, [toast]);

  const loadOverviewAndVideos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [overviewRes, videosRes] = await Promise.all([
        fetch('/api/youtube/channel/overview'),
        fetch(`/api/youtube/channel/videos?days=${periodDays}&limit=25`),
      ]);

      const overviewData = await overviewRes.json().catch(() => ({}));
      const videosData = await videosRes.json().catch(() => ({}));

      if (overviewRes.ok || overviewRes.status === 403) {
        setOverview(overviewData as ChannelOverview);
      } else {
        throw new Error(overviewData.details || overviewData.error || 'Falha ao carregar canal');
      }

      if (videosRes.ok || videosRes.status === 403) {
        setVideosReport(videosData as VideosReport);
      } else {
        setVideosReport({
          periodDays,
          startDate: '',
          endDate: '',
          videos: [],
          error: videosData.error || 'Falha ao carregar vídeos',
          details: videosData.details,
          needsReauth: videosData.needsReauth,
        });
        toast(videosData.details || videosData.error || 'Tabela de vídeos indisponível no momento.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados do YouTube';
      toast(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodDays, toast]);

  const loadLumieraVideos = useCallback(async () => {
    setLumieraLoading(true);
    try {
      const res = await fetch(`/api/youtube/channel/lumiera-videos?days=${periodDays}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 403) {
        throw new Error(data.details || data.error || 'Falha ao carregar vídeos Lumiera');
      }
      setLumieraVideos((data.videos || []) as LumieraVideoRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar vídeos Lumiera';
      toast(message);
    } finally {
      setLumieraLoading(false);
    }
  }, [periodDays, toast]);

  const loadVideoDetail = useCallback(async (videoId: string) => {
    setVideoDetailLoading(true);
    try {
      const res = await fetch(`/api/youtube/channel/video/${encodeURIComponent(videoId)}/detail?days=${periodDays}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 403) {
        throw new Error(data.details || data.error || 'Falha ao carregar detalhe do vídeo');
      }
      setVideoDetail(data as VideoDetail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar detalhe do vídeo';
      toast(message);
      setVideoDetail(null);
    } finally {
      setVideoDetailLoading(false);
    }
  }, [periodDays, toast]);

  const submitCommentReply = useCallback(async (commentId: string) => {
    const text = replyDrafts[commentId]?.trim();
    if (!text) {
      toast('Digite uma resposta antes de enviar.');
      return;
    }
    setReplyingId(commentId);
    try {
      const res = await fetch('/api/youtube/channel/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: commentId, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Falha ao publicar resposta');
      }
      setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
      toast('Resposta publicada no YouTube!');
      await loadComments(commentFilter, appliedKeyword);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao responder comentário');
    } finally {
      setReplyingId(null);
    }
  }, [appliedKeyword, commentFilter, loadComments, replyDrafts, toast]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadOverviewAndVideos(true),
      loadComments(commentFilter, appliedKeyword),
      loadLumieraVideos(),
    ]);
    if (selectedVideoId) {
      await loadVideoDetail(selectedVideoId);
    }
    setRefreshing(false);
  }, [
    appliedKeyword,
    commentFilter,
    loadComments,
    loadLumieraVideos,
    loadOverviewAndVideos,
    loadVideoDetail,
    selectedVideoId,
  ]);

  useEffect(() => {
    loadOverviewAndVideos();
  }, [loadOverviewAndVideos]);

  useEffect(() => {
    loadComments(commentFilter, appliedKeyword);
  }, [commentFilter, appliedKeyword, loadComments]);

  useEffect(() => {
    loadLumieraVideos();
  }, [loadLumieraVideos]);

  useEffect(() => {
    if (!selectedVideoId) {
      setVideoDetail(null);
      return;
    }
    loadVideoDetail(selectedVideoId);
  }, [loadVideoDetail, selectedVideoId]);

  const needsReauth = Boolean(
    overview?.needsReauth || videosReport?.needsReauth || commentsReport?.needsReauth,
  );
  const notConnected = overview && !overview.connected;
  const scopesMissing = overview?.connected && !overview.scopesReady;
  const hotVideoIds = new Set((alerts?.hotVideos || []).map((item) => item.videoId));
  const lumieraByVideoId = alerts?.lumieraVideoById || {};

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
              onClick={() => refreshAll()}
              disabled={refreshing}
              className="text-[10px] text-zinc-400 hover:text-gold-400 transition flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {alerts && alerts.alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.alerts.map((alert) => (
              <div
                key={alert.type}
                className="p-3 rounded-xl border border-gold-500/25 bg-gold-500/5 flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-[11px] text-gold-200/90">{alert.label}</p>
                {alert.type === 'unanswered_comments' && (
                  <button
                    type="button"
                    onClick={() => setCommentFilter('unanswered')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    Ver comentários
                  </button>
                )}
                {alert.type === 'hot_videos' && alert.videos?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.videos.slice(0, 3).map((video) => (
                      <button
                        key={video.videoId}
                        type="button"
                        onClick={() => onSelectProject?.(video.projectName)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 hover:text-red-200"
                        title={`${video.views48h} views em 48h`}
                      >
                        {video.projectName} · {formatNumber(video.views48h)} views/48h
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {alerts.pollIntervalMinutes ? (
              <p className="text-[9px] text-zinc-600">
                Alertas atualizados automaticamente a cada {alerts.pollIntervalMinutes} min
                {alerts.fetchedAt ? ` · ${formatDateTime(alerts.fetchedAt)}` : ''}
              </p>
            ) : null}
          </div>
        )}

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
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              Vídeos publicados pelo Lumiera
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Projetos com <code className="text-zinc-600">post_id</code> ou experimento de título vinculado ao YouTube
            </p>
          </div>
        </div>
        {lumieraLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando projetos Lumiera...
          </div>
        ) : lumieraVideos.length === 0 ? (
          <p className="text-[11px] text-zinc-500 py-4 text-center">
            Nenhum projeto com vídeo publicado encontrado. Após o upload, o <code className="text-zinc-600">post_id</code> fica em config do projeto.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lumieraVideos.map((item) => (
              <div
                key={`${item.projectName}-${item.videoId}`}
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-900/80 flex gap-3"
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-16 h-11 rounded object-cover border border-zinc-800 shrink-0" />
                ) : (
                  <div className="w-16 h-11 rounded bg-zinc-900 border border-zinc-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate">{item.title || item.projectName}</p>
                  <p className="text-[9px] text-cyan-400/90 mt-0.5">{item.projectName} · {item.format}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-[9px] text-zinc-500">
                    <span>{formatNumber(item.metrics.views)} views ({periodDays}d)</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-400/90">
                      <TrendingUp className="w-3 h-3" /> {formatNumber(item.views48h)} / 48h
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => onSelectProject?.(item.projectName)}
                      className="text-[9px] font-bold px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                    >
                      Abrir projeto
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVideoId(item.videoId)}
                      className="text-[9px] font-bold px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                    >
                      Ver detalhe
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
        {videosReport?.details && !videosReport?.videos?.length && (
          <p className="text-[10px] text-amber-400/90 mb-3">{videosReport.details}</p>
        )}
        <p className="text-[9px] text-zinc-600 mb-3">Clique em uma linha para ver retenção e views 48h.</p>

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
                {videosReport.videos.map((video) => {
                  const lumieraRef = lumieraByVideoId[video.videoId];
                  const isHot = hotVideoIds.has(video.videoId);
                  return (
                  <tr
                    key={video.videoId}
                    onClick={() => setSelectedVideoId((prev) => (prev === video.videoId ? null : video.videoId))}
                    className={`border-b border-zinc-900/60 hover:bg-zinc-950/50 cursor-pointer ${
                      isHot ? 'bg-gold-500/5' : ''
                    } ${selectedVideoId === video.videoId ? 'bg-gold-500/10 ring-1 ring-inset ring-gold-500/25' : ''}`}
                  >
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
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-200 hover:text-gold-400 line-clamp-2 leading-snug"
                        title={video.title}
                      >
                        {video.title}
                      </a>
                      <span className="text-[9px] text-zinc-600 block mt-0.5">
                        {formatShortDate(video.publishedAt)}
                      </span>
                      {lumieraRef && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject?.(lumieraRef.projectName);
                          }}
                          className="text-[8px] mt-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:text-cyan-300"
                          title="Abrir projeto Lumiera"
                        >
                          Lumiera · {lumieraRef.projectName}
                        </button>
                      )}
                      {isHot && (
                        <span className="text-[8px] mt-1 ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
                          Alto em 48h
                        </span>
                      )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedVideoId && (
          <div className="mt-4 p-4 rounded-xl border border-gold-500/20 bg-gold-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-[11px] font-bold text-gold-200">
                Detalhe do vídeo · {selectedVideoId}
              </p>
              <button
                type="button"
                onClick={() => setSelectedVideoId(null)}
                className="text-[9px] text-zinc-500 hover:text-zinc-300"
              >
                Fechar
              </button>
            </div>
            {videoDetailLoading ? (
              <div className="py-4 flex items-center gap-2 text-zinc-500 text-[11px]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando retenção e velocity...
              </div>
            ) : videoDetail ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Views 48h</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {formatNumber(videoDetail.velocity?.views48h || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Views ({periodDays}d)</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {formatNumber(videoDetail.analytics?.metrics?.views || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Inscritos ganhos</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {formatNumber(videoDetail.analytics?.metrics?.subscribersGained || 0)}
                  </p>
                </div>
                <div className="lg:col-span-3">
                  <RetentionSparkline points={videoDetail.retention?.points || []} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-zinc-400" />
              Comentários recentes
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {commentsReport?.fetchedAt
                ? `Atualizado ${formatDateTime(commentsReport.fetchedAt)}`
                : 'Últimos comentários do canal'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'unanswered'] as CommentFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCommentFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  commentFilter === filter
                    ? 'bg-gold-500/15 text-gold-400 border-gold-500/30'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {filter === 'all' ? 'Todos' : 'Sem resposta'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="search"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedKeyword(keywordInput.trim());
              }}
              placeholder={nicheKeyword ? `Filtrar por palavra-chave (ex.: ${nicheKeyword})` : 'Filtrar por palavra-chave do nicho...'}
              className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedKeyword(keywordInput.trim())}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-300 hover:text-white shrink-0"
          >
            Aplicar filtro
          </button>
          {appliedKeyword && (
            <button
              type="button"
              onClick={() => {
                setAppliedKeyword('');
                setKeywordInput('');
              }}
              className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        {commentsReport?.replyNote && (
          <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed">{commentsReport.replyNote}</p>
        )}

        {commentsLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando comentários...
          </div>
        ) : !commentsReport?.comments?.length ? (
          <p className="text-[11px] text-zinc-500 py-6 text-center">
            {notConnected || scopesMissing || needsReauth
              ? 'Conecte o YouTube para ver comentários.'
              : commentFilter === 'unanswered'
                ? 'Nenhum comentário sem resposta no lote carregado.'
                : appliedKeyword
                  ? `Nenhum comentário com "${appliedKeyword}".`
                  : 'Nenhum comentário recente encontrado.'}
          </p>
        ) : (
          <div className="space-y-3">
            {commentsReport.comments.map((comment) => (
              <div
                key={comment.threadId}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800/80 transition"
              >
                <div className="flex items-start gap-3">
                  {comment.authorProfileImageUrl ? (
                    <img
                      src={comment.authorProfileImageUrl}
                      alt=""
                      className="w-8 h-8 rounded-full border border-zinc-800 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-200">{comment.authorDisplayName}</span>
                      <span className="text-[9px] text-zinc-600">{formatDateTime(comment.publishedAt)}</span>
                      {!comment.isAnswered && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Sem resposta
                        </span>
                      )}
                      {comment.replyCount > 0 && (
                        <span className="text-[9px] text-zinc-600">
                          {comment.replyCount} resposta{comment.replyCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                    {comment.videoTitle && (
                      <p className="text-[9px] text-zinc-600 mt-1.5 truncate" title={comment.videoTitle}>
                        em: {comment.videoTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {comment.studioUrl && (
                        <a
                          href={comment.studioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-300 hover:text-red-200"
                        >
                          <MessageSquareReply className="w-3 h-3" />
                          Responder no Studio
                        </a>
                      )}
                      {comment.watchUrl && (
                        <a
                          href={comment.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-gold-400"
                        >
                          Ver no YouTube <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {comment.likeCount > 0 && (
                        <span className="text-[9px] text-zinc-600 inline-flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {comment.likeCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={replyDrafts[comment.commentId] || ''}
                        onChange={(e) => setReplyDrafts((prev) => ({
                          ...prev,
                          [comment.commentId]: e.target.value,
                        }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitCommentReply(comment.commentId);
                          }
                        }}
                        placeholder="Responder pelo Lumiera..."
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => submitCommentReply(comment.commentId)}
                        disabled={replyingId === comment.commentId}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gold-500 text-zinc-950 text-[10px] font-bold disabled:opacity-50"
                      >
                        {replyingId === comment.commentId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}