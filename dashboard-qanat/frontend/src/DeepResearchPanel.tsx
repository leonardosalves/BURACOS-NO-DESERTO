import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Loader2, Search, Sparkles } from 'lucide-react';

type DeepResearchResult = {
  report?: { markdown?: string; derivedIdeas?: { title?: string; hookPt?: string }[] };
  editorialQueue?: { enqueued?: number; total?: number };
  obsidian?: { memoryFile?: string };
  artifacts?: {
    web?: { available?: boolean };
    exa?: { available?: boolean };
    notebooklm?: { available?: boolean };
    competitors?: { outlierCount?: number };
  };
};

type DeepResearchPanelProps = {
  niche?: string;
  format: 'SHORTS' | 'LONGO';
  getProjectUrl: (endpoint: string) => string;
  onOpenObsidian?: (file: string) => void;
  obsidianInstalled?: boolean;
};

export function DeepResearchPanel({
  niche = 'Geral',
  format,
  getProjectUrl,
  onOpenObsidian,
  obsidianInstalled = false,
}: DeepResearchPanelProps) {
  const [topic, setTopic] = useState('');
  const [notebooklmDeep, setNotebooklmDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runDeepResearch = async () => {
    const t = topic.trim();
    if (!t) {
      toast.error('Descreva o tema da pesquisa.');
      return;
    }
    setBusy(true);
    setResult(null);
    const toastId = 'deep-research';
    try {
      toast.loading('Pesquisa profunda em andamento…', { id: toastId });
      const res = await fetch(getProjectUrl('/api/research/deep'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: t,
          niche,
          format,
          notebooklmDeep,
          enqueueIdeas: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || data.details || 'Falha na pesquisa'));
      setResult(data);
      setExpanded(true);
      const ideas = data.report?.derivedIdeas?.length || 0;
      toast.success(`Relatório pronto${ideas ? ` · ${ideas} ideia(s) na fila` : ''}`, { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na pesquisa', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const legs = result?.artifacts;
  const legLabels = [
    legs?.web?.available ? 'Web' : null,
    legs?.exa?.available ? 'Exa' : null,
    legs?.notebooklm?.available ? 'NotebookLM' : null,
    legs?.competitors ? `YouTube (${legs.competitors.outlierCount || 0} outliers)` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-violet-300" />
        <p className="text-xs font-bold uppercase tracking-wider text-violet-200/90">
          Pesquisa profunda (DeerFlow)
        </p>
      </div>
      <p className="text-[10px] text-zinc-400 leading-relaxed">
        Planner → pesquisadores paralelos (web, Exa, concorrentes, NotebookLM) → relatório em Obsidian e ideias na fila editorial.
      </p>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={2}
        placeholder="Ex: tendências de retenção em Shorts de engenharia antiga; o que canais de curiosidades fazem diferente"
        className="w-full text-xs bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 placeholder:text-zinc-600"
      />
      <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={notebooklmDeep}
          onChange={(e) => setNotebooklmDeep(e.target.checked)}
          className="rounded border-zinc-700"
        />
        NotebookLM modo deep (~5 min, mais fontes)
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runDeepResearch()}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Gerar relatório de pesquisa
      </button>

      {result && (
        <div className="border-t border-zinc-800/80 pt-3 space-y-2">
          {legLabels.length > 0 && (
            <p className="text-[9px] text-zinc-500">
              Fontes: {legLabels.join(' · ')}
              {result.editorialQueue?.enqueued
                ? ` · ${result.editorialQueue.enqueued} ideia(s) enfileirada(s)`
                : ''}
            </p>
          )}
          {result.obsidian?.memoryFile && obsidianInstalled && onOpenObsidian && (
            <button
              type="button"
              onClick={() => onOpenObsidian(result.obsidian!.memoryFile!)}
              className="text-[10px] text-violet-300 hover:text-violet-200 flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              Abrir {result.obsidian.memoryFile}
            </button>
          )}
          {result.report?.markdown && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                {expanded ? 'Ocultar relatório' : 'Ver relatório'}
              </button>
              {expanded && (
                <pre className="text-[9px] text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto bg-zinc-950/60 rounded-lg p-3 border border-zinc-800/60">
                  {result.report.markdown}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}