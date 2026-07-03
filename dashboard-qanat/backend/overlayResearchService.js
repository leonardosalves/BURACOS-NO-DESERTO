/**
 * Pesquisa Agent Reach para overlays — por bloco do roteiro.
 * Extrai assuntos de cada bloco, escolhe os melhores para overlay,
 * pesquisa na internet e entrega fatos para counter/bar-chart/timeline.
 */

import fs from "fs";
import path from "path";
import { exaWebSearch } from "./agentReachService.js";
import { buildOverlayOrchestrationPlan } from "./overlayOrchestration.js";

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

export function countNumericHints(text = "") {
  const matches = String(text).match(
    /\b\d{1,4}(?:[\.,]\d+)?\s*(?:%|km|m\b|metros?|toneladas?|anos?|séculos?|seculos?|d\.C\.|a\.C\.|milhões?|milhoes?|bilhões?|bilhoes?)?/gi,
  );
  return matches ? matches.length : 0;
}

function extractTopicsFromNarration(text = "") {
  const narration = String(text).trim();
  const topics = [];

  const years = narration.match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g);
  if (years) topics.push(...years.map((y) => `ano ${y}`));

  const nums = narration.match(
    /\b\d+(?:[.,]\d+)?\s*(?:%|km|mil|milhões?|milhoes?|bilhões?|bilhoes?|toneladas?|anos?|vezes|x)\b/gi,
  );
  if (nums) topics.push(...nums.slice(0, 3));

  const proper = narration.match(
    /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:de|da|do|dos|das)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*/g,
  );
  if (proper) topics.push(...proper.slice(0, 2));

  if (/compar|versus|vs\.?|maior|menor|dobr|tripl/i.test(narration)) topics.push("comparação");
  if (/primeiro|depois|então|cronolog|fase|etapa|século|seculo/i.test(narration)) topics.push("cronologia");

  return [...new Set(topics)].slice(0, 6);
}

function scoreOverlayPotential(narration = "", topics = []) {
  let score = 0;
  const numeric = countNumericHints(narration);
  if (numeric >= 1) score += 25;
  if (numeric >= 3) score += 25;
  if (topics.includes("comparação")) score += 30;
  if (topics.some((t) => t.startsWith("ano"))) score += 20;
  if (topics.includes("cronologia")) score += 15;
  if (/\bversus\b|vs\.?|compar/i.test(narration)) score += 10;
  if (narration.length > 60) score += 5;
  return score;
}

function suggestOverlayType(narration = "", topics = []) {
  if (topics.includes("comparação") || /\bvs\.?|versus|compar/i.test(narration)) return "bar-chart";
  if (topics.includes("cronologia") || topics.some((t) => t.startsWith("ano"))) return "timeline";
  if (countNumericHints(narration) >= 1) return "counter";
  return "lower-third";
}

export function extractBlockOverlayTopics(blockPhrases = [], { niche = "" } = {}) {
  return (blockPhrases || []).map((bp) => {
    const narration = String(bp.phrase || bp.text || "").trim();
    const topics = extractTopicsFromNarration(narration);
    const primaryTopic = topics[0]
      || narration.split(/[.!?]/).map((s) => s.trim()).find((s) => s.length >= 12)
      || narration.slice(0, 90);
    return {
      block: Number(bp.block || 1),
      narration: narration.slice(0, 300),
      topics,
      primaryTopic: primaryTopic.slice(0, 120),
      overlayScore: scoreOverlayPotential(narration, topics),
      suggestedType: suggestOverlayType(narration, topics),
      niche: String(niche || "").trim(),
    };
  });
}

