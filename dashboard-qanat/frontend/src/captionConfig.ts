/** HyperFrames caption modes portados para Remotion (catálogo completo — 17/17). */

export type CaptionModeId =
  | "caption-highlight"
  | "caption-kinetic-slam"
  | "caption-pill-karaoke"
  | "caption-neon-glow"
  | "caption-weight-shift"
  | "caption-gradient-fill"
  | "caption-glitch-rgb"
  | "caption-matrix-decode"
  | "caption-clip-wipe"
  | "caption-particle-burst"
  | "caption-neon-accent"
  | "caption-emoji-pop"
  | "caption-editorial-emphasis"
  | "caption-parallax-layers"
  | "caption-texture"
  | "caption-blend-difference"
  | "morph-text";

export const CAPTION_MODE_IDS: CaptionModeId[] = [
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

export type CaptionStyleId = "shorts-viral" | "documentary";

/** Configurações avançadas de agrupamento de legendas */
export type CaptionGrouping = {
  /** Máx. palavras por grupo (chunk) antes de trocar tela (2–6). */
  maxWordsPerChunk: number;
  /** Máx. linhas visíveis simultâneas (1 ou 2). */
  maxLines: 1 | 2;
  /** Quebrar chunk ao encontrar pontuação (. ! ? , ;). */
  respectSentences: boolean;
  /** Mín. palavras por chunk — evita 1 palavra solta. */
  minWordsPerChunk: number;
};

export const DEFAULT_CAPTION_GROUPING_SHORT: CaptionGrouping = {
  maxWordsPerChunk: 4,
  maxLines: 2,
  respectSentences: true,
  minWordsPerChunk: 2,
};

export const DEFAULT_CAPTION_GROUPING_LONG: CaptionGrouping = {
  maxWordsPerChunk: 5,
  maxLines: 2,
  respectSentences: true,
  minWordsPerChunk: 2,
};

export const MAX_WORDS_OPTIONS = [2, 3, 4, 5, 6] as const;

export function resolveCaptionGrouping(
  config: Record<string, unknown> = {},
  format: "short" | "long" = "short"
): CaptionGrouping {
  const defaults =
    format === "short"
      ? DEFAULT_CAPTION_GROUPING_SHORT
      : DEFAULT_CAPTION_GROUPING_LONG;
  const prefix = format === "short" ? "shorts" : "long";
  const raw = (key: string) =>
    config[`${prefix}_caption_${key}`] ?? config[`caption_${key}`];

  const maxWords =
    Number(raw("max_words_per_chunk")) || defaults.maxWordsPerChunk;
  const maxLines = Number(raw("max_lines")) === 1 ? 1 : defaults.maxLines;
  const respectSentences = raw("respect_sentences") !== false;
  const minWords =
    Number(raw("min_words_per_chunk")) || defaults.minWordsPerChunk;

  return {
    maxWordsPerChunk: Math.max(2, Math.min(6, maxWords)),
    maxLines: maxLines as 1 | 2,
    respectSentences,
    minWordsPerChunk: Math.max(1, Math.min(maxWords, minWords)),
  };
}

/** @deprecated use CaptionModeId */
export type ShortCaptionEffectId = "viral-pop" | "viral-pulse" | "viral-static";
/** @deprecated use CaptionModeId */
export type LongCaptionEffectId = "doc-pill" | "doc-glow" | "doc-minimal";

export const SHORT_CAPTION_MODES: {
  id: CaptionModeId;
  label: string;
  hint: string;
  hyperframesId: CaptionModeId;
}[] = [
  {
    id: "caption-highlight",
    label: "Highlight TikTok",
    hint: "Fundo amarelo na palavra ativa — caption-highlight.",
    hyperframesId: "caption-highlight",
  },
  {
    id: "caption-kinetic-slam",
    label: "Kinetic Slam",
    hint: "Uma palavra em tela cheia com entrada explosiva — caption-kinetic-slam.",
    hyperframesId: "caption-kinetic-slam",
  },
  {
    id: "caption-neon-glow",
    label: "Neon Glow",
    hint: "Brilho ciano/rosa na palavra ativa — caption-neon-glow.",
    hyperframesId: "caption-neon-glow",
  },
  {
    id: "caption-gradient-fill",
    label: "Gradient Fill",
    hint: "Texto com gradiente e bounce na entrada — caption-gradient-fill.",
    hyperframesId: "caption-gradient-fill",
  },
  {
    id: "caption-weight-shift",
    label: "Weight Shift",
    hint: "Peso da fonte muda na palavra ativa — caption-weight-shift.",
    hyperframesId: "caption-weight-shift",
  },
  {
    id: "caption-pill-karaoke",
    label: "Pill Karaoke",
    hint: "Bloco pill com destaque karaoke — caption-pill-karaoke.",
    hyperframesId: "caption-pill-karaoke",
  },
  {
    id: "caption-glitch-rgb",
    label: "Glitch RGB",
    hint: "Aberração cromática + scanlines CRT — caption-glitch-rgb.",
    hyperframesId: "caption-glitch-rgb",
  },
  {
    id: "caption-matrix-decode",
    label: "Matrix Decode",
    hint: "Scramble de caracteres antes do reveal — caption-matrix-decode.",
    hyperframesId: "caption-matrix-decode",
  },
  {
    id: "caption-clip-wipe",
    label: "Clip Wipe",
    hint: "Revelação esquerda→direita por palavra — caption-clip-wipe.",
    hyperframesId: "caption-clip-wipe",
  },
  {
    id: "caption-particle-burst",
    label: "Particle Burst",
    hint: "Partículas coloridas na palavra ativa — caption-particle-burst.",
    hyperframesId: "caption-particle-burst",
  },
  {
    id: "caption-neon-accent",
    label: "Neon Accent",
    hint: "Neon multicolor com wiggle — caption-neon-accent.",
    hyperframesId: "caption-neon-accent",
  },
  {
    id: "caption-emoji-pop",
    label: "Emoji Pop",
    hint: "Emoji gigante com pop acima da palavra — caption-emoji-pop.",
    hyperframesId: "caption-emoji-pop",
  },
  {
    id: "caption-editorial-emphasis",
    label: "Editorial",
    hint: "Serif + sans com contraste de escala — caption-editorial-emphasis.",
    hyperframesId: "caption-editorial-emphasis",
  },
  {
    id: "caption-parallax-layers",
    label: "Parallax Layers",
    hint: "Profundidade simulada entre palavras — caption-parallax-layers.",
    hyperframesId: "caption-parallax-layers",
  },
  {
    id: "caption-texture",
    label: "Texture Fill",
    hint: "Textura animada no preenchimento — caption-texture.",
    hyperframesId: "caption-texture",
  },
  {
    id: "caption-blend-difference",
    label: "Blend Difference",
    hint: "Inversão automática mix-blend — caption-blend-difference.",
    hyperframesId: "caption-blend-difference",
  },
  {
    id: "morph-text",
    label: "Morph Text",
    hint: "Transição gooey entre palavras — morph-text.",
    hyperframesId: "morph-text",
  },
];

export const LONG_CAPTION_MODES: {
  id: CaptionModeId;
  label: string;
  hint: string;
  hyperframesId: CaptionModeId;
}[] = [
  {
    id: "caption-pill-karaoke",
    label: "Pill Karaoke",
    hint: "Pill escuro com palavra ativa em destaque — padrão 16:9.",
    hyperframesId: "caption-pill-karaoke",
  },
  {
    id: "caption-highlight",
    label: "Highlight",
    hint: "Destaque amarelo por palavra em formato horizontal.",
    hyperframesId: "caption-highlight",
  },
  {
    id: "caption-neon-glow",
    label: "Neon Glow",
    hint: "Glow dourado/ciano na palavra ativa.",
    hyperframesId: "caption-neon-glow",
  },
  {
    id: "caption-weight-shift",
    label: "Weight Shift",
    hint: "Contraste de peso tipográfico entre palavras.",
    hyperframesId: "caption-weight-shift",
  },
  {
    id: "caption-gradient-fill",
    label: "Gradient Fill",
    hint: "Gradiente na palavra ativa com entrada suave.",
    hyperframesId: "caption-gradient-fill",
  },
  {
    id: "caption-kinetic-slam",
    label: "Kinetic Slam",
    hint: "Palavra isolada com impacto central.",
    hyperframesId: "caption-kinetic-slam",
  },
  {
    id: "caption-glitch-rgb",
    label: "Glitch RGB",
    hint: "Aberração cromática estilo cyber/tech.",
    hyperframesId: "caption-glitch-rgb",
  },
  {
    id: "caption-matrix-decode",
    label: "Matrix Decode",
    hint: "Texto decodificado letra a letra.",
    hyperframesId: "caption-matrix-decode",
  },
  {
    id: "caption-clip-wipe",
    label: "Clip Wipe",
    hint: "Wipe horizontal na palavra ativa.",
    hyperframesId: "caption-clip-wipe",
  },
  {
    id: "caption-particle-burst",
    label: "Particle Burst",
    hint: "Explosão de partículas no destaque.",
    hyperframesId: "caption-particle-burst",
  },
  {
    id: "caption-neon-accent",
    label: "Neon Accent",
    hint: "Neon vibrante com drift físico.",
    hyperframesId: "caption-neon-accent",
  },
  {
    id: "caption-editorial-emphasis",
    label: "Editorial",
    hint: "Tipografia editorial com ênfase dramática.",
    hyperframesId: "caption-editorial-emphasis",
  },
  {
    id: "caption-parallax-layers",
    label: "Parallax Layers",
    hint: "Camadas com profundidade simulada.",
    hyperframesId: "caption-parallax-layers",
  },
  {
    id: "caption-texture",
    label: "Texture Fill",
    hint: "Preenchimento com textura animada.",
    hyperframesId: "caption-texture",
  },
  {
    id: "caption-blend-difference",
    label: "Blend Difference",
    hint: "Texto que inverte conforme o fundo.",
    hyperframesId: "caption-blend-difference",
  },
  {
    id: "morph-text",
    label: "Morph Text",
    hint: "Morph suave entre palavras.",
    hyperframesId: "morph-text",
  },
  {
    id: "caption-emoji-pop",
    label: "Emoji Pop",
    hint: "Emoji com pop elástico acima do texto.",
    hyperframesId: "caption-emoji-pop",
  },
];

/** Compat: UI antiga style + effect */
export const SHORT_CAPTION_STYLES = SHORT_CAPTION_MODES;
export const LONG_CAPTION_STYLES = LONG_CAPTION_MODES;
export const SHORT_CAPTION_EFFECTS = SHORT_CAPTION_MODES;
export const LONG_CAPTION_EFFECTS = LONG_CAPTION_MODES;

const LEGACY_SHORT_MODE: Record<string, CaptionModeId> = {
  "viral-pop": "caption-highlight",
  "viral-pulse": "caption-highlight",
  "viral-static": "caption-highlight",
  "shorts-viral": "caption-highlight",
  documentary: "caption-pill-karaoke",
};

const LEGACY_LONG_MODE: Record<string, CaptionModeId> = {
  "doc-pill": "caption-pill-karaoke",
  "doc-glow": "caption-neon-glow",
  "doc-minimal": "caption-weight-shift",
  documentary: "caption-pill-karaoke",
  "shorts-viral": "caption-highlight",
};

export function isCaptionModeId(raw?: string): raw is CaptionModeId {
  return CAPTION_MODE_IDS.includes(raw as CaptionModeId);
}

export function isWordByWordMode(mode: CaptionModeId): boolean {
  return (
    mode !== "caption-pill-karaoke" &&
    mode !== "caption-weight-shift" &&
    mode !== "caption-editorial-emphasis"
  );
}

export function resolveCaptionChunkStyle(mode: CaptionModeId): CaptionStyleId {
  return isWordByWordMode(mode) ? "shorts-viral" : "documentary";
}

export function migrateLegacyShortMode(
  style?: string,
  effect?: string,
  legacyCaption?: string,
  bgmPulse?: boolean
): CaptionModeId {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_SHORT_MODE[effect]) return LEGACY_SHORT_MODE[effect];
  if (style && LEGACY_SHORT_MODE[style]) return LEGACY_SHORT_MODE[style];
  if (legacyCaption === "documentary") return "caption-pill-karaoke";
  if (bgmPulse === false && !effect) return "caption-highlight";
  return "caption-highlight";
}

