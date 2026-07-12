/**
 * Extração e normalização robusta de grounding metadata do Gemini.
 */

import { SAFETY_LIMITS } from "./researchConfig.js";

/**
 * Normaliza URL removendo tracking params e trailing slashes.
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return clean;
  try {
    const u = new URL(clean);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "msclkid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
    ];
    for (const p of trackingParams) u.searchParams.delete(p);
    clean = u.toString().replace(/\/+$/, "");
  } catch {
    clean = clean.replace(/\/+$/, "");
  }
  return clean.slice(0, SAFETY_LIMITS.maxUrlLength);
}

/**
 * Extrai domínio de uma URL.
 * @param {string} url
 * @returns {string}
 */
export function extractDomain(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** @typedef {import("./researchConfig.js").ResearchConfig} ResearchConfig */

/**
 * @typedef {object} StructuredSource
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} domain
 * @property {string} publisher
 * @property {string} publishedAt
 * @property {string} retrievedAt
 * @property {string} sourceType
 * @property {number} qualityScore
 * @property {string} independentSourceGroup
 * @property {number[]} groundingChunkIndices
 */

/**
 * @typedef {object} GroundingSupport
 * @property {string} text - Trecho do texto que referencia a fonte
 * @property {number[]} chunkIndices - Índices dos chunks referenciados
 * @property {number[]} confidenceScores
 */

let sourceCounter = 0;

/**
 * Extrai metadata de grounding de um candidato Gemini.
 * @param {object} candidate
 * @returns {{ chunks: object[], supports: GroundingSupport[] }}
 */
export function extractGroundingMetadata(candidate = {}) {
  const meta =
    candidate?.groundingMetadata ?? candidate?.grounding_metadata ?? {};
  return {
    chunks: meta.groundingChunks ?? meta.grounding_chunks ?? [],
    supports: meta.groundingSupports ?? meta.grounding_supports ?? [],
  };
}

/**
 * Normaliza grounding chunks para StructuredSource[].
 * @param {object[]} chunks
 * @returns {StructuredSource[]}
 */
export function normalizeGroundingChunks(chunks = []) {
  const out = [];
  const seenUrls = new Set();
  sourceCounter = 0;

  for (const chunk of chunks) {
    if (!chunk || typeof chunk !== "object") continue;

    const web = chunk.web || chunk.retrievedContext || chunk;
    const rawUri = web?.uri || web?.url || "";
    const rawTitle = web?.title || "";

    if (!rawUri) continue;
    const normalizedUrl = normalizeUrl(rawUri);
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    sourceCounter++;
    const id = `S${String(sourceCounter).padStart(3, "0")}`;
    const domain = extractDomain(normalizedUrl);

    out.push({
      id,
      title: String(rawTitle || normalizedUrl)
        .trim()
        .slice(0, SAFETY_LIMITS.maxTitleLength),
      url: normalizedUrl,
      domain,
      publisher: "",
      publishedAt: "",
      retrievedAt: new Date().toISOString(),
      sourceType: classifySourceType(domain),
      qualityScore: 0,
      independentSourceGroup: domain,
      groundingChunkIndices: [chunks.indexOf(chunk)],
    });
  }

  return out.slice(0, SAFETY_LIMITS.maxArrayItems);
}

/**
 * Normaliza grounding supports preservando TODOS os chunk indices.
 * @param {object[]} supports
 * @returns {GroundingSupport[]}
 */
export function normalizeGroundingSupports(supports = []) {
  const out = [];

  for (const s of supports) {
    if (!s || typeof s !== "object") continue;

    const indices = s.groundingChunkIndices ?? s.grounding_chunk_indices ?? [];
    const validIndices = (Array.isArray(indices) ? indices : [indices])
      .map(Number)
      .filter(Number.isFinite);

    const scores = s.confidenceScores ?? s.confidence_scores ?? [];
    const validScores = (Array.isArray(scores) ? scores : [])
      .map(Number)
      .filter(Number.isFinite);

    const segmentText = s.segment?.text ?? s.text ?? "";

    out.push({
      text: String(segmentText).slice(0, SAFETY_LIMITS.maxFieldLength),
      chunkIndices: validIndices,
      confidenceScores: validScores,
    });
  }

  return out;
}

/**
 * Liga fatos às fontes usando supports como intermediário.
 * @param {object[]} facts - Array de StructuredFact (com campo claim)
 * @param {GroundingSupport[]} supports
 * @param {StructuredSource[]} sources
 * @returns {object[]} Facts com sourceIds e supportIds preenchidos
 */
export function attachSourcesToFacts(facts, supports, sources) {
  if (!Array.isArray(facts) || !facts.length) return facts;

  const chunkToSourceId = new Map();
  for (const src of sources) {
    for (const idx of src.groundingChunkIndices || []) {
      chunkToSourceId.set(idx, src.id);
    }
  }

  for (const fact of facts) {
    if (!fact || typeof fact !== "object") continue;
    const claim = String(fact.claim || "").toLowerCase();
    if (!claim) continue;

    const matchedSourceIds = new Set(fact.sourceIds || []);
    const matchedSupportIds = [];

    for (let si = 0; si < supports.length; si++) {
      const sup = supports[si];
      const supText = String(sup.text || "").toLowerCase();
      if (!supText) continue;

      // Match if claim has significant overlap with support text
      const claimWords = claim.split(/\s+/).filter((w) => w.length > 3);
      const supWords = new Set(supText.split(/\s+/));
      const overlap = claimWords.filter((w) => supWords.has(w)).length;
      const overlapRatio =
        claimWords.length > 0 ? overlap / claimWords.length : 0;

      if (overlapRatio >= 0.3) {
        matchedSupportIds.push(si);
        for (const idx of sup.chunkIndices) {
          const srcId = chunkToSourceId.get(idx);
          if (srcId) matchedSourceIds.add(srcId);
        }
      }
    }

    fact.sourceIds = [...matchedSourceIds];
    fact.supportIds = matchedSupportIds;
  }

  return facts;
}

/**
 * Classifica tipo de fonte pelo domínio.
 * @param {string} domain
 * @returns {string}
 */
function classifySourceType(domain) {
  if (!domain) return "unknown";
  const d = domain.toLowerCase();
  if (
    /\.edu($|\.)/.test(d) ||
    /university|universidade|universitat|uni\-/.test(d)
  )
    return "university";
  if (
    /scielo|pubmed|doi\.org|nature\.com|science\.org|arxiv|springer|wiley|elsevier|jstor|pnas\.org|plos/.test(
      d
    )
  )
    return "scientific";
  if (/\.gov($|\.)/.test(d) || /governo|government/.test(d)) return "official";
  if (/\.mil($|\.)/.test(d)) return "official";
  if (/museum|museu|museo/.test(d)) return "museum";
  if (
    /reuters|apnews|bbc|nytimes|washingtonpost|theguardian|folha\.uol|estadao|g1\.globo|oglobo/.test(
      d
    )
  )
    return "journalism";
  if (/wikipedia|britannica|enciclopedia/.test(d)) return "reference";
  if (/amazon|shopify|mercadolivre|aliexpress/.test(d)) return "commercial";
  return "unknown";
}
