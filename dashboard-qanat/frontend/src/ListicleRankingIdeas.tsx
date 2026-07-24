import React from "react";
import { ChevronRight, ShieldCheck, Star } from "lucide-react";

export type ListicleRankingIdea = {
  title: string;
  suggested_rank_count?: number;
  list_topic?: string;
  listicle_angle?: string;
  promise?: string;
  why_interesting?: string;
  controversy_hook?: string;
  sample_items?: string[];
  emotion?: string;
  best_format?: string;
  reality_status?: string;
  evidence_anchor?: string;
  saturation_level?: string;
  saturation_evidence?: string;
  undercovered_reason?: string;
  format_fit?: string;
  recommended_duration?: string;
  premium_upgrade?: string;
  validation_needed?: string;
  scores?: {
    retencao?: number;
    visual?: number;
    segurancaFactual?: number;
    originalidade?: number;
  };
};

export type ListicleIdeasResponse = {
  niche_analysis?: {
    audience_profile?: string;
    what_they_search?: string;
    comment_triggers?: string;
    best_ranking_styles?: string;
  };
  ranking_ideas?: ListicleRankingIdea[];
  best_index?: number;
  best_reason?: string;
};

type Props = {
  data: ListicleIdeasResponse;
  selectedIndex: number;
  onSelect: (index: number, idea: ListicleRankingIdea) => void;
};

// ── Etiquetas semânticas em português ──────────────────────────────────────
const REALITY_LABEL: Record<
  string,
  { label: string; cls: string; tip: string }
> = {
  documented: {
    label: "Bem documentado",
    cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    tip: "Aparece em fontes históricas ou acadêmicas confiáveis.",
  },
  current: {
    label: "Atual",
    cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    tip: "Fato recente ou em vigor.",
  },
  plausible: {
    label: "Evidência moderada",
    cls: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    tip: "A narrativa é plausível, mas parte de interpretação.",
  },
  disputed: {
    label: "Controverso",
    cls: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    tip: "Há dúvidas sobre detalhes, causalidade ou interpretação.",
  },
};
const REALITY_FALLBACK = {
  label: "Sem fontes suficientes",
  cls: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  tip: "Não há fontes suficientes para sustentar.",
};

const SATURATION_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  unknown: "Ainda não analisada",
};

function realityMeta(status?: string) {
  return REALITY_LABEL[String(status || "").toLowerCase()] || REALITY_FALLBACK;
}

function ScorePill({ label, value }: { label: string; value?: number }) {
  if (typeof value !== "number") return null;
  const tone =
    value >= 75
      ? "text-emerald-300"
      : value >= 50
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className={`font-mono text-[11px] font-bold ${tone}`}>{value}</span>
    </div>
  );
}

