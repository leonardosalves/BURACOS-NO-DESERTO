/**
 * Configurações centralizadas do módulo de pesquisa web.
 * Valores podem ser sobrescritos por variáveis de ambiente.
 */

/** @typedef {object} ResearchConfig
 * @property {string[]} models
 * @property {number}   temperature
 * @property {number}   maxOutputTokens
 * @property {number}   maxSources
 * @property {number}   maxFacts
 * @property {number}   maxAngles
 * @property {number}   timeoutMs
 * @property {number}   retryAttempts
 * @property {number}   minimumQualityScore
 */

function parseEnvModels(envValue) {
  if (!envValue) return null;
  const models = String(envValue)
    .split(",")
    .map((m) => m.trim())
    .filter((m) => /^[a-z0-9][a-z0-9._-]{2,60}$/i.test(m));
  return models.length ? models : null;
}

function envFloat(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** @type {ResearchConfig} */
export const RESEARCH_CONFIG = Object.freeze({
  models: parseEnvModels(process.env.GEMINI_RESEARCH_MODELS) || [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ],
  temperature: envFloat("RESEARCH_TEMPERATURE", 0.2),
  maxOutputTokens: envInt("RESEARCH_MAX_OUTPUT_TOKENS", 6000),
  maxSources: envInt("RESEARCH_MAX_SOURCES", 20),
  maxFacts: envInt("RESEARCH_MAX_FACTS", 12),
  maxAngles: envInt("RESEARCH_MAX_ANGLES", 6),
  timeoutMs: envInt("RESEARCH_TIMEOUT_MS", 45000),
  retryAttempts: envInt("RESEARCH_MAX_RETRIES", 3),
  minimumQualityScore: envFloat("RESEARCH_MIN_QUALITY", 0.5),
});

/** Limites de segurança para sanitização de entrada/saída. */
export const SAFETY_LIMITS = Object.freeze({
  maxTopicLength: 500,
  maxFieldLength: 2000,
  maxClaimLength: 600,
  maxSummaryLength: 8000,
  maxTitleLength: 200,
  maxUrlLength: 2048,
  maxArrayItems: 50,
});

/** Tipos de fonte ordenados por confiabilidade. */
export const SOURCE_TYPE_PRIORITY = Object.freeze([
  "scientific",
  "official",
  "university",
  "museum",
  "journalism",
  "reference",
  "commercial",
  "unknown",
]);

/** Tipos válidos de fato. */
export const FACT_TYPES = new Set([
  "date",
  "number",
  "dimension",
  "location",
  "mechanism",
  "cause",
  "consequence",
  "comparison",
  "context",
  "function",
  "event",
  "quote",
  "other",
]);

/** Status de confirmação válidos. */
export const FACT_STATUS = new Set([
  "confirmed",
  "probable",
  "disputed",
  "unverified",
]);

/** Reason codes para rejeição de fatos. */
export const REJECTION_CODES = Object.freeze({
  NO_SOURCE: "NO_SOURCE",
  NO_GROUNDING_SUPPORT: "NO_GROUNDING_SUPPORT",
  UNKNOWN_SUBJECT: "UNKNOWN_SUBJECT",
  INVALID_NUMBER: "INVALID_NUMBER",
  MISSING_UNIT: "MISSING_UNIT",
  UNSUPPORTED_CAUSALITY: "UNSUPPORTED_CAUSALITY",
  ENTITY_MISMATCH: "ENTITY_MISMATCH",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  DUPLICATE_CLAIM: "DUPLICATE_CLAIM",
  UNSUPPORTED_SUPERLATIVE: "UNSUPPORTED_SUPERLATIVE",
  UNVERIFIED_FACT: "UNVERIFIED_FACT",
  WEAK_SOURCE: "WEAK_SOURCE",
  AMBIGUOUS_PERIOD: "AMBIGUOUS_PERIOD",
  AMBIGUOUS_LOCATION: "AMBIGUOUS_LOCATION",
});
