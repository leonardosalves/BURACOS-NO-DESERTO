import { LOTTIE_FILE_BY_ID } from './overlayIconCatalog';

const lottieModules = import.meta.glob(
  '../remotion-renderer/src/overlays/lottie_assets/*.json',
) as Record<string, () => Promise<{ default: object }>>;

const cache = new Map<string, object>();

export async function loadOverlayLottie(id: string): Promise<object | null> {
  if (cache.has(id)) return cache.get(id)!;
  const file = LOTTIE_FILE_BY_ID[id];
  if (!file) return null;
  const key = `../remotion-renderer/src/overlays/lottie_assets/${file}`;
  const loader = lottieModules[key];
  if (!loader) return null;
  const mod = await loader();
  cache.set(id, mod.default);
  return mod.default;
}