import React, { useState } from "react";
import {
  AudioLines,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Lightbulb,
  ListOrdered,
  PackageCheck,
  Palette,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  CREATOR_WIZARD_PHASES,
  type CreatorWizardPhase,
} from "./creatorWizardFlow";
import type { CreatorModeIdentity } from "./creatorModeIdentity";
import { VisualAssetStylePicker } from "./VisualAssetStylePicker";

const PHASE_ICONS: Record<CreatorWizardPhase["id"], React.ElementType> = {
  idea: Lightbulb,
  ranking: ListOrdered,
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
  visualAssetStyle?: string | null;
  onVisualAssetStyleChange?: (styleId: string) => void;
  visualMapOnly?: boolean;
  onVisualMapOnlyChange?: (enabled: boolean) => void;
  onNavigate: (step: number) => void;
  onRestore: () => void | Promise<void>;
  onReset: () => void;
};

/**
 * Barra compacta do wizard — fases + estilo em uma faixa fina.
 * A área de trabalho abaixo fica com a maior parte da tela.
 */
export function CreatorWizardNavigator({
  phaseIndex,
  identity,
  savedAtLabel,
  enablePov,
  onPovChange,
  visualAssetStyle,
  onVisualAssetStyleChange,
  visualMapOnly = false,
  onVisualMapOnlyChange,
  onNavigate,
  onRestore,
  onReset,
}: Props) {
  const [stylesOpen, setStylesOpen] = useState(false);
  const phases = identity.wizardPhases ?? CREATOR_WIZARD_PHASES;
  const activePhase = phases[phaseIndex] ?? phases[0];
  const progress = ((phaseIndex + 1) / phases.length) * 100;

  return (
    <section className="relative shrink-0 rounded-2xl border border-white/[0.08] bg-[#090a0d]/95">
      <div className="px-3 py-2.5 sm:px-4">
        {/* Linha 1: fases compactas + % */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                {activePhase.label}
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                {String(phaseIndex + 1)}/{phases.length} · {identity.menuLabel}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 font-mono text-sm font-black ${identity.accentText}`}
          >
            {Math.round(progress)}%
          </span>
        </div>

        {/* Linha 2: pills de fase (altura baixa) */}
        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
          {phases.map((phase, index) => {
            const Icon = PHASE_ICONS[phase.id] ?? BookOpenText;
            const completed = index < phaseIndex;
            const active = index === phaseIndex;
            return (
              <button
                key={phase.id}
                type="button"
                disabled={!completed && !active}
                onClick={() => {
                  if (completed) onNavigate(phase.entryStep);
                }}
                aria-current={active ? "step" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[9px] font-black uppercase tracking-wide transition ${
                  active
                    ? `${identity.accentBorder} ${identity.accentSurface} ${identity.accentText}`
                    : completed
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/40"
                      : "cursor-default border-white/[0.05] bg-black/20 text-zinc-600 opacity-70"
                }`}
              >
                {completed ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                {phase.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Linha 3: ações + estilo compacto */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/[0.05] pt-2 text-[9px]">
          {savedAtLabel ? (
            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.07] px-2 py-1 font-bold text-emerald-300">
              Salvo {savedAtLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void onRestore()}
            className="rounded-md border border-sky-500/20 bg-sky-500/[0.07] px-2 py-1 font-bold text-sky-300 hover:bg-sky-500/15"
          >
            Restaurar
          </button>
          <label
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 font-bold ${
              enablePov
                ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-500"
            }`}
          >
            <input
              type="checkbox"
              checked={enablePov}
              onChange={(event) => onPovChange(event.target.checked)}
              className="accent-violet-500"
            />
            POV
          </label>

          {onVisualAssetStyleChange && (
            <>
              <div className="min-w-[140px] flex-1 sm:max-w-[220px]">
                <VisualAssetStylePicker
                  compact
                  value={visualAssetStyle}
                  onChange={onVisualAssetStyleChange}
                  mapOnly={visualMapOnly}
                  onMapOnlyChange={onVisualMapOnlyChange}
                />
              </div>
              <button
                type="button"
                onClick={() => setStylesOpen((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-bold transition ${
                  stylesOpen
                    ? "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100"
                    : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200"
                }`}
                title="Expandir grade de estilos"
              >
                <Palette className="h-3 w-3" />
                {stylesOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-500/15 bg-red-500/[0.05] px-2 py-1 font-bold text-red-300/80 hover:bg-red-500/10"
          >
            <RotateCcw className="h-3 w-3" /> Novo
          </button>
        </div>

        {/* Grade de estilos — só se o usuário abrir */}
        {stylesOpen && onVisualAssetStyleChange && (
          <div className="mt-2 max-h-[40vh] overflow-y-auto border-t border-white/[0.05] pt-2">
            <VisualAssetStylePicker
              value={visualAssetStyle}
              onChange={onVisualAssetStyleChange}
              mapOnly={visualMapOnly}
              onMapOnlyChange={onVisualMapOnlyChange}
            />
          </div>
        )}
      </div>
    </section>
  );
}
