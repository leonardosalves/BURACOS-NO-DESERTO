/**
 * Pesquisa web com Agent Reach (Exa) + Gemini Google Search grounding.
 * Módulo reestruturado — pacote factual estruturado com validação.
 */

import crypto from "crypto";
import {
  fetchAgentReachResearchForTopic,
  mergeWebResearch,
} from "./agentReachService.js";
import {
  crawlDiscoveredSources,
  mergeCrawlWithDiscovery,
} from "./crawl4aiService.js";
import { RESEARCH_CONFIG, SAFETY_LIMITS } from "./researchConfig.js";
import { callGeminiApi, maskApiKey } from "./fetchWithRetry.js";
import {
  extractGroundingMetadata,
  normalizeGroundingChunks,
  normalizeGroundingSupports,
  attachSourcesToFacts,
} from "./groundingParser.js";
import {
  normalizeFact,
  normalizeAngle,
  validateResearchFacts,
  scoreSources,
} from "./researchValidator.js";
import {
  buildResearchPrompt,
  buildGeminiResearchRequestBody,
} from "./researchPrompt.js";

// ─── Parsing ───────────────────────────────────────────────────────

const VALID_FINISH_REASONS = new Set(["STOP", "stop", undefined, null, ""]);

/**
 * Valida finishReason de um candidato Gemini.
 * @param {object} candidate
 * @returns {{ ok: boolean, reason: string }}
 */
function checkFinishReason(candidate) {
  const reason = candidate?.finishReason || candidate?.finish_reason || "";
  if (!reason || VALID_FINISH_REASONS.has(reason)) return { ok: true, reason };
  return { ok: false, reason: String(reason) };
}

/**
 * Faz parse do JSON da resposta Gemini com fallback controlado.
 * @param {string} text
 * @returns {object|null}
 */
