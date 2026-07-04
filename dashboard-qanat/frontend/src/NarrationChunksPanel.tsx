import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye, Loader2, Mic, Play, RefreshCw, Save, Sparkles, Tag, Volume2,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import {
  createProgressJobId,
  getAiJobProgressState,
  startAiJobProgress,
  stopAiJobProgress,
  subscribeAiJobProgress,
  waitForAiJobDone,
  type AiJobProgressState,
} from './aiJobProgressClient';
import { describeFetchError, pingBackendHealth } from './describeFetchError';

type ChunkVoice = {
  engine: string;
  voice: string;
  speed?: number;
};

export type NarrationChunk = {
  id: string;
  block: number;
  scene_ref: string;
  text: string;
  text_tagged?: string;
  pause_after_ms: number;
  pause_reason?: string;
  voice: ChunkVoice;
  audio_file?: string | null;
  duration_s?: number | null;
  start_s?: number | null;
  status?: string;
};

export type NarrationChunkPlan = {
  version?: number;
  default_voice?: ChunkVoice;
  chunk_count?: number;
  total_duration?: number | null;
  chunks: NarrationChunk[];
};

type TtsEngineOption = {
  id: string;
  label: string;
  defaultVoice: string;
  voices: { id: string; label: string }[];
  available?: boolean;
};

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl: (file: string) => string;
  toast: (msg: string) => void;
  hasApiKey?: boolean;
  narrationMode?: 'chunked' | 'master' | string;
  plan?: NarrationChunkPlan | null;
  onPlanChange?: (plan: NarrationChunkPlan) => void;
  onModeChange?: (mode: 'chunked' | 'master') => void;
  onUpdated?: () => void;
};

const ENGINE_LABELS: Record<string, string> = {
  kokoro: 'Kokoro',
  edge: 'Edge TTS',
  chatterbox: 'Chatterbox',
  fish: 'Fish Audio',
  voicebox: 'Voicebox',
  gptsovits: 'GPT-SoVITS',
};

