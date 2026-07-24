import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  Sparkles,
  Lightbulb,
  Trophy,
  ScrollText,
  Lock,
  Check,
} from "lucide-react";
import {
  ListicleRankingIdeas,
  type ListicleIdeasResponse,
  type ListicleRankingIdea,
} from "./ListicleRankingIdeas";
import {
  buildHudPreviewItems,
  ListicleHudPreview,
  type HudPreviewListItem,
} from "./ListicleHudPreview";

export const LONGO_RANK_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
export const SHORTS_RANK_OPTIONS = [3, 5] as const;

export type RankingContract = {
  rankingQuestion: string;
  mainCriterion: string;
  secondaryCriteria: string;
  scope: string;
  tieBreakRule: string;
  exclusions: string;
};

export const EMPTY_CONTRACT: RankingContract = {
  rankingQuestion: "",
  mainCriterion: "",
  secondaryCriteria: "",
  scope: "",
  tieBreakRule: "",
  exclusions: "",
};

export const LISTICLE_PRESETS = [
  {
    label: "Top 20 invenções chinesas",
    niche: "história e invenções da China",
    topic: "invenções chinesas que mudaram o mundo",
    rankCount: 20,
    project: "Top20_Inventions_China",
  },
  {
    label: "Top 15 invenções americanas",
    niche: "história e invenções dos Estados Unidos",
    topic: "invenções americanas que revolucionaram o mundo",
    rankCount: 15,
    project: "Top15_Inventions_USA",
  },
  {
    label: "Top 20 revoluções industriais",
    niche: "história industrial e revoluções tecnológicas",
    topic: "revoluções industriais e marcos da engenharia humana",
    rankCount: 20,
    project: "Top20_Industrial_Revolutions",
  },
] as const;

export const LISTICLE_SHORTS_PRESETS = [
  {
    label: "Short Top 3 — choque rápido",
    niche: "curiosidades e fatos surpreendentes",
    topic: "fatos mais chocantes que poucos conhecem",
    rankCount: 3,
    project: "Top3_Shock_Short",
  },
  {
    label: "Short Top 5 — ranking viral",
    niche: "história e tecnologia em formato curto",
    topic: "invenções ou eventos que mudaram tudo em segundos",
    rankCount: 5,
    project: "Top5_Viral_Short",
  },
  {
    label: "Short Top 3 — origens bizarras do dia a dia",
    niche: "curiosidades e objetos do cotidiano",
    topic: "objetos que você usa todo dia e suas origens bizarras",
    rankCount: 3,
    project: "Coisas_Voce_Usa_Todo",
  },
] as const;

function clampShortsRankCount(count: number) {
  return count === 5 ? 5 : 3;
}

type Props = {
  listNiche: string;
  setListNiche: (v: string) => void;
  listTopic: string;
  setListTopic: (v: string) => void;
  rankCount: number;
  setRankCount: (v: number) => void;
  rankOrder: "desc" | "asc";
  setRankOrder: (v: "desc" | "asc") => void;
  formatSelector: "LONGO" | "SHORTS";
  setFormatSelector: (v: "LONGO" | "SHORTS") => void;
  creatorProjectName: string;
  setCreatorProjectName: (v: string) => void;
  setNicheInput: (v: string) => void;
  creatorLoading: boolean;
  hasApiKey: boolean;
  listicleIdeasData: ListicleIdeasResponse | null;
  selectedListicleIdeaIndex: number;
  listicleHudStyle: "full" | "compact" | "auto";
  setListicleHudStyle: (v: "full" | "compact" | "auto") => void;
  listItems?: HudPreviewListItem[];
  onSuggestRankings: () => void;
  onSelectRankingIdea: (index: number, idea: ListicleRankingIdea) => void;
  onGenerateScript: () => void;
  onContractChange?: (contract: RankingContract) => void;
};

function projectNameFromTitle(title: string) {
  const stopWords = new Set([
    "o",
    "a",
    "os",
    "as",
    "um",
    "uma",
    "de",
    "do",
    "da",
    "dos",
    "das",
    "no",
    "na",
    "em",
    "por",
    "para",
    "com",
    "e",
    "que",
    "se",
    "ou",
    "top",
  ]);
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()))
      .slice(0, 4)
      .join("_") || "TopN_Project"
  );
}

