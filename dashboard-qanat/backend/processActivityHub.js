/**
 * Hub de atividade do backend — buffer de requisições HTTP + chamadas LLM
 * para o painel lateral (modelo, provider, o que está fazendo).
 */

import fs from "fs";
import path from "path";

const MAX_REQUESTS = 200;
const MAX_AI_CALLS = 80;
const requestRing = [];
const aiCallRing = [];
let requestSeq = 0;
let aiCallSeq = 0;
const activeRequests = new Map();

const SKIP_PATH_RE =
  /^\/api\/(health|ops\/activity|ops\/service|ai\/progress)/i;

const AI_PATH_RE =
  /^\/api\/(ai|research|humor-facts|trends|youtube\/.*metadata|creator)/i;

function now() {
  return Date.now();
}

function safePath(url = "") {
  try {
    const u = String(url || "");
    const q = u.indexOf("?");
    return (q >= 0 ? u.slice(0, q) : u).slice(0, 240);
  } catch {
    return "/";
  }
}

function pickProject(req) {
  const q = req.query?.project;
  if (typeof q === "string" && q.trim()) return q.trim().slice(0, 120);
  if (Array.isArray(q) && q[0]) return String(q[0]).trim().slice(0, 120);
  const b = req.body?.project;
  if (typeof b === "string" && b.trim()) return b.trim().slice(0, 120);
  return "";
}

function guessAiLabelFromPath(pathOnly = "") {
  const p = String(pathOnly || "").toLowerCase();
  if (p.includes("enhance-visual") || p.includes("visual-prompt"))
    return "Engenharia Visual PRO";
  if (p.includes("narration") || p.includes("narracao")) return "Narração IA";
  if (p.includes("full-script") || p.includes("generate-script"))
    return "Roteiro completo";
  if (p.includes("optimize-youtube") || p.includes("youtube-metadata"))
    return "Metadados YouTube";
  if (p.includes("reverse-engineer")) return "Engenharia reversa";
  if (p.includes("humor-facts")) return "Fatos com Graça";
  if (p.includes("thumbnail")) return "Thumbnails IA";
  if (p.includes("deep") || p.includes("research"))
    return "Pesquisa / Deep Research";
  if (p.includes("seedance")) return "Seedance / vídeo IA";
  if (p.includes("ideas") || p.includes("radar")) return "Ideias / Radar";
  if (p.includes("tts") || p.includes("voice")) return "TTS / voz";
  return "Chamada IA";
}

/**
 * Middleware Express: registra cada chamada API (exceto health/activity).
 */
export function processActivityMiddleware(req, res, next) {
  const pathOnly = safePath(req.originalUrl || req.url || "");
  if (SKIP_PATH_RE.test(pathOnly) || req.method === "OPTIONS") {
    return next();
  }
  if (!pathOnly.startsWith("/api/")) return next();

  const started = now();
  const id = ++requestSeq;
  const isAiPath = AI_PATH_RE.test(pathOnly);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const entry = {
    id,
    method: String(req.method || "GET").toUpperCase(),
    path: pathOnly,
    project: pickProject(req),
    startedAt: started,
    status: null,
    durationMs: null,
    ok: null,
    kind: isAiPath ? "ai" : "api",
    label: isAiPath ? guessAiLabelFromPath(pathOnly) : "",
    progressJobId: body.progress_job_id
      ? String(body.progress_job_id).slice(0, 80)
      : "",
  };
  requestRing.unshift(entry);
  if (requestRing.length > MAX_REQUESTS) requestRing.length = MAX_REQUESTS;

  activeRequests.set(id, { req, res });

  if (isAiPath && entry.method !== "GET") {
    recordAiCall({
      source: "http",
      label: entry.label || "Chamada IA",
      path: pathOnly,
      project: entry.project,
      provider: null,
      model: null,
      modelsTried: [],
      status: "running",
      detail: body.title ? String(body.title).slice(0, 120) : "",
      httpRequestId: id,
    });
  }

  const onFinish = () => {
    activeRequests.delete(id);
    entry.status = res.statusCode || 0;
    entry.durationMs = Math.max(0, now() - started);
    entry.ok = entry.status >= 200 && entry.status < 400;
    if (isAiPath && entry.method !== "GET") {
      // Marca a última chamada HTTP em running com mesmo path
      for (const call of aiCallRing) {
        if (
          call.httpRequestId === id ||
          (call.status === "running" &&
            call.path === pathOnly &&
            call.source === "http")
        ) {
          call.status = entry.ok ? "ok" : "error";
          call.durationMs = entry.durationMs;
          call.updatedAt = now();
          if (!entry.ok) call.error = `HTTP ${entry.status}`;
          break;
        }
      }
    }
  };
  res.on("finish", onFinish);
  res.on("close", () => {
    if (entry.status == null) onFinish();
  });
  next();
}

export function listRecentRequests({ limit = 80 } = {}) {
  const n = Math.max(1, Math.min(200, Number(limit) || 80));
  return requestRing.slice(0, n).map((r) => ({ ...r }));
}