export function migrateLegacyLongMode(
  style?: string,
  effect?: string,
  legacyCaption?: string
): CaptionModeId {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_LONG_MODE[effect]) return LEGACY_LONG_MODE[effect];
  if (style && LEGACY_LONG_MODE[style]) return LEGACY_LONG_MODE[style];
  if (legacyCaption === "shorts-viral") return "caption-highlight";
  return "caption-pill-karaoke";
}

export function resolveShortCaptionMode(
  config: {
    caption_mode_short?: string;
    caption_style_short?: string;
    caption_effect_short?: string;
    caption_style?: string;
    shorts_caption_bgm_pulse?: boolean;
  } = {}
): CaptionModeId {
  if (isCaptionModeId(config.caption_mode_short))
    return config.caption_mode_short;
  return migrateLegacyShortMode(
    config.caption_style_short || config.caption_style,
    config.caption_effect_short,
    config.caption_style,
    config.shorts_caption_bgm_pulse
  );
}

export function resolveLongCaptionMode(
  config: {
    caption_mode_long?: string;
    caption_style_long?: string;
    caption_effect_long?: string;
    caption_style?: string;
  } = {}
): CaptionModeId {
  if (isCaptionModeId(config.caption_mode_long))
    return config.caption_mode_long;
  return migrateLegacyLongMode(
    config.caption_style_long || config.caption_style,
    config.caption_effect_long,
    config.caption_style
  );
}

