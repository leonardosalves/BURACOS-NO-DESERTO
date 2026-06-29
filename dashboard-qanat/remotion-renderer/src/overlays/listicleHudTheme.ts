import rulesData from "./listicleLottieRules.json";
import { LOTTIE_BY_FILE, LOTTIE_REGISTRY, type LottieRegistryKey } from "./lottieRegistry.generated";
import { LOTTIE_POOLS } from "./lottiePools.generated";

/** Seed estável para escolher variante Lottie por vídeo/cena (não por projeto fixo) */
export function lottieVariantSeed(parts: Array<string | number | undefined | null> = []) {
  const raw = parts.filter((p) => p !== undefined && p !== null && String(p).length > 0).join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return h;
}

export type ListicleLottieKey = LottieRegistryKey;

export type ListicleHudTheme =
  | "ancient"
  | "mysterious"
  | "nature"
  | "classic"
  | "tech"
  | "industrial";

/** Aliases para chaves usadas nas regras mas com nome diferente no registry */
const KEY_ALIASES: Record<string, LottieRegistryKey> = {
  compass: "direction",
  clock: "time",
  hourglass: "time",
  ship: "anchor",
  sword: "shield",
  temple: "pillar",
  hammer: "gear",
  pickaxe: "gear",
  microscope: "dna",
  telescope: "rocket",
};

function resolveRegistryKey(key: string): LottieRegistryKey | null {
  const aliased = (KEY_ALIASES[key] || key) as LottieRegistryKey;
  if (aliased in LOTTIE_REGISTRY) return aliased;
  return null;
}

function buildLottieCatalog(): LottieRegistryKey[] {
  const catalog = [
    ...new Set([
      ...rulesData.rankPool.map((k) => resolveRegistryKey(k)).filter(Boolean),
      ...rulesData.rules.map((r) => resolveRegistryKey(r.key)).filter(Boolean),
    ]),
  ] as LottieRegistryKey[];
  return catalog.length ? catalog : ["time", "direction", "shield", "flame", "award"];
}

/** Identidade única do vídeo — deve bater com buildListicleVideoSeed no backend. */
export function buildListicleVideoSeed(parts: {
  projectSlug?: string;
  niche?: string;
  listTopic?: string;
  titleMain?: string;
  listItemTitles?: string[];
} = {}): string {
  const titles = (parts.listItemTitles || []).map((t) => String(t).trim()).filter(Boolean).join("§");
  return [
    parts.projectSlug,
    parts.titleMain,
    parts.listTopic,
    parts.niche,
    titles,
  ].filter(Boolean).join("|");
}

/**
 * Retorna JSON Lottie. Com seed, roda entre TODAS as variantes do pool (por vídeo/cena).
 */
export function lottieDataForKey(key?: string, seed?: number) {
  const resolved = key ? resolveRegistryKey(key) : null;
  if (!resolved) return LOTTIE_REGISTRY.award;

  const pool = LOTTIE_POOLS[resolved];
  if (pool?.length) {
    const idx = seed !== undefined ? Math.abs(seed) % pool.length : 0;
    const file = pool[idx];
    if (file && LOTTIE_BY_FILE[file]) return LOTTIE_BY_FILE[file];
  }
  return LOTTIE_REGISTRY[resolved] || LOTTIE_REGISTRY.award;
}

export function resolveLottieKey({
  isIntro = false,
  isClimax = false,
  rank,
  visualHook = "",
  title = "",
  videoSeed = "",
}: {
  isIntro?: boolean;
  isClimax?: boolean;
  rank?: number;
  visualHook?: string;
  title?: string;
  /** Identificador do vídeo (pasta + tema + itens) — principal fator entre vídeos */
  videoSeed?: string;
}): LottieRegistryKey {
  if (isIntro) return "sparkles";
  if (isClimax) return "crown";

  const pool = buildLottieCatalog();
  const idx = lottieVariantSeed([videoSeed, rank, title, visualHook]) % pool.length;
  return pool[idx];
}

export function hudThemeStyles(theme: ListicleHudTheme = "ancient", accent: string, isClimax: boolean) {
  const base = {
    cardBackground: isClimax ? "rgba(20,14,4,0.92)" : "rgba(0,0,0,0.88)",
    borderColor: isClimax ? "#D4AF3788" : `${accent}77`,
    glow: isClimax
      ? "0 16px 44px rgba(0,0,0,0.62), 0 0 36px rgba(212,175,55,0.42)"
      : `0 14px 40px rgba(0,0,0,0.55), 0 0 26px ${accent}30`,
    divider: `${accent}33`,
    topGradient: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 45%, transparent 100%)",
  };

  switch (theme) {
    case "mysterious":
      return {
        ...base,
        cardBackground: isClimax ? "rgba(12,8,28,0.94)" : "rgba(8,6,18,0.9)",
        borderColor: isClimax ? "#9B8CFF99" : "#7B68EE66",
        topGradient: "linear-gradient(180deg, rgba(8,6,22,0.78) 0%, rgba(8,6,22,0.35) 50%, transparent 100%)",
      };
    case "nature":
      return {
        ...base,
        borderColor: isClimax ? "#7CFFB288" : "#2E7D3266",
        topGradient: "linear-gradient(180deg, rgba(4,18,12,0.75) 0%, rgba(4,18,12,0.32) 50%, transparent 100%)",
      };
    case "classic":
      return {
        ...base,
        borderColor: isClimax ? "#00FF8799" : "#FFFFFF55",
        topGradient: "linear-gradient(180deg, rgba(6,10,14,0.76) 0%, rgba(6,10,14,0.34) 50%, transparent 100%)",
      };
    case "tech":
      return {
        ...base,
        borderColor: isClimax ? "#00E5FF99" : "#00B4D866",
        topGradient: "linear-gradient(180deg, rgba(4,12,20,0.76) 0%, rgba(4,12,20,0.34) 50%, transparent 100%)",
      };
    case "industrial":
      return {
        ...base,
        borderColor: isClimax ? "#FFB34799" : "#C45C2666",
        topGradient: "linear-gradient(180deg, rgba(18,10,6,0.76) 0%, rgba(18,10,6,0.34) 50%, transparent 100%)",
      };
    case "ancient":
    default:
      return {
        ...base,
        borderColor: isClimax ? "#D4AF3788" : `${accent}77`,
        topGradient: "linear-gradient(180deg, rgba(14,10,6,0.76) 0%, rgba(14,10,6,0.36) 50%, transparent 100%)",
      };
  }
}

export const READABLE_TEXT_SHADOW =
  "0 0 2px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.75)";