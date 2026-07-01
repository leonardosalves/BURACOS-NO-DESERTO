import React, { useCallback, useRef, useState } from 'react';
import {
  CheckCircle, Loader2, Mic, Play, RefreshCw, Upload, Volume2, AlertTriangle,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl: (fileName: string) => string;
  toast: (msg: string) => void;
  hasNarration?: boolean;
  hasTimings?: boolean;
  onUpdated?: () => void;
  narrativeScript?: string;
  onNarrativeChange?: (value: string) => void;
  onSaveScript?: () => void;
  showScriptEdit?: boolean;
  compact?: boolean;
};

export function NarrationReplacePanel({
  getProjectUrl,
  getMediaUrl,
  toast,
  hasNarration = false,
  hasTimings = false,
  onUpdated,
  narrativeScript = '',
  onNarrativeChange,
  onSaveScript,
  showScriptEdit = false,
  compact = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOk, setUploadOk] = useState(false);
  const [needsResync, setNeedsResync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [audioKey, setAudioKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const narrationUrl = `${getMediaUrl('narracao_mestra_premium.mp3')}?v=${audioKey}`;

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.match(/audio\/(mpeg|mp3)/) && !file.name.toLowerCase().endsWith('.mp3')) {
      toast('Selecione um arquivo MP3 de narração.');
      return;
    }
    setUploading(true);
    setUploadOk(false);
    try {
      const res = await fetch(getProjectUrl('/api/upload-narration'), {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data.error || data.details || 'Falha no upload'));
      }
      setUploadOk(true);
      setNeedsResync(true);
      setAudioKey((k) => k + 1);
      toast(data.message || 'Narração substituída com sucesso!');
      onUpdated?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao enviar narração.');
    } finally {
      setUploading(false);
    }
  }, [getProjectUrl, onUpdated, toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);
    setSyncLogs([]);
    const es = new EventSource(getProjectUrl('/api/sync-timings'));
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setSyncLogs((prev) => [...prev, data.text]);
        } else if (data.type === 'complete') {
          setSyncLogs((prev) => [...prev, '=== Sincronização completa ===']);
          setNeedsResync(false);
          setSyncing(false);
          es.close();
          toast('Timings sincronizados com a nova narração.');
          onUpdated?.();
        } else if (data.type === 'failed') {
          setSyncLogs((prev) => [...prev, `=== Falha (código ${data.code}) ===`]);
          setSyncing(false);
          es.close();
          toast('Falha na sincronização. Veja os logs abaixo.');
        }
      } catch {
        /* ignore malformed SSE */
      }
    };
    es.onerror = () => {
      setSyncing(false);
      es.close();
      toast('Conexão com sincronizador perdida.');
    };
  };

  const togglePreview = async () => {
    if (!hasNarration && !uploadOk) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    try {
      const head = await fetch(narrationUrl, { method: 'HEAD' });
      const contentType = head.headers.get('content-type') || '';
      if (!head.ok || !contentType.includes('audio')) {
        toast('MP3 não encontrado para este projeto. Clique em Carregar Projeto no Editor.');
        return;
      }
      const audio = new Audio(narrationUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlaying(false);
        audioRef.current = null;
        toast('Erro ao reproduzir narração (arquivo inválido ou inacessível).');
      };
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      audioRef.current = null;
      toast('Erro ao reproduzir narração.');
    }
  };

  const showResyncWarning = needsResync || (hasNarration && !hasTimings);

  return (
    <div className={`space-y-3 min-w-0 ${compact ? '' : 'rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5'}`}>
      {!compact && (
        <SectionHeader
          title="Trocar narração"
          helpId="narration-replace"
          icon={<Mic className="w-3.5 h-3.5 text-emerald-400" />}
          titleClassName="text-xs"
          subtitle="Substitua o MP3 master ou edite o texto — depois sincronize com Whisper para realinhar legendas e blocos."
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${hasNarration || uploadOk ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}`}>
          {hasNarration || uploadOk ? 'MP3 no workspace ✓' : 'Sem MP3'}
        </span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${hasTimings && !needsResync ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
          {hasTimings && !needsResync ? 'Sync ✓' : 'Re-sync necessário'}
        </span>
      </div>

      {showResyncWarning && (
        <div className="text-[9px] px-2 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            Após trocar o áudio, rode a sincronização Whisper para atualizar <code className="text-amber-200/80">word_transcripts.json</code> e <code className="text-amber-200/80">block_timings.json</code>.
          </span>
        </div>
      )}

      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 transition ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : uploadOk || hasNarration
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-zinc-800 bg-zinc-950/30'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            <span className="text-[10px] text-zinc-400">Enviando narracao_mestra_premium.mp3...</span>
          </>
        ) : uploadOk ? (
          <>
            <CheckCircle className="w-7 h-7 text-emerald-500" />
            <span className="text-[10px] font-bold text-white">Narração atualizada</span>
          </>
        ) : hasNarration ? (
          <>
            <Volume2 className="w-7 h-7 text-emerald-500/80" />
            <span className="text-[10px] text-zinc-300">narracao_mestra_premium.mp3 no projeto</span>
          </>
        ) : (
          <>
            <Upload className="w-7 h-7 text-zinc-600" />
            <span className="text-[10px] text-zinc-400">Arraste um MP3 ou clique para selecionar</span>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/mpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = '';
          }}
        />

        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition disabled:opacity-50"
          >
            {hasNarration || uploadOk ? 'Substituir MP3' : 'Selecionar MP3'}
          </button>
          {(hasNarration || uploadOk) && (
            <button
              type="button"
              onClick={togglePreview}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition flex items-center gap-1"
            >
              {playing ? <RefreshCw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {playing ? 'Parar' : 'Ouvir'}
            </button>
          )}
        </div>
      </div>

      {showScriptEdit && onNarrativeChange && (
        <div className="space-y-1.5">
          <label className="text-[9px] text-zinc-500 uppercase tracking-wide font-bold block">
            Texto da narração (storyboard)
          </label>
          <textarea
            value={narrativeScript}
            onChange={(e) => onNarrativeChange(e.target.value)}
            rows={6}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-200 leading-relaxed resize-y min-h-[120px]"
            placeholder="Edite o narrative_script antes de gerar TTS ou sincronizar..."
          />
          {onSaveScript && (
            <button
              type="button"
              onClick={onSaveScript}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
            >
              Salvar texto no storyboard
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={syncing || (!hasNarration && !uploadOk)}
        onClick={handleSync}
        className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 px-3 rounded-xl border border-gold-500/30 bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 transition disabled:opacity-50"
      >
        {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        {syncing ? 'Sincronizando com Whisper...' : 'Sincronizar timings (Whisper)'}
      </button>

      {syncLogs.length > 0 && (
        <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 font-mono text-[8px] text-zinc-500 space-y-0.5">
          {syncLogs.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}