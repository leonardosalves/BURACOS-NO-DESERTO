import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

export type PreRenderAutoFix = {
  id: string;
  label: string;
  hint?: string;
};

export type PreRenderSuggestion = {
  id: string;
  priority: 'error' | 'warning' | 'info' | 'tip';
  title: string;
  summary: string;
  steps: string[];
  tab?: string;
  code?: string;
  autoFix?: PreRenderAutoFix;
  manualOnly?: boolean;
};

export type SlideshowRiskReport = {
  average: number;
  verdict: string;
  dimensions?: Record<string, number>;
  findings?: { dimension: string; message: string }[];
};

export type PreRenderAdvice = {
  ready: boolean;
  score: number | null;
  format: string;
  blockingCount: number;
  suggestionCount: number;
  suggestions: PreRenderSuggestion[];
  slideshow_risk?: SlideshowRiskReport | null;
};

type TabId = 'status' | 'workflow' | 'timeline' | 'music' | 'terminal' | 'ai' | 'creator' | 'editor' | 'settings' | 'upload' | 'agents';

const TAB_LABELS: Record<string, string> = {
  workflow: 'Workflow',
  timeline: 'Roteiro e Tags',
  music: 'Trilha BGM',
  agents: 'Studio Agents',
  editor: 'Editor',
  ai: 'IA · Metadados',
  settings: 'Configurações',
  status: 'Render',
};

const PRIORITY_STYLES = {
  error: 'border-red-500/30 bg-red-500/5 text-red-200/90',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-100/90',
  info: 'border-zinc-700 bg-zinc-950/40 text-zinc-400',
  tip: 'border-sky-500/25 bg-sky-500/5 text-sky-100/90',
};

function PriorityIcon({ priority }: { priority: PreRenderSuggestion['priority'] }) {
  if (priority === 'error' || priority === 'warning') {
    return <AlertTriangle className={`w-4 h-4 shrink-0 ${priority === 'error' ? 'text-red-400' : 'text-amber-400'}`} />;
  }
  if (priority === 'tip') return <Lightbulb className="w-4 h-4 shrink-0 text-sky-400" />;
  return <CheckCircle2 className="w-4 h-4 shrink-0 text-zinc-500" />;
}

