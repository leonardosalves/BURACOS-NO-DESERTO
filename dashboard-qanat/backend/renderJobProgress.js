/**
 * Progresso de render Remotion/Python — persiste em disco para sobreviver a quedas do backend/SSE.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_DIR = path.join(
  __dirname,
  "..",
  "..",
  ".lumiera-logs",
  "render-jobs"
);
const ACTIVE_TTL_MS = 4 * 60 * 60 * 1000;
const MAX_LOG_LINES = 120;

const jobs = new Map();
let activeRenderCountCache = { count: 0, at: 0 };
const ACTIVE_RENDER_COUNT_TTL_MS = 5000;

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
    return JSON.parse(fs.readFileSync(jobFilePath(jobId), "utf8"));
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
    console.warn("[RenderJob] Falha ao persistir job:", err.message);
  }
}

function deleteJobFromDisk(jobId) {
  try {
    fs.unlinkSync(jobFilePath(jobId));
  } catch {
    /* optional */
  }
}

function normalizeRenderJobId(id = "") {
  const s = String(id || "").trim();
  return /^render_[a-z0-9_-]{8,120}$/i.test(s) ? s : "";
}

export function createRenderJobId(projectSlug = "") {
  const slug =
    String(projectSlug || "project")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 48) || "project";
  return `render_${slug}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRenderJob({
  jobId,
  projectName = "",
  projDir = "",
  mode = "remotion",
  outputPath = "",
} = {}) {
  const id = normalizeRenderJobId(jobId) || createRenderJobId(projectName);
  const job = {
    jobId: id,
    projectName: String(projectName || ""),
    projDir: String(projDir || ""),
    mode: String(mode || "remotion"),
    outputPath: String(outputPath || ""),
    status: "preparing",
    percent: 0,
    phase: "Preparando render…",
    childPid: null,
    logs: [],
    done: false,
    error: null,
    createdAt: now(),
    updatedAt: now(),
  };
  jobs.set(id, job);
  writeJobToDisk(job);
  return job;
}

export function updateRenderJob(jobId, patch = {}) {
  const id = normalizeRenderJobId(jobId);
  if (!id) return null;
  const prev = jobs.get(id) || readJobFromDisk(id);
  if (!prev) return null;
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

export function appendRenderJobLog(jobId, line = "") {
  const id = normalizeRenderJobId(jobId);
  if (!id) return null;
  const text = String(line || "").trim();
  if (!text) return getRenderJob(id);
  const prev = jobs.get(id) || readJobFromDisk(id);
  if (!prev) return null;
  const logs = [...(prev.logs || []), text].slice(-MAX_LOG_LINES);
  return updateRenderJob(id, { logs });
}

export function finishRenderJob(
  jobId,
  { outputPath = "", phase = "Concluído!" } = {}
) {
  return updateRenderJob(jobId, {
    status: "done",
    phase,
    percent: 100,
    done: true,
    outputPath: outputPath || undefined,
    childPid: null,
  });
}

export function failRenderJob(jobId, error = "Falha no render") {
  return updateRenderJob(jobId, {
    status: "failed",
    phase: "Erro na renderização",
    percent: 100,
    done: true,
    error: String(error || "Falha"),
    childPid: null,
  });
}

export function getRenderJob(jobId) {
  const id = normalizeRenderJobId(jobId);
  if (!id) return null;
  if (jobs.has(id)) return jobs.get(id);
  const disk = readJobFromDisk(id);
  if (disk) {
    jobs.set(id, disk);
    return disk;
  }
  return null;
}

export function listRenderJobs({
  projectName = null,
  activeOnly = false,
} = {}) {
  ensureJobsDir();
  const out = [];
  const cutoff = now() - ACTIVE_TTL_MS;
  for (const file of fs.readdirSync(JOBS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const job = readJobFromDisk(file.replace(/\.json$/, ""));
    if (!job) continue;
    if (projectName && job.projectName !== projectName) continue;
    if (activeOnly) {
      const active = ["preparing", "rendering"].includes(job.status);
      if (!active || (job.updatedAt || 0) < cutoff) continue;
    }
    out.push(job);
  }
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getActiveRenderJobForProject(projectName = "") {
  const list = listRenderJobs({ projectName, activeOnly: true });
  return list[0] || null;
}

export function countActiveRenderJobs() {
  const ts = now();
  if (ts - activeRenderCountCache.at < ACTIVE_RENDER_COUNT_TTL_MS) {
    return activeRenderCountCache.count;
  }
  const count = listRenderJobs({ activeOnly: true }).length;
  activeRenderCountCache = { count, at: ts };
  return count;
}

/** Usado pelo watchdog — true se há render em andamento (arquivo recente + PID vivo, se houver). */
export function isRenderProcessActive(job = null) {
  const active = job || listRenderJobs({ activeOnly: true })[0];
  if (!active) return false;
  if (!active.childPid)
    return ["preparing", "rendering"].includes(active.status);
  try {
    process.kill(active.childPid, 0);
    return true;
  } catch {
    return (
      ["preparing", "rendering"].includes(active.status) &&
      now() - (active.updatedAt || 0) < 120_000
    );
  }
}

function isPidAlive(pid) {
  const p = Number(pid) || 0;
  if (p <= 0) return false;
  try {
    process.kill(p, 0);
    return true;
  } catch {
    return false;
  }
}

export function cleanupStaleRenderJobs() {
  const cutoff = now() - ACTIVE_TTL_MS;
  for (const job of listRenderJobs()) {
    const stale = (job.updatedAt || 0) < cutoff;
    if (!stale) continue;

    if (job.done) {
      jobs.delete(job.jobId);
      deleteJobFromDisk(job.jobId);
      continue;
    }

    // Órfão: não concluído e sem atualização recente. Só recolhe se o processo
    // morreu/sumiu (PID ausente ou morto). Render longo com PID vivo é preservado.
    if (isPidAlive(job.childPid)) continue;

    updateRenderJob(job.jobId, {
      status: "failed",
      phase: "Render interrompido",
      done: true,
      error: "Render órfão: o processo não respondeu e o backend reiniciou.",
      childPid: null,
    });
  }
}
