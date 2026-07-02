import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  GitBranch,
  Sparkles,
  ArrowRight,
  BookOpen,
  ListOrdered,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { OpenMontageReferencePanel } from './OpenMontageReferencePanel';
import { DeepResearchPanel } from './DeepResearchPanel';
import type { GeminiBrowserRequest } from './geminiAiFetch';

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

type ExecuteResult = {
  step: string;
  status: string;
  error?: string;
  message?: string;
  derivedIdeas?: number;
  editorialQueue?: { enqueued?: number; total?: number };
  variations?: number;
  total?: number;
};

type ObsidianResult = {
  memoryPath?: string;
  memoryFile?: string;
};

type PostAiFn = (
  path: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; data: GeminiBrowserRequest & Record<string, unknown> }>;

type VideoAgentPlannerProps = {
  projectNiche?: string;
  projectFormat: 'SHORT' | 'LONG';
  getProjectUrl: (endpoint: string) => string;
  postAi: PostAiFn;
  onNavigateTab?: (tab: string) => void;
  onOpenObsidian?: (file: string) => void;
  obsidianInstalled?: boolean;
  onExecuteCreator?: (
    title: string,
    hook: string,
    options?: { format?: 'LONGO' | 'SHORTS' },
  ) => Promise<void>;
};

const TAB_LABELS: Record<string, string> = {
  creator: 'Creator',
  editor: 'Editor',
  workflow: 'Workflow',
  terminal: 'Terminal',
  ai: 'IA · Metadados',
  upload: 'Upload',
  'youtube-studio': 'Canal YouTube',
  status: 'Render',
};

const EXAMPLE_PROMPTS = [
  'Short viral sobre engenharia antiga — gancho forte e 5 fatos surpreendentes',
  'Pesquisa profunda: tendências Shorts de engenharia antiga + relatório',
  'Pesquisa concorrentes no nicho curiosidades e gerar 3 ideias derivadas',
  'Vídeo longo documental com NotebookLM sobre clepsidras históricas',
  'Diagnóstico pós-upload: retenção caiu e views -30% esta semana',
  'Inspirado em vídeo de referência — use o painel OpenMontage acima',
];

const STEP_LABELS: Record<string, string> = {
  creator_pipeline: 'Creator — projeto + narração',
  deep_research: 'Pesquisa profunda',
  competitor_research: 'Pesquisa concorrentes',
  editorial_queue: 'Fila editorial',
  top_winners: 'Replicar top 3',
  retention_cliff: 'Penhasco de retenção',
  overlay_plan: 'Planejar overlays',
};

