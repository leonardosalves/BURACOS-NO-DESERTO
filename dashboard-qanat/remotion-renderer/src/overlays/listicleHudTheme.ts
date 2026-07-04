import type { CSSProperties } from "react";
import rulesData from "./listicleLottieRules.json";
import { LOTTIE_DEFAULT_FILE, LOTTIE_POOLS, type LottieRegistryKey } from "./lottieRegistry.generated";

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
  if (aliased in LOTTIE_POOLS) return aliased;
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

/** Nome do arquivo JSON no pool — carregar via fetch (browser) ou fs (Remotion). */
export function lottieFileForKey(key?: string, seed?: number): string {
  const resolved = key ? resolveRegistryKey(key) : null;
  if (!resolved) return LOTTIE_DEFAULT_FILE;

  const pool = LOTTIE_POOLS[resolved];
  if (pool?.length) {
    const idx = seed !== undefined ? Math.abs(seed) % pool.length : 0;
    return pool[idx] || LOTTIE_DEFAULT_FILE;
  }
  return LOTTIE_POOLS.award?.[0] || LOTTIE_DEFAULT_FILE;
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

/** Badge circular do ícone Lottie — fundo escuro + borda de acento (ícones claros não somem). */
export function lottieIconBadgeStyle(
  size: number,
  accent: string = "#C5A880",
  isClimax = false,
): {
  shell: CSSProperties;
  lottie: CSSProperties;
} {
  const climaxAccent = "#D4AF37";
  const ring = isClimax ? climaxAccent : accent;
  return {
    shell: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: isClimax
        ? "radial-gradient(circle at 32% 28%, rgba(212,175,55,0.42) 0%, rgba(22,14,6,0.97) 48%, rgba(4,3,2,0.99) 100%)"
        : `radial-gradient(circle at 32% 28%, ${ring}55 0%, rgba(16,12,10,0.96) 48%, rgba(5,4,3,0.99) 100%)`,
      border: `2px solid ${ring}aa`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow:
        "0 4px 16px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -3px 10px rgba(0,0,0,0.5)",
      overflow: "hidden",
    },
    lottie: {
      width: Math.round(size * 0.72),
      height: Math.round(size * 0.72),
      filter:
        "drop-shadow(0 0 1.5px rgba(0,0,0,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.8)) brightness(1.08) contrast(1.12)",
    },
  };
}