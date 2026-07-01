import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download, Mic, Wand2, Play, Music, Upload, AlertTriangle,
  CheckCircle2, Loader2, Sparkles, Image, Video, ExternalLink, Scissors,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { NarrationReplacePanel } from './NarrationReplacePanel';

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

type TtsVoiceOption = {
  id: string;
  label: string;
  group?: string;
};

type TtsEngineOption = {
  id: string;
  label: string;
  defaultVoice: string;
  defaultSpeed?: number;
  voices: TtsVoiceOption[];
  available?: boolean;
  mode?: string;
  serverUrl?: string;
  hint?: string;
};

type AiFetchResult = { ok: boolean; status: number; data: Record<string, unknown> };

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl?: (fileName: string) => string;
  postAi?: (path: string, init?: RequestInit) => Promise<AiFetchResult>;
  toast: (msg: string) => void;
  onNarrationReady?: () => void;
  onTimelineRefresh?: () => void;
  onMetadataReady?: (data?: unknown) => void;
  onNavigateTab?: (tab: string) => void;
  hasNarration?: boolean;
  hasTimings?: boolean;
  compact?: boolean;
  showPipeline?: boolean;
  /** When false, skips auto-fetch (reduces load when panel is off-screen). */
  enabled?: boolean;
};

export function WorkflowToolkit({
  getProjectUrl,
  getMediaUrl,
  postAi,
  toast,
  onNarrationReady,
  onTimelineRefresh,
  onMetadataReady,
  onNavigateTab,
  hasNarration,
  hasTimings,
  compact = false,
  showPipeline = true,
  enabled = true,
}: Props) {
  const [gaps, setGaps] = useState<SceneGapsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [ttsEngines, setTtsEngines] = useState<TtsEngineOption[]>([]);
  const [ttsEngine, setTtsEngine] = useState('kokoro');
  const [ttsVoice, setTtsVoice] = useState('pm_alex');
  const [ttsSpeed, setTtsSpeed] = useState('0.82');
  const [comfyStatus, setComfyStatus] = useState<{
    installed?: boolean;
    running?: boolean;
    models?: { ready?: boolean; gguf?: boolean };
    config?: { width?: number; height?: number; frames?: number; model_gguf?: string };
    generation_options?: {
      aspect_ratios?: {
        id: string;
        label: string;
        hint?: string;
        sizes: Record<string, { width: number; height: number; frames?: number }>;
      }[];
      quality_tiers?: { id: string; label: string }[];
      presets?: { id: string; label: string; width: number; height: number; frames: number; aspect_ratio?: string }[];
      frame_options?: number[];
      fps?: number;
      duration_seconds?: { min: number; max: number; step: number; default: number };
      max_frames_8gb?: number;
      formats?: string[];
      codecs?: string[];
      upscale_options?: { id: string; label: string; scale?: number; installed?: boolean }[];
      notes?: string;
    };
    available_models?: {
      gguf?: { id: string; label: string; size_mb?: number | null }[];
      loras?: { id: string; label: string; size_mb?: number | null }[];
      upscalers?: { id: string; label: string; size_mb?: number | null }[];
      upscale_options?: { id: string; label: string; installed?: boolean }[];
      defaults?: { model_gguf?: string | null; lora?: string; upscale?: string };
    };
    paths?: { ui?: string; comfyui_output?: string };
  } | null>(null);
  const [ltxPrompt, setLtxPrompt] = useState('');
  const [ltxWidth, setLtxWidth] = useState('640');
  const [ltxHeight, setLtxHeight] = useState('384');
  const [ltxFrames, setLtxFrames] = useState('17');
  const [ltxDuration, setLtxDuration] = useState('0.7');
  const [ltxFormat, setLtxFormat] = useState('auto');
  const [ltxCodec, setLtxCodec] = useState('auto');
  const [ltxFilenamePrefix, setLtxFilenamePrefix] = useState('video/LTX-2');
  const [ltxAspectRatio, setLtxAspectRatio] = useState('16:9');
  const [ltxQuality, setLtxQuality] = useState('8gb');
  const [ltxCustomSize, setLtxCustomSize] = useState(false);
  const [ltxModel, setLtxModel] = useState('');
  const [ltxLora, setLtxLora] = useState('');
  const [ltxUpscale, setLtxUpscale] = useState('ltx-2-spatial-upscaler-x2-1.0.safetensors');
  const [ltxJob, setLtxJob] = useState<{
    prompt_id: string;
    status: string;
    percent: number;
    message: string;
    outputs?: { filename: string; subfolder?: string; filepath?: string; preview_url?: string }[];
    error?: string;
  } | null>(null);
  const [comfyLog, setComfyLog] = useState<string[]>([]);
  const ltxPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);

  const refreshGaps = useCallback(async (force = false) => {
    if (!enabled) return;
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 8000) return;
    lastFetchRef.current = now;
    setLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/workflow/scene-gaps'));
      if (res.ok && mountedRef.current) setGaps(await res.json());
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled, getProjectUrl]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    const t = window.setTimeout(() => refreshGaps(true), 400);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(t);
    };
  }, [enabled, refreshGaps]);

  useEffect(() => {
    if (!enabled) return;
    fetch(getProjectUrl('/api/tts/voices'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mountedRef.current || !data?.engines?.length) return;
        setTtsEngines(data.engines);
        const kokoro = data.engines.find((e: TtsEngineOption) => e.id === 'kokoro') || data.engines[0];
        setTtsEngine(kokoro.id);
        setTtsVoice(kokoro.defaultVoice);
        if (kokoro.defaultSpeed) setTtsSpeed(String(kokoro.defaultSpeed));
      })
      .catch(() => { /* ignore */ });
  }, [enabled, getProjectUrl]);

  const refreshComfyStatus = useCallback(async () => {
    try {
      const res = await fetch(getProjectUrl('/api/comfyui/status'));
      if (res.ok && mountedRef.current) setComfyStatus(await res.json());
    } catch { /* ignore */ }
  }, [getProjectUrl]);

  useEffect(() => {
    if (!enabled) return;
    refreshComfyStatus();
    const id = window.setInterval(refreshComfyStatus, 12000);
    return () => window.clearInterval(id);
  }, [enabled, refreshComfyStatus]);

  const ltxFps = comfyStatus?.generation_options?.fps ?? 24;
  const ltxMaxFrames = comfyStatus?.generation_options?.max_frames_8gb ?? 121;
  const ltxDurationCfg = comfyStatus?.generation_options?.duration_seconds ?? { min: 0.4, max: 5, step: 0.1, default: 0.7 };

  const snapLtxFrames = useCallback((raw: number) => {
    const clamped = Math.min(ltxMaxFrames, Math.max(9, Math.round(raw)));
    const bucket = Math.round((clamped - 1) / 8);
    return bucket * 8 + 1;
  }, [ltxMaxFrames]);

  const framesFromDuration = useCallback((seconds: number) => {
    return snapLtxFrames(seconds * ltxFps);
  }, [ltxFps, snapLtxFrames]);

  const durationFromFrames = useCallback((frames: number) => {
    return Math.round((frames / ltxFps) * 100) / 100;
  }, [ltxFps]);

  const applyLtxDuration = useCallback((seconds: number) => {
    const frames = framesFromDuration(seconds);
    setLtxDuration(String(seconds));
    setLtxFrames(String(frames));
  }, [framesFromDuration]);

  const applyLtxAspectSize = useCallback((aspectId: string, qualityId: string) => {
    const aspect = comfyStatus?.generation_options?.aspect_ratios?.find((a) => a.id === aspectId);
    const size = aspect?.sizes?.[qualityId] || aspect?.sizes?.['8gb'];
    if (!size) return;
    setLtxWidth(String(size.width));
    setLtxHeight(String(size.height));
    if (size.frames) {
      setLtxFrames(String(size.frames));
      setLtxDuration(String(durationFromFrames(size.frames)));
    }
  }, [comfyStatus?.generation_options?.aspect_ratios, durationFromFrames]);

  useEffect(() => {
    if (ltxCustomSize) return;
    applyLtxAspectSize(ltxAspectRatio, ltxQuality);
  }, [ltxAspectRatio, ltxQuality, ltxCustomSize, applyLtxAspectSize]);

  useEffect(() => {
    const defaults = comfyStatus?.available_models?.defaults;
    if (!defaults) return;
    if (!ltxModel && defaults.model_gguf) setLtxModel(defaults.model_gguf);
    if (!ltxLora && defaults.lora) setLtxLora(defaults.lora);
    if (defaults.upscale) setLtxUpscale((prev) => prev || defaults.upscale!);
  }, [comfyStatus?.available_models?.defaults, ltxModel, ltxLora]);

  const stopLtxPolling = useCallback(() => {
    if (ltxPollRef.current) {
      window.clearInterval(ltxPollRef.current);
      ltxPollRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopLtxPolling();
  }, [stopLtxPolling]);

  const startLtxPolling = useCallback((promptId: string) => {
    stopLtxPolling();
    const poll = async () => {
      try {
        const res = await fetch(getProjectUrl(`/api/comfyui/progress/${promptId}`));
        if (!res.ok) return;
        const data = await res.json();
        if (!mountedRef.current) return;
        setLtxJob({
          prompt_id: promptId,
          status: data.status || 'running',
          percent: data.percent ?? 0,
          message: data.message || 'Gerando...',
          outputs: data.outputs || undefined,
          error: data.error || undefined,
        });
        if (data.status === 'completed') {
          stopLtxPolling();
          setBusy(null);
          toast(data.outputs?.[0]?.filename ? `Vídeo pronto: ${data.outputs[0].filename}` : 'Vídeo LTX gerado.');
        }
        if (data.status === 'error') {
          stopLtxPolling();
          setBusy(null);
          toast(data.error || 'Erro na geração LTX');
        }
      } catch { /* ignore */ }
    };
    poll();
    ltxPollRef.current = window.setInterval(poll, 1500);
  }, [getProjectUrl, stopLtxPolling, toast]);

  const ltxAspectLabel = comfyStatus?.generation_options?.aspect_ratios?.find((a) => a.id === ltxAspectRatio)?.label
    || (ltxCustomSize ? 'Personalizado' : ltxAspectRatio);

  const ltxUpscaleOptions = comfyStatus?.available_models?.upscale_options
    || comfyStatus?.generation_options?.upscale_options
    || [{ id: 'none', label: 'Sem upscale' }, { id: 'ltx-2-spatial-upscaler-x2-1.0.safetensors', label: 'Spatial 2x' }];

  const ltxPreviewUrl = (() => {
    const out = ltxJob?.outputs?.[0];
    if (!out) return null;
    if (out.preview_url) return getProjectUrl(out.preview_url);
    const params = new URLSearchParams({ filename: out.filename });
    if (out.subfolder) params.set('subfolder', out.subfolder);
    return getProjectUrl(`/api/comfyui/output?${params.toString()}`);
  })();

  const runComfySse = (url: string, label: string) => {
    setBusy(label);
    setComfyLog([]);
    const es = new EventSource(getProjectUrl(url));
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'log' && data.text) setComfyLog((p) => [...p.slice(-30), data.text]);
        if (data.type === 'complete') {
          toast(data.message || `${label} concluído.`);
          es.close();
          setBusy(null);
          refreshComfyStatus();
        }
        if (data.type === 'error') {
          toast(data.message || `${label} falhou`);
          es.close();
          setBusy(null);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { es.close(); setBusy(null); };
  };

  const handleComfyInstall = () => runComfySse('/api/comfyui/install', 'Instalar ComfyUI');

  const handleComfyDownload = () => runComfySse('/api/comfyui/download-models', 'Baixar modelos LTX');

  const handleComfyStart = async () => {
    setBusy('ComfyUI');
    try {
      const res = await fetch(getProjectUrl('/api/comfyui/start'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha');
      toast(data.message || 'ComfyUI iniciado.');
      refreshComfyStatus();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao iniciar ComfyUI');
    } finally {
      setBusy(null);
    }
  };

  const handleLtxGenerate = async () => {
    if (!ltxPrompt.trim()) { toast('Digite um prompt para o vídeo LTX.'); return; }
    setBusy('LTX');
    setLtxJob(null);
    try {
      const res = await fetch(getProjectUrl('/api/comfyui/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: ltxPrompt.trim(),
          width: Number(ltxWidth),
          height: Number(ltxHeight),
          duration_seconds: Number(ltxDuration),
          fps: ltxFps,
          aspect_ratio: ltxCustomSize ? 'custom' : ltxAspectRatio,
          format: ltxFormat,
          codec: ltxCodec,
          filename_prefix: ltxFilenamePrefix.trim() || 'video/LTX-2',
          model_gguf: ltxModel || undefined,
          lora: ltxLora || undefined,
          upscale: ltxUpscale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha');
      if (data.prompt_id) {
        setLtxJob({
          prompt_id: data.prompt_id,
          status: 'queued',
          percent: 2,
          message: 'Na fila do ComfyUI...',
        });
        startLtxPolling(data.prompt_id);
      }
      toast('Geração LTX iniciada.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro LTX');
      setBusy(null);
    }
  };

  const activeTtsEngine = ttsEngines.find((e) => e.id === ttsEngine) || ttsEngines[0];
  const activeTtsVoices = activeTtsEngine?.voices || [];

  const handleTtsEngineChange = (engineId: string) => {
    setTtsEngine(engineId);
    const engine = ttsEngines.find((e) => e.id === engineId);
    if (engine) {
      setTtsVoice(engine.defaultVoice);
      if (engine.defaultSpeed) setTtsSpeed(String(engine.defaultSpeed));
    }
  };

  const runAction = async (label: string, url: string, options?: RequestInit, useAi = false) => {
    setBusy(label);
    try {
      const aiPaths = ['/api/ai/publish-prep'];
      const shouldUseAi = useAi || (postAi && aiPaths.some((p) => url.startsWith(p)));
      let data: Record<string, unknown> = {};
      let ok = false;
      if (shouldUseAi && postAi) {
        const result = await postAi(url, options);
        ok = result.ok;
        data = result.data;
      } else {
        const res = await fetch(getProjectUrl(url), options);
        data = await res.json().catch(() => ({}));
        ok = res.ok;
      }
      if (!ok || data.needs_browser) throw new Error(String(data.error || data.details || 'Falha'));
      toast(String(data.message || `${label} concluído.`));
      await refreshGaps(true);
      return data;
    } catch (err) {
      toast(`${label}: ${err instanceof Error ? err.message : 'erro'}`);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleTts = () => {
    const body: Record<string, string | number> = {
      engine: ttsEngine,
      voice: ttsVoice,
    };
    if (ttsEngine === 'kokoro') {
      const speed = Number(ttsSpeed);
      body.speed = Number.isFinite(speed) ? speed : 0.82;
    } else if (ttsEngine === 'fish') {
      /* Fish Speech usa narrative_script_tagged + reference_id no backend */
    } else if (ttsEngine === 'chatterbox') {
      /* Chatterbox usa narrative_script_tagged + preset de voz no backend */
    } else if (ttsEngine === 'voicebox') {
      /* Voicebox: perfil de voz clonado no app local (porta 17493) */
    } else {
      body.rate = '-8%';
    }
    return runAction('Narração TTS', '/api/tts/generate-narration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((d) => {
      if (d) {
        onNarrationReady?.();
        toast('MP3 gerado. Próximo passo: Sincronizar timings (Whisper) e, na linha do tempo, Distribuir narração nos blocos.');
      }
    });
  };

  const handleStock = () => runAction('B-roll', '/api/stock/fetch-for-scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxScenes: 15, onlyMissing: true }),
  }).then((d) => { if (d) onTimelineRefresh?.(); });

  const handleClipFactory = () => runAction('Clip Factory', '/api/workflow/clip-factory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enqueue: true }),
  }).then((d) => {
    if (d && typeof d === 'object' && 'enqueued' in d) {
      toast(`Clip Factory: ${String((d as { enqueued?: number }).enqueued ?? 0)} Short(s) na fila. YouTube Studio → ▶ Creator.`);
      onNavigateTab?.('youtube-studio');
    }
  });

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
          refreshGaps(true);
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
    variant: 'gold' | 'emerald' | 'violet' | 'sky' | 'cyan' = 'gold',
  ) => {
    const colors = {
      gold: 'border-gold-500/30 text-gold-400 hover:bg-gold-500/10',
      emerald: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
      violet: 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10',
      sky: 'border-sky-500/30 text-sky-300 hover:bg-sky-500/10',
      cyan: 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10',
    };
    const isBusy = busy === label || busy === 'Pipeline';
    return (
      <button
        type="button"
        disabled={!!busy}
        onClick={onClick}
        className={`inline-flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold py-2 px-3 rounded-xl border transition disabled:opacity-50 text-center leading-snug min-w-0 ${colors[variant]}`}
      >
        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  return (
    <div className={`space-y-3 min-w-0 ${compact ? '' : 'rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4'}`}>
      {!compact && (
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 min-w-0">
          <SectionHeader
            title="Ferramentas de Workflow"
            helpId="workflow-toolkit"
            icon={<Sparkles className="w-3.5 h-3.5 text-gold-400" />}
            titleClassName="text-xs"
          />
          <button type="button" onClick={() => refreshGaps(true)} className="text-[9px] text-zinc-500 hover:text-zinc-300">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[9px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Projeto pronto para render
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('status')}
              className="text-[9px] font-bold text-gold-400 hover:text-gold-300 border border-gold-500/30 px-2 py-1 rounded-lg transition"
            >
              Ir para Render →
            </button>
          )}
        </div>
      ) : null}

      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {btn('Buscar B-roll', <Download className="w-3 h-3" />, handleStock, 'sky')}
        {btn('Clip Factory', <Scissors className="w-3 h-3" />, handleClipFactory, 'cyan')}
        {btn('Auto-map IA', <Wand2 className="w-3 h-3" />, handleAutoMap, 'violet')}
        {btn('Trilha BGM', <Music className="w-3 h-3" />, handleBgm, 'emerald')}
        {btn('Preparar pub.', <Upload className="w-3 h-3" />, handlePublishPrep, 'gold')}
        {onNavigateTab && btn('Metadados', <Image className="w-3 h-3" />, () => onNavigateTab('ai'), 'gold')}
      </div>

      {getMediaUrl && (
        <NarrationReplacePanel
          getProjectUrl={getProjectUrl}
          getMediaUrl={getMediaUrl}
          toast={toast}
          hasNarration={hasNarration ?? gaps?.hasNarration}
          hasTimings={hasTimings ?? gaps?.hasTimings}
          onUpdated={() => {
            refreshGaps(true);
            onNarrationReady?.();
            onTimelineRefresh?.();
          }}
          compact
        />
      )}

      <details className="lumiera-collapsible-section" open>
        <summary>Narração TTS</summary>
        <div className="lumiera-collapsible-body">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 space-y-2">
        <p className="text-[9px] text-zinc-500 uppercase tracking-wide font-bold">Motor e voz</p>
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <label className="space-y-1">
            <span className="text-[9px] text-zinc-500">Motor</span>
            <select
              value={ttsEngine}
              onChange={(e) => handleTtsEngineChange(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
            >
              {(ttsEngines.length ? ttsEngines : [{ id: 'kokoro', label: 'Kokoro (local, grátis)' }]).map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[9px] text-zinc-500">Voz</span>
            <select
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
            >
              {activeTtsVoices.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
        </div>
        {ttsEngine === 'kokoro' && (
          <label className="space-y-1 block">
            <span className="text-[9px] text-zinc-500">Velocidade ({ttsSpeed}x — 0.75 = mais lento/grave)</span>
            <input
              type="range"
              min="0.65"
              max="1.1"
              step="0.01"
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(e.target.value)}
              disabled={!!busy}
              className="w-full accent-emerald-500"
            />
          </label>
        )}
        {(ttsEngine === 'fish' || ttsEngine === 'chatterbox') && activeTtsEngine && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span
              className={`text-[8px] px-1.5 py-0.5 rounded border ${
                activeTtsEngine.available
                  ? ttsEngine === 'fish'
                    ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
                    : 'text-violet-300 border-violet-500/30 bg-violet-500/10'
                  : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
              }`}
            >
              {activeTtsEngine.available
                ? (ttsEngine === 'fish'
                  ? (activeTtsEngine.mode === 'cloud' ? 'API cloud' : 'Servidor local')
                  : 'Pacote instalado')
                : (ttsEngine === 'fish' ? 'Offline' : 'Pacote ausente')}
            </span>
            {activeTtsEngine.serverUrl ? (
              <span className="text-[8px] text-zinc-600 font-mono">{activeTtsEngine.serverUrl}</span>
            ) : null}
          </div>
        )}
        <div className="text-[8px] text-zinc-600">
          {ttsEngine === 'kokoro'
            ? 'Kokoro roda local (grátis). Primeira geração baixa o modelo (~300 MB).'
            : ttsEngine === 'chatterbox'
              ? (activeTtsEngine?.hint
                || 'Chatterbox — pip install chatterbox-tts. Multilingual V3 para PT; Turbo para EN com [chuckle].')
              : ttsEngine === 'fish'
                ? (activeTtsEngine?.hint
                  || 'Local: .\\scripts\\start-fish-speech.ps1 · Cloud: fish_speech.api_key no config_qanat.json')
                : 'Edge TTS usa vozes Microsoft na nuvem.'}
        </div>
        {btn('Gerar narração', <Mic className="w-3 h-3" />, handleTts, 'emerald')}
      </div>
        </div>
      </details>

      <details className="lumiera-collapsible-section">
        <summary className="text-violet-300/90">ComfyUI + LTX (vídeo IA)</summary>
        <div className="lumiera-collapsible-body">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] text-violet-300 uppercase tracking-wide font-bold flex items-center gap-1">
            <Video className="w-3 h-3" /> Servidor e modelos
          </p>
          {comfyStatus?.paths?.ui && (
            <a href={comfyStatus.paths.ui} target="_blank" rel="noreferrer" className="text-[8px] text-violet-400 hover:text-violet-200 flex items-center gap-0.5">
              Abrir UI <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`text-[8px] px-1.5 py-0.5 rounded border ${comfyStatus?.installed ? 'text-emerald-400 border-emerald-500/30' : 'text-zinc-500 border-zinc-700'}`}>
            {comfyStatus?.installed ? 'Instalado' : 'Não instalado'}
          </span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded border ${comfyStatus?.models?.ready ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
            {comfyStatus?.models?.ready ? 'Modelos OK' : 'Modelos pendentes'}
          </span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded border ${comfyStatus?.running ? 'text-emerald-400 border-emerald-500/30' : 'text-zinc-500 border-zinc-700'}`}>
            {comfyStatus?.running ? 'Servidor ativo' : 'Servidor parado'}
          </span>
        </div>
        {comfyStatus?.config && (
          <p className="text-[8px] text-zinc-500 leading-relaxed">
            {comfyStatus.config.model_gguf} · {comfyStatus.config.width}×{comfyStatus.config.height} · {comfyStatus.config.frames} frames · lowvram
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {btn('Instalar', <Download className="w-3 h-3" />, handleComfyInstall, 'violet')}
          {btn('Baixar LTX', <Download className="w-3 h-3" />, handleComfyDownload, 'violet')}
          {btn('Iniciar', <Play className="w-3 h-3" />, handleComfyStart, 'violet')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="text-[8px] text-zinc-500 space-y-0.5 col-span-2">
            Modelo GGUF
            <select
              value={ltxModel}
              onChange={(e) => setLtxModel(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {(comfyStatus?.available_models?.gguf?.length
                ? comfyStatus.available_models.gguf
                : comfyStatus?.config?.model_gguf
                  ? [{ id: comfyStatus.config.model_gguf, label: comfyStatus.config.model_gguf }]
                  : [{ id: '', label: 'Nenhum modelo encontrado' }]
              ).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.size_mb ? ` (${m.size_mb} MB)` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5 col-span-2">
            Upscale
            <select
              value={ltxUpscale}
              onChange={(e) => setLtxUpscale(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {ltxUpscaleOptions.map((u) => (
                <option key={u.id} value={u.id} disabled={u.installed === false}>
                  {u.label}{u.installed === false ? ' (não instalado)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5 col-span-2">
            LoRA
            <select
              value={ltxLora}
              onChange={(e) => setLtxLora(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {(comfyStatus?.available_models?.loras?.length
                ? comfyStatus.available_models.loras
                : [{ id: 'ltx-2-19b-distilled-lora-384.safetensors', label: 'ltx-2-19b-distilled-lora-384.safetensors' }]
              ).map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Proporção
            <select
              value={ltxCustomSize ? 'custom' : ltxAspectRatio}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'custom') {
                  setLtxCustomSize(true);
                  return;
                }
                setLtxCustomSize(false);
                setLtxAspectRatio(v);
              }}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {(comfyStatus?.generation_options?.aspect_ratios || [
                { id: '16:9', label: '16:9 Paisagem', hint: '' },
                { id: '9:16', label: '9:16 Vertical', hint: '' },
                { id: '1:1', label: '1:1 Quadrado', hint: '' },
              ]).map((a) => (
                <option key={a.id} value={a.id}>{a.label}{a.hint ? ` — ${a.hint}` : ''}</option>
              ))}
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Qualidade VRAM
            <select
              value={ltxQuality}
              onChange={(e) => { setLtxCustomSize(false); setLtxQuality(e.target.value); }}
              disabled={!!busy || ltxCustomSize}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200 disabled:opacity-50"
            >
              {(comfyStatus?.generation_options?.quality_tiers || [
                { id: '8gb', label: '8GB otimizado' },
                { id: 'fast', label: 'Rápido' },
              ]).map((q) => (
                <option key={q.id} value={q.id}>{q.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Largura
            <input
              type="number"
              min={256}
              max={1280}
              step={32}
              value={ltxWidth}
              onChange={(e) => { setLtxCustomSize(true); setLtxWidth(e.target.value); }}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            />
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Altura
            <input
              type="number"
              min={256}
              max={1024}
              step={32}
              value={ltxHeight}
              onChange={(e) => { setLtxCustomSize(true); setLtxHeight(e.target.value); }}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            />
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5 col-span-2">
            Duração ({ltxDuration}s @ {ltxFps}fps → {ltxFrames} frames)
            <input
              type="range"
              min={ltxDurationCfg.min}
              max={ltxDurationCfg.max}
              step={ltxDurationCfg.step}
              value={ltxDuration}
              onChange={(e) => applyLtxDuration(Number(e.target.value))}
              disabled={!!busy}
              className="w-full accent-violet-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={ltxDurationCfg.min}
                max={ltxDurationCfg.max}
                step={ltxDurationCfg.step}
                value={ltxDuration}
                onChange={(e) => applyLtxDuration(Number(e.target.value))}
                disabled={!!busy}
                className="w-16 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-200"
              />
              <span className="text-[8px] text-zinc-600">segundos</span>
            </div>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Formato
            <select
              value={ltxFormat}
              onChange={(e) => setLtxFormat(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {(comfyStatus?.generation_options?.formats || ['auto', 'mp4']).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5">
            Codec
            <select
              value={ltxCodec}
              onChange={(e) => setLtxCodec(e.target.value)}
              disabled={!!busy}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            >
              {(comfyStatus?.generation_options?.codecs || ['auto', 'h264']).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-[8px] text-zinc-500 space-y-0.5 col-span-2">
            Pasta/nome do arquivo
            <input
              type="text"
              value={ltxFilenamePrefix}
              onChange={(e) => setLtxFilenamePrefix(e.target.value)}
              disabled={!!busy}
              placeholder="video/LTX-2"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
            />
          </label>
        </div>
        <p className="text-[8px] text-violet-400/80">
          {ltxWidth}×{ltxHeight} · {ltxAspectLabel} · {ltxDuration}s ({ltxFrames}f)
          {ltxUpscale === 'none' ? ' · sem upscale' : ' · upscale 2x'}
          {!ltxCustomSize && ltxQuality === 'fast' ? ' · modo rápido' : ''}
        </p>
        {comfyStatus?.generation_options?.notes && (
          <p className="text-[8px] text-zinc-600">{comfyStatus.generation_options.notes}</p>
        )}
        <textarea
          value={ltxPrompt}
          onChange={(e) => setLtxPrompt(e.target.value)}
          placeholder="Prompt para vídeo IA (ex.: câmera lenta sobre ruínas maias ao pôr do sol, névoa dourada...)"
          disabled={!!busy}
          className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200 resize-none"
        />
        {btn('Gerar vídeo LTX', <Video className="w-3 h-3" />, handleLtxGenerate, 'violet')}
        {ltxJob && (
          <div className="rounded-lg border border-violet-500/20 bg-zinc-950/80 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[9px]">
              <span className="text-violet-300 font-medium">
                {ltxJob.status === 'completed' ? 'Concluído' : ltxJob.status === 'error' ? 'Erro' : 'Gerando'}
              </span>
              <span className="text-zinc-400 tabular-nums">{ltxJob.percent}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  ltxJob.status === 'error' ? 'bg-red-500' : ltxJob.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'
                }`}
                style={{ width: `${Math.max(2, Math.min(100, ltxJob.percent))}%` }}
              />
            </div>
            <p className="text-[8px] text-zinc-500">{ltxJob.message}</p>
            {ltxJob.outputs?.[0]?.filename && (
              <p className="text-[8px] text-emerald-400 font-mono truncate">
                {ltxJob.outputs[0].filename}
                {comfyStatus?.paths?.comfyui_output ? ` · ${comfyStatus.paths.comfyui_output}` : ''}
              </p>
            )}
            {ltxJob.status === 'completed' && ltxPreviewUrl && (
              <div className="space-y-1 pt-1">
                <video
                  key={ltxPreviewUrl}
                  src={ltxPreviewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-md border border-zinc-800 bg-black max-h-48 object-contain"
                />
                <a
                  href={ltxPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[8px] text-violet-400 hover:text-violet-200 inline-flex items-center gap-0.5"
                >
                  Abrir vídeo <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
            {ltxJob.error && <p className="text-[8px] text-red-400">{ltxJob.error}</p>}
          </div>
        )}
        {comfyLog.length > 0 && (
          <pre className="text-[8px] text-zinc-500 bg-zinc-900/60 rounded-lg p-2 max-h-20 overflow-y-auto font-mono">
            {comfyLog.slice(-6).join('\n')}
          </pre>
        )}
      </div>
        </div>
      </details>

      {showPipeline && (
        <details className="lumiera-collapsible-section">
          <summary>Autopilot (pipeline)</summary>
          <div className="lumiera-collapsible-body space-y-2">
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
        </details>
      )}

    </div>
  );
}