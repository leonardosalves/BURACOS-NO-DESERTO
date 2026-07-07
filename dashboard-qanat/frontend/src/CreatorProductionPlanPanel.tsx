import { MapPin, Film, Sparkles } from "lucide-react";
import {
  buildCreatorProductionPlan,
  type CreatorProductionPlanSummary,
} from "./creatorProductionPlan";

export function CreatorProductionPlanPanel({
  storyboard,
}: {
  storyboard: Record<string, unknown> | null | undefined;
}) {
  const plan: CreatorProductionPlanSummary | null =
    buildCreatorProductionPlan(storyboard);

  if (!plan || (plan.remotionCount === 0 && plan.brollCount === 0)) {
    return null;
  }

  const orch = plan.orchestration;
  const qcOk = orch?.quality_ok !== false;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-300 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-violet-200">
              Plano de produção IA
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed max-w-xl">
              A IA divide o roteiro: cenas Remotion (mapa, dados, gráficos) vs
              B-roll (vídeo/imagem gerado). Não competem na mesma trilha — por
              cena escolhe um ou outro.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[9px] font-mono">
          <span className="px-2 py-1 rounded-md bg-violet-500/15 text-violet-200 border border-violet-500/30">
            🟣 {plan.remotionCount} Remotion
          </span>
          <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-200 border border-sky-500/25">
            🎬 {plan.brollCount} B-roll
          </span>
          {orch?.quality_score != null ? (
            <span
              className={`px-2 py-1 rounded-md border ${
                qcOk
                  ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-200 border-amber-500/30"
              }`}
            >
              QC {orch.quality_score}/100
            </span>
          ) : null}
          {orch?.niche_pack ? (
            <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700">
              {orch.niche_pack}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
        {plan.rows.map((row) => (
          <div
            key={`${row.kind}-${row.sceneRef}`}
            className={`flex items-start gap-2 rounded-xl px-3 py-2 border text-[10px] ${
              row.kind === "remotion"
                ? "border-violet-500/30 bg-violet-950/30"
                : "border-zinc-700/80 bg-zinc-900/40"
            }`}
          >
            {row.kind === "remotion" ? (
              <MapPin className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
            ) : (
              <Film className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-white">{row.sceneRef}</span>
                <span
                  className={
                    row.kind === "remotion" ? "text-violet-300" : "text-sky-300"
                  }
                >
                  {row.label}
                </span>
                {row.templateId ? (
                  <span className="text-zinc-500 font-mono text-[9px]">
                    {row.templateId}
                  </span>
                ) : null}
                {row.hasAsset ? (
                  <span className="text-[8px] text-emerald-400/90 uppercase">
                    asset ✓
                  </span>
                ) : null}
              </div>
              {row.narrationPreview ? (
                <p className="text-zinc-500 mt-0.5 leading-snug truncate">
                  {row.narrationPreview}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {orch && orch.orchestration_ok === false ? (
        <p className="text-[9px] text-amber-300/90">
          Orquestração parcial — abra o Editor de Timing e clique «Cenas
          Remotion» para refinar mapas/QC.
        </p>
      ) : null}
    </div>
  );
}
