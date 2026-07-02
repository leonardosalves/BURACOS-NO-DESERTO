import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink, Loader2, Mic, Play, Sparkles, Square, Volume2, Wand2,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { buildTaggedNarration } from './taggedNarration';

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
  mode?: string;
  serverUrl?: string;
  hint?: string;
  cloudModel?: string;
  gpuAvailable?: boolean;
  backendType?: string | null;
  profileCount?: number;
};

const FISH_TAG_CHIPS = [
  '[ênfase]', '[pausa]', '[pausa longa]', '[rápido]', '[lento]',
  '[suspiro]', '[inhale]', '[risada leve]', '[tom de narrador documental em português brasileiro]',
];

const FISH_PREVIEW_FALLBACK =
  'Esta é uma amostra da voz do narrador. Tom documental, natural e claro em português brasileiro.';

const VOICEBOX_ENGINES = [
  { id: 'chatterbox', label: 'Chatterbox (multilíngue PT)' },
  { id: 'kokoro', label: 'Kokoro (leve)' },
  { id: 'qwen3-tts', label: 'Qwen3-TTS' },
  { id: 'chatterbox-turbo', label: 'Chatterbox Turbo (tags EN)' },
  { id: 'luxtts', label: 'LuxTTS (EN)' },
];

type Props = {
  getProjectUrl: (path: string) => string;
  toast: (msg: string) => void;
  narrativeScript?: string;
  taggedScript?: string;
  onUpdated?: () => void;
  onTaggedScriptChange?: (value: string) => void;
};

