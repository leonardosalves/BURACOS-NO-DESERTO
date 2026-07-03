export type OverlayIntensity = 'light' | 'normal' | 'rich';
export type OverlayMinGap = 'tight' | 'normal' | 'relaxed';
export type BgmDuckStrength = 'light' | 'normal' | 'strong';

/** Padrões globais Lumiera — espelham bgmProductionDefaults.js no backend. */
export const BGM_PRODUCTION_DEFAULTS = {
  LONG: {
    bgm_mode: 'emotion' as const,
    project_music_volume: 0.16,
    segment_count: { min: 2, max: 4 },
    crossfade_s: 4,
  },
  SHORT: {
    bgm_mode: 'block' as const,
    use_single_bgm: true,
    project_music_volume: 0.14,
  },
} as const;

export type BgmProductionHints = {
  mode: string;
  volume: number;
  segments?: string;
  tip: string;
};

export type ProductionConfig = {
  overlay_intensity?: OverlayIntensity;
  project_music_volume?: number;
  overlay_min_gap?: OverlayMinGap;
  overlay_max_duration?: number;
  bgm_duck_strength?: BgmDuckStrength;
  overlay_sfx_volume?: number;
};

export const PRODUCTION_CONFIG_KEYS = [
  'overlay_intensity',
  'project_music_volume',
  'overlay_min_gap',
  'overlay_max_duration',
  'bgm_duck_strength',
  'overlay_sfx_volume',
] as const;

export function pickProductionConfig(config: ProductionConfig = {}): ProductionConfig {
  const out: ProductionConfig = {};
  for (const key of PRODUCTION_CONFIG_KEYS) {
    const value = config[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export function applyProductionPatch(base: ProductionConfig, patch: Partial<ProductionConfig>): ProductionConfig {
  const next = { ...base };
  for (const [rawKey, value] of Object.entries(patch)) {
    const key = rawKey as keyof ProductionConfig;
    if (value === undefined || value === null) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function productionDraftToApiPatch(
  draft: ProductionConfig,
  previous: ProductionConfig = {},
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of PRODUCTION_CONFIG_KEYS) {
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

export function applyProductionPatchToConfig<T extends Record<string, unknown>>(
  base: T,
  draft: ProductionConfig,
  previous: ProductionConfig = {},
): T {
  const patch = productionDraftToApiPatch(draft, previous);
  const merged = { ...base } as T & Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as T;
}

/** Remove metadados somente-leitura retornados pelo GET /api/config. */
export function stripConfigApiMetadata<T extends Record<string, unknown>>(config: T): T {
  const { _bgm_production_hints: _hints, ...rest } = config;
  return rest as T;
}