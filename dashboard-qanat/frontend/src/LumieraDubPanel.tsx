import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download, Globe, Languages, Loader2, Mic, Play, Sparkles, Volume2,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type DubSource = {
  id: string;
  label: string;
  relative: string;
};

type DubLanguage = {
  id: string;
  label: string;
};

type DubBlock = {
  start: number;
  end: number;
  text: string;
  translatedText?: string;
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
  voices: TtsVoiceOption[];
  available?: boolean;
  hint?: string;
  cloudModel?: string;
};

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl: (relativePath: string) => string;
  toast: (msg: string) => void;
  onComplete?: () => void;
};

export function LumieraDubPanel({
  getProjectUrl,
  getMediaUrl,
  toast,
  onComplete,
}: Props) {
  const [sources, setSources] = useState<DubSource[]>([]);
  const [languages, setLanguages] = useState<DubLanguage[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [engine, setEngine] = useState('fish');
  const [voice, setVoice] = useState('');
  const [bgmVolume, setBgmVolume] = useState(0.35);
  const [skipTranslate, setSkipTranslate] = useState(false);
  const [forceRetranscribe, setForceRetranscribe] = useState(false);

  const [engines, setEngines] = useState<TtsEngineOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{
    detectedLanguage?: string | null;
    blockCount?: number;
    blocks?: DubBlock[];
  } | null>(null);
  const [result, setResult] = useState<{
    output?: { relative: string; name: string };
    blockCount?: number;
    duration?: number;
  } | null>(null);

  const activeEngine = engines.find((e) => e.id === engine);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [srcRes, ttsRes] = await Promise.all([
        fetch(getProjectUrl('/api/dub/sources')),
        fetch(getProjectUrl('/api/tts/voices')),
      ]);
      const srcData = await srcRes.json();
      const ttsData = await ttsRes.json();
      if (!srcRes.ok) throw new Error(String(srcData.error || 'Falha ao listar fontes'));
      const srcList = (srcData.sources || []) as DubSource[];
      setSources(srcList);
      setLanguages((srcData.languages || []) as DubLanguage[]);
      if (!sourceId && srcList[0]?.id) setSourceId(srcList[0].id);

      const engList = (ttsData.engines || []) as TtsEngineOption[];
      const dubEngines = engList.filter((e) => ['fish', 'voicebox', 'kokoro', 'edge'].includes(e.id));
      setEngines(dubEngines);
      const fish = dubEngines.find((e) => e.id === 'fish');
      if (fish?.defaultVoice) setVoice(fish.defaultVoice);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar fontes de dublagem.');
    } finally {
      setLoadingMeta(false);
    }
  }, [getProjectUrl, sourceId, toast]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const eng = engines.find((e) => e.id === engine);
    if (eng?.defaultVoice) setVoice(eng.defaultVoice);
  }, [engine, engines]);

  const voiceGroups = useMemo(() => {
    const voices = activeEngine?.voices || [];
    const map = new Map<string, TtsVoiceOption[]>();
    for (const v of voices) {
      const g = v.group || 'Vozes';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(v);
    }
    return [...map.entries()];
  }, [activeEngine]);

  const appendLogs = (items: string[]) => {
    if (!items?.length) return;
    setLogs((prev) => [...prev.slice(-60), ...items]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setLogs([]);
    setAnalysis(null);
    try {
      const res = await fetch(getProjectUrl('/api/dub/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, language: sourceLanguage }),
      });
      const data = await res.json();
      appendLogs(data.logs || []);
      if (!res.ok) throw new Error(String(data.error || 'Análise falhou'));
      setAnalysis({
        detectedLanguage: data.detectedLanguage,
        blockCount: data.blockCount,
        blocks: data.blocks,
      });
      toast(`Análise OK: ${data.blockCount} bloco(s) de fala detectado(s).`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro na análise Whisper.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceId) {
      toast('Selecione um vídeo fonte em OUTPUT.');
      return;
    }
    setGenerating(true);
    setLogs([]);
    setResult(null);
    try {
      const res = await fetch(getProjectUrl('/api/dub/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          targetLanguage,
          sourceLanguage,
          engine,
          voice,
          skipTranslate,
          bgmVolume,
          forceRetranscribe,
          fish: engine === 'fish' ? {
            temperature: 0.8,
            topP: 0.8,
            repetitionPenalty: 1.1,
            chunkLength: 300,
            prosodySpeed: 1,
            cloudModel: activeEngine?.cloudModel,
          } : undefined,
        }),
      });
      const data = await res.json();
      appendLogs(data.logs || []);
      if (!res.ok) throw new Error(String(data.error || 'Dublagem falhou'));
      setResult({
        output: data.output,
        blockCount: data.blockCount,
        duration: data.duration,
      });
      toast(`Dublagem concluída: ${data.output?.name || 'MP4 gerado'}`);
      onComplete?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar dublagem.');
    } finally {
      setGenerating(false);
    }
  };

  const busy = analyzing || generating;
  const outputUrl = result?.output?.relative ? getMediaUrl(result.output.relative) : null;

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-4">
      <SectionHeader
        title="Lumiera Dub — MP4 completo"
        helpId="lumiera-dub"
        icon={<Languages className="w-4 h-4 text-sky-400" />}
        titleClassName="text-sm text-sky-200"
        subtitle="Whisper → tradução Gemini → TTS por bloco → mux com BGM original. Estilo ShortGPT, integrado ao Lumiera."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Vídeo fonte (OUTPUT)</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            disabled={busy || loadingMeta}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
          >
            {sources.length === 0 && <option value="">Nenhum MP4 em OUTPUT — renderize primeiro</option>}
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Idioma alvo</span>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={busy}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Idioma origem (Whisper)</span>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            disabled={busy}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
          >
            <option value="auto">Auto-detectar</option>
            {languages.map((l) => (
              <option key={`src-${l.id}`} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Motor TTS</span>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            disabled={busy}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
          >
            {engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}{e.available === false ? ' (offline)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Voz</span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={busy}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
          >
            {voiceGroups.map(([group, voices]) => (
              <optgroup key={group} label={group}>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-bold">
            <span>Volume BGM original</span>
            <span className="text-sky-400">{Math.round(bgmVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={bgmVolume}
            onChange={(e) => setBgmVolume(Number(e.target.value))}
            disabled={busy}
            className="w-full accent-sky-500"
          />
        </div>
      </div>

      {activeEngine && (
        <p className={`text-[9px] px-2 py-1 rounded-lg border ${
          activeEngine.available !== false
            ? 'text-emerald-300/90 border-emerald-500/25 bg-emerald-500/5'
            : 'text-amber-300/90 border-amber-500/25 bg-amber-500/5'
        }`}>
          {activeEngine.available !== false
            ? (activeEngine.hint || 'Motor TTS disponível')
            : (activeEngine.hint || 'Motor offline — verifique Fish/Voicebox')}
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={skipTranslate}
            onChange={(e) => setSkipTranslate(e.target.checked)}
            disabled={busy}
            className="rounded border-zinc-700"
          />
          Pular tradução (só TTS)
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={forceRetranscribe}
            onChange={(e) => setForceRetranscribe(e.target.checked)}
            disabled={busy}
            className="rounded border-zinc-700"
          />
          Re-transcrever (ignorar cache)
        </label>
        <button
          type="button"
          onClick={() => { void loadMeta(); }}
          disabled={loadingMeta || busy}
          className="text-[10px] px-2 py-1 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 ml-auto"
        >
          {loadingMeta ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { void handleAnalyze(); }}
          disabled={busy || !sourceId}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white transition disabled:opacity-40"
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
          Analisar (Whisper)
        </button>
        <button
          type="button"
          onClick={() => { void handleGenerate(); }}
          disabled={busy || !sourceId}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-4 py-2 rounded-lg border border-sky-500/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 transition disabled:opacity-40"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Gerar MP4 dublado
        </button>
      </div>

      {analysis && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Detectado: <strong className="text-zinc-200">{analysis.detectedLanguage || '—'}</strong>
              {' · '}
              {analysis.blockCount} bloco(s)
            </span>
          </div>
          {analysis.blocks && analysis.blocks.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 text-[9px] text-zinc-500 font-mono">
              {analysis.blocks.slice(0, 8).map((b, i) => (
                <div key={i} className="truncate">
                  [{b.start.toFixed(1)}s] {b.text}
                </div>
              ))}
              {analysis.blocks.length > 8 && (
                <div className="text-zinc-600">+{analysis.blocks.length - 8} blocos...</div>
              )}
            </div>
          )}
        </div>
      )}

      {outputUrl && result?.output && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-3">
          <p className="text-[10px] text-emerald-300 font-bold flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            {result.output.name}
            {result.duration ? ` · ${result.duration.toFixed(1)}s` : ''}
          </p>
          <video
            src={outputUrl}
            controls
            className="w-full max-h-64 rounded-lg border border-zinc-800 bg-black"
          />
          <div className="flex gap-2">
            <a
              href={`${outputUrl}?download=true`}
              download={result.output.name}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
            <button
              type="button"
              onClick={() => {
                const w = window.open(outputUrl, '_blank');
                w?.focus();
              }}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            >
              <Play className="w-3 h-3" />
              Abrir
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 max-h-36 overflow-y-auto">
          <p className="text-[8px] text-zinc-600 uppercase font-bold mb-1">Log</p>
          {logs.map((line, i) => (
            <p key={i} className="text-[9px] text-zinc-500 font-mono leading-relaxed">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}