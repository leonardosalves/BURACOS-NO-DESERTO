import React, { useCallback, useEffect, useState } from 'react';
import type { CreatorApplyIdeaOptions } from './creatorEditorialImport';
import {
  Download, Lightbulb, MessageSquare, Send, Webhook, BarChart3, Target, Radio,
  Search, RefreshCw, ExternalLink, Trophy, Layers,
} from 'lucide-react';

type EditorialItem = {
  id: string;
  title: string;
  hookPt?: string;
  source?: string;
  mechanic?: string;
  whyWorks?: string;
  status: 'inbox' | 'script' | 'render' | 'published';
  format?: 'SHORTS' | 'LONGO';
};

const STATUS_LABELS: Record<EditorialItem['status'], string> = {
  inbox: 'Inbox',
  script: 'Roteiro',
  render: 'Render',
  published: 'Publicado',
};

type Props = {
  viewsThreshold: number;
  nicheKeyword?: string;
  toast: (msg: string) => void;
  onApplyIdea?: (title: string, hookPt?: string, options?: CreatorApplyIdeaOptions) => void;
};

export function YoutubeStudioTools({ viewsThreshold, nicheKeyword = '', toast, onApplyIdea }: Props) {
  const [webhooks, setWebhooks] = useState({ telegram: '', discord: '' });
  const [responseStats, setResponseStats] = useState<{ averageHours: number | null; sampleSize: number } | null>(null);
  const [ideas, setIdeas] = useState<Array<{ title: string; angle?: string; mentions?: number }>>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [channels, setChannels] = useState<Array<{ id: string; title: string; selected?: boolean }>>([]);
  const [pinVideoId, setPinVideoId] = useState('');
  const [pinText, setPinText] = useState('');
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [creatorFormat, setCreatorFormat] = useState<'SHORTS' | 'LONGO'>('SHORTS');
  const [editorialQueue, setEditorialQueue] = useState<EditorialItem[]>([]);
  const [topWinnersLoading, setTopWinnersLoading] = useState(false);
  const [topWinnersResult, setTopWinnersResult] = useState<{
    winners?: Array<{ title: string; views: number }>;
    ideas?: Array<{ title: string; hookPt?: string }>;
  } | null>(null);
  const [competitorResult, setCompetitorResult] = useState<{
    competitors?: Array<{ title: string; outlierCount: number }>;
    outliers?: Array<{ title: string; channelTitle: string; outlierRatio: number }>;
    analysis?: { derivedIdeas?: Array<{ title: string; hookPt?: string }> };
    memory?: { memoryFile?: string };
    aiAnalysisFailed?: boolean;
    aiAnalysisWarning?: string;
  } | null>(null);

  const loadEditorialQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/youtube/channel/editorial-queue');
      if (res.ok) {
        const data = await res.json();
        setEditorialQueue((data.items || []) as EditorialItem[]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch('/api/youtube/channel/settings').then((r) => r.json()).then((d) => {
      if (d.webhooks) setWebhooks(d.webhooks);
    }).catch(() => {});
    fetch('/api/youtube/channel/response-stats').then((r) => r.json()).then(setResponseStats).catch(() => {});
    fetch('/api/youtube/channel/list').then((r) => r.json()).then((d) => setChannels(d.channels || [])).catch(() => {});
    void loadEditorialQueue();
  }, [loadEditorialQueue]);

  const updateQueueStatus = async (id: string, status: EditorialItem['status']) => {
    const res = await fetch(`/api/youtube/channel/editorial-queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadEditorialQueue();
      toast(`Status → ${STATUS_LABELS[status]}`);
    } else {
      toast('Falha ao atualizar fila.');
    }
  };

  const runTopWinners = async () => {
    setTopWinnersLoading(true);
    setTopWinnersResult(null);
    try {
      const res = await fetch('/api/youtube/channel/top-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: nicheKeyword || undefined, days: 7, limit: 3, useAi: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha');
      setTopWinnersResult(data);
      await loadEditorialQueue();
      toast(`Top ${data.winners?.length || 0} analisados — ${data.ideas?.length || 0} variações na fila`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao replicar top 3');
    } finally {
      setTopWinnersLoading(false);
    }
  };

  const saveWebhooks = async () => {
    const res = await fetch('/api/youtube/channel/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhooks }),
    });
    if (res.ok) toast('Webhooks salvos.');
  };

  const testWebhook = async () => {
    const res = await fetch('/api/youtube/channel/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhooks, message: 'Teste Lumiera — alertas YouTube' }),
    });
    const data = await res.json();
    toast(data.results?.some((r: { ok: boolean }) => r.ok) ? 'Webhook enviado.' : 'Falha no webhook.');
  };

  const loadIdeas = useCallback(async (useAi = false) => {
    setIdeasLoading(true);
    try {
      const params = new URLSearchParams({ niche: nicheKeyword });
      if (useAi) params.set('ai', '1');
      const res = await fetch(`/api/youtube/channel/comments/ideas?${params}`);
      const data = await res.json();
      const merged = [...(data.ideas || []), ...(data.aiIdeas || [])];
      setIdeas(merged);
      toast(`${merged.length} ideia(s) a partir dos comentários.`);
    } catch {
      toast('Erro ao gerar ideias.');
    } finally {
      setIdeasLoading(false);
    }
  }, [nicheKeyword, toast]);

  const exportCsv = (type: 'comments' | 'videos') => {
    window.open(`/api/youtube/channel/export.csv?type=${type}&viewsThreshold=${viewsThreshold}`, '_blank');
  };

  const pinComment = async () => {
    if (!pinVideoId || !pinText.trim()) return toast('Informe videoId e texto.');
    const res = await fetch('/api/youtube/channel/comments/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: pinVideoId, text: pinText }),
    });
    if (res.ok) toast('Comentário fixado no vídeo.');
    else toast('Falha ao fixar comentário.');
  };

  const runCompetitorResearch = async () => {
    setCompetitorLoading(true);
    setCompetitorResult(null);
    try {
      const res = await fetch('/api/youtube/channel/competitor-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: nicheKeyword || undefined,
          format: creatorFormat === 'LONGO' ? 'LONG' : 'SHORT',
          maxCompetitors: 5,
          useAi: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Falha na pesquisa');
      setCompetitorResult(data);
      await loadEditorialQueue();
      const n = (data.outliers || []).length;
      const ideas = (data.analysis?.derivedIdeas || []).length;
      const q = data.editorialQueue?.enqueued || ideas;
      const base = `Pesquisa: ${data.competitors?.length || 0} canais, ${n} outliers, ${ideas} ideias + fichas → Obsidian · fila +${q}`;
      toast(data.aiAnalysisFailed ? `${base} (${data.aiAnalysisWarning || 'análise básica'})` : base);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro na pesquisa de concorrentes');
    } finally {
      setCompetitorLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        Ferramentas avançadas
      </h3>

      {responseStats && (
        <p className="text-[10px] text-zinc-500">
          Tempo médio de resposta: {responseStats.averageHours != null ? `${responseStats.averageHours}h` : '—'}
          {responseStats.sampleSize ? ` (${responseStats.sampleSize} amostras)` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => exportCsv('comments')} className="text-[9px] px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> CSV comentários
        </button>
        <button type="button" onClick={() => exportCsv('videos')} className="text-[9px] px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> CSV vídeos
        </button>
        <button type="button" disabled={ideasLoading} onClick={() => loadIdeas(false)} className="text-[9px] px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 inline-flex items-center gap-1">
          <Lightbulb className="w-3 h-3" /> Ideias (comentários)
        </button>
        <button type="button" disabled={ideasLoading} onClick={() => loadIdeas(true)} className="text-[9px] px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300">
          Ideias IA
        </button>
      </div>

      {ideas.length > 0 && (
        <ul className="space-y-1">
          {ideas.slice(0, 6).map((idea, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
              <span className="truncate">{idea.title}</span>
              {onApplyIdea && (
                <button type="button" title="Abrir no Creator (página preparada)" onClick={() => onApplyIdea(idea.title, idea.angle, { format: creatorFormat })} className="text-gold-400 shrink-0">Creator ▶</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          value={webhooks.telegram}
          onChange={(e) => setWebhooks((w) => ({ ...w, telegram: e.target.value }))}
          placeholder="Webhook Telegram (URL completa)"
          className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-white"
        />
        <input
          value={webhooks.discord}
          onChange={(e) => setWebhooks((w) => ({ ...w, discord: e.target.value }))}
          placeholder="Webhook Discord"
          className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-white"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={saveWebhooks} className="text-[9px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">Salvar webhooks</button>
        <button type="button" onClick={testWebhook} className="text-[9px] px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 inline-flex items-center gap-1">
          <Webhook className="w-3 h-3" /> Testar
        </button>
      </div>

      {channels.length > 1 && (
        <p className="text-[9px] text-zinc-600 flex items-center gap-1">
          <Radio className="w-3 h-3" />
          {channels.length} canal(is) — troque o ativo na seção Studio Pro acima.
        </p>
      )}

      <div className="border-t border-zinc-900 pt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] text-zinc-500 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-emerald-400" />
            Replicar top 3 (7 dias)
          </p>
          <button
            type="button"
            disabled={topWinnersLoading}
            onClick={runTopWinners}
            className="text-[9px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 inline-flex items-center gap-1"
          >
            {topWinnersLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
            {topWinnersLoading ? 'Analisando...' : 'Gerar variações'}
          </button>
        </div>
        {topWinnersResult?.winners && topWinnersResult.winners.length > 0 && (
          <ul className="space-y-1">
            {topWinnersResult.winners.map((w, i) => (
              <li key={i} className="text-[8px] text-zinc-600 truncate">
                {i + 1}. {w.title} — {w.views.toLocaleString('pt-BR')} views
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-900 pt-3 space-y-2">
        <p className="text-[9px] text-zinc-500 flex items-center gap-1">
          <Layers className="w-3 h-3 text-cyan-400" />
          Fila editorial ({editorialQueue.filter((i) => i.status !== 'published').length} ativos)
        </p>
        {editorialQueue.length === 0 ? (
          <p className="text-[8px] text-zinc-600">Vazia — use concorrentes ou Replicar top 3.</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {editorialQueue.slice(0, 12).map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-[9px] text-zinc-400">
                <select
                  value={item.status}
                  onChange={(e) => updateQueueStatus(item.id, e.target.value as EditorialItem['status'])}
                  className="text-[8px] bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-zinc-300 shrink-0"
                >
                  {(Object.keys(STATUS_LABELS) as EditorialItem['status'][]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <span className="truncate flex-1" title={item.title}>{item.title}</span>
                {onApplyIdea && item.status !== 'published' && (
                  <button
                    type="button"
                    title="Abrir no Creator (página preparada)"
                    onClick={() => onApplyIdea(item.title, item.hookPt, {
                      format: item.format || creatorFormat,
                      editorialItemId: item.id,
                      mechanic: item.mechanic,
                      whyWorks: item.whyWorks,
                      source: item.source,
                    })}
                    className="text-gold-400 shrink-0"
                  >
                    ▶
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-900 pt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] text-zinc-500 flex items-center gap-1">
            <Search className="w-3 h-3 text-amber-400" />
            Pesquisa de concorrentes (IA)
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-zinc-600">Creator ▶</span>
            <button
              type="button"
              onClick={() => setCreatorFormat('SHORTS')}
              className={`text-[8px] px-2 py-0.5 rounded border ${creatorFormat === 'SHORTS' ? 'bg-gold-500/15 text-gold-300 border-gold-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
            >
              Short
            </button>
            <button
              type="button"
              onClick={() => setCreatorFormat('LONGO')}
              className={`text-[8px] px-2 py-0.5 rounded border ${creatorFormat === 'LONGO' ? 'bg-gold-500/15 text-gold-300 border-gold-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
            >
              Longo
            </button>
          </div>
          <button
            type="button"
            disabled={competitorLoading}
            onClick={runCompetitorResearch}
            className="text-[9px] px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 inline-flex items-center gap-1"
          >
            {competitorLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            {competitorLoading ? 'Pesquisando...' : 'Buscar concorrentes'}
          </button>
        </div>
        <p className="text-[8px] text-zinc-600">
          A IA descobre canais no nicho{nicheKeyword ? ` (${nicheKeyword})` : ''}, detecta outliers (3.5× média), analisa hook/CTA/mecânica e salva em Obsidian.
        </p>
        {competitorResult && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 space-y-1.5">
            {competitorResult.aiAnalysisWarning && (
              <p className="text-[8px] text-amber-400/90">{competitorResult.aiAnalysisWarning}</p>
            )}
            {(competitorResult.analysis?.derivedIdeas || []).slice(0, 3).map((idea, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                <span className="truncate">{idea.title}</span>
                {onApplyIdea && (
                  <button type="button" title="Abrir no Creator (página preparada)" onClick={() => onApplyIdea(idea.title, idea.hookPt, { format: creatorFormat })} className="text-gold-400 shrink-0">Creator ▶</button>
                )}
              </div>
            ))}
            {(competitorResult.outliers || []).slice(0, 2).map((o, i) => (
              <p key={`o-${i}`} className="text-[8px] text-zinc-600 truncate">
                Outlier {o.outlierRatio}× — {o.channelTitle}: {o.title}
              </p>
            ))}
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/studio-agents/obsidian/open', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ relativePath: 'memory/competitor-intelligence.md' }),
                });
                toast('Abrindo competitor-intelligence.md no Obsidian');
              }}
              className="text-[8px] text-cyan-400 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Ver memória Obsidian
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-900 pt-3 space-y-2">
        <p className="text-[9px] text-zinc-500 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Fixar comentário no vídeo</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={pinVideoId} onChange={(e) => setPinVideoId(e.target.value)} placeholder="videoId" className="flex-1 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-white" />
          <input value={pinText} onChange={(e) => setPinText(e.target.value)} placeholder="Texto do comentário fixo" className="flex-[2] px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-white" />
          <button type="button" onClick={pinComment} className="text-[9px] px-3 py-1.5 rounded bg-gold-500/15 border border-gold-500/30 text-gold-300 inline-flex items-center gap-1">
            <Send className="w-3 h-3" /> Fixar
          </button>
        </div>
      </div>

      <p className="text-[9px] text-zinc-600 flex items-center gap-1">
        <Target className="w-3 h-3" />
        Metas 48h: Ferramentas → Configurações do canal
      </p>
    </div>
  );
}