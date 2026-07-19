const activeJobs = new Map();

function normalizeJob(promptId, job) {
  if (job && typeof job === "object") {
    return { prompt_id: promptId, ...job, updated_at: Date.now() };
  }
  return {
    prompt_id: promptId,
    status: "running",
    percent: 0,
    message: String(job || "Processando..."),
    outputs: null,
    error: null,
    started_at: Date.now(),
    updated_at: Date.now(),
  };
}

export function registerExternalJob(promptId, job) {
  activeJobs.set(promptId, normalizeJob(promptId, job));
}

export function updateExternalJob(promptId, patch) {
  const current = activeJobs.get(promptId);
  if (!current) return;
  activeJobs.set(promptId, { ...current, ...patch, updated_at: Date.now() });
}

export function getExternalJobProgress(promptId) {
  const job = activeJobs.get(promptId);
  if (!job) {
    return { status: "unknown", percent: 0, message: "Job não encontrado." };
  }
  return {
    prompt_id: job.prompt_id,
    status: job.error ? "error" : job.status,
    percent: job.percent ?? 0,
    message: job.message,
    outputs: job.outputs || undefined,
    error: job.error || undefined,
    settings: job.settings || undefined,
  };
}

export function resolveExternalJobOutput(promptId) {
  const output = activeJobs.get(promptId)?.outputs?.[0];
  return output?.filepath || null;
}

export function removeExternalJob(promptId) {
  activeJobs.delete(promptId);
}
