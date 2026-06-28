import rulesData from "./listicleLottieRules.json";
import { LOTTIE_REGISTRY, type LottieRegistryKey } from "./lottieRegistry.generated";

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

function matchTitleLottie(title = "", visualHook = ""): LottieRegistryKey | null {
  const titleBlob = String(title).trim();
  const hookBlob = String(visualHook).trim();
  for (const rule of rulesData.rules) {
    const re = new RegExp(rule.re, "i");
    if (re.test(titleBlob)) {
      const hit = resolveRegistryKey(rule.key);
      if (hit) return hit;
    }
  }
  for (const rule of rulesData.rules) {
    const re = new RegExp(rule.re, "i");
    if (re.test(hookBlob)) {
      const hit = resolveRegistryKey(rule.key);
      if (hit) return hit;
    }
  }
  return null;
}

export function lottieDataForKey(key?: string) {
  const resolved = key ? resolveRegistryKey(key) : null;
  if (resolved) return LOTTIE_REGISTRY[resolved];
  return LOTTIE_REGISTRY.award;
}

export function resolveLottieKey({
  isIntro = false,
  isClimax = false,
  rank,
  visualHook = "",
  title = "",
  lottieKey,
}: {
  isIntro?: boolean;
  isClimax?: boolean;
  rank?: number;
  visualHook?: string;
  title?: string;
  lottieKey?: string;
}): LottieRegistryKey {
  if (lottieKey) {
    const fromProp = resolveRegistryKey(lottieKey);
    if (fromProp) return fromProp;
  }
  if (isIntro) return "sparkles";
  if (isClimax) return "crown";

  const matched = matchTitleLottie(title, visualHook);
  if (matched) return matched;

  const pool = rulesData.rankPool
    .map((k) => resolveRegistryKey(k))
    .filter(Boolean) as LottieRegistryKey[];
  const safePool = pool.length ? pool : ["time", "direction", "shield", "flame", "award"] as LottieRegistryKey[];
  const idx = Math.max(0, (Number(rank) || 1) - 1) % safePool.length;
  return safePool[idx];
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