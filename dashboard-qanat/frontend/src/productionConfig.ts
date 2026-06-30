export type OverlayIntensity = 'light' | 'normal' | 'rich';

export type ProductionConfig = {
  overlay_intensity?: OverlayIntensity;
  project_music_volume?: number;
};

export const PRODUCTION_CONFIG_KEYS = [
  'overlay_intensity',
  'project_music_volume',
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