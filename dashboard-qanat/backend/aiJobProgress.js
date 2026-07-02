/**
 * Progresso de jobs de IA — polling pelo frontend (toast + barra %).
 */

const jobs = new Map();
const TTL_MS = 10 * 60 * 1000;

function now() {
  return Date.now();
}

function cleanupStale() {
  const cutoff = now() - TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

export function normalizeJobId(id = "") {
  const s = String(id || "").trim();
  return /^job_[a-z0-9_-]{8,80}$/i.test(s) ? s : "";
}

export function setJobProgress(jobId, patch = {}) {
  const id = normalizeJobId(jobId);
  if (!id) return null;
  cleanupStale();
  const prev = jobs.get(id) || {
    jobId: id,
    phase: "start",
    label: "Iniciando…",
    percent: 0,
    detail: "",
    done: false,
    error: null,
    createdAt: now(),
  };
  const next = {
    ...prev,
    ...patch,
    jobId: id,
    updatedAt: now(),
    percent: Math.max(0, Math.min(100, Number(patch.percent ?? prev.percent) || 0)),
  };
  jobs.set(id, next);
  return next;
}

export function getJobProgress(jobId) {
  const id = normalizeJobId(jobId);
  if (!id) return null;
  return jobs.get(id) || null;
}

export function finishJobProgress(jobId, label = "Concluído") {
  return setJobProgress(jobId, { phase: "done", label, percent: 100, done: true });
}

export function finishJobProgressWithResult(jobId, result = {}, label = "Concluído") {
  return setJobProgress(jobId, {
    phase: "done",
    label,
    percent: 100,
    done: true,
    awaitingBrowser: false,
    result,
  });
}

export function setJobAwaitingBrowser(jobId, payload, label = "Aguardando Gemini no Chrome…") {
  return setJobProgress(jobId, {
    phase: "needs_browser",
    label,
    percent: 58,
    done: false,
    awaitingBrowser: true,
    result: payload,
  });
}

/** Captura res.json/status do handler quando o job roda em background. */
export function createProgressJobResponse(jobId) {
  let statusCode = 200;
  return {
    setHeader() {
      return this;
    },
    status(code) {
      statusCode = Number(code) || 200;
      return this;
    },
    json(payload) {
      if (payload?.needs_browser) {
        setJobAwaitingBrowser(jobId, payload);
        return;
      }
      if (statusCode >= 400 || payload?.error) {
        const errMsg = String(payload?.error || payload?.details || "Erro");
        failJobProgress(jobId, errMsg);
        setJobProgress(jobId, { result: payload, done: true, awaitingBrowser: false });
        return;
      }
      const label = payload?.phase === "narration"
        ? "Narração pronta para revisão"
        : "Roteiro completo";
      finishJobProgressWithResult(jobId, payload, label);
    },
  };
}

export function failJobProgress(jobId, error = "Falha no processamento") {
  return setJobProgress(jobId, {
    phase: "error",
    label: "Erro",
    percent: 100,
    done: true,
    error: String(error || "Falha"),
  });
}

export function createProgressReporter(jobId) {
  const id = normalizeJobId(jobId);
  if (!id) return () => {};
  return (phase, label, percent, detail = "") => {
    setJobProgress(id, { phase, label, percent, detail });
  };
}