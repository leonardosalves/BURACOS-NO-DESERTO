import React, { useMemo } from 'react';
import { RefreshCw, Check, Mic, Sparkles } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type BlockPhrase = { block: number; phrase: string };

type Props = {
  narrativeScript: string;
  narrativeScriptTagged: string;
  strategyHook?: string;
  strategyTitle?: string;
  blockPhrases?: BlockPhrase[];
  blockScript?: string;
  notebooklmEnriched?: boolean;
  loading: boolean;
  loadingMode: 'narration' | 'full' | 'idle';
  onNarrativeChange: (value: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
};

function splitBlockParagraphs(blockScript?: string) {
  if (!blockScript?.trim()) return [];
  return blockScript.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

export function NarrationReviewPanel({
  narrativeScript,
  narrativeScriptTagged,
  strategyHook,
  strategyTitle,
  blockPhrases = [],
  blockScript,
  notebooklmEnriched,
  loading,
  loadingMode,
  onNarrativeChange,
  onRegenerate,
  onApprove,
}: Props) {
  const wordCount = narrativeScript.trim() ? narrativeScript.trim().split(/\s+/).length : 0;
  const paragraphs = useMemo(() => splitBlockParagraphs(blockScript), [blockScript]);
  const showBlocks = blockPhrases.length > 0 && paragraphs.length > 0;

  return (
    <div className="mt-6 border border-gold-500/25 bg-gold-500/5 rounded-2xl p-5 space-y-4 font-sans">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gold-500/15 border border-gold-500/20">
          <Mic className="w-4 h-4 text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="Revise a narração antes do roteiro"
            helpId="narration-review"
            subtitle="Edite o texto até soar natural. Só depois de aprovar a IA monta os blocos, prompts visuais e estratégia completa."
          />
          {notebooklmEnriched && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300/90 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
              <Sparkles className="w-3 h-3" />
              Enriquecida com NotebookLM
            </p>
          )}
          {(strategyTitle || strategyHook) && (
            <div className="mt-2 text-[10px] text-zinc-500 space-y-0.5">
              {strategyTitle && <p><span className="text-zinc-600 uppercase font-bold">Título:</span> {strategyTitle}</p>}
              {strategyHook && <p><span className="text-zinc-600 uppercase font-bold">Gancho:</span> {strategyHook}</p>}
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 font-mono shrink-0">{wordCount} palavras</span>
      </div>

      {showBlocks && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Narração por bloco</p>
          <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
            {blockPhrases.map((bp, idx) => (
              <div
                key={bp.block}
                className="flex gap-3 p-3 bg-zinc-950/70 border border-zinc-900 rounded-xl text-xs"
              >
                <span className="shrink-0 w-6 h-6 rounded-lg bg-gold-500/15 text-gold-400 font-bold text-[10px] flex items-center justify-center">
                  {bp.block}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-gold-400/90 font-bold text-[10px] uppercase tracking-wide">{bp.phrase}</p>
                  <p className="text-zinc-300 leading-relaxed">{paragraphs[idx] || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        rows={14}
        value={narrativeScript}
        onChange={(e) => onNarrativeChange(e.target.value)}
        disabled={loading}
        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-sm text-white leading-relaxed resize-y min-h-[200px]"
        placeholder="A narração aparecerá aqui para você revisar..."
      />

      {narrativeScriptTagged.trim() && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-400 font-bold uppercase tracking-wider">
            Ver narração com tags de áudio (TTS)
          </summary>
          <pre className="mt-2 p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg text-zinc-400 whitespace-pre-wrap text-[11px] leading-relaxed max-h-40 overflow-y-auto">
            {narrativeScriptTagged}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-zinc-900/60">
        <button
          type="button"
          disabled={loading}
          onClick={onRegenerate}
          className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer border border-zinc-800"
        >
          {loading && loadingMode === 'narration' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Regenerar narração</span>
        </button>
        <button
          type="button"
          disabled={loading || !narrativeScript.trim()}
          onClick={onApprove}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10"
        >
          {loading && loadingMode === 'full' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>Aprovar e gerar roteiro completo</span>
        </button>
      </div>
    </div>
  );
}