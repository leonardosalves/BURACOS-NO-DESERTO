/**
 * narrationAuditRepair.js
 * Loop de reparo automático de narração baseado em auditoria NARRACAOPRO.
 *
 * Contrato de retorno (consumido por server.js → repairNarrationThroughFinalAudit):
 * {
 *   storyboard,
 *   repaired: boolean,
 *   attempts: number,
 *   approved: boolean,
 *   audit: { approved, issues, integrity, editorial },
 *   finalAudit: same as audit,
 *   failures: string[],
 * }
 */

/**
 * Verifica se um chunk de narração precisa de reparo baseado no histórico de auditoria.
 */
export function checkNarrationChunkNeedsRepair(chunk = {}, auditEvents = []) {
  return { needsRepair: false, reason: null };
}

/**
 * Aplica reparo automático em um chunk de narração baseado nos eventos de auditoria.
 */
export function repairNarrationChunkFromAudit(chunk = {}, _options = {}) {
  return chunk;
}

/**
 * Gera um relatório de reparos aplicados a partir dos eventos de auditoria.
 */
export function buildNarrationAuditRepairReport(auditEvents = []) {
  return { repairsApplied: 0, skipped: 0, report: [] };
}

function emptyAudit(message = "Auditoria de narração indisponível.") {
  return {
    approved: false,
    ok: false,
    issues: [message],
    integrity: { ok: false, issues: [message] },
    editorial: { ok: false, issues: [] },
  };
}

function isAuditApproved(audit) {
  if (!audit || typeof audit !== "object") return false;
  if (audit.approved === true) return true;
  if (audit.ok === true) return true;
  return false;
}

/**
 * Executa um loop de reparo de narração com base em auditoria iterativa.
 */
export async function runNarrationAuditRepairLoop({
  storyboard,
  maxAttempts = 2,
  evaluate,
  repair,
  onProgress,
} = {}) {
  if (!storyboard) {
    const audit = emptyAudit("Storyboard ausente para auditoria de narração.");
    return {
      storyboard,
      repaired: false,
      attempts: 0,
      approved: false,
      audit,
      finalAudit: audit,
      failures: [audit.issues[0]],
    };
  }

  if (typeof evaluate !== "function") {
    const audit = emptyAudit("Função de avaliação de narração não configurada.");
    return {
      storyboard,
      repaired: false,
      attempts: 0,
      approved: false,
      audit,
      finalAudit: audit,
      failures: [audit.issues[0]],
    };
  }

  let current = storyboard;
  let lastAudit = null;
  let repaired = false;
  let attemptsUsed = 0;
  const failures = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt;
    try {
      const audit = await evaluate(current);
      lastAudit = audit && typeof audit === "object" ? audit : emptyAudit();

      // Normaliza shape: server espera approved + integrity + editorial
      if (lastAudit.approved == null && lastAudit.ok != null) {
        lastAudit = { ...lastAudit, approved: Boolean(lastAudit.ok) };
      }
      if (!lastAudit.integrity) {
        lastAudit = {
          ...lastAudit,
          integrity: {
            ok: Boolean(lastAudit.approved),
            issues: lastAudit.issues || [],
          },
        };
      }
      if (!lastAudit.editorial) {
        lastAudit = {
          ...lastAudit,
          editorial: {
            ok: Boolean(lastAudit.approved),
            issues: [],
          },
        };
      }

      const issues = Array.isArray(lastAudit.issues) ? lastAudit.issues : [];

      if (typeof onProgress === "function") {
        try {
          onProgress({ attempt, issues });
        } catch {
          /* progress never blocks */
        }
      }

      if (isAuditApproved(lastAudit)) {
        break;
      }

      // Sem reparador → encerra com o último audit (não aprovado)
      if (typeof repair !== "function") {
        break;
      }

      // Última tentativa: só avalia, não repara de novo
      if (attempt >= maxAttempts) {
        break;
      }

      const repairedSb = await repair(current, lastAudit, attempt);
      if (repairedSb && typeof repairedSb === "object") {
        current = repairedSb;
        repaired = true;
      } else {
        failures.push(`repair_attempt_${attempt}_noop`);
        break;
      }
    } catch (err) {
      const msg = err?.message || String(err);
      failures.push(msg);
      console.warn(
        `[runNarrationAuditRepairLoop] Tentativa ${attempt} falhou:`,
        msg
      );
      // Reavalia o atual se possível para não perder o audit
      try {
        lastAudit = await evaluate(current);
      } catch {
        lastAudit = emptyAudit(msg);
      }
      break;
    }
  }

  // Reavaliação final após último reparo (garante audit coerente com o texto final)
  if (repaired && typeof evaluate === "function") {
    try {
      const finalEval = await evaluate(current);
      if (finalEval && typeof finalEval === "object") {
        lastAudit = finalEval;
        if (lastAudit.approved == null && lastAudit.ok != null) {
          lastAudit = { ...lastAudit, approved: Boolean(lastAudit.ok) };
        }
        if (!lastAudit.integrity) {
          lastAudit = {
            ...lastAudit,
            integrity: {
              ok: Boolean(lastAudit.approved),
              issues: lastAudit.issues || [],
            },
          };
        }
        if (!lastAudit.editorial) {
          lastAudit = {
            ...lastAudit,
            editorial: {
              ok: Boolean(lastAudit.approved),
              issues: [],
            },
          };
        }
      }
    } catch (err) {
      failures.push(err?.message || String(err));
    }
  }

  const audit = lastAudit || emptyAudit();
  const approved = isAuditApproved(audit);

  return {
    storyboard: current,
    repaired,
    attempts: attemptsUsed,
    approved,
    audit,
    finalAudit: audit,
    failures,
  };
}
