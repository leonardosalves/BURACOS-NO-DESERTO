import React, { useRef } from 'react';
import { ZoomIn, ZoomOut, Trash2, FileJson, Palette } from 'lucide-react';
import { CANVAS_BG_PRESETS } from './opencutTimeline';
import { SettingHelpTip } from './SettingHelpTip';

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
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">OpenCut</span>
        <SettingHelpTip title="Barra OpenCut" align="start">
          Controles inspirados no OpenCut v0.3.0: zoom do preview, fundo do canvas no render, importação de transcrição e exclusão em lote.
          Marque clips com o checkbox ou Shift/Ctrl+clique para selecionar vários.
        </SettingHelpTip>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wide">Zoom</span>
        <SettingHelpTip title="Zoom do preview" align="start">
          Aumenta ou reduz a miniatura dos assets na grade (50–150%) em tempo real. Só afeta a visualização no dashboard — não altera o vídeo final.
        </SettingHelpTip>
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

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wide">Fundo</span>
        <SettingHelpTip title="Fundo do canvas" align="start">
          Cor de fundo nas áreas vazias do vídeo renderizado (letterbox, logo, gaps). Atualiza o fundo dos previews dos cards em tempo real. Salva em config como canvas_background e vai para o Remotion.
        </SettingHelpTip>
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
        />
      </div>

      <div className="flex items-center gap-1.5">
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
        >
          <FileJson className="w-3 h-3" /> Importar transcrição
        </button>
        <SettingHelpTip title="Importar transcrição" align="start">
          Carrega JSON Whisper (array de segmentos ou objeto com segments). Grava word_transcripts.json no projeto para legendas e sincronização com blocos.
        </SettingHelpTip>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-zinc-500 tabular-nums">{selectedCount} selecionado(s)</span>
          <SettingHelpTip title="Exclusão em lote" align="end">
            Remove todos os clips marcados de uma vez. Use o checkbox em cada card ou Shift/Ctrl+clique para multi-seleção. Limpar desmarca sem excluir.
          </SettingHelpTip>
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