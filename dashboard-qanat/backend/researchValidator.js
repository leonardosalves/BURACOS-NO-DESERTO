/**
 * Validação de fatos, fontes, entidades, causalidade e números.
 */

import {
  RESEARCH_CONFIG,
  FACT_TYPES,
  FACT_STATUS,
  REJECTION_CODES,
  SOURCE_TYPE_PRIORITY,
  SAFETY_LIMITS,
} from "./researchConfig.js";
import { normalizeUrl, extractDomain } from "./groundingParser.js";

/**
 * @typedef {object} StructuredFact
 * @property {string}   id
 * @property {string}   claim
 * @property {string}   subject
 * @property {string}   subjectId
 * @property {string}   factType
 * @property {string}   location
 * @property {string}   period
 * @property {*}        value
 * @property {string}   unit
 * @property {string}   status
 * @property {number}   confidence
 * @property {string[]} sourceIds
 * @property {number[]} supportIds
 * @property {string}   caveat
 * @property {boolean}  narrationAllowed
 * @property {string[]} [origin]
 * @property {object}   [causal]
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean}    valid
 * @property {object[]}   approvedFacts
 * @property {object[]}   rejectedFacts
 * @property {string[]}   warnings
 * @property {string[]}   errors
 * @property {number}     qualityScore
 */

/**
 * Sanitiza e normaliza um fato bruto da IA para o schema StructuredFact.
 * @param {object} raw
 * @param {number} index
 * @returns {StructuredFact}
 */
export function normalizeFact(raw, index = 0) {
  if (!raw || typeof raw !== "object") {
    return createEmptyFact(
      `F${String(index + 1).padStart(3, "0")}`,
      typeof raw === "string" ? raw : ""
    );
  }

  const id = String(raw.id || `F${String(index + 1).padStart(3, "0")}`).slice(
    0,
    10
  );
  const claim = sanitizeText(
    raw.claim || raw.text || "",
    SAFETY_LIMITS.maxClaimLength
  );
  const subject = sanitizeText(raw.subject || "", 200);
  const subjectId = sanitizeText(
    raw.subjectId ||
      raw.subject_id ||
      subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 60),
    60
  );

  let factType = String(raw.factType || raw.fact_type || "other").toLowerCase();
  if (!FACT_TYPES.has(factType)) factType = "other";

  let status = String(raw.status || "unverified").toLowerCase();
  if (!FACT_STATUS.has(status)) status = "unverified";

  const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));

  return {
    id,
    claim,
    subject,
    subjectId,
    factType,
    location: sanitizeText(raw.location || "", 200),
    period: sanitizeText(raw.period || "", 100),
    value: raw.value ?? null,
    unit: sanitizeText(raw.unit || "", 50),
    status,
    confidence,
    sourceIds: Array.isArray(raw.sourceIds || raw.source_ids)
      ? (raw.sourceIds || raw.source_ids).map(String).filter(Boolean)
      : [],
    supportIds: Array.isArray(raw.supportIds || raw.support_ids)
      ? (raw.supportIds || raw.support_ids).map(Number).filter(Number.isFinite)
      : [],
    caveat: sanitizeText(raw.caveat || "", 300),
    narrationAllowed: false,
    origin: Array.isArray(raw.origin) ? raw.origin.map(String) : [],
    causal:
      raw.causal && typeof raw.causal === "object"
        ? {
            causalStrength: String(
              raw.causal.causalStrength ||
                raw.causal.causal_strength ||
                "speculative"
            ),
            causeFactIds: Array.isArray(
              raw.causal.causeFactIds || raw.causal.cause_fact_ids
            )
              ? (raw.causal.causeFactIds || raw.causal.cause_fact_ids).map(
                  String
                )
              : [],
            effectFactIds: Array.isArray(
              raw.causal.effectFactIds || raw.causal.effect_fact_ids
            )
              ? (raw.causal.effectFactIds || raw.causal.effect_fact_ids).map(
                  String
                )
              : [],
          }
        : undefined,
  };
}