export function selectBlocksForOverlayResearch(blockTopics = [], orchestrationPlan = {}, timings = {}) {
  const budget = Number(orchestrationPlan?.limits?.maxTotal) || 2;
  const minGap = Number(orchestrationPlan?.limits?.minGapSeconds) || 12;
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  const durations = Array.isArray(timings.durations) ? timings.durations : [];

  const blockStartAt = (block) => {
    const idx = Number(block) - 1;
    if (starts[idx] != null) return Number(starts[idx]) || 0;
    const prior = durations.slice(0, idx).reduce((sum, d) => sum + (Number(d) || 0), 0);
    return prior;
  };

  const ranked = [...blockTopics].sort((a, b) => b.overlayScore - a.overlayScore);
  const selected = [];

  for (const candidate of ranked) {
    if (selected.length >= budget) break;
    const start = blockStartAt(candidate.block);
    const tooClose = selected.some((s) => Math.abs(blockStartAt(s.block) - start) < minGap);
    if (tooClose && selected.length > 0) continue;
    selected.push({ ...candidate, blockStart: start });
  }

  if (selected.length < budget) {
    for (const candidate of ranked) {
      if (selected.length >= budget) break;
      if (selected.some((s) => s.block === candidate.block)) continue;
      const start = blockStartAt(candidate.block);
      const tooClose = selected.some((s) => Math.abs(blockStartAt(s.block) - start) < minGap);
      if (tooClose) continue;
      selected.push({ ...candidate, blockStart: start });
    }
  }

  return selected.sort((a, b) => a.block - b.block);
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

function buildResearchCacheKey(blockPhrases, orchestrationPlan) {
  const blocks = (blockPhrases || []).map((bp) => `${bp.block}:${String(bp.phrase || "").slice(0, 40)}`).join("|");
  const budget = orchestrationPlan?.limits?.maxTotal || 0;
  return `${blocks}::${budget}`;
}

export function isOverlayResearchSufficient(research = {}) {
  if (research.blocks?.length) {
    const withFacts = research.blocks.filter((b) => (b.facts || []).length >= 1);
    if (withFacts.length >= Math.min(2, research.selectedBlocks?.length || 2)) return true;
  }
  if (!research.available) return false;
  const facts = research.facts || [];
  if (facts.length >= MIN_FACTS) return true;
  const snippetLen = (research.items || []).reduce((n, it) => n + String(it.snippet || "").length, 0);
  if ((research.items || []).length >= 2 && snippetLen >= MIN_SNIPPET_CHARS * 2) return true;
  const numeric = countNumericHints([research.summary, ...facts].join("\n"));
  return numeric >= 2 && String(research.summary || "").length >= 400;
}

export function buildOverlayResearchPromptBlock(research = {}) {
  const blockSections = (research.blocks || [])
    .filter((b) => b.selected !== false)
    .map((b) => {
      const factLines = (b.facts || []).slice(0, 5).map((f) => `    • ${f}`).join("\n");
      return [
        `  BLOCO ${b.block} (cena ~${b.block}.1):`,
        `    Assunto: ${b.primaryTopic}`,
        `    Tipo sugerido: ${b.suggestedType}`,
        `    Score overlay: ${b.overlayScore}`,
        factLines ? `    FATOS DA INTERNET:\n${factLines}` : "    FATOS: (use complemento criativo curto — pesquisa insuficiente)",
        b.sources?.length ? `    Fontes: ${b.sources.slice(0, 2).map((s) => s.title || s.url).join("; ")}` : "",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const globalFacts = (research.facts || []).slice(0, 6).map((f) => `• ${f}`).join("\n");
  const hasBlockData = Boolean(blockSections);
  const hasGlobalData = Boolean(globalFacts) || Boolean(research.summary);

  if (!hasBlockData && !hasGlobalData && !research.sufficient) return "";

  return `

PESQUISA POR BLOCO (Agent Reach) — GERE 1 OVERLAY POR BLOCO SELECIONADO:
Workflow obrigatório:
1. Para cada bloco listado abaixo, gere EXATAMENTE 1 overlay informativo.
2. Use os fatos/números/datas da pesquisa — NÃO invente estatísticas quando houver dado real.
3. O campo "start" deve ser o scene_id do bloco (ex: bloco 3 → "3.1").
4. O overlay deve trazer informação NOVA que a narração não diz (complementar, não repetir).
5. Respeite o orçamento máximo (${research.budget || "ver plano"}) e o gap mínimo entre overlays.

BLOCOS SELECIONADOS PARA OVERLAY:
${blockSections || "  (nenhum bloco com pesquisa — use os assuntos do roteiro abaixo)"}

${globalFacts ? `FATOS GERAIS DO VÍDEO:\n${globalFacts}\n` : ""}
${research.summary ? `CONTEXTO GLOBAL:\n${String(research.summary).slice(0, 1200)}\n` : ""}
Regra: bar-chart e timeline precisam de valores/datas ancorados nos fatos. lower-third/kinetic-text em até 12 palavras.
`;
}

async function researchSingleBlock(blockEntry, niche, workspaceDir) {
  const query = [
    niche,
    blockEntry.primaryTopic,
    "dados números datas estatísticas fatos verificáveis comparações",
  ].filter(Boolean).join(" ").slice(0, 240);

  const search = await exaWebSearch(query, workspaceDir, { numResults: 5 });
  const facts = extractFactsFromResearch(search);

  return {
    block: blockEntry.block,
    blockStart: blockEntry.blockStart,
    primaryTopic: blockEntry.primaryTopic,
    topics: blockEntry.topics,
    narration: blockEntry.narration,
    suggestedType: blockEntry.suggestedType,
    overlayScore: blockEntry.overlayScore,
    selected: true,
    query,
    facts,
    sources: search.sources || [],
    summary: String(search.summary || "").slice(0, 600),
    available: Boolean(search.available),
    via: search.via || "agent-reach",
  };
}

export async function fetchOverlayResearchForRender(
  projectDir,
  workspaceDir,
  { forceRefresh = false, orchestrationPlan = null } = {},
) {
  const config = readJson(path.join(projectDir, "config_qanat.json"), {});
  const storyboard = readJson(path.join(projectDir, "storyboard.json"), {});
  const timings = readJson(path.join(projectDir, "block_timings.json"), { starts: [], durations: [], total_duration: 0 });
  const blockPhrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const niche = config.niche || "Geral";

  const plan = orchestrationPlan || buildOverlayOrchestrationPlan({
    config,
    niche,
    totalDuration: Number(timings.total_duration) || 0,
    projectName: path.basename(projectDir),
    blockCount: blockPhrases.length,
  });

  const blockTopics = extractBlockOverlayTopics(blockPhrases, { niche });
  const selectedBlocks = selectBlocksForOverlayResearch(blockTopics, plan, timings);
  const cacheKey = buildResearchCacheKey(blockPhrases, plan);
  const topic = buildOverlayResearchTopic({ config, storyboard, blockPhrases });

  if (!forceRefresh && storyboard.overlays_research?.cacheKey === cacheKey) {
    const age = Date.now() - new Date(storyboard.overlays_research.fetchedAt || 0).getTime();
    if (age >= 0 && age < CACHE_MAX_AGE_MS) {
      return { ...storyboard.overlays_research, cached: true };
    }
  }

  console.log(
    `[Overlay Research] Analisando ${blockPhrases.length} blocos — `
    + `selecionados ${selectedBlocks.map((b) => b.block).join(", ")} `
    + `(orçamento: ${plan.limits?.maxTotal}, gap: ${plan.limits?.minGapSeconds}s)`,
  );

  const blockResearch = [];
  for (const blockEntry of selectedBlocks) {
    try {
      const result = await researchSingleBlock(blockEntry, niche, workspaceDir);
      blockResearch.push(result);
      console.log(
        `[Overlay Research] Bloco ${result.block}: "${result.primaryTopic.slice(0, 50)}" `
        + `→ ${result.facts.length} fatos (${result.suggestedType})`,
      );
    } catch (err) {
      console.warn(`[Overlay Research] Bloco ${blockEntry.block} falhou:`, err.message);
      blockResearch.push({
        ...blockEntry,
        selected: true,
        facts: [],
        sources: [],
        available: false,
        message: err.message,
      });
    }
  }

  const globalQuery = `${topic} dados números datas estatísticas fatos verificáveis comparações`;
  let globalSearch = { available: false, summary: "", sources: [], items: [] };
  try {
    globalSearch = await exaWebSearch(globalQuery, workspaceDir, { numResults: 6 });
  } catch (err) {
    console.warn("[Overlay Research] Busca global falhou:", err.message);
  }
  const globalFacts = extractFactsFromResearch(globalSearch);

  const allFacts = [
    ...blockResearch.flatMap((b) => b.facts || []),
    ...globalFacts,
  ];

  const research = {
    available: blockResearch.some((b) => b.available) || Boolean(globalSearch.available),
    sufficient: false,
    topic,
    cacheKey,
    budget: plan.limits?.maxTotal,
    minGapSeconds: plan.limits?.minGapSeconds,
    format: plan.format,
    selectedBlocks: selectedBlocks.map((b) => b.block),
    blocks: blockResearch,
    blockTopics,
    query: globalQuery,
    summary: globalSearch.summary || "",
    facts: [...new Set(allFacts)].slice(0, 20),
    sources: [
      ...blockResearch.flatMap((b) => b.sources || []),
      ...(globalSearch.sources || []),
    ].slice(0, 12),
    items: globalSearch.items || [],
    via: "agent-reach",
    message: null,
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

export async function resolveOverlayResearchForPlanning(projectDir, workspaceDir, options = {}) {
  const { forceRefresh = false, orchestrationPlan = null } = options;
  try {
    const research = await fetchOverlayResearchForRender(projectDir, workspaceDir, {
      forceRefresh,
      orchestrationPlan,
    });
    const blockCount = research.blocks?.length || 0;
    const factCount = research.facts?.length || 0;
    if (research.sufficient || blockCount > 0) {
      console.log(
        `[Overlay Research] OK — ${blockCount} bloco(s) pesquisado(s), `
        + `${factCount} fatos, blocos: [${(research.selectedBlocks || []).join(", ")}]`,
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
      blocks: [],
      selectedBlocks: [],
      sources: [],
      message: err.message,
      fetchedAt: new Date().toISOString(),
    };
  }
}