export function TtsVoiceStudioPanel({
  getProjectUrl,
  toast,
  narrativeScript = '',
  taggedScript = '',
  onUpdated,
  onTaggedScriptChange,
}: Props) {
  const [studioEngine, setStudioEngine] = useState<'fish' | 'voicebox'>('fish');
  const [engines, setEngines] = useState<TtsEngineOption[]>([]);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [fishVoice, setFishVoice] = useState('__default__');
  const [fishUseTags, setFishUseTags] = useState(true);
  const [fishTaggedText, setFishTaggedText] = useState('');
  const [fishTemperature, setFishTemperature] = useState(0.8);
  const [fishTopP, setFishTopP] = useState(0.8);
  const [fishRepPenalty, setFishRepPenalty] = useState(1.1);
  const [fishChunkLength, setFishChunkLength] = useState(300);
  const [fishProsodySpeed, setFishProsodySpeed] = useState(1);
  const [fishPreviewing, setFishPreviewing] = useState(false);
  const [fishPreviewPlaying, setFishPreviewPlaying] = useState(false);
  const [fishPreviewSample, setFishPreviewSample] = useState('');

  const fishPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fishPreviewUrlRef = useRef<string | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [vbVoice, setVbVoice] = useState('');
  const [vbEngine, setVbEngine] = useState('chatterbox');
  const [vbLanguage, setVbLanguage] = useState('pt');
  const [vbUseTags, setVbUseTags] = useState(false);

  const fishEngine = engines.find((e) => e.id === 'fish');
  const voiceboxEngine = engines.find((e) => e.id === 'voicebox');
  const activeEngine = studioEngine === 'fish' ? fishEngine : voiceboxEngine;

  const pickValidVoice = (
    current: string,
    voices: TtsVoiceOption[] = [],
    fallback = '',
  ) => {
    if (current && voices.some((v) => v.id === current)) return current;
    if (fallback && voices.some((v) => v.id === fallback)) return fallback;
    const first = voices.find((v) => v.id && v.id !== '__configure__');
    return first?.id || current || fallback;
  };

  const loadEngines = useCallback(async () => {
    setLoadingEngines(true);
    try {
      const res = await fetch(getProjectUrl('/api/tts/voices'));
      const data = await res.json();
      const list = (data.engines || []) as TtsEngineOption[];
      setEngines(list);
      const fish = list.find((e) => e.id === 'fish');
      const vb = list.find((e) => e.id === 'voicebox');
      setFishVoice((current) => pickValidVoice(
        current,
        fish?.voices || [],
        fish?.defaultVoice || '__default__',
      ));
      setVbVoice((current) => pickValidVoice(
        current,
        vb?.voices || [],
        vb?.defaultVoice && vb.defaultVoice !== '__configure__'
          ? vb.defaultVoice
          : (vb?.voices?.[0]?.id || ''),
      ));
    } catch {
      toastRef.current('Erro ao carregar motores TTS.');
    } finally {
      setLoadingEngines(false);
    }
  }, [getProjectUrl]);

  useEffect(() => {
    void loadEngines();
  }, [loadEngines]);

  useEffect(() => {
    if (taggedScript.trim()) {
      setFishTaggedText(taggedScript);
      return;
    }
    if (narrativeScript.trim().length > 40) {
      setFishTaggedText(buildTaggedNarration(narrativeScript, 'fish', { taggedScript }));
    }
  }, [narrativeScript, taggedScript]);

  const fishPreviewText = useMemo(() => {
    const plain = narrativeScript.replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length >= 40) {
      const sentence = plain.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || plain;
      return sentence.slice(0, 180).trim();
    }
    return FISH_PREVIEW_FALLBACK;
  }, [narrativeScript]);

  const stopFishPreview = useCallback(() => {
    if (fishPreviewAudioRef.current) {
      fishPreviewAudioRef.current.pause();
      fishPreviewAudioRef.current.currentTime = 0;
    }
    setFishPreviewPlaying(false);
  }, []);

  const revokeFishPreviewUrl = useCallback(() => {
    if (fishPreviewUrlRef.current) {
      URL.revokeObjectURL(fishPreviewUrlRef.current);
      fishPreviewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopFishPreview();
    revokeFishPreviewUrl();
  }, [stopFishPreview, revokeFishPreviewUrl]);

  useEffect(() => {
    stopFishPreview();
    revokeFishPreviewUrl();
    setFishPreviewSample('');
  }, [fishVoice, fishTemperature, fishTopP, fishRepPenalty, fishProsodySpeed, stopFishPreview, revokeFishPreviewUrl]);

  const handleFishPreview = async () => {
    if (!fishEngine?.available) {
      toast('Fish Audio indisponível — verifique API key ou servidor local.');
      return;
    }
    setFishPreviewing(true);
    stopFishPreview();
    revokeFishPreviewUrl();
    try {
      const res = await fetch(getProjectUrl('/api/tts/fish-preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: fishVoice,
          narrativeScript,
          sampleText: fishPreviewText,
          fish: {
            temperature: fishTemperature,
            topP: fishTopP,
            repetitionPenalty: fishRepPenalty,
            prosodySpeed: fishProsodySpeed,
            cloudModel: fishEngine?.cloudModel,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err.error || 'Falha na amostra de voz'));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      fishPreviewUrlRef.current = url;
      const sampleHeader = res.headers.get('X-Fish-Sample-Text');
      setFishPreviewSample(sampleHeader ? decodeURIComponent(sampleHeader) : fishPreviewText);
      const audio = new Audio(url);
      fishPreviewAudioRef.current = audio;
      audio.onended = () => setFishPreviewPlaying(false);
      audio.onerror = () => {
        setFishPreviewPlaying(false);
        toast('Erro ao reproduzir amostra.');
      };
      await audio.play();
      setFishPreviewPlaying(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar amostra Fish.');
    } finally {
      setFishPreviewing(false);
    }
  };

  const fishVoicesGrouped = useMemo(() => {
    const voices = fishEngine?.voices || [];
    const groups = new Map<string, TtsVoiceOption[]>();
    for (const v of voices) {
      const g = v.group || 'vozes';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    return [...groups.entries()];
  }, [fishEngine]);

  const insertFishTag = (tag: string) => {
    setFishTaggedText((prev) => `${prev.trimEnd()} ${tag} `.trimStart());
  };

  const autoGenerateFishTags = () => {
    if (!narrativeScript.trim()) {
      toast('Preencha o texto da narração no storyboard primeiro.');
      return;
    }
    const built = buildTaggedNarration(narrativeScript, 'fish', { taggedScript });
    setFishTaggedText(built);
    onTaggedScriptChange?.(built);
    toast('Tags Fish geradas a partir do roteiro.');
  };

  const handleGenerate = async () => {
    if (!narrativeScript.trim() || narrativeScript.trim().length < 40) {
      toast('Texto da narração muito curto — edite o storyboard acima.');
      return;
    }
    if (studioEngine === 'voicebox' && (!voiceboxEngine?.available || !vbVoice || vbVoice === '__configure__')) {
      toast('Voicebox offline ou sem perfil — abra o app e crie um perfil de voz.');
      return;
    }
    if (studioEngine === 'fish' && !fishEngine?.available) {
      toast('Fish Audio indisponível — verifique API key ou servidor local.');
      return;
    }

    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        engine: studioEngine,
        voice: studioEngine === 'fish' ? fishVoice : vbVoice,
        ttsOptions: {
          useTaggedScript: studioEngine === 'fish' ? fishUseTags : vbUseTags,
          customPlainText: narrativeScript.trim() || undefined,
          customTaggedText: studioEngine === 'fish' && fishUseTags ? fishTaggedText : undefined,
          fish: studioEngine === 'fish' ? {
            temperature: fishTemperature,
            topP: fishTopP,
            repetitionPenalty: fishRepPenalty,
            chunkLength: fishChunkLength,
            prosodySpeed: fishProsodySpeed,
            cloudModel: fishEngine?.cloudModel,
          } : undefined,
          voicebox: studioEngine === 'voicebox' ? {
            engine: vbEngine,
            language: vbLanguage,
          } : undefined,
        },
      };

      const res = await fetch(getProjectUrl('/api/tts/generate-narration'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data.error || 'Falha na geração'));
      toast(String(data.message || 'Narração gerada! Rode Sincronizar timings (Whisper) abaixo.'));
      if (studioEngine === 'fish' && fishUseTags && onTaggedScriptChange) {
        onTaggedScriptChange(fishTaggedText);
      }
      onUpdated?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar narração TTS.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-4">
      <SectionHeader
        title="Estúdio de voz TTS"
        helpId="tts-voice-studio"
        icon={<Volume2 className="w-4 h-4 text-violet-400" />}
        titleClassName="text-sm text-violet-200"
        subtitle="Gere narracao_mestra_premium.mp3 com Fish Audio (cloud + tags) ou Voicebox (clone local)."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStudioEngine('fish')}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            studioEngine === 'fish'
              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
              : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Fish Audio
        </button>
        <button
          type="button"
          onClick={() => setStudioEngine('voicebox')}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            studioEngine === 'voicebox'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
              : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Voicebox
        </button>
        <button
          type="button"
          onClick={() => { void loadEngines(); }}
          disabled={loadingEngines}
          className="text-[10px] px-2 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 ml-auto"
        >
          {loadingEngines ? 'Atualizando...' : 'Atualizar vozes'}
        </button>
      </div>

      {activeEngine && (
        <div className="space-y-1">
          <p className={`text-[9px] px-2 py-1 rounded-lg border ${
            activeEngine.available
              ? 'text-emerald-300/90 border-emerald-500/25 bg-emerald-500/5'
              : 'text-amber-300/90 border-amber-500/25 bg-amber-500/5'
          }`}>
            {activeEngine.available ? activeEngine.hint : (activeEngine.hint || 'Motor offline')}
            {activeEngine.serverUrl ? ` | ${activeEngine.serverUrl}` : ''}
          </p>
          {studioEngine === 'voicebox' && activeEngine.available && activeEngine.gpuAvailable === false && (
            <p className="text-[8px] text-zinc-500 px-2 leading-relaxed">
              GPU nao detectada — Voicebox usa CPU ({activeEngine.backendType || 'pytorch'}). Funciona normalmente, mas a geracao demora mais.
              Com placa NVIDIA e drivers CUDA, reinicie o app Voicebox para tentar acelerar.
            </p>
          )}
        </div>
      )}

      {studioEngine === 'fish' && (
        <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-zinc-950/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Voz (biblioteca Fish)</span>
              <div className="flex gap-2">
                <select
                  value={fishVoice}
                  onChange={(e) => setFishVoice(e.target.value)}
                  className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
                >
                  {fishVoicesGrouped.map(([group, voices]) => (
                    <optgroup key={group} label={group}>
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={fishPreviewing || !fishEngine?.available}
                  onClick={() => { void handleFishPreview(); }}
                  className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition disabled:opacity-40"
                  title="Gerar e ouvir amostra curta com a voz selecionada"
                >
                  {fishPreviewing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />}
                  Ouvir
                </button>
                {fishPreviewPlaying && (
                  <button
                    type="button"
                    onClick={stopFishPreview}
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    title="Parar amostra"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[8px] text-zinc-600 leading-relaxed">
                Amostra: {fishPreviewSample || fishPreviewText}
              </p>
            </div>

            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Temperatura ({fishTemperature})</span>
              <input type="range" min={0.3} max={1} step={0.05} value={fishTemperature}
                onChange={(e) => setFishTemperature(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Top P ({fishTopP})</span>
              <input type="range" min={0.3} max={1} step={0.05} value={fishTopP}
                onChange={(e) => setFishTopP(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Repetição ({fishRepPenalty})</span>
              <input type="range" min={1} max={1.5} step={0.05} value={fishRepPenalty}
                onChange={(e) => setFishRepPenalty(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Velocidade ({fishProsodySpeed}x)</span>
              <input type="range" min={0.75} max={1.25} step={0.05} value={fishProsodySpeed}
                onChange={(e) => setFishProsodySpeed(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[9px] text-zinc-500">Chunk length ({fishChunkLength} chars)</span>
              <input type="range" min={100} max={300} step={10} value={fishChunkLength}
                onChange={(e) => setFishChunkLength(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={fishUseTags}
              onChange={(e) => setFishUseTags(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Usar roteiro com tags Fish ([ênfase], [pausa], etc.)
          </label>

          {fishUseTags && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={autoGenerateFishTags}
                  className="text-[9px] font-bold px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" /> Auto-tags IA
                </button>
                {FISH_TAG_CHIPS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertFishTag(tag)}
                    className="text-[8px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-cyan-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={fishTaggedText}
                onChange={(e) => setFishTaggedText(e.target.value)}
                rows={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] text-cyan-100/90 font-mono leading-relaxed resize-y min-h-[140px]"
                placeholder="[tom de narrador documental...]&#10;&#10;Texto com [ênfase] palavras-chave e [pausa] entre frases..."
              />
              <p className="text-[8px] text-zinc-600">
                Modelo: {fishEngine?.cloudModel || 's2.1-pro-free'} · {narrativeScript.length} chars no storyboard
              </p>
            </div>
          )}
        </div>
      )}

      {studioEngine === 'voicebox' && (
        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-zinc-950/50 p-3">
          <label className="space-y-1 block">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">Perfil de voz</span>
            <select
              value={vbVoice}
              onChange={(e) => setVbVoice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200"
            >
              {(voiceboxEngine?.voices || []).map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === '__configure__'}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          {!voiceboxEngine?.available && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5 text-[9px] text-amber-200/90">
              <p className="font-bold">Voicebox offline</p>
              <p className="text-amber-200/70 leading-relaxed">
                No PowerShell, na pasta do Lumiera: <code className="text-amber-100">.\scripts\start-voicebox.ps1</code>
                {' '}— usa o app instalado (porta 17493) ou Docker (17600). Docker Desktop precisa estar aberto para Docker.
              </p>
              <a
                href="https://voicebox.sh/download/windows"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-300 inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Instalar Voicebox MSI (recomendado no Windows)
              </a>
            </div>
          )}

          {vbVoice === '__configure__' && voiceboxEngine?.available && (
            <p className="text-[10px] text-amber-300/90">
              Crie um perfil no app Voicebox (aba Voices) e clique em Atualizar vozes.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Engine TTS</span>
              <select
                value={vbEngine}
                onChange={(e) => setVbEngine(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
              >
                {VOICEBOX_ENGINES.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[9px] text-zinc-500">Idioma</span>
              <select
                value={vbLanguage}
                onChange={(e) => setVbLanguage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
              >
                <option value="pt">Português (pt)</option>
                <option value="en">English (en)</option>
                <option value="es">Español (es)</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={vbUseTags}
              onChange={(e) => setVbUseTags(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Usar narrative_script_tagged (se existir no storyboard)
          </label>
        </div>
      )}

      <button
        type="button"
        disabled={generating || !activeEngine?.available}
        onClick={() => { void handleGenerate(); }}
        className="w-full inline-flex items-center justify-center gap-2 text-[11px] font-bold py-2.5 px-4 rounded-xl border border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 transition disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        {generating ? 'Gerando narração...' : `Gerar MP3 com ${studioEngine === 'fish' ? 'Fish Audio' : 'Voicebox'}`}
      </button>

      <p className="text-[8px] text-zinc-600 flex items-start gap-1">
        <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-zinc-500" />
        Após gerar, use <strong className="text-zinc-500">Sincronizar timings (Whisper)</strong> no painel acima para alinhar blocos e legendas.
      </p>
    </div>
  );
}