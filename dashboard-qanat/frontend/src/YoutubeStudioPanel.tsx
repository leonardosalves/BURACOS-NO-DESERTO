import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bell,
  ExternalLink,
  Eye,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  MessageSquareReply,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Users,
  Video,
  Wrench,
  Youtube,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import {
  getYoutubeNotificationsEnabled,
  getYoutubePollIntervalMinutes,
  getYoutubeViewsThreshold,
  requestYoutubeNotificationPermission,
  setYoutubeNotificationsEnabled,
  setYoutubePollIntervalMinutes,
  setYoutubeViewsThreshold,
} from "./youtubeStudioPrefs";
import { YoutubeStudioTools } from "./YoutubeStudioTools";
import { YoutubeStudioPro } from "./YoutubeStudioPro";
import { YoutubeStudioSettings } from "./YoutubeStudioSettings";
import { YoutubeStudioTitleAb } from "./YoutubeStudioTitleAb";
import { PostPublishChecklist } from "./PostPublishChecklist";
import { fetchGeminiAi, type GeminiBrowserResolver } from "./geminiAiFetch";

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
  videoFormat?: "SHORT" | "LONG";
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
  sentiment?: "positive" | "critical" | "question" | "neutral";
  priorityScore?: number;
  autoReplySuggestion?: {
    suggestedText?: string;
    label?: string;
    keyword?: string;
  } | null;
};

type CommentsReport = {
  channelId: string;
  filter: string;
  keyword: string;
  comments: CommentRow[];
  totalFetched?: number;
  nextPageToken?: string | null;
  fetchedAt?: string;
  replyNote?: string;
  error?: string;
  details?: string;
  needsReauth?: boolean;
  hint?: string;
};

type ReplyTemplate = { id: string; label: string; text: string };

type PeriodComparison = {
  available?: boolean;
  periodDays?: number;
  comparison?: Record<
    string,
    { current: number; previous: number; changePct: number }
  >;
};

type ReachMetrics = {
  available?: boolean;
  metrics?: {
    impressions?: number;
    impressionClickThroughRate?: number;
    views?: number;
  };
  note?: string;
};

type WeeklyReport = {
  text?: string;
  views7d?: number;
  views7dChange?: number;
  unansweredComments?: number;
  fileName?: string;
};

type CommentFilter = "all" | "unanswered";

type StudioTab = "resumo" | "videos" | "comentarios" | "ferramentas";

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
  goalViews48h?: number;
  goalMet?: boolean;
  titleExperiment?: {
    status?: string;
    activeVariantId?: string;
    variants?: number;
  } | null;
  metrics: VideoRow["metrics"];
  studioUrl?: string;
  watchUrl?: string;
};