function parseResearchJson(text = "") {
  const raw = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Tenta parse direto primeiro
  try {
    return JSON.parse(raw);
  } catch {
    /* fallback */
  }

  // Fallback: encontra o primeiro { e o último }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Valida schema mínimo do resultado da pesquisa.
 * @param {object} parsed
 * @returns {boolean}
 */
function isValidResearchSchema(parsed) {
  if (!parsed || typeof parsed !== "object") return false;
  if (!Array.isArray(parsed.facts)) return false;
  if (typeof parsed.summary !== "string" && !parsed.facts.length) return false;
  return true;
}

// ─── Resultado padrão ──────────────────────────────────────────────

function emptyResult(overrides = {}) {
  return {
    available: false,
    summary: "",
    facts: [],
    structuredFacts: [],
    factTexts: [],
    angles: [],
    sources: [],
    supports: [],
    controversies: [],
    unknowns: [],
    quality: {
      score: 0,
      approvedFactCount: 0,
      rejectedFactCount: 0,
      sourceCount: 0,
      independentSourceCount: 0,
    },
    model: "",
    via: "",
    fallback: true,
    ...overrides,
  };
}

// ─── Core ──────────────────────────────────────────────────────────

/**
 * Pesquisa web estruturada — Agent Reach + Gemini Grounding.
 * @param {object} opts
 * @param {string} opts.topic
 * @param {string} opts.niche
 * @param {string} opts.format
 * @param {string|null} opts.apiKey
 * @param {Function} opts.getApiKeys
 * @param {string|null} opts.workspaceDir
 * @param {string} [opts.diversityHint]
 * @param {string[]} [opts.excludeTopics]
 * @returns {Promise<object>}
 */
export async function fetchWebResearchForTopic({
  topic = "",
  niche = "",
  format = "SHORTS",
  apiKey = null,
  getApiKeys = () => [],
  workspaceDir = null,
  diversityHint = "",
  excludeTopics = [],
} = {}) {
  const researchRunId = crypto.randomUUID().slice(0, 12);
  const startTime = Date.now();
  const query = String(topic || niche)
    .trim()
    .slice(0, SAFETY_LIMITS.maxTopicLength);

  if (!query) {
    return emptyResult({ message: "Tema vazio", errorCode: "EMPTY_TOPIC" });
  }

  logEvent(researchRunId, "research_start", { topic: query, niche, format });

  // ── 1. Agent Reach ──
  let agentReach = emptyResult({ via: "agent-reach" });
  if (workspaceDir) {
    try {
      agentReach = await fetchAgentReachResearchForTopic({
        topic: query,
        niche,
        workspaceDir,
        numResults: 6,
      });
      if (agentReach.available) {
        logEvent(researchRunId, "agent_reach_ok", {
          sourceCount: agentReach.sources?.length || 0,
          factCount: agentReach.facts?.length || 0,
        });
      }
    } catch (err) {
      logEvent(researchRunId, "agent_reach_error", { error: err.message });
    }
  }

  // ── 2. Crawl4AI page extraction ──
  if (agentReach.available && agentReach.sources?.length) {
    try {
      const crawl = await crawlDiscoveredSources(agentReach.sources);
      if (crawl.available) {
        agentReach = mergeCrawlWithDiscovery(agentReach, crawl);
        logEvent(researchRunId, "crawl4ai_ok", {
          sourceCount: crawl.sources?.length || 0,
        });
      } else {
        logEvent(researchRunId, "crawl4ai_unavailable", {
          message: crawl.message || "sem conteudo",
        });
      }
    } catch (err) {
      logEvent(researchRunId, "crawl4ai_error", { error: err.message });
    }
  }

  // ── 3. Gemini Grounding ──
  const keys = [...new Set([apiKey, ...getApiKeys()].filter(Boolean))];
  if (!keys.length) {
    if (agentReach.available) {
      return normalizeAgentReachResult(agentReach, researchRunId, startTime);
    }
    return emptyResult({
      message: "Sem chave API e Agent Reach indisponível",
      errorCode: "NO_API_KEY",
    });
  }

  const prompt = buildResearchPrompt({
    topic: query,
    niche,
    format,
    diversityHint,
    excludeTopics,
  });
  const requestBody = buildGeminiResearchRequestBody(prompt);
  const models = RESEARCH_CONFIG.models;

  let lastErr = null;
  let usedModel = "";

  for (const model of models) {
    for (const key of keys) {
      try {
        logEvent(researchRunId, "gemini_attempt", {
          model,
          key: maskApiKey(key),
        });

        const data = await callGeminiApi({
          model,
          apiKey: key,
          body: requestBody,
          timeoutMs: RESEARCH_CONFIG.timeoutMs,
          maxRetries: Math.max(0, RESEARCH_CONFIG.retryAttempts - 1),
        });

        const candidate = data.candidates?.[0];
        if (!candidate) {
          lastErr = new Error("Resposta sem candidatos");
          continue;
        }

        // Valida finishReason
        const finish = checkFinishReason(candidate);
        if (!finish.ok) {
          lastErr = new Error(`finishReason inválido: ${finish.reason}`);
          logEvent(researchRunId, "invalid_finish_reason", {
            reason: finish.reason,
            model,
          });
          continue;
        }

        const responseText = (candidate.content?.parts || [])
          .map((p) => p.text || "")
          .join("\n");

        const parsed = parseResearchJson(responseText);
        if (!isValidResearchSchema(parsed)) {
          lastErr = new Error("Schema da pesquisa inválido");
          logEvent(researchRunId, "invalid_schema", { model });
          continue;
        }

        // Extrai grounding
        const { chunks, supports: rawSupports } =
          extractGroundingMetadata(candidate);
        const structuredSources = normalizeGroundingChunks(chunks);
        const supports = normalizeGroundingSupports(rawSupports);

        // Normaliza fatos
        let structuredFacts = (parsed.facts || [])
          .slice(0, RESEARCH_CONFIG.maxFacts)
          .map((raw, i) => normalizeFact(raw, i));

        // Liga fatos → fontes via supports
        structuredFacts = attachSourcesToFacts(
          structuredFacts,
          supports,
          structuredSources
        );

        // Score das fontes
        scoreSources(structuredSources);

        // Valida fatos
        const validation = validateResearchFacts(
          structuredFacts,
          structuredSources,
          supports
        );

        // Normaliza ângulos
        const angles = (parsed.angles || [])
          .slice(0, RESEARCH_CONFIG.maxAngles)
          .map((raw, i) => normalizeAngle(raw, i));

        const summary = String(parsed.summary || "")
          .trim()
          .slice(0, SAFETY_LIMITS.maxSummaryLength);

        if (!summary && validation.approvedFacts.length === 0) {
          lastErr = new Error("Pesquisa web sem fatos utilizáveis");
          continue;
        }

        usedModel = model;

        const geminiResult = {
          available: true,
          summary:
            summary || validation.approvedFacts.map((f) => f.claim).join(" "),
          // Compat: facts como string[] para consumidores antigos
          facts: validation.approvedFacts.map((f) => f.claim),
          structuredFacts: validation.approvedFacts,
          factTexts: validation.approvedFacts.map((f) => f.claim),
          angles,
          sources: structuredSources.map((s) => ({
            title: s.title,
            url: s.url,
            ...s,
          })),
          supports,
          controversies: Array.isArray(parsed.controversies)
            ? parsed.controversies.map(String).slice(0, 10)
            : [],
          unknowns: Array.isArray(parsed.unknowns)
            ? parsed.unknowns.map(String).slice(0, 10)
            : [],
          quality: {
            score: validation.qualityScore,
            approvedFactCount: validation.approvedFacts.length,
            rejectedFactCount: validation.rejectedFacts.length,
            sourceCount: structuredSources.length,
            independentSourceCount: new Set(
              structuredSources.map((s) => s.independentSourceGroup)
            ).size,
          },
          researchQuestion: String(parsed.researchQuestion || "").slice(0, 300),
          centralThesis: String(parsed.centralThesis || "").slice(0, 300),
          searchCoverage: parsed.searchCoverage || {},
          model: usedModel,
          via: "gemini-grounding",
          fallback: false,
          researchRunId,
        };

        const merged = mergeStructuredResults(agentReach, geminiResult);

        logEvent(researchRunId, "research_completed", {
          provider: "gemini-grounding",
          model: usedModel,
          durationMs: Date.now() - startTime,
          sourceCount: merged.sources?.length || 0,
          approvedFactCount: merged.quality?.approvedFactCount || 0,
          rejectedFactCount: merged.quality?.rejectedFactCount || 0,
          qualityScore: merged.quality?.score || 0,
        });

        return merged;
      } catch (err) {
        lastErr = err;
        if (err.permanent) {
          logEvent(researchRunId, "permanent_error", {
            model,
            key: maskApiKey(key),
            status: err.status,
            message: err.message,
          });
          continue;
        }
        logEvent(researchRunId, "gemini_error", {
          model,
          error: err.message,
        });
      }
    }
  }

  logEvent(researchRunId, "gemini_all_failed", {
    error: lastErr?.message || "desconhecido",
    durationMs: Date.now() - startTime,
  });

  if (agentReach.available) {
    return normalizeAgentReachResult(agentReach, researchRunId, startTime);
  }

  return emptyResult({
    message: lastErr?.message || "Pesquisa web indisponível",
    errorCode: "ALL_PROVIDERS_FAILED",
    retryable: !lastErr?.permanent,
    researchRunId,
  });
}

// ─── Merge ─────────────────────────────────────────────────────────

/**
 * Merge inteligente entre Agent Reach e Gemini mantendo estrutura.
 * @param {object} agentReach
 * @param {object} gemini
 * @returns {object}
 */
function mergeStructuredResults(agentReach, gemini) {
  if (!agentReach?.available) return gemini;
  if (!gemini?.available) return normalizeAgentReachResult(agentReach);

  // Usa merge legado do agentReachService para sources e facts (compat)
  const legacyMerged = mergeWebResearch(agentReach, gemini);

  return {
    ...gemini,
    summary: legacyMerged.summary,
    facts: legacyMerged.facts,
    sources: legacyMerged.sources,
    angles: legacyMerged.angles || gemini.angles,
    via: legacyMerged.via || `${agentReach.via}+${gemini.via}`,
    fallback: false,
  };
}

/**
 * Normaliza resultado do Agent Reach para o formato padrão.
 * @param {object} reach
 * @param {string} [runId]
 * @param {number} [startTime]
 * @returns {object}
 */
function normalizeAgentReachResult(reach, runId, startTime) {
  const facts = reach.facts || [];
  return {
    available: reach.available || false,
    summary: reach.summary || "",
    facts,
    structuredFacts: facts.map((f, i) =>
      typeof f === "string"
        ? {
            id: `F${String(i + 1).padStart(3, "0")}`,
            claim: f,
            subject: "",
            subjectId: "",
            factType: "other",
            location: "",
            period: "",
            value: null,
            unit: "",
            status: "unverified",
            confidence: 0.3,
            sourceIds: [],
            supportIds: [],
            caveat: "Fonte: Agent Reach (sem grounding)",
            narrationAllowed: false,
            origin: ["agent-reach"],
          }
        : f
    ),
    factTexts: facts.map((f) => (typeof f === "string" ? f : f.claim || "")),
    angles: reach.angles || [],
    sources: (reach.sources || []).map((s) => ({
      ...s,
      sourceType: "unknown",
      qualityScore: 0.3,
    })),
    supports: [],
    controversies: [],
    unknowns: [],
    quality: {
      score: 0.3,
      approvedFactCount: 0,
      rejectedFactCount: facts.length,
      sourceCount: reach.sources?.length || 0,
      independentSourceCount: new Set((reach.sources || []).map((s) => s.url))
        .size,
    },
    model: "",
    via: reach.via || "agent-reach",
    fallback: true,
    researchRunId: runId,
  };
}

// ─── Format ────────────────────────────────────────────────────────

/**
 * Formata pacote de pesquisa para inclusão no prompt do roteirista.
 * Versão enriquecida com fatos estruturados e regras obrigatórias.
 * @param {object} research
 * @param {string} [label]
 * @returns {string}
 */
export function formatWebResearchPromptBlock(
  research = {},
  label = "PESQUISA WEB (FONTES REAIS)"
) {
  if (!research?.summary && !research?.facts?.length) return "";

  const parts = [`${label}:`];

  // Tese central
  if (research.centralThesis) {
    parts.push(`TESE CENTRAL: ${research.centralThesis}`);
  }
  if (research.researchQuestion) {
    parts.push(`PERGUNTA DE PESQUISA: ${research.researchQuestion}`);
  }

  // Resumo
  if (research.summary) {
    parts.push(`\n${research.summary}`);
  }

  // Fatos aprovados com metadados
  const structuredFacts = research.structuredFacts || [];
  const factsToShow = structuredFacts.length
    ? structuredFacts.filter((f) => f.narrationAllowed !== false)
    : research.facts || [];

  if (factsToShow.length) {
    parts.push("\nFATOS APROVADOS PARA NARRAÇÃO:");
    for (const fact of factsToShow.slice(0, RESEARCH_CONFIG.maxFacts)) {
      if (typeof fact === "string") {
        parts.push(`• ${fact}`);
      } else {
        let line = `• [${fact.id}] ${fact.claim}`;
        if (fact.subject) line += ` (sujeito: ${fact.subject})`;
        if (fact.status && fact.status !== "confirmed")
          line += ` [${fact.status}]`;
        if (fact.caveat) line += ` ⚠️ ${fact.caveat}`;
        if (fact.sourceIds?.length)
          line += ` (fontes: ${fact.sourceIds.join(", ")})`;
        parts.push(line);
      }
    }
  }

  // Fontes
  const sources = (research.sources || []).slice(0, 10);
  if (sources.length) {
    parts.push("\nFONTES:");
    for (const s of sources) {
      const id = s.id ? `[${s.id}] ` : "";
      const type =
        s.sourceType && s.sourceType !== "unknown" ? ` (${s.sourceType})` : "";
      parts.push(`${id}${s.title}${type} — ${s.url}`);
    }
  }

  // Controvérsias
  if (research.controversies?.length) {
    parts.push("\nCONTROVÉRSIAS:");
    for (const c of research.controversies.slice(0, 5)) {
      parts.push(`⚡ ${c}`);
    }
  }

  // Regras para o roteirista
  parts.push(`
REGRAS OBRIGATÓRIAS PARA O ROTEIRISTA:
1. Utilize SOMENTE fatos listados acima.
2. NÃO altere números, datas, unidades, locais ou sujeitos.
3. NÃO combine fatos de sujeitos diferentes como se fossem o mesmo caso.
4. NÃO transforme "provável", "disputado" ou "especulativo" em certeza.
5. NÃO ignore caveats (⚠️).
6. NÃO crie relações de causa que NÃO estejam nos fatos.
7. NÃO invente contexto para conectar informações.
8. O fechamento deve ser declarativo (mic drop), NUNCA pergunta vazia ao espectador.`);

  return parts.join("\n");
}

// ─── Logging ───────────────────────────────────────────────────────

/**
 * Log estruturado para observabilidade.
 * @param {string} runId
 * @param {string} event
 * @param {object} data
 */
function logEvent(runId, event, data = {}) {
  console.log(
    `[WebResearch] ${JSON.stringify({ event, researchRunId: runId, ...data })}`
  );
}
