/**
 * Pesquisa Agent Reach para overlays — por bloco do roteiro.
 * Extrai assuntos de cada bloco, escolhe os melhores para overlay,
 * pesquisa na internet e entrega fatos para counter/bar-chart/timeline.
 */

import fs from "fs";
import path from "path";
import { exaWebSearch, fetchUrlViaJina } from "./agentReachService.js";
import { buildOverlayOrchestrationPlan } from "./overlayOrchestration.js";

const MIN_FACTS = 2;
const MIN_SNIPPET_CHARS = 120;
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const OVERLAY_RESEARCH_CACHE_VERSION = 4;
const RESEARCH_STOPWORDS = new Set([
  "sobre",
  "para",
  "pela",
  "pelo",
  "como",
  "mais",
  "dados",
  "numeros",
  "números",
  "datas",
  "estatisticas",
  "estatísticas",
  "fatos",
  "verificaveis",
  "verificáveis",
  "comparacoes",
  "comparações",
  "engenharia",
  "brasil",
  "historia",
  "história",
  "tecnico",
  "técnico",
  "oficial",
]);

const STORY_OBJECT_GROUPS = [
  ["ponte", "pontes", "viaduto", "viadutos", "passarela", "passarelas"],
  ["predio", "predios", "edificio", "edificios", "condominio", "apartamento"],
  ["barragem", "barragens", "represa", "represas"],
  ["navio", "navios", "barco", "barcos", "submarino", "submarinos"],
  ["aviao", "avioes", "aeronave", "aeronaves", "helicoptero"],
  ["trem", "trens", "metro", "ferrovia", "ferroviaria"],
  ["rodovia", "estrada", "tunel", "tuneis"],
];

const TOPIC_BLACKLIST = new Set([
  "voce",
  "voces",
  "ele",
  "ela",
  "eles",
  "elas",
  "nao",
  "não",
  "sim",
  "este",
  "esta",
  "estes",
  "estas",
  "esse",
  "essa",
  "esses",
  "essas",
  "aquele",
  "aquela",
  "aqueles",
  "aquelas",
  "isso",
  "isto",
  "aquilo",
  "tudo",
  "nada",
  "todo",
  "toda",
  "todos",
  "todas",
  "outro",
  "outra",
  "outros",
  "outras",
  "algum",
  "alguma",
  "alguns",
  "algumas",
  "nenhum",
  "nenhuma",
  "nenhuns",
  "nenhumas",
  "qualquer",
  "quaisquer",
  "onde",
  "como",
  "quando",
  "porque",
  "porquê",
  "quem",
  "qual",
  "quais",
  "mais",
  "menos",
  "muito",
  "pouco",
  "tanto",
  "tanta",
  "tantos",
  "tantas",
  "para",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "com",
  "sem",
  "sobre",
  "atras",
  "tras",
  "mais",
  "pelas",
  "pelos",
  "como",
  "uma",
  "umas",
  "um",
  "uns",
  "caso",
  "fato",
  "fatos",
  "neste",
  "nesta",
  "nestes",
  "nestas",
  "nesse",
  "nessa",
  "nesses",
  "nessas",
  "daquele",
  "daquela",
  "daqueles",
  "daquelas",
  "dele",
  "dela",
  "deles",
  "delas",
  "num",
  "numa",
  "nuns",
  "numas",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "aqui",
  "ali",
  "assim",
  "entao",
  "então",
  "desde",
  "apos",
  "após",
  "entre",
  "contra",
  "sobre",
  "sob",
  "ante",
  "perante",
  "atravess",
  "embora",
  "enquanto",
  "durante",
  "seria",
  "seriam",
  "serio",
  "sério",
  "quase",
  "apenas",
  "mesmo",
  "mesma",
  "mesmos",
  "mesmas",
  "onde",
  "onde",
  "quando",
  "quem",
  "cujo",
  "cuja",
  "cujos",
  "cujas",
  "voce",
  "você",
  "vocês",
  "voces",
  "nosso",
  "nossa",
  "nossos",
  "nossas",
  "meu",
  "minha",
  "meus",
  "minhas",
  "teu",
  "tua",
  "teus",
  "tuas",
  "seu",
  "sua",
  "seus",
  "suas",
  "primeiro",
  "primeira",
  "segundo",
  "segunda",
  "terceiro",
  "terceira",
]);

