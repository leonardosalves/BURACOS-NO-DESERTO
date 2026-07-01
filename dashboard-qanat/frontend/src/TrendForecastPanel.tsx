import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  LineChart,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Video,
  Youtube,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type TimesfmStatus = {
  timesfmInstalled?: boolean;
  venvReady?: boolean;
  engine?: string;
  python?: string;
  probeError?: string | null;
  setupScript?: string;
  repo?: string;
};

type TrendVideo = {
  videoId?: string;
  title?: string;
  thumbnailUrl?: string;
  format?: string;
  growthPct?: number;
  forecastSum?: number;
  metrics?: { views?: number };
};

type TrendNiche = {
  niche?: string;
  videoCount?: number;
  growthPct?: number;
  sampleTitles?: string[];
};

type TrendIdea = {
  title?: string;
  hookPt?: string;
  format?: string;
  growthPct?: number;
};

type ForecastResult = {
  ok?: boolean;
  engine?: string;
  horizon?: number;
  channelTitle?: string;
  risingNiches?: TrendNiche[];
  shortTrends?: TrendVideo[];
  longTrends?: TrendVideo[];
  derivedIdeas?: TrendIdea[];
  editorialQueue?: { enqueued?: number; total?: number };
};

type TrendForecastPanelProps = {
  niche?: string;
  onApplyCreatorIdea?: (title: string, hookPt: string, options?: { format?: string }) => void;
  onGoToIntegrations?: () => void;
};

