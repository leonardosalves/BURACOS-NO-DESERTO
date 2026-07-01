/**
 * Pesquisa Agent Reach na hora do render — dados reais para overlays (counter, bar-chart, timeline).
 * Se insuficiente, o pipeline segue no modo legado (IA complementa sem fontes externas).
 */

import fs from "fs";
import path from "path";
import { exaWebSearch } from "./agentReachService.js";

const MIN_FACTS = 2;
const MIN_SNIPPET_CHARS = 120;
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

function readJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || fallback;
  } catch {
    return fallback;
  }
}

function extractFactsFromResearch(search = {}) {
  const facts = [];
  for (const item of search.items || []) {
    if (!item.snippet) continue;
    const lines = String(item.snippet)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 30);
    facts.push(...lines.slice(0, 3));
  }
  if (!facts.length && search.summary) {
    const lines = String(search.summary)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 40 && !/^Title:|^URL:|^Published:/i.test(l));
    facts.push(...lines.slice(0, 8));
  }
  return [...new Set(facts)].slice(0, 12);
}

function countNumericHints(text = "") {
  const matches = String(text).match(
    /\b\d{1,4}(?:[\.,]\d+)?\s*(?:%|km|m\b|metros?|toneladas?|anos?|séculos?|seculos?|d\.C\.|a\.C\.|milhões?|milhoes?|bilhões?|bilhoes?)?/gi,
  );
  return matches ? matches.length : 0;
}

export function buildOverlayResearchTopic({ config = {}, storyboard = {}, blockPhrases = [] } = {}) {
  const niche = String(config.niche || "Geral").trim();
  const title = String(
    storyboard.strategy?.title
    || storyboard.idea_title
    || storyboard.title
    || "",
  ).trim();
  const phraseHints = (blockPhrases || [])
    .slice(0, 4)
    .map((bp) => String(bp.phrase || bp.text || "").trim())
    .filter(Boolean)
    .join(" ");
  return [niche, title, phraseHints].filter(Boolean).join(" — ").slice(0, 220);
}

export function isOverlayResearchSufficient(research = {}) {
  if (!research.available) return false;
  const facts = research.facts || [];
  if (facts.length >= MIN_FACTS) return true;
  const snippetLen = (research.items || []).reduce((n, it) => n + String(it.snippet || "").length, 0);
  if ((research.items || []).length >= 2 && snippetLen >= MIN_SNIPPET_CHARS * 2) return true;
  const numeric = countNumericHints([research.summary, ...facts].join("\n"));
  return numeric >= 2 && String(research.summary || "").length >= 400;
}

export function buildOverlayResearchPromptBlock(research = {}) {
  if (!research.sufficient) return "";

  const factLines = (research.facts || []).slice(0, 10).map((f) => `• ${f}`).join("\n");
  const sourceLines = (research.sources || [])
    .slice(0, 6)
    .map((s, i) => `${i + 1}. ${s.title || s.url}`)
    .join("\n");

  return `

DADOS REAIS DA INTERNET (Agent Reach) — USE NOS OVERLAYS DE DADOS:
Priorize estes fatos/números/datas em counters, bar-charts e timelines. Não invente estatísticas quando houver dado real abaixo.
Tema: ${research.topic || "assunto do vídeo"}

${factLines ? `FATOS ENCONTRADOS:\n${factLines}\n` : ""}
${research.summary ? `CONTEXTO (trecho):\n${String(research.summary).slice(0, 2000)}\n` : ""}
${sourceLines ? `FONTES:\n${sourceLines}\n` : ""}
Regra: bar-chart e timeline precisam de valores/datas ancorados nos fatos acima. lower-third/kinetic-text podem sintetizar em até 12 palavras.
Se faltar um número específico para um overlay, use complemento criativo curto — mas só onde a lista não cobrir.
`;
}

export async function fetchOverlayResearchForRender(projectDir, workspaceDir, { forceRefresh = false } = {}) {
  const config = readJson(path.join(projectDir, "config_qanat.json"), {});
  const storyboard = readJson(path.join(projectDir, "storyboard.json"), {});
  const blockPhrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const topic = buildOverlayResearchTopic({ config, storyboard, blockPhrases });

  if (!forceRefresh && storyboard.overlays_research?.topic === topic) {
    const age = Date.now() - new Date(storyboard.overlays_research.fetchedAt || 0).getTime();
    if (age >= 0 && age < CACHE_MAX_AGE_MS) {
      return { ...storyboard.overlays_research, cached: true };
    }
  }

  const query = `${topic} dados números datas estatísticas fatos verificáveis comparações`;
  const search = await exaWebSearch(query, workspaceDir, { numResults: 8 });
  const facts = extractFactsFromResearch(search);

  const research = {
    available: Boolean(search.available),
    sufficient: false,
    topic,
    query,
    summary: search.summary || "",
    facts,
    sources: search.sources || [],
    items: search.items || [],
    via: search.via || "agent-reach",
    message: search.message || null,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
  research.sufficient = isOverlayResearchSufficient(research);

  try {
    const sbPath = path.join(projectDir, "storyboard.json");
    const sb = readJson(sbPath, {});
    sb.overlays_research = research;
    fs.writeFileSync(sbPath, JSON.stringify(sb, null, 2), "utf8");
  } catch {
    // non-fatal
  }

  return research;
}

export async function resolveOverlayResearchForPlanning(projectDir, workspaceDir) {
  try {
    const research = await fetchOverlayResearchForRender(projectDir, workspaceDir);
    if (research.sufficient) {
      console.log(
        `[Overlay Research] Agent Reach OK — ${research.facts?.length || 0} fatos, `
        + `${research.sources?.length || 0} fontes (tema: ${research.topic?.slice(0, 60)})`,
      );
    } else {
      console.log(
        `[Overlay Research] Dados insuficientes — modo legado (IA gera complementos). `
        + `${research.message || "sem fatos utilizáveis"}`,
      );
    }
    return research;
  } catch (err) {
    console.warn("[Overlay Research] Falha Agent Reach:", err.message);
    return {
      available: false,
      sufficient: false,
      topic: "",
      facts: [],
      sources: [],
      message: err.message,
      fetchedAt: new Date().toISOString(),
    };
  }
}