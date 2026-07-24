export type CreatorWizardPhase = {
  id: "idea" | "ranking" | "story" | "voice" | "scenes" | "finish" | "publish";
  label: string;
  shortLabel: string;
  entryStep: number;
  legacySteps: number[];
  description: string;
};

export const CREATOR_WIZARD_PHASES: CreatorWizardPhase[] = [
  {
    id: "story",
    label: "Ideia e roteiro",
    shortLabel: "Roteiro",
    entryStep: 1,
    legacySteps: [1],
    description: "Pesquisa, estrutura e aprovação do texto",
  },
  {
    id: "voice",
    label: "Voz e timing",
    shortLabel: "Voz",
    entryStep: 2,
    legacySteps: [2, 3],
    description: "TTS, upload, trechos e sincronização",
  },
  {
    id: "scenes",
    label: "Cenas e edição",
    shortLabel: "Cenas",
    entryStep: 4,
    legacySteps: [4],
    description: "B-roll, prompts, motion e timeline",
  },
  {
    id: "finish",
    label: "Finalizar",
    shortLabel: "Final",
    entryStep: 5,
    legacySteps: [5, 6],
    description: "Mixagem, render, metadados e thumbnail",
  },
  {
    id: "publish",
    label: "Publicar",
    shortLabel: "Publicar",
    entryStep: 7,
    legacySteps: [7],
    description: "Revisão final e envio ao canal",
  },
];

export function creatorWizardPhaseIndex(step: number) {
  const found = CREATOR_WIZARD_PHASES.findIndex((phase) =>
    phase.legacySteps.includes(Number(step))
  );
  return found >= 0 ? found : 0;
}

/**
 * Índice da fase dentro de um array de fases específico do modo.
 * Retorna a primeira fase cujo legacySteps inclui o passo atual.
 */
export function creatorModePhaseIndex(
  step: number,
  phases: CreatorWizardPhase[]
) {
  const found = phases.findIndex((phase) =>
    phase.legacySteps.includes(Number(step))
  );
  return found >= 0 ? found : 0;
}

export function normalizeCreatorWizardStep(step: unknown) {
  const numeric = Number(step) || 1;
  if (numeric === 3) return 2;
  if (numeric === 6) return 5;
  return [1, 2, 4, 5, 7].includes(numeric) ? numeric : 1;
}

export function creatorTimelineReady({
  whisperReady,
}: {
  narrationMode?: string;
  chunkPlanReady: boolean;
  whisperReady: boolean;
}) {
  // O plano de chunks conhece a duração dos arquivos, mas somente o Whisper
  // posterior à aprovação conhece a janela real de cada fala/cena.
  return whisperReady;
}
