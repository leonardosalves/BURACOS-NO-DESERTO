/**
 * Garante fatos de pesquisa web no storyboard antes de preencher contratos Studio.
 */

import {
  buildVideoTopicFromStoryboard,
  collectStoryboardResearch,
  normalizeResearchFacts,
  normalizeResearchSources,
} from "../shared/storyboardResearch.js";
import { fetchWebResearchForTopic } from "./webResearchService.js";
import {
  loadNotebooklmBrief,
  shouldSkipWebResearchForBrief,
} from "./notebooklmResearchBrief.js";

const MIN_FACTS = 3;
const MIN_SOURCES = 2;

function dedupeSources(sources = []) {
  const seen = new Set();
  return sources.filter((src) => {
    const key = `${src.title}|${src.url}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeFacts(facts = []) {
  return [...new Set(facts.map((f) => String(f || "").trim()).filter(Boolean))];
}

function researchTopicFromStoryboard(storyboard = {}, config = {}) {
  const fromTitle = buildVideoTopicFromStoryboard(storyboard, config);
  if (String(fromTitle || "").trim().length >= 8)
    return String(fromTitle).trim();

  const narration = String(
    storyboard.narrative_script || storyboard.narration || ""
  ).trim();
  if (narration.length >= 24) return narration.slice(0, 220);

  const firstVp = (storyboard.visual_prompts || []).find((vp) =>
    String(vp.narration_text || vp.asset?.narration_segment || "").trim()
  );
  const vpText = String(
    firstVp?.narration_text || firstVp?.asset?.narration_segment || ""
  ).trim();
  if (vpText.length >= 16) return vpText.slice(0, 220);

  return String(config.niche || "").trim();
}

/**
 * Busca na web (Agent Reach + Gemini grounding) se o storyboard ainda não tem fatos suficientes.
 */
export async function ensureStoryboardWebResearch(
  storyboard = {},
  config = {},
  {
    projDir = "",
    workspaceDir = "",
    getApiKey = null,
    getApiKeys = null,
    minFacts = MIN_FACTS,
    minSources = MIN_SOURCES,
  } = {}
) {
  const bundle = collectStoryboardResearch(storyboard);
  if (bundle.facts.length >= minFacts && bundle.sources.length >= minSources) {
    return { storyboard, fetched: false, reason: "research_sufficient" };
  }

  if (projDir) {
    const brief = loadNotebooklmBrief(projDir);
    if (brief?.available && shouldSkipWebResearchForBrief(brief)) {
      const parsed = brief.parsed || {};
      const mergedFacts = dedupeFacts([
        ...normalizeResearchFacts(storyboard.research_facts || []),
        ...normalizeResearchFacts(parsed.facts || []),
      ]);
      const next = {
        ...storyboard,
        research_facts: mergedFacts,
        notebooklm_brief: {
          path: brief.relativePath,
          fact_count: parsed.factCount || mergedFacts.length,
          skip_web_research: true,
        },
        template_hints: {
          ...(storyboard.template_hints || {}),
          ...(parsed.templateHints || {}),
        },
        web_research: {
          ...(storyboard.web_research || {}),
          summary: String(parsed.accumulated || "").slice(0, 8000),
          via: "notebooklm-brief-md",
        },
      };
      return {
        storyboard: next,
        fetched: false,
        reason: "notebooklm_brief_sufficient",
      };
    }
  }

  const topic = researchTopicFromStoryboard(storyboard, config);
  if (!topic) {
    return { storyboard, fetched: false, reason: "empty_topic" };
  }

  const format =
    String(config.format || "").toUpperCase() === "SHORTS" ||
    String(config.aspect_ratio || "") === "9:16"
      ? "SHORTS"
      : "LONG";

  const webResearch = await fetchWebResearchForTopic({
    topic,
    niche: String(config.niche || "").trim(),
    format,
    apiKey: getApiKey?.(projDir),
    getApiKeys: () =>
      typeof getApiKeys === "function" ? getApiKeys(projDir) : [],
    workspaceDir,
  });

  if (!webResearch?.available) {
    return {
      storyboard,
      fetched: false,
      reason: webResearch?.message || "web_research_unavailable",
    };
  }

  const mergedSources = dedupeSources([
    ...normalizeResearchSources(storyboard.research_sources || []),
    ...normalizeResearchSources(webResearch.sources || []),
  ]);
  const mergedFacts = dedupeFacts([
    ...normalizeResearchFacts(storyboard.research_facts || []),
    ...normalizeResearchFacts(webResearch.facts || []),
    ...mergedSources
      .map((src) => src.snippet)
      .filter((snippet) => String(snippet || "").length >= 40),
  ]);

  const next = {
    ...storyboard,
    research_sources: mergedSources,
    research_facts: mergedFacts,
    web_research: {
      ...(storyboard.web_research && typeof storyboard.web_research === "object"
        ? storyboard.web_research
        : {}),
      summary: String(webResearch.summary || "").slice(0, 8000),
      fetched_at: new Date().toISOString(),
      via: webResearch.via || "production-orchestrator",
      topic,
      facts_count: mergedFacts.length,
      sources_count: mergedSources.length,
    },
  };

  return {
    storyboard: next,
    fetched: true,
    meta: {
      facts: mergedFacts.length,
      sources: mergedSources.length,
      via: webResearch.via,
    },
  };
}
