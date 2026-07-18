/**
 * Pool de chaves Gemini — fonte única para rotação editor + render.
 */

export function normalizeApiKeys(...values) {
  const keys = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      keys.push(...value);
    } else if (typeof value === "string" && value.includes(",")) {
      keys.push(...value.split(","));
    } else if (value) {
      keys.push(value);
    }
  }
  return [...new Set(keys.map((key) => String(key).trim()).filter(Boolean))];
}

/**
 * @param {string|null|undefined} preferredKey — chave a tentar primeiro
 * @param {string[]} poolKeys — demais chaves do config/env
 */
export function buildGeminiKeyPool(preferredKey, poolKeys = []) {
  return [...new Set([preferredKey, ...poolKeys].filter(Boolean))];
}

/** Erros de quota/sobrecarga: pular para a próxima chave imediatamente. */
export function shouldRotateGeminiKey(status) {
  return status === 429 || status === 503 || status === 500 || status === 502;
}

/** Sobrecarga do modelo (não da chave): varrer todas as chaves costuma só atrasar. */
export function isGeminiModelOverloadStatus(status) {
  return status === 503 || status === 500 || status === 502;
}

/** Cota / rate limit por chave ou projeto. */
export function isGeminiQuotaStatus(status) {
  return status === 429;
}

/**
 * Quantas chaves tentar no mesmo modelo antes de falhar-rápido.
 * - 503/500/502: default 2 (high demand é do modelo)
 * - 429: default 3 (outra chave/projeto pode ter cota)
 * Override: GEMINI_OVERLOAD_KEY_LIMIT / GEMINI_QUOTA_KEY_LIMIT
 */
export function geminiMaxKeysBeforeModelSwitch(status) {
  if (isGeminiModelOverloadStatus(status)) {
    const n = Number(process.env.GEMINI_OVERLOAD_KEY_LIMIT);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
  }
  if (isGeminiQuotaStatus(status)) {
    const n = Number(process.env.GEMINI_QUOTA_KEY_LIMIT);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 3;
  }
  return Infinity;
}
