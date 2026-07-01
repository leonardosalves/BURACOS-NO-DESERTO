import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Award, CheckCircle2, Clock, Download, Flame, History, Inbox, Layers,
  Loader2, MessageSquare, Radio, Search, Send, Sparkles, StickyNote, TrendingDown,
} from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Milestone = {
  current: number;
  required: number;
  progressPct: number;
  met: boolean;
};

type YppMilestones = {
  available?: boolean;
  subscribers?: Milestone;
  watchHours12m?: Milestone;
  shortsViews90d?: Milestone;
  eligibleStandard?: boolean;
  eligibleShorts?: boolean;
  recommendedPath?: string;
  note?: string;
};

type InboxStats = {
  slaHours: number;
  pending: number;
  overdue: number;
  queuePending: number;
  handled: number;
  repliesLogged: number;
  inboxZero: boolean;
  overdueComments?: Array<{
    threadId: string;
    authorDisplayName: string;
    videoTitle: string;
    hours: number;
    overdue: boolean;
  }>;
};

type QueueItem = {
  id: string;
  threadId: string;
  commentId: string;
  authorDisplayName: string;
  videoTitle: string;
  commentText: string;
  suggestedText: string;
  ruleLabel?: string;
  status: string;
  createdAt: string;
};

type ProDashboard = {
  inbox: InboxStats;
  approvalQueue: QueueItem[];
  replyHistory: Array<{ id: string; text: string; sentAt: string; source: string; videoTitle?: string }>;
  seoOpportunities: Array<{ keyword: string; mentions: number; titleIdea: string; type?: string }>;
  heatmap?: {
    available?: boolean;
    error?: string;
    byWeekday?: Array<{ label: string; intensity: number; avgViews: number }>;
    bestWeekday?: { label: string; views: number };
    byHour?: Array<{ hour: number; label: string; intensity: number; views: number; videoCount?: number }>;
    bestHour?: { hour: number; label: string; views: number };
    bestTimeWindow?: string;
    recommendedPublishTime?: string;
    timeZone?: string;
    daily?: Array<{ day: string; views: number }>;
    note?: string;
  };
  preUpload?: {
    items: Array<{ id: string; label: string; done: boolean; required?: boolean }>;
    ready: boolean;
    progressPct: number;
  };
  channelNotes?: Array<{ id: string; text: string; createdAt: string }>;
  ypp?: YppMilestones;
  slaHours?: number;
  autoQueueEnabled?: boolean;
};

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function HeatmapHourStrip({
  byHour,
  bestHour,
}: {
  byHour: Array<{ hour: number; label: string; intensity: number; views: number }>;
  bestHour?: { hour: number; label: string };
}) {
  return (
    <div className="mt-2">
      <p className="text-[8px] text-zinc-600 mb-1">Horário de publicação (views acumuladas)</p>
      <div className="flex gap-px h-10 items-end">
        {byHour.map((slot) => {
          const isBest = bestHour?.hour === slot.hour;
          const barHeight = Math.max(3, Math.round((slot.intensity / 100) * 32));
          return (
            <div
              key={slot.hour}
              className="flex-1 flex flex-col items-center justify-end h-full"
              title={`${slot.label}: ${slot.views.toLocaleString('pt-BR')} views`}
            >
              <div
                className={`w-full rounded-t min-h-[3px] ${isBest ? 'bg-amber-400' : 'bg-amber-500/50'}`}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[7px] text-zinc-600 mt-0.5 px-0.5">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  );
}

function HeatmapDailyStrip({ daily }: { daily: Array<{ day: string; views: number }> }) {
  const maxDaily = Math.max(...daily.map((x) => x.views), 1);
  return (
    <div className="mt-2">
      <p className="text-[8px] text-zinc-600 mb-1">Últimos {daily.length} dias</p>
      <div className="flex gap-0.5 h-8 items-end">
        {daily.map((day) => {
          const h = Math.max(3, Math.round((day.views / maxDaily) * 28));
          return (
            <div
              key={day.day}
              className="flex-1 flex flex-col justify-end h-full"
              title={`${day.day}: ${day.views.toLocaleString('pt-BR')} views`}
            >
              <div className="w-full rounded-t bg-orange-500/40 min-h-[3px]" style={{ height: `${h}px` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ProTab = 'resumo' | 'inbox' | 'publicar';

function ProSectionCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-3 rounded-xl bg-zinc-950 border border-zinc-800 ${className}`}>
      <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1 mb-2">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function MilestoneBar({ label, data }: { label: string; data?: Milestone }) {
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-between text-[9px] text-zinc-500 mb-0.5">
        <span>{label}</span>
        <span className={data.met ? 'text-emerald-400' : 'text-zinc-400'}>
          {formatCompact(data.current)} / {formatCompact(data.required)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
        <div
          className={`h-full rounded-full ${data.met ? 'bg-emerald-500' : 'bg-gold-500'}`}
          style={{ width: `${Math.min(100, data.progressPct)}%` }}
        />
      </div>
    </div>
  );
}

type RetentionCliff = {
  available?: boolean;
  note?: string;
  primaryCliff?: { atPercent: number; dropPct: number; severity: string };
  cliffs?: Array<{ atPercent: number; dropPct: number; severity: string }>;
};

type Props = {
  viewsThreshold: number;
  selectedVideoId?: string | null;
  periodDays?: number;
  toast: (msg: string) => void;
  onApplyIdea?: (title: string, hookPt?: string) => void;
  onRefreshComments?: () => void;
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function YoutubeStudioPro({
  viewsThreshold,
  selectedVideoId,
  periodDays = 28,
  toast,
  onApplyIdea,
  onRefreshComments,
}: Props) {
  const [dashboard, setDashboard] = useState<ProDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [cliff, setCliff] = useState<RetentionCliff | null>(null);
  const [cliffLoading, setCliffLoading] = useState(false);
  const [slaHours, setSlaHours] = useState(24);
  const [noteInput, setNoteInput] = useState('');
  const [channels, setChannels] = useState<Array<{ id: string; title: string; selected?: boolean }>>([]);
  const [queueEdits, setQueueEdits] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<ProTab>('resumo');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        viewsThreshold: String(viewsThreshold),
        limit: '40',
        _: String(Date.now()),
      });
      const res = await fetch(`/api/youtube/channel/pro/dashboard?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok && res.status !== 403) throw new Error(data.error || 'Falha ao carregar Pro');
      setDashboard(data);
      if (data.slaHours) setSlaHours(data.slaHours);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro Pro');
    } finally {
      setLoading(false);
    }
  }, [toast, viewsThreshold]);

  const loadCliff = useCallback(async (videoId: string) => {
    setCliffLoading(true);
    try {
      const res = await fetch(`/api/youtube/channel/video/${encodeURIComponent(videoId)}/retention-cliff?days=${periodDays}`);
      const data = await res.json();
      if (res.ok) setCliff(data);
      else setCliff(null);
    } catch {
      setCliff(null);
    } finally {
      setCliffLoading(false);
    }
  }, [periodDays]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (selectedVideoId) loadCliff(selectedVideoId);
    else setCliff(null);
  }, [selectedVideoId, loadCliff]);

  const saveSla = async () => {
    const res = await fetch('/api/youtube/channel/pro/sla', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slaHours }),
    });
    if (res.ok) { toast('SLA atualizado.'); loadDashboard(); }
  };

  const switchChannel = async (channelId: string) => {
    const res = await fetch('/api/youtube/channel/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedChannelId: channelId }),
    });
    if (res.ok) {
      toast('Canal ativo atualizado.');
      loadDashboard();
      onRefreshComments?.();
    }
  };

  const queueAction = async (itemId: string, action: 'approve' | 'reject' | 'send', text?: string) => {
    setSendingId(itemId);
    try {
      const path = action === 'send'
        ? `/api/youtube/channel/pro/approval-queue/${itemId}/send`
        : `/api/youtube/channel/pro/approval-queue/${itemId}/${action}`;
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'send' ? JSON.stringify({ text }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha');
      toast(action === 'send' ? 'Resposta enviada da fila.' : action === 'approve' ? 'Aprovado.' : 'Rejeitado.');
      loadDashboard();
      onRefreshComments?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro na fila');
    } finally {
      setSendingId(null);
    }
  };

  const togglePreUpload = async (itemId: string, done: boolean) => {
    const res = await fetch('/api/youtube/channel/pro/pre-upload-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, done }),
    });
    if (res.ok) {
      const data = await res.json();
      setDashboard((prev) => prev ? { ...prev, preUpload: data } : prev);
    }
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    const res = await fetch('/api/youtube/channel/pro/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteInput }),
    });
    if (res.ok) { setNoteInput(''); loadDashboard(); toast('Nota salva.'); }
  };

  useEffect(() => {
    fetch('/api/youtube/channel/list').then((r) => r.json()).then((d) => setChannels(d.channels || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) setPwaInstalled(true);

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const installPwa = async () => {
    if (!installPrompt) {
      toast('No Chrome/Edge: menu ⋮ → Instalar Lumiera. Build de produção necessária.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setPwaInstalled(true);
      setInstallPrompt(null);
      toast('Lumiera instalado como app.');
    }
  };

  const inbox = dashboard?.inbox;
  const inboxBadge = (inbox?.pending ?? 0) + (inbox?.queuePending ?? 0);
  const uploadBadge = dashboard?.preUpload
    ? dashboard.preUpload.items.filter((i) => !i.done).length
    : 0;

  const tabs: Array<{ id: ProTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'resumo', label: 'Resumo', icon: <Layers className="w-3 h-3" /> },
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-3 h-3" />, badge: inboxBadge || undefined },
    { id: 'publicar', label: 'Publicar', icon: <Sparkles className="w-3 h-3" />, badge: uploadBadge || undefined },
  ];

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          Studio Pro
        </h3>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="text-[9px] px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {loading && !dashboard ? (
        <div className="py-5 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando Pro…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2.5 rounded-xl border ${inbox?.inboxZero ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-zinc-950 border-zinc-800'}`}>
              <p className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><Inbox className="w-3 h-3" /> Pendentes</p>
              <p className="text-base font-bold text-white tabular-nums">{inbox?.pending ?? '—'}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${(inbox?.overdue ?? 0) > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-zinc-950 border-zinc-800'}`}>
              <p className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> SLA+</p>
              <p className="text-base font-bold text-red-300 tabular-nums">{inbox?.overdue ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[8px] text-zinc-500 uppercase">Fila</p>
              <p className="text-base font-bold text-cyan-300 tabular-nums">{inbox?.queuePending ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><History className="w-3 h-3" /> Histórico</p>
              <p className="text-base font-bold text-zinc-200 tabular-nums">{inbox?.repliesLogged ?? 0}</p>
            </div>
          </div>

          {inbox?.inboxZero && (
            <p className="text-[9px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Inbox zero
            </p>
          )}

          {(inbox?.overdue ?? 0) > 0 && (
            <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-[9px] text-red-300 font-bold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3" /> {inbox?.overdue} fora do SLA
              </p>
              <ul className="space-y-0.5 max-h-16 overflow-y-auto">
                {inbox?.overdueComments?.map((c) => (
                  <li key={c.threadId} className="text-[8px] text-zinc-500 truncate">
                    {c.authorDisplayName} · {c.hours}h · {c.videoTitle}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-violet-500/15 text-violet-200 border border-violet-500/25'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="min-w-[14px] px-1 py-0.5 rounded-full bg-zinc-800 text-[8px] tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'resumo' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {dashboard?.ypp?.available && (
                  <ProSectionCard
                    title="Monetização YPP"
                    icon={
                      <>
                        <Award className="w-3.5 h-3.5 text-gold-400" />
                        {(dashboard.ypp.eligibleStandard || dashboard.ypp.eligibleShorts) && (
                          <span className="text-[8px] text-emerald-400 font-bold ml-1">ELEGÍVEL</span>
                        )}
                      </>
                    }
                  >
                    <div className="space-y-2">
                      <MilestoneBar label="Inscritos" data={dashboard.ypp.subscribers} />
                      <MilestoneBar label="Horas (12 meses)" data={dashboard.ypp.watchHours12m} />
                      <MilestoneBar label="Views Shorts (90d)" data={dashboard.ypp.shortsViews90d} />
                      {dashboard.ypp.note && <p className="text-[8px] text-zinc-600">{dashboard.ypp.note}</p>}
                    </div>
                  </ProSectionCard>
                )}

                {dashboard?.heatmap && (
                  <ProSectionCard
                    title="Heatmap — quando publicar"
                    icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
                  >
                    {dashboard.heatmap.available && (dashboard.heatmap.byWeekday?.length ?? 0) > 0 ? (
                      <>
                        <div className="flex gap-1 h-14 items-end">
                          {dashboard.heatmap.byWeekday!.map((d) => {
                            const isBest = dashboard.heatmap!.bestWeekday?.label === d.label;
                            const barHeight = Math.max(6, Math.round((d.intensity / 100) * 48));
                            return (
                              <div
                                key={d.label}
                                className="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
                                title={`${d.label}: ~${d.avgViews} views/dia`}
                              >
                                <div
                                  className={`w-full rounded-t min-h-[6px] ${isBest ? 'bg-orange-400' : 'bg-orange-500/70'}`}
                                  style={{ height: `${barHeight}px` }}
                                />
                                <span className={`text-[8px] ${isBest ? 'text-orange-400 font-semibold' : 'text-zinc-600'}`}>
                                  {d.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {(dashboard.heatmap.recommendedPublishTime || dashboard.heatmap.bestWeekday) && (
                          <p className="text-[8px] text-orange-400/90 mt-1">
                            Melhor para publicar:{' '}
                            <span className="font-semibold">
                              {dashboard.heatmap.recommendedPublishTime || dashboard.heatmap.bestWeekday!.label}
                            </span>
                          </p>
                        )}
                        {(dashboard.heatmap.byHour?.length ?? 0) > 0 && (
                          <HeatmapHourStrip
                            byHour={dashboard.heatmap.byHour!}
                            bestHour={dashboard.heatmap.bestHour}
                          />
                        )}
                        {dashboard.heatmap.bestTimeWindow && (
                          <p className="text-[8px] text-amber-400/80 mt-1">
                            Pico de horário: <span className="font-semibold">{dashboard.heatmap.bestTimeWindow}</span>
                            {dashboard.heatmap.timeZone === 'America/Sao_Paulo' ? ' (Brasília)' : ''}
                          </p>
                        )}
                        {(dashboard.heatmap.daily?.length ?? 0) > 0 && (
                          <HeatmapDailyStrip daily={dashboard.heatmap.daily!} />
                        )}
                        {dashboard.heatmap.note && (
                          <p className="text-[7px] text-zinc-600 mt-1">{dashboard.heatmap.note}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-[9px] text-zinc-500">
                        {dashboard.heatmap.error || 'Dados indisponíveis.'}
                      </p>
                    )}
                  </ProSectionCard>
                )}
              </div>

              {(dashboard?.seoOpportunities?.length ?? 0) > 0 && (
                <ProSectionCard
                  title="SEO nos comentários"
                  icon={<Search className="w-3.5 h-3.5 text-violet-400" />}
                >
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {dashboard?.seoOpportunities?.slice(0, 6).map((op) => (
                      <li key={op.keyword} className="flex items-center justify-between gap-2 text-[9px]">
                        <span className="text-zinc-400 truncate">
                          <span className="text-zinc-200">{op.keyword}</span> · {op.mentions}×
                        </span>
                        {onApplyIdea && (
                          <button type="button" onClick={() => onApplyIdea(op.titleIdea)} className="text-gold-400 shrink-0 text-[8px]">Creator →</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </ProSectionCard>
              )}

              {selectedVideoId && (
                <ProSectionCard
                  title="Penhasco de retenção"
                  icon={
                    <>
                      <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                      {cliffLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
                    </>
                  }
                >
                  {cliff?.primaryCliff ? (
                    <p className={`text-[9px] ${cliff.primaryCliff.severity === 'high' ? 'text-red-300' : 'text-amber-300'}`}>
                      Queda de {cliff.primaryCliff.dropPct}% em ~{cliff.primaryCliff.atPercent}% do vídeo
                    </p>
                  ) : (
                    <p className="text-[9px] text-zinc-500">{cliff?.note || 'Sem dados de retenção para este vídeo.'}</p>
                  )}
                </ProSectionCard>
              )}
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <label className="text-[8px] text-zinc-500">SLA</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value) || 24)}
                  className="w-14 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] text-white"
                />
                <button type="button" onClick={saveSla} className="text-[8px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">Salvar</button>
                <span className="hidden sm:block w-px h-4 bg-zinc-800" />
                {!pwaInstalled ? (
                  <button
                    type="button"
                    onClick={installPwa}
                    className="text-[8px] px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 inline-flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> PWA
                  </button>
                ) : (
                  <span className="text-[8px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PWA OK
                  </span>
                )}
                {channels.length > 1 && (
                  <>
                    <span className="hidden sm:block w-px h-4 bg-zinc-800" />
                    <Radio className="w-3 h-3 text-zinc-500" />
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => switchChannel(ch.id)}
                        className={`text-[8px] px-2 py-1 rounded-lg border ${
                          ch.selected
                            ? 'bg-gold-500/15 text-gold-300 border-gold-500/30'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        {ch.title}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {(dashboard?.approvalQueue?.length ?? 0) > 0 ? (
                <ProSectionCard
                  title={`Fila de aprovação (${dashboard?.approvalQueue?.length})`}
                  icon={<MessageSquare className="w-3.5 h-3.5 text-cyan-400" />}
                >
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {dashboard?.approvalQueue?.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-[8px] text-zinc-500">
                          <span className="text-zinc-300 font-bold">{item.authorDisplayName}</span>
                          {item.ruleLabel && <span className="text-cyan-500">{item.ruleLabel}</span>}
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 line-clamp-1">{item.commentText}</p>
                        <textarea
                          value={queueEdits[item.id] ?? item.suggestedText}
                          onChange={(e) => setQueueEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-white resize-none"
                        />
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => queueAction(item.id, 'approve')} className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">Aprovar</button>
                          <button
                            type="button"
                            disabled={sendingId === item.id}
                            onClick={() => queueAction(item.id, 'send', queueEdits[item.id] ?? item.suggestedText)}
                            className="text-[8px] px-2 py-0.5 rounded bg-gold-500/15 border border-gold-500/30 text-gold-300 inline-flex items-center gap-1"
                          >
                            {sendingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Enviar
                          </button>
                          <button type="button" onClick={() => queueAction(item.id, 'reject')} className="text-[8px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-500">Rejeitar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ProSectionCard>
              ) : (
                <p className="text-[9px] text-zinc-500 text-center py-4">Nenhum item na fila de aprovação.</p>
              )}

              {(dashboard?.replyHistory?.length ?? 0) > 0 && (
                <ProSectionCard title="Últimas respostas" icon={<History className="w-3.5 h-3.5 text-zinc-500" />}>
                  <ul className="space-y-1 max-h-28 overflow-y-auto">
                    {dashboard?.replyHistory?.map((h) => (
                      <li key={h.id} className="text-[8px] text-zinc-500">
                        <span className="text-zinc-600">{formatDateTime(h.sentAt)}</span>
                        {' · '}
                        <span className="text-zinc-400">{h.source}</span>
                        {' — '}
                        <span className="text-zinc-300">{h.text.slice(0, 60)}{h.text.length > 60 ? '…' : ''}</span>
                      </li>
                    ))}
                  </ul>
                </ProSectionCard>
              )}
            </div>
          )}

          {activeTab === 'publicar' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {dashboard?.preUpload && (
                <ProSectionCard title={`Checklist pré-upload (${dashboard.preUpload.progressPct}%)`}>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                    {dashboard.preUpload.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-1.5 text-[9px]">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={(e) => togglePreUpload(item.id, e.target.checked)}
                          className="mt-0.5 rounded border-zinc-700"
                        />
                        <span className={item.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                          {item.label}
                          {item.required && <span className="text-red-400/80 ml-0.5">*</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {dashboard.preUpload.ready && (
                    <p className="text-[8px] text-emerald-400 mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Pronto para upload
                    </p>
                  )}
                </ProSectionCard>
              )}

              <ProSectionCard title="Notas do canal" icon={<StickyNote className="w-3.5 h-3.5" />}>
                <div className="flex gap-2 mb-2">
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Estratégia, metas…"
                    className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-white"
                  />
                  <button type="button" onClick={addNote} className="text-[8px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">Salvar</button>
                </div>
                {(dashboard?.channelNotes?.length ?? 0) > 0 ? (
                  <ul className="space-y-1 max-h-36 overflow-y-auto">
                    {dashboard?.channelNotes?.map((n) => (
                      <li key={n.id} className="text-[8px] text-zinc-500 flex gap-2">
                        <span className="text-zinc-600 shrink-0">{formatDateTime(n.createdAt)}</span>
                        <span className="text-zinc-400">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[8px] text-zinc-600">Nenhuma nota ainda.</p>
                )}
              </ProSectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}