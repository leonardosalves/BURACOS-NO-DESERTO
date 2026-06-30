import type { VisualConfig } from './VisualSettings';

export const VISUAL_CONFIG_KEYS = [
  'design_preset',
  'caption_style',
  'grain_overlay',
  'vignette',
  'progress_bar',
  'chapter_stingers',
  'source_cards',
  'overlay_sfx_sync',
  'social_proof_cards',
  'geo_map_overlays',
  'listicle_hud_style',
  'shorts_zoom_intensity',
  'shorts_hook_flash',
  'shorts_edge_glow',
  'shorts_caption_bgm_pulse',
  'shorts_portal_transition',
  'shorts_portal_every',
  'accent_color',
  'secondary_color',
  'listicle_hud_theme',
  'long_zoom_intensity',
] as const;

export type VisualConfigKey = (typeof VISUAL_CONFIG_KEYS)[number];

export function pickVisualConfig(config: VisualConfig = {}): VisualConfig {
  const out: VisualConfig = {};
  for (const key of VISUAL_CONFIG_KEYS) {
    const value = config[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export function applyVisualPatch(base: VisualConfig, patch: Partial<VisualConfig>): VisualConfig {
  const next = { ...base };
  for (const [rawKey, value] of Object.entries(patch)) {
    const key = rawKey as VisualConfigKey;
    if (value === undefined || value === null) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function mergeVisualIntoConfig<T extends Record<string, unknown>>(
  base: T,
  visual: VisualConfig,
): T & VisualConfig {
  const merged = { ...base } as T & VisualConfig;
  for (const key of VISUAL_CONFIG_KEYS) {
    if (key in visual) {
      const value = visual[key];
      if (value === undefined) {
        delete (merged as Record<string, unknown>)[key];
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}

/** Payload para API: null remove chave no merge do servidor. */
export function visualDraftToApiPatch(draft: VisualConfig, previous: VisualConfig = {}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of VISUAL_CONFIG_KEYS) {
    const draftHas = Object.prototype.hasOwnProperty.call(draft, key);
    const prevHas = Object.prototype.hasOwnProperty.call(previous, key);
    const nextVal = draft[key];
    const prevVal = previous[key];

    if (draftHas && nextVal !== undefined) {
      if (nextVal !== prevVal) patch[key] = nextVal;
    } else if (prevHas || prevVal !== undefined) {
      patch[key] = null;
    }
  }
  return patch;
}

export function applyVisualPatchToConfig<T extends Record<string, unknown>>(
  base: T,
  draft: VisualConfig,
  previous: VisualConfig = {},
): T {
  const patch = visualDraftToApiPatch(draft, previous);
  const merged = { ...base } as T & Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as T;
}