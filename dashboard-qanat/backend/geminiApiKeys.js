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