/**
 * Registra uma chamada LLM (Gemini / OpenRouter / NVIDIA / browser…).
 * Retorna id para updateAiCall.
 */
export function recordAiCall(patch = {}) {
  const id = ++aiCallSeq;
  const entry = {
    id,
    source: String(patch.source || "llm").slice(0, 40),
    label: String(patch.label || "LLM").slice(0, 160),
    path: String(patch.path || "").slice(0, 200),
    project: String(patch.project || "").slice(0, 120),
    provider: patch.provider ? String(patch.provider).slice(0, 40) : null,
    model: patch.model ? String(patch.model).slice(0, 80) : null,
    modelsTried: Array.isArray(patch.modelsTried)
      ? patch.modelsTried.map((m) => String(m).slice(0, 80)).slice(0, 12)
      : [],
    status: patch.status || "running", // running | ok | error | browser
    detail: String(patch.detail || "").slice(0, 400),
    error: patch.error ? String(patch.error).slice(0, 400) : null,
    jobId: patch.jobId ? String(patch.jobId).slice(0, 80) : null,
    httpRequestId: patch.httpRequestId || null,
    startedAt: now(),
    updatedAt: now(),
    durationMs: null,
  };
  aiCallRing.unshift(entry);
  if (aiCallRing.length > MAX_AI_CALLS) aiCallRing.length = MAX_AI_CALLS;
  return id;
}

export function updateAiCall(id, patch = {}) {
  const entry = aiCallRing.find((c) => c.id === id);
  if (!entry) return null;
  if (patch.provider != null)
    entry.provider = String(patch.provider).slice(0, 40);
  if (patch.model != null) entry.model = String(patch.model).slice(0, 80);
  if (Array.isArray(patch.modelsTried)) {
    entry.modelsTried = patch.modelsTried
      .map((m) => String(m).slice(0, 80))
      .slice(0, 12);
  }
  if (patch.status != null) entry.status = String(patch.status);
  if (patch.detail != null) entry.detail = String(patch.detail).slice(0, 400);
  if (patch.error != null) entry.error = String(patch.error).slice(0, 400);
  if (patch.label != null) entry.label = String(patch.label).slice(0, 160);
  if (patch.jobId != null) entry.jobId = String(patch.jobId).slice(0, 80);
  entry.updatedAt = now();
  if (patch.durationMs != null) {
    entry.durationMs = Number(patch.durationMs) || 0;
  } else if (patch.status && patch.status !== "running") {
    entry.durationMs = Math.max(0, now() - entry.startedAt);
  }
  return entry;
}

export function listRecentAiCalls({ limit = 40 } = {}) {
  const n = Math.max(1, Math.min(100, Number(limit) || 40));
  return aiCallRing.slice(0, n).map((c) => ({ ...c }));
}

export function readProjectEventsTail(projectDir, { limit = 40 } = {}) {
  if (!projectDir) return [];
  try {
    const logPath = path.join(projectDir, "logs", "lumiera-events.jsonl");
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const take = Math.max(1, Math.min(100, Number(limit) || 40));
    return lines
      .slice(-take)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line.slice(0, 300), level: "info" };
        }
      });
  } catch {
    return [];
  }
}

export function cancelRequest(id) {
  const numId = Number(id);
  const entry = activeRequests.get(numId);
  if (entry) {
    try {
      entry.res.destroy();
    } catch (e) {
      console.error("[processActivityHub] Failed to destroy response:", e);
    }
    activeRequests.delete(numId);
  }

  const reqEntry = requestRing.find((r) => r.id === numId);
  if (reqEntry) {
    reqEntry.status = 499;
    reqEntry.ok = false;
    reqEntry.durationMs = Date.now() - reqEntry.startedAt;
  }

  const aiCall = aiCallRing.find((c) => c.httpRequestId === numId);
  if (aiCall) {
    aiCall.status = "error";
    aiCall.error = "Cancelado pelo usuário";
    aiCall.durationMs = Date.now() - aiCall.startedAt;
    aiCall.updatedAt = Date.now();
  }
}

export async function cancelRequestOrJob(idOrJobId) {
  if (typeof idOrJobId === "string" && idOrJobId.startsWith("job_")) {
    const jobId = idOrJobId;
    try {
      const { failJobProgress } = await import("./aiJobProgress.js");
      failJobProgress(jobId, "Cancelado pelo usuário");
    } catch (e) {
      // ignore
    }
    for (const [reqId, entry] of activeRequests.entries()) {
      const reqEntry = requestRing.find((r) => r.id === reqId);
      if (reqEntry && reqEntry.progressJobId === jobId) {
        cancelRequest(reqId);
      }
    }
  } else if (typeof idOrJobId === "string" && idOrJobId.startsWith("call-")) {
    const aiCallId = Number(idOrJobId.replace("call-", ""));
    const aiCall = aiCallRing.find((c) => c.id === aiCallId);
    if (aiCall && aiCall.httpRequestId) {
      cancelRequest(aiCall.httpRequestId);
    }
  } else {
    cancelRequest(Number(idOrJobId));
  }
}
