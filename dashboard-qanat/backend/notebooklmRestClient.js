/**
 * notebooklmRestClient.js
 * Cliente HTTP para o roomi-fields/notebooklm-mcp REST API.
 * Substitui o nlm CLI (spawnSync) por chamadas HTTP diretas.
 *
 * O servidor roomi-fields roda em localhost:3000 (configurável via
 * NOTEBOOKLM_REST_URL). Auto-reauth é gerenciado pelo próprio servidor.
 */

const REST_BASE_URL = (
  process.env.NOTEBOOKLM_REST_URL || "http://127.0.0.1:3000"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = Number(
  process.env.NOTEBOOKLM_REST_TIMEOUT_MS || 120000
);

class NotebooklmRestError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "NotebooklmRestError";
    this.status = status;
    this.body = body;
  }
}

async function restFetch(path, { method = "GET", body, timeoutMs } = {}) {
  const url = `${REST_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs || REQUEST_TIMEOUT_MS
  );

  try {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();

    if (!res.ok) {
      throw new NotebooklmRestError(
        `NotebookLM REST ${res.status}: ${text.slice(0, 300)}`,
        { status: res.status, body: text }
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (err) {
    if (err.name === "AbortError") {
      throw new NotebooklmRestError(
        `NotebookLM REST timeout after ${timeoutMs || REQUEST_TIMEOUT_MS}ms: ${path}`
      );
    }
    if (err instanceof NotebooklmRestError) throw err;
    throw new NotebooklmRestError(
      `NotebookLM REST unreachable (${REST_BASE_URL}): ${err.message}`
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Health / Auth ─────────────────────────────────────────────

export async function restHealth() {
  return restFetch("/health", { timeoutMs: 10000 });
}

export async function restIsAuthenticated() {
  try {
    const health = await restHealth();
    return Boolean(health?.authenticated || health?.status === "authenticated");
  } catch {
    return false;
  }
}

export async function restSetupAuth({ showBrowser = false } = {}) {
  return restFetch("/setup-auth", {
    method: "POST",
    body: { show_browser: showBrowser },
    timeoutMs: 300000,
  });
}

// ── Notebooks ─────────────────────────────────────────────────

export async function restListNotebooks() {
  return restFetch("/notebooks", { timeoutMs: 30000 });
}

export async function restCreateNotebook(title) {
  return restFetch("/notebooks", {
    method: "POST",
    body: { title },
    timeoutMs: 60000,
  });
}

export async function restScrapeNotebooks() {
  return restFetch("/notebooks/scrape", { timeoutMs: 60000 });
}

// ── Sources ───────────────────────────────────────────────────

export async function restListSources(notebookId) {
  return restFetch(`/notebooks/${notebookId}/sources`, { timeoutMs: 30000 });
}

export async function restAddSourceText(notebookId, text, title) {
  return restFetch(`/notebooks/${notebookId}/sources`, {
    method: "POST",
    body: { type: "text", content: text, title: title || "Lumiera Brief" },
    timeoutMs: 90000,
  });
}

export async function restAddSourceUrl(notebookId, url, title) {
  return restFetch(`/notebooks/${notebookId}/sources`, {
    method: "POST",
    body: { type: "url", content: url, title },
    timeoutMs: 90000,
  });
}

// ── Q&A (core) ────────────────────────────────────────────────

export async function restAsk(notebookId, question, opts = {}) {
  return restFetch("/ask", {
    method: "POST",
    body: {
      notebook_id: notebookId,
      question,
      source_format: opts.sourceFormat || "json",
      session_id: opts.sessionId || undefined,
    },
    timeoutMs: opts.timeoutMs || REQUEST_TIMEOUT_MS,
  });
}

// ── Web Research (simulado via query) ─────────────────────────

export async function restWebResearch(
  notebookId,
  query,
  { deep = false } = {}
) {
  const prompt = deep
    ? `Faça uma pesquisa PROFUNDA na web sobre: "${query}". Traga no mínimo 8 fatos verificados com fontes (URL, instituição, data). Inclua dados numéricos, datas, nomes e mecanismos. Formato: lista numerada com fonte entre parênteses.`
    : `Pesquise na web sobre: "${query}". Traga 5-6 fatos principais com fontes. Formato: lista numerada com fonte entre parênteses.`;

  return restAsk(notebookId, prompt, { timeoutMs: 180000 });
}

// ── Content Generation ────────────────────────────────────────

export async function restGenerateAudio(notebookId, opts = {}) {
  return restFetch(`/notebooks/${notebookId}/generate/audio`, {
    method: "POST",
    body: {
      language: opts.language || "pt-BR",
      custom_instructions: opts.instructions || undefined,
    },
    timeoutMs: 300000,
  });
}

export async function restGenerateReport(notebookId, opts = {}) {
  return restFetch(`/notebooks/${notebookId}/generate/report`, {
    method: "POST",
    body: {
      format: opts.format || "detailed",
      language: opts.language || "pt-BR",
    },
    timeoutMs: 180000,
  });
}

// ── Sessions ──────────────────────────────────────────────────

export async function restListSessions(notebookId) {
  return restFetch(`/notebooks/${notebookId}/sessions`, { timeoutMs: 15000 });
}

// ── Utility ───────────────────────────────────────────────────

export function getRestBaseUrl() {
  return REST_BASE_URL;
}

export { NotebooklmRestError };
