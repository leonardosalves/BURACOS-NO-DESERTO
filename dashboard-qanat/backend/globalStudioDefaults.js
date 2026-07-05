/**
 * Configurações globais de Visual e Produção — aplicadas a todos os projetos.
 * Persistidas em render_config_global.json (studio_visual / studio_production).
 */

export const VISUAL_CONFIG_KEYS = [
  "design_preset",
  "caption_style",
  "caption_mode_short",
  "caption_mode_long",
  "caption_style_short",
  "caption_style_long",
  "caption_effect_short",
  "caption_effect_long",
  "grain_overlay",
  "vignette",
  "progress_bar",
  "chapter_stingers",
  "source_cards",
  "overlay_sfx_sync",
  "social_proof_cards",
  "geo_map_overlays",
  "listicle_hud_style",
  "shorts_zoom_intensity",
  "shorts_hook_flash",
  "shorts_edge_glow",
  "shorts_caption_bgm_pulse",
  "shorts_portal_transition",
  "shorts_portal_every",
  "accent_color",
  "secondary_color",
  "listicle_hud_theme",
  "long_zoom_intensity",
];

export const PRODUCTION_CONFIG_KEYS = [
  "overlay_intensity",
  "project_music_volume",
  "overlay_min_gap",
  "overlay_max_duration",
  "bgm_duck_strength",
  "overlay_sfx_volume",
];

const STUDIO_KEY_SET = new Set([...VISUAL_CONFIG_KEYS, ...PRODUCTION_CONFIG_KEYS]);

function applyPatchSlice(current = {}, patch = {}) {
  const next = { ...(current && typeof current === "object" ? current : {}) };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === null || value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}

export function getStudioDefaultsFromRenderConfig(renderConfig = {}) {
  return {
    visual: renderConfig.studio_visual && typeof renderConfig.studio_visual === "object"
      ? renderConfig.studio_visual
      : {},
    production: renderConfig.studio_production && typeof renderConfig.studio_production === "object"
      ? renderConfig.studio_production
      : {},
  };
}

/** Mescla defaults globais por cima do config do projeto (global vence). */
export function mergeGlobalStudioIntoProjectConfig(projectConfig = {}, renderConfig = {}) {
  const { visual, production } = getStudioDefaultsFromRenderConfig(renderConfig);
  const merged = { ...(projectConfig && typeof projectConfig === "object" ? projectConfig : {}) };

  for (const key of VISUAL_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(visual, key)) {
      merged[key] = visual[key];
    }
  }
  for (const key of PRODUCTION_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(production, key)) {
      merged[key] = production[key];
    }
  }
  return merged;
}

export function mergeGlobalStudioIntoProjectConfigFromDir(projectConfig = {}, backendDir, loadRenderConfig) {
  const renderConfig = loadRenderConfig(backendDir);
  return mergeGlobalStudioIntoProjectConfig(projectConfig, renderConfig);
}

export function applyStudioDefaultsPatch(existingRenderConfig = {}, { visual, production } = {}) {
  const next = { ...existingRenderConfig };
  if (visual && typeof visual === "object") {
    next.studio_visual = applyPatchSlice(next.studio_visual, visual);
  }
  if (production && typeof production === "object") {
    next.studio_production = applyPatchSlice(next.studio_production, production);
  }
  return next;
}

export function isStudioConfigKey(key) {
  return STUDIO_KEY_SET.has(key);
}