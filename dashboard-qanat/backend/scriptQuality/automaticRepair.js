function hardBlockerCount(report) {
  return Array.isArray(report?.hardBlockers) ? report.hardBlockers.length : 0;
}

function reportScore(report) {
  return Number.isFinite(report?.score) ? report.score : Number.NEGATIVE_INFINITY;
}

function factualIntegrityPassed(report) {
  return report?.dimensions?.factual?.ok === true;
}

function errorReason(prefix, error) {
  const message = error instanceof Error ? error.message : String(error || "unknown error");
  return `${prefix}: ${message}`;
}

function normalizeRepairResult(result) {
  if (typeof result === "string") {
    return result;
  }
  if (result && typeof result.script === "string") {
    return result.script;
  }
  if (result && typeof result.narrativeScript === "string") {
    return result.narrativeScript;
  }
  if (result && typeof result.narrative_script === "string") {
    return result.narrative_script;
  }
  if (result && typeof result.repaired_narrative === "string") {
    return result.repaired_narrative;
  }
  return "";
}

function reject({
  originalScript,
  candidateScript = null,
  beforeReport = null,
  afterReport = null,
  attempted,
  rejectionReason,
}) {
  return {
    script: originalScript,
    selectedScript: originalScript,
    originalScript,
    candidateScript,
    beforeReport,
    afterReport,
    attempted,
    accepted: false,
    rejectionReason,
  };
}

/**
 * Runs at most one provider-independent repair pass for a script-quality report.
 */
export async function runAutomaticScriptRepair({
  script = "",
  evaluate,
  repair,
  context = {},
} = {}) {
  if (typeof evaluate !== "function") {
    throw new TypeError("runAutomaticScriptRepair requires an evaluate callback.");
  }
  if (typeof repair !== "function") {
    throw new TypeError("runAutomaticScriptRepair requires a repair callback.");
  }

  const originalScript = String(script ?? "");
  let beforeReport;

  try {
    beforeReport = await evaluate(originalScript, context);
  } catch (error) {
    return reject({
      originalScript,
      attempted: false,
      rejectionReason: errorReason("evaluate_failed", error),
    });
  }

  if (beforeReport?.passed === true) {
    return {
      script: originalScript,
      selectedScript: originalScript,
      originalScript,
      candidateScript: null,
      beforeReport,
      afterReport: null,
      attempted: false,
      accepted: false,
      rejectionReason: null,
    };
  }

  let candidateScript;
  try {
    candidateScript = normalizeRepairResult(
      await repair(originalScript, beforeReport, context)
    );
  } catch (error) {
    return reject({
      originalScript,
      beforeReport,
      attempted: true,
      rejectionReason: errorReason("repair_failed", error),
    });
  }

  let afterReport;
  try {
    afterReport = await evaluate(candidateScript, context);
  } catch (error) {
    return reject({
      originalScript,
      candidateScript,
      beforeReport,
      attempted: true,
      rejectionReason: errorReason("candidate_evaluate_failed", error),
    });
  }

  const beforeScore = reportScore(beforeReport);
  const afterScore = reportScore(afterReport);
  const beforeHardBlockers = hardBlockerCount(beforeReport);
  const afterHardBlockers = hardBlockerCount(afterReport);

  let rejectionReason = null;
  if (afterScore <= beforeScore) {
    rejectionReason = "score_not_improved";
  } else if (!factualIntegrityPassed(afterReport)) {
    rejectionReason = "factual_integrity_failed";
  } else if (afterHardBlockers > beforeHardBlockers) {
    rejectionReason = "hard_blockers_increased";
  }

  if (rejectionReason) {
    return reject({
      originalScript,
      candidateScript,
      beforeReport,
      afterReport,
      attempted: true,
      rejectionReason,
    });
  }

  return {
    script: candidateScript,
    selectedScript: candidateScript,
    originalScript,
    candidateScript,
    beforeReport,
    afterReport,
    attempted: true,
    accepted: true,
    rejectionReason: null,
  };
}

function selectFinalReport(result = {}) {
  return result.accepted && result.afterReport ? result.afterReport : result.beforeReport;
}

export function buildAutomaticScriptQualityMetadata(result = {}) {
  const selectedReport = selectFinalReport(result) || null;
  return {
    quality: {
      selected: result.accepted ? "repaired" : "original",
      report: selectedReport,
      original_report: result.beforeReport || null,
      repaired_report: result.afterReport || null,
    },
    repair: {
      attempted: result.attempted === true,
      accepted: result.accepted === true,
      rejection_reason: result.rejectionReason || null,
      candidate_present:
        typeof result.candidateScript === "string" && result.candidateScript.length > 0,
    },
  };
}

export function applyAutomaticScriptRepairToStoryboard(storyboard = {}, result = {}) {
  const selectedScript =
    typeof result.script === "string" ? result.script : String(storyboard.narrative_script || "");
  const metadata = buildAutomaticScriptQualityMetadata(result);
  const next = {
    ...storyboard,
    narrative_script: selectedScript,
    automatic_script_quality: metadata.quality,
    automatic_script_repair: metadata.repair,
  };

  if (result.accepted === true) {
    next.narrative_script_tagged = selectedScript;
    next.technical_config = {
      ...(next.technical_config || {}),
      script: selectedScript,
    };
  }

  return next;
}
