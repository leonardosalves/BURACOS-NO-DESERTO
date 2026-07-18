/**
 * Aplica render_template_policy: intro, end card, chapter, subscribe mid,
 * effects, frame, transitions filter, overlay budget.
 */

import {
  enforceOverlayBudget,
  resolveRenderTemplatePolicy,
} from "./renderTemplatePolicy.js";
import {
  applyStudioRoleToScene,
  catalogCategoryForRole,
  resolveStudioRole,
} from "./studioTemplateRoles.js";
import { enrichStudioTemplateScene } from "./studioTemplatePropsBinder.js";
import { applyExclusiveIntroEndToMotionScenes } from "./exclusiveIntroEndLayout.js";
import { applySuppressTemplateCornersToScenes } from "./studioTemplateCorners.js";

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
  const lines = (Array.isArray(visualPrompts) ? visualPrompts : [])
    .filter((vp) => Number(vp.block) === block)
    .map((vp) =>
      String(vp.narration_text || vp.asset?.narration_segment || "").trim()
    )
    .filter(Boolean);
  return lines.join(" ").slice(0, 220);
}

function totalDurationFromTimings(blockTimings = {}, visualPrompts = []) {
  const ends = blockTimings.ends || blockTimings.starts || [];
  if (ends.length) {
    const last = Number(ends[ends.length - 1]) || 0;
    if (last > 0) return last;
  }
  let max = 0;
  for (const vp of visualPrompts || []) {
    const start = Number(vp.speech_start || vp.asset?.audio_start) || 0;
    const dur = Number(vp.duration_seconds) || 4;
    max = Math.max(max, start + dur);
  }
  return max || 60;
}

function buildPolicyScene({
  id,
  role,
  block,
  startHint,
  duration,
  narration,
  studioPick,
  aspectRatio,
  accentColor,
  nichePack,
  researchContext,
  config,
  source,
  extraProps = {},
}) {
  let scene = {
    id,
    scene_ref: `block-${block}`,
    block,
    start_hint: Math.max(0, startHint),
    duration_seconds: duration,
    layout: "fullscreen",
    template_id: studioPick.motion_template_id || "studio-runtime",
    trigger: role,
    confidence: 0.9,
    props: {
      aspect_ratio: aspectRatio,
      presentation: "fullscreen",
      layout: "fullscreen",
      accentColor,
      text: narration.slice(0, 60).toUpperCase() || role.toUpperCase(),
      subtitle: narration.slice(0, 80),
      title: narration.slice(0, 60),
      ...extraProps,
    },
    narration_text: narration,
    media_mode: "remotion",
    niche_pack: nichePack,
    source,
    policy_injected: role,
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

function pickForRole({
  role,
  pickStudioTemplateByCategory,
  studioNiche,
  aspectRatio,
  preferredStudioIds,
  previousStudioIds,
  previousStudioCategories,
  scene,
  researchContext,
  config,
  templateId,
}) {
  if (typeof pickStudioTemplateByCategory !== "function") return null;
  if (templateId && templateId !== "auto") {
    // Prefer explicit id via category pick + filter later — category API
    const cat = catalogCategoryForRole(role);
    const pick = pickStudioTemplateByCategory({
      category: cat,
      role,
      niche: studioNiche,
      aspectRatio,
      preferredStudioIds: [templateId, ...preferredStudioIds],
      previousStudioIds,
      previousStudioCategories,
      scene,
      researchContext,
      config,
      motionTemplateId: "studio-runtime",
    });
    if (pick && pick.id === templateId) return pick;
    if (pick) return pick;
  }
  return pickStudioTemplateByCategory({
    category: catalogCategoryForRole(role),
    role,
    niche: studioNiche,
    aspectRatio,
    preferredStudioIds,
    previousStudioIds,
    previousStudioCategories,
    scene,
    researchContext,
    config,
    motionTemplateId: "studio-runtime",
  });
}

function resolveChapterTitles({
  visualPrompts = [],
  blockTimings = {},
  config = {},
  visualOrchestration = null,
}) {
  const fromNarrador = Array.isArray(visualOrchestration?.chapters)
    ? visualOrchestration.chapters
    : [];
  if (fromNarrador.length) {
    return fromNarrador.map((c) => ({
      block: Number(c.block) || 1,
      title: String(c.title || "").trim(),
      start_hint: Number(c.start_hint_sec) || 0,
    }));
  }

  const blocks = [
    ...new Set(
      (visualPrompts || [])
        .map((vp) => Number(vp.block) || 0)
        .filter((b) => b > 0)
    ),
  ].sort((a, b) => a - b);

  const chaptersText = String(
    config.upload_metadata?.youtube?.chapters || config.youtube_chapters || ""
  ).trim();

  return blocks.map((block) => {
    const narration = blockNarrationExcerpt(visualPrompts, block);
    let title =
      narration.split(/[.!?]/)[0]?.slice(0, 48).trim() || `Capítulo ${block}`;
    if (chaptersText) {
      const lines = chaptersText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const line = lines[block - 1] || "";
      const m = line.match(/^\d{1,2}:\d{2}(?::\d{2})?\s+(.+)$/);
      if (m) title = m[1].trim();
    }
    return {
      block,
      title,
      start_hint: sceneStartHint(
        (visualPrompts || []).find((vp) => Number(vp.block) === block),
        blockTimings
      ),
    };
  });
}

/**
 * @returns {{ scenes, injected: { intro, end_card, chapters, subscribe_mid, effects, frame }, policy }}
 */
export function applyRenderTemplatePolicyToScenes({
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
  visualOrchestration = null,
  totalDurationSec = 0,
} = {}) {
  const policy = resolveRenderTemplatePolicy(config, aspectRatio);
  const injected = {
    intro: null,
    end_card: null,
    chapters: [],
    subscribe_mid: null,
    effects: [],
    frame: null,
  };

  if (policy.mode === "legacy" || !studioNiche) {
    return { scenes: [...scenes], injected, policy };
  }

  let result = [...scenes];
  const previousStudioIds = result
    .map((s) => String(s.props?.template_studio_id || "").trim())
    .filter(Boolean);
  const previousStudioCategories = result
    .map((s) => String(s.props?.template_studio_category || "").trim())
    .filter(Boolean);

  // Filter transitions if disabled
  if (!policy.transitions.enabled) {
    result = result.filter(
      (s) => String(s.props?.studio_role || "") !== "transition"
    );
  }

  // Filter media_layouts if disabled
  if (!policy.media_layouts.enabled) {
    result = result.filter(
      (s) => String(s.props?.studio_role || "") !== "media_layout"
    );
  }

  // Filter scene effects if disabled (planner may have added)
  if (!policy.effects.enabled) {
    result = result.filter(
      (s) => String(s.props?.studio_role || "") !== "scene_effect"
    );
  }

  const duration =
    totalDurationSec > 0
      ? totalDurationSec
      : totalDurationFromTimings(blockTimings, visualPrompts);

  // Intro
  if (policy.intro.enabled) {
    const studioPick = pickForRole({
      role: "intro",
      pickStudioTemplateByCategory,
      studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: {
        narration_text: blockNarrationExcerpt(visualPrompts, 1),
        block: 1,
      },
      researchContext,
      config,
      templateId: policy.intro.template_id,
    });
    if (studioPick?.studio_source_code) {
      const scene = buildPolicyScene({
        id: "ms-policy-intro",
        role: "intro",
        block: 1,
        startHint: 0,
        duration: 3.5,
        narration: blockNarrationExcerpt(visualPrompts, 1),
        studioPick,
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_intro",
        extraProps: {
          exclusive_segment: true,
          mute_all_audio: true,
        },
      });
      result = result.filter((s) => s.id !== "ms-policy-intro");
      result.unshift(scene);
      injected.intro = scene;
      previousStudioIds.push(studioPick.id);
    }
  }

  // Chapter titles between blocks
  if (policy.chapter_title.enabled && String(aspectRatio) !== "9:16") {
    const chapters = resolveChapterTitles({
      visualPrompts,
      blockTimings,
      config,
      visualOrchestration,
    }).filter((c) => c.block > 1);

    for (const ch of chapters) {
      const studioPick = pickForRole({
        role: "chapter_title",
        pickStudioTemplateByCategory,
        studioNiche,
        aspectRatio,
        preferredStudioIds,
        previousStudioIds,
        previousStudioCategories,
        scene: { narration_text: ch.title, block: ch.block },
        researchContext,
        config,
        templateId: policy.chapter_title.template_id,
      });
      if (!studioPick?.studio_source_code) continue;
      const scene = buildPolicyScene({
        id: `ms-policy-chapter-${ch.block}`,
        role: "chapter_title",
        block: ch.block,
        startHint: Math.max(0, ch.start_hint - 0.3),
        duration: 2.8,
        narration: ch.title,
        studioPick,
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_chapter",
        extraProps: {
          title: ch.title,
          text: ch.title,
          chapter: ch.block,
          label: `CAPÍTULO ${ch.block}`,
        },
      });
      result = result.filter((s) => s.id !== scene.id);
      result.push(scene);
      injected.chapters.push(scene);
      previousStudioIds.push(studioPick.id);
    }
  }

  // Subscribe mid (shorts)
  if (
    policy.subscribe_mid.enabled &&
    (String(aspectRatio) === "9:16" || policy.subscribe_mid.position)
  ) {
    const studioPick = pickForRole({
      role: "subscribe_mid",
      pickStudioTemplateByCategory,
      studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: {
        narration_text: "Inscreva-se no canal",
        block: 1,
      },
      researchContext,
      config,
      templateId: "auto",
    });
    if (studioPick?.studio_source_code) {
      const pct =
        policy.subscribe_mid.position === "percent"
          ? policy.subscribe_mid.percent
          : 0.5;
      const startHint = Math.max(0, duration * pct - 2);
      const scene = buildPolicyScene({
        id: "ms-policy-subscribe-mid",
        role: "subscribe_mid",
        block: 1,
        startHint,
        duration: 4,
        narration: "Inscreva-se no canal",
        studioPick,
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_subscribe_mid",
        extraProps: {
          title: "INSCREVA-SE",
          text: "INSCREVA-SE",
          subtitle: "Ative o sininho",
        },
      });
      result = result.filter((s) => s.id !== scene.id);
      result.push(scene);
      injected.subscribe_mid = scene;
      previousStudioIds.push(studioPick.id);
    }
  }

  // End card
  if (policy.end_card.enabled) {
    const studioPick = pickForRole({
      role: "end_card",
      pickStudioTemplateByCategory,
      studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: {
        narration_text: String(config.video_title || config.project_name || ""),
        block: 999,
      },
      researchContext,
      config,
      templateId: policy.end_card.template_id,
    });
    if (studioPick?.studio_source_code) {
      const endDur = 5;
      // Placeholder — finalizeExclusive reposiciona APÓS o conteúdo (não por cima)
      const scene = buildPolicyScene({
        id: "ms-policy-end-card",
        role: "end_card",
        block: 999,
        startHint: Math.max(0, duration),
        duration: endDur,
        narration: String(config.video_title || "Obrigado"),
        studioPick,
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_end_card",
        extraProps: {
          title: String(config.video_title || config.project_name || "FIM"),
          text: "INSCREVA-SE",
          replace_brand_outro: true,
          exclusive_segment: true,
          music_only: true,
        },
      });
      result = result.filter((s) => s.id !== scene.id);
      result.push(scene);
      injected.end_card = scene;
      previousStudioIds.push(studioPick.id);
    }
  }

  // Identity frame (full duration)
  if (policy.frame.enabled) {
    const studioPick = pickForRole({
      role: "identity_frame",
      pickStudioTemplateByCategory,
      studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: { narration_text: "", block: 1 },
      researchContext,
      config,
      templateId: policy.frame.template_id,
    });
    if (studioPick?.studio_source_code) {
      const scene = buildPolicyScene({
        id: "ms-policy-frame",
        role: "identity_frame",
        block: 1,
        startHint: 0,
        duration: Math.max(duration, 10),
        narration: String(config.niche || ""),
        studioPick,
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_frame",
      });
      result = result.filter((s) => s.id !== scene.id);
      result.unshift(scene);
      injected.frame = scene;
      previousStudioIds.push(studioPick.id);
    }
  }

  // Efeitos cinematográficos Remotion (catálogo): 1 por bloco (até 6) quando On
  if (policy.effects.enabled && policy.effects.selection !== "off") {
    const blocks = [
      ...new Set(
        (visualPrompts || [])
          .map((vp) => Number(vp.block) || 0)
          .filter((b) => b > 0)
      ),
    ]
      .sort((a, b) => a - b)
      .slice(0, 6);

    const targets = blocks.length > 0 ? blocks : [1];

    for (let i = 0; i < targets.length; i += 1) {
      const block = targets[i];
      const narration = blockNarrationExcerpt(visualPrompts, block);
      const startHint = sceneStartHint(
        (visualPrompts || []).find((vp) => Number(vp.block) === block) || {
          block,
        },
        blockTimings
      );
      // Efeito cobre a duração INTEIRA do asset/cena (não some no meio)
      const sceneDur = Math.max(
        3,
        Number(
          (visualPrompts || []).find((vp) => Number(vp.block) === block)
            ?.duration_seconds
        ) || 6
      );
      const effectDur = sceneDur;

      const studioPick = pickForRole({
        role: "scene_effect",
        pickStudioTemplateByCategory,
        studioNiche,
        aspectRatio,
        preferredStudioIds,
        previousStudioIds,
        previousStudioCategories,
        scene: { narration_text: narration, block },
        researchContext,
        config,
        templateId:
          policy.effects.selection === "manual"
            ? policy.effects.template_id || "auto"
            : "auto",
      });
      if (!studioPick?.studio_source_code && !studioPick?.id) continue;

      const scene = buildPolicyScene({
        id: `ms-policy-effect-b${block}-${i}`,
        role: "scene_effect",
        block,
        startHint,
        duration: effectDur,
        narration,
        studioPick: {
          ...studioPick,
          studio_source_code:
            studioPick.studio_source_code ||
            studioPick.sourceCode?.long ||
            studioPick.sourceCode?.short ||
            "",
        },
        aspectRatio,
        accentColor,
        nichePack,
        researchContext,
        config,
        source: "policy_effect",
        extraProps: {
          effect_intensity: policy.effects.intensity || "normal",
          use_remotion_templates_only: true,
          incorporate_scene_asset: true,
          effect_or_transition: true,
          studio_opacity:
            policy.effects.intensity === "subtle"
              ? 0.55
              : policy.effects.intensity === "strong"
                ? 0.95
                : 0.8,
          scene_asset: String(
            (visualPrompts || []).find((vp) => Number(vp.block) === block)
              ?.asset?.path ||
              (visualPrompts || []).find((vp) => Number(vp.block) === block)
                ?.asset?.file ||
              (visualPrompts || []).find((vp) => Number(vp.block) === block)
                ?.asset?.url ||
              ""
          ),
          sceneAsset: String(
            (visualPrompts || []).find((vp) => Number(vp.block) === block)
              ?.asset?.path ||
              (visualPrompts || []).find((vp) => Number(vp.block) === block)
                ?.asset?.file ||
              (visualPrompts || []).find((vp) => Number(vp.block) === block)
                ?.asset?.url ||
              ""
          ),
        },
      });
      result = result.filter((s) => s.id !== scene.id);
      result.push(scene);
      injected.effects.push(scene);
      if (studioPick.id) previousStudioIds.push(studioPick.id);
    }
  }

  result = enforceOverlayBudget(result, policy, duration);
  // Intro no começo (silêncio) · end card no final (só música) — não cobrem B-roll
  result = applyExclusiveIntroEndToMotionScenes(result);
  result.sort(
    (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
  );

  // Frame full-video ativo → quinas dos OUTROS templates somem (não sobrepõem o frame)
  result = applySuppressTemplateCornersToScenes(result, {
    force: Boolean(injected.frame) || policy.frame?.enabled,
    totalDurationSec: duration,
  });

  // Re-sync injected refs after exclusive placement
  if (injected.intro) {
    injected.intro =
      result.find((s) => s.id === "ms-policy-intro") || injected.intro;
  }
  if (injected.end_card) {
    injected.end_card =
      result.find((s) => s.id === "ms-policy-end-card") || injected.end_card;
  }
  if (injected.frame) {
    injected.frame =
      result.find((s) => s.id === "ms-policy-frame") || injected.frame;
  }

  return { scenes: result, injected, policy };
}

/**
 * Remove cenas de brand outro da lista de cenas de mídia se end_card ativo.
 */
export function filterBrandOutroScenes(scenes = [], policy = null) {
  if (!policy?.end_card?.enabled || !policy.end_card.replace_brand_outro) {
    return scenes;
  }
  return (Array.isArray(scenes) ? scenes : []).filter((s) => {
    const asset = String(s?.asset || s?.file || s?.path || "").toLowerCase();
    if (!asset) return true;
    return !(
      asset.includes("logo_final_") ||
      asset.includes("endscreen") ||
      asset.includes("end_screen") ||
      (asset.includes("/logo") && asset.includes("final"))
    );
  });
}

export { resolveStudioRole };