export function NarrationChunksPanel({
  getProjectUrl,
  getMediaUrl,
  toast,
  hasApiKey = false,
  narrationMode = 'master',
  plan: externalPlan,
  onPlanChange,
  onModeChange,
  onUpdated,
}: Props) {
  const [localPlan, setLocalPlan] = useState<NarrationChunkPlan | null>(externalPlan || null);
  const [engines, setEngines] = useState<TtsEngineOption[]>([]);
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingChunkId, setGeneratingChunkId] = useState<string | null>(null);
  const [ttsProgress, setTtsProgress] = useState<AiJobProgressState | null>(null);
  const [defaultEngine, setDefaultEngine] = useState('kokoro');
  const [defaultVoice, setDefaultVoice] = useState('pm_alex');
  const [useTagged, setUseTagged] = useState(true);
  const [expandedTagsChunkId, setExpandedTagsChunkId] = useState<string | null>(null);
  const [tagPreviews, setTagPreviews] = useState<Record<string, { preview: string; tags: string[] }>>({});

  useEffect(() => {
    setLocalPlan(externalPlan || null);
  }, [externalPlan]);

  useEffect(() => {
    const dv = localPlan?.default_voice;
    if (dv?.engine) setDefaultEngine(dv.engine);
    if (dv?.voice) setDefaultVoice(dv.voice);
  }, [localPlan?.default_voice?.engine, localPlan?.default_voice?.voice]);

  useEffect(() => {
    fetch(getProjectUrl('/api/tts/voices'))
      .then((r) => r.json())
      .then((data) => setEngines(Array.isArray(data?.engines) ? data.engines : []))
      .catch(() => {});
  }, [getProjectUrl]);

  useEffect(() => {
    return subscribeAiJobProgress((state) => {
      if (state?.active) setTtsProgress(state);
    });
  }, []);

  const engineOptions = useMemo(
    () => engines.filter((e) => e.available !== false),
    [engines],
  );

  const voicesForEngine = useCallback((engineId: string) => {
    const eng = engines.find((e) => e.id === engineId);
    return eng?.voices || [];
  }, [engines]);

  const updatePlan = (next: NarrationChunkPlan) => {
    setLocalPlan(next);
    onPlanChange?.(next);
  };

  const patchChunk = (chunkId: string, patch: Partial<NarrationChunk>) => {
    if (!localPlan) return;
    updatePlan({
      ...localPlan,
      chunks: localPlan.chunks.map((c) => (c.id === chunkId ? { ...c, ...patch } : c)),
    });
  };

  const applyDefaultVoiceToAll = () => {
    if (!localPlan) return;
    const voice: ChunkVoice = { engine: defaultEngine, voice: defaultVoice };
    updatePlan({
      ...localPlan,
      default_voice: voice,
      chunks: localPlan.chunks.map((c) => ({ ...c, voice: { ...voice } })),
    });
    toast('Narrador padrão aplicado a todos os trechos.');
  };

  const handlePlan = async (useHeuristic = false) => {
    if (!useHeuristic && !hasApiKey) {
      toast('Configure a chave Gemini para planejar trechos com IA.');
      return;
    }
    setPlanning(true);
    try {
      const res = await fetch(getProjectUrl('/api/ai/plan-narration-chunks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useHeuristic,
          defaultVoice: { engine: defaultEngine, voice: defaultVoice },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || 'Falha ao planejar trechos'));
      if (data.plan) {
        updatePlan(data.plan);
        onModeChange?.('chunked');
      }
      toast(useHeuristic ? 'Trechos gerados a partir das cenas.' : 'IA planejou trechos e pausas.');
      onUpdated?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao planejar trechos.');
    } finally {
      setPlanning(false);
    }
  };

  const handleSavePlan = async () => {
    if (!localPlan?.chunks?.length) return;
    setSaving(true);
    try {
      const res = await fetch(getProjectUrl('/api/narration/chunks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: localPlan,
          mode: narrationMode === 'master' ? 'master' : 'chunked',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || 'Falha ao salvar'));
      if (data.plan) updatePlan(data.plan);
      toast('Plano de trechos salvo.');
      onUpdated?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  const fetchTagPreview = useCallback(async (chunkId: string, tagged: string, engine: string) => {
    if (!tagged.trim()) {
      setTagPreviews((prev) => {
        const next = { ...prev };
        delete next[chunkId];
        return next;
      });
      return;
    }
    try {
      const res = await fetch(getProjectUrl('/api/tts/preview-tagged-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_tagged: tagged,
          engine,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setTagPreviews((prev) => ({
        ...prev,
        [chunkId]: { preview: String(data.preview || ''), tags: Array.isArray(data.tags) ? data.tags : [] },
      }));
    } catch { /* ignore */ }
  }, [getProjectUrl]);

  useEffect(() => {
    if (!expandedTagsChunkId || !useTagged) return;
    const chunk = (localPlan?.chunks || []).find((c) => c.id === expandedTagsChunkId);
    if (!chunk) return;
    const timer = window.setTimeout(() => {
      void fetchTagPreview(chunk.id, chunk.text_tagged || chunk.text, chunk.voice?.engine || defaultEngine);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [expandedTagsChunkId, localPlan?.chunks, useTagged, defaultEngine, fetchTagPreview]);

  const persistPlanBeforeTts = async (): Promise<boolean> => {
    if (!localPlan?.chunks?.length) {
      toast('Nenhum trecho no plano — planeje antes de gerar.');
      return false;
    }
    try {
      const res = await fetch(getProjectUrl('/api/narration/chunks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: localPlan, mode: 'chunked' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(String(data.error || 'Falha ao salvar plano antes do TTS.'));
        return false;
      }
      if (data.plan) updatePlan(data.plan);
      return true;
    } catch (err) {
      toast(describeFetchError(err, 'salvar plano de trechos'));
      return false;
    }
  };

  const runChunkTts = async (chunkIds: string[] | null) => {
    if (!(await persistPlanBeforeTts())) return;

    const isFullBatch = chunkIds === null;
    const progressJobId = createProgressJobId();
    setGenerating(true);
    setTtsProgress(null);

    const backendOk = await pingBackendHealth();
    if (!backendOk) {
      const msg = describeFetchError(new Error('Failed to fetch'), 'iniciar TTS por trechos');
      setGenerating(false);
      toast(msg);
      return;
    }

    startAiJobProgress(
      progressJobId,
      isFullBatch ? 'Narração por trechos + Whisper' : 'Narração por trechos',
    );

    try {
      const res = await fetch(getProjectUrl('/api/tts/generate-narration-chunks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunk_ids: chunkIds,
          default_voice: { engine: defaultEngine, voice: defaultVoice },
          use_tagged: useTagged,
          sync_whisper: isFullBatch,
          assemble_master: isFullBatch,
          progress_job_id: progressJobId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || 'Falha no TTS por trechos'));

      const jobId = String(data.jobId || progressJobId);

      if (data.started && jobId) {
        const result = await waitForAiJobDone(jobId) as {
          message?: string;
          whisper_synced?: boolean;
          whisper_error?: string | null;
        };
        const doneMsg = result.message
          || (result.whisper_synced
            ? 'Trechos montados · legendas sincronizadas (Whisper).'
            : 'Trechos montados.');
        if (result.whisper_error && isFullBatch) {
          toast(`Whisper: ${result.whisper_error}`, { icon: '⚠️' });
        }
        stopAiJobProgress(true, doneMsg);
        toast(doneMsg);
      } else {
        stopAiJobProgress(true, String(data.message || 'Trechos gerados.'));
        if (data.plan) updatePlan(data.plan);
        toast(data.message || 'Trechos gerados.');
        if (data.whisper_error && isFullBatch) {
          toast(`Whisper: ${data.whisper_error}`, { icon: '⚠️' });
        }
        onUpdated?.();
        return;
      }

      const refresh = await fetch(getProjectUrl('/api/narration/chunks'));
      if (refresh.ok) {
        const payload = await refresh.json();
        if (payload.plan) updatePlan(payload.plan);
      }
      onUpdated?.();
    } catch (err) {
      const msg = describeFetchError(err, 'gerar narração por trechos');
      stopAiJobProgress(false, msg);
    } finally {
      setGenerating(false);
      setGeneratingChunkId(null);
      setTtsProgress(null);
    }
  };

  const chunks = localPlan?.chunks || [];
  const isChunked = narrationMode === 'chunked';

  return (
    <div className="space-y-4 border border-zinc-800 rounded-2xl p-4 bg-zinc-950/40">
      <SectionHeader
        title="Narração por trechos"
        helpId="narration-chunks"
        size="sm"
        icon={<Mic className="w-4 h-4 text-gold-400" />}
        subtitle="Gere voz por bloco/cena com pausas planejadas pela IA. Troque o narrador por trecho."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange?.('master')}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            !isChunked ? 'bg-gold-500 text-zinc-950 border-gold-500' : 'border-zinc-800 text-zinc-400'
          }`}
        >
          Arquivo único
        </button>
        <button
          type="button"
          onClick={() => onModeChange?.('chunked')}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            isChunked ? 'bg-gold-500 text-zinc-950 border-gold-500' : 'border-zinc-800 text-zinc-400'
          }`}
        >
          Por trechos
        </button>
      </div>

      {isChunked && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Motor TTS padrão</label>
              <select
                value={defaultEngine}
                onChange={(e) => {
                  const eng = e.target.value;
                  setDefaultEngine(eng);
                  const voices = voicesForEngine(eng);
                  if (voices[0]) setDefaultVoice(voices[0].id);
                }}
                className="dash-select w-full text-xs"
              >
                {engineOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.label || ENGINE_LABELS[e.id] || e.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Voz padrão</label>
              <select
                value={defaultVoice}
                onChange={(e) => setDefaultVoice(e.target.value)}
                className="dash-select w-full text-xs"
              >
                {voicesForEngine(defaultEngine).map((v) => (
                  <option key={v.id} value={v.id}>{v.label || v.id}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyDefaultVoiceToAll}
              disabled={!chunks.length}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-gold-500/50"
            >
              Aplicar a todos
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useTagged}
                onChange={(e) => setUseTagged(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Usar tags TTS na geração
            </label>
            <span className="text-[9px] text-zinc-600">
              Pausas entre trechos vêm do plano IA (ms) — sem tags (breath) ou [ênfase] no texto.
            </span>
            <span className="text-[9px] text-zinc-600">
              «Gerar todos os trechos» monta o MP3 master e roda Whisper automaticamente nas legendas.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={planning || !hasApiKey}
              onClick={() => handlePlan(false)}
              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              {planning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Planejar trechos (IA)
            </button>
            <button
              type="button"
              disabled={planning}
              onClick={() => handlePlan(true)}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300"
            >
              Trechos das cenas (rápido)
            </button>
            <button
              type="button"
              disabled={saving || !chunks.length}
              onClick={handleSavePlan}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Salvando…' : 'Salvar plano'}
            </button>
            <button
              type="button"
              disabled={generating || !chunks.length}
              onClick={() => runChunkTts(null)}
              className="text-[10px] font-bold px-3 py-2 rounded-lg bg-zinc-800 text-white flex items-center gap-1"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
              Gerar todos os trechos + Whisper
            </button>
          </div>

          {(generating || ttsProgress?.active) && (
            <p className="text-[10px] text-zinc-400">
              {(ttsProgress || getAiJobProgressState())?.label || 'Gerando trechos…'}
              {' — '}
              {(ttsProgress || getAiJobProgressState())?.percent ?? 0}%
            </p>
          )}

          {chunks.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic">
              Nenhum trecho planejado. Use a IA ou o mapeamento rápido pelas cenas do roteiro.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {chunks.map((chunk, idx) => (
                <div key={chunk.id} className="border border-zinc-800 rounded-xl p-3 space-y-2 bg-zinc-950">
                  <div className="flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-[10px] font-mono font-bold text-gold-400">
                      {chunk.id} · bloco {chunk.block} · cena {chunk.scene_ref}
                      {chunk.duration_s ? ` · ${chunk.duration_s.toFixed(1)}s` : ''}
                      {chunk.start_s != null ? ` @ ${chunk.start_s.toFixed(1)}s` : ''}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded ${chunk.status === 'generated' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
                      {chunk.status || 'planned'}
                    </span>
                  </div>
                  <label className="text-[8px] text-zinc-500 uppercase font-bold">Texto falado</label>
                  <textarea
                    value={chunk.text}
                    onChange={(e) => patchChunk(chunk.id, { text: e.target.value })}
                    rows={2}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedTagsChunkId((prev) => (prev === chunk.id ? null : chunk.id))}
                    className="text-[9px] text-cyan-400/90 flex items-center gap-1 hover:text-cyan-300"
                  >
                    <Tag className="w-3 h-3" />
                    {expandedTagsChunkId === chunk.id ? 'Ocultar tags TTS' : 'Ver / editar tags TTS'}
                    {(chunk.text_tagged || '').match(/\[[^\]]+\]|\([^)]+\)/g)?.length
                      ? ` (${(chunk.text_tagged || '').match(/\[[^\]]+\]|\([^)]+\)/g)?.length} tags)`
                      : ''}
                  </button>
                  {expandedTagsChunkId === chunk.id && (
                    <div className="space-y-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
                      <label className="text-[8px] text-cyan-300/80 uppercase font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Texto com tags (enviado ao TTS se ativo)
                      </label>
                      <textarea
                        value={chunk.text_tagged ?? chunk.text}
                        onChange={(e) => patchChunk(chunk.id, { text_tagged: e.target.value })}
                        rows={3}
                        placeholder="Texto do trecho (sem breath nem ênfase — pausas no campo ms)"
                        className="w-full text-[11px] font-mono bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={() => patchChunk(chunk.id, { text_tagged: chunk.text })}
                        className="text-[8px] text-zinc-500 hover:text-zinc-300"
                      >
                        Copiar texto limpo → tags
                      </button>
                      {useTagged && tagPreviews[chunk.id]?.preview && (
                        <div className="text-[9px] text-zinc-500 space-y-1">
                          <p className="text-cyan-400/70 uppercase text-[7px] font-bold">Preview enviado ao motor</p>
                          <p className="font-mono text-zinc-400 leading-relaxed break-words">{tagPreviews[chunk.id].preview}</p>
                          {tagPreviews[chunk.id].tags.length > 0 && (
                            <p className="text-zinc-600">
                              Tags: {tagPreviews[chunk.id].tags.join(' · ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">Pausa depois (ms)</label>
                      <input
                        type="number"
                        min={0}
                        max={3000}
                        step={50}
                        value={chunk.pause_after_ms}
                        onChange={(e) => patchChunk(chunk.id, { pause_after_ms: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">Motor</label>
                      <select
                        value={chunk.voice?.engine || defaultEngine}
                        onChange={(e) => patchChunk(chunk.id, {
                          voice: { ...chunk.voice, engine: e.target.value, voice: voicesForEngine(e.target.value)[0]?.id || chunk.voice?.voice },
                        })}
                        className="dash-select w-full text-[10px]"
                      >
                        {engineOptions.map((e) => (
                          <option key={e.id} value={e.id}>{e.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">Narrador</label>
                      <select
                        value={chunk.voice?.voice || defaultVoice}
                        onChange={(e) => patchChunk(chunk.id, {
                          voice: { ...chunk.voice, voice: e.target.value },
                        })}
                        className="dash-select w-full text-[10px]"
                      >
                        {voicesForEngine(chunk.voice?.engine || defaultEngine).map((v) => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-1">
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() => {
                          setGeneratingChunkId(chunk.id);
                          void runChunkTts([chunk.id]);
                        }}
                        className="text-[9px] font-bold px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 flex items-center gap-1"
                      >
                        {generatingChunkId === chunk.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Gerar
                      </button>
                      {chunk.audio_file && (
                        <button
                          type="button"
                          onClick={() => {
                            const audio = new Audio(`${getMediaUrl(chunk.audio_file!)}?v=${Date.now()}`);
                            void audio.play();
                          }}
                          className="text-[9px] px-2 py-1.5 rounded border border-zinc-700 text-zinc-300"
                          title="Ouvir trecho"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {chunk.pause_reason && (
                    <p className="text-[9px] text-zinc-600">{chunk.pause_reason}</p>
                  )}
                  {idx < chunks.length - 1 && (
                    <p className="text-[8px] text-zinc-600 text-center">↓ pausa {chunk.pause_after_ms}ms</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {localPlan?.total_duration ? (
            <p className="text-[10px] text-zinc-500">
              Duração total estimada: {localPlan.total_duration.toFixed(1)}s · {localPlan.chunk_count || chunks.length} trecho(s)
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}