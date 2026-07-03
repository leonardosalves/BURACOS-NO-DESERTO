import { LOTTIE_FILE_BY_ID } from './overlayIconCatalog';

const lottieModules = import.meta.glob(
  '../remotion-renderer/src/overlays/lottie_assets/*.json',
) as Record<string, () => Promise<{ default: object }>>;

const loaderByFile = new Map<string, () => Promise<{ default: object }>>();
for (const [modulePath, loader] of Object.entries(lottieModules)) {
  const normalized = modulePath.replace(/\\/g, '/');
  const file = normalized.split('/lottie_assets/').pop();
  if (file) loaderByFile.set(file, loader);
}

const cache = new Map<string, object>();

export async function loadOverlayLottie(id: string): Promise<object | null> {
  if (cache.has(id)) return cache.get(id)!;
  const file = LOTTIE_FILE_BY_ID[id];
  if (!file) return null;
  const loader = loaderByFile.get(file);
  if (!loader) return null;
  try {
    const mod = await loader();
    cache.set(id, mod.default);
    return mod.default;
  } catch {
    return null;
  }
}