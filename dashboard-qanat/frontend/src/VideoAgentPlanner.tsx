import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { GitBranch, Sparkles, ArrowRight, BookOpen, ListOrdered } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type LumieraAction = {
  step: number;
  action: string;
  node: string;
  label: string;
  tab: string;
  description: string;
};

type StoryboardBeat = {
  beat: number;
  visualQuery: string;
  narrationHint: string;
};

type VideoAgentPlan = {
  id: string;
  feasibility: string;
  requirement: string;
  format: string;
  niche: string;
  intents: { explicit: string[]; implicit: string[] };
  lumieraActions: LumieraAction[];
  storyboardBeats: StoryboardBeat[];
  reasoning: string;
  source: string;
  aiEnhanced?: boolean;
};

type ObsidianResult = {
  memoryPath?: string;
  memoryFile?: string;
};

type VideoAgentPlannerProps = {
  projectNiche?: string;
  projectFormat: 'SHORT' | 'LONG';
  getProjectUrl: (endpoint: string) => string;
  onNavigateTab?: (tab: string) => void;
  onOpenObsidian?: (file: string) => void;
  obsidianInstalled?: boolean;
};

const TAB_LABELS: Record<string, string> = {
  creator: 'Creator',
  editor: 'Editor',
  workflow: 'Workflow',
  terminal: 'Terminal',
  ai: 'IA · Metadados',
  upload: 'Upload',
  'youtube-studio': 'Canal YouTube',
};

const EXAMPLE_PROMPTS = [
  'Short viral sobre engenharia antiga — gancho forte e 5 fatos surpreendentes',
  'Pesquisa concorrentes no nicho curiosidades e gerar 3 ideias derivadas',
  'Vídeo longo documental com NotebookLM sobre clepsidras históricas',
  'Diagnóstico pós-upload: retenção caiu e views -30% esta semana',
];