export function ListicleRankingIdeas({ data, selectedIndex, onSelect }: Props) {
  const ideas = data.ranking_ideas || [];
  const analysis = data.niche_analysis;
  const selected = selectedIndex >= 0 ? ideas[selectedIndex] : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {analysis && (
        <div className="space-y-2 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 text-[10px]">
          <p className="font-bold uppercase tracking-wider text-gold-500">
            Análise do nicho
          </p>
          {analysis.audience_profile && (
            <p className="text-zinc-400">
              <span className="text-zinc-500">Público:</span>{" "}
              {analysis.audience_profile}
            </p>
          )}
          {analysis.what_they_search && (
            <p className="text-zinc-400">
              <span className="text-zinc-500">Buscam:</span>{" "}
              {analysis.what_they_search}
            </p>
          )}
          {analysis.best_ranking_styles && (
            <p className="text-zinc-400">
              <span className="text-zinc-500">Rankings que funcionam:</span>{" "}
              {analysis.best_ranking_styles}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-gold-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-500">
          {ideas.length} rankings sugeridos
        </span>
        {typeof data.best_index === "number" && data.best_reason && (
          <span
            className="flex max-w-[55%] items-center gap-1 truncate text-[9px] text-emerald-400"
            title={data.best_reason}
          >
            <Star className="h-3 w-3 shrink-0 fill-emerald-400" /> Recomendado:
            #{data.best_index + 1}
          </span>
        )}
      </div>

      {/* Split-view: lista compacta à esquerda, detalhe à direita */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* Coluna esquerda: lista compacta */}
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {ideas.map((idea, index) => {
            const isSelected = selectedIndex === index;
            const isBest = data.best_index === index;
            const rm = realityMeta(idea.reality_status);
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(index, idea)}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-gold-500/60 bg-gold-500/10 ring-1 ring-gold-500/20"
                    : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50"
                }`}
              >
                <span className="font-mono text-[10px] text-gold-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[11px] font-bold leading-snug text-white">
                      {idea.title}
                    </p>
                    {isBest && (
                      <Star className="h-3 w-3 shrink-0 fill-emerald-400 text-emerald-400" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[8px]">
                    <span
                      className={`rounded-full border px-1.5 py-0.5 font-bold ${rm.cls}`}
                    >
                      {rm.label}
                    </span>
                    <span className="text-zinc-500">
                      {idea.suggested_rank_count
                        ? `Top ${idea.suggested_rank_count}`
                        : ""}
                      {idea.best_format === "SHORTS" ? " · Short" : ""}
                    </span>
                    {typeof idea.scores?.segurancaFactual === "number" && (
                      <span className="text-zinc-500">
                        · seg. {idea.scores.segurancaFactual}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-700" />
              </button>
            );
          })}
        </div>

        {/* Coluna direita: detalhe da selecionada */}
        <div>
          {!selected ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
              <p className="text-sm font-semibold text-zinc-300">
                Selecione um ranking
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-zinc-500">
                Compare as opções à esquerda. Aqui você verá promessa, critério,
                riscos e fontes.
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-gold-500/20 bg-[#0d0c08] p-5">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${realityMeta(selected.reality_status).cls}`}
                    title={realityMeta(selected.reality_status).tip}
                  >
                    <ShieldCheck className="h-2.5 w-2.5" /> Base factual:{" "}
                    {realityMeta(selected.reality_status).label}
                  </span>
                  <span
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400"
                    title="Quantidade de conteúdo já explorado no YouTube."
                  >
                    Concorrência:{" "}
                    {SATURATION_LABEL[selected.saturation_level || "unknown"] ||
                      "Ainda não analisada"}
                  </span>
                  {selected.recommended_duration && (
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                      Duração: {selected.recommended_duration}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-black leading-6 tracking-tight text-white">
                  {selected.title}
                </h3>
                {selected.listicle_angle && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-400">
                    {selected.listicle_angle}
                  </p>
                )}
              </div>

              {/* Pontuação */}
              {selected.scores && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <ScorePill
                    label="Retenção"
                    value={selected.scores.retencao}
                  />
                  <ScorePill label="Visual" value={selected.scores.visual} />
                  <ScorePill
                    label="Segurança factual"
                    value={selected.scores.segurancaFactual}
                  />
                  <ScorePill
                    label="Originalidade"
                    value={selected.scores.originalidade}
                  />
                </div>
              )}

              {selected.promise && (
                <Detail label="Promessa" value={selected.promise} />
              )}
              {selected.why_interesting && (
                <Detail
                  label="Por que funciona"
                  value={selected.why_interesting}
                />
              )}
              {selected.evidence_anchor && (
                <Detail
                  label="Âncora de evidência"
                  value={selected.evidence_anchor}
                />
              )}
              {selected.undercovered_reason && (
                <Detail
                  label="Lacuna editorial"
                  value={selected.undercovered_reason}
                  accent="text-cyan-300/80"
                />
              )}
              {selected.premium_upgrade && (
                <Detail
                  label="Diferencial premium"
                  value={selected.premium_upgrade}
                  accent="text-violet-300/80"
                />
              )}
              {(selected.controversy_hook || selected.validation_needed) && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    Risco / verificação
                  </p>
                  {selected.controversy_hook && (
                    <p className="mt-1 text-[11px] leading-5 text-amber-100/80">
                      {selected.controversy_hook}
                    </p>
                  )}
                  {selected.validation_needed && (
                    <p className="mt-1 text-[11px] leading-5 text-amber-200/70">
                      Validar: {selected.validation_needed}
                    </p>
                  )}
                </div>
              )}
              {selected.sample_items && selected.sample_items.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Itens possíveis
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                    {selected.sample_items.slice(0, 6).join(" · ")}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelect(selectedIndex, selected)}
                className="w-full rounded-xl bg-gold-500 px-4 py-2.5 text-[11px] font-black text-zinc-950 transition hover:bg-gold-400"
              >
                Selecionar e revisar critério
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-[11px] leading-5 ${accent || "text-zinc-300"}`}>
        {value}
      </p>
    </div>
  );
}
