/**
 * Progresso de jobs de IA — polling pelo frontend (toast + barra %).
 * Persiste em .lumiera-logs/ai-jobs para sobreviver a reinícios do backend.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_DIR = path.join(__dirname, "..", "..", ".lumiera-logs", "ai-jobs");
const TTL_MS = 10 * 60 * 1000;

const jobs = new Map();

function now() {
  return Date.now();
}

function ensureJobsDir() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function jobFilePath(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function readJobFromDisk(jobId) {
  try {
    const raw = fs.readFileSync(jobFilePath(jobId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJobToDisk(job) {
  if (!job?.jobId) return;
  try {
    ensureJobsDir();
    fs.writeFileSync(jobFilePath(job.jobId), JSON.stringify(job), "utf8");
  } catch (err) {
    console.warn("[AiJobProgress] Falha ao persistir job:", err.message);
  }
}

function deleteJobFromDisk(jobId) {
  try {
    fs.unlinkSync(jobFilePath(jobId));
  } catch {
    /* optional */
  }
}

function cleanupStale() {
  const cutoff = now() - TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) {
      jobs.delete(id);
      deleteJobFromDisk(id);
    }
  }
  try {
    ensureJobsDir();
    for (const file of fs.readdirSync(JOBS_DIR)) {
      if (!file.endsWith(".json")) continue;
      const full = path.join(JOBS_DIR, file);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch {
    /* optional */
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
  const prev = jobs.get(id) ||
    readJobFromDisk(id) || {
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
    percent: Math.max(
      0,
      Math.min(100, Number(patch.percent ?? prev.percent) || 0)
    ),
  };
  jobs.set(id, next);
  writeJobToDisk(next);
  return next;
}

export function getJobProgress(jobId) {
  const id = normalizeJobId(jobId);
  if (!id) return null;
  if (jobs.has(id)) return jobs.get(id);
  const disk = readJobFromDisk(id);
  if (disk) {
    jobs.set(id, disk);
    return disk;
  }
  return null;
}

/** Lista jobs de IA recentes (memória + disco). */
export function listAiJobs({ limit = 40, activeOnly = false } = {}) {
  cleanupStale();
  ensureJobsDir();
  const byId = new Map();
  for (const job of jobs.values()) {
    if (job?.jobId) byId.set(job.jobId, job);
  }
  try {
    for (const file of fs.readdirSync(JOBS_DIR)) {
      if (!file.endsWith(".json")) continue;
      const id = file.replace(/\.json$/, "");
      if (byId.has(id)) continue;
      const disk = readJobFromDisk(id);
      if (disk?.jobId) byId.set(disk.jobId, disk);
    }
  } catch {
    /* optional */
  }
  let list = [...byId.values()];
  if (activeOnly) {
    list = list.filter((j) => !j.done && !j.error);
  }
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list.slice(0, Math.max(1, Math.min(100, Number(limit) || 40)));
}

export function finishJobProgress(jobId, label = "Concluído") {
  return setJobProgress(jobId, {
    phase: "done",
    label,
    percent: 100,
    done: true,
  });
}

export function finishJobProgressWithResult(
  jobId,
  result = {},
  label = "Concluído"
) {
  return setJobProgress(jobId, {
    phase: "done",
    label,
    percent: 100,
    done: true,
    awaitingBrowser: false,
    result,
  });
}

export function setJobAwaitingBrowser(
  jobId,
  payload,
  label = "Aguardando Gemini no Chrome…"
) {
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
      if (payload?.phase === "notebooklm_pending") {
        setJobProgress(jobId, {
          phase: "notebooklm_pending",
          label: "NotebookLM aguarda sua resposta",
          percent: 22,
          done: true,
          awaitingBrowser: false,
          result: payload,
        });
        return;
      }
      if (statusCode >= 400 || payload?.error) {
        const detailText = Array.isArray(payload?.details)
          ? payload.details.filter(Boolean).join(" | ")
          : payload?.details
            ? String(payload.details)
            : "";
        const errMsg =
          [payload?.error, detailText].filter(Boolean).join(" — ") || "Erro";
        failJobProgress(jobId, errMsg);
        setJobProgress(jobId, {
          result: payload,
          done: true,
          error: errMsg,
          awaitingBrowser: false,
        });
        return;
      }
      const label =
        payload?.phase === "narration"
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
