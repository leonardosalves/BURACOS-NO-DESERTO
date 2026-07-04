import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  Play,
  RefreshCw,
  Sparkles,
  Video,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import {
  FACELESS_NICHE_PRESETS,
  complianceScore,
  evaluateFacelessCompliance,
  type FacelessComplianceItem,
  type FacelessComplianceInput,
} from './facelessChannel';

type FacelessChannelPanelProps = {
  variant: 'preset' | 'pipeline' | 'compliance';
  activePresetId?: string | null;
  onApplyPreset?: (presetId: string) => void;
  complianceInput?: FacelessComplianceInput;
  pipelineBusy?: boolean;
  pipelineLog?: string[];
  onRunPipeline90?: () => void | Promise<void>;
  pipelineReady?: boolean;
};

function StatusIcon({ status }: { status: FacelessComplianceItem['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (status === 'fail') return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
}

function ComplianceList({ items }: { items: FacelessComplianceItem[] }) {
  const score = complianceScore(items);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
          {score.pass} ok
        </span>
        {score.warn > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25">
            {score.warn} atenção
          </span>
        )}
        {score.fail > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/25">
            {score.fail} pendente
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-2.5 items-start text-[11px] leading-snug border border-zinc-900/80 rounded-xl px-3 py-2.5 bg-zinc-950/40"
          >
            <StatusIcon status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-200">{item.label}</p>
              <p className="text-zinc-500 mt-0.5">{item.detail}</p>
              {item.policyRef && (
                <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-wider">{item.policyRef}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FacelessChannelPanel({
  variant,
  activePresetId,
  onApplyPreset,
  complianceInput,
  pipelineBusy = false,
  pipelineLog = [],
  onRunPipeline90,
  pipelineReady = false,
}: FacelessChannelPanelProps) {
  if (variant === 'preset') {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-4">
        <SectionHeader
          title="Canal sem rosto"
          helpTitle="Preset faceless"
          help="Configure nicho, formato e fluxo narrado (sem câmera). Baseado em playbooks de canais faceless monetizados — IA acelera, você revisa."
          icon={<Video className="w-4 h-4 text-violet-400" />}
          subtitle="Escolha um nicho de alto potencial. Depois gere ideias e narração normalmente."
          size="sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FACELESS_NICHE_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset?.(preset.id)}
                className={`text-left rounded-xl border px-3 py-2.5 transition ${
                  active
                    ? 'border-violet-400/50 bg-violet-500/15 ring-1 ring-violet-400/30'
                    : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{preset.label}</span>
                  <span className="text-[9px] text-violet-300/80 font-mono shrink-0">{preset.cpmHint}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{preset.description}</p>
                <p className="text-[9px] text-zinc-600 mt-1">
                  {preset.format === 'SHORTS' ? 'Shorts' : 'Longo'} · {preset.niche.slice(0, 48)}…
                </p>
              </button>
            );
          })}
        </div>
        {activePresetId && (
          <p className="text-[10px] text-violet-200/90 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Preset ativo — narração master, visuais stock/IA, sem aparecer em câmera.
          </p>
        )}
      </div>
    );
  }

  const complianceItems = complianceInput ? evaluateFacelessCompliance(complianceInput) : [];

  if (variant === 'pipeline') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold-500/25 bg-gold-500/5 p-4 space-y-3">
          <SectionHeader
            title="Pipeline 90%"
            helpTitle="Automação B-roll"
            help="Busca stock para cenas sem mídia, associa na timeline (auto-map) e aplica trilha BGM. Você só revisa o resultado antes do render."
            icon={<Play className="w-4 h-4 text-gold-400" />}
            subtitle="Stock → auto-map → BGM. Substitui o trabalho manual mais repetitivo do passo 4."
            size="sm"
          />
          <button
            type="button"
            disabled={pipelineBusy || !pipelineReady}
            onClick={() => void onRunPipeline90?.()}
            className="w-full sm:w-auto bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {pipelineBusy ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{pipelineBusy ? 'Executando pipeline…' : 'Executar Pipeline 90%'}</span>
          </button>
          {!pipelineReady && (
            <p className="text-[10px] text-amber-300/90">
              Conclua a sincronização Whisper (passo 3) antes de rodar o pipeline.
            </p>
          )}
          {pipelineLog.length > 0 && (
            <pre className="text-[9px] font-mono text-zinc-500 max-h-24 overflow-y-auto bg-zinc-950/60 rounded-lg p-2 border border-zinc-900">
              {pipelineLog.slice(-12).join('\n')}
            </pre>
          )}
        </div>
        {complianceInput && (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
            <SectionHeader
              title="Conformidade YouTube (IA & faceless)"
              helpTitle="Anti-desmonetização"
              help="YouTube penaliza conteúdo IA genérico em massa. Originalidade, narração revisada e variedade visual protegem o canal."
              size="sm"
            />
            <ComplianceList items={complianceItems} />
          </div>
        )}
      </div>
    );
  }

  if (!complianceInput) return null;

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
      <SectionHeader
        title="Checklist faceless & monetização"
        helpTitle="Pré-render"
        help="Revise antes de publicar. Itens em vermelho bloqueiam qualidade; amarelo merece atenção."
        icon={<Circle className="w-3.5 h-3.5 text-zinc-500" />}
        size="sm"
      />
      <ComplianceList items={complianceItems} />
    </div>
  );
}