export function resolveShortCaptionBgmPulse(
  mode: CaptionModeId,
  config: {
    caption_effect_short?: string;
    shorts_caption_bgm_pulse?: boolean;
  } = {}
): boolean {
  if (mode !== "caption-highlight") return false;
  if (config.caption_effect_short === "viral-static") return false;
  if (config.caption_effect_short === "viral-pulse") return true;
  if (config.shorts_caption_bgm_pulse === false) return false;
  return Boolean(config.shorts_caption_bgm_pulse ?? true);
}

/** @deprecated */
export function resolveShortCaptionStyle(raw?: string): CaptionStyleId {
  return resolveCaptionChunkStyle(migrateLegacyShortMode(raw));
}

/** @deprecated */
export function resolveLongCaptionStyle(raw?: string): CaptionStyleId {
  return resolveCaptionChunkStyle(migrateLegacyLongMode(raw));
}

/** @deprecated */
export function resolveShortCaptionEffect(
  raw?: string,
  legacyBgmPulse?: boolean
): ShortCaptionEffectId {
  const mode = migrateLegacyShortMode(
    undefined,
    raw,
    undefined,
    legacyBgmPulse
  );
  if (mode === "caption-highlight" && legacyBgmPulse === false)
    return "viral-static";
  if (mode === "caption-highlight" && legacyBgmPulse) return "viral-pulse";
  if (mode === "caption-highlight") return "viral-pop";
  if (mode === "caption-pill-karaoke") return "viral-static";
  return "viral-pop";
}

/** @deprecated */
export function resolveLongCaptionEffect(raw?: string): LongCaptionEffectId {
  const mode = migrateLegacyLongMode(undefined, raw);
  if (mode === "caption-neon-glow") return "doc-glow";
  if (mode === "caption-weight-shift") return "doc-minimal";
  return "doc-pill";
}