type VideoDetail = {
  videoId: string;
  periodDays: number;
  analytics: {
    metrics: VideoRow["metrics"] | null;
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
  velocityTimeline?: {
    points?: Array<{ date: string; views: number }>;
    totalViews?: number;
  };
  ctrRevenue?: {
    available?: boolean;
    metrics?: Record<string, number>;
    note?: string;
  };
};

type Props = {
  onGoToIntegrations: () => void;
  onRelinkYoutube: () => void;
  toast: (msg: string) => void;
  nicheKeyword?: string;
  alerts?: YoutubeChannelAlerts | null;
  onSelectProject?: (projectName: string) => void;
  onAlertsSync?: (alerts: YoutubeChannelAlerts) => void;
  onApplyCreatorIdea?: (
    title: string,
    hookPt?: string,
    options?: import("./creatorEditorialImport").CreatorApplyIdeaOptions
  ) => void;
  onSchedulePublish?: (slot: {
    iso: string;
    local: string;
    label?: string;
  }) => void;
  geminiBrowserMode?: boolean;
  aiProvider?: string;
  resolveBrowserResponse?: GeminiBrowserResolver;
  embedded?: boolean;
};

function RetentionSparkline({
  points,
}: {
  points: Array<{ ratio: number; watchRatio: number }>;
}) {
  if (!points.length) {
    return (
      <p className="text-[10px] text-zinc-600">
        Sem curva de retenção no período.
      </p>
    );
  }
  const sampled = points.filter((_, index) => index % 4 === 0);
  const max = Math.max(...sampled.map((point) => point.watchRatio), 0.01);
  return (
    <div className="space-y-1">
      <div className="dash-studio-chart-panel">
        {sampled.map((point) => {
          const barHeight = Math.max(
            4,
            Math.round((point.watchRatio / max) * 64)
          );
          return (
            <div
              key={point.ratio}
              className="flex-1 flex flex-col justify-end h-full min-w-[2px]"
              title={`${Math.round(point.ratio * 100)}% do vídeo · ${(point.watchRatio * 100).toFixed(0)}% assistindo`}
            >
              <div
                className="dash-studio-chart-bar"
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-zinc-600">
        Retenção relativa ao longo do vídeo (Analytics API)
      </p>
    </div>
  );
}

function formatNumber(value: number) {
  const n = Number(value || 0);
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("pt-BR");
}

function normalizeVideoFormat(value?: string): "SHORT" | "LONG" {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (raw === "SHORT" || raw === "SHORTS") return "SHORT";
  return "LONG";
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatShortDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function YoutubeStudioPanel({
  onGoToIntegrations,
  onRelinkYoutube,
  toast,
  nicheKeyword = "",
  alerts = null,
  onSelectProject,
  onAlertsSync,
  onApplyCreatorIdea,
  onSchedulePublish,
  geminiBrowserMode = false,
  aiProvider = "gemini",
  resolveBrowserResponse,
  embedded = false,
}: Props) {
  const [overview, setOverview] = useState<ChannelOverview | null>(null);
  const [videosReport, setVideosReport] = useState<VideosReport | null>(null);
  const [commentsReport, setCommentsReport] = useState<CommentsReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [periodDays, setPeriodDays] = useState(28);
  const [commentFilter, setCommentFilter] =
    useState<CommentFilter>("unanswered");
  const [keywordInput, setKeywordInput] = useState(nicheKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [lumieraVideos, setLumieraVideos] = useState<LumieraVideoRow[]>([]);
  const [lumieraLoading, setLumieraLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [videoDetailLoading, setVideoDetailLoading] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [viewsThreshold, setViewsThreshold] = useState(() =>
    getYoutubeViewsThreshold()
  );
  const [pollMinutes, setPollMinutes] = useState(() =>
    getYoutubePollIntervalMinutes()
  );
  const [notificationsOn, setNotificationsOn] = useState(() =>
    getYoutubeNotificationsEnabled()
  );
  const [fromCache, setFromCache] = useState(false);
  const [commentsNextPageToken, setCommentsNextPageToken] = useState<
    string | null
  >(null);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [periodComparison, setPeriodComparison] =
    useState<PeriodComparison | null>(null);
  const [reachMetrics, setReachMetrics] = useState<ReachMetrics | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkReplyText, setBulkReplyText] = useState("");
  const [videoFormatFilter, setVideoFormatFilter] = useState<
    "all" | "SHORT" | "LONG"
  >("all");
  const [activeTab, setActiveTab] = useState<StudioTab>("resumo");
  const [postChecklistProject, setPostChecklistProject] = useState<{
    projectName: string;
    videoId: string;
  } | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [channelInsights, setChannelInsights] = useState<{
    health?: number;
    benchmark?: any;
    anomalias?: any[];
    projecao?: any;
    melhorHorario?: string;
  } | null>(null);
  const periodDaysRef = useRef(periodDays);
  periodDaysRef.current = periodDays;

  useEffect(() => {
    fetch("/api/tools/active/insights")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setChannelInsights(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (nicheKeyword && !appliedKeyword) {
      setKeywordInput(nicheKeyword);
    }
  }, [nicheKeyword, appliedKeyword]);

  const loadComments = useCallback(
    async (
      filter: CommentFilter,
      keyword: string,
      { append = false, pageToken = "" } = {}
    ) => {
      if (append) setLoadingMoreComments(true);
      else setCommentsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "20",
          filter,
          viewsThreshold: String(viewsThreshold),
        });
        if (keyword.trim()) params.set("keyword", keyword.trim());
        if (pageToken) params.set("pageToken", pageToken);
        params.set("_", String(Date.now()));
        const res = await fetch(
          `/api/youtube/channel/comments?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 403) {
          throw new Error(
            data.details || data.error || "Falha ao carregar comentários"
          );
        }
        const report = data as CommentsReport;
        setCommentsNextPageToken(report.nextPageToken || null);
        if (append) {
          setCommentsReport((prev) => ({
            ...report,
            comments: [...(prev?.comments || []), ...(report.comments || [])],
          }));
        } else {
          setCommentsReport(report);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar comentários";
        toast(message);
      } finally {
        setCommentsLoading(false);
        setLoadingMoreComments(false);
      }
    },
    [toast, viewsThreshold]
  );

  const syncAlertsPayload = useCallback(
    (payload: Record<string, unknown>) => {
      if (!onAlertsSync || !payload) return;
      onAlertsSync({
        badgeCount: Number(payload.badgeCount || 0),
        unansweredComments: Number(payload.unansweredComments || 0),
        hotVideos: (payload.hotVideos ||
          []) as YoutubeChannelAlerts["hotVideos"],
        lumieraVideoById: (payload.lumieraVideoById ||
          {}) as YoutubeChannelAlerts["lumieraVideoById"],
        alerts: (payload.alerts || []) as YoutubeChannelAlerts["alerts"],
        pollIntervalMinutes: Number(payload.pollIntervalMinutes || 20),
        views48hThreshold: Number(payload.views48hThreshold || viewsThreshold),
        fetchedAt: String(payload.fetchedAt || ""),
      });
    },
    [onAlertsSync, viewsThreshold]
  );

  const loadChannelSummary = useCallback(
    async (silent = false, forceRefresh = false, daysOverride?: number) => {
      const days = daysOverride ?? periodDaysRef.current;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setLumieraLoading(true);
      try {
        const params = new URLSearchParams({
          days: String(days),
          limit: "25",
          viewsThreshold: String(viewsThreshold),
          _: String(Date.now()),
        });
        if (forceRefresh) params.set("refresh", "1");

        const res = await fetch(
          `/api/youtube/channel/summary?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 403) {
          throw new Error(
            data.details || data.error || "Falha ao carregar canal"
          );
        }

        if (data.overview) setOverview(data.overview as ChannelOverview);
        if (data.videos) setVideosReport(data.videos as VideosReport);
        if (data.lumiera?.videos)
          setLumieraVideos(data.lumiera.videos as LumieraVideoRow[]);
        if (data.alerts)
          syncAlertsPayload(data.alerts as Record<string, unknown>);
        if (data.periodComparison)
          setPeriodComparison(data.periodComparison as PeriodComparison);
        if (data.reach) setReachMetrics(data.reach as ReachMetrics);
        if (data.settings?.replyTemplates)
          setReplyTemplates(data.settings.replyTemplates as ReplyTemplate[]);
        setFromCache(Boolean(data.fromCache));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar dados do YouTube";
        toast(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLumieraLoading(false);
      }
    },
    [syncAlertsPayload, toast, viewsThreshold]
  );

  const changePeriodDays = useCallback(
    (days: number) => {
      setPeriodDays(days);
      void loadChannelSummary(true, true, days);
    },
    [loadChannelSummary]
  );

  const loadVideoDetail = useCallback(
    async (videoId: string) => {
      setVideoDetailLoading(true);
      try {
        const res = await fetch(
          `/api/youtube/channel/video/${encodeURIComponent(videoId)}/detail?days=${periodDays}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 403) {
          throw new Error(
            data.details || data.error || "Falha ao carregar detalhe do vídeo"
          );
        }
        setVideoDetail(data as VideoDetail);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar detalhe do vídeo";
        toast(message);
        setVideoDetail(null);
      } finally {
        setVideoDetailLoading(false);
      }
    },
    [periodDays, toast]
  );

  const submitCommentReply = useCallback(
    async (comment: CommentRow) => {
      const commentId = comment.commentId;
      const text = replyDrafts[commentId]?.trim();
      if (!text) {
        toast("Digite uma resposta antes de enviar.");
        return;
      }
      setReplyingId(commentId);
      try {
        const res = await fetch("/api/youtube/channel/comments/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: commentId,
            threadId: comment.threadId,
            videoId: comment.videoId,
            videoTitle: comment.videoTitle,
            text,
            source: "manual",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.details || data.error || "Falha ao publicar resposta"
          );
        }
        setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
        toast("Resposta publicada no YouTube!");
        await loadComments(commentFilter, appliedKeyword);
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Erro ao responder comentário"
        );
      } finally {
        setReplyingId(null);
      }
    },
    [appliedKeyword, commentFilter, loadComments, replyDrafts, toast]
  );

  const markCommentHandled = useCallback(
    async (threadId: string) => {
      try {
        const res = await fetch("/api/youtube/channel/comments/handled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });
        if (!res.ok) throw new Error("Falha ao marcar comentário");
        setCommentsReport((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter((c) => c.threadId !== threadId),
              }
            : prev
        );
        await loadChannelSummary(true, true);
        toast("Comentário marcado como tratado.");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro ao marcar comentário");
      }
    },
    [loadChannelSummary, toast]
  );

  const studioAiFetch = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      };
      if (resolveBrowserResponse) {
        return fetchGeminiAi(url, init, {
          geminiBrowserMode,
          aiProvider,
          resolveBrowserResponse,
        });
      }
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    [aiProvider, geminiBrowserMode, resolveBrowserResponse]
  );

  const suggestCommentReply = useCallback(
    async (comment: CommentRow) => {
      setSuggestingId(comment.commentId);
      try {
        const lumieraRef = alerts?.lumieraVideoById?.[comment.videoId];
        const { ok, data } = await studioAiFetch(
          "/api/youtube/channel/comments/suggest-reply",
          {
            commentText: comment.text,
            videoTitle: comment.videoTitle,
            niche: lumieraRef?.niche || nicheKeyword,
            authorName: comment.authorDisplayName,
          }
        );
        if (!ok) throw new Error(data.error || "Falha na sugestão IA");
        const suggestion = String(data.suggestion || data.text || "").trim();
        if (!suggestion) throw new Error("IA retornou resposta vazia.");
        setReplyDrafts((prev) => ({
          ...prev,
          [comment.commentId]: suggestion,
        }));
        toast("Sugestão de resposta gerada.");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro na sugestão IA");
      } finally {
        setSuggestingId(null);
      }
    },
    [alerts?.lumieraVideoById, nicheKeyword, studioAiFetch, toast]
  );

  const loadWeeklyReport = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/channel/weekly-report?viewsThreshold=${viewsThreshold}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao gerar relatório");
      setWeeklyReport(data as WeeklyReport);
      toast("Relatório semanal gerado.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro no relatório semanal");
    } finally {
      setWeeklyLoading(false);
    }
  }, [toast, viewsThreshold]);

  const sendWeeklyReport = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch("/api/youtube/channel/weekly-report/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewsThreshold }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.report) setWeeklyReport(data.report as WeeklyReport);
      if (data.sent) toast(`Relatório enviado para ${data.to}`);
      else
        toast(
          data.note ||
            data.error ||
            "Relatório salvo localmente (configure e-mail/SMTP para envio)."
        );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao enviar relatório");
    } finally {
      setWeeklyLoading(false);
    }
  }, [toast, viewsThreshold]);

  const bulkReplySelected = useCallback(async () => {
    const selected = (commentsReport?.comments || []).filter(
      (c) => bulkSelected[c.commentId] && !c.isAnswered
    );
    if (!selected.length || !bulkReplyText.trim()) {
      toast("Selecione comentários e digite a resposta em lote.");
      return;
    }
    const res = await fetch("/api/youtube/channel/comments/bulk-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replies: selected.map((c) => ({
          commentId: c.commentId,
          text: bulkReplyText.trim(),
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`${data.sent} resposta(s) publicada(s).`);
      setBulkReplyText("");
      setBulkSelected({});
      await loadComments(commentFilter, appliedKeyword);
    } else toast(data.error || "Falha no envio em lote.");
  }, [
    appliedKeyword,
    bulkReplyText,
    bulkSelected,
    commentFilter,
    commentsReport?.comments,
    loadComments,
    toast,
  ]);

  const translateComment = useCallback(
    async (comment: CommentRow) => {
      try {
        const { ok, data } = await studioAiFetch(
          "/api/youtube/channel/comments/translate",
          {
            text: comment.text,
            targetLang: "pt",
          }
        );
        if (!ok) throw new Error(data.error || "Falha na tradução");
        const translation = String(data.translation || data.text || "").trim();
        if (translation) {
          setTranslations((prev) => ({
            ...prev,
            [comment.commentId]: translation,
          }));
        } else {
          toast("Tradução vazia.");
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro na tradução.");
      }
    },
    [studioAiFetch, toast]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadChannelSummary(true, true),
      loadComments(commentFilter, appliedKeyword),
    ]);
    if (selectedVideoId) {
      await loadVideoDetail(selectedVideoId);
    }
  }, [
    appliedKeyword,
    commentFilter,
    loadChannelSummary,
    loadComments,
    loadVideoDetail,
    selectedVideoId,
  ]);

  useEffect(() => {
    loadChannelSummary();
  }, [loadChannelSummary]);

  useEffect(() => {
    loadComments(commentFilter, appliedKeyword);
  }, [commentFilter, appliedKeyword, loadComments]);

  useEffect(() => {
    if (!selectedVideoId) {
      setVideoDetail(null);
      return;
    }
    loadVideoDetail(selectedVideoId);
  }, [loadVideoDetail, selectedVideoId]);

  const needsReauth = Boolean(
    overview?.needsReauth ||
    videosReport?.needsReauth ||
    commentsReport?.needsReauth
  );
  const notConnected = overview && !overview.connected;
  const scopesMissing = overview?.connected && !overview.scopesReady;
  const hotVideoIds = new Set(
    (alerts?.hotVideos || []).map((item) => item.videoId)
  );
  const lumieraByVideoId = alerts?.lumieraVideoById || {};

  const filteredVideos = useMemo(() => {
    const rows = videosReport?.videos || [];
    if (videoFormatFilter === "all") return rows;
    return rows.filter(
      (video) => normalizeVideoFormat(video.videoFormat) === videoFormatFilter
    );
  }, [videoFormatFilter, videosReport?.videos]);

  const formatCounts = useMemo(() => {
    const rows = videosReport?.videos || [];
    return {
      all: rows.length,
      short: rows.filter(
        (video) => normalizeVideoFormat(video.videoFormat) === "SHORT"
      ).length,
      long: rows.filter(
        (video) => normalizeVideoFormat(video.videoFormat) === "LONG"
      ).length,
    };
  }, [videosReport?.videos]);

  const commentsBadge =
    alerts?.unansweredComments ??
    commentsReport?.comments?.filter((c) => !c.isAnswered).length ??
    0;

  const studioTabs: Array<{
    id: StudioTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "resumo",
      label: "Resumo",
      icon: <LayoutDashboard className="w-3 h-3" />,
    },
    {
      id: "videos",
      label: "Vídeos",
      icon: <Video className="w-3 h-3" />,
      badge: filteredVideos.length || undefined,
    },
    {
      id: "comentarios",
      label: "Comentários",
      icon: <MessageCircle className="w-3 h-3" />,
      badge: commentsBadge || undefined,
    },
    {
      id: "ferramentas",
      label: "Ferramentas",
      icon: <Wrench className="w-3 h-3" />,
    },
  ];

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
          {!embedded && (
            <SectionHeader
              title="Canal YouTube"
              helpId="tab-youtube-studio"
              icon={<Youtube className="w-4 h-4 text-red-400" />}
              subtitle="Métricas do canal e desempenho dos vídeos — dados via YouTube Analytics API."
            />
          )}
          <div
            className={`flex items-center gap-2 flex-wrap ${embedded ? "w-full justify-end" : ""}`}
          >
            <span className="text-[10px] text-zinc-500 tabular-nums">
              Atualizado:{" "}
              {formatDateTime(videosReport?.fetchedAt || overview?.fetchedAt)}
              {fromCache ? " · cache" : ""}
            </span>
            <label className="flex items-center gap-1.5 text-[9px] text-zinc-500">
              Alerta 48h ≥
              <input
                type="number"
                min={1}
                max={100000}
                value={viewsThreshold}
                onChange={(e) =>
                  setViewsThreshold(Number(e.target.value) || 100)
                }
                onBlur={() => {
                  const next = setYoutubeViewsThreshold(viewsThreshold);
                  setViewsThreshold(next);
                  loadChannelSummary(true, true);
                }}
                className="w-16 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] tabular-nums"
              />
              views
            </label>
            <label className="flex items-center gap-1 text-[9px] text-zinc-500">
              Poll
              <select
                value={pollMinutes}
                onChange={(e) => {
                  const next = setYoutubePollIntervalMinutes(
                    Number(e.target.value)
                  );
                  setPollMinutes(next);
                  toast(`Polling de alertas: ${next} min`);
                }}
                className="px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px]"
              >
                <option value={5}>5 min</option>
                <option value={20}>20 min</option>
                <option value={60}>60 min</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-[9px] text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsOn}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  if (enabled) {
                    const perm = await requestYoutubeNotificationPermission();
                    if (perm !== "granted") {
                      toast("Permissão de notificação negada pelo navegador.");
                      return;
                    }
                  }
                  setYoutubeNotificationsEnabled(enabled);
                  setNotificationsOn(enabled);
                }}
                className="rounded border-zinc-700"
              />
              <Bell className="w-3 h-3" />
            </label>
            <button
              type="button"
              onClick={() => refreshAll()}
              disabled={refreshing}
              className="dash-btn-ghost text-[10px] px-2 py-1"
            >
              <RefreshCw
                className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
        </div>

        {alerts && alerts.alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.alerts.map((alert) => (
              <div
                key={alert.type}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  alert.type === "views_drop"
                    ? "border-red-500/35 bg-red-500/10"
                    : alert.type === "dead_videos"
                      ? "border-violet-500/35 bg-violet-500/10"
                      : "border-[rgba(130,128,253,0.3)] bg-[rgba(130,128,253,0.06)]"
                }`}
              >
                <p
                  className={`text-[11px] ${
                    alert.type === "views_drop"
                      ? "text-red-200/95"
                      : alert.type === "dead_videos"
                        ? "text-violet-200/95"
                        : "text-[var(--dash-primary-light)]"
                  }`}
                >
                  {alert.label}
                </p>
                {alert.type === "unanswered_comments" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("comentarios");
                      setCommentFilter("unanswered");
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    Ver comentários
                  </button>
                )}
                {alert.type === "dead_videos" && alert.videos?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.videos.slice(0, 3).map((video) => (
                      <button
                        key={video.videoId}
                        type="button"
                        onClick={() => onSelectProject?.(video.projectName)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:text-violet-200"
                        title="0 views em 48h — revisar gancho/thumb"
                      >
                        {video.projectName} · 0 views/48h
                      </button>
                    ))}
                  </div>
                ) : null}
                {alert.type === "hot_videos" && alert.videos?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.videos.slice(0, 3).map((video) => (
                      <button
                        key={video.videoId}
                        type="button"
                        onClick={() => onSelectProject?.(video.projectName)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 hover:text-red-200"
                        title={`${video.views48h} views em 48h`}
                      >
                        {video.projectName} · {formatNumber(video.views48h)}{" "}
                        views/48h
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {alerts.pollIntervalMinutes ? (
              <p className="text-[9px] text-zinc-600">
                Alertas atualizados automaticamente a cada{" "}
                {alerts.pollIntervalMinutes} min
                {alerts.fetchedAt
                  ? ` · ${formatDateTime(alerts.fetchedAt)}`
                  : ""}
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
                  <p>
                    YouTube não conectado. Configure credenciais e vincule a
                    conta em Integrações.
                  </p>
                )}
                {scopesMissing && !notConnected && (
                  <p>
                    Faltam permissões
                    {overview?.scopeStatus?.missingLabels?.length
                      ? `: ${overview.scopeStatus.missingLabels.join(", ")}.`
                      : "."}{" "}
                    Revincule para autorizar analytics.
                  </p>
                )}
                {needsReauth && (
                  <p>
                    {overview?.hint ||
                      videosReport?.hint ||
                      "Revincule a conta do YouTube com todos os escopos."}
                  </p>
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
                className="dash-btn-primary text-[10px] px-3 py-1.5"
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
              <h2 className="text-lg font-bold text-white font-sans truncate">
                {overview.channel.title}
              </h2>
              <a
                href={`https://studio.youtube.com/channel/${overview.channel.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--dash-muted)] hover:text-[var(--dash-primary)] inline-flex items-center gap-1 mt-0.5"
              >
                Abrir no YouTube Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {overview?.channel && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="dash-studio-stat">
              <div className="flex items-center gap-2 text-[var(--dash-muted)] text-[10px] uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5" /> Inscritos
              </div>
              <p className="text-xl font-bold text-white tabular-nums">
                {overview.channel.hiddenSubscriberCount
                  ? "Oculto"
                  : formatNumber(overview.channel.subscriberCount)}
              </p>
            </div>
            <div className="dash-studio-stat">
              <div className="flex items-center gap-2 text-[var(--dash-muted)] text-[10px] uppercase tracking-wider mb-1">
                <Eye className="w-3.5 h-3.5" /> Views totais
              </div>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatNumber(overview.channel.viewCount)}
              </p>
            </div>
            <div className="dash-studio-stat">
              <div className="flex items-center gap-2 text-[var(--dash-muted)] text-[10px] uppercase tracking-wider mb-1">
                <Video className="w-3.5 h-3.5" /> Vídeos
              </div>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatNumber(overview.channel.videoCount)}
              </p>
            </div>
          </div>
        )}

        {periodComparison?.available && periodComparison.comparison && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(
              [
                "views",
                "estimatedMinutesWatched",
                "subscribersGained",
                "likes",
                "comments",
              ] as const
            ).map((key) => {
              const item = periodComparison.comparison?.[key];
              if (!item) return null;
              const labels: Record<string, string> = {
                views: "Views 7d",
                estimatedMinutesWatched: "Minutos 7d",
                subscribersGained: "Inscritos 7d",
                likes: "Likes 7d",
                comments: "Coment. 7d",
              };
              const positive = item.changePct >= 0;
              const criticalDrop = key === "views" && item.changePct <= -30;
              return (
                <div
                  key={key}
                  className={`dash-studio-stat-sm ${criticalDrop ? "bg-red-500/10 border-red-500/30" : ""}`}
                >
                  <p className="text-[8px] text-zinc-600 uppercase">
                    {labels[key]}
                  </p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {formatNumber(item.current)}
                  </p>
                  <p
                    className={`text-[9px] tabular-nums ${positive ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {positive ? "+" : ""}
                    {item.changePct}% vs 7d ant.
                    {criticalDrop ? " · alerta" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 🆕 5 Novidades: Health Score, Benchmark, Projeção, Horário, Anomalias */}
        {channelInsights && (
          <div className="mt-4 p-4 rounded-xl border border-sky-500/20 bg-sky-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Diagnóstico & Insights de Crescimento
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">
                Horário ideal:{" "}
                <strong className="text-white">
                  {channelInsights.melhorHorario || "18:00"}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Health Score */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                    (channelInsights.health || 50) >= 75
                      ? "bg-emerald-500"
                      : (channelInsights.health || 50) >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                >
                  {channelInsights.health || 50}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Health Score
                  </p>
                  <p className="text-xs font-bold text-white">
                    {(channelInsights.health || 50) >= 75
                      ? "Excelente"
                      : (channelInsights.health || 50) >= 50
                        ? "Estável"
                        : "Atenção"}
                  </p>
                </div>
              </div>

              {/* Benchmark vs Nicho */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">
                  Benchmark Nicho
                </p>
                <p className="text-[11px] text-zinc-300">
                  CTR:{" "}
                  <strong
                    className={
                      channelInsights.benchmark?.ctr?.status === "acima"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {channelInsights.benchmark?.ctr?.canal || 0}% (
                    {channelInsights.benchmark?.ctr?.status || "médio"})
                  </strong>
                </p>
                <p className="text-[11px] text-zinc-300">
                  Retenção:{" "}
                  <strong
                    className={
                      channelInsights.benchmark?.retencao?.status === "acima"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {channelInsights.benchmark?.retencao?.canal || 0}%
                  </strong>
                </p>
              </div>

              {/* Projeção de Crescimento */}
              {channelInsights.projecao && (
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">
                    Projeção ({channelInsights.projecao.tendencia})
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    30d:{" "}
                    <strong className="text-sky-300">
                      +{channelInsights.projecao.em_30_dias} insc.
                    </strong>
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    90d:{" "}
                    <strong className="text-sky-300">
                      +{channelInsights.projecao.em_90_dias} insc.
                    </strong>
                  </p>
                </div>
              )}

              {/* Melhor Horário */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">
                  Melhor Horário
                </p>
                <p className="text-sm font-bold text-amber-300">
                  {channelInsights.melhorHorario || "18:00"}
                </p>
                <p className="text-[9px] text-zinc-500">
                  Pico de retenção da audiência
                </p>
              </div>
            </div>

            {/* Anomalias */}
            {channelInsights.anomalias &&
              channelInsights.anomalias.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/60">
                  {channelInsights.anomalias.map((a: any, i: number) => (
                    <p
                      key={i}
                      className="text-[11px] text-red-400 font-medium flex items-center gap-1.5"
                    >
                      ⚠️ {a.msg}
                    </p>
                  ))}
                </div>
              )}
          </div>
        )}

        {reachMetrics?.available && reachMetrics.metrics && (
          <p className="mt-3 text-[9px] text-zinc-500">
            Impressões ({periodDays}d):{" "}
            {formatNumber(reachMetrics.metrics.impressions || 0)}
            {reachMetrics.metrics.impressionClickThroughRate
              ? ` · CTR ${(reachMetrics.metrics.impressionClickThroughRate * 100).toFixed(2)}%`
              : ""}
            {reachMetrics.note ? ` — ${reachMetrics.note}` : ""}
          </p>
        )}

        <div className="mt-4 dash-studio-tab-group">
          {studioTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`dash-studio-tab dash-studio-tab-flex ${activeTab === tab.id ? "dash-studio-tab-active" : ""}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="min-w-[14px] px-1 py-0.5 rounded-full bg-zinc-800 text-[8px] tabular-nums">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "resumo" && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                Vídeos publicados pelo Lumiera
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Projetos com <code className="text-zinc-600">post_id</code> ou
                experimento de título vinculado ao YouTube
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
              Nenhum projeto com vídeo publicado encontrado. Após o upload, o{" "}
              <code className="text-zinc-600">post_id</code> fica em config do
              projeto.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lumieraVideos.map((item) => (
                <div
                  key={`${item.projectName}-${item.videoId}`}
                  className="dash-studio-stat flex gap-3"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-16 h-11 rounded object-cover border border-zinc-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-11 rounded bg-zinc-900 border border-zinc-800 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white truncate">
                      {item.title || item.projectName}
                    </p>
                    <p className="text-[9px] text-cyan-400/90 mt-0.5">
                      {item.projectName} · {item.format}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[9px] text-zinc-500">
                      <span>
                        {formatNumber(item.metrics.views)} views ({periodDays}d)
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 ${item.goalMet ? "text-emerald-400/90" : "text-amber-400/90"}`}
                      >
                        <TrendingUp className="w-3 h-3" />{" "}
                        {formatNumber(item.views48h)} / 48h
                        {item.goalViews48h
                          ? ` (meta ${item.goalViews48h})`
                          : ""}
                      </span>
                      {item.titleExperiment?.status === "running" && (
                        <span className="text-violet-400/90">
                          A/B título ativo
                        </span>
                      )}
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
                        onClick={() => {
                          setSelectedVideoId(item.videoId);
                          setActiveTab("videos");
                        }}
                        className="text-[9px] font-bold px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        Ver detalhe
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPostChecklistProject({
                            projectName: item.projectName,
                            videoId: item.videoId,
                          })
                        }
                        className={`text-[9px] font-bold px-2 py-1 rounded border ${
                          postChecklistProject?.projectName === item.projectName
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Pós-upload
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {postChecklistProject && (
            <div className="mt-3">
              <PostPublishChecklist
                projectName={postChecklistProject.projectName}
                videoId={postChecklistProject.videoId}
                toast={toast}
                compact
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "videos" && (
        <div className="space-y-4">
          <YoutubeStudioTitleAb
            toast={toast}
            onSelectProject={onSelectProject}
            onRefreshSummary={() => loadChannelSummary(true, true)}
          />
          <div className="glass-panel p-4 sm:p-5 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Desempenho por vídeo
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {videosReport?.startDate && videosReport?.endDate
                    ? `${formatShortDate(videosReport.startDate)} — ${formatShortDate(videosReport.endDate)}`
                    : `Últimos ${periodDays} dias`}
                  {videosReport?.videos?.length
                    ? ` · ${filteredVideos.length} de ${videosReport.videos.length} vídeos`
                    : ""}
                  {refreshing ? " · atualizando…" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "SHORT", "LONG"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setVideoFormatFilter(fmt)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold border ${
                      videoFormatFilter === fmt
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        : "bg-zinc-950 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    {fmt === "all"
                      ? `Todos (${formatCounts.all})`
                      : `${fmt} (${fmt === "SHORT" ? formatCounts.short : formatCounts.long})`}
                  </button>
                ))}
                {[7, 28, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => changePeriodDays(days)}
                    disabled={refreshing && periodDays === days}
                    className={`dash-option-btn px-2.5 py-1 text-[10px] ${periodDays === days ? "dash-option-btn-active" : ""} ${refreshing ? "opacity-80" : ""}`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {videosReport?.reachNote && (
              <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed">
                {videosReport.reachNote}
              </p>
            )}
            {videosReport?.details && !videosReport?.videos?.length && (
              <p className="text-[10px] text-amber-400/90 mb-3">
                {videosReport.details}
              </p>
            )}
            <p className="text-[9px] text-zinc-600 mb-3">
              Clique em uma linha para ver retenção e views 48h.
            </p>

            {!videosReport?.videos?.length ? (
              <p className="text-[11px] text-zinc-500 py-6 text-center">
                {notConnected || scopesMissing || needsReauth
                  ? "Conecte o YouTube para ver a tabela de vídeos."
                  : "Nenhum vídeo encontrado no período."}
              </p>
            ) : !filteredVideos.length ? (
              <p className="text-[11px] text-zinc-500 py-6 text-center">
                {videoFormatFilter === "SHORT"
                  ? "Nenhum Short nos últimos uploads deste período."
                  : videoFormatFilter === "LONG"
                    ? "Nenhum vídeo longo nos últimos uploads deste período."
                    : "Nenhum vídeo corresponde ao filtro."}
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[640px] text-left text-[11px]">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800/80">
                      <th className="py-2 pr-3 font-medium w-12" />
                      <th className="py-2 pr-3 font-medium">Título</th>
                      <th className="py-2 pr-3 font-medium text-right tabular-nums">
                        Views
                      </th>
                      <th className="py-2 pr-3 font-medium text-right tabular-nums">
                        Likes
                      </th>
                      <th className="py-2 pr-3 font-medium text-right tabular-nums">
                        Coment.
                      </th>
                      <th className="py-2 font-medium text-right tabular-nums">
                        Min.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVideos.map((video) => {
                      const lumieraRef = lumieraByVideoId[video.videoId];
                      const isHot = hotVideoIds.has(video.videoId);
                      return (
                        <tr
                          key={video.videoId}
                          onClick={() =>
                            setSelectedVideoId((prev) =>
                              prev === video.videoId ? null : video.videoId
                            )
                          }
                          className={`border-b border-[var(--dash-border)] hover:bg-[var(--dash-card-hover)] cursor-pointer ${
                            isHot ? "dash-studio-row-hot" : ""
                          } ${selectedVideoId === video.videoId ? "dash-studio-row-selected" : ""}`}
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
                              className="text-zinc-200 hover:text-[var(--dash-primary)] line-clamp-2 leading-snug"
                              title={video.title}
                            >
                              {video.title}
                            </a>
                            <span className="text-[9px] text-zinc-600 block mt-0.5">
                              {formatShortDate(video.publishedAt)}
                              {` · ${normalizeVideoFormat(video.videoFormat)}`}
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
                            {formatNumber(
                              video.metrics.estimatedMinutesWatched
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedVideoId && (
              <div className="dash-studio-detail-panel">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-[11px] font-bold text-[var(--dash-primary-light)]">
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
                    <div className="dash-studio-stat p-3 rounded-lg">
                      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider mb-1">
                        Views 48h
                      </p>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {formatNumber(videoDetail.velocity?.views48h || 0)}
                      </p>
                    </div>
                    <div className="dash-studio-stat p-3 rounded-lg">
                      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider mb-1">
                        Views ({periodDays}d)
                      </p>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {formatNumber(
                          videoDetail.analytics?.metrics?.views || 0
                        )}
                      </p>
                    </div>
                    <div className="dash-studio-stat p-3 rounded-lg">
                      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider mb-1">
                        Inscritos ganhos
                      </p>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {formatNumber(
                          videoDetail.analytics?.metrics?.subscribersGained || 0
                        )}
                      </p>
                    </div>
                    <div className="lg:col-span-3">
                      <RetentionSparkline
                        points={videoDetail.retention?.points || []}
                      />
                    </div>
                    {videoDetail.velocityTimeline?.points?.length ? (
                      <div className="lg:col-span-3 dash-studio-stat p-3 rounded-lg">
                        <p className="text-[9px] text-[var(--dash-muted)] mb-2">
                          Views por dia (últimos 7d)
                        </p>
                        <div className="flex items-end gap-1 h-16">
                          {(() => {
                            const pts = videoDetail.velocityTimeline!.points!;
                            const maxV = Math.max(
                              ...pts.map((x) => x.views),
                              1
                            );
                            return pts.map((p) => {
                              const h = Math.max(
                                4,
                                Math.round((p.views / maxV) * 56)
                              );
                              return (
                                <div
                                  key={p.date}
                                  className="flex-1 flex flex-col justify-end h-full min-w-[4px]"
                                  title={`${p.date}: ${p.views} views`}
                                >
                                  <div
                                    className="dash-studio-chart-bar-info"
                                    style={{ height: `${h}px` }}
                                  />
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : null}
                    {videoDetail.ctrRevenue?.available &&
                      videoDetail.ctrRevenue.metrics && (
                        <p className="lg:col-span-3 text-[9px] text-zinc-500">
                          Impressões:{" "}
                          {formatNumber(
                            videoDetail.ctrRevenue.metrics.impressions || 0
                          )}
                          {videoDetail.ctrRevenue.metrics
                            .impressionClickThroughRate
                            ? ` · CTR ${(videoDetail.ctrRevenue.metrics.impressionClickThroughRate * 100).toFixed(2)}%`
                            : ""}
                          {videoDetail.ctrRevenue.metrics.estimatedRevenue
                            ? ` · Receita ~${videoDetail.ctrRevenue.metrics.estimatedRevenue.toFixed(2)}`
                            : ""}
                        </p>
                      )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "comentarios" && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-zinc-400" />
                Comentários recentes
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {commentsReport?.fetchedAt
                  ? `Atualizado ${formatDateTime(commentsReport.fetchedAt)}`
                  : "Últimos comentários do canal"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "unanswered"] as CommentFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setCommentFilter(filter);
                    setCommentsNextPageToken(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                    commentFilter === filter
                      ? "dash-studio-tab-active"
                      : "dash-option-btn text-[10px]"
                  }`}
                >
                  {filter === "all" ? "Todos" : "Sem resposta"}
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
                  if (e.key === "Enter") setAppliedKeyword(keywordInput.trim());
                }}
                placeholder={
                  nicheKeyword
                    ? `Filtrar por palavra-chave (ex.: ${nicheKeyword})`
                    : "Filtrar por palavra-chave do nicho..."
                }
                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(130,128,253,0.5)]"
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
                  setAppliedKeyword("");
                  setKeywordInput("");
                }}
                className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0"
              >
                Limpar
              </button>
            )}
          </div>

          {commentsReport?.replyNote && (
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed">
              {commentsReport.replyNote}
            </p>
          )}

          {commentFilter === "unanswered" &&
            (commentsReport?.comments?.length ?? 0) > 0 && (
              <div className="mb-3 flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-900">
                <input
                  value={bulkReplyText}
                  onChange={(e) => setBulkReplyText(e.target.value)}
                  placeholder="Resposta em lote para selecionados..."
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-white"
                />
                <button
                  type="button"
                  onClick={bulkReplySelected}
                  className="px-3 py-2 rounded-lg dash-btn-primary text-[10px] font-bold"
                >
                  Enviar em lote
                </button>
              </div>
            )}

          {commentsLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando comentários...
            </div>
          ) : !commentsReport?.comments?.length ? (
            <p className="text-[11px] text-zinc-500 py-6 text-center">
              {notConnected || scopesMissing || needsReauth
                ? "Conecte o YouTube para ver comentários."
                : commentFilter === "unanswered"
                  ? "Nenhum comentário sem resposta no lote carregado."
                  : appliedKeyword
                    ? `Nenhum comentário com "${appliedKeyword}".`
                    : "Nenhum comentário recente encontrado."}
            </p>
          ) : (
            <div className="space-y-3 max-h-[min(70vh,640px)] overflow-y-auto pr-1">
              {commentsReport.comments.map((comment) => (
                <div
                  key={comment.threadId}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800/80 transition"
                >
                  <div className="flex items-start gap-3">
                    {!comment.isAnswered && (
                      <input
                        type="checkbox"
                        checked={Boolean(bulkSelected[comment.commentId])}
                        onChange={(e) =>
                          setBulkSelected((prev) => ({
                            ...prev,
                            [comment.commentId]: e.target.checked,
                          }))
                        }
                        className="mt-2 rounded border-zinc-700"
                      />
                    )}
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
                        <span className="text-[11px] font-bold text-zinc-200">
                          {comment.authorDisplayName}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {formatDateTime(comment.publishedAt)}
                        </span>
                        {comment.isAnswered ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Respondido
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Sem resposta
                          </span>
                        )}
                        {comment.replyCount > 0 && (
                          <span className="text-[9px] text-zinc-600">
                            {comment.replyCount} resposta
                            {comment.replyCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {comment.sentiment &&
                          comment.sentiment !== "neutral" && (
                            <span
                              className={`text-[8px] px-1 py-0.5 rounded ${
                                comment.sentiment === "critical"
                                  ? "bg-red-500/10 text-red-300"
                                  : comment.sentiment === "question"
                                    ? "bg-blue-500/10 text-blue-300"
                                    : "bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {comment.sentiment === "critical"
                                ? "Crítica"
                                : comment.sentiment === "question"
                                  ? "Pergunta"
                                  : "Positivo"}
                            </span>
                          )}
                        {typeof comment.priorityScore === "number" &&
                          comment.priorityScore > 0 && (
                            <span className="text-[8px] text-zinc-600">
                              prio {comment.priorityScore}
                            </span>
                          )}
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                      {translations[comment.commentId] && (
                        <p className="text-[10px] text-zinc-500 mt-1 italic">
                          {translations[comment.commentId]}
                        </p>
                      )}
                      {comment.autoReplySuggestion?.suggestedText &&
                        !comment.isAnswered && (
                          <button
                            type="button"
                            onClick={() =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [comment.commentId]:
                                  comment.autoReplySuggestion!.suggestedText ||
                                  "",
                              }))
                            }
                            className="text-[9px] mt-1 text-[var(--dash-primary)] hover:text-[var(--dash-primary-light)]"
                          >
                            Regra «{comment.autoReplySuggestion.label}»: aplicar
                            template
                          </button>
                        )}
                      {comment.videoTitle && (
                        <p
                          className="text-[9px] text-zinc-600 mt-1.5 truncate"
                          title={comment.videoTitle}
                        >
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
                            className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-[var(--dash-primary)]"
                          >
                            Ver no YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {comment.likeCount > 0 && (
                          <span className="text-[9px] text-zinc-600 inline-flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {comment.likeCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => translateComment(comment)}
                          className="text-[9px] text-zinc-500 hover:text-zinc-300"
                        >
                          Traduzir
                        </button>
                        <button
                          type="button"
                          onClick={() => markCommentHandled(comment.threadId)}
                          className="text-[9px] font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-emerald-400 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Tratado
                        </button>
                      </div>
                      {!comment.isAnswered && (
                        <>
                          {replyTemplates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {replyTemplates.map((tpl) => (
                                <button
                                  key={`${comment.commentId}-${tpl.id}`}
                                  type="button"
                                  onClick={() =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [comment.commentId]: tpl.text,
                                    }))
                                  }
                                  className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-[var(--dash-primary-light)]"
                                >
                                  {tpl.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={replyDrafts[comment.commentId] || ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment.commentId]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  submitCommentReply(comment);
                                }
                              }}
                              placeholder="Responder pelo Lumiera..."
                              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(130,128,253,0.5)]"
                            />
                            <button
                              type="button"
                              onClick={() => suggestCommentReply(comment)}
                              disabled={suggestingId === comment.commentId}
                              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-bold disabled:opacity-50"
                            >
                              {suggestingId === comment.commentId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              IA
                            </button>
                            <button
                              type="button"
                              onClick={() => submitCommentReply(comment)}
                              disabled={replyingId === comment.commentId}
                              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg dash-btn-primary text-[10px] font-bold disabled:opacity-50"
                            >
                              {replyingId === comment.commentId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Enviar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {commentsNextPageToken && (
                <button
                  type="button"
                  onClick={() =>
                    loadComments(commentFilter, appliedKeyword, {
                      append: true,
                      pageToken: commentsNextPageToken,
                    })
                  }
                  disabled={loadingMoreComments}
                  className="w-full py-2.5 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-700"
                >
                  {loadingMoreComments
                    ? "Carregando..."
                    : "Carregar mais comentários"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "ferramentas" && (
        <div className="space-y-4">
          <YoutubeStudioSettings
            toast={toast}
            periodDays={periodDays}
            onSaved={() => loadChannelSummary(true, true)}
          />
          <YoutubeStudioPro
            viewsThreshold={viewsThreshold}
            selectedVideoId={selectedVideoId}
            periodDays={periodDays}
            toast={toast}
            onApplyIdea={onApplyCreatorIdea}
            onSchedulePublish={onSchedulePublish}
            onRefreshComments={() =>
              loadComments(commentFilter, appliedKeyword)
            }
          />

          <YoutubeStudioTools
            viewsThreshold={viewsThreshold}
            nicheKeyword={appliedKeyword || nicheKeyword}
            toast={toast}
            onApplyIdea={onApplyCreatorIdea}
          />

          <div className="glass-panel p-4 sm:p-5 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  Relatórios
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Gerado automaticamente a cada 7 dias. Configure e-mail e SMTP
                  em youtube_studio_settings.json para envio.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadWeeklyReport}
                  disabled={weeklyLoading}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300"
                >
                  Gerar agora
                </button>
                <button
                  type="button"
                  onClick={sendWeeklyReport}
                  disabled={weeklyLoading}
                  className="text-[10px] px-3 py-1.5 rounded-lg dash-studio-tab-active"
                >
                  Enviar semanal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setWeeklyLoading(true);
                    try {
                      const res = await fetch(
                        `/api/youtube/channel/daily-report?viewsThreshold=${viewsThreshold}`
                      );
                      const data = await res.json();
                      if (res.ok) {
                        setWeeklyReport(data);
                        toast("Resumo diário gerado.");
                      }
                    } finally {
                      setWeeklyLoading(false);
                    }
                  }}
                  disabled={weeklyLoading}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300"
                >
                  Diário
                </button>
              </div>
            </div>
            {weeklyReport?.text && (
              <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap bg-zinc-950 border border-zinc-900 rounded-xl p-3 max-h-48 overflow-y-auto">
                {weeklyReport.text}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
