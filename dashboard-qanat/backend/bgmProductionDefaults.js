/**
 * Padrões globais de trilha sonora do Lumiera — aplicáveis a todos os nichos.
 * Longos: emoção contínua, crossfade, volume audível, família sonora coerente.
 * Shorts: trilha única, duck mais presente.
 */

import { VIDEO_FORMAT, detectVideoFormat } from "./formatResolver.js";

export const BGM_PRODUCTION_DEFAULTS = {
  LONG: {
    bgm_mode: "emotion",
    use_single_bgm: false,
    project_music_volume: 0.16,
    bgm_duck_strength: "normal",
    segment_count: { min: 2, max: 4 },
    crossfade_s: 4,
    min_music_volume_render: 0.16,
  },
  SHORT: {
    bgm_mode: "block",
    use_single_bgm: true,
    project_music_volume: 0.14,
    bgm_duck_strength: "normal",
    min_music_volume_render: 0.14,
  },
};

const NICHE_SONIC_FAMILIES = [
  { test: /hist|antig|arque|egito|roma|mediev|imp[eé]rio|fara[oó]|guerra|militar/i, family: "orchestral historical documentary ambient instrumental no vocals" },
  { test: /ci[eê]n|space|espac|cosmo|f[ií]s|marte|nasa|engenh|tech|plasma|motor|fogu/i, family: "scientific discovery documentary ambient pulse instrumental no vocals" },
  { test: /mist[eé]r|consp|ocult|enigm|sombr|crime|investig/i, family: "dark mystery documentary ambient tension instrumental no vocals" },
  { test: /nature|animal|vida|bio|oceano|floresta|planeta/i, family: "nature documentary calm orchestral instrumental no vocals" },
  { test: /finan|neg[oó]c|econom|invest|dinheiro|mercado/i, family: "corporate documentary neutral piano strings instrumental no vocals" },
  { test: /sa[uú]de|medic|corpo|mente|bem.?estar/i, family: "calm medical documentary soft ambient instrumental no vocals" },
  { test: /curios|fato|surpre|viral|listicle|ranking/i, family: "curious upbeat documentary light instrumental no vocals" },
];

const DEFAULT_SONIC_FAMILY = "cinematic documentary underscore orchestral instrumental no vocals";

/** Família sonora base por nicho — mantém coerência entre segmentos emocionais. */
export function resolveNicheSonicFamily(niche = "", config = {}) {
  const combined = `${niche} ${config?.content_mode || ""} ${config?.design_preset || ""}`;
  for (const entry of NICHE_SONIC_FAMILIES) {
    if (entry.test.test(combined)) return entry.family;
  }
  return DEFAULT_SONIC_FAMILY;
}

/** Duck por emoção — longos documentais: evitar strong (esmaga trilha sob narração contínua). */
export function resolveEmotionDuckStrength(emotion = "neutral") {
  const e = String(emotion || "").trim().toLowerCase();
  if (e === "calm" || e === "intro" || e === "wonder" || e === "resolve") return "light";
  if (e === "climax" || e === "epic" || e === "tension") return "normal";
  return "normal";
}

export function isLongFormat(config = {}, totalDuration = 0) {
  return detectVideoFormat(config, totalDuration) === VIDEO_FORMAT.LONG;
}

/** Aplica defaults de produção de áudio sem sobrescrever escolhas explícitas do usuário. */
export function applyBgmProductionDefaults(config = {}, totalDuration = 0) {
  const out = { ...config };
  const long = isLongFormat(out, totalDuration);
  const defs = long ? BGM_PRODUCTION_DEFAULTS.LONG : BGM_PRODUCTION_DEFAULTS.SHORT;

  if (!Array.isArray(out.bgm_emotion_mappings)) out.bgm_emotion_mappings = [];
  if (!Array.isArray(out.bgm_mappings)) out.bgm_mappings = [];

  if (long) {
    if (out.use_single_bgm !== true && !out.bgm_mode) out.bgm_mode = defs.bgm_mode;
    if (out.bgm_mode === "emotion" || out.use_single_bgm === false) {
      out.use_single_bgm = false;
      if (!out.bgm_mode) out.bgm_mode = "emotion";
    }
    const vol = Number(out.project_music_volume);
    if (!Number.isFinite(vol) || vol < 0.14) {
      out.project_music_volume = defs.project_music_volume;
    }
  } else if (out.use_single_bgm === undefined && out.bgm_mode !== "emotion") {
    out.use_single_bgm = defs.use_single_bgm;
  }

  if (!out.bgm_duck_strength) out.bgm_duck_strength = defs.bgm_duck_strength;

  return out;
}

