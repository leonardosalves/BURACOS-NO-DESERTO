import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  RefreshCw,
  Sparkles,
  Lightbulb,
  Trophy,
  ScrollText,
  Lock,
  Check,
  ShieldAlert,
  Trash2,
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

// ── Estratégia automática por quantidade (Top 3 / 5 / 10 / 20) ─────────────
type RankingStrategy = {
  wordsPerItem: string;
  secondsPerItem: string;
  hudDensity: string;
  transitionFreq: string;
  explanationDepth: string;
  note: string;
};

function resolveRankingStrategy(
  rankCount: number,
  format: "LONGO" | "SHORTS"
): RankingStrategy {
  if (format === "SHORTS" || rankCount <= 3) {
    return {
      wordsPerItem: "18–24",
      secondsPerItem: "12–16",
      hudDensity: "Completo (badge + título + ícone)",
      transitionFreq: "1 transição por item",
      explanationDepth: "Profunda — 1 fato forte desenvolvido por item",
      note: "Gancho imediato e revelação final forte. Poucos itens, mais profundidade.",
    };
  }
  if (rankCount <= 5) {
    return {
      wordsPerItem: "12–16",
      secondsPerItem: "7–10",
      hudDensity: "Completo",
      transitionFreq: "Transições curtas entre itens",
      explanationDepth: "Média — fato + contexto rápido",
      note: "Ritmo mais rápido, introdução mínima, variedade de categorias.",
    };
  }
  if (rankCount <= 10) {
    return {
      wordsPerItem: "8–12",
      secondsPerItem: "5–7",
      hudDensity: "Compacto (só #N + Top N)",
      transitionFreq: "Transições rápidas",
      explanationDepth: "Objetiva — 1 frase de impacto por item",
      note: "Títulos curtos, HUD compacto, menos explicação individual.",
    };
  }
  return {
    wordsPerItem: "4–8",
    secondsPerItem: "3–5",
    hudDensity: "Compacto",
    transitionFreq: "Montagem rápida / agrupamento",
    explanationDepth: "Mínima — agrupar por categorias ou capítulos",
    note: "Formato longo ou montagem muito rápida. Considere capítulos e agrupamento.",
  };
}

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

  // ── Contrato do Ranking ──────────────────────────────────────────────────
  const selectedIdea =
    listicleIdeasData?.ranking_ideas?.[selectedListicleIdeaIndex] || null;

  // HUD: usa list_items reais do roteiro; se ainda não existem, usa os
  // sample_items da ideia selecionada como prévia provisória.
  const hudPreview = useMemo(() => {
    const real = buildHudPreviewItems(rankCount, rankOrder, listItems);
    if (real.hasRealListItems) return { ...real, isProvisional: false };
    const sample = selectedIdea?.sample_items || [];
    if (sample.length > 0) {
      const provisional = sample.map((name, i) => ({
        rank: i + 1,
        title: name,
        name,
      }));
      const built = buildHudPreviewItems(rankCount, rankOrder, provisional);
      return { ...built, isProvisional: true };
    }
    return { ...real, isProvisional: false };
  }, [rankCount, rankOrder, listItems, selectedIdea]);

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

  // ── Editor de itens provisórios ──────────────────────────────────────────
  type ProvisionalItem = { id: string; title: string };
  const [provisionalItems, setProvisionalItems] = useState<ProvisionalItem[]>(
    []
  );

  useEffect(() => {
    const sample = selectedIdea?.sample_items || [];
    setProvisionalItems(
      sample.map((name, i) => ({
        id: `item-${i}-${name.slice(0, 12)}`,
        title: name,
      }))
    );
  }, [selectedListicleIdeaIndex]);

  const moveItem = (index: number, dir: -1 | 1) => {
    setProvisionalItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const editItemTitle = (id: string, title: string) => {
    setProvisionalItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, title } : it))
    );
  };
  const removeItem = (id: string) => {
    setProvisionalItems((prev) => prev.filter((it) => it.id !== id));
  };

  // ── Detecção de ranking arbitrário ───────────────────────────────────────
  // Um ranking defensável precisa de um critério comparável/mensurável.
  const arbitraryRankingWarning = useMemo(() => {
    const criterion = contract.mainCriterion.toLowerCase();
    if (!criterion.trim()) return null;
    const measurableHints = [
      "mais",
      "menos",
      "maior",
      "menor",
      "melhor",
      "pior",
      "tempo",
      "anos",
      "quantidade",
      "número",
      "frequência",
      "duração",
      "peso",
      "altura",
      "velocidade",
      "custo",
      "preço",
      "distância",
      "comprovad",
      "documentad",
      "evidência",
      "fonte",
      "ranking",
      "pontua",
      "score",
      "compar",
    ];
    const hasMeasurable = measurableHints.some((h) => criterion.includes(h));
    if (hasMeasurable) return null;
    return "O critério principal não parece comparável ou mensurável. Sem uma dimensão objetiva, isto é uma lista comentada / ordem de impacto — não um ranking defensável. Considere definir uma métrica (tempo, quantidade, evidências) ou renomear o formato.";
  }, [contract.mainCriterion]);

  // ── Sugestão de payoff fraco ─────────────────────────────────────────────
  const payoffSuggestion = useMemo(() => {
    if (provisionalItems.length < 3) return null;
    const last =
      provisionalItems[provisionalItems.length - 1]?.title.toLowerCase() || "";
    const climax =
      rankOrder === "desc"
        ? last
        : provisionalItems[0]?.title.toLowerCase() || "";
    const weakHints = [
      "outros",
      "diversos",
      "vários",
      "etc",
      "resto",
      "menção",
    ];
    if (weakHints.some((h) => climax.includes(h))) {
      return "O item do clímax parece fraco (genérico). O #1 deve ser a maior recompensa — considere mover o item mais surpreendente para o final.";
    }
    return null;
  }, [provisionalItems, rankOrder]);

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
          {arbitraryRankingWarning && (
            <div className="rounded-xl border border-orange-400/30 bg-orange-400/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-orange-300">
                <ShieldAlert className="h-3.5 w-3.5" /> Ranking possivelmente
                arbitrário
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-orange-100/80">
                {arbitraryRankingWarning}
              </p>
            </div>
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

        {/* Estratégia automática por quantidade */}
        {(() => {
          const strategy = resolveRankingStrategy(rankCount, formatSelector);
          return (
            <div className="space-y-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                Estratégia automática · Top {rankCount}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                <StrategyStat
                  label="Palavras/item"
                  value={strategy.wordsPerItem}
                />
                <StrategyStat
                  label="Tempo/item"
                  value={`${strategy.secondsPerItem}s`}
                />
                <StrategyStat
                  label="Transições"
                  value={strategy.transitionFreq}
                />
                <StrategyStat label="HUD" value={strategy.hudDensity} />
                <StrategyStat
                  label="Explicação"
                  value={strategy.explanationDepth}
                />
              </div>
              <p className="text-[10px] leading-4 text-zinc-500">
                {strategy.note}
              </p>
            </div>
          );
        })()}

        {/* Posição factual vs. ordem narrativa */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Posição factual
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-zinc-400">
              Qual item é objetivamente melhor segundo o critério do contrato.
              Define o mérito de cada posição.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Ordem de revelação
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-zinc-400">
              Em qual sequência os itens são apresentados para maximizar
              retenção — geralmente countdown, guardando o melhor para o final.
            </p>
          </div>
        </div>

        {/* Progressão de tensão */}
        <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Progressão de tensão
            </p>
            <span className="text-[9px] text-zinc-600">
              {rankOrder === "desc"
                ? "Countdown · clímax no #1"
                : "Build-up · clímax no topo"}
            </span>
          </div>
          <div className="space-y-1.5">
            {hudPreview.items.map((item) => {
              const climaxRank = rankOrder === "desc" ? 1 : rankCount;
              const isClimax = item.rank === climaxRank;
              const filled =
                rankOrder === "desc" ? rankCount - item.rank + 1 : item.rank;
              const tension = Math.round((filled / rankCount) * 100);
              return (
                <div
                  key={`tension-${item.rank}`}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`w-8 shrink-0 font-mono text-[10px] ${isClimax ? "font-bold text-amber-300" : "text-zinc-500"}`}
                  >
                    #{item.rank}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${tension}%`,
                        background: isClimax
                          ? "linear-gradient(90deg, #d4a017, #FFE9A8)"
                          : "linear-gradient(90deg, #3f3f46, #d4a017)",
                      }}
                    />
                  </div>
                  <span
                    className={`w-8 shrink-0 text-right font-mono text-[10px] ${isClimax ? "font-bold text-amber-300" : "text-zinc-500"}`}
                  >
                    {tension}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] leading-4 text-zinc-500">
            A tensão cresce em direção ao clímax. Se um item intermediário
            parecer mais surpreendente que o #1, considere fortalecer a
            revelação final.
          </p>
          {payoffSuggestion && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" /> Payoff possivelmente
                fraco
              </p>
              <p className="mt-1 text-[10px] leading-4 text-amber-100/80">
                {payoffSuggestion}
              </p>
            </div>
          )}
        </div>

        {/* Editor de itens provisórios */}
        {provisionalItems.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Itens do ranking (provisórios)
              </p>
              <span className="text-[9px] text-zinc-600">
                {provisionalItems.length} itens
              </span>
            </div>
            <p className="text-[10px] leading-4 text-zinc-500">
              Reordene, edite ou remova itens antes de gerar. A ordem aqui
              define a ordem de revelação.
            </p>
            <div className="space-y-2">
              {provisionalItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/25 p-2.5"
                >
                  <span className="w-7 shrink-0 text-center font-mono text-[11px] font-bold text-emerald-300">
                    {index + 1}
                  </span>
                  <input
                    value={item.title}
                    onChange={(e) => editItemTitle(item.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/50"
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      title="Subir"
                      className="rounded p-1 text-zinc-500 transition hover:text-emerald-300 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === provisionalItems.length - 1}
                      title="Descer"
                      className="rounded p-1 text-zinc-500 transition hover:text-emerald-300 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Remover"
                      className="rounded p-1 text-zinc-500 transition hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ListicleHudPreview
          rankCount={rankCount}
          rankOrder={rankOrder}
          hudStyle={listicleHudStyle}
          items={hudPreview.items}
          hasRealListItems={hudPreview.hasRealListItems}
          isProvisional={hudPreview.isProvisional}
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

function StrategyStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold leading-4 text-zinc-200">
        {value}
      </p>
    </div>
  );
}
