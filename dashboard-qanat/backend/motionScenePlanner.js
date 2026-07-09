/**
 * Planejador de cenas Remotion — detecta trechos do roteiro e escolhe templates.
 */

import {
  APPROVED_ORCHESTRATION_TEMPLATES,
  DEFAULT_DURATIONS,
  FULLSCREEN_TEMPLATES,
  LOCATION_INTRO_DEFAULTS,
  MOTION_SCENE_TRIGGERS,
  MOTION_TRACK_ID,
  REMOTION_TEMPLATE_LIMITS,
  defaultMotionTrack,
  operationalCatalogForTemplates,
  pickTemplateDecisionForTrigger,
  resolveLayoutForTemplate,
  resolvePresentationForScene,
} from "../shared/motionSceneCatalog.js";
import { resolvePackByAlias } from "./timelineStudioNichePacks.js";
import { detectNicheCategory } from "./overlayOrchestration.js";
import { classifyPlaceType } from "./satelliteMapService.js";
import {
  clipMatchesSuppression,
  collectSuppressionState,
  storyboardRowMatchesSuppression,
} from "../shared/timelineStudioRemotionSuppress.js";
import { isRunnableStudioMotionScene } from "../shared/timelineStudioLegacyStrip.js";
import { mergeMotionClipPreservingUserEdits } from "../shared/studioClipUserMerge.js";
import { enrichStudioTemplateScene } from "../shared/studioTemplatePropsBinder.js";
import { applyStudioRoleToScene } from "../shared/studioTemplateRoles.js";
import { buildMotionResearchContext } from "../shared/storyboardResearch.js";
import {
  enrichMotionScenesWithResearch,
  resolvePlaceWithResearch,
} from "../shared/motionResearchProps.js";
import {
  attachStudioTemplateToScene,
  getCatalogForNiche,
  pickStudioTemplateByCategory,
  pickStudioTemplateForTrigger,
  resolveMotionTemplateIdsFromPack,
  resolveStudioSourceCode,
} from "./remotionTemplateCatalogService.js";
import {
  attachGeoPipStudioTemplate,
  isGeoPipShortScene,
} from "../shared/geoPipStudioTemplate.js";
import { injectStudioRoleScenes } from "../shared/studioTemplateRoleInjector.js";
import {
  classifyGeoNarrationSegment,
  explainGeoNarrationSegment,
  limitGeoMotionScenes,
} from "../shared/geoSceneEligibility.js";

const YEAR_RE = /\b(1\d{3}|20\d{2})\b/;
const YEAR_GLOBAL_RE = /\b(1\d{3}|20\d{2})\b/g;

function applyGeoPipStudioPack(scene = {}, niche = "") {
  if (!isGeoPipShortScene(scene)) return scene;
  const tpl = String(scene.template_id || "").trim();
  if (tpl !== "location-intro" && tpl !== "geo-map") return scene;
  const catalog = niche ? getCatalogForNiche(niche) : { approved: [] };
  return attachGeoPipStudioTemplate(scene, {
    niche,
    catalog,
    resolveSourceCode: resolveStudioSourceCode,
  });
}
const STAT_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|bilh[oõ]es?|milh[oõ]es?|mil\b|anos?|km|m\b|volts?|reais|R\$)/i;
const COMPARISON_RE =
  /\b(maior|menor|versus|vs\.?|comparad[oa]|dobro|triplo|supera|ultrapassa)\b/i;
const LOCATION_RE =
  /\b(?:em|na|no|de)\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,3})\b/;
const CURIOSITY_RE =
  /\b(chocante|incr[ií]vel|segredo|enigma|mist[eé]rio|nunca|ningu[eé]m|descobr|revela|imposs[ií]vel|absurdo)\b/i;
const HISTORICAL_RE =
  /\b(em\s+\d{3,4}|s[eé]culo|antig[oa]s?|imp[eé]rio|dinastia|guerra|revolu[cç][aã]o)\b/i;

const KNOWN_PLACES = [
  {
    pattern: /\bpalmanova\b/i,
    location: "Palmanova",
    region: "Vêneto",
    country: "Itália",
  },
  {
    pattern: /bourtange/i,
    location: "Fort Bourtange",
    region: "Groningen",
    country: "Países Baixos",
  },
  {
    pattern: /amaz[oô]nia/i,
    location: "Amazônia",
    region: "Norte",
    country: "Brasil",
  },
  { pattern: /brasil/i, location: "Brasil", region: "", country: "Brasil" },
  {
    pattern: /egito|pir[aâ]mide/i,
    location: "Egito",
    region: "",
    country: "Egito",
  },
  {
    pattern: /roma|romanos?/i,
    location: "Roma",
    region: "Lácio",
    country: "Itália",
  },
];

export function classifyNarrationSegment(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 8) return null;

  if (STAT_RE.test(t) && COMPARISON_RE.test(t)) {
    return { trigger: "comparison", confidence: 0.78 };
  }

  if (STAT_RE.test(t)) {
    return { trigger: "stat_number", confidence: 0.85 };
  }

  const geo = classifyGeoNarrationSegment(t, KNOWN_PLACES);
  if (geo) return geo;

  if (CURIOSITY_RE.test(t) && t.length < 120) {
    return { trigger: "curiosity_punch", confidence: 0.68 };
  }

  if (HISTORICAL_RE.test(t) && YEAR_RE.test(t)) {
    return { trigger: "historical_fact", confidence: 0.75 };
  }

  const years = [...t.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
  if (years.length >= 2) {
    return { trigger: "timeline_date", confidence: 0.72, years };
  }

  if (YEAR_RE.test(t) && /\b(ano|data|em)\b/i.test(t)) {
    return { trigger: "historical_fact", confidence: 0.65 };
  }

  return null;
}

function parseStatValue(text) {
  const m = String(text).match(
    /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|bilh[oõ]es?|milh[oõ]es?|mil\b)?/i
  );
  if (!m) return { value: 0, suffix: "", label: "DADO" };
  let value = Number(String(m[1]).replace(",", "."));
  const unit = String(m[2] || "").toLowerCase();
  let suffix = "";
  if (unit.includes("%") || unit.includes("cento")) suffix = "%";
  else if (unit.includes("bilh")) {
    value *= 1e9;
    suffix = "";
  } else if (unit.includes("milh")) {
    value *= 1e6;
  }
  const label = text.slice(0, 48).replace(/\d+/g, "").trim() || "IMPACTO";
  return {
    value: Math.round(value),
    suffix,
    label: label.toUpperCase().slice(0, 32),
  };
}

function resolvePlace(text, researchContext = null) {
  if (researchContext) {
    const fromResearch = resolvePlaceWithResearch(text, researchContext);
    if (fromResearch) return fromResearch;
    if (researchContext.hasExplicitSources) {
      const m = String(text).match(LOCATION_RE);
      if (m?.[1] && m[1].length > 3) {
        return { location: m[1], region: "", country: "" };
      }
      const topic = String(researchContext.videoTopic || "").trim();
      if (topic.length > 4) {
        return {
          location: topic.slice(0, 48),
          region: "",
          country: "",
        };
      }
    }
  }

  for (const p of KNOWN_PLACES) {
    if (p.pattern.test(text)) return p;
  }
  const m = text.match(LOCATION_RE);
  if (m?.[1]) {
    return { location: m[1], region: "", country: "" };
  }
  return { location: "Local", region: "", country: "" };
}

function resolvePreferredMotionTemplates(config = {}) {
  const pack = config.motion_template_pack;
  if (!pack?.enabled) return [];
  return resolveMotionTemplateIdsFromPack(pack, config.niche);
}

function buildTemplateReviewEntry({
  vp = {},
  narration = "",
  classification = null,
  decision = null,
  scene = null,
  geoReview = null,
  skipped = false,
  reason = "",
}) {
  const sceneRef = String(vp.scene || vp.scene_ref || scene?.scene_ref || "");
  return {
    scene_ref: sceneRef,
    block: Number(vp.block || scene?.block) || 1,
    template_id: scene?.template_id || decision?.template_id || null,
    trigger: scene?.trigger || classification?.trigger || null,
    score: Number.isFinite(Number(decision?.score))
      ? Number(decision.score)
      : null,
    confidence: Number.isFinite(Number(classification?.confidence))
      ? Number(classification.confidence)
      : (scene?.confidence ?? null),
    skipped: Boolean(skipped),
    reason:
      reason ||
      decision?.reasons?.[0] ||
      (skipped ? "sem template aplicavel" : "template selecionado"),
    reasons: Array.isArray(decision?.reasons) ? decision.reasons : [],
    warnings: Array.isArray(decision?.warnings) ? decision.warnings : [],
    geo_review: geoReview,
    narration_excerpt: String(narration || scene?.narration_text || "").slice(
      0,
      180
    ),
  };
}

function buildMotionPlanReview({
  scenes = [],
  reviewEntries = [],
  skippedEntries = [],
  nichePack = "",
  preferredTemplates = [],
  aspectRatio = "16:9",
  beforeLimitCount = 0,
  afterGeoLimitCount = 0,
  studioPackEnabled = false,
  boostedCount = 0,
  transitionCount = 0,
  backgroundCount = 0,
}) {
  const usedTemplates = scenes.map((scene) => String(scene.template_id || ""));
  const uniqueTemplates = [...new Set(usedTemplates)].filter(Boolean);
  const repeatedTemplates = uniqueTemplates
    .map((templateId) => ({
      template_id: templateId,
      count: usedTemplates.filter((id) => id === templateId).length,
    }))
    .filter((item) => item.count > 1);

  const studioCount = countStudioScenes(scenes);

  return {
    niche_pack: nichePack,
    aspect_ratio: aspectRatio,
    motion_count: scenes.length,
    studio_motion_count: studioCount,
    studio_target_min:
      aspectRatio === "9:16"
        ? REMOTION_TEMPLATE_LIMITS.shortMax
        : REMOTION_TEMPLATE_LIMITS.longTargetMin,
    studio_pack_enabled: Boolean(studioPackEnabled),
    studio_boosted_count: boostedCount,
    studio_transition_count: transitionCount,
    studio_background_count: backgroundCount,
    candidate_count: beforeLimitCount,
    geo_limited_count: afterGeoLimitCount,
    skipped_count: skippedEntries.length,
    selected_templates: uniqueTemplates,
    repeated_templates: repeatedTemplates,
    preferred_templates: preferredTemplates,
    operational_catalog: operationalCatalogForTemplates(
      uniqueTemplates.length ? uniqueTemplates : preferredTemplates
    ),
    scenes: reviewEntries,
    skipped: skippedEntries,
  };
}

export function buildPropsForTemplate(
  templateId,
  trigger,
  text,
  accentColor = "#D4AF37",
  aspectRatio = "16:9",
  niche = "",
  researchContext = null
) {
  const t = String(text || "").trim();

  switch (templateId) {
    case "counter": {
      const { value, suffix, label } = parseStatValue(t);
      return {
        value: value || 100,
        label,
        suffix,
        position: "center",
        theme: "minimal",
        accentColor,
      };
    }
    case "bar-chart":
      return {
        title: "COMPARAÇÃO",
        items: [
          { label: "A", value: 72 },
          { label: "B", value: 54 },
          { label: "C", value: 38 },
        ],
        position: "center",
        theme: "minimal",
        accentColor,
      };
    case "pictogram-chart":
      return {
        title: "DADOS",
        icon: "compass",
        source: "Fonte: narração",
        segments: [
          { label: "Principal", value: 45, color: accentColor },
          { label: "Secundário", value: 30, color: "#78909C" },
          { label: "Outros", value: 25, color: "#455A64" },
        ],
      };
    case "location-intro": {
      const place = resolvePlace(t, researchContext);
      const classified = classifyPlaceType(t, place);
      const place_type = classified.place_type;
      const zoomTo =
        place_type === "city" || place_type === "historic_site"
          ? LOCATION_INTRO_DEFAULTS.zoom_to_city
          : LOCATION_INTRO_DEFAULTS.zoom_to_poi;
      const presentation = resolvePresentationForScene({
        templateId: "location-intro",
        trigger: "location",
        text: t,
        aspectRatio,
        niche,
      });
      return {
        location: place.location,
        region: place.region,
        country: place.country,
        variant: LOCATION_INTRO_DEFAULTS.variant,
        map_provider: LOCATION_INTRO_DEFAULTS.map_provider,
        geo_generation: LOCATION_INTRO_DEFAULTS.geo_generation,
        accentColor: "#FFFFFF",
        place_type,
        structure_exists: classified.structure_exists !== false,
        fly_mode: LOCATION_INTRO_DEFAULTS.fly_mode,
        zoom_from: LOCATION_INTRO_DEFAULTS.zoom_from,
        zoom_to: zoomTo,
        map_style: LOCATION_INTRO_DEFAULTS.map_style,
        presentation,
        layout: presentation,
        aspect_ratio: aspectRatio,
        niche,
      };
    }
    case "geo-map": {
      const place = resolvePlace(t, researchContext);
      return {
        location: place.location,
        region: place.region || place.country,
        accentColor: "#00E5FF",
        position: "bottom-right",
      };
    }
    case "timeline": {
      const years = [...t.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
      const events =
        years.length >= 2
          ? years.slice(0, 4).map((y, i) => ({
              year: y,
              label:
                i === 0 ? "Início" : i === years.length - 1 ? "Atual" : "Marco",
            }))
          : [{ year: "—", label: t.slice(0, 40) }];
      return { title: "CRONOLOGIA", events, position: "bottom-center" };
    }
    case "lower-third": {
      const year = YEAR_RE.exec(t)?.[1] || "";
      return {
        title: year ? `Em ${year}` : "FATO HISTÓRICO",
        subtitle: t.slice(0, 80),
        variant: "glass",
        position: "bottom-left",
        theme: "ancient",
        accentColor,
      };
    }
    case "kinetic-text":
      return {
        text: t.split(/[.!?]/)[0].slice(0, 60).toUpperCase() || "REVELAÇÃO",
        position: "center",
        theme: "minimal",
        accentColor,
      };
    default:
      return { title: t.slice(0, 40), accentColor };
  }
}

export function backfillVisualPromptNarration(storyboard = {}, config = {}) {
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  if (!visualPrompts.length) return storyboard;

  const hasMissing = visualPrompts.some(
    (vp) =>
      !String(vp.narration_text || vp.asset?.narration_segment || "").trim()
  );
  if (!hasMissing) return storyboard;

  const blockPhraseMap = new Map();
  for (const bp of Array.isArray(config.block_phrases)
    ? config.block_phrases
    : []) {
    const phrase = String(bp?.phrase || "").trim();
    const block = Number(bp?.block);
    if (phrase && block > 0) blockPhraseMap.set(block, phrase);
  }

  const narrativeParagraphs = String(
    storyboard.narrative_script || storyboard.narration || ""
  )
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const filled = visualPrompts.map((vp, index) => {
    const existing = String(
      vp.narration_text || vp.asset?.narration_segment || ""
    ).trim();
    if (existing) return vp;

    const block = Number(vp.block) || 1;
    const fromBlock = blockPhraseMap.get(block);
    if (fromBlock) {
      return { ...vp, narration_text: fromBlock };
    }

    const para = narrativeParagraphs[block - 1] || narrativeParagraphs[0];
    if (para) {
      return { ...vp, narration_text: para };
    }

    const promptText = String(vp.prompt || "").trim();
    if (promptText.length >= 24) {
      return { ...vp, narration_text: promptText.slice(0, 220) };
    }

    return vp;
  });

  return { ...storyboard, visual_prompts: filled };
}

export function resolveNichePack(config = {}, storyboard = {}) {
  const fromConfig = String(config.motion_niche_pack || "").trim();
  if (fromConfig) return fromConfig;
  const niche = String(
    config.niche || storyboard?.strategy?.niche || ""
  ).trim();
  const alias = resolvePackByAlias(niche);
  if (alias) return alias;
  const cat = detectNicheCategory(niche);
  if (cat === "history") return "documentary-prestige";
  if (cat === "nature") return "geography-explorer";
  if (cat === "finance" || cat === "tech") return "data-journalist";
  if (cat === "industrial") return "industrial-impact";
  return "documentary-prestige";
}

function sceneStartHint(vp, blockTimings = {}) {
  if (Number.isFinite(Number(vp?.speech_start))) return Number(vp.speech_start);
  if (Number.isFinite(Number(vp?.asset?.audio_start)))
    return Number(vp.asset.audio_start);
  const block = Number(vp?.block) || 1;
  const starts = blockTimings.starts || [];
  const idx = Math.max(0, block - 1);
  return Number(starts[idx]) || 0;
}

const BOOST_TRIGGERS = [
  "curiosity_punch",
  "stat_number",
  "comparison",
  "timeline_date",
  "historical_fact",
];

function vpRefKey(vp = {}) {
  return String(vp.scene || `block-${vp.block || 0}` || "").trim();
}

function countStudioScenes(scenes = []) {
  return scenes.filter((s) => String(s.props?.template_studio_id || "").trim())
    .length;
}

function studioCategoriesFromScenes(scenes = []) {
  return scenes
    .map((s) => String(s.props?.template_studio_category || "").trim())
    .filter(Boolean);
}

function motionScenePriority(scene = {}) {
  const templateId = String(scene.template_id || "");
  const trigger = String(scene.trigger || "");
  let score = 10;
  if (templateId === "location-intro") score = 100;
  else if (templateId === "geo-map") score = 90;
  else if (trigger === "stat_number" || templateId === "counter") score = 80;
  else if (trigger === "comparison" || templateId === "bar-chart") score = 70;
  else if (templateId === "pictogram-chart") score = 65;
  else if (templateId === "timeline") score = 55;
  if (scene.props?.template_studio_id) score += 12;
  if (scene.props?.studio_role === "transition") score += 4;
  return score;
}

function resolveBoostTrigger(narration = "", index = 0, classified = null) {
  if (classified?.trigger && classified.confidence >= 0.45) {
    return classified.trigger;
  }
  if (STAT_RE.test(narration) && COMPARISON_RE.test(narration)) {
    return "comparison";
  }
  if (STAT_RE.test(narration)) return "stat_number";
  if (YEAR_RE.test(narration) || HISTORICAL_RE.test(narration)) {
    return "timeline_date";
  }
  return BOOST_TRIGGERS[index % BOOST_TRIGGERS.length];
}

export function boostStudioMotionScenesForLongForm({
  scenes = [],
  visualPrompts = [],
  consumedVpRefs = new Set(),
  config = {},
  blockTimings = {},
  researchContext = {},
  studioNiche = "",
  preferredStudioIds = [],
  accentColor = "#D4AF37",
  nichePack = "",
  preferredTemplates = [],
  aspectRatio = "16:9",
} = {}) {
  const targetMin = REMOTION_TEMPLATE_LIMITS.longTargetMin;
  if (String(aspectRatio) === "9:16") return scenes;
  if (!studioNiche || config.motion_template_pack?.enabled !== true) {
    return scenes;
  }

  let boosted = [...scenes];
  const usedDedupe = new Set(
    boosted.map(
      (s) => `${s.trigger}-${s.template_id}-${s.scene_ref || s.block}`
    )
  );
  let previousStudioIds = boosted
    .map((s) => String(s.props?.template_studio_id || "").trim())
    .filter(Boolean);
  let previousStudioCategories = studioCategoriesFromScenes(boosted);
  const previousTemplates = boosted.map((s) => String(s.template_id || ""));

  const candidates = (Array.isArray(visualPrompts) ? visualPrompts : [])
    .filter((vp) => {
      const narration = String(
        vp.narration_text || vp.asset?.narration_segment || ""
      ).trim();
      return narration.length >= 8 && !consumedVpRefs.has(vpRefKey(vp));
    })
    .sort(
      (a, b) =>
        sceneStartHint(a, blockTimings) - sceneStartHint(b, blockTimings)
    );

  let boostIndex = 0;
  while (
    countStudioScenes(boosted) < targetMin &&
    boostIndex < candidates.length
  ) {
    const vp = candidates[boostIndex];
    boostIndex += 1;
    const narration = String(
      vp.narration_text || vp.asset?.narration_segment || ""
    ).trim();
    const classified = classifyNarrationSegment(narration);
    let trigger = resolveBoostTrigger(
      narration,
      countStudioScenes(boosted),
      classified
    );
    if (trigger === "curiosity_punch") {
      trigger = STAT_RE.test(narration) ? "stat_number" : "stat_number";
    }

    const templateDecision = pickTemplateDecisionForTrigger(
      trigger,
      nichePack,
      preferredTemplates,
      { text: narration, previousTemplates }
    );
    const templateId = templateDecision.template_id;
    if (!APPROVED_ORCHESTRATION_TEMPLATES.has(templateId)) continue;

    const dedupeKey = `${trigger}-${templateId}-${vp.scene || vp.block}`;
    if (usedDedupe.has(dedupeKey)) continue;
    usedDedupe.add(dedupeKey);
    consumedVpRefs.add(vpRefKey(vp));

    const layout = resolveLayoutForTemplate(templateId, trigger, {
      text: narration,
      aspectRatio,
      niche: config.niche || nichePack,
    });
    const presentation = resolvePresentationForScene({
      templateId,
      trigger,
      text: narration,
      aspectRatio,
      niche: config.niche || nichePack,
    });
    const templateDefault = DEFAULT_DURATIONS[templateId] || 4;
    const vpDur = Number(vp.duration_seconds);
    const duration =
      templateId === "location-intro"
        ? Math.min(
            LOCATION_INTRO_DEFAULTS.duration_seconds_long_max,
            Math.max(LOCATION_INTRO_DEFAULTS.duration_seconds, vpDur || 8)
          )
        : vpDur > 0
          ? Math.min(vpDur, templateDefault)
          : templateDefault;

    let scene = {
      id: `ms-boost-${String(vp.scene || vp.block || boostIndex).replace(/\s/g, "")}`,
      scene_ref: String(vp.scene || ""),
      block: Number(vp.block) || 1,
      start_hint: sceneStartHint(vp, blockTimings),
      duration_seconds: duration,
      layout,
      template_id: templateId,
      trigger,
      confidence: classified?.confidence || 0.5,
      props: {
        ...buildPropsForTemplate(
          templateId,
          trigger,
          narration,
          accentColor,
          aspectRatio,
          config.niche || nichePack,
          researchContext
        ),
        presentation,
        layout,
        aspect_ratio: aspectRatio,
      },
      narration_text: narration,
      media_mode: "remotion",
      niche_pack: nichePack,
      source: "studio_boost",
      boosted: true,
    };

    const studioPick = pickStudioTemplateForTrigger({
      trigger,
      motionTemplateId: templateId,
      niche: studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene,
      researchContext,
      config,
    });
    if (!studioPick?.studio_source_code) continue;

    scene = attachStudioTemplateToScene(scene, studioPick);
    scene = enrichStudioTemplateScene(scene, {
      template: studioPick,
      researchContext,
      config,
    });
    scene = applyStudioRoleToScene(scene, studioPick);
    scene = applyGeoPipStudioPack(scene, studioNiche);
    previousStudioIds.push(studioPick.id);
    if (studioPick.category) previousStudioCategories.push(studioPick.category);
    previousTemplates.push(templateId);
    boosted.push(scene);
  }

  return boosted.sort(
    (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
  );
}

export function limitMotionScenesForFormat(scenes = [], aspectRatio = "16:9") {
  const approved = (Array.isArray(scenes) ? scenes : []).filter((scene) =>
    APPROVED_ORCHESTRATION_TEMPLATES.has(String(scene.template_id || ""))
  );
  const isShort = String(aspectRatio || "") === "9:16";
  const max = isShort
    ? REMOTION_TEMPLATE_LIMITS.shortMax
    : REMOTION_TEMPLATE_LIMITS.longMax;

  if (isShort && approved.length > 1) {
    const geoScenes = approved.filter((scene) => {
      const tpl = String(scene.template_id || "");
      return tpl === "location-intro" || tpl === "geo-map";
    });
    if (geoScenes.length) {
      return geoScenes
        .sort(
          (a, b) =>
            motionScenePriority(b) - motionScenePriority(a) ||
            (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
        )
        .slice(0, max);
    }
  }

  if (approved.length <= max) return approved;
  return approved
    .map((scene, index) => ({ scene, index }))
    .sort(
      (a, b) =>
        motionScenePriority(b.scene) - motionScenePriority(a.scene) ||
        (Number(a.scene.start_hint) || 0) - (Number(b.scene.start_hint) || 0) ||
        a.index - b.index
    )
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.scene);
}

/**
 * Gera motion_scenes[] a partir de visual_prompts do storyboard.
 */
export function planMotionScenesFromStoryboard(
  storyboard = {},
  config = {},
  blockTimings = {}
) {
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const nichePack = resolveNichePack(config, storyboard);
  const accentColor = String(config.accent_color || "#D4AF37");
  const aspectRatio = String(
    config.aspect_ratio || config.format || "16:9"
  ).trim();
  const researchContext = buildMotionResearchContext(storyboard, config);
  const preferredTemplates = resolvePreferredMotionTemplates(config);
  const studioPackEnabled = config.motion_template_pack?.enabled === true;
  const studioNiche = String(
    config.motion_template_pack?.niche || config.niche || ""
  ).trim();
  const preferredStudioIds = Array.isArray(
    config.motion_template_pack?.template_ids
  )
    ? config.motion_template_pack.template_ids.map((id) => String(id).trim())
    : [];
  const scenes = [];
  const reviewEntries = [];
  const skippedEntries = [];
  const usedTriggers = new Set();
  const previousTemplates = [];
  const previousStudioIds = [];
  const previousStudioCategories = [];
  const consumedVpRefs = new Set();

  for (const vp of visualPrompts) {
    const narration = String(
      vp.narration_text || vp.asset?.narration_segment || ""
    ).trim();
    if (!narration) continue;

    const classified = classifyNarrationSegment(narration);
    if (!classified || classified.confidence < 0.65) {
      const geoReview = explainGeoNarrationSegment(narration, KNOWN_PLACES);
      skippedEntries.push(
        buildTemplateReviewEntry({
          vp,
          narration,
          classification: classified,
          geoReview:
            geoReview.candidates?.length ||
            /mapa|google maps|maps|sat[eé]lite/i.test(narration)
              ? geoReview
              : null,
          skipped: true,
          reason: classified
            ? "confianca baixa para acionar template automatico"
            : "sem trigger de mapa, numero, comparacao ou cronologia",
        })
      );
      continue;
    }

    let trigger = classified.trigger;
    if (trigger === "curiosity_punch") {
      if (STAT_RE.test(narration)) {
        trigger = "stat_number";
      } else if (HISTORICAL_RE.test(narration) || YEAR_RE.test(narration)) {
        trigger = "historical_fact";
      } else {
        trigger = "stat_number";
      }
    }
    const templateDecision = pickTemplateDecisionForTrigger(
      trigger,
      nichePack,
      preferredTemplates,
      {
        text: narration,
        previousTemplates,
      }
    );
    const templateId = templateDecision.template_id;
    if (!APPROVED_ORCHESTRATION_TEMPLATES.has(templateId)) {
      skippedEntries.push(
        buildTemplateReviewEntry({
          vp,
          narration,
          classification: { ...classified, trigger },
          decision: templateDecision,
          skipped: true,
          reason: "template escolhido ainda nao aprovado",
        })
      );
      continue;
    }
    const layout = resolveLayoutForTemplate(templateId, trigger, {
      text: narration,
      aspectRatio,
      niche: config.niche || nichePack,
    });
    const presentation = resolvePresentationForScene({
      templateId,
      trigger,
      text: narration,
      aspectRatio,
      niche: config.niche || nichePack,
    });

    const dedupeKey = `${trigger}-${templateId}-${vp.scene || vp.block}`;
    if (usedTriggers.has(dedupeKey)) {
      skippedEntries.push(
        buildTemplateReviewEntry({
          vp,
          narration,
          classification: { ...classified, trigger },
          decision: templateDecision,
          skipped: true,
          reason: "template duplicado para a mesma cena/bloco",
        })
      );
      continue;
    }
    usedTriggers.add(dedupeKey);

    const templateDefault = DEFAULT_DURATIONS[templateId] || 4;
    const vpDur = Number(vp.duration_seconds);
    const duration =
      templateId === "location-intro"
        ? Math.min(
            aspectRatio === "9:16"
              ? LOCATION_INTRO_DEFAULTS.duration_seconds_short_max
              : LOCATION_INTRO_DEFAULTS.duration_seconds_long_max,
            Math.max(
              LOCATION_INTRO_DEFAULTS.duration_seconds,
              vpDur > 0 ? vpDur : LOCATION_INTRO_DEFAULTS.duration_seconds
            )
          )
        : vpDur > 0
          ? Math.min(vpDur, templateDefault)
          : templateDefault;

    const triggerMeta = MOTION_SCENE_TRIGGERS[trigger] || {};

    let scene = {
      id: `ms-${String(vp.scene || vp.block || scenes.length + 1).replace(/\s/g, "")}`,
      scene_ref: String(vp.scene || ""),
      block: Number(vp.block) || 1,
      start_hint: sceneStartHint(vp, blockTimings),
      duration_seconds: duration,
      layout,
      template_id: templateId,
      trigger,
      confidence: classified.confidence,
      geo_kind: trigger === "location" ? classified.geo_kind : undefined,
      geo_score: trigger === "location" ? classified.score : undefined,
      geo_reason: trigger === "location" ? classified.reason : undefined,
      props: {
        ...buildPropsForTemplate(
          templateId,
          trigger,
          narration,
          accentColor,
          aspectRatio,
          config.niche || nichePack,
          researchContext
        ),
        presentation,
        layout,
        aspect_ratio: aspectRatio,
      },
      narration_text: narration,
      media_mode: "remotion",
      niche_pack: nichePack,
      template_decision: {
        score: templateDecision.score,
        fallback: Boolean(templateDecision.fallback),
        reasons: templateDecision.reasons || [],
        warnings: templateDecision.warnings || [],
        candidates: templateDecision.candidates || [],
      },
      decision_reason:
        templateDecision.reasons?.[0] ||
        `template ${templateId} selecionado para ${trigger}`,
      rve_ref: triggerMeta.rveRef || null,
      remotion_ref: triggerMeta.remotionRef || null,
      pip:
        layout === "pip"
          ? { position: "bottom-right", background: "stock_or_satellite" }
          : null,
    };

    if (studioPackEnabled && studioNiche) {
      const studioPick = pickStudioTemplateForTrigger({
        trigger,
        motionTemplateId: templateId,
        niche: studioNiche,
        aspectRatio,
        preferredStudioIds,
        previousStudioIds,
        previousStudioCategories,
        scene,
        researchContext,
        config,
      });
      if (!studioPick?.studio_source_code) {
        skippedEntries.push(
          buildTemplateReviewEntry({
            vp,
            narration,
            classification: { ...classified, trigger },
            decision: templateDecision,
            skipped: true,
            reason:
              "nenhum template Studio aprovado com sourceCode Remotion valido",
          })
        );
        continue;
      }
      scene = attachStudioTemplateToScene(scene, studioPick);
      scene = enrichStudioTemplateScene(scene, {
        template: studioPick,
        researchContext,
        config,
      });
      scene = applyStudioRoleToScene(scene, studioPick);
      scene = applyGeoPipStudioPack(scene, studioNiche);
      previousStudioIds.push(studioPick.id);
      if (studioPick.category) {
        previousStudioCategories.push(studioPick.category);
      }
    } else {
      scene = applyGeoPipStudioPack(scene, studioNiche);
    }

    scenes.push(scene);
    consumedVpRefs.add(vpRefKey(vp));
    previousTemplates.push(templateId);
    reviewEntries.push(
      buildTemplateReviewEntry({
        vp,
        narration,
        classification: { ...classified, trigger },
        decision: templateDecision,
        geoReview:
          trigger === "location"
            ? {
                eligible: true,
                score: classified.score,
                confidence: classified.confidence,
                geo_kind: classified.geo_kind,
                place: classified.place,
                reason: classified.reason,
                reasons: classified.reasons || [],
                warnings: classified.warnings || [],
                matched_pattern: classified.matched_pattern,
              }
            : null,
        scene,
      })
    );
  }

  let plannedScenes = scenes;
  let boostedCount = 0;
  let transitionCount = 0;
  let backgroundCount = 0;
  if (studioPackEnabled && studioNiche) {
    plannedScenes = boostStudioMotionScenesForLongForm({
      scenes,
      visualPrompts,
      consumedVpRefs,
      config,
      blockTimings,
      researchContext,
      studioNiche,
      preferredStudioIds,
      accentColor,
      nichePack,
      preferredTemplates,
      aspectRatio,
    });
    boostedCount = Math.max(0, plannedScenes.length - scenes.length);

    const roleInjected = injectStudioRoleScenes({
      scenes: plannedScenes,
      visualPrompts,
      blockTimings,
      config,
      studioNiche,
      aspectRatio,
      accentColor,
      nichePack,
      researchContext,
      preferredStudioIds,
      pickStudioTemplateByCategory,
    });
    plannedScenes = roleInjected.scenes;
    transitionCount = roleInjected.transitions?.length || 0;
    backgroundCount = roleInjected.backgrounds?.length || 0;
  }

  const geoCapped = limitGeoMotionScenes(plannedScenes, aspectRatio);
  const limitedScenes = limitMotionScenesForFormat(geoCapped, aspectRatio);
  const enrichedScenes = enrichMotionScenesWithResearch(
    limitedScenes,
    researchContext
  );

  return {
    motion_scenes: enrichedScenes,
    niche_pack: nichePack,
    motion_scenes_review: buildMotionPlanReview({
      scenes: enrichedScenes,
      reviewEntries,
      skippedEntries,
      nichePack,
      preferredTemplates,
      aspectRatio,
      beforeLimitCount: plannedScenes.length,
      afterGeoLimitCount: geoCapped.length,
      studioPackEnabled,
      boostedCount,
      transitionCount,
      backgroundCount,
    }),
    research_backed: Boolean(
      researchContext.globalFacts?.length ||
      researchContext.globalSources?.length
    ),
    planned_at: new Date().toISOString(),
    planner_version: 1,
    source: "heuristic",
  };
}

export function clipsTimeOverlap(a, b, epsilon = 0.35) {
  const aStart = Number(a?.start) || 0;
  const aEnd = aStart + (Number(a?.duration) || 0);
  const bStart = Number(b?.start) || 0;
  const bEnd = bStart + (Number(b?.duration) || 0);
  return aStart < bEnd - epsilon && bStart < aEnd - epsilon;
}

export function isPrimaryRemotionMotionScene(ms = {}) {
  if (ms.media_mode !== "remotion") return false;
  const layout = String(ms.layout || "").trim();
  if (layout === "fullscreen") return true;
  return FULLSCREEN_TEMPLATES.has(String(ms.template_id || ""));
}

/** Todas as motion scenes vão para a trilha dedicada — não competem com B-roll. */
export function motionScenesToMotionClips(motionScenes = []) {
  return (Array.isArray(motionScenes) ? motionScenes : [])
    .filter(
      (ms) => ms.media_mode === "remotion" && isRunnableStudioMotionScene(ms)
    )
    .map((ms, i) => ({
      id: String(ms.id || `motion-${i + 1}`),
      trackId: MOTION_TRACK_ID,
      start: Math.max(0, Number(ms.start_hint) || 0),
      duration: Math.max(0.5, Number(ms.duration_seconds) || 4),
      label: String(
        ms.props?.location ||
          ms.props?.label ||
          ms.props?.text ||
          ms.props?.title ||
          ms.template_id
      ),
      templateId: ms.template_id,
      props: {
        ...(ms.props || {}),
        template_studio_id: ms.props?.template_studio_id,
        template_studio_name: ms.props?.template_studio_name,
        template_studio_category: ms.props?.template_studio_category,
        template_studio_subcategory: ms.props?.template_studio_subcategory,
        template_studio_motion_template_id:
          ms.props?.template_studio_motion_template_id,
        studio_source_code: ms.props?.studio_source_code,
        media_mode: "remotion",
        motion_scene: true,
        narration_text: String(ms.narration_text || ""),
        scene_ref: String(ms.scene_ref || ""),
        block: Number(ms.block) || 1,
        layout:
          ms.template_id === "location-intro" || ms.template_id === "geo-map"
            ? "fullscreen"
            : FULLSCREEN_TEMPLATES.has(String(ms.template_id || ""))
              ? "fullscreen"
              : ms.layout ||
                resolveLayoutForTemplate(ms.template_id, ms.trigger),
        presentation:
          ms.template_id === "location-intro" || ms.template_id === "geo-map"
            ? "fullscreen"
            : FULLSCREEN_TEMPLATES.has(String(ms.template_id || ""))
              ? "fullscreen"
              : ms.props?.presentation,
        motion_quality_ok: ms.quality?.ok !== false,
        motion_quality_score: Number(ms.quality?.score) || 100,
        trigger: ms.trigger,
        overlayType: ms.template_id,
      },
      color: "#6A1B9A",
      motionScene: true,
      motionScenePrimary: isPrimaryRemotionMotionScene(ms),
    }));
}

/** @deprecated use motionScenesToMotionClips */
export function motionScenesToVideoClips(motionScenes = []) {
  return motionScenesToMotionClips(motionScenes);
}

export function motionScenesToOverlayClips() {
  return [];
}

export function ensureMotionTrack(studio = {}) {
  const tracks = Array.isArray(studio.tracks) ? [...studio.tracks] : [];
  if (!tracks.some((t) => t.id === MOTION_TRACK_ID)) {
    const videoIdx = tracks.findIndex((t) => t.id === "video");
    const insertAt = videoIdx >= 0 ? videoIdx + 1 : tracks.length;
    tracks.splice(insertAt, 0, defaultMotionTrack());
  }
  return { ...studio, tracks };
}

function normalizeMotionClipProps(clip = {}) {
  const props = { ...(clip.props || {}) };
  const tpl = String(clip.templateId || "");
  if (tpl === "location-intro" || tpl === "geo-map") {
    props.presentation = "fullscreen";
    props.layout = "fullscreen";
  }
  return props;
}

/** Move clips Remotion legados da trilha video → motion. */
export function migrateStudioMotionClipsFromVideo(studio = {}) {
  const clips = (Array.isArray(studio.clips) ? studio.clips : []).map((c) => {
    const isLegacyMotionOnVideo =
      c.trackId === "video" &&
      (c.motionScene ||
        c.motionScenePrimary ||
        c.props?.media_mode === "remotion" ||
        c.props?.motion_scene);
    if (isLegacyMotionOnVideo) {
      return {
        ...c,
        trackId: MOTION_TRACK_ID,
        props: normalizeMotionClipProps(c),
      };
    }
    if (c.trackId === MOTION_TRACK_ID) {
      return { ...c, props: normalizeMotionClipProps(c) };
    }
    return c;
  });
  return ensureMotionTrack({ ...studio, clips });
}

export function applyMotionScenesToVisualPrompts(
  storyboard = {},
  motionScenes = []
) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const bySceneRef = new Map(
    scenes
      .filter((ms) => isPrimaryRemotionMotionScene(ms) && ms.scene_ref)
      .map((ms) => [String(ms.scene_ref), ms])
  );
  if (!bySceneRef.size) return storyboard;

  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts.map((vp) => {
        const ref = String(vp.scene || vp.scene_ref || "").trim();
        const ms = ref ? bySceneRef.get(ref) : null;
        if (!ms) return vp;
        return {
          ...vp,
          media_mode: "remotion",
          motion_scene_id: ms.id,
          motion_template_id: ms.template_id,
        };
      })
    : [];

  return { ...storyboard, visual_prompts: visualPrompts };
}

/** Remove bloqueios de cenas que voltam no plano (ex.: usuário clicou «Cenas Remotion»). */
export function unsuppressMotionSceneIds(studio, motionScenes = []) {
  if (!studio || !Array.isArray(studio.suppressedMotionSceneIds)) return studio;
  const revive = new Set(
    (Array.isArray(motionScenes) ? motionScenes : [])
      .map((ms) => String(ms?.id || "").trim())
      .filter(Boolean)
  );
  if (!revive.size) return studio;
  const next = studio.suppressedMotionSceneIds.filter(
    (id) => !revive.has(String(id || "").trim())
  );
  if (next.length === studio.suppressedMotionSceneIds.length) return studio;
  return { ...studio, suppressedMotionSceneIds: next };
}

export function syncMotionScenesToStudio(studio, motionScenes = []) {
  if (!studio || !Array.isArray(studio.clips)) return studio;

  const suppression = collectSuppressionState(studio);
  const cleanStudio = {
    ...studio,
    clips: studio.clips.filter((c) => {
      const isMotion =
        c.trackId === MOTION_TRACK_ID ||
        c.motionScene ||
        c.motionScenePrimary ||
        c.props?.media_mode === "remotion" ||
        c.props?.motion_scene;
      return !isMotion || !clipMatchesSuppression(c, suppression);
    }),
  };
  const activeMotionScenes = (
    Array.isArray(motionScenes) ? motionScenes : []
  ).filter(
    (ms) =>
      !storyboardRowMatchesSuppression(ms, "motion", suppression) &&
      isRunnableStudioMotionScene(ms)
  );
  const existingMotionById = new Map();
  for (const clip of cleanStudio.clips) {
    if (
      clip.motionScene ||
      clip.props?.motion_scene ||
      clip.trackId === MOTION_TRACK_ID
    ) {
      existingMotionById.set(String(clip.id), clip);
    }
  }

  const motionClips = motionScenesToMotionClips(activeMotionScenes).map(
    (planned) => {
      const existing = existingMotionById.get(String(planned.id));
      if (!existing) return planned;
      return mergeMotionClipPreservingUserEdits(existing, planned);
    }
  );
  if (!motionClips.length)
    return migrateStudioMotionClipsFromVideo(cleanStudio);

  const withoutMotion = cleanStudio.clips.filter(
    (c) =>
      c.trackId !== MOTION_TRACK_ID &&
      !c.motionScene &&
      !c.motionScenePrimary &&
      !c.props?.motion_scene
  );

  const merged = [...withoutMotion, ...motionClips].sort(
    (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
  );
  return migrateStudioMotionClipsFromVideo({
    ...cleanStudio,
    clips: merged,
    updatedAt: new Date().toISOString(),
  });
}