function createEmptyFact(id, claim = "") {
  return {
    id,
    claim,
    subject: "",
    subjectId: "",
    factType: "other",
    location: "",
    period: "",
    value: null,
    unit: "",
    status: "unverified",
    confidence: 0,
    sourceIds: [],
    supportIds: [],
    caveat: "",
    narrationAllowed: false,
    origin: [],
  };
}

/**
 * Valida lista de fatos contra as fontes e supports.
 * @param {StructuredFact[]} facts
 * @param {object[]} sources
 * @param {object[]} supports
 * @returns {ValidationResult}
 */
export function validateResearchFacts(facts, sources = [], supports = []) {
  const approvedFacts = [];
  const rejectedFacts = [];
  const warnings = [];
  const errors = [];
  const seenClaims = new Set();

  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  for (const fact of facts) {
    const reasons = [];

    // 1. Claim duplicada
    const claimKey = fact.claim.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenClaims.has(claimKey)) {
      reasons.push(REJECTION_CODES.DUPLICATE_CLAIM);
    }
    seenClaims.add(claimKey);

    // 2. Sem fonte
    if (!fact.sourceIds.length) {
      reasons.push(REJECTION_CODES.NO_SOURCE);
    }

    // 3. Sem suporte de grounding
    if (!fact.supportIds.length && !fact.sourceIds.length) {
      reasons.push(REJECTION_CODES.NO_GROUNDING_SUPPORT);
    }

    // 4. Sujeito desconhecido
    if (!fact.subject && !fact.subjectId) {
      reasons.push(REJECTION_CODES.UNKNOWN_SUBJECT);
    }

    // 5. Status unverified
    if (fact.status === "unverified") {
      reasons.push(REJECTION_CODES.UNVERIFIED_FACT);
    }

    // 6. Confiança baixa
    if (fact.confidence > 0 && fact.confidence < 0.3) {
      reasons.push(REJECTION_CODES.LOW_CONFIDENCE);
    }

    // 7. Validação numérica
    if (fact.factType === "number" || fact.factType === "dimension") {
      if (fact.value != null && !fact.unit) {
        reasons.push(REJECTION_CODES.MISSING_UNIT);
      }
      if (
        fact.value != null &&
        typeof fact.value === "number" &&
        !Number.isFinite(fact.value)
      ) {
        reasons.push(REJECTION_CODES.INVALID_NUMBER);
      }
    }

    // 8. Validação causal
    if (
      (fact.factType === "cause" || fact.factType === "consequence") &&
      fact.causal
    ) {
      if (fact.causal.causalStrength === "speculative" && !fact.caveat) {
        reasons.push(REJECTION_CODES.UNSUPPORTED_CAUSALITY);
      }
    }

    // 9. Fontes fracas
    if (fact.sourceIds.length === 1) {
      const src = sourceMap.get(fact.sourceIds[0]);
      if (
        src &&
        (src.sourceType === "commercial" || src.sourceType === "unknown")
      ) {
        if (fact.confidence < 0.7) {
          reasons.push(REJECTION_CODES.WEAK_SOURCE);
        }
      }
    }

    if (reasons.length) {
      rejectedFacts.push({
        ...fact,
        reasonCodes: reasons,
        narrationAllowed: false,
      });
      if (reasons.includes(REJECTION_CODES.NO_SOURCE)) {
        warnings.push(
          `Fato "${fact.id}" sem fonte: ${fact.claim.slice(0, 80)}…`
        );
      }
    } else {
      fact.narrationAllowed = true;
      approvedFacts.push(fact);
    }
  }

  const approvedCount = approvedFacts.length;
  const total = facts.length;
  const qualityScore = total > 0 ? approvedCount / total : 0;

  if (approvedCount === 0 && total > 0) {
    errors.push("Nenhum fato aprovado após validação.");
  }

  return {
    valid:
      approvedCount > 0 && qualityScore >= RESEARCH_CONFIG.minimumQualityScore,
    approvedFacts,
    rejectedFacts,
    warnings,
    errors,
    qualityScore: Math.round(qualityScore * 100) / 100,
  };
}

