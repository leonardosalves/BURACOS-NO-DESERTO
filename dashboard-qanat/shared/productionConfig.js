/**
 * Defaults globais de produção — valem para todo projeto novo ou re-orquestrado.
 */

export const GLOBAL_PRODUCTION_DEFAULTS = {
  research_grounding: true,
  montage_policy: true,
  auto_template_pack: true,
};

export function freezeStoryboardNarration(storyboard = {}) {
  return {
    narrative_script: storyboard.narrative_script,
    narrative_script_tagged: storyboard.narrative_script_tagged,
    technical_config: storyboard.technical_config
      ? { ...storyboard.technical_config }
      : undefined,
  };
}

export function restoreStoryboardNarration(storyboard = {}, frozen = {}) {
  if (!storyboard || typeof storyboard !== "object") return storyboard;
  const next = { ...storyboard };
  if (
    frozen.narrative_script !== undefined &&
    frozen.narrative_script !== null
  ) {
    next.narrative_script = frozen.narrative_script;
  }
  if (
    frozen.narrative_script_tagged !== undefined &&
    frozen.narrative_script_tagged !== null
  ) {
    next.narrative_script_tagged = frozen.narrative_script_tagged;
  }
  if (frozen.technical_config && typeof frozen.technical_config === "object") {
    next.technical_config = {
      ...(next.technical_config || {}),
      ...frozen.technical_config,
      script:
        frozen.technical_config.script ??
        next.technical_config?.script ??
        frozen.narrative_script,
    };
  }
  return next;
}

/**
 * Mescla config do projeto + workspace + defaults globais.
 * motion_template_pack: auto quando catálogo do nicho tem templates prontos.
 */
export function resolveProductionConfig(
  projectConfig = {},
  workspaceConfig = {},
  { storyboard = {}, catalogResolver = null } = {}
) {
  const niche = String(
    projectConfig.niche ||
      workspaceConfig.niche ||
      storyboard?.strategy?.niche ||
      "Geral"
  ).trim();

  const defaults = {
    ...GLOBAL_PRODUCTION_DEFAULTS,
    ...(workspaceConfig.production_defaults || {}),
    ...(projectConfig.production_pipeline || {}),
  };

  const merged = {
    ...workspaceConfig,
    ...projectConfig,
    niche: projectConfig.niche || workspaceConfig.niche || niche,
    production_pipeline: defaults,
  };

  const pack = merged.motion_template_pack;
  if (pack?.enabled === false) {
    merged.motion_template_pack = { enabled: false };
    return merged;
  }
  const packExplicit = pack?.enabled === true;
  if (
    !packExplicit &&
    defaults.auto_template_pack &&
    typeof catalogResolver === "function"
  ) {
    const catalog = catalogResolver(niche);
    const ready = catalog?.orchestration_ready || catalog?.approved || [];
    if (ready.length) {
      merged.motion_template_pack = {
        enabled: true,
        niche: catalog.niche || niche,
        template_ids: [],
        auto: true,
      };
    }
  }

  return merged;
}
