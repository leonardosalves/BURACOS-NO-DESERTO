import React from "react";
import {
  AudioLines,
  BookOpenText,
  Check,
  Clapperboard,
  Fingerprint,
  PackageCheck,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  CREATOR_WIZARD_PHASES,
  type CreatorWizardPhase,
} from "./creatorWizardFlow";
import type { CreatorModeIdentity } from "./creatorModeIdentity";

const PHASE_ICONS: Record<CreatorWizardPhase["id"], React.ElementType> = {
  story: BookOpenText,
  voice: AudioLines,
  scenes: Clapperboard,
  finish: PackageCheck,
  publish: Send,
};

type Props = {
  phaseIndex: number;
  identity: CreatorModeIdentity;
  savedAtLabel?: string | null;
  enablePov: boolean;
  onPovChange: (enabled: boolean) => void;
  onNavigate: (step: number) => void;
  onRestore: () => void | Promise<void>;
  onReset: () => void;
};

export function CreatorWizardNavigator({
  phaseIndex,
  identity,
  savedAtLabel,
  enablePov,
  onPovChange,
  onNavigate,
  onRestore,
  onReset,
}: Props) {
  const activePhase = CREATOR_WIZARD_PHASES[phaseIndex];
  const progress = ((phaseIndex + 1) / CREATOR_WIZARD_PHASES.length) * 100;

  return (
    <section className="relative shrink-0 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#090a0d] shadow-[0_26px_80px_rgba(0,0,0,0.42)]">
      <div
        className={`pointer-events-none absolute inset-0 ${identity.halo}`}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,.75), transparent 78%)",
        }}
      />

      <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border ${identity.accentBorder} ${identity.accentSurface} px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.22em] ${identity.accentText}`}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              Estúdio Lumiera · {identity.menuLabel}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-[32px]">
                {activePhase.label}
              </h2>
              <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Fase {String(phaseIndex + 1).padStart(2, "0")} de{" "}
                {String(CREATOR_WIZARD_PHASES.length).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-400">
              {activePhase.description}. Cada aprovação alimenta a próxima etapa
              sem perder roteiro, vozes, cenas ou decisões editoriais.
            </p>
          </div>

          <div className="flex items-center gap-3 lg:justify-end">
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Progresso da produção
              </p>
              <p className={`mt-1 text-2xl font-black ${identity.accentText}`}>
                {Math.round(progress)}%
              </p>
            </div>
            <div
              className={`grid h-12 w-12 place-items-center rounded-2xl border ${identity.accentBorder} ${identity.accentSurface}`}
            >
              <Sparkles className={`h-5 w-5 ${identity.accentText}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CREATOR_WIZARD_PHASES.map((phase, index) => {
            const Icon = PHASE_ICONS[phase.id];
            const completed = index < phaseIndex;
            const active = index === phaseIndex;
            return (
              <button
                key={phase.id}
                type="button"
                disabled={!completed}
                onClick={() => completed && onNavigate(phase.entryStep)}
                aria-current={active ? "step" : undefined}
                className={`group relative min-h-[86px] overflow-hidden rounded-2xl border p-3 text-left transition duration-300 disabled:cursor-default ${
                  active
                    ? `${identity.accentBorder} ${identity.accentSurface} shadow-lg shadow-black/20`
                    : completed
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] hover:-translate-y-0.5 hover:border-emerald-400/35"
                      : "border-white/[0.06] bg-black/20 opacity-55"
                }`}
              >
                {active && (
                  <span
                    className={`absolute inset-x-0 top-0 h-0.5 ${identity.accentSurface}`}
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-xl border ${
                      active
                        ? `${identity.accentBorder} bg-black/20 ${identity.accentText}`
                        : completed
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-800 bg-zinc-950 text-zinc-600"
                    }`}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="font-mono text-[8px] font-bold text-zinc-600">
                    0{index + 1}
                  </span>
                </div>
                <p
                  className={`mt-3 text-[10px] font-black uppercase tracking-[0.08em] ${active ? "text-white" : completed ? "text-emerald-200" : "text-zinc-500"}`}
                >
                  {phase.shortLabel}
                </p>
                <p className="mt-1 line-clamp-1 text-[8px] text-zinc-600">
                  {completed
                    ? "Aprovado · revisar"
                    : active
                      ? "Em produção agora"
                      : "Aguardando etapa anterior"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4 text-[9px]">
          {savedAtLabel ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 font-bold text-emerald-300">
              Sessão salva {savedAtLabel}
            </span>
          ) : (
            <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-zinc-500">
              Salvamento automático ativo
            </span>
          )}
          <button
            type="button"
            onClick={() => void onRestore()}
            className="rounded-full border border-sky-500/20 bg-sky-500/[0.07] px-3 py-1.5 font-bold text-sky-300 transition hover:bg-sky-500/15"
          >
            Restaurar sessão
          </button>
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-bold transition ${
              enablePov
                ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-violet-500/30"
            }`}
          >
            <input
              type="checkbox"
              checked={enablePov}
              onChange={(event) => onPovChange(event.target.checked)}
              className="accent-violet-500"
            />
            POV em primeira pessoa
          </label>
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-500/15 bg-red-500/[0.05] px-3 py-1.5 font-bold text-red-300/80 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
          >
            <RotateCcw className="h-3 w-3" /> Novo projeto
          </button>
        </div>
      </div>
    </section>
  );
}
