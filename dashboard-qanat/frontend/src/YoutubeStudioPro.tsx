import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Flame, History, Inbox, Layers,
  Loader2, MessageSquare, Radio, Search, Send, Sparkles, StickyNote, TrendingDown,
} from 'lucide-react';

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
    byWeekday?: Array<{ label: string; intensity: number; avgViews: number }>;
    bestWeekday?: { label: string; views: number };
    note?: string;
  };
  preUpload?: {
    items: Array<{ id: string; label: string; done: boolean; required?: boolean }>;
    ready: boolean;
    progressPct: number;
  };
  channelNotes?: Array<{ id: string; text: string; createdAt: string }>;
  slaHours?: number;
  autoQueueEnabled?: boolean;
};

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
  onApplyIdea?: (title: string) => void;
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

  const inbox = dashboard?.inbox;

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          {loading ? 'Atualizando…' : 'Atualizar Pro'}
        </button>
      </div>

      {loading && !dashboard ? (
        <div className="py-6 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando Pro…
        </div>
      ) : (
        <>
          {/* Inbox Zero + SLA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-3 rounded-xl border ${inbox?.inboxZero ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-zinc-950 border-zinc-800'}`}>
              <p className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Inbox className="w-3 h-3" /> Pendentes</p>
              <p className="text-lg font-bold text-white tabular-nums">{inbox?.pending ?? '—'}</p>
            </div>
            <div className={`p-3 rounded-xl border ${(inbox?.overdue ?? 0) > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-zinc-950 border-zinc-800'}`}>
              <p className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> SLA+</p>
              <p className="text-lg font-bold text-red-300 tabular-nums">{inbox?.overdue ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[9px] text-zinc-500 uppercase">Fila</p>
              <p className="text-lg font-bold text-cyan-300 tabular-nums">{inbox?.queuePending ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><History className="w-3 h-3" /> Histórico</p>
              <p className="text-lg font-bold text-zinc-200 tabular-nums">{inbox?.repliesLogged ?? 0}</p>
            </div>
          </div>

          {inbox?.inboxZero && (
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Inbox zero — nenhum comentário pendente no lote.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[9px] text-zinc-500">SLA (horas)</label>
            <input
              type="number"
              min={1}
              max={168}
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value) || 24)}
              className="w-16 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-white"
            />
            <button type="button" onClick={saveSla} className="text-[9px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">Salvar SLA</button>
          </div>

          {/* Multi-canal */}
          {channels.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[9px] text-zinc-500">Canal ativo:</span>
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => switchChannel(ch.id)}
                  className={`text-[9px] px-2 py-1 rounded-lg border ${
                    ch.selected
                      ? 'bg-gold-500/15 text-gold-300 border-gold-500/30'
                      : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* Fila de aprovação */}
          {(dashboard?.approvalQueue?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                Fila de aprovação ({dashboard?.approvalQueue?.length})
              </p>
              {dashboard?.approvalQueue?.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[9px] text-zinc-500">
                    <span className="text-zinc-300 font-bold">{item.authorDisplayName}</span>
                    {item.ruleLabel && <span className="text-cyan-500">regra: {item.ruleLabel}</span>}
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{item.commentText}</p>
                  <textarea
                    value={queueEdits[item.id] ?? item.suggestedText}
                    onChange={(e) => setQueueEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    rows={2}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => queueAction(item.id, 'approve')} className="text-[8px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">Aprovar</button>
                    <button
                      type="button"
                      disabled={sendingId === item.id}
                      onClick={() => queueAction(item.id, 'send', queueEdits[item.id] ?? item.suggestedText)}
                      className="text-[8px] px-2 py-1 rounded bg-gold-500/15 border border-gold-500/30 text-gold-300 inline-flex items-center gap-1"
                    >
                      {sendingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Enviar
                    </button>
                    <button type="button" onClick={() => queueAction(item.id, 'reject')} className="text-[8px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-500">Rejeitar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEO mining */}
          {(dashboard?.seoOpportunities?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1 mb-2">
                <Search className="w-3.5 h-3.5 text-violet-400" /> SEO nos comentários
              </p>
              <ul className="space-y-1">
                {dashboard?.seoOpportunities?.slice(0, 6).map((op) => (
                  <li key={op.keyword} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-zinc-400 truncate">
                      <span className="text-zinc-200">{op.keyword}</span> · {op.mentions}×
                    </span>
                    {onApplyIdea && (
                      <button type="button" onClick={() => onApplyIdea(op.titleIdea)} className="text-gold-400 shrink-0 text-[9px]">Creator →</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Heatmap */}
          {dashboard?.heatmap?.available && dashboard.heatmap.byWeekday && (
            <div>
              <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1 mb-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Heatmap (dia da semana)
              </p>
              <div className="flex gap-1 items-end h-16">
                {dashboard.heatmap.byWeekday.map((d) => (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label}: ~${d.avgViews} views/dia`}>
                    <div
                      className="w-full rounded-t bg-orange-500/70 min-h-[4px]"
                      style={{ height: `${Math.max(8, d.intensity)}%` }}
                    />
                    <span className="text-[8px] text-zinc-600">{d.label}</span>
                  </div>
                ))}
              </div>
              {dashboard.heatmap.note && (
                <p className="text-[9px] text-zinc-600 mt-1">{dashboard.heatmap.note}</p>
              )}
            </div>
          )}

          {/* Retention cliff */}
          {selectedVideoId && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                Penhasco de retenção
                {cliffLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
              </p>
              {cliff?.primaryCliff ? (
                <p className={`text-[10px] ${cliff.primaryCliff.severity === 'high' ? 'text-red-300' : 'text-amber-300'}`}>
                  Queda de {cliff.primaryCliff.dropPct}% em ~{cliff.primaryCliff.atPercent}% do vídeo
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500">{cliff?.note || 'Selecione um vídeo com dados de retenção.'}</p>
              )}
            </div>
          )}

          {/* Pre-upload checklist */}
          {dashboard?.preUpload && (
            <div>
              <p className="text-[10px] font-bold text-zinc-300 mb-2">
                Checklist pré-upload ({dashboard.preUpload.progressPct}%)
              </p>
              <ul className="space-y-1">
                {dashboard.preUpload.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-[10px]">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => togglePreUpload(item.id, e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700"
                    />
                    <span className={item.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                      {item.label}
                      {item.required && <span className="text-red-400/80 ml-1">*</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {dashboard.preUpload.ready && (
                <p className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Obrigatórios OK — pronto para upload
                </p>
              )}
            </div>
          )}

          {/* Histórico */}
          {(dashboard?.replyHistory?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-300 mb-2">Últimas respostas</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {dashboard?.replyHistory?.map((h) => (
                  <li key={h.id} className="text-[9px] text-zinc-500">
                    <span className="text-zinc-600">{formatDateTime(h.sentAt)}</span>
                    {' · '}
                    <span className="text-zinc-400">{h.source}</span>
                    {' — '}
                    <span className="text-zinc-300">{h.text.slice(0, 80)}{h.text.length > 80 ? '…' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notas */}
          <div className="border-t border-zinc-900 pt-3 space-y-2">
            <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" /> Notas do canal
            </p>
            <div className="flex gap-2">
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Estratégia, metas, lembretes…"
                className="flex-1 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-white"
              />
              <button type="button" onClick={addNote} className="text-[9px] px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">Salvar</button>
            </div>
            {(dashboard?.channelNotes?.length ?? 0) > 0 && (
              <ul className="space-y-1">
                {dashboard?.channelNotes?.map((n) => (
                  <li key={n.id} className="text-[9px] text-zinc-500 flex gap-2">
                    <span className="text-zinc-600 shrink-0">{formatDateTime(n.createdAt)}</span>
                    <span className="text-zinc-400">{n.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(inbox?.overdue ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-[10px] text-red-300 font-bold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Fora do SLA
              </p>
              <ul className="space-y-0.5">
                {inbox?.overdueComments?.map((c) => (
                  <li key={c.threadId} className="text-[9px] text-zinc-500 truncate">
                    {c.authorDisplayName} · {c.hours}h · {c.videoTitle}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}