export function VideoAgentPlanner({
  projectNiche = 'Geral',
  projectFormat,
  getProjectUrl,
  postAi,
  onNavigateTab,
  onOpenObsidian,
  obsidianInstalled = false,
  onExecuteCreator,
}: VideoAgentPlannerProps) {
  const [requirement, setRequirement] = useState('');
  const [useAi, setUseAi] = useState(false);
  const [enqueueQueue, setEnqueueQueue] = useState(false);
  const [busy, setBusy] = useState<'plan' | 'execute' | null>(null);
  const [plan, setPlan] = useState<VideoAgentPlan | null>(null);
  const [obsidianMeta, setObsidianMeta] = useState<ObsidianResult | null>(null);
  const [executeResults, setExecuteResults] = useState<ExecuteResult[] | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

  const apiFormat = projectFormat === 'SHORT' ? 'SHORTS' : 'LONGO';

  const requestPlan = async (opts: { useAi: boolean; viaPostAi?: boolean }) => {
    const text = requirement.trim();
    if (!text) throw new Error('Descreva o vídeo ou tarefa em linguagem natural.');

    const payload = {
      requirement: text,
      format: apiFormat,
      niche: projectNiche,
      useAi: opts.useAi,
      enqueueQueue,
    };
    const url = getProjectUrl('/api/ai/video-agent/plan');
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    let ok = false;
    let data: Record<string, unknown> = {};

    if (opts.viaPostAi) {
      const aiRes = await postAi(url, init);
      ok = aiRes.ok;
      data = aiRes.data as Record<string, unknown>;
    } else {
      const res = await fetch(url, init);
      data = await res.json().catch(() => ({}));
      ok = res.ok;
    }

    if (!ok) {
      const detail = data.details ? ` (${String(data.details)})` : '';
      throw new Error(String(data.error || 'Falha no planejamento') + detail);
    }

    const planData = data.plan as VideoAgentPlan | undefined;
    if (!planData?.lumieraActions?.length) {
      throw new Error('Plano vazio — reformule o pedido.');
    }

    if (data.fallback && data.warning) {
      console.warn('[VideoAgent] plano local (fallback):', data.warning);
    }

    return {
      plan: planData,
      obsidian: data.obsidian as ObsidianResult | undefined,
      aiEnhanced: Boolean(planData.aiEnhanced || data.aiEnhanced),
    };
  };

  const runPlan = async () => {
    setBusy('plan');
    setExecuteResults(null);
    try {
      const result = await requestPlan({ useAi: false, viaPostAi: false });
      setPlan(result.plan);
      setObsidianMeta(result.obsidian || null);
      setPlanExpanded(true);

      if (useAi) {
        try {
          const enriched = await requestPlan({ useAi: true, viaPostAi: true });
          setPlan(enriched.plan);
          setObsidianMeta(enriched.obsidian || null);
          toast.success('Plano enriquecido com IA');
        } catch {
          toast.success('Plano local pronto (IA indisponível — use regras locais)');
        }
      } else {
        toast.success('Plano gerado');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao planejar');
    } finally {
      setBusy(null);
    }
  };

  const runExecute = async () => {
    const text = requirement.trim();
    if (!text) {
      toast.error('Descreva o vídeo ou tarefa em linguagem natural.');
      return;
    }

    setBusy('execute');
    setExecuteResults(null);
    setPlanExpanded(false);
    const toastId = 'videoagent-execute';

    try {
      toast.loading('VideoAgent executando cadeia…', { id: toastId });

      const { ok, data } = await postAi('/api/ai/video-agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: text,
          format: apiFormat,
          niche: projectNiche,
          useAi: false,
          plan: plan || undefined,
        }),
      });

      if (!ok) throw new Error(String(data.error || data.details || 'Falha na execução'));

      const results = (data.results || []) as ExecuteResult[];
      const deferred = (data.deferred || []) as { step: string; tab?: string }[];
      const creatorTrigger = data.creatorTrigger as {
        title?: string;
        hook?: string;
        format?: string;
      } | null;

      setPlan((data.plan as VideoAgentPlan) || plan);
      setExecuteResults(results);

      if (creatorTrigger?.title && onExecuteCreator) {
        const fmt = creatorTrigger.format === 'LONGO' ? 'LONGO' : 'SHORTS';
        try {
          await onExecuteCreator(creatorTrigger.title, creatorTrigger.hook || '', { format: fmt });
          const idx = results.findIndex((r) => r.step === 'creator_pipeline');
          if (idx >= 0) {
            results[idx] = {
              ...results[idx],
              status: 'ok',
              message: `Projeto "${creatorTrigger.title.slice(0, 48)}" — narração em andamento`,
            };
          }
        } catch (err: unknown) {
          const idx = results.findIndex((r) => r.step === 'creator_pipeline');
          if (idx >= 0) {
            results[idx] = {
              ...results[idx],
              status: 'error',
              error: err instanceof Error ? err.message : 'Falha no Creator',
            };
          }
        }
      }

      for (const item of deferred) {
        if (item.step === 'overlay_plan') {
          const overlayRes = await postAi('/api/studio-agents/plan-overlays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hyperframes: true }),
          });
          if (overlayRes.ok) {
            results.push({
              step: 'overlay_plan',
              status: 'ok',
              message: `${overlayRes.data.overlayCount ?? 0} overlays planejados`,
            });
          } else {
            results.push({
              step: 'overlay_plan',
              status: 'error',
              error: String(overlayRes.data.error || 'Falha overlays'),
            });
          }
        } else if (item.tab && onNavigateTab) {
          onNavigateTab(item.tab);
        }
      }

      setExecuteResults([...results]);

      const okCount = results.filter((r) => r.status === 'ok' || r.status === 'pending_ui').length;
      const errCount = results.filter((r) => r.status === 'error').length;

      if (errCount === 0) {
        toast.success(`Automação concluída — ${okCount} etapa(s) processada(s)`, { id: toastId });
      } else {
        toast(`Concluído com ${errCount} aviso(s) — veja o log abaixo`, { id: toastId, icon: '⚠️' });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na automação', { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const navigateToStep = (tab: string) => {
    if (onNavigateTab && TAB_LABELS[tab]) {
      onNavigateTab(tab);
      toast.success(`Abrindo aba ${TAB_LABELS[tab]}`);
    }
  };

  return (
    <div className="space-y-4">
    <OpenMontageReferencePanel
      projectNiche={projectNiche}
      projectFormat={projectFormat}
      getProjectUrl={getProjectUrl}
      postAi={postAi}
      onApplyRequirement={(text) => setRequirement(text)}
      onApplyCreator={
        onExecuteCreator
          ? (title, hook) => {
              setRequirement(
                `${title}${hook ? ` — gancho: ${hook}` : ''}`,
              );
              void onExecuteCreator(title, hook, {
                format: projectFormat === 'SHORT' ? 'SHORTS' : 'LONGO',
              });
            }
          : undefined
      }
    />

    <DeepResearchPanel
      niche={projectNiche}
      format={apiFormat}
      getProjectUrl={getProjectUrl}
      onOpenObsidian={onOpenObsidian}
      obsidianInstalled={obsidianInstalled}
    />

    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-violet-500/15">
      <SectionHeader
        title="VideoAgent — Automação"
        helpId="agents-videoagent"
        icon={<GitBranch className="w-4 h-4 text-violet-400 shrink-0" />}
        subtitle="Descreva o vídeo em linguagem natural. O Lumiera detecta intents, executa o que for possível (Creator, pesquisa, fila, overlays) e mostra o restante com atalhos de aba."
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
          Enriquecer plano com IA (opcional, após preview local)
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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!!busy}
          onClick={runExecute}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/25 to-violet-500/15 border border-emerald-500/45 text-xs font-bold text-emerald-300 hover:from-emerald-500/35 transition disabled:opacity-50"
        >
          {busy === 'execute' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {busy === 'execute' ? 'Executando…' : 'Executar automaticamente'}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={runPlan}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 border border-violet-500/40 text-xs font-bold text-violet-300 hover:from-violet-500/30 transition disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {busy === 'plan' ? 'Planejando…' : 'Só ver plano'}
        </button>
      </div>

      {executeResults && executeResults.length > 0 && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400/90">
            Log de execução
          </p>
          <ul className="space-y-1.5">
            {executeResults.map((r, i) => (
              <li
                key={`${r.step}-${i}`}
                className={`text-xs px-3 py-2 rounded-lg border flex items-start gap-2 ${
                  r.status === 'error'
                    ? 'border-red-500/25 bg-red-500/5 text-red-200/90'
                    : r.status === 'pending_ui'
                      ? 'border-amber-500/25 bg-amber-500/5 text-amber-100/90'
                      : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90'
                }`}
              >
                {r.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : r.status === 'pending_ui' ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>
                  <span className="font-mono text-[10px] opacity-80">
                    {STEP_LABELS[r.step] || r.step}
                  </span>
                  {r.error ? ` — ${r.error}` : null}
                  {r.message ? ` — ${r.message}` : null}
                  {r.derivedIdeas != null ? ` — ${r.derivedIdeas} ideia(s)` : null}
                  {r.editorialQueue?.enqueued
                    ? ` — ${r.editorialQueue.enqueued} na fila`
                    : null}
                  {r.variations != null ? ` — ${r.variations} variação(ões)` : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan && (
        <div className="space-y-3 border-t border-zinc-800 pt-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-xs">
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
            <button
              type="button"
              onClick={() => setPlanExpanded((v) => !v)}
              className="text-[10px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg border border-zinc-800"
            >
              {planExpanded ? 'Recolher plano' : 'Ver plano completo'}
            </button>
          </div>

          {!planExpanded ? (
            <p className="text-xs text-zinc-500 line-clamp-2">{plan.reasoning}</p>
          ) : null}

          {planExpanded && (plan.intents?.explicit?.length > 0 || plan.intents?.implicit?.length > 0) && (
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

          {planExpanded ? (
            <p className="text-xs text-zinc-400 leading-relaxed">{plan.reasoning}</p>
          ) : null}

          {planExpanded ? (
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
          ) : null}

          {planExpanded && (plan.storyboardBeats || []).length > 0 && (
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

          {planExpanded && obsidianInstalled && onOpenObsidian && obsidianMeta?.memoryFile ? (
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
    </div>
  );
}