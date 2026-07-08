/**
 * Pesquisa do storyboard — compartilhado entre overlays e motion scenes.
 */

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
  ["palacio", "palácio", "palace"],
  ["barragem", "barragens", "represa", "represas"],
  ["navio", "navios", "barco", "barcos"],
];

export function extractCleanTitle(videoTopic = "") {
  return String(videoTopic || "")
    .replace(/\s*[-–|]\s*.*$/, "")
    .replace(/#\d+/g, "")
    .trim();
}

export function normalizeResearchSources(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .map((src) => ({
      title: String(src?.title || src?.name || src?.label || "").trim(),
      url: String(src?.url || src?.link || src?.href || "").trim(),
      snippet: String(
        src?.snippet || src?.text || src?.summary || src?.description || ""
      ).trim(),
    }))
    .filter((src) => src.title || src.url || src.snippet);
}

export function normalizeResearchFacts(facts = []) {
  return (Array.isArray(facts) ? facts : [])
    .map((fact) => String(fact || "").trim())
    .filter((fact) => fact.length >= 20);
}

export function tokenizeResearchText(text = "") {
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

export function isResearchCandidateRelevant(candidate = "", context = "") {
  const contextTokens = tokenizeResearchText(context);
  if (!contextTokens.length) return true;
  if (hasStoryObjectContradiction(candidate, context)) return false;
  const candidateTokens = tokenizeResearchText(candidate);
  return tokenOverlapScore(candidateTokens, contextTokens) >= 0.12;
}

export function collectStoryboardResearch(storyboard = {}, injected = {}) {
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

  const snippetFacts = sources
    .map((src) => src.snippet)
    .filter((snippet) => snippet.length >= 40);

  const titleFacts = sources
    .map((src) => src.title)
    .filter((title) => title.length >= 12);

  let facts = normalizeResearchFacts([
    ...factBuckets.flatMap((v) => v || []),
    ...snippetFacts,
  ]);

  if (facts.length < 3 && hasExplicitSourceList) {
    facts = normalizeResearchFacts([...facts, ...titleFacts]);
  }

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

export function buildVideoTopicFromStoryboard(storyboard = {}, config = {}) {
  return (
    config.video_title ||
    storyboard.strategy?.title ||
    storyboard.title ||
    storyboard.strategy?.hook ||
    config.niche ||
    ""
  );
}

export function filterFactsForBlock(
  facts = [],
  blockEntry = {},
  videoTopic = ""
) {
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

export function filterSourcesForBlock(
  sources = [],
  blockEntry = {},
  videoTopic = ""
) {
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

export function buildMotionResearchContext(storyboard = {}, config = {}) {
  const bundle = collectStoryboardResearch(storyboard);
  const videoTopic = buildVideoTopicFromStoryboard(storyboard, config);
  const blockFacts = new Map();

  for (const vp of storyboard.visual_prompts || []) {
    const block = Number(vp.block) || 1;
    const narration = String(
      vp.narration_text || vp.asset?.narration_segment || ""
    ).trim();
    const entry = {
      block,
      narration,
      primaryTopic: narration.split(/[.!?]/)[0]?.slice(0, 120) || "",
      scene_ref: String(vp.scene || vp.scene_ref || ""),
    };
    const facts = filterFactsForBlock(bundle.facts, entry, videoTopic);
    const sources = filterSourcesForBlock(bundle.sources, entry, videoTopic);
    blockFacts.set(entry.scene_ref || `block-${block}`, {
      ...entry,
      facts,
      sources,
    });
  }

  return {
    videoTopic,
    globalFacts: bundle.facts.slice(0, 16),
    globalSources: bundle.sources.slice(0, 12),
    hasExplicitSources: bundle.hasExplicitSourceList,
    bySceneRef: blockFacts,
  };
}