export function resolveMusicVolumeForRender(config = {}, format = "16:9", globalVolume = 0.15) {
  const longEmotion = format === "16:9"
    && (config.bgm_mode === "emotion" || (config.use_single_bgm === false && config.bgm_mode !== "block"));
  const base = Number.isFinite(Number(config.project_music_volume))
    ? Number(config.project_music_volume)
    : globalVolume;
  if (longEmotion) {
    return Math.max(base, BGM_PRODUCTION_DEFAULTS.LONG.min_music_volume_render);
  }
  return base;
}

/** Harmoniza duck e search_theme dos segmentos para família sonora do nicho. */
export function harmonizeEmotionSegments(segments = [], niche = "", config = {}) {
  const family = resolveNicheSonicFamily(niche, config);
  return (segments || []).map((seg) => {
    const emotion = String(seg.emotion || "neutral").toLowerCase();
    const moodTag = emotion === "tension" ? "tension subtle"
      : emotion === "wonder" ? "curious discovery"
        : emotion === "resolve" ? "hopeful uplifting"
          : emotion === "epic" || emotion === "climax" ? "epic rise"
            : emotion === "calm" || emotion === "intro" ? "soft ambient"
              : "underscore";
    const existing = String(seg.search_theme || "").trim();
    const searchTheme = existing && !existing.toLowerCase().includes("vocal")
      ? existing
      : `${family} ${moodTag}`.replace(/\s+/g, " ").trim();
    return {
      ...seg,
      duck_strength: resolveEmotionDuckStrength(emotion),
      search_theme: searchTheme,
    };
  });
}

export function buildEmotionPlanProductionRules(niche = "", config = {}) {
  const family = resolveNicheSonicFamily(niche, config);
  const { min, max } = BGM_PRODUCTION_DEFAULTS.LONG.segment_count;
  return `
PADRÕES LUMIERA (programa — qualquer nicho):
- Nicho "${niche || "Geral"}": família sonora única → "${family}"
- ${min} a ${max} segmentos emocionais; cobertura CONTÍNUA do vídeo com crossfade ~4s (nunca silêncio entre trilhas)
- search_theme: variações da mesma família + emoção; SEMPRE "instrumental no vocals"
- duck_strength: light (intro/wonder/resolve) ou normal (tension/epic/climax) — evite strong
- Trocar trilha só em viradas narrativas claras, não a cada bloco
- Prefira faixas ambient/orchestral/documentary; evite EDM agressivo ou vocal`;
}

export function getBgmProductionHints(format = VIDEO_FORMAT.LONG) {
  if (format === VIDEO_FORMAT.SHORT) {
    return {
      mode: "Trilha única",
      volume: BGM_PRODUCTION_DEFAULTS.SHORT.project_music_volume,
      tip: "Shorts: uma faixa energética do início ao fim.",
    };
  }
  return {
    mode: "Por emoção (IA)",
    volume: BGM_PRODUCTION_DEFAULTS.LONG.project_music_volume,
    segments: `${BGM_PRODUCTION_DEFAULTS.LONG.segment_count.min}–${BGM_PRODUCTION_DEFAULTS.LONG.segment_count.max}`,
    tip: "Longos: 2–4 trilhas com crossfade contínuo, mesma família sonora do nicho.",
  };
}