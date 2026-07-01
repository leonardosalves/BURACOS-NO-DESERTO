import React, { useRef } from 'react';
import { ZoomIn, ZoomOut, Trash2, FileJson, Palette } from 'lucide-react';
import { CANVAS_BG_PRESETS } from './opencutTimeline';

type Props = {
  previewZoom: number;
  onPreviewZoomChange: (z: number) => void;
  canvasBackground: string;
  onCanvasBackgroundChange: (color: string) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  getProjectUrl: (path: string) => string;
  onTranscriptImported: () => void;
  toast: (msg: string) => void;
};

export function TimelineOpenCutBar({
  previewZoom,
  onPreviewZoomChange,
  canvasBackground,
  onCanvasBackgroundChange,
  selectedCount,
  onBulkDelete,
  onClearSelection,
  getProjectUrl,
  onTranscriptImported,
  toast,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const importTranscript = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch(getProjectUrl('/api/workflow/import-transcript'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Importação falhou');
      toast(`Transcrição importada — ${data.wordCount ?? '?'} palavras`);
      onTranscriptImported();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao importar JSON');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 shrink-0">OpenCut</span>

      <div className="flex items-center gap-1.5" title="Zoom do preview (OpenCut v0.3)">
        <ZoomOut className="w-3 h-3 text-zinc-600" />
        <input
          type="range"
          min={50}
          max={150}
          step={5}
          value={previewZoom}
          onChange={(e) => onPreviewZoomChange(Number(e.target.value))}
          className="w-20 accent-sky-500"
        />
        <ZoomIn className="w-3 h-3 text-zinc-600" />
        <span className="text-[9px] text-zinc-500 tabular-nums w-8">{previewZoom}%</span>
      </div>

      <div className="flex items-center gap-1.5" title="Fundo do canvas no render">
        <Palette className="w-3 h-3 text-zinc-600 shrink-0" />
        <select
          value={CANVAS_BG_PRESETS.find((p) => p.color === canvasBackground)?.id || 'custom'}
          onChange={(e) => {
            const preset = CANVAS_BG_PRESETS.find((p) => p.id === e.target.value);
            if (preset) onCanvasBackgroundChange(preset.color);
          }}
          className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1"
        >
          {CANVAS_BG_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
          <option value="custom">Personalizado</option>
        </select>
        <input
          type="color"
          value={canvasBackground || '#050506'}
          onChange={(e) => onCanvasBackgroundChange(e.target.value)}
          className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer"
          title="Cor de fundo do canvas"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importTranscript(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-sky-300 hover:border-sky-500/30 transition flex items-center gap-1"
        title="Importar word_transcripts.json (OpenCut: transcript → captions)"
      >
        <FileJson className="w-3 h-3" /> Importar transcrição
      </button>

      {selectedCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-zinc-500 tabular-nums">{selectedCount} selecionado(s)</span>
          <button
            type="button"
            onClick={onBulkDelete}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Excluir
          </button>
          <button type="button" onClick={onClearSelection} className="text-[10px] text-zinc-500 hover:text-zinc-300">
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}