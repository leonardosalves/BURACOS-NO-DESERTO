import React from 'react';
import {
  BookOpen,
  Lightbulb,
  Palette,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  buildOverlayBriefing,
  type OverlayBriefing,
  type OverlayResearchSnapshot,
  type VisualPromptScene,
  type OverlayAiMeta,
} from './overlayBriefingLogic';
import type { OverlayDraft } from './overlayEditorConfig';

type Props = {
  overlay: OverlayDraft;
  visualPrompts?: VisualPromptScene[];
  overlayResearch?: OverlayResearchSnapshot | null;
  globalPlanning?: string[];
  onApplySuggestions?: (patch: {
    type?: string;
    props?: Record<string, unknown>;
  }) => void;
};

function BriefingSection({
  icon,
  title,
  children,
  accent = 'violet',
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: 'violet' | 'cyan' | 'amber' | 'emerald';
}) {
  const border: Record<string, string> = {
    violet: 'border-[rgba(130,128,253,0.28)]',
    cyan: 'border-cyan-500/25',
    amber: 'border-amber-500/25',
    emerald: 'border-emerald-500/25',
  };
  const bg: Record<string, string> = {
    violet: 'bg-[rgba(130,128,253,0.06)]',
    cyan: 'bg-cyan-500/5',
    amber: 'bg-amber-500/5',
    emerald: 'bg-emerald-500/5',
  };
  return (
    <div className={`rounded-lg border ${border[accent]} ${bg[accent]} px-3 py-2.5 space-y-1`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <div className="text-[10px] text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

function SuggestionPills({ briefing }: { briefing: OverlayBriefing }) {
  const { suggestions: s } = briefing;
  const pills = [
    s.typeLabel && { label: 'Tipo', value: s.typeLabel },
    s.variantLabel && { label: 'Design', value: s.variantLabel },
    s.themeLabel && { label: 'Tema', value: s.themeLabel },
    s.iconLabel && { label: 'Ícone', value: s.iconLabel },
    s.positionLabel && { label: 'Posição', value: s.positionLabel },
  ].filter(Boolean) as { label: string; value: string }[];

  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {pills.map((pill) => (
        <span
          key={`${pill.label}-${pill.value}`}
          className="inline-flex items-center gap-1 text-[8px] rounded-md border border-[rgba(130,128,253,0.35)] bg-[rgba(130,128,253,0.12)] px-2 py-0.5 text-violet-200"
        >
          <span className="text-zinc-500 uppercase tracking-wide">{pill.label}</span>
          {pill.value}
        </span>
      ))}
    </div>
  );
}

export function OverlayAiBriefing({
  overlay,
  visualPrompts = [],
  overlayResearch = null,
  globalPlanning = [],
  onApplySuggestions,
}: Props) {
  const briefing = buildOverlayBriefing(overlay, {
    visualPrompts,
    overlayResearch,
    globalPlanning,
  });
  const meta = (overlay as OverlayDraft & { ai_meta?: OverlayAiMeta }).ai_meta;
  const { suggestions: s } = briefing;

  const canApply = Boolean(
    onApplySuggestions
    && (s.type || s.variant || s.theme || s.icon || s.position),
  );

  const handleApply = () => {
    if (!onApplySuggestions) return;
    const props: Record<string, unknown> = {};
    if (s.variant) props.variant = s.variant;
    if (s.theme) props.theme = s.theme;
    if (s.icon) props.iconType = s.icon;
    if (s.position) props.position = s.position;
    onApplySuggestions({
      type: s.type !== overlay.type ? s.type : undefined,
      props: Object.keys(props).length ? props : undefined,
    });
  };

  const sourceLabel = briefing.source === 'ai'
    ? 'Gerado pela IA'
    : briefing.source === 'mixed'
      ? 'IA + inferência local'
      : 'Inferência local (regenere overlays para metadados completos)';

  return (
    <div className="space-y-2.5 rounded-xl border border-[rgba(130,128,253,0.22)] bg-[rgba(8,8,12,0.55)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--dash-primary-light)]" />
            Briefing do overlay
          </p>
          <p className="text-[8px] text-zinc-500 mt-0.5">{sourceLabel}</p>
        </div>
        {canApply && (
          <button
            type="button"
            onClick={handleApply}
            className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-[rgba(130,128,253,0.4)] text-violet-200 hover:bg-[rgba(130,128,253,0.15)] transition flex items-center gap-1"
          >
            <Wand2 className="w-3 h-3" />
            Aplicar sugestões
          </button>
        )}
      </div>

      <BriefingSection
        icon={<BookOpen className="w-3 h-3 text-[var(--dash-primary-light)]" />}
        title="Cena âncora"
      >
        {briefing.sceneId && (
          <p className="font-mono text-[var(--dash-primary-light)] text-[9px] mb-1">
            Cena {briefing.sceneId}
          </p>
        )}
        {briefing.sceneNarration && (
          <p className="text-zinc-400 italic mb-1">
            Narração: &ldquo;{briefing.sceneNarration.slice(0, 180)}
            {briefing.sceneNarration.length > 180 ? '…' : ''}&rdquo;
          </p>
        )}
        {briefing.sceneVisual && (
          <p className="text-zinc-500 text-[9px]">
            Visual: {briefing.sceneVisual.slice(0, 160)}
            {briefing.sceneVisual.length > 160 ? '…' : ''}
          </p>
        )}
        <p className="mt-1 text-zinc-300">{briefing.sceneRationale}</p>
      </BriefingSection>

      <BriefingSection
        icon={<Lightbulb className="w-3 h-3 text-amber-400" />}
        title="O que este overlay informa"
        accent="amber"
      >
        <p>{briefing.contentSummary}</p>
        <p className="mt-1.5 text-zinc-400">{briefing.narrationRelation}</p>
      </BriefingSection>

      <BriefingSection
        icon={<Palette className="w-3 h-3 text-cyan-400" />}
        title="Sugestão de tipo, design e tema"
        accent="cyan"
      >
        <p>{briefing.designRationale}</p>
        <SuggestionPills briefing={briefing} />
        {meta?.suggested_type && meta.suggested_type !== overlay.type && (
          <p className="mt-1.5 text-[9px] text-amber-300/90">
            A IA sugeriu tipo &ldquo;{briefing.suggestions.typeLabel}&rdquo; — você está usando &ldquo;{overlay.type}&rdquo;.
          </p>
        )}
      </BriefingSection>

      <BriefingSection
        icon={<Search className="w-3 h-3 text-emerald-400" />}
        title="Origem da pesquisa"
        accent="emerald"
      >
        {briefing.researchQuery || briefing.researchTopic ? (
          <>
            {briefing.researchTopic && (
              <p>
                <span className="text-zinc-500">Tema pesquisado: </span>
                {briefing.researchTopic}
              </p>
            )}
            {briefing.researchQuery && (
              <p className="mt-1">
                <span className="text-zinc-500">Busca original: </span>
                <span className="font-mono text-[9px] text-emerald-200/90">{briefing.researchQuery}</span>
              </p>
            )}
            {briefing.researchFact ? (
              <p className="mt-1.5 text-zinc-200">
                <span className="text-zinc-500">Fato usado: </span>
                {briefing.researchFact}
              </p>
            ) : (
              <p className="mt-1.5 text-zinc-500">
                Nenhum fato da pesquisa foi associado a este overlay — provavelmente veio do roteiro ou inferência da IA.
              </p>
            )}
            {briefing.researchSource && (
              <p className="mt-1 text-[9px] text-zinc-500">
                Fonte: {briefing.researchSource}
              </p>
            )}
          </>
        ) : (
          <p className="text-zinc-500">
            Pesquisa web não disponível ou insuficiente para este projeto. Regenere overlays após render com Agent Reach ativo para ver a busca original e os fatos.
          </p>
        )}
      </BriefingSection>

      {briefing.globalPlanning && briefing.globalPlanning.length > 0 && (
        <div className="text-[9px] text-zinc-500 space-y-1 pt-1 border-t border-[var(--dash-border)]">
          <p className="font-bold uppercase tracking-wider text-zinc-600">Plano geral da IA</p>
          <ul className="list-disc list-inside space-y-0.5">
            {briefing.globalPlanning.slice(0, 3).map((line) => (
              <li key={line.slice(0, 40)}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}