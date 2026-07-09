/**
 * Injeta cenas Studio por papel visual: transição entre blocos e background em capítulos técnicos.
 */

import { DEFAULT_DURATIONS } from "./motionSceneCatalog.js";
import { enrichStudioTemplateScene } from "./studioTemplatePropsBinder.js";
import { applyStudioRoleToScene } from "./studioTemplateRoles.js";

const TECHNICAL_RE =
  /\b(engenharia|estrutura|concreto|a[cç]o|mpa|kpa|tonelada|funda[cç][aã]o|ponte|viaduto|t[uú]nel|duto|calculo|c[aá]lculo|projeto|norma|abnt|iso|resist[eê]ncia|carga|tens[aã]o|deforma[cç][aã]o)\b/i;
const STAT_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|mpa|kpa|km|m\b|ton|anos?)/i;

function sceneStartHint(vp, blockTimings = {}) {
  if (Number.isFinite(Number(vp?.speech_start))) return Number(vp.speech_start);
  if (Number.isFinite(Number(vp?.asset?.audio_start)))
    return Number(vp.asset.audio_start);
  const block = Number(vp?.block) || 1;
  const starts = blockTimings.starts || [];
  const idx = Math.max(0, block - 1);
  return Number(starts[idx]) || 0;
}

function blockNarrationExcerpt(visualPrompts = [], block = 1) {
  const lines = visualPrompts
    .filter((vp) => Number(vp.block) === block)
    .map((vp) =>
      String(vp.narration_text || vp.asset?.narration_segment || "").trim()
    )
    .filter(Boolean);
  return lines.join(" ").slice(0, 220);
}

function isTechnicalBlock(narration = "", config = {}) {
  const niche = String(config.niche || "").toLowerCase();
  if (/engenharia|engineering|industrial|tech/.test(niche)) return true;
  return TECHNICAL_RE.test(narration) || STAT_RE.test(narration);
}

function buildRoleScene({
  id,
  role,
  block,
  startHint,
  narration,
  templateId,
  studioPick,
  aspectRatio,
  accentColor,
  nichePack,
  researchContext,
  config,
  source,
}) {
  const duration =
    role === "transition"
      ? Math.min(Math.max(2, Number(studioPick?.duration_seconds) || 3), 4)
      : Math.max(6, Number(DEFAULT_DURATIONS[templateId]) || 8);

  let scene = {
    id,
    scene_ref: `block-${block}`,
    block,
    start_hint: startHint,
    duration_seconds: duration,
    layout: "fullscreen",
    template_id: templateId,
    trigger: role === "transition" ? "curiosity_punch" : "stat_number",
    confidence: 0.55,
    props: {
      aspect_ratio: aspectRatio,
      presentation: "fullscreen",
      layout: "fullscreen",
      accentColor,
      text: narration.slice(0, 60).toUpperCase() || "CAPÍTULO",
      subtitle: narration.slice(0, 80),
    },
    narration_text: narration,
    media_mode: "remotion",
    niche_pack: nichePack,
    source,
    studio_role_injected: role,
  };

  scene = {
    ...scene,
    props: {
      ...(scene.props || {}),
      template_studio_id: studioPick.id,
      template_studio_name: studioPick.name,
      template_studio_category: studioPick.category,
      template_studio_subcategory: studioPick.subcategory,
      template_studio_motion_template_id: studioPick.motion_template_id,
      template_studio_data_slots: Array.isArray(studioPick.dataSlots)
        ? studioPick.dataSlots
        : [],
      studio_source_code: studioPick.studio_source_code,
    },
    studio_template_decision: {
      score: studioPick.studio_pick_score,
      reasons: studioPick.studio_pick_reasons || [],
      candidates: studioPick.candidates || [],
    },
  };

  scene = enrichStudioTemplateScene(scene, {
    template: studioPick,
    researchContext,
    config,
  });
  scene = applyStudioRoleToScene(scene, studioPick);
  return scene;
}

/**
 * Insere transições Studio nas junções entre blocos do roteiro (16:9).
 */
export function injectStudioTransitionScenes({
  scenes = [],
  visualPrompts = [],
  blockTimings = {},
  config = {},
  studioNiche = "",
  aspectRatio = "16:9",
  accentColor = "#D4AF37",
  nichePack = "",
  researchContext = {},
  preferredStudioIds = [],
  pickStudioTemplateByCategory,
} = {}) {
  if (String(aspectRatio) === "9:16") return { scenes, injected: [] };
  if (!studioNiche || config.motion_template_pack?.enabled !== true) {
    return { scenes, injected: [] };
  }
  if (typeof pickStudioTemplateByCategory !== "function") {
    return { scenes, injected: [] };
  }

  const blocks = [
    ...new Set(
      (Array.isArray(visualPrompts) ? visualPrompts : [])
        .map((vp) => Number(vp.block) || 0)
        .filter((b) => b > 1)
    ),
  ].sort((a, b) => a - b);

  const existingTransitions = new Set(
    scenes
      .filter((s) => s.props?.studio_role === "transition")
      .map((s) => Number(s.block))
  );

  const previousStudioIds = scenes
    .map((s) => String(s.props?.template_studio_id || "").trim())
    .filter(Boolean);
  const previousStudioCategories = scenes
    .map((s) => String(s.props?.template_studio_category || "").trim())
    .filter(Boolean);

  const injected = [];
  let result = [...scenes];

  for (const block of blocks) {
    if (existingTransitions.has(block)) continue;

    const narration = blockNarrationExcerpt(visualPrompts, block);
    const startHint = sceneStartHint(
      visualPrompts.find((vp) => Number(vp.block) === block),
      blockTimings
    );

    const studioPick = pickStudioTemplateByCategory({
      category: "transition",
      motionTemplateId: "counter",
      niche: studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: { narration_text: narration, block },
      researchContext,
      config,
    });
    if (!studioPick?.studio_source_code) continue;

    const scene = buildRoleScene({
      id: `ms-transition-${block}`,
      role: "transition",
      block,
      startHint: Math.max(0, startHint - 0.5),
      narration,
      templateId: studioPick.motion_template_id || "counter",
      studioPick,
      aspectRatio,
      accentColor,
      nichePack,
      researchContext,
      config,
      source: "studio_transition",
    });

    previousStudioIds.push(studioPick.id);
    if (studioPick.category) previousStudioCategories.push(studioPick.category);
    injected.push(scene);
    result.push(scene);
  }

  result.sort(
    (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
  );
  return { scenes: result, injected };
}

/**
 * Insere background frames Studio no início de capítulos técnicos (16:9).
 */
export function injectStudioBackgroundFrames({
  scenes = [],
  visualPrompts = [],
  blockTimings = {},
  config = {},
  studioNiche = "",
  aspectRatio = "16:9",
  accentColor = "#D4AF37",
  nichePack = "",
  researchContext = {},
  preferredStudioIds = [],
  pickStudioTemplateByCategory,
} = {}) {
  if (String(aspectRatio) === "9:16") return { scenes, injected: [] };
  if (!studioNiche || config.motion_template_pack?.enabled !== true) {
    return { scenes, injected: [] };
  }
  if (typeof pickStudioTemplateByCategory !== "function") {
    return { scenes, injected: [] };
  }

  const blocks = [
    ...new Set(
      (Array.isArray(visualPrompts) ? visualPrompts : [])
        .map((vp) => Number(vp.block) || 0)
        .filter((b) => b > 0)
    ),
  ].sort((a, b) => a - b);

  const existingBackgrounds = new Set(
    scenes
      .filter((s) => s.props?.studio_role === "background_frame")
      .map((s) => Number(s.block))
  );

  const previousStudioIds = scenes
    .map((s) => String(s.props?.template_studio_id || "").trim())
    .filter(Boolean);
  const previousStudioCategories = scenes
    .map((s) => String(s.props?.template_studio_category || "").trim())
    .filter(Boolean);

  const injected = [];
  let result = [...scenes];

  for (const block of blocks) {
    if (existingBackgrounds.has(block)) continue;

    const narration = blockNarrationExcerpt(visualPrompts, block);
    if (!isTechnicalBlock(narration, config)) continue;

    const startHint = sceneStartHint(
      visualPrompts.find((vp) => Number(vp.block) === block),
      blockTimings
    );

    const studioPick = pickStudioTemplateByCategory({
      category: "background",
      motionTemplateId: "counter",
      niche: studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: { narration_text: narration, block },
      researchContext,
      config,
    });
    if (!studioPick?.studio_source_code) continue;

    const scene = buildRoleScene({
      id: `ms-background-${block}`,
      role: "background_frame",
      block,
      startHint,
      narration,
      templateId: studioPick.motion_template_id || "counter",
      studioPick,
      aspectRatio,
      accentColor,
      nichePack,
      researchContext,
      config,
      source: "studio_background",
    });

    previousStudioIds.push(studioPick.id);
    if (studioPick.category) previousStudioCategories.push(studioPick.category);
    injected.push(scene);
    result.push(scene);
  }

  result.sort(
    (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
  );
  return { scenes: result, injected };
}

export function injectStudioRoleScenes(options = {}) {
  const transitionResult = injectStudioTransitionScenes(options);
  const backgroundResult = injectStudioBackgroundFrames({
    ...options,
    scenes: transitionResult.scenes,
    preferredStudioIds: options.preferredStudioIds,
    pickStudioTemplateByCategory: options.pickStudioTemplateByCategory,
  });
  return {
    scenes: backgroundResult.scenes,
    transitions: transitionResult.injected,
    backgrounds: backgroundResult.injected,
  };
}
