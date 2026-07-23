/**
 * storyboardSchema.js
 * Validação estrutural do storyboard.json em cada transição de estágio.
 * Falha cedo em vez de propagar undefined até o render.
 *
 * Uso: validateStoryboardTransition(storyboard, "script") → { ok, errors[] }
 */

const REQUIRED_BY_STAGE = {
  script: ["narrative_script"],
  narration: ["narrative_script"],
  visual: ["narrative_script", "visual_prompts"],
  orchestration: ["narrative_script", "visual_prompts"],
  render: ["narrative_script", "visual_prompts"],
};

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0;
}

function validateVisualPrompts(vps) {
  const errors = [];
  if (!Array.isArray(vps)) {
    errors.push("visual_prompts não é um array");
    return errors;
  }
  if (vps.length === 0) {
    errors.push("visual_prompts está vazio");
    return errors;
  }
  vps.forEach((vp, i) => {
    if (!vp || typeof vp !== "object") {
      errors.push(`visual_prompts[${i}] não é um objeto`);
      return;
    }
    if (!isNonEmptyString(vp.prompt || vp.visual_prompt)) {
      errors.push(`visual_prompts[${i}].prompt está vazio`);
    }
    if (vp.block == null && vp.scene == null) {
      errors.push(`visual_prompts[${i}] sem block ou scene`);
    }
  });
  return errors;
}

function validateNarrativeScript(script) {
  const errors = [];
  if (!isNonEmptyString(script)) {
    errors.push("narrative_script está vazio ou ausente");
    return errors;
  }
  if (script.trim().length < 20) {
    errors.push("narrative_script muito curto (< 20 chars)");
  }
  return errors;
}

function validateTechnicalConfig(config) {
  const errors = [];
  if (config && typeof config === "object") {
    if (
      config.format &&
      !["SHORTS", "SHORT", "LONGO", "LONG"].includes(
        String(config.format).toUpperCase()
      )
    ) {
      errors.push(`technical_config.format inválido: "${config.format}"`);
    }
  }
  return errors;
}

/**
 * Valida o storyboard para uma transição de estágio específica.
 * @param {object} storyboard - O storyboard.json parseado
 * @param {"script"|"narration"|"visual"|"orchestration"|"render"} stage - Estágio alvo
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateStoryboardTransition(
  storyboard = {},
  stage = "script"
) {
  const errors = [];
  const warnings = [];

  if (!storyboard || typeof storyboard !== "object") {
    return {
      ok: false,
      errors: ["storyboard não é um objeto válido"],
      warnings,
    };
  }

  const required = REQUIRED_BY_STAGE[stage] || [];

  for (const field of required) {
    if (field === "narrative_script") {
      errors.push(...validateNarrativeScript(storyboard.narrative_script));
    } else if (field === "visual_prompts") {
      if (!storyboard.visual_prompts) {
        errors.push("visual_prompts ausente");
      } else {
        errors.push(...validateVisualPrompts(storyboard.visual_prompts));
      }
    }
  }

  errors.push(...validateTechnicalConfig(storyboard.technical_config));

  if (stage === "orchestration" || stage === "render") {
    if (!storyboard.motion_scenes && !storyboard.timeline_assets) {
      warnings.push(
        "Sem motion_scenes ou timeline_assets — orquestração pode não ter rodado"
      );
    }
  }

  if (stage === "render") {
    const vps = storyboard.visual_prompts || [];
    const withoutAsset = vps.filter(
      (vp) => !vp.asset && !vp.production?.asset_path
    );
    if (withoutAsset.length > 0) {
      warnings.push(`${withoutAsset.length} cena(s) sem asset definido`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validação rápida de integridade mínima (qualquer estágio).
 */
export function validateStoryboardIntegrity(storyboard = {}) {
  const errors = [];
  const warnings = [];

  if (!isNonEmptyString(storyboard.narrative_script)) {
    errors.push("narrative_script ausente");
  }

  if (storyboard.visual_prompts && !Array.isArray(storyboard.visual_prompts)) {
    errors.push("visual_prompts não é array");
  }

  if (storyboard.motion_scenes && !Array.isArray(storyboard.motion_scenes)) {
    errors.push("motion_scenes não é array");
  }

  if (
    storyboard.timeline_assets &&
    typeof storyboard.timeline_assets !== "object"
  ) {
    errors.push("timeline_assets não é objeto");
  }

  return { ok: errors.length === 0, errors, warnings };
}
