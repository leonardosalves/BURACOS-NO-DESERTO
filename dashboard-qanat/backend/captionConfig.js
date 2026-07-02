/**
 * HyperFrames caption modes portados para Remotion (catálogo completo — 17/17).
 */

export const CAPTION_MODE_IDS = [
  "caption-highlight",
  "caption-kinetic-slam",
  "caption-pill-karaoke",
  "caption-neon-glow",
  "caption-weight-shift",
  "caption-gradient-fill",
  "caption-glitch-rgb",
  "caption-matrix-decode",
  "caption-clip-wipe",
  "caption-particle-burst",
  "caption-neon-accent",
  "caption-emoji-pop",
  "caption-editorial-emphasis",
  "caption-parallax-layers",
  "caption-texture",
  "caption-blend-difference",
  "morph-text",
];

const LEGACY_SHORT_MODE = {
  "viral-pop": "caption-highlight",
  "viral-pulse": "caption-highlight",
  "viral-static": "caption-highlight",
  "shorts-viral": "caption-highlight",
  documentary: "caption-pill-karaoke",
};

const LEGACY_LONG_MODE = {
  "doc-pill": "caption-pill-karaoke",
  "doc-glow": "caption-neon-glow",
  "doc-minimal": "caption-weight-shift",
  documentary: "caption-pill-karaoke",
  "shorts-viral": "caption-highlight",
};

export function isCaptionModeId(raw) {
  return CAPTION_MODE_IDS.includes(raw);
}

export function isWordByWordMode(mode) {
  return mode !== "caption-pill-karaoke"
    && mode !== "caption-weight-shift"
    && mode !== "caption-editorial-emphasis";
}

export function resolveCaptionChunkStyle(mode) {
  return isWordByWordMode(mode) ? "shorts-viral" : "documentary";
}

function migrateLegacyShortMode(style, effect, legacyCaption, bgmPulse) {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_SHORT_MODE[effect]) return LEGACY_SHORT_MODE[effect];
  if (style && LEGACY_SHORT_MODE[style]) return LEGACY_SHORT_MODE[style];
  if (legacyCaption === "documentary") return "caption-pill-karaoke";
  return "caption-highlight";
}

function migrateLegacyLongMode(style, effect, legacyCaption) {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_LONG_MODE[effect]) return LEGACY_LONG_MODE[effect];
  if (style && LEGACY_LONG_MODE[style]) return LEGACY_LONG_MODE[style];
  if (legacyCaption === "shorts-viral") return "caption-highlight";
  return "caption-pill-karaoke";
}

export function resolveShortCaptionMode(config = {}) {
  if (isCaptionModeId(config.caption_mode_short)) return config.caption_mode_short;
  return migrateLegacyShortMode(
    config.caption_style_short || config.caption_style,
    config.caption_effect_short,
    config.caption_style,
    config.shorts_caption_bgm_pulse,
  );
}

export function resolveLongCaptionMode(config = {}) {
  if (isCaptionModeId(config.caption_mode_long)) return config.caption_mode_long;
  return migrateLegacyLongMode(
    config.caption_style_long || config.caption_style,
    config.caption_effect_long,
    config.caption_style,
  );
}

export function resolveCaptionModeForFormat(config = {}, format = "9:16") {
  return format === "9:16"
    ? resolveShortCaptionMode(config)
    : resolveLongCaptionMode(config);
}

export function resolveShortsCaptionBgmPulse(config = {}, format = "9:16") {
  if (format !== "9:16") return false;
  const mode = resolveShortCaptionMode(config);
  if (mode !== "caption-highlight") return false;
  if (config.caption_effect_short === "viral-static") return false;
  if (config.caption_effect_short === "viral-pulse") return true;
  if (config.shorts_caption_bgm_pulse === false) return false;
  return config.shorts_caption_bgm_pulse !== false;
}

/** @deprecated — use resolveCaptionModeForFormat */
export function resolveCaptionStyleForFormat(config = {}, format = "9:16") {
  return resolveCaptionChunkStyle(resolveCaptionModeForFormat(config, format));
}

/** @deprecated */
export function resolveCaptionEffectForFormat(config = {}, format = "9:16") {
  return resolveCaptionModeForFormat(config, format);
}

export function resolveCaptionRenderSettings(config = {}, format = "9:16") {
  const captionMode = resolveCaptionModeForFormat(config, format);
  return {
    captionMode,
    captionStyle: resolveCaptionChunkStyle(captionMode),
    captionEffect: captionMode,
    shortsCaptionBgmPulse: resolveShortsCaptionBgmPulse(config, format),
  };
}