export function SuggestionCard({
  item,
  defaultOpen = false,
  onGoToTab,
  onAutoFix,
  fixingFixId,
}: {
  item: PreRenderSuggestion;
  defaultOpen?: boolean;
  onGoToTab?: (tab: TabId) => void;
  onAutoFix?: (fixId: string) => void;
  fixingFixId?: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen && !item.autoFix);
  const isFixing = Boolean(item.autoFix && fixingFixId === item.autoFix.id);

  return (
    <div className={`rounded-xl border p-3 ${PRIORITY_STYLES[item.priority]}`}>
      <div className="flex items-start gap-2">
        <PriorityIcon priority={item.priority} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug">{item.title}</p>
          <p className="text-[10px] opacity-80 mt-0.5 leading-relaxed">{item.summary}</p>
        </div>
      </div>

      {item.autoFix && onAutoFix && (
        <div className="mt-3 ml-6 space-y-2">
          <button
            type="button"
            disabled={Boolean(fixingFixId)}
            onClick={() => onAutoFix(item.autoFix!.id)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold transition shadow-lg shadow-gold-500/10"
          >
            {isFixing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{item.autoFix.label}</span>
          </button>
          {item.autoFix.hint && (
            <p className="text-[10px] opacity-75 leading-relaxed">{item.autoFix.hint}</p>
          )}
        </div>
      )}

      {item.manualOnly && !item.autoFix && (
        <p className="mt-2 ml-6 text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
          Ação manual necessária
        </p>
      )}

      {item.steps.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 ml-6 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-90 transition"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {item.autoFix ? 'Ver detalhes' : 'Ver passos'}
          </button>
          {open && (
            <ol className="mt-2 ml-6 space-y-1.5 list-decimal text-[10px] leading-relaxed opacity-95">
              {item.steps.map((step, i) => (
                <li key={i} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {open && item.tab && onGoToTab && item.manualOnly && (
        <button
          type="button"
          onClick={() => onGoToTab(item.tab as TabId)}
          className="mt-2 ml-6 text-[10px] font-bold text-gold-400 hover:text-gold-300 transition"
        >
          Ir para {TAB_LABELS[item.tab] || item.tab} →
        </button>
      )}
    </div>
  );
}

export function PreRenderAdvicePanel({
  advice,
  compact = false,
  onGoToTab,
  onRefresh,
  onAutoFix,
  fixingFixId,
}: {
  advice: PreRenderAdvice;
  compact?: boolean;
  onGoToTab?: (tab: TabId) => void;
  onRefresh?: () => void;
  onAutoFix?: (fixId: string) => void;
  fixingFixId?: string | null;
}) {
  const improvements = advice.suggestions.filter((s) => s.priority !== 'tip');
  const tips = advice.suggestions.filter((s) => s.priority === 'tip');
  const show = compact ? improvements.slice(0, 4) : advice.suggestions;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-400">
          {advice.ready ? (
            <span className="text-emerald-400 font-semibold">Pronto para renderizar</span>
          ) : (
            <span>
              <span className="text-amber-400 font-semibold">{advice.blockingCount} bloqueio(s)</span>
              {' · '}
              {improvements.length} melhoria(s) sugerida(s)
            </span>
          )}
          {' · '}
          Formato {advice.format === 'SHORT' ? 'Shorts' : 'Longo'}
          {advice.slideshow_risk ? (
            <>
              {' · '}
              <span
                className={
                  advice.slideshow_risk.verdict === 'fail'
                    ? 'text-red-400'
                    : advice.slideshow_risk.verdict === 'revise'
                      ? 'text-amber-400'
                      : 'text-zinc-500'
                }
              >
                Slideshow {advice.slideshow_risk.average}/5 ({advice.slideshow_risk.verdict})
              </span>
            </>
          ) : null}
        </p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[10px] text-zinc-500 hover:text-gold-400 transition"
          >
            Atualizar análise
          </button>
        )}
      </div>

      {show.map((item, idx) => (
        <SuggestionCard
          key={item.id}
          item={item}
          defaultOpen={!compact && (item.priority === 'error' || idx < 2)}
          onGoToTab={onGoToTab}
          onAutoFix={onAutoFix}
          fixingFixId={fixingFixId}
        />
      ))}

      {compact && improvements.length > 4 && (
        <p className="text-[10px] text-zinc-500">+{improvements.length - 4} sugestão(ões) — expanda ou tente renderizar para ver todas.</p>
      )}

      {!compact && tips.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80">
          {tips.map((item) => (
            <SuggestionCard key={item.id} item={item} onGoToTab={onGoToTab} onAutoFix={onAutoFix} fixingFixId={fixingFixId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PreRenderAdviceModal({
  advice,
  renderLabel,
  onConfirm,
  onCancel,
  onGoToTab,
  onAutoFix,
  fixingFixId,
}: {
  advice: PreRenderAdvice;
  renderLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  onGoToTab: (tab: TabId) => void;
  onAutoFix?: (fixId: string) => void;
  fixingFixId?: string | null;
}) {
  const errors = advice.suggestions.filter((s) => s.priority === 'error');

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-amber-500/25 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-800">
          <SectionHeader
            title="Antes de renderizar"
            helpId="quality-pre-render"
            icon={
              advice.ready ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )
            }
            subtitle={`${renderLabel} · Score ${advice.score ?? '—'}/100`}
          />
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {advice.ready && errors.length === 0 ? (
            <p className="text-sm text-emerald-300/90 mb-4 leading-relaxed">
              Qualidade dentro do esperado. Você pode renderizar agora ou revisar as dicas abaixo.
            </p>
          ) : (
            <p className="text-sm text-amber-200/90 mb-4 leading-relaxed">
              Problemas com botão dourado o programa corrige sozinho. Itens marcados como ação manual precisam da sua intervenção.
            </p>
          )}
          <PreRenderAdvicePanel
            advice={advice}
            onGoToTab={onGoToTab}
            onAutoFix={onAutoFix}
            fixingFixId={fixingFixId}
          />
        </div>

        <div className="flex flex-wrap gap-3 p-5 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition"
          >
            Voltar e corrigir
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              errors.length > 0
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-gold-500 hover:bg-gold-600 text-zinc-950'
            }`}
          >
            {errors.length > 0 ? 'Renderizar mesmo assim' : 'Iniciar render'}
          </button>
        </div>
      </div>
    </div>
  );
}