function normalizeForBlacklist(word = "") {
  return String(word)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]/g, "");
}

function extractCleanTitle(videoTopic = "") {
  const parts = String(videoTopic)
    .split("—")
    .map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[1];
  }
  return parts[0] || "";
}

async function resolveRedirectUrl(url) {
  if (!url || !url.includes("grounding-api-redirect")) return url;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.url || url;
  } catch {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow" });
      return res.url || url;
    } catch {
      return url;
    }
  }
}

function cleanTitleFromUrl(title, url) {
  if (title && !title.startsWith("http")) return title;
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = decodeURIComponent(pathParts[pathParts.length - 1]);
      return lastPart.replace(/[-_]+/g, " ").trim();
    }
    return parsed.hostname;
  } catch {
    return title;
  }
}

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

function sourceLabel(source = {}) {
  return String(source.title || source.url || "").trim();
}

function normalizeResearchSources(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .map((src) => ({
      title: String(src?.title || src?.name || src?.label || "").trim(),
      url: String(src?.url || src?.href || src?.link || "").trim(),
      snippet: String(
        src?.snippet || src?.summary || src?.description || ""
      ).trim(),
    }))
    .filter((src) => src.title || src.url);
}

function normalizeResearchFacts(facts = []) {
  return (Array.isArray(facts) ? facts : [])
    .map((fact) => String(fact || "").trim())
    .filter((fact) => fact.length >= 20);
}

function collectStoryboardResearch(storyboard = {}, injected = {}) {
  const hasExplicitSourceList =
    Array.isArray(storyboard.research_sources) ||
    Array.isArray(storyboard.web_research?.sources) ||
    Array.isArray(storyboard.webResearch?.sources) ||
    Array.isArray(storyboard.strategy?.research_sources) ||
    injected.hasSourcesField === true ||
    Array.isArray(injected.sources);
  const hasExplicitFactList =
    Array.isArray(storyboard.research_facts) ||
    Array.isArray(storyboard.web_facts) ||
    Array.isArray(storyboard.facts) ||
    Array.isArray(storyboard.web_research?.facts) ||
    Array.isArray(storyboard.webResearch?.facts) ||
    injected.hasFactsField === true ||
    Array.isArray(injected.facts);
  const sourceBuckets = [
    storyboard.research_sources,
    storyboard.web_research?.sources,
    storyboard.webResearch?.sources,
    storyboard.strategy?.research_sources,
    injected.sources,
  ];
  const factBuckets = [
    storyboard.research_facts,
    storyboard.web_facts,
    storyboard.facts,
    storyboard.web_research?.facts,
    storyboard.webResearch?.facts,
    storyboard.strategy?.wow_facts_preview,
    storyboard.wow_facts_preview,
    injected.facts,
  ];
  const sources = normalizeResearchSources(
    sourceBuckets.flatMap((v) => v || [])
  );
  const sourceTitleFacts = sources.map((src) => src.title).filter(Boolean);
  const facts = normalizeResearchFacts([
    ...factBuckets.flatMap((v) => v || []),
    ...sourceTitleFacts,
  ]);
  const sourceKey = new Set();
  const dedupedSources = sources.filter((src) => {
    const key = `${src.title}|${src.url}`.toLowerCase();
    if (sourceKey.has(key)) return false;
    sourceKey.add(key);
    return true;
  });
  return {
    sources: dedupedSources,
    facts: [...new Set(facts)],
    hasExplicitSourceList,
    hasExplicitFactList,
  };
}

function tokenizeResearchText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !RESEARCH_STOPWORDS.has(w));
}

function tokenOverlapScore(aTokens = [], bTokens = []) {
  if (!aTokens.length || !bTokens.length) return 0;
  const b = new Set(bTokens);
  let hits = 0;
  for (const token of new Set(aTokens)) {
    if (b.has(token)) hits++;
  }
  return hits / Math.max(1, new Set(aTokens).size);
}

function storyObjectGroupsInText(text = "") {
  const tokens = new Set(tokenizeResearchText(text));
  return STORY_OBJECT_GROUPS.filter((group) =>
    group.some((term) => tokens.has(term))
  );
}

function hasStoryObjectContradiction(candidate = "", context = "") {
  const contextGroups = storyObjectGroupsInText(context);
  if (!contextGroups.length) return false;
  const candidateGroups = storyObjectGroupsInText(candidate);
  if (!candidateGroups.length) return false;
  return candidateGroups.some(
    (candidateGroup) =>
      !contextGroups.some((contextGroup) => contextGroup === candidateGroup)
  );
}

function isResearchCandidateRelevant(candidate = "", context = "") {
  const contextTokens = tokenizeResearchText(context);
  if (!contextTokens.length) return true;
  if (hasStoryObjectContradiction(candidate, context)) return false;
  const candidateTokens = tokenizeResearchText(candidate);
  return tokenOverlapScore(candidateTokens, contextTokens) >= 0.12;
}

function filterFactsForBlock(facts = [], blockEntry = {}, videoTopic = "") {
  const cleanTitle = extractCleanTitle(videoTopic);
  const context = [
    cleanTitle,
    blockEntry.primaryTopic,
    blockEntry.narration,
  ].join(" ");
  const contextTokens = tokenizeResearchText(context);
  if (!contextTokens.length) return facts.slice(0, 8);

  return facts
    .map((fact) => ({
      fact,
      score: tokenOverlapScore(tokenizeResearchText(fact), contextTokens),
    }))
    .filter((entry) => entry.score >= 0.12)
    .filter((entry) => !hasStoryObjectContradiction(entry.fact, context))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.fact)
    .slice(0, 8);
}

function filterSourcesForBlock(sources = [], blockEntry = {}, videoTopic = "") {
  const cleanTitle = extractCleanTitle(videoTopic);
  const context = [
    cleanTitle,
    blockEntry.primaryTopic,
    blockEntry.narration,
  ].join(" ");
  return (sources || [])
    .filter((src) =>
      isResearchCandidateRelevant(
        [src?.title, src?.url, src?.snippet].filter(Boolean).join(" "),
        context
      )
    )
    .slice(0, 5);
}

function factMatchesNarrationBlock(fact = "", blockEntry = {}) {
  const narrationContext = [blockEntry.primaryTopic, blockEntry.narration]
    .filter(Boolean)
    .join(" ");
  const narrationTokens = tokenizeResearchText(narrationContext);
  if (!narrationTokens.length) return true;
  return tokenOverlapScore(tokenizeResearchText(fact), narrationTokens) >= 0.1;
}

function sourceMatchesBlock(source = {}, blockEntry = {}, videoTopic = "") {
  const cleanTitle = extractCleanTitle(videoTopic);
  const context = [
    cleanTitle,
    blockEntry.primaryTopic,
    blockEntry.narration,
  ].join(" ");
  return isResearchCandidateRelevant(
    [source?.title, source?.url, source?.snippet].filter(Boolean).join(" "),
    context
  );
}

async function readFactsFromScriptSources(
  sources = [],
  blockEntry = {},
  videoTopic = ""
) {
  const scopedSources = (sources || [])
    .filter((src) => sourceMatchesBlock(src, blockEntry, videoTopic))
    .slice(0, 4);
  const facts = [];
  const hydratedSources = [];

  for (const src of scopedSources) {
    if (!src.url) {
      hydratedSources.push(src);
      continue;
    }
    const read = await fetchUrlViaJina(src.url);
    const snippet = read.available
      ? String(read.summary || "").slice(0, 1600)
      : String(src.snippet || "").slice(0, 1600);
    const hydrated = {
      title: sourceLabel(src) || src.url,
      url: src.url,
      snippet,
    };
    hydratedSources.push(hydrated);
    const sourceFacts = filterFactsForBlock(
      extractFactsFromResearch({
        items: [{ title: hydrated.title, url: hydrated.url, snippet }],
        summary: snippet,
      }),
      blockEntry,
      videoTopic
    ).filter((fact) => factMatchesNarrationBlock(fact, blockEntry));
    facts.push(...sourceFacts);
  }

  return {
    facts: [...new Set(facts)].slice(0, 8),
    sources: hydratedSources,
  };
}

export function countNumericHints(text = "") {
  const matches = String(text).match(
    /\b\d{1,4}(?:[\.,]\d+)?\s*(?:%|km|m\b|metros?|toneladas?|anos?|séculos?|seculos?|d\.C\.|a\.C\.|milhões?|milhoes?|bilhões?|bilhoes?)?/gi
  );
  return matches ? matches.length : 0;
}

function extractTopicsFromNarration(text = "") {
  const narration = String(text).trim();
  const topics = [];

  const years = narration.match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g);
  if (years) topics.push(...years.map((y) => `ano ${y}`));

  const nums = narration.match(
    /\b\d+(?:[.,]\d+)?\s*(?:%|km|mil|milhões?|milhoes?|bilhões?|bilhoes?|toneladas?|anos?|vezes|x)\b/gi
  );
  if (nums) topics.push(...nums.slice(0, 3));

  const proper = narration.match(
    /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:de|da|do|dos|das)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*/g
  );
  if (proper) {
    const filteredProper = proper
      .map((p) => p.trim())
      .filter((p) => {
        const firstWord = normalizeForBlacklist(p.split(/\s+/)[0]);
        return firstWord.length >= 3 && !TOPIC_BLACKLIST.has(firstWord);
      });
    topics.push(...filteredProper.slice(0, 2));
  }

  if (/compar|versus|vs\.?|maior|menor|dobr|tripl/i.test(narration))
    topics.push("comparação");
  if (
    /primeiro|depois|então|cronolog|fase|etapa|século|seculo/i.test(narration)
  )
    topics.push("cronologia");

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
  if (topics.includes("comparação") || /\bvs\.?|versus|compar/i.test(narration))
    return "bar-chart";
  if (topics.includes("cronologia") || topics.some((t) => t.startsWith("ano")))
    return "timeline";
  if (countNumericHints(narration) >= 1) return "counter";
  return "lower-third";
}

export function extractBlockOverlayTopics(
  blockPhrases = [],
  { niche = "" } = {}
) {
  return (blockPhrases || []).map((bp) => {
    const narration = String(bp.phrase || bp.text || "").trim();
    const topics = extractTopicsFromNarration(narration);
    const primaryTopic =
      topics[0] ||
      narration
        .split(/[.!?]/)
        .map((s) => s.trim())
        .find((s) => s.length >= 12) ||
      narration.slice(0, 90);
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

export function selectBlocksForOverlayResearch(
  blockTopics = [],
  orchestrationPlan = {},
  timings = {}
) {
  const budget = Number(orchestrationPlan?.limits?.maxTotal) || 2;
  const minGap = Number(orchestrationPlan?.limits?.minGapSeconds) || 12;
  const hookCleanSeconds =
    Number(orchestrationPlan?.rhythm?.hookCleanSeconds) || 0;
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  const durations = Array.isArray(timings.durations) ? timings.durations : [];

  const blockStartAt = (block) => {
    const idx = Number(block) - 1;
    if (starts[idx] != null) return Number(starts[idx]) || 0;
    const prior = durations
      .slice(0, idx)
      .reduce((sum, d) => sum + (Number(d) || 0), 0);
    return prior;
  };

  const ranked = [...blockTopics].sort(
    (a, b) => b.overlayScore - a.overlayScore
  );
  const selected = [];

  for (const candidate of ranked) {
    if (selected.length >= budget) break;
    const start = blockStartAt(candidate.block);
    if (start < hookCleanSeconds) continue;
    const tooClose = selected.some(
      (s) => Math.abs(blockStartAt(s.block) - start) < minGap
    );
    if (tooClose && selected.length > 0) continue;
    selected.push({ ...candidate, blockStart: start });
  }

  if (selected.length < budget) {
    for (const candidate of ranked) {
      if (selected.length >= budget) break;
      if (selected.some((s) => s.block === candidate.block)) continue;
      const start = blockStartAt(candidate.block);
      if (start < hookCleanSeconds) continue;
      const tooClose = selected.some(
        (s) => Math.abs(blockStartAt(s.block) - start) < minGap
      );
      if (tooClose) continue;
      selected.push({ ...candidate, blockStart: start });
    }
  }

  return selected.sort((a, b) => a.block - b.block);
}

export function buildOverlayResearchTopic({
  config = {},
  storyboard = {},
  blockPhrases = [],
} = {}) {
  const niche = String(config.niche || "Geral").trim();
  const title = String(
    storyboard.strategy?.title_main ||
      storyboard.strategy?.title ||
      storyboard.idea_title ||
      storyboard.title ||
      ""
  ).trim();
  const phraseHints = (blockPhrases || [])
    .slice(0, 4)
    .map((bp) => String(bp.phrase || bp.text || "").trim())
    .filter(Boolean)
    .join(" ");
  return [niche, title, phraseHints].filter(Boolean).join(" — ").slice(0, 220);
}

function buildResearchCacheKey(blockPhrases, orchestrationPlan) {
  const blocks = (blockPhrases || [])
    .map((bp) => `${bp.block}:${String(bp.phrase || "").slice(0, 40)}`)
    .join("|");
  const budget = orchestrationPlan?.limits?.maxTotal || 0;
  return `v${OVERLAY_RESEARCH_CACHE_VERSION}::${blocks}::${budget}`;
}

function isUsableOverlayResearchCache(research = {}, cacheKey = "") {
  if (!research || research.cacheKey !== cacheKey) return false;
  if (research.cacheVersion !== OVERLAY_RESEARCH_CACHE_VERSION) return false;
  if (!Array.isArray(research.blocks) || research.blocks.length === 0)
    return false;
  const query = String(research.query || "")
    .trim()
    .toLowerCase();
  if (!query || query.startsWith("geral dados")) return false;
  if (research.summary && !research.blocks.some((b) => b.query)) return false;
  return true;
}

export function isOverlayResearchSufficient(research = {}) {
  if (research.blocks?.length) {
    const withFacts = research.blocks.filter(
      (b) => (b.facts || []).length >= 1
    );
    if (withFacts.length >= Math.min(2, research.selectedBlocks?.length || 2))
      return true;
  }
  if (!research.available) return false;
  const facts = research.facts || [];
  if (facts.length >= MIN_FACTS) return true;
  const snippetLen = (research.items || []).reduce(
    (n, it) => n + String(it.snippet || "").length,
    0
  );
  if ((research.items || []).length >= 2 && snippetLen >= MIN_SNIPPET_CHARS * 2)
    return true;
  const numeric = countNumericHints([research.summary, ...facts].join("\n"));
  return numeric >= 2 && String(research.summary || "").length >= 400;
}

export function buildOverlayResearchPromptBlock(research = {}) {
  const blockSections = (research.blocks || [])
    .filter((b) => b.selected !== false)
    .filter(
      (b) =>
        !(b.sourceLocked || research.sourceLocked) ||
        (Array.isArray(b.facts) && b.facts.length > 0)
    )
    .map((b) => {
      const factLines = (b.facts || [])
        .slice(0, 5)
        .map((f) => `    • ${f}`)
        .join("\n");
      return [
        `  BLOCO ${b.block} (cena ~${b.block}.1):`,
        `    Assunto: ${b.primaryTopic}`,
        `    Tipo sugerido: ${b.suggestedType}`,
        `    Score overlay: ${b.overlayScore}`,
        factLines
          ? `    FATOS DA INTERNET:\n${factLines}`
          : "    FATOS: (use complemento criativo curto — pesquisa insuficiente)",
        b.sources?.length
          ? `    Fontes: ${b.sources
              .slice(0, 2)
              .map((s) => s.title || s.url)
              .join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const hasBlockData = Boolean(blockSections);

  if (!hasBlockData && !research.sufficient) return "";

  return `

PESQUISA POR BLOCO (JSON DO ROTEIRO primeiro; internet apenas se o JSON não tiver pesquisa) — GERE 1 OVERLAY POR BLOCO SELECIONADO:
Workflow obrigatório:
1. Para cada bloco listado abaixo, gere EXATAMENTE 1 overlay informativo.
2. Use SOMENTE os fatos/números/datas do bloco selecionado correspondente. PROIBIDO usar fatos gerais do nicho ou de outro assunto.
3. O campo "start" deve ser o scene_id do bloco (ex: bloco 3 → "3.1").
4. O overlay deve trazer informação NOVA que a narração não diz (complementar, não repetir).
5. Respeite o orçamento máximo (${research.budget || "ver plano"}) e o gap mínimo entre overlays.
6. Se o fato pesquisado não tiver relação direta com a história contada naquele bloco, descarte o overlay.

BLOCOS SELECIONADOS PARA OVERLAY:
${blockSections || "  (nenhum bloco com pesquisa — use os assuntos do roteiro abaixo)"}

Regra: bar-chart e timeline precisam de valores/datas ancorados nos fatos. lower-third/kinetic-text em até 12 palavras.
`;
}

async function researchSingleBlock(
  blockEntry,
  niche,
  workspaceDir,
  videoTopic = "",
  storyboardResearch = {}
) {
  const cleanTitle = extractCleanTitle(videoTopic);
  const query = [
    cleanTitle,
    blockEntry.primaryTopic && blockEntry.primaryTopic !== cleanTitle
      ? blockEntry.primaryTopic
      : "",
    "dados números datas estatísticas fatos verificáveis",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);

  const scriptFacts = filterFactsForBlock(
    storyboardResearch.facts || [],
    blockEntry,
    videoTopic
  );
  const scriptSources = filterSourcesForBlock(
    storyboardResearch.sources || [],
    blockEntry,
    videoTopic
  );

  const hasScriptResearch =
    (storyboardResearch.facts || []).length > 0 ||
    (storyboardResearch.sources || []).length > 0 ||
    storyboardResearch.hasExplicitSourceList ||
    storyboardResearch.hasExplicitFactList;

  if (hasScriptResearch) {
    const hydratedScriptResearch = await readFactsFromScriptSources(
      storyboardResearch.sources || [],
      blockEntry,
      videoTopic
    );
    const mergedScriptFacts = [...hydratedScriptResearch.facts, ...scriptFacts];
    const mergedScriptSources = hydratedScriptResearch.sources.length
      ? hydratedScriptResearch.sources
      : scriptSources;
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
      facts: [...new Set(mergedScriptFacts)].slice(0, 8),
      rawFactCount: mergedScriptFacts.length,
      sources: mergedScriptSources,
      summary: "Pesquisa extraída das fontes do JSON do roteiro.",
      available: Boolean(
        mergedScriptFacts.length || mergedScriptSources.length
      ),
      via: "storyboard-research",
      sourceLocked: true,
    };
  }

  const search = await exaWebSearch(query, workspaceDir, { numResults: 5 });
  const rawFacts = extractFactsFromResearch(search);
  const facts = filterFactsForBlock(rawFacts, blockEntry, videoTopic);
  const sources = filterSourcesForBlock(
    search.sources || [],
    blockEntry,
    videoTopic
  );

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
    rawFactCount: rawFacts.length,
    sources,
    summary: String(search.summary || "").slice(0, 600),
    available: Boolean(search.available),
    via: search.via || "agent-reach",
  };
}

export async function fetchOverlayResearchForRender(
  projectDir,
  workspaceDir,
  { forceRefresh = false, orchestrationPlan = null, scriptResearch = null } = {}
) {
  const config = readJson(path.join(projectDir, "config_qanat.json"), {});
  const storyboard = readJson(path.join(projectDir, "storyboard.json"), {});
  const timings = readJson(path.join(projectDir, "block_timings.json"), {
    starts: [],
    durations: [],
    total_duration: 0,
  });
  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : [];
  const niche = config.niche || "Geral";

  const plan =
    orchestrationPlan ||
    buildOverlayOrchestrationPlan({
      config,
      niche,
      totalDuration: Number(timings.total_duration) || 0,
      projectName: path.basename(projectDir),
      blockCount: blockPhrases.length,
    });

  const blockTopics = extractBlockOverlayTopics(blockPhrases, { niche });
  const selectedBlocks = selectBlocksForOverlayResearch(
    blockTopics,
    plan,
    timings
  );
  const cacheKey = buildResearchCacheKey(blockPhrases, plan);
  const topic = buildOverlayResearchTopic({ config, storyboard, blockPhrases });
  const storyboardResearch = collectStoryboardResearch(
    storyboard,
    scriptResearch || {}
  );

  // Resolve redirect URLs in parallel
  if (Array.isArray(storyboardResearch.sources)) {
    storyboardResearch.sources = await Promise.all(
      storyboardResearch.sources.map(async (src) => {
        if (!src.url) return src;
        const resolvedUrl = await resolveRedirectUrl(src.url);
        const resolvedTitle = cleanTitleFromUrl(src.title, resolvedUrl);
        return {
          ...src,
          title: resolvedTitle,
          url: resolvedUrl,
        };
      })
    );
  }

  if (
    !forceRefresh &&
    isUsableOverlayResearchCache(storyboard.overlays_research, cacheKey)
  ) {
    const age =
      Date.now() -
      new Date(storyboard.overlays_research.fetchedAt || 0).getTime();
    if (age >= 0 && age < CACHE_MAX_AGE_MS) {
      return { ...storyboard.overlays_research, cached: true };
    }
  }

  console.log(
    `[Overlay Research] Analisando ${blockPhrases.length} blocos — ` +
      `selecionados ${selectedBlocks.map((b) => b.block).join(", ")} ` +
      `(orçamento: ${plan.limits?.maxTotal}, gap: ${plan.limits?.minGapSeconds}s)`
  );

  const blockResearch = [];
  for (const blockEntry of selectedBlocks) {
    try {
      const result = await researchSingleBlock(
        blockEntry,
        niche,
        workspaceDir,
        topic,
        storyboardResearch
      );
      blockResearch.push(result);
      console.log(
        `[Overlay Research] Bloco ${result.block}: "${result.primaryTopic.slice(0, 50)}" ` +
          `→ ${result.facts.length} fatos (${result.suggestedType})`
      );
    } catch (err) {
      console.warn(
        `[Overlay Research] Bloco ${blockEntry.block} falhou:`,
        err.message
      );
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

  const allFacts = blockResearch.flatMap((b) => b.facts || []);

  const research = {
    available: blockResearch.some((b) => b.available),
    sufficient: false,
    topic,
    cacheKey,
    cacheVersion: OVERLAY_RESEARCH_CACHE_VERSION,
    budget: plan.limits?.maxTotal,
    minGapSeconds: plan.limits?.minGapSeconds,
    format: plan.format,
    selectedBlocks: selectedBlocks.map((b) => b.block),
    blocks: blockResearch,
    sourceLocked:
      storyboardResearch.hasExplicitSourceList ||
      storyboardResearch.hasExplicitFactList,
    blockTopics,
    query: blockResearch.map((b) => `B${b.block}: ${b.query}`).join(" | "),
    summary: "",
    facts: [...new Set(allFacts)].slice(0, 20),
    sources: blockResearch.flatMap((b) => b.sources || []).slice(0, 12),
    items: [],
    via:
      storyboardResearch.hasExplicitSourceList ||
      storyboardResearch.hasExplicitFactList
        ? "storyboard-research"
        : "agent-reach",
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

export async function resolveOverlayResearchForPlanning(
  projectDir,
  workspaceDir,
  options = {}
) {
  const {
    forceRefresh = false,
    orchestrationPlan = null,
    scriptResearch = null,
  } = options;
  try {
    const research = await fetchOverlayResearchForRender(
      projectDir,
      workspaceDir,
      {
        forceRefresh,
        orchestrationPlan,
        scriptResearch,
      }
    );
    const blockCount = research.blocks?.length || 0;
    const factCount = research.facts?.length || 0;
    if (research.sufficient || blockCount > 0) {
      console.log(
        `[Overlay Research] OK — ${blockCount} bloco(s) pesquisado(s), ` +
          `${factCount} fatos, blocos: [${(research.selectedBlocks || []).join(", ")}]`
      );
    } else {
      console.log(
        `[Overlay Research] Dados insuficientes — modo legado (IA gera complementos). ` +
          `${research.message || "sem fatos utilizáveis"}`
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
