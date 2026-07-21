/**
 * Valida material do wizard antes de ações críticas (ex.: Engenharia Visual PRO).
 * Bloqueia só o que quebraria o endpoint; avisos não impedem o avanço.
 */

export type WizardValidationInput = {
  projectName?: string | null;
  nicheInput?: string | null;
  formatSelector?: string | null;
  narrativeScript?: string | null;
  narrationDraft?: string | null;
  visualPrompts?: unknown[] | null;
};

export type WizardValidationResult = {
  ok: boolean;
  problemas: string[];
  avisos: string[];
  podeProsseguir: boolean;
};

function countWords(text: string): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function validateWizardInputForVisualPro(
  session: WizardValidationInput
): WizardValidationResult {
  const problemas: string[] = [];
  const avisos: string[] = [];

  const project = String(session.projectName || "").trim();
  if (!project) {
    problemas.push("Projeto não identificado.");
  }

  const niche = String(session.nicheInput || "").trim();
  if (!niche) {
    avisos.push("Nicho não definido — o VPE detectará o nicho só pelo roteiro.");
  } else if (niche.length < 3) {
    avisos.push("Nicho muito genérico — especifique mais para melhor DNA visual.");
  }

  const format = String(session.formatSelector || "").toUpperCase();
  if (format && !["LONGO", "SHORTS", "SHORT", "LONG"].includes(format)) {
    avisos.push(`Formato incomum: ${format}`);
  }

  const narration = String(
    session.narrativeScript || session.narrationDraft || ""
  ).trim();
  if (!narration) {
    problemas.push(
      "Nenhuma narração no storyboard — volte ao passo de roteiro/narração."
    );
  } else if (narration.length < 80) {
    avisos.push("Narração muito curta — o vídeo pode ficar raso.");
  }

  if (
    (format === "SHORTS" || format === "SHORT") &&
    countWords(narration) > 160
  ) {
    avisos.push(
      "SHORTS com narração longa (>160 palavras) — o vídeo pode passar de 60s."
    );
  }

  const prompts = Array.isArray(session.visualPrompts)
    ? session.visualPrompts
    : [];
  if (prompts.length === 0) {
    problemas.push(
      "Nenhuma cena (visual_prompts) para reprocessar — gere o roteiro com cenas primeiro."
    );
  } else {
    const semPrompt = prompts.filter((vp) => {
      const p = vp as Record<string, unknown>;
      return !String(p?.prompt || p?.image_prompt || p?.video_prompt || "").trim();
    });
    if (semPrompt.length > 0) {
      avisos.push(
        `${semPrompt.length} cena(s) sem prompt visual — o VPE vai gerar do zero a partir da narração.`
      );
    }
  }

  return {
    ok: problemas.length === 0,
    problemas,
    avisos,
    podeProsseguir: problemas.length === 0,
  };
}