function GrowthBadge({ pct }: { pct?: number }) {
  const v = Number(pct || 0);
  const positive = v > 5;
  const neutral = v >= -5 && v <= 5;
  const cls = positive
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : neutral
      ? 'bg-zinc-500/10 text-zinc-400 border-zinc-700/50'
      : 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${cls}`}>
      {v > 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

export function TrendForecastPanel({
  niche = '',
  onApplyCreatorIdea,
  onGoToIntegrations,
}: TrendForecastPanelProps) {
  const [status, setStatus] = useState<TimesfmStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<'all' | 'SHORTS' | 'LONGO'>('all');
  const [horizon, setHorizon] = useState(7);
  const [enqueueIdeas, setEnqueueIdeas] = useState(true);
  const [result, setResult] = useState<ForecastResult | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/trends/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar status');
      setStatus(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runForecast = async () => {
    setBusy(true);
    setResult(null);
    const toastId = 'trend-forecast';
    try {
      toast.loading('Previsão TimesFM em andamento…', { id: toastId });
      const res = await fetch('/api/trends/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          horizon,
          enqueueIdeas,
          niche,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || data.details || 'Falha na previsão'));
      setResult(data);
      const engine = data.engine === 'timesfm-2.5' ? 'TimesFM 2.5' : 'fallback estatístico';
      const queue = data.editorialQueue?.enqueued;
      toast.success(
        `Previsão pronta (${engine})${queue ? ` · ${queue} ideia(s) na fila` : ''}`,
        { id: toastId },
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na previsão', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const timesfmReady = status?.timesfmInstalled;

  return (
    <div className="lumiera-panel-stack animate-fade-in font-sans min-w-0 space-y-4">
      <SectionHeader
        title="Radar de Tendências"
        helpId="tab-trend-forecast"
        size="lg"
        icon={<LineChart className="w-6 h-6 text-amber-400 shrink-0" />}
        subtitle="Previsão de nichos e vídeos em alta com TimesFM (Google Research) + Analytics do canal"
      />

      <div className="glass-panel p-5 rounded-3xl space-y-4 border border-amber-500/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            {loadingStatus ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : timesfmReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {loadingStatus
                ? 'Verificando TimesFM…'
                : timesfmReady
                  ? 'TimesFM 2.5 instalado'
                  : 'Modo fallback (instale TimesFM para previsão neural)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar status
          </button>
          {!timesfmReady && !loadingStatus && (
            <p className="text-[10px] text-zinc-500 w-full">
              Execute <code className="text-amber-300/90">.\scripts\setup-timesfm.ps1</code> no repositório Lumiera.
              {status?.probeError ? ` (${status.probeError})` : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-[10px] text-zinc-500 space-y-1">
            Formato
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-200"
            >
              <option value="all">Todos</option>
              <option value="SHORTS">Shorts</option>
              <option value="LONGO">Longos</option>
            </select>
          </label>
          <label className="text-[10px] text-zinc-500 space-y-1">
            Horizonte (dias)
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-200"
            >
              <option value={7}>7 dias</option>
              <option value={10}>10 dias</option>
              <option value={14}>14 dias</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-[10px] text-zinc-400 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={enqueueIdeas}
              onChange={(e) => setEnqueueIdeas(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Enfileirar ideias previstas na fila editorial
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void runForecast()}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Gerar previsão de tendências
        </button>
      </div>

      {result && (
        <>
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-300" />
              <p className="text-xs font-bold text-zinc-200">
                Nichos em alta
                {result.channelTitle ? ` · ${result.channelTitle}` : ''}
              </p>
              <span className="text-[9px] text-zinc-500 ml-auto">
                {result.engine} · {result.horizon}d
              </span>
            </div>
            {(result.risingNiches || []).length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">Nenhum cluster de nicho com dados suficientes.</p>
            ) : (
              <ul className="space-y-2">
                {(result.risingNiches || []).slice(0, 8).map((n) => (
                  <li
                    key={n.niche}
                    className="flex items-start gap-2 p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-zinc-200 capitalize">{n.niche}</p>
                      <p className="text-[9px] text-zinc-500">
                        {n.videoCount} vídeo(s)
                        {n.sampleTitles?.[0] ? ` · ex: ${n.sampleTitles[0].slice(0, 48)}…` : ''}
                      </p>
                    </div>
                    <GrowthBadge pct={n.growthPct} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendVideoList
              title="Shorts em tendência"
              icon={Youtube}
              videos={result.shortTrends || []}
              onApply={onApplyCreatorIdea}
            />
            <TrendVideoList
              title="Longos em tendência"
              icon={Video}
              videos={result.longTrends || []}
              onApply={onApplyCreatorIdea}
            />
          </div>

          {(result.derivedIdeas || []).length > 0 && (
            <div className="glass-panel p-5 rounded-3xl space-y-3">
              <p className="text-xs font-bold text-zinc-200">Ideias derivadas da previsão</p>
              <ul className="space-y-2">
                {(result.derivedIdeas || []).map((idea, i) => (
                  <li
                    key={`${idea.title}-${i}`}
                    className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <p className="text-[11px] text-zinc-200 flex-1">{idea.title}</p>
                      <GrowthBadge pct={idea.growthPct} />
                    </div>
                    {idea.hookPt && (
                      <p className="text-[9px] text-zinc-500 leading-relaxed">{idea.hookPt}</p>
                    )}
                    {onApplyCreatorIdea && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyCreatorIdea(idea.title || '', idea.hookPt || '', {
                            format: idea.format,
                          })
                        }
                        className="text-[10px] text-amber-300 hover:text-amber-200"
                      >
                        Abrir no Creator
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {onGoToIntegrations && (
        <p className="text-[10px] text-zinc-600 text-center">
          Dados do YouTube Analytics exigem canal vinculado.{' '}
          <button type="button" onClick={onGoToIntegrations} className="text-amber-400/80 hover:text-amber-300">
            Integrações
          </button>
        </p>
      )}
    </div>
  );
}

function TrendVideoList({
  title,
  icon: Icon,
  videos,
  onApply,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  videos: TrendVideo[];
  onApply?: (title: string, hook: string, options?: { format?: string }) => void;
}) {
  return (
    <div className="glass-panel p-5 rounded-3xl space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-red-300/80" />
        <p className="text-xs font-bold text-zinc-200">{title}</p>
      </div>
      {videos.length === 0 ? (
        <p className="text-[10px] text-zinc-500 italic">Sem vídeos neste formato no período.</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li
              key={v.videoId || v.title}
              className="flex gap-2 p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60"
            >
              {v.thumbnailUrl && (
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="w-14 h-8 object-cover rounded border border-zinc-800"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-200 line-clamp-2">{v.title}</p>
                <p className="text-[9px] text-zinc-500">
                  {(v.metrics?.views ?? 0).toLocaleString('pt-BR')} views
                </p>
              </div>
              <GrowthBadge pct={v.growthPct} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}