import { estimateFishSpeechSeconds } from "./shortsSceneChunker.js";

const MIN_BLOCK_SECONDS = 3;
const MAX_BLOCK_SECONDS_NO_PAUSE = 18;
const IDEAL_MAX_SECONDS = 12;

/**
 * Analisa o chunk plan e sinaliza blocos com densidade inadequada:
 * - Blocos curtos demais (< 3s) — pode indicar fragmentação excessiva
 * - Blocos longos sem pausa (> 18s) — risco de monotonia
 * - Blocos acima do ideal (> 12s) — sugestão de re-escrita pontual
 *
 * Retorna array de flags para o frontend/pipeline decidir se re-prompts.
 */
export function analyzeNarrationDensity(
  chunkPlan = [],
  { prosodySpeed = 1 } = {}
) {
  if (!Array.isArray(chunkPlan) || chunkPlan.length === 0) return [];

  const flags = [];

  for (const chunk of chunkPlan) {
    const text = String(chunk.text || chunk.narration_text || "").trim();
    if (!text) continue;

    const estimatedSeconds = estimateFishSpeechSeconds(text, prosodySpeed);
    const blockId = chunk.id || chunk.block || "";

    if (estimatedSeconds < MIN_BLOCK_SECONDS) {
      flags.push({
        block: blockId,
        type: "too_short",
        estimated_seconds: Math.round(estimatedSeconds * 10) / 10,
        message: `Bloco muito curto (~${Math.round(estimatedSeconds)}s). Considere unir com o próximo.`,
        severity: "info",
      });
    } else if (estimatedSeconds > MAX_BLOCK_SECONDS_NO_PAUSE) {
      const hasInternalPause = /[.!?…]/.test(text.slice(10, -1));
      flags.push({
        block: blockId,
        type: "too_long_no_pause",
        estimated_seconds: Math.round(estimatedSeconds * 10) / 10,
        message: `Bloco longo (~${Math.round(estimatedSeconds)}s) ${hasInternalPause ? "com pausas internas" : "SEM pausas internas"}. ${hasInternalPause ? "Aceitável, mas considere dividir." : "Reescreva com ponto final intermediário ou divida em 2 blocos."}`,
        severity: hasInternalPause ? "warning" : "error",
      });
    } else if (estimatedSeconds > IDEAL_MAX_SECONDS) {
      flags.push({
        block: blockId,
        type: "above_ideal",
        estimated_seconds: Math.round(estimatedSeconds * 10) / 10,
        message: `Bloco acima do ideal (~${Math.round(estimatedSeconds)}s > ${IDEAL_MAX_SECONDS}s). Considere pausas ou divisão.`,
        severity: "info",
      });
    }
  }

  return flags;
}

/**
 * Retorna true se o chunk plan tem algum bloco com severity "error".
 */
export function hasCriticalDensityIssues(chunkPlan = [], opts = {}) {
  return analyzeNarrationDensity(chunkPlan, opts).some(
    (f) => f.severity === "error"
  );
}
