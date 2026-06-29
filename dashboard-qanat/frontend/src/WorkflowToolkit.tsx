import React, { useCallback, useEffect, useState } from 'react';
import {
  Download, Mic, Wand2, Play, Music, Upload, AlertTriangle,
  CheckCircle2, Loader2, Sparkles, Image,
} from 'lucide-react';

type SceneGapAction = {
  id: string;
  label: string;
  severity: string;
  count?: number;
};

type SceneGapsReport = {
  gapCount: number;
  totalScenes: number;
  hasNarration: boolean;
  hasTimings: boolean;
  hasMetadataCache: boolean;
  actions: SceneGapAction[];
  gaps?: { scene: string; stock_query: string }[];
};

type Props = {
  getProjectUrl: (path: string) => string;
  toast: (msg: string) => void;
  onNarrationReady?: () => void;
  onTimelineRefresh?: () => void;
  onMetadataReady?: (data?: unknown) => void;
  onNavigateTab?: (tab: string) => void;
  compact?: boolean;
  showPipeline?: boolean;
};

export function WorkflowToolkit({
  getProjectUrl,
  toast,
  onNarrationReady,
  onTimelineRefresh,
  onMetadataReady,
  onNavigateTab,
  compact = false,
  showPipeline = true,
}: Props) {
  const [gaps, setGaps] = useState<SceneGapsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);

  const refreshGaps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/workflow/scene-gaps'));
      if (res.ok) setGaps(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getProjectUrl]);

  useEffect(() => {
    refreshGaps();
  }, [refreshGaps]);

  const runAction = async (label: string, url: string, options?: RequestInit) => {
    setBusy(label);
    try {
      const res = await fetch(getProjectUrl(url), options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || 'Falha');
      toast(data.message || `${label} concluído.`);
      await refreshGaps();
      return data;
    } catch (err) {
      toast(`${label}: ${err instanceof Error ? err.message : 'erro'}`);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleTts = () => runAction('Narração TTS', '/api/tts/generate-narration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice: 'pt-BR-AntonioNeural', engine: 'edge' }),
  }).then((d) => { if (d) onNarrationReady?.(); });

  const handleStock = () => runAction('B-roll', '/api/stock/fetch-for-scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxScenes: 15, onlyMissing: true }),
  }).then((d) => { if (d) onTimelineRefresh?.(); });

  const handleAutoMap = () => runAction('Auto-map', '/api/ai/auto-map-assets', { method: 'POST' })
    .then((d) => { if (d) onTimelineRefresh?.(); });

  const handleBgm = () => runAction('Trilha', '/api/ai/apply-bgm', { method: 'POST' });

  const handlePublishPrep = () => runAction('Publicação', '/api/ai/publish-prep', { method: 'POST' })
    .then((d) => { if (d) onMetadataReady?.(d); });

  const runPipeline = (steps: string) => {
    setBusy('Pipeline');
    setPipelineLog([]);
    const es = new EventSource(getProjectUrl(`/api/creator/run-pipeline?steps=${encodeURIComponent(steps)}`));
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'log') setPipelineLog((prev) => [...prev.slice(-40), data.text]);
        if (data.type === 'complete') {
          toast('Pipeline concluído.');
          es.close();
          setBusy(null);
          refreshGaps();
          onTimelineRefresh?.();
          onMetadataReady?.();
        }
        if (data.type === 'error') {
          toast(data.message || 'Pipeline falhou');
          es.close();
          setBusy(null);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      es.close();
      setBusy(null);
    };
  };

  const severityColor = (s: string) => {
    if (s === 'error') return 'text-red-400 border-red-500/30 bg-red-500/10';
    if (s === 'warning') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
  };

  const btn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    variant: 'gold' | 'emerald' | 'violet' | 'sky' = 'gold',
  ) => {
    const colors = {
      gold: 'border-gold-500/30 text-gold-400 hover:bg-gold-500/10',
      emerald: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
      violet: 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10',
      sky: 'border-sky-500/30 text-sky-300 hover:bg-sky-500/10',
    };
    const isBusy = busy === label || busy === 'Pipeline';
    return (
      <button
        type="button"
        disabled={!!busy}
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 px-3 rounded-xl border transition disabled:opacity-50 ${colors[variant]}`}
      >
        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  return (
    <div className={`space-y-3 ${compact ? '' : 'rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4'}`}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-white font-cinzel flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            Ferramentas de Workflow
          </h4>
          <button type="button" onClick={refreshGaps} className="text-[9px] text-zinc-500 hover:text-zinc-300">
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      )}

      {gaps && (
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasNarration ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}`}>
            {gaps.hasNarration ? 'Narração ✓' : 'Sem narração'}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasTimings ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
            {gaps.hasTimings ? 'Sync ✓' : 'Sem sync'}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.gapCount === 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
            {gaps.gapCount === 0 ? 'B-roll completo' : `${gaps.gapCount} cenas sem mídia`}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasMetadataCache ? 'text-emerald-400 border-emerald-500/30' : 'text-zinc-500 border-zinc-700'}`}>
            {gaps.hasMetadataCache ? 'Metadados ✓' : 'Sem metadados'}
          </span>
        </div>
      )}

      {gaps?.actions?.length ? (
        <div className="space-y-1">
          {gaps.actions.slice(0, 4).map((a) => (
            <div key={a.id} className={`text-[9px] px-2 py-1 rounded-lg border flex items-center gap-1.5 ${severityColor(a.severity)}`}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {a.label}
            </div>
          ))}
        </div>
      ) : gaps ? (
        <div className="text-[9px] text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Projeto pronto para render
        </div>
      ) : null}

      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {btn('TTS Narração', <Mic className="w-3 h-3" />, handleTts, 'emerald')}
        {btn('Buscar B-roll', <Download className="w-3 h-3" />, handleStock, 'sky')}
        {btn('Auto-map IA', <Wand2 className="w-3 h-3" />, handleAutoMap, 'violet')}
        {btn('Trilha BGM', <Music className="w-3 h-3" />, handleBgm, 'emerald')}
        {btn('Preparar pub.', <Upload className="w-3 h-3" />, handlePublishPrep, 'gold')}
        {onNavigateTab && btn('Metadados', <Image className="w-3 h-3" />, () => onNavigateTab('ai'), 'gold')}
      </div>

      {showPipeline && (
        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wide font-bold">Autopilot</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {btn('Pipeline completo', <Play className="w-3 h-3" />, () => runPipeline('sync,stock,automap,bgm,mix,metadata,thumbnails'), 'violet')}
            {btn('Só mídia + map', <Play className="w-3 h-3" />, () => runPipeline('stock,automap'), 'sky')}
            {btn('Só publicação', <Play className="w-3 h-3" />, () => runPipeline('metadata,thumbnails'), 'gold')}
          </div>
          {pipelineLog.length > 0 && (
            <pre className="text-[8px] text-zinc-500 bg-zinc-900/60 rounded-lg p-2 max-h-24 overflow-y-auto font-mono">
              {pipelineLog.slice(-8).join('\n')}
            </pre>
          )}
        </div>
      )}

    </div>
  );
}