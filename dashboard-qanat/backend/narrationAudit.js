import fs from "fs";
import path from "path";
import crypto from "crypto";

export const NARRATION_AUDIT_FILE = "narration_audit.json";

export function readNarrationAudit(projDir) {
  const file = path.join(projDir, NARRATION_AUDIT_FILE);
  if (!fs.existsSync(file)) return { version: 1, events: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      version: 1,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { version: 1, events: [] };
  }
}

export function appendNarrationAuditEvent(projDir, event = {}) {
  const audit = readNarrationAudit(projDir);
  const entry = {
    id: event.id || crypto.randomUUID(),
    at: event.at || new Date().toISOString(),
    ...event,
  };
  audit.events = [...audit.events, entry].slice(-1000);
  const file = path.join(projDir, NARRATION_AUDIT_FILE);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(audit, null, 2), "utf8");
  fs.renameSync(temp, file);
  return entry;
}

export function latestNarrationReviews(events = []) {
  const reviews = {};
  for (const event of events) {
    if (event.type === "review" && event.chunk_id)
      reviews[event.chunk_id] = event;
  }
  return reviews;
}

function eventTime(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Aprovação válida pertence à versão de áudio atual. Se o trecho foi
 * regenerado depois da revisão, ele volta automaticamente para pendente.
 */
export function narrationChunkApprovalState(plan = {}, events = []) {
  const reviews = latestNarrationReviews(events);
  const chunks = Array.isArray(plan?.chunks) ? plan.chunks : [];
  const items = chunks.map((chunk) => {
    const id = String(chunk?.id || "").trim();
    const review = reviews[id] || null;
    const generatedAt = eventTime(chunk?.generated_at);
    const reviewedAt = eventTime(review?.at);
    const audioReady =
      chunk?.status === "generated" && Number(chunk?.duration_s) > 0;
    const approvalCurrent = reviewedAt > 0 && reviewedAt >= generatedAt;
    const approved = Boolean(
      audioReady && approvalCurrent && review?.decision === "approved"
    );
    let reason = null;
    if (!audioReady) reason = "audio_not_generated";
    else if (!review) reason = "awaiting_review";
    else if (!approvalCurrent) reason = "audio_changed_after_review";
    else if (review.decision !== "approved") reason = review.decision;
    return { id, approved, reason, review };
  });
  const blockers = items.filter((item) => !item.approved);
  return {
    ready: items.length > 0 && blockers.length === 0,
    approved_count: items.length - blockers.length,
    total_count: items.length,
    items,
    blockers,
  };
}

export function assertNarrationChunksApproved(plan = {}, events = []) {
  const state = narrationChunkApprovalState(plan, events);
  if (!state.ready) {
    const labels = state.blockers
      .slice(0, 8)
      .map((item) => `${item.id || "trecho"}: ${item.reason}`)
      .join("; ");
    const error = new Error(
      `Revise e aprove todos os áudios antes do Whisper${labels ? ` (${labels})` : ""}.`
    );
    error.code = "NARRATION_REVIEW_REQUIRED";
    error.approval = state;
    throw error;
  }
  return state;
}

export function assertApprovedNarrationMasterReady(plan = {}, events = []) {
  const approval = assertNarrationChunksApproved(plan, events);
  const latestAssembly = [...events]
    .reverse()
    .find((event) => event?.type === "master_assembled");
  const assembledAt = eventTime(latestAssembly?.at);
  const newestAudioOrReview = Math.max(
    0,
    ...(plan?.chunks || []).flatMap((chunk) => [
      eventTime(chunk?.generated_at),
      eventTime(
        approval.items.find((item) => item.id === chunk.id)?.review?.at
      ),
    ])
  );
  if (!latestAssembly || assembledAt < newestAudioOrReview) {
    const error = new Error(
      "Monte novamente a narração aprovada antes de executar o Whisper."
    );
    error.code = "APPROVED_MASTER_REQUIRED";
    throw error;
  }
  return { approval, assembly: latestAssembly };
}
