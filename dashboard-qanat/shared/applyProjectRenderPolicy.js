/**
 * Aplica render_template_policy do PROJETO em motion_scenes existentes
 * e devolve cenas prontas para Timeline/Render — sem LLM.
 */

import { applyRenderTemplatePolicyToScenes } from "./applyRenderTemplatePolicy.js";
import {
  enforceOverlayBudget,
  resolveRenderTemplatePolicy,
} from "./renderTemplatePolicy.js";
import { resolveVisualOrchestration } from "./visualOrchestration.js";

function isPolicyManagedScene(scene = {}) {
  if (scene.policy_injected) return true;
  const src = String(scene.source || "");
  if (src.startsWith("policy_") || src === "policy_effect_manual") return true;
  const id = String(scene.id || "");
  if (id.startsWith("ms-policy-")) return true;
  return false;
}

/**
 * Remove camadas geradas pela policy (para reaplicar limpo).
 * Mantém cenas semânticas (chart, geo, boost, narradorpro).
 */
export function stripPolicyManagedScenes(scenes = []) {
  return (Array.isArray(scenes) ? scenes : []).filter(
    (s) => !isPolicyManagedScene(s)
  );
}

/**
 * @returns {{ motion_scenes, policy, injected, stripped }}
 */
export function applyProjectRenderPolicyToMotionScenes({
  motionScenes = [],
  visualPrompts = [],
  blockTimings = {},
  config = {},
  pickStudioTemplateByCategory,
  totalDurationSec = 0,
} = {}) {
  const aspectRatio = String(
    config.aspect_ratio || config.format || "16:9"
  ).trim();
  const policy = resolveRenderTemplatePolicy(config, aspectRatio);
  const studioNiche = String(
    config.render_template_policy?.template_niche ||
      policy.template_niche ||
      config.motion_template_pack?.niche ||
      config.niche ||
      "Default"
  ).trim();
  const accentColor = String(config.accent_color || "#D4AF37");
  const preferredStudioIds = Array.isArray(
    config.motion_template_pack?.template_ids
  )
    ? config.motion_template_pack.template_ids.map((id) => String(id).trim())
    : [];
  const visualOrchestration = resolveVisualOrchestration({}, config);

  const base = stripPolicyManagedScenes(motionScenes);
  const stripped = Math.max(0, (motionScenes?.length || 0) - base.length);

  if (policy.mode === "legacy") {
    return {
      motion_scenes: base,
      policy,
      injected: null,
      stripped,
      studioNiche,
    };
  }

  if (typeof pickStudioTemplateByCategory !== "function") {
    return {
      motion_scenes: base,
      policy,
      injected: null,
      stripped,
      studioNiche,
      error: "pickStudioTemplateByCategory ausente",
    };
  }

  // Pack virtual on para o picker achar templates do nicho
  const cfg = {
    ...config,
    motion_template_pack: {
      ...(config.motion_template_pack || {}),
      enabled: true,
      niche: studioNiche,
    },
  };

  const result = applyRenderTemplatePolicyToScenes({
    scenes: base,
    visualPrompts,
    blockTimings,
    config: cfg,
    studioNiche,
    aspectRatio,
    accentColor,
    nichePack: String(config.niche || studioNiche),
    researchContext: {},
    preferredStudioIds,
    pickStudioTemplateByCategory,
    visualOrchestration,
    totalDurationSec,
  });

  let scenes = enforceOverlayBudget(
    result.scenes,
    policy,
    totalDurationSec || 0
  );

  return {
    motion_scenes: scenes,
    policy: result.policy || policy,
    injected: result.injected,
    stripped,
    studioNiche,
  };
}

export function countInjectedPolicyLayers(injected = null) {
  if (!injected || typeof injected !== "object") return 0;
  let n = 0;
  if (injected.intro) n += 1;
  if (injected.end_card) n += 1;
  if (injected.subscribe_mid) n += 1;
  if (injected.frame) n += 1;
  n += Array.isArray(injected.chapters) ? injected.chapters.length : 0;
  n += Array.isArray(injected.effects) ? injected.effects.length : 0;
  return n;
}
