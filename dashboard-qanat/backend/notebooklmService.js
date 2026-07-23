import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  buildNotebooklmSessionFromResearch,
  extractNotebooklmQuestions,
  finalizeNotebooklmSession,
  isNotebooklmAwaitingUser,
  loadNotebooklmSession,
  replyNotebooklmSession,
  saveNotebooklmSession,
  assessNotebooklmReadiness,
  getActiveNotebooklmQuestions,
} from "./notebooklmInteractive.js";
import {
  loadNotebooklmBrief,
  syncNotebooklmBriefFromSession,
  formatNotebooklmBriefPromptBlock,
  shouldSkipWebResearchForBrief,
  mergeBriefIntoStoryboard,
  hasNotebooklmProgress,
  parsePipelineChecklist,
  NOTEBOOKLM_BRIEF_FILENAME,
  NOTEBOOKLM_PIPELINE_STEPS,
} from "./notebooklmResearchBrief.js";

export {
  loadNotebooklmBrief,
  formatNotebooklmBriefPromptBlock,
  shouldSkipWebResearchForBrief,
  mergeBriefIntoStoryboard,
  hasNotebooklmProgress,
  parsePipelineChecklist,
  NOTEBOOKLM_BRIEF_FILENAME,
  NOTEBOOKLM_PIPELINE_STEPS,
};

export {
  extractNotebooklmQuestions,
  isNotebooklmAwaitingUser,
  buildNotebooklmSessionFromResearch,
  finalizeNotebooklmSession,
  loadNotebooklmSession,
  saveNotebooklmSession,
  replyNotebooklmSession,
  assessNotebooklmReadiness,
  getActiveNotebooklmQuestions,
};

const QUERY_TIMEOUT_MS = Number(
  process.env.NOTEBOOKLM_QUERY_TIMEOUT_MS || 120000
);

