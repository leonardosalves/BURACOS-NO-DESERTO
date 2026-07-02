/**
 * Resolve estilo/efeito de legenda por formato (Short 9:16 vs Longo 16:9).
 */

export function resolveCaptionStyleForFormat(config = {}, format = "9:16") {
  const isShort = format === "9:16";
  const legacy = config.caption_style;
  if (isShort) {
    const raw = config.caption_style_short || legacy;
    if (raw === "documentary") return "documentary";
    if (raw === "shorts-viral") return "shorts-viral";
    return "shorts-viral";
  }
  const raw = config.caption_style_long || legacy;
  if (raw === "shorts-viral") return "shorts-viral";
  if (raw === "documentary") return "documentary";
  return "documentary";
}

export function resolveCaptionEffectForFormat(config = {}, format = "9:16") {
  const isShort = format === "9:16";
  if (isShort) {
    const raw = config.caption_effect_short;
    if (raw === "viral-pulse" || raw === "viral-static" || raw === "viral-pop") return raw;
    if (config.shorts_caption_bgm_pulse === true) return "viral-pulse";
    if (config.shorts_caption_bgm_pulse === false) return "viral-static";
    return "viral-pop";
  }
  const raw = config.caption_effect_long;
  if (raw === "doc-glow" || raw === "doc-minimal" || raw === "doc-pill") return raw;
  return "doc-pill";
}

export function resolveShortsCaptionBgmPulse(config = {}, format = "9:16") {
  if (format !== "9:16") return false;
  const effect = resolveCaptionEffectForFormat(config, format);
  if (effect === "viral-pulse") return true;
  if (effect === "viral-static") return false;
  if (config.shorts_caption_bgm_pulse === false) return false;
  return config.shorts_caption_bgm_pulse !== false;
}

export function resolveCaptionRenderSettings(config = {}, format = "9:16") {
  return {
    captionStyle: resolveCaptionStyleForFormat(config, format),
    captionEffect: resolveCaptionEffectForFormat(config, format),
    shortsCaptionBgmPulse: resolveShortsCaptionBgmPulse(config, format),
  };
}