/**
 * Fetch robusto com retry, exponential backoff, timeout e controle de rate limit.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const PERMANENT_ERROR_STATUS = new Set([400, 401, 403, 404]);

/**
 * Mascara API key para logs seguros.
 * @param {string} key
 * @returns {string}
 */
export function maskApiKey(key) {
  if (!key || key.length < 8) return "****";
  return `****${key.slice(-4)}`;
}

/**
 * Calcula delay com exponential backoff + jitter.
 * @param {number} attempt - Tentativa atual (0-indexed)
 * @param {number} [retryAfterMs] - Valor do header Retry-After em ms
 * @returns {number}
 */
function backoffDelay(attempt, retryAfterMs) {
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs + Math.random() * 500, 120000);
  }
  const base = Math.min(1000 * Math.pow(2, attempt), 30000);
  const jitter = base * 0.3 * Math.random();
  return base + jitter;
}

/**
 * Extrai Retry-After em ms do header.
 * @param {Response} res
 * @returns {number|null}
 */
function parseRetryAfter(res) {
  const header =
    res.headers?.get?.("retry-after") || res.headers?.get?.("Retry-After");
  if (!header) return null;
  const seconds = parseFloat(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    const ms = date - Date.now();
    return ms > 0 ? ms : null;
  }
  return null;
}

/**
 * @typedef {object} FetchWithRetryOptions
 * @property {number}  [timeoutMs]      - Timeout por requisição
 * @property {number}  [maxRetries]     - Número máximo de tentativas
 * @property {string}  [label]          - Label para logs
 */

/**
 * Executa fetch com retry, timeout e backoff.
 * @param {string} url
 * @param {RequestInit} init
 * @param {FetchWithRetryOptions} [opts]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, init = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs || RESEARCH_CONFIG.timeoutMs;
  const maxRetries = opts.maxRetries ?? RESEARCH_CONFIG.retryAttempts;
  const label = opts.label || "fetch";
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) return res;

      if (PERMANENT_ERROR_STATUS.has(res.status)) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body?.error?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.permanent = true;
        throw err;
      }

      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
        const retryAfterMs = parseRetryAfter(res);
        const delay = backoffDelay(attempt, retryAfterMs);
        console.log(
          `[${label}] HTTP ${res.status} — retry ${attempt + 1}/${maxRetries} em ${Math.round(delay)}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const body = await res.json().catch(() => ({}));
      lastError = new Error(body?.error?.message || `HTTP ${res.status}`);
      lastError.status = res.status;
    } catch (err) {
      clearTimeout(timer);
      if (err.permanent) throw err;
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error(`Timeout após ${timeoutMs}ms`);
        lastError.timeout = true;
      }
      if (attempt < maxRetries) {
        const delay = backoffDelay(attempt);
        console.log(
          `[${label}] Erro "${lastError.message}" — retry ${attempt + 1}/${maxRetries} em ${Math.round(delay)}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`${label}: todas as tentativas falharam`);
}

/**
 * Chama Gemini API com chave no header (não na URL) e retry.
 * @param {object} opts
 * @param {string} opts.model
 * @param {string} opts.apiKey
 * @param {object} opts.body - Request body para Gemini
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.maxRetries]
 * @returns {Promise<object>} - Parsed JSON response
 */
export async function callGeminiApi({
  model,
  apiKey,
  body,
  timeoutMs,
  maxRetries,
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
    {
      timeoutMs,
      maxRetries: maxRetries ?? 1,
      label: `gemini-research/${model}`,
    }
  );

  return res.json();
}