export function ListicleCreatorStep({
  listNiche,
  setListNiche,
  listTopic,
  setListTopic,
  rankCount,
  setRankCount,
  rankOrder,
  setRankOrder,
  formatSelector,
  setFormatSelector,
  creatorProjectName,
  setCreatorProjectName,
  setNicheInput,
  creatorLoading,
  hasApiKey,
  listicleIdeasData,
  selectedListicleIdeaIndex,
  listicleHudStyle,
  setListicleHudStyle,
  listItems = [],
  onSuggestRankings,
  onSelectRankingIdea,
  onGenerateScript,
  onContractChange,
}: Props) {
  const rankOptions =
    formatSelector === "SHORTS" ? SHORTS_RANK_OPTIONS : LONGO_RANK_OPTIONS;

  // ── CORREÇÃO CRÍTICA: única fonte de verdade para a quantidade ──────────
  // Reconcilia rankCount com as opções válidas do formato sempre que o
  // formato muda ou ao montar. Evita o estado "dropdown mostra Top 3 mas
  // badge/HUD/botão/payload usam Top 20".
  useEffect(() => {
    if (!(rankOptions as readonly number[]).includes(rankCount)) {
      setRankCount(formatSelector === "SHORTS" ? 3 : 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatSelector]);

  const hudPreview = useMemo(
    () => buildHudPreviewItems(rankCount, rankOrder, listItems),
    [rankCount, rankOrder, listItems]
  );

  // ── Contrato do Ranking ──────────────────────────────────────────────────
  const selectedIdea =
    listicleIdeasData?.ranking_ideas?.[selectedListicleIdeaIndex] || null;
  const [contract, setContract] = useState<RankingContract>(EMPTY_CONTRACT);
  const [contractApproved, setContractApproved] = useState(false);

  // Auto-sugere o contrato ao selecionar uma ideia
  useEffect(() => {
    if (!selectedIdea) return;
    const suggested: RankingContract = {
      rankingQuestion:
        selectedIdea.listicle_angle ||
        `Quais são os ${rankCount} itens mais relevantes sobre ${selectedIdea.list_topic || listTopic}?`,
      mainCriterion:
        selectedIdea.why_interesting ||
        "Relevância e impacto comprovado para o público do nicho.",
      secondaryCriteria:
        "Disponibilidade de evidências; potencial visual; originalidade para o público.",
      scope: selectedIdea.list_topic || listTopic || "",
      tieBreakRule:
        "Priorizar o item com maior quantidade de fontes independentes.",
      exclusions:
        "Itens sem evidência verificável; alegações baseadas apenas em reprodução moderna; exemplos fora do período ou tema definidos.",
    };
    setContract(suggested);
    setContractApproved(false);
    onContractChange?.(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListicleIdeaIndex]);

  const updateContract = (patch: Partial<RankingContract>) => {
    setContract((prev) => {
      const next = { ...prev, ...patch };
      onContractChange?.(next);
      return next;
    });
  };

  const hasContract = Boolean(
    contract.rankingQuestion.trim() && contract.mainCriterion.trim()
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 font-sans">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-300/20 bg-[#07110d] p-5 shadow-2xl shadow-black/20 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[34px] border-emerald-300/[0.035]" />
        <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">
              <BarChart3 className="h-4 w-4" /> Mesa de ranking
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
              Construa uma lista que melhora a cada posição
            </h3>
            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-400">
              Escolha o território, descubra ângulos subestimados e defina o
              critério antes de ordenar os itens. O primeiro lugar precisa
              entregar a maior recompensa da história.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] px-5 py-3 text-right">
            <p className="text-[8px] font-black uppercase tracking-wider text-emerald-300">
              Estrutura atual
            </p>
            <p className="mt-1 font-mono text-xl font-black text-white">
              TOP {rankCount}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-white/[0.07] bg-[#0b0d0c] p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Nicho do Canal / Tema
            </label>
            <input
              type="text"
              disabled={creatorLoading || !hasApiKey}
              placeholder="Ex: curiosidades e fatos surpreendentes, finanças, culinária, natureza, esportes..."
              value={listNiche}
              onChange={(e) => setListNiche(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Formato do vídeo
            </label>
            <select
              value={formatSelector}
              onChange={(e) => {
                const nextFormat = e.target.value as "LONGO" | "SHORTS";
                setFormatSelector(nextFormat);
                if (
                  nextFormat === "SHORTS" &&
                  !SHORTS_RANK_OPTIONS.includes(rankCount as 3 | 5)
                ) {
                  setRankCount(3);
                } else if (
                  nextFormat === "LONGO" &&
                  SHORTS_RANK_OPTIONS.includes(rankCount as 3 | 5)
                ) {
                  setRankCount(10);
                }
              }}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="LONGO">Longo — rankings Top 5 a 30</option>
              <option value="SHORTS">
                Shorts — rankings Top 3 ou Top 5 (exclusivo)
              </option>
            </select>
            {formatSelector === "SHORTS" && (
              <p className="text-[9px] text-fuchsia-400/80 leading-relaxed">
                Em Shorts, a IA sugere apenas rankings Top 3 (choque rápido) e
                Top 5 (mais denso) adaptados ao nicho.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider w-full sm:w-auto">
            {formatSelector === "SHORTS" ? "Atalhos Shorts:" : "Atalhos Longo:"}
          </span>
          {(formatSelector === "SHORTS"
            ? LISTICLE_SHORTS_PRESETS
            : LISTICLE_PRESETS
          ).map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setListNiche(preset.niche);
                setListTopic(preset.topic);
                setRankCount(preset.rankCount);
                setNicheInput(preset.niche);
                setCreatorProjectName(preset.project);
                setFormatSelector(
                  formatSelector === "SHORTS" ? "SHORTS" : "LONGO"
                );
                setRankOrder("desc");
              }}
              className={`text-[10px] font-bold px-3 py-2 rounded-lg border transition cursor-pointer ${
                formatSelector === "SHORTS"
                  ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
                  : "border-gold-500/30 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={creatorLoading || !listNiche.trim() || !hasApiKey}
          onClick={onSuggestRankings}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3.5 text-xs font-black text-emerald-200 transition hover:bg-emerald-300/15 disabled:opacity-50"
        >
          {creatorLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4" />
          )}
          <span>Sugerir rankings interessantes para este nicho</span>
        </button>
      </section>

      {listicleIdeasData?.ranking_ideas?.length ? (
        <ListicleRankingIdeas
          data={listicleIdeasData}
          selectedIndex={selectedListicleIdeaIndex}
          onSelect={(index, idea) => {
            onSelectRankingIdea(index, idea);
            if (idea.list_topic) setListTopic(idea.list_topic);
            if (idea.suggested_rank_count) {
              const nextRank =
                idea.best_format === "SHORTS" || formatSelector === "SHORTS"
                  ? clampShortsRankCount(idea.suggested_rank_count)
                  : idea.suggested_rank_count;
              setRankCount(nextRank);
            }
            if (idea.title)
              setCreatorProjectName(projectNameFromTitle(idea.title));
            if (idea.best_format === "SHORTS" || idea.best_format === "LONGO") {
              setFormatSelector(idea.best_format);
            }
            setNicheInput(listNiche.trim());
          }}
        />
      ) : null}

      {/* ── Contrato do Ranking ── */}
      {selectedIdea && (
        <section className="space-y-4 rounded-[28px] border border-emerald-300/15 bg-[#0a0d0b] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-emerald-300/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
                <ScrollText className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Contrato do ranking
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Define critério, escopo e regras antes de ordenar. Orienta
                  pesquisa, pontuação e roteiro.
                </p>
              </div>
            </div>
            {contractApproved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">
                <Lock className="h-3 w-3" /> Aprovado
              </span>
            ) : (
              <button
                type="button"
                disabled={!hasContract}
                onClick={() => setContractApproved(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-300 px-3 py-2 text-[10px] font-black text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Aprovar contrato
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ContractField
              label="Pergunta do ranking"
              value={contract.rankingQuestion}
              onChange={(v) => updateContract({ rankingQuestion: v })}
              disabled={contractApproved}
              full
            />
            <ContractField
              label="Critério principal"
              value={contract.mainCriterion}
              onChange={(v) => updateContract({ mainCriterion: v })}
              disabled={contractApproved}
            />
            <ContractField
              label="Critérios secundários"
              value={contract.secondaryCriteria}
              onChange={(v) => updateContract({ secondaryCriteria: v })}
              disabled={contractApproved}
            />
            <ContractField
              label="Escopo"
              value={contract.scope}
              onChange={(v) => updateContract({ scope: v })}
              disabled={contractApproved}
            />
            <ContractField
              label="Regra para empates"
              value={contract.tieBreakRule}
              onChange={(v) => updateContract({ tieBreakRule: v })}
              disabled={contractApproved}
            />
            <ContractField
              label="O que não pode entrar"
              value={contract.exclusions}
              onChange={(v) => updateContract({ exclusions: v })}
              disabled={contractApproved}
              full
            />
          </div>
          {contractApproved && (
            <button
              type="button"
              onClick={() => setContractApproved(false)}
              className="text-[10px] font-bold text-emerald-300/80 hover:text-emerald-200"
            >
              Editar contrato
            </button>
          )}
        </section>
      )}

      <section className="space-y-5 rounded-[28px] border border-emerald-300/15 bg-[#0a0d0b] p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-emerald-300/10 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
              Ranking selecionado
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Ajuste a ordem, o HUD e o projeto antes de gerar a narração.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Tema da lista (editável)
          </label>
          <input
            type="text"
            disabled={creatorLoading}
            placeholder="Preenchido ao escolher um ranking acima"
            value={listTopic}
            onChange={(e) => setListTopic(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Estilo do HUD no vídeo
            </label>
            <select
              value={listicleHudStyle}
              onChange={(e) =>
                setListicleHudStyle(
                  e.target.value as "full" | "compact" | "auto"
                )
              }
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="auto">Automático (compacto em Top 9+)</option>
              <option value="full">Completo (badge + título + ícone)</option>
              <option value="compact">Compacto (só #N + TOP N)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Quantidade {formatSelector === "SHORTS" ? "(Shorts)" : ""}
            </label>
            <select
              value={rankCount}
              onChange={(e) => setRankCount(Number(e.target.value))}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              {rankOptions.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Ordem
            </label>
            <select
              value={rankOrder}
              onChange={(e) => setRankOrder(e.target.value as "desc" | "asc")}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="desc">Countdown (N → 1)</option>
              <option value="asc">Build-up (1 → N)</option>
            </select>
          </div>
        </div>

        <ListicleHudPreview
          rankCount={rankCount}
          rankOrder={rankOrder}
          hudStyle={listicleHudStyle}
          items={hudPreview.items}
          hasRealListItems={hudPreview.hasRealListItems}
          videoSeed={[
            creatorProjectName,
            listTopic,
            listNiche,
            `top${rankCount}`,
          ]
            .filter(Boolean)
            .join("|")}
        />

        <div className="space-y-2">
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Nome do Projeto (pasta)
          </label>
          <input
            type="text"
            disabled={creatorLoading}
            placeholder="Ex: Top20_Inventions_China"
            value={creatorProjectName}
            onChange={(e) => setCreatorProjectName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs font-semibold text-white outline-none focus:border-emerald-400/50"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={
              creatorLoading ||
              !listTopic.trim() ||
              !creatorProjectName.trim() ||
              !hasApiKey ||
              (selectedIdea ? !contractApproved : false)
            }
            onClick={onGenerateScript}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-300 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-200 disabled:opacity-50"
          >
            {creatorLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {selectedIdea && !contractApproved
                ? "Aprove o contrato para continuar"
                : `Gerar roteiro e narração Top ${rankCount}`}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ContractField({
  label,
  value,
  onChange,
  disabled,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs leading-5 text-white outline-none focus:border-emerald-400/50 disabled:opacity-60"
      />
    </div>
  );
}