function resolveNlmBin() {
  const fromEnv = String(process.env.NLM_BIN || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const exeName = process.platform === "win32" ? "nlm.exe" : "nlm";
  const candidates = [];
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const localAppData = process.env.LOCALAPPDATA || "";

  if (userProfile) {
    candidates.push(path.join(userProfile, ".local", "bin", exeName));
  }
  if (localAppData) {
    candidates.push(path.join(localAppData, ".local", "bin", exeName));
  }
  if (process.platform === "win32") {
    candidates.push("C:\\Lumiera\\tools\\nlm\\nlm.exe");
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  return "nlm";
}

const NLM_BIN = resolveNlmBin();
const LOGIN_PENDING_TIMEOUT_MS = Number(
  process.env.NOTEBOOKLM_LOGIN_TIMEOUT_MS || 180000
);

let loginChild = null;
let loginStartedAt = null;
const NOTEBOOKLM_STATUS_CACHE_MS = Number(
  process.env.NOTEBOOKLM_STATUS_CACHE_MS || 5 * 60 * 1000
);
const notebooklmStatusCache = new Map();

function notebooklmStatusCacheKey(backendDir) {
  return resolveNotebooklmDataDir(backendDir);
}

function cacheNotebooklmStatus(backendDir, status) {
  notebooklmStatusCache.set(notebooklmStatusCacheKey(backendDir), {
    checkedAt: Date.now(),
    status,
  });
  return status;
}

function getCachedNotebooklmStatus(backendDir) {
  const cached = notebooklmStatusCache.get(
    notebooklmStatusCacheKey(backendDir)
  );
  if (!cached || Date.now() - cached.checkedAt > NOTEBOOKLM_STATUS_CACHE_MS) {
    return null;
  }
  return { ...cached.status, cached: true, checkedAt: cached.checkedAt };
}

function resolveNotebooklmDataDir(backendDir) {
  if (process.env.NOTEBOOKLM_MCP_CLI_PATH) {
    return process.env.NOTEBOOKLM_MCP_CLI_PATH;
  }
  if (process.platform === "win32") {
    const lumieraData = "C:\\Lumiera\\.notebooklm-data";
    if (fs.existsSync("C:\\Lumiera")) {
      return lumieraData;
    }
  }
  if (backendDir) {
    return path.resolve(backendDir, "..", "..", ".notebooklm-data");
  }
  return path.join(process.cwd(), ".notebooklm-data");
}

function runNlm(args, { timeoutMs = 60000, backendDir } = {}) {
  const dataDir = resolveNotebooklmDataDir(backendDir);
  fs.mkdirSync(dataDir, { recursive: true });

  const result = spawnSync(NLM_BIN, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    env: {
      ...process.env,
      NOTEBOOKLM_MCP_CLI_PATH: dataDir,
    },
  });

  if (result.error) throw result.error;

  const stderr = (result.stderr || "").trim();
  const stdout = (result.stdout || "").trim();

  if (result.status !== 0) {
    const msg = stderr || stdout || `nlm exit ${result.status}`;
    const err = new Error(msg);
    err.code = result.status;
    throw err;
  }

  return stdout;
}

function runNlmAsync(args, { timeoutMs = 60000, backendDir } = {}) {
  const dataDir = resolveNotebooklmDataDir(backendDir);
  fs.mkdirSync(dataDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn(NLM_BIN, args, {
      windowsHide: true,
      env: {
        ...process.env,
        NOTEBOOKLM_MCP_CLI_PATH: dataDir,
      },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`nlm timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = stdout.trim();
      const errOut = stderr.trim();
      if (code !== 0) {
        const err = new Error(errOut || out || `nlm exit ${code}`);
        err.code = code;
        reject(err);
        return;
      }
      resolve(out);
    });
  });
}

function parseJsonOutput(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getCachePath(backendDir) {
  return path.join(backendDir, "notebooklm_cache.json");
}

function loadCache(backendDir) {
  const cachePath = getCachePath(backendDir);
  if (!fs.existsSync(cachePath)) return { notebooks: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    return { notebooks: raw.notebooks || {} };
  } catch {
    return { notebooks: {} };
  }
}

function saveCache(backendDir, cache) {
  fs.writeFileSync(
    getCachePath(backendDir),
    JSON.stringify(cache, null, 2),
    "utf8"
  );
}

// lumiera-perf: research-cache v1
const RESEARCH_CACHE_FILE = "notebooklm_research_cache.json";
const RESEARCH_CACHE_TTL_MS = Number(
  process.env.NOTEBOOKLM_RESEARCH_CACHE_TTL_MS || 12 * 3600 * 1000
);
function researchCacheKey({ niche, format, purpose, topic, contentMode }) {
  return [
    purpose,
    format,
    contentMode || "default",
    nicheKey(niche),
    nicheKey(topic || ""),
  ].join(":");
}
function loadResearchCache(backendDir) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(backendDir, RESEARCH_CACHE_FILE), "utf8")
    );
  } catch {
    return {};
  }
}
function saveResearchCache(backendDir, c) {
  try {
    fs.writeFileSync(
      path.join(backendDir, RESEARCH_CACHE_FILE),
      JSON.stringify(c, null, 2),
      "utf8"
    );
  } catch (e) {
    console.warn("[NotebookLM] falha ao gravar cache de pesquisa:", e.message);
  }
}

function nicheKey(niche) {
  return (
    String(niche || "default")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "default"
  );
}

function isAuthError(message = "") {
  const lower = message.toLowerCase();
  return (
    lower.includes("login") ||
    lower.includes("auth") ||
    lower.includes("profile") ||
    lower.includes("cookie") ||
    lower.includes("credential") ||
    lower.includes("authentication failed") ||
    lower.includes("network_error") ||
    lower.includes("clientauthenticationerror")
  );
}

function isNlmTimeoutError(message = "") {
  const lower = message.toLowerCase();
  return lower.includes("etimedout") || lower.includes("timed out");
}

export function getNotebooklmLoginState() {
  return {
    inProgress: Boolean(loginChild),
    startedAt: loginStartedAt,
  };
}

export function clearNotebooklmLoginState() {
  loginChild = null;
  loginStartedAt = null;
}

function isLumieraWindowsServiceMode(backendDir) {
  if (process.platform !== "win32") return false;
  const user = String(
    process.env.USERNAME || process.env.USER || ""
  ).toUpperCase();
  if (
    user === "SYSTEM" ||
    user === "LOCAL SERVICE" ||
    user === "NETWORK SERVICE"
  ) {
    return true;
  }
  if (backendDir) {
    const marker = path.join(
      path.resolve(backendDir, "..", ".."),
      ".lumiera-logs",
      "windows-service.mode"
    );
    if (fs.existsSync(marker)) return true;
  }
  return false;
}

function getManualLoginMessage() {
  return "Serviço Windows não abre o navegador. No PowerShell: cd para a pasta Lumiera e rode .\\nlm-login.ps1 — depois clique em Atualizar.";
}

function buildLoginPendingStatus(backendDir, message) {
  const serviceMode = isLumieraWindowsServiceMode(backendDir);
  return {
    available: false,
    authenticated: false,
    notebookCount: 0,
    loginInProgress: !serviceMode,
    needsLogin: true,
    manualLoginRequired: serviceMode,
    serviceMode,
    message: serviceMode
      ? getManualLoginMessage()
      : message || "Aguardando login no navegador…",
    dataDir: resolveNotebooklmDataDir(backendDir),
  };
}

function loginPendingTimedOut() {
  return (
    loginStartedAt != null &&
    Date.now() - loginStartedAt > LOGIN_PENDING_TIMEOUT_MS
  );
}

/** Abre o navegador para login OAuth do NotebookLM (processo em background). */
export function startNotebooklmLogin(backendDir) {
  if (isLumieraWindowsServiceMode(backendDir)) {
    clearNotebooklmLoginState();
    return {
      started: false,
      manualLoginRequired: true,
      serviceMode: true,
      message: getManualLoginMessage(),
      dataDir: resolveNotebooklmDataDir(backendDir),
    };
  }

  if (loginChild) {
    if (loginPendingTimedOut()) {
      clearNotebooklmLoginState();
    } else {
      return {
        started: true,
        alreadyRunning: true,
        message: "Login já em andamento — conclua no navegador que abriu.",
      };
    }
  }

  const current = getNotebooklmStatus(backendDir, { refresh: true });
  if (current.authenticated) {
    return {
      started: false,
      alreadyAuthenticated: true,
      message: current.message,
      status: current,
    };
  }

  const dataDir = resolveNotebooklmDataDir(backendDir);
  fs.mkdirSync(dataDir, { recursive: true });

  try {
    loginChild = spawn(NLM_BIN, ["login"], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: {
        ...process.env,
        NOTEBOOKLM_MCP_CLI_PATH: dataDir,
      },
    });
    loginChild.unref();
    loginStartedAt = Date.now();
    loginChild.on("exit", () => {
      loginChild = null;
    });
    loginChild.on("error", (err) => {
      console.warn("[NotebookLM] Login spawn error:", err.message);
      loginChild = null;
    });

    return {
      started: true,
      message: "Navegador aberto — faça login na conta Google do NotebookLM.",
      dataDir,
    };
  } catch (err) {
    loginChild = null;
    loginStartedAt = null;
    const missing = String(err.message || "").includes("ENOENT");
    return {
      started: false,
      error: missing
        ? `CLI nlm não encontrado (${NLM_BIN}). Instale o NotebookLM CLI ou defina NLM_BIN no ambiente do backend.`
        : err.message || "Falha ao iniciar login NotebookLM.",
    };
  }
}

export function getNotebooklmStatus(
  backendDir,
  { quick = false, refresh = false } = {}
) {
  const serviceMode = isLumieraWindowsServiceMode(backendDir);
  const loginState = getNotebooklmLoginState();

  if (!refresh && !loginState.inProgress) {
    const cached = getCachedNotebooklmStatus(backendDir);
    if (cached) return cached;
  }

  if (loginState.inProgress) {
    if (loginPendingTimedOut()) {
      clearNotebooklmLoginState();
    } else {
      try {
        runNlm(["login", "--check"], {
          timeoutMs: quick ? 15000 : 45000,
          backendDir,
        });
        clearNotebooklmLoginState();
      } catch {
        return cacheNotebooklmStatus(
          backendDir,
          buildLoginPendingStatus(backendDir, "Aguardando login no navegador…")
        );
      }
    }
  }

  try {
    runNlm(["login", "--check"], {
      timeoutMs: quick ? 15000 : 45000,
      backendDir,
    });
    if (quick) {
      return cacheNotebooklmStatus(backendDir, {
        available: true,
        authenticated: true,
        notebookCount: null,
        loginInProgress: false,
        serviceMode,
        message: "NotebookLM conectado",
        dataDir: resolveNotebooklmDataDir(backendDir),
      });
    }
    const listRaw = runNlm(["notebook", "list", "--json"], {
      timeoutMs: 25000,
      backendDir,
    });
    const notebooks = parseJsonOutput(listRaw);
    const count = Array.isArray(notebooks) ? notebooks.length : 0;
    return cacheNotebooklmStatus(backendDir, {
      available: true,
      authenticated: true,
      notebookCount: count,
      loginInProgress: false,
      serviceMode,
      message:
        count > 0
          ? `NotebookLM conectado (${count} notebook${count === 1 ? "" : "s"})`
          : "NotebookLM conectado — pronto para pesquisa",
      dataDir: resolveNotebooklmDataDir(backendDir),
    });
  } catch (err) {
    const msg = String(err.message || "");
    const auth = isAuthError(msg);
    const timedOut = isNlmTimeoutError(msg);
    const cliMissing = msg.includes("ENOENT");
    const freshLoginState = getNotebooklmLoginState();
    const manualLogin = serviceMode && !cliMissing;
    return cacheNotebooklmStatus(backendDir, {
      available: false,
      authenticated: false,
      notebookCount: 0,
      loginInProgress: freshLoginState.inProgress && !serviceMode,
      serviceMode,
      manualLoginRequired: manualLogin,
      message: cliMissing
        ? `CLI nlm não encontrado (${NLM_BIN}). Reinstale o serviço Windows ou rode .\\nlm-login.ps1 na pasta Lumiera.`
        : manualLogin
          ? getManualLoginMessage()
          : auth
            ? freshLoginState.inProgress
              ? "Aguardando login no navegador…"
              : "Sessão NotebookLM expirada — clique em Conectar NotebookLM ou rode .\\nlm-login.ps1"
            : timedOut
              ? "NotebookLM demorou para responder — rode .\\nlm-login.ps1 e clique em Atualizar."
              : `NotebookLM indisponível: ${msg}`,
      dataDir: resolveNotebooklmDataDir(backendDir),
      needsLogin: auth || cliMissing || manualLogin || timedOut,
      cliMissing,
    });
  }
}

function findOrCreateNotebook(niche, backendDir, projDir = null) {
  const cache = loadCache(backendDir);

  if (projDir && fs.existsSync(projDir)) {
    const sessionPath = path.join(projDir, "notebooklm_session.json");
    if (fs.existsSync(sessionPath)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
        if (session?.notebookId) {
          return session.notebookId;
        }
      } catch (err) {
        console.warn(
          "[NotebookLM] Error loading notebookId from project session:",
          err.message
        );
      }
    }
  }

  const repoRoot = path.resolve(backendDir, "..", "..");
  const isActualProject =
    projDir && fs.existsSync(projDir) && path.resolve(projDir) !== repoRoot;

  let key;
  let title;
  if (isActualProject) {
    const projName = path.basename(projDir);
    key = `project-${nicheKey(projName)}`;
    title = `Lumiera: ${projName.trim().slice(0, 50)} (${String(niche).trim().slice(0, 20)})`;
  } else {
    key = nicheKey(niche);
    title = `Lumiera: ${String(niche).trim().slice(0, 72) || "Geral"}`;
  }

  if (cache.notebooks[key]?.id) return cache.notebooks[key].id;

  try {
    const listRaw = runNlm(["notebook", "list", "--json"], {
      timeoutMs: 25000,
      backendDir,
    });
    const notebooks = parseJsonOutput(listRaw) || [];
    if (Array.isArray(notebooks)) {
      const existing = notebooks.find((n) => {
        const t = String(n.title || "").toLowerCase();
        if (isActualProject) {
          const projName = path.basename(projDir).toLowerCase();
          return t.includes("lumiera") && t.includes(projName.slice(0, 24));
        } else {
          return (
            t.includes("lumiera") &&
            t.includes(String(niche).trim().toLowerCase().slice(0, 24))
          );
        }
      });
      if (existing?.id) {
        cache.notebooks[key] = {
          id: existing.id,
          title: existing.title,
          reused: true,
        };
        saveCache(backendDir, cache);
        return existing.id;
      }
    }
  } catch {
    /* continue to create */
  }

  const createRaw = runNlm(["notebook", "create", title, "--json"], {
    timeoutMs: 30000,
    backendDir,
  });
  const created = parseJsonOutput(createRaw);
  const id = created?.id || created?.notebook_id || createRaw.trim();
  if (!id) throw new Error("Falha ao criar notebook no NotebookLM.");

  cache.notebooks[key] = { id, title, createdAt: new Date().toISOString() };
  saveCache(backendDir, cache);
  return id;
}

function addTextSource(notebookId, title, text, backendDir) {
  const tmpDir = path.join(backendDir, ".notebooklm_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const safeName = `brief_${Date.now()}.txt`;
  const tmpFile = path.join(tmpDir, safeName);
  fs.writeFileSync(tmpFile, text, "utf8");

  try {
    runNlm(
      [
        "source",
        "add",
        notebookId,
        "--file",
        tmpFile,
        "--title",
        title.slice(0, 80),
        "--wait",
      ],
      { timeoutMs: 120000, backendDir }
    );
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

async function addTextSourceAsync(notebookId, title, text, backendDir) {
  const tmpDir = path.join(backendDir, ".notebooklm_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `brief_${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, text, "utf8");
  try {
    await runNlmAsync(
      [
        "source",
        "add",
        notebookId,
        "--file",
        tmpFile,
        "--title",
        title.slice(0, 80),
        "--wait",
      ],
      { timeoutMs: 120000, backendDir }
    );
    const ready = await waitForNotebookSourcesToLoadAsync(
      notebookId,
      backendDir
    );
    if (!ready) {
      throw new Error(
        "Fontes NotebookLM não ficaram prontas antes da consulta."
      );
    }
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function runOptionalFastResearch(notebookId, query, backendDir, mode = "fast") {
  const researchMode = mode === "deep" ? "deep" : "fast";
  const maxWait = researchMode === "deep" ? "120" : "40";
  const startTimeout = researchMode === "deep" ? 60000 : 40000;
  const statusTimeout = researchMode === "deep" ? 140000 : 50000;
  try {
    const startRaw = runNlm(
      [
        "research",
        "start",
        query,
        "--notebook-id",
        notebookId,
        "--mode",
        researchMode,
      ],
      { timeoutMs: startTimeout, backendDir }
    );
    const started = parseJsonOutput(startRaw);
    const taskId = started?.task_id || started?.id;
    if (!taskId) return false;

    const statusRaw = runNlm(
      [
        "research",
        "status",
        notebookId,
        "--task-id",
        taskId,
        "--max-wait",
        maxWait,
      ],
      { timeoutMs: statusTimeout, backendDir }
    );
    const status = parseJsonOutput(statusRaw);
    if (status?.status === "completed" || status?.state === "completed") {
      runNlm(["research", "import", notebookId, taskId], {
        timeoutMs: 120000,
        backendDir,
      });
      return true;
    }
  } catch {
    /* research is optional */
  }
  return false;
}

async function runOptionalFastResearchAsync(
  notebookId,
  query,
  backendDir,
  mode = "fast"
) {
  const researchMode = mode === "deep" ? "deep" : "fast";
  const maxWait = researchMode === "deep" ? "120" : "40";
  const startTimeout = researchMode === "deep" ? 60000 : 40000;
  const statusTimeout = researchMode === "deep" ? 140000 : 50000;
  try {
    const startRaw = await runNlmAsync(
      [
        "research",
        "start",
        query,
        "--notebook-id",
        notebookId,
        "--mode",
        researchMode,
      ],
      { timeoutMs: startTimeout, backendDir }
    );
    const started = parseJsonOutput(startRaw);
    const taskId = started?.task_id || started?.id;
    if (!taskId) return false;

    const statusRaw = await runNlmAsync(
      [
        "research",
        "status",
        notebookId,
        "--task-id",
        taskId,
        "--max-wait",
        maxWait,
      ],
      { timeoutMs: statusTimeout, backendDir }
    );
    const status = parseJsonOutput(statusRaw);
    if (status?.status === "completed" || status?.state === "completed") {
      await runNlmAsync(["research", "import", notebookId, taskId], {
        timeoutMs: 120000,
        backendDir,
      });
      await waitForNotebookSourcesToLoadAsync(notebookId, backendDir);
      return true;
    }
  } catch {
    /* research is optional */
  }
  return false;
}

export function assessNotebooklmSourcesReadiness(sources = [], minSources = 1) {
  const normalized = Array.isArray(sources) ? sources : [];
  const pending = normalized.filter((source) => {
    const chars = Number(source?.char_count ?? source?.charCount ?? 0);
    const state = String(source?.status || source?.state || "").toLowerCase();
    return chars <= 0 || ["processing", "pending", "queued"].includes(state);
  });
  const failed = normalized.filter((source) =>
    ["failed", "error"].includes(
      String(source?.status || source?.state || "").toLowerCase()
    )
  );
  return {
    ready:
      normalized.length >= minSources &&
      pending.length === 0 &&
      failed.length === 0,
    total: normalized.length,
    pending: pending.length,
    failed: failed.length,
  };
}

async function waitForNotebookSourcesToLoadAsync(
  notebookId,
  backendDir,
  maxWaitSeconds = 30
) {
  console.log(
    `[NotebookLM] Aguardando fontes carregarem para o notebook ${notebookId}...`
  );
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    try {
      const listRaw = await runNlmAsync(
        ["source", "list", notebookId, "--json"],
        {
          timeoutMs: 15000,
          backendDir,
        }
      );
      const sources = parseJsonOutput(listRaw) || [];
      if (sources.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      const hasInlineStatus = sources.some(
        (s) =>
          s?.status || s?.state || s?.char_count != null || s?.charCount != null
      );
      let details;
      if (hasInlineStatus) {
        details = sources;
      } else {
        details = await Promise.all(
          sources.map((src) =>
            runNlmAsync(["source", "get", src.id, "--json"], {
              timeoutMs: 8000,
              backendDir,
            })
              .then((getRaw) => parseJsonOutput(getRaw) || src)
              .catch(() => src)
          )
        );
      }

      const readiness = assessNotebooklmSourcesReadiness(details);
      if (readiness.ready) {
        console.log(
          `[NotebookLM] ${readiness.total} fonte(s) carregada(s) em ${((Date.now() - startTime) / 1000).toFixed(1)}s`
        );
        return true;
      }
    } catch (err) {
      console.warn(
        "[NotebookLM] Erro ao verificar status das fontes:",
        err.message
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.warn(
    `[NotebookLM] Timeout aguardando fontes após ${maxWaitSeconds}s. Continuando assim mesmo.`
  );
  return false;
}

function queryNotebook(notebookId, question, backendDir) {
  const raw = runNlm(["notebook", "query", notebookId, question, "--json"], {
    timeoutMs: QUERY_TIMEOUT_MS,
    backendDir,
  });
  return parseNotebookQueryAnswer(raw);
}

async function queryNotebookAsync(notebookId, question, backendDir) {
  const raw = await runNlmAsync(
    ["notebook", "query", notebookId, question, "--json"],
    {
      timeoutMs: QUERY_TIMEOUT_MS,
      backendDir,
    }
  );
  return parseNotebookQueryAnswer(raw);
}

function parseNotebookQueryAnswer(raw) {
  const parsed = parseJsonOutput(raw);
  if (parsed) {
    return (
      parsed.answer ||
      parsed.response ||
      parsed.text ||
      parsed.message ||
      JSON.stringify(parsed)
    );
  }
  return raw;
}

function buildBriefText({
  niche,
  format,
  idea,
  contentMode,
  rankCount,
  listTopic,
  rankOrder,
}) {
  const lines = [
    `Nicho: ${niche}`,
    `Formato YouTube: ${format}`,
    `Data: ${new Date().toISOString()}`,
  ];

  if (idea) {
    lines.push(`Título: ${idea.title || ""}`);
    lines.push(`Promessa: ${idea.promise || ""}`);
    lines.push(`Emoção: ${idea.emotion || ""}`);
    if (idea.hook || idea.hooks)
      lines.push(`Gancho: ${idea.hook || idea.hooks}`);
    if (idea.listicle_angle)
      lines.push(`Ângulo listicle: ${idea.listicle_angle}`);
    if (Array.isArray(idea.sample_items))
      lines.push(`Itens sugeridos: ${idea.sample_items.join(", ")}`);
  }

  if (contentMode === "LISTICLE") {
    lines.push(`Modo: LISTICLE Top ${rankCount}`);
    lines.push(`Tema da lista: ${listTopic || niche}`);
    lines.push(`Ordem: ${rankOrder === "asc" ? "crescente" : "decrescente"}`);
  }

  return lines.join("\n");
}

function buildIdeasQuery({ niche, format, contentMode, rankCount, listTopic }) {
  if (contentMode === "LISTICLE") {
    return `Com base nas fontes deste notebook, liste em português brasileiro:
1) Os ${rankCount || 10} ângulos de ranking mais virais sobre "${listTopic || niche}" para YouTube ${format}
2) Fatos surpreendentes verificáveis para cada ângulo
3) Perguntas que o público faz e que geram comentários
4) Mitos populares vs realidade histórica/científica
5) Ganchos de retenção para os primeiros 30 segundos
Seja específico, cite detalhes das fontes, evite generalidades.`;
  }

  return `Com base nas fontes deste notebook sobre o nicho "${niche}" (YouTube ${format}), forneça em português brasileiro:
1) Tendências e perguntas que o público busca agora
2) Dores, desejos e medos do público
3) Fatos surpreendentes pouco explorados em vídeos
4) Polêmicas ou curiosidades que geram comentários
5) 5 ângulos de vídeo virais com ganchos específicos
6) Erros comuns de vídeos concorrentes que podemos evitar
Use detalhes concretos das fontes.`;
}

function buildScriptQuery({
  niche,
  format,
  idea,
  contentMode,
  rankCount,
  listTopic,
  rankOrder,
}) {
  const title = idea?.title || niche;
  const promise = idea?.promise || "";

  if (contentMode === "LISTICLE") {
    return `Você é consultor de roteiros virais para YouTube. Com base nas fontes deste notebook, ajude a escrever um LISTICLE Top ${rankCount} sobre "${listTopic || title}" (${format}).

Forneça em português brasileiro:
1) ${rankCount} ITENS DO RANKING com fatos específicos, datas, nomes e números das fontes
2) Gancho de abertura (3 segundos) que prende sem clickbait genérico
3) Para cada item: 1 curiosidade surpresa + 1 ligação com o mundo moderno
4) Open loops entre itens para retenção
5) Payoff final memorável
6) 5 frases de impacto para overlays (curtas, maiúsculas)
7) Mitos a desmentir e ângulos que concorrentes ignoram

Título: ${title}
Promessa: ${promise}
Ordem do ranking: ${rankOrder === "asc" ? "1 → N" : "N → 1"}

O roteirista usará isso para escrever narração humana em PT-BR. Seja denso em fatos verificáveis.`;
  }

  return `Você é consultor de roteiros documentais virais para YouTube. Com base nas fontes deste notebook, enriqueça o roteiro sobre:

Título: ${title}
Promessa: ${promise}
Nicho: ${niche}
Formato: ${format}

Forneça em português brasileiro:
1) 8-12 FATOS SURPREENDENTES verificáveis nas fontes (com números, datas, nomes)
2) 5 MITOS vs REALIDADE que geram comentários
3) 3 GANCHOS alternativos para os primeiros 30 segundos
4) 5 PERGUNTAS do público que o vídeo deve responder
5) 3 OPEN LOOPS narrativos para manter retenção até o final
6) Histórias humanas ou episódios específicos para dramatizar
7) Dados/números citáveis para narração
8) O que vídeos concorrentes erram ou superficializam

O roteirista transformará isso em narração fluida PT-BR. Priorize especificidade e fontes.`;
}

function buildInteractiveDiscoveryQuery({
  niche,
  format,
  idea,
  contentMode,
  listTopic,
  rankCount,
}) {
  const title = idea?.title || niche;
  const promise = idea?.promise || "";
  const listicleNote =
    contentMode === "LISTICLE"
      ? `Modo LISTICLE Top ${rankCount} sobre "${listTopic || title}".`
      : "";

  return `Você é o assistente de pesquisa do roteirista Lumiera (YouTube ${format}).
Antes de entregar fatos para o roteiro, faça ALINHAMENTO com o editor humano.

Título: ${title}
Promessa: ${promise}
Nicho: ${niche}
${listicleNote}

REGRAS OBRIGATÓRIAS NESTA RESPOSTA:
1) Faça de 1 a 3 perguntas diretas ao editor em português brasileiro — ângulo, época, local, público, tom, ou pesquisa web.
2) Se as fontes do notebook forem insuficientes, pergunte explicitamente: "Você gostaria que eu fizesse essa pesquisa na web agora?"
3) NÃO entregue ainda a lista completa de fatos — no máximo 2 linhas do que já sabe das fontes + as perguntas.
4) Termine com pergunta clara que exija resposta do editor (sim/não ou texto curto).`;
}

export function resolveNeedsNlmDiscovery({
  scriptPhase,
  skipNotebooklmPending,
  briefFinalized,
}) {
  return (
    scriptPhase === "narration" && !skipNotebooklmPending && !briefFinalized
  );
}

/** Fase 1 do wizard: só NotebookLM interativo — sem Gemini, web ou humanização. */
export function wantsNotebooklmInteractiveNarration({
  scriptPhase,
  useNotebooklm,
  skipNotebooklmPending,
  interactiveNotebooklm = false,
}) {
  return (
    scriptPhase === "narration" &&
    useNotebooklm === true &&
    !skipNotebooklmPending &&
    interactiveNotebooklm
  );
}

export function shouldPauseNotebooklmNarration(
  research,
  {
    scriptPhase,
    skipNotebooklmPending,
    needsDiscovery,
    userTurns = 0,
    briefFinalized = false,
  } = {}
) {
  if (scriptPhase !== "narration") return false;
  if (skipNotebooklmPending || briefFinalized) return false;
  if (!needsDiscovery) return false;
  if (!research || !research.available) return false;
  if (research.interactiveDiscovery && userTurns === 0) return true;
  const questions = research.questions || [];
  if (questions.length > 0 && userTurns === 0) return true;
  return false;
}

export function shouldClearNotebooklmArtifacts(
  projDir,
  backendDir,
  niche,
  { force = false } = {}
) {
  if (force) return true;
  const session = loadNotebooklmSession({ projDir, backendDir, niche });
  const brief = projDir ? loadNotebooklmBrief(projDir) : null;
  return !hasNotebooklmProgress(session, brief);
}

export function clearNotebooklmProjectArtifacts(projDir, backendDir, niche) {
  if (projDir) {
    const sessionPath = path.join(projDir, "notebooklm_session.json");
    const briefPath = path.join(projDir, NOTEBOOKLM_BRIEF_FILENAME);
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    if (fs.existsSync(briefPath)) fs.unlinkSync(briefPath);
  }
  if (backendDir && niche) {
    const key = String(niche || "default")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 48);
    const fallbackSession = path.join(
      backendDir,
      ".notebooklm_sessions",
      `${key}.json`
    );
    if (fs.existsSync(fallbackSession)) fs.unlinkSync(fallbackSession);
  }
}

function buildImproveQuery({ niche, format, narrativeScript }) {
  const excerpt = String(narrativeScript || "").slice(0, 12000);
  return `Analise o rascunho de roteiro abaixo e, com base nas fontes deste notebook sobre "${niche}", sugira melhorias ACIONÁVEIS em português brasileiro:

1) Fatos surpreendentes para INSERIR (com localização no roteiro: início/meio/fim)
2) Correções de imprecisões ou generalizações
3) Ganchos mais fortes (substitua frases fracas por versões melhores)
4) Open loops faltando
5) Trechos que soam artificiais/robóticos e como humanizar
6) Dados/números específicos das fontes para enriquecer

Não reescreva o roteiro inteiro — dê direcionamento claro para o editor.

ROTEIRO ATUAL:
${excerpt}`;
}

function buildFallbackSummary({
  niche,
  format,
  topic,
  purpose,
  needsLogin = false,
}) {
  return {
    available: false,
    topic: topic || niche,
    summary:
      purpose === "script"
        ? `Pesquisa sugerida para roteiro "${niche}" (${format}): explore fatos pouco conhecidos, perguntas frequentes do público, mitos vs realidade e dados numéricos específicos. Conecte cada bloco a uma curiosidade concreta e evite generalidades.`
        : `Pesquisa sugerida para "${niche}" (${format}): tendências recentes, dores do público, curiosidades virais e ângulos pouco explorados por concorrentes.`,
    sources: [],
    fallback: true,
    needsLogin,
  };
}

async function runNotebooklmPipeline({
  niche,
  format,
  idea,
  contentMode,
  rankCount,
  listTopic,
  rankOrder,
  purpose,
  narrativeScript,
  backendDir,
  runResearch = false,
  researchMode = "fast",
  interactiveDiscovery = false,
  projDir = null,
}) {
  const status = getNotebooklmStatus(backendDir, { quick: true });
  if (!status.authenticated) {
    return buildFallbackSummary({ niche, format, purpose, needsLogin: true });
  }

  const notebookId = findOrCreateNotebook(niche, backendDir, projDir);

  const cache = loadCache(backendDir);
  const key = nicheKey(niche);
  const notebookExistsInCache = Boolean(cache.notebooks[key]);

  const skipBriefUpload =
    purpose === "script" && interactiveDiscovery && notebookExistsInCache;
  if ((purpose !== "improve" || !notebookExistsInCache) && !skipBriefUpload) {
    const brief = buildBriefText({
      niche,
      format,
      idea,
      contentMode,
      rankCount,
      listTopic,
      rankOrder,
    });
    try {
      await addTextSourceAsync(
        notebookId,
        `Brief Lumiera ${new Date().toISOString().slice(0, 16)}`,
        brief,
        backendDir
      );
    } catch (err) {
      console.warn("[NotebookLM] Upload de brief bloqueado:", err.message);
      throw new Error(`Pesquisa degradada: ${err.message}`);
    }
  }

  if (runResearch) {
    const researchQuery =
      contentMode === "LISTICLE"
        ? `melhores fatos e curiosidades sobre ${listTopic || niche} para vídeo top ${rankCount}`
        : `fatos surpreendentes tendências e perguntas do público sobre ${niche}`;
    await runOptionalFastResearchAsync(
      notebookId,
      researchQuery,
      backendDir,
      researchMode
    );
  }

  let question;
  if (purpose === "improve") {
    question = buildImproveQuery({ niche, format, narrativeScript });
  } else if (purpose === "script" && interactiveDiscovery) {
    question = buildInteractiveDiscoveryQuery({
      niche,
      format,
      idea,
      contentMode,
      listTopic,
      rankCount,
    });
  } else if (purpose === "script") {
    question = buildScriptQuery({
      niche,
      format,
      idea,
      contentMode,
      rankCount,
      listTopic,
      rankOrder,
    });
  } else {
    question = buildIdeasQuery({
      niche,
      format,
      contentMode,
      rankCount,
      listTopic,
    });
  }

  let answer;
  try {
    answer = await queryNotebookAsync(notebookId, question, backendDir);
  } catch (err) {
    const errorMsg = String(err.message || "");
    if (
      errorMsg.includes("no sources to query") ||
      errorMsg.includes("no sources") ||
      errorMsg.includes("Add a source first")
    ) {
      console.log(
        `[NotebookLM] Notebook ${notebookId} está sem fontes. Subindo brief emergencial...`
      );
      const emergencyBrief = buildBriefText({
        niche,
        format,
        idea,
        contentMode,
        rankCount,
        listTopic,
        rankOrder,
      });
      await addTextSourceAsync(
        notebookId,
        `Brief Emergencial ${new Date().toISOString().slice(0, 16)}`,
        emergencyBrief,
        backendDir
      );
      console.log(
        "[NotebookLM] Brief emergencial enviado com sucesso. Re-executando query..."
      );
      answer = await queryNotebookAsync(notebookId, question, backendDir);
    } else {
      throw err;
    }
  }
  const summary = String(answer || "")
    .trim()
    .slice(0, 12000);
  const awaitingUser = isNotebooklmAwaitingUser(summary);
  const questions = extractNotebooklmQuestions(summary);

  return {
    available: true,
    topic: listTopic || idea?.title || niche,
    summary,
    notebookId,
    sources: ["NotebookLM query"],
    fallback: false,
    awaitingUser:
      awaitingUser || (interactiveDiscovery && questions.length > 0),
    questions,
    researchDone: Boolean(runResearch),
    initialQuestion: question,
    interactiveDiscovery,
  };
}

export async function handleNotebooklmSessionReply({
  projDir,
  backendDir,
  niche,
  userReply,
  onProgress,
}) {
  const session = loadNotebooklmSession({ projDir, backendDir, niche }) || null;
  if (!session?.notebookId) {
    throw new Error(
      "Sessão NotebookLM não encontrada para este projeto/nicho."
    );
  }

  const { session: next, suggestProceed } = await replyNotebooklmSession({
    session,
    userReply,
    backendDir,
    queryNotebook: queryNotebookAsync,
    runResearch: runOptionalFastResearchAsync,
    onProgress,
  });

  saveNotebooklmSession(next, { projDir, backendDir, niche });
  if (projDir) {
    syncNotebooklmBriefFromSession(next, {
      projDir,
      project: path.basename(projDir),
      niche,
      format: next.format,
    });
  }
  return { session: next, suggestProceed: Boolean(suggestProceed) };
}

function persistNotebooklmSessionBundle(
  session,
  { projDir, backendDir, niche, format, project }
) {
  saveNotebooklmSession(session, { projDir, backendDir, niche });
  let brief = null;
  if (projDir) {
    brief = syncNotebooklmBriefFromSession(session, {
      projDir,
      project: project || path.basename(projDir),
      niche: niche || session.niche,
      format: format || session.format,
    });
  }
  return { session, brief };
}

export function persistNotebooklmResearchSession({
  research,
  niche,
  format,
  purpose,
  projDir,
  backendDir,
}) {
  const session = buildNotebooklmSessionFromResearch({
    research,
    niche,
    format,
    purpose,
    notebookId: research?.notebookId,
    initialQuestion: research?.initialQuestion,
  });
  const { session: saved, brief } = persistNotebooklmSessionBundle(session, {
    projDir,
    backendDir,
    niche,
    format,
  });
  if (brief) saved.notebooklm_brief_path = brief.relativePath;
  return saved;
}

export function closeNotebooklmSession({
  projDir,
  backendDir,
  niche,
  format,
  project,
}) {
  const session = loadNotebooklmSession({ projDir, backendDir, niche });
  if (!session) return null;
  const finalized = finalizeNotebooklmSession(session);
  const { session: saved, brief } = persistNotebooklmSessionBundle(finalized, {
    projDir,
    backendDir,
    niche,
    format: format || finalized.format,
    project,
  });
  if (brief) saved.notebooklm_brief_path = brief.relativePath;
  return saved;
}

export async function fetchNotebooklmResearch(niche, format, options = {}) {
  const backendDir = options.backendDir;
  if (!backendDir)
    return buildFallbackSummary({ niche, format, purpose: "ideas" });

  try {
    const _ck = researchCacheKey({
      niche,
      format,
      purpose: "ideas",
      topic: options.idea?.title || options.listTopic,
      contentMode: options.contentMode,
    });
    const _cc = loadResearchCache(backendDir);
    if (_cc[_ck] && Date.now() - _cc[_ck].at < RESEARCH_CACHE_TTL_MS) {
      return { ..._cc[_ck].result, cached: true };
    }
    const _fresh = await runNotebooklmPipeline({
      niche,
      format,
      contentMode: options.contentMode,
      rankCount: options.rankCount,
      listTopic: options.listTopic,
      rankOrder: options.rankOrder,
      purpose: "ideas",
      idea: options.idea,
      backendDir,
      runResearch: options.runResearch === true,
      researchMode: options.researchMode === "deep" ? "deep" : "fast",
      projDir: options.projDir,
    });
    if (typeof _ck !== "undefined" && _ck && _cc) {
      _cc[_ck] = { at: Date.now(), result: _fresh };
      saveResearchCache(backendDir, _cc);
    }
    return _fresh;
  } catch (err) {
    console.warn("[NotebookLM] Ideas research failed:", err.message);
    return {
      ...buildFallbackSummary({ niche, format, purpose: "ideas" }),
      error: err.message,
    };
  }
}

export async function fetchNotebooklmScriptContext(params) {
  const { backendDir } = params;
  if (!backendDir)
    return buildFallbackSummary({
      niche: params.niche,
      format: params.format,
      purpose: "script",
    });

  try {
    return await runNotebooklmPipeline({
      ...params,
      purpose: "script",
      runResearch: params.runResearch !== false,
    });
  } catch (err) {
    console.warn("[NotebookLM] Script context failed:", err.message);
    return {
      ...buildFallbackSummary({
        niche: params.niche,
        format: params.format,
        purpose: "script",
      }),
      error: err.message,
    };
  }
}

export async function fetchNotebooklmScriptImprovements(params) {
  const { backendDir, niche, format, narrativeScript } = params;
  if (!backendDir)
    return buildFallbackSummary({ niche, format, purpose: "improve" });

  try {
    return await runNotebooklmPipeline({
      niche,
      format,
      narrativeScript,
      purpose: "improve",
      backendDir,
      runResearch: false,
      projDir: params.projDir,
    });
  } catch (err) {
    console.warn("[NotebookLM] Script improve failed:", err.message);
    return {
      ...buildFallbackSummary({ niche, format, purpose: "improve" }),
      error: err.message,
    };
  }
}

export function formatNotebooklmPromptBlock(
  research,
  label = "PESQUISA NOTEBOOKLM"
) {
  if (!research?.summary) return "";
  const source =
    research.available && !research.fallback ? "NotebookLM" : "fallback";
  return `\n${label} (${source}):\n${research.summary}\n\nINSTRUÇÃO: Use os fatos acima para enriquecer o roteiro com detalhes verificáveis, ganchos fortes e open loops. Não invente dados que contradigam a pesquisa.\n`;
}

export function buildNotebooklmNarrationEnrichPrompt({
  niche,
  format,
  ideaTitle = "",
  rawScript,
  notebooklmBlock,
  blockCount,
  isListicle = false,
  listicleRank = 20,
}) {
  const listicleNote = isListicle
    ? `\nMODO LISTICLE TOP ${listicleRank}: mantenha intro + ${listicleRank} itens + outro = ${blockCount} blocos. Um item por bloco.`
    : "";

  return `Você é roteirista brasileiro especialista em narração documental viral para YouTube.

Com base na pesquisa NotebookLM abaixo, REESCREVA a narração no estilo que o NotebookLM produz: frases curtas por bloco, fatos verificáveis, gancho forte e payoff declarativo — voz falada PT-BR, sem tom de IA.

FORMATO: ${format}
NICHO: ${niche}
TÍTULO: ${ideaTitle || niche}
BLOCOS OBRIGATÓRIOS: ${blockCount}
${listicleNote}

${notebooklmBlock}

RASCUNHO ATUAL (melhore com fatos da pesquisa — pode reescrever trechos fracos):
${JSON.stringify(rawScript, null, 2).slice(0, 10000)}

TAREFAS OBRIGATÓRIAS:
1. Escreva a narração BLOCO A BLOCO — cada bloco = 1-4 frases curtas que soam bem em voz alta.
2. "technical_config.script" = narração em ${blockCount} parágrafos separados por quebra dupla de linha.
3. "technical_config.block_phrases" = início EXATO de cada bloco (4-8 palavras, todos diferentes).
4. "narrative_script" = junção dos blocos em texto corrido contínuo (espaço entre frases, sem quebras).
5. Incorpore fatos surpreendentes da pesquisa com números, datas e nomes das fontes.
6. Gancho forte no bloco 1; fechamento DECLARATIVO no último — sem "comenta aí" nem perguntas vazias.
7. Elimine clichês robóticos ("neste vídeo", "prepare-se", "incrível" sem prova).

Responda APENAS JSON válido:
{
  "strategy": {
    "title_main": "...",
    "hook": "Gancho de 3 segundos",
    "target_audience": "...",
    "tone": "..."
  },
  "narrative_script": "...",
  "narrative_script_tagged": "...",
  "technical_config": {
    "script": "bloco 1\\n\\nbloco 2...",
    "block_phrases": [{"block": 1, "phrase": "início exato do bloco"}]
  }
}`;
}

export function buildNotebooklmImproveApplyPrompt({
  niche,
  format,
  rawScript,
  notebooklmBlock,
  blockCount,
}) {
  return `Você é roteirista brasileiro especialista em clareza e retenção para YouTube documental.

Com base na pesquisa NotebookLM abaixo, MELHORE o roteiro existente incorporando fatos verificáveis — sem reescrever do zero nem mudar a estrutura visual.

FORMATO: ${format}
NICHO: ${niche}
BLOCOS ESPERADOS: ${blockCount}

${notebooklmBlock}

ROTEIRO ATUAL (JSON parcial):
${JSON.stringify(rawScript, null, 2).slice(0, 12000)}

TAREFAS OBRIGATÓRIAS:
1. Insira fatos surpreendentes da pesquisa nos trechos indicados (início/meio/fim).
2. Corrija imprecisões, generalizações e clichês de IA.
3. Substitua ganchos fracos por versões mais fortes.
4. Adicione open loops faltantes para retenção.
5. Humanize trechos que soam robóticos — narração falada em PT-BR.
6. Mantenha a TESE do vídeo; não altere visual_prompts, bgm_mappings nem impact_texts.
7. Atualize "technical_config.block_phrases" se o início dos blocos mudar (4-8 palavras, início exato).

Responda APENAS JSON válido:
{
  "narrative_script": "...",
  "narrative_script_tagged": "...",
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}]
  },
  "strategy": { "hook": "..." }
}`;
}