/**
 * Valida consistência de entidades dentro de um ângulo.
 * @param {object} angle
 * @param {StructuredFact[]} facts
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateAngleEntityConsistency(angle, facts) {
  const issues = [];
  if (!angle || !Array.isArray(angle.factIds) || !facts.length) {
    return { valid: true, issues };
  }

  const factMap = new Map(facts.map((f) => [f.id, f]));
  const angleFacts = angle.factIds.map((id) => factMap.get(id)).filter(Boolean);

  if (angleFacts.length < 2) return { valid: true, issues };

  // Se não é comparação explícita, todos os fatos devem ter o mesmo sujeito
  if (angle.mode !== "explicit_comparison") {
    const subjects = new Set(
      angleFacts.map((f) => f.subjectId).filter(Boolean)
    );
    if (subjects.size > 1) {
      issues.push(
        `Ângulo "${angle.id}" mistura entidades (${[...subjects].join(", ")}) sem ser comparação explícita.`
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Classifica qualidade de uma fonte baseado no domínio e tipo.
 * @param {object} source
 * @returns {number} Score de 0 a 1
 */
export function classifySourceQuality(source) {
  if (!source) return 0;
  const typeIndex = SOURCE_TYPE_PRIORITY.indexOf(
    source.sourceType || "unknown"
  );
  const typeScore =
    typeIndex >= 0 ? 1 - typeIndex / SOURCE_TYPE_PRIORITY.length : 0.1;

  let bonus = 0;
  if (source.publishedAt) bonus += 0.05;
  if (source.domain && source.domain.length > 3) bonus += 0.05;

  return Math.min(1, Math.round((typeScore + bonus) * 100) / 100);
}

/**
 * Aplica qualityScore a cada fonte.
 * @param {object[]} sources
 * @returns {object[]}
 */
export function scoreSources(sources) {
  for (const s of sources) {
    s.qualityScore = classifySourceQuality(s);
  }
  return sources;
}

/**
 * Sanitiza texto — remove caracteres de controle, limita tamanho.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function sanitizeText(text, maxLen = SAFETY_LIMITS.maxFieldLength) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Normaliza ângulo bruto para schema padronizado.
 * @param {object} raw
 * @param {number} index
 * @returns {object}
 */
export function normalizeAngle(raw, index = 0) {
  if (!raw || typeof raw !== "object") {
    return {
      id: `A${String(index + 1).padStart(3, "0")}`,
      title: typeof raw === "string" ? raw.slice(0, 200) : "",
      thesis: "",
      factIds: [],
      centralSubjectId: "",
      mode: "single_subject",
      formatSuitability: { SHORTS: 0.5, LONG: 0.5 },
      risks: [],
    };
  }

  return {
    id: String(raw.id || `A${String(index + 1).padStart(3, "0")}`).slice(0, 10),
    title: sanitizeText(raw.title || "", 200),
    thesis: sanitizeText(raw.thesis || "", SAFETY_LIMITS.maxClaimLength),
    factIds: Array.isArray(raw.factIds || raw.fact_ids)
      ? (raw.factIds || raw.fact_ids).map(String)
      : [],
    centralSubjectId: sanitizeText(
      raw.centralSubjectId || raw.central_subject_id || "",
      60
    ),
    mode: [
      "single_subject",
      "explicit_comparison",
      "process_explanation",
      "timeline",
    ].includes(raw.mode)
      ? raw.mode
      : "single_subject",
    formatSuitability: {
      SHORTS: Math.max(
        0,
        Math.min(
          1,
          Number(
            raw.formatSuitability?.SHORTS ??
              raw.format_suitability?.SHORTS ??
              0.5
          )
        )
      ),
      LONG: Math.max(
        0,
        Math.min(
          1,
          Number(
            raw.formatSuitability?.LONG ?? raw.format_suitability?.LONG ?? 0.5
          )
        )
      ),
    },
    risks: Array.isArray(raw.risks) ? raw.risks.map(String).slice(0, 5) : [],
  };
}