export function VideoAgentPlanner({
  projectNiche = 'Geral',
  projectFormat,
  getProjectUrl,
  onNavigateTab,
  onOpenObsidian,
  obsidianInstalled = false,
}: VideoAgentPlannerProps) {
  const [requirement, setRequirement] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [enqueueQueue, setEnqueueQueue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<VideoAgentPlan | null>(null);
  const [obsidianMeta, setObsidianMeta] = useState<ObsidianResult | null>(null);

  const apiFormat = projectFormat === 'SHORT' ? 'SHORTS' : 'LONGO';

  const runPlan = async () => {
    const text = requirement.trim();
    if (!text) {
      toast.error('Descreva o vídeo ou tarefa em linguagem natural.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(getProjectUrl('/api/ai/video-agent/plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: text,
          format: apiFormat,
          niche: projectNiche,
          useAi,
          enqueueQueue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha no planejamento');

      if (data.needs_browser || data.prompt) {
        toast('Cole a resposta do Gemini no campo ou use a extensão Chrome.', { duration: 6000 });
        return;
      }

      setPlan(data.plan || null);
      setObsidianMeta(data.obsidian || null);
      toast.success(
        data.plan?.aiEnhanced
          ? 'Plano VideoAgent enriquecido com IA'
          : 'Plano VideoAgent gerado (regras locais)',
      );
      if (data.editorialQueue?.enqueued) {
        toast(`Ideia adicionada à fila editorial (${data.editorialQueue.total} itens)`, {
          icon: '📋',
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao planejar');
    } finally {
      setBusy(false);
    }
  };

  const navigateToStep = (tab: string) => {
    if (onNavigateTab && TAB_LABELS[tab]) {
      onNavigateTab(tab);
      toast.success(`Abrindo aba ${TAB_LABELS[tab]}`);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-violet-500/15">
      <SectionHeader
        title="VideoAgent Planner"
        helpId="agents-videoagent"
        icon={<GitBranch className="w-4 h-4 text-violet-400 shrink-0" />}
        subtitle="Adaptação do HKUDS/VideoAgent: analisa seu pedido, detecta intents e monta a cadeia de agentes Lumiera com storyboard beats."
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setRequirement(ex)}
            className="text-[10px] px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-violet-500/30 hover:text-violet-200 transition"
          >
            {ex.slice(0, 48)}…
          </button>
        ))}
      </div>

      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        rows={3}
        placeholder="Ex.: Criar Short viral sobre 3 máquinas antigas que ainda funcionam, com pesquisa NotebookLM e metadados SEO"
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none resize-y min-h-[80px]"
      />

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            className="rounded border-zinc-700"
          />
          Enriquecer com IA (Gemini)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enqueueQueue}
            onChange={(e) => setEnqueueQueue(e.target.checked)}
            className="rounded border-zinc-700"
          />
          Enviar título à fila editorial
        </label>
        <span className="text-zinc-600">
          Formato:{' '}
          <span className={projectFormat === 'SHORT' ? 'text-amber-400' : 'text-sky-400'}>
            {projectFormat === 'SHORT' ? 'Shorts' : 'Longo'}
          </span>
          {' · '}
          Nicho: <span className="text-zinc-300">{projectNiche}</span>
        </span>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={runPlan}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 border border-violet-500/40 text-xs font-bold text-violet-300 hover:from-violet-500/30 transition disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {busy ? 'Planejando…' : 'Gerar plano VideoAgent'}
      </button>

      {plan && (
        <div className="space-y-4 border-t border-zinc-800 pt-4 animate-fade-in">
          <div className="flex flex-wrap gap-3 text-xs">
            <span
              className={`px-3 py-1.5 rounded-lg border ${
                plan.feasibility === 'Feasible'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {plan.feasibility}
            </span>
            {plan.aiEnhanced ? (
              <span className="px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200">
                IA ativa
              </span>
            ) : null}
            <span className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400">
              {(plan.lumieraActions || []).length} etapas
            </span>
          </div>

          {(plan.intents?.explicit?.length > 0 || plan.intents?.implicit?.length > 0) && (
            <div className="text-xs space-y-1">
              {plan.intents.explicit?.length > 0 && (
                <p>
                  <span className="text-zinc-500">Intents: </span>
                  <span className="text-zinc-300">{plan.intents.explicit.join(' · ')}</span>
                </p>
              )}
              {plan.intents.implicit?.length > 0 && (
                <p>
                  <span className="text-zinc-500">Implícitos: </span>
                  <span className="text-zinc-400">{plan.intents.implicit.join(' · ')}</span>
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-400 leading-relaxed">{plan.reasoning}</p>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-1.5">
              <ListOrdered className="w-3 h-3" />
              Cadeia de agentes
            </p>
            <ol className="space-y-2">
              {(plan.lumieraActions || []).map((action) => (
                <li
                  key={`${action.step}-${action.action}`}
                  className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200">
                      <span className="text-violet-400/80 tabular-nums mr-2">{action.step}.</span>
                      {action.label}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{action.description}</p>
                  </div>
                  {onNavigateTab && TAB_LABELS[action.tab] ? (
                    <button
                      type="button"
                      onClick={() => navigateToStep(action.tab)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:border-violet-500/40 hover:text-violet-300 transition"
                    >
                      {TAB_LABELS[action.tab]}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {(plan.storyboardBeats || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                Storyboard beats
              </p>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {plan.storyboardBeats.map((b) => (
                  <li
                    key={b.beat}
                    className="text-xs px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 text-zinc-400"
                  >
                    <span className="text-violet-400/70 font-mono text-[10px]">#{b.beat}</span>{' '}
                    {b.visualQuery}
                    <span className="block text-[10px] text-zinc-500 mt-0.5 italic">{b.narrationHint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {obsidianInstalled && onOpenObsidian && obsidianMeta?.memoryFile ? (
            <button
              type="button"
              onClick={() => onOpenObsidian(`memory/${obsidianMeta.memoryFile}`)}
              className="flex items-center gap-2 text-[11px] text-violet-400 hover:text-violet-300 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Abrir plano no Obsidian
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}