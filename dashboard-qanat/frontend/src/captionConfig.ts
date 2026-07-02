/** HyperFrames caption modes portados para Remotion (Fase 1 + 2). */

export type CaptionModeId =
  | 'caption-highlight'
  | 'caption-kinetic-slam'
  | 'caption-pill-karaoke'
  | 'caption-neon-glow'
  | 'caption-weight-shift'
  | 'caption-gradient-fill'
  | 'caption-glitch-rgb'
  | 'caption-matrix-decode'
  | 'caption-clip-wipe'
  | 'caption-particle-burst';

export const CAPTION_MODE_IDS: CaptionModeId[] = [
  'caption-highlight',
  'caption-kinetic-slam',
  'caption-pill-karaoke',
  'caption-neon-glow',
  'caption-weight-shift',
  'caption-gradient-fill',
  'caption-glitch-rgb',
  'caption-matrix-decode',
  'caption-clip-wipe',
  'caption-particle-burst',
];

export type CaptionStyleId = 'shorts-viral' | 'documentary';

/** @deprecated use CaptionModeId */
export type ShortCaptionEffectId = 'viral-pop' | 'viral-pulse' | 'viral-static';
/** @deprecated use CaptionModeId */
export type LongCaptionEffectId = 'doc-pill' | 'doc-glow' | 'doc-minimal';

export const SHORT_CAPTION_MODES: {
  id: CaptionModeId;
  label: string;
  hint: string;
  hyperframesId: CaptionModeId;
}[] = [
  { id: 'caption-highlight', label: 'Highlight TikTok', hint: 'Fundo amarelo na palavra ativa — caption-highlight.', hyperframesId: 'caption-highlight' },
  { id: 'caption-kinetic-slam', label: 'Kinetic Slam', hint: 'Uma palavra em tela cheia com entrada explosiva — caption-kinetic-slam.', hyperframesId: 'caption-kinetic-slam' },
  { id: 'caption-neon-glow', label: 'Neon Glow', hint: 'Brilho ciano/rosa na palavra ativa — caption-neon-glow.', hyperframesId: 'caption-neon-glow' },
  { id: 'caption-gradient-fill', label: 'Gradient Fill', hint: 'Texto com gradiente e bounce na entrada — caption-gradient-fill.', hyperframesId: 'caption-gradient-fill' },
  { id: 'caption-weight-shift', label: 'Weight Shift', hint: 'Peso da fonte muda na palavra ativa — caption-weight-shift.', hyperframesId: 'caption-weight-shift' },
  { id: 'caption-pill-karaoke', label: 'Pill Karaoke', hint: 'Bloco pill com destaque karaoke — caption-pill-karaoke.', hyperframesId: 'caption-pill-karaoke' },
  { id: 'caption-glitch-rgb', label: 'Glitch RGB', hint: 'Aberração cromática + scanlines CRT — caption-glitch-rgb.', hyperframesId: 'caption-glitch-rgb' },
  { id: 'caption-matrix-decode', label: 'Matrix Decode', hint: 'Scramble de caracteres antes do reveal — caption-matrix-decode.', hyperframesId: 'caption-matrix-decode' },
  { id: 'caption-clip-wipe', label: 'Clip Wipe', hint: 'Revelação esquerda→direita por palavra — caption-clip-wipe.', hyperframesId: 'caption-clip-wipe' },
  { id: 'caption-particle-burst', label: 'Particle Burst', hint: 'Partículas coloridas na palavra ativa — caption-particle-burst.', hyperframesId: 'caption-particle-burst' },
];

export const LONG_CAPTION_MODES: {
  id: CaptionModeId;
  label: string;
  hint: string;
  hyperframesId: CaptionModeId;
}[] = [
  { id: 'caption-pill-karaoke', label: 'Pill Karaoke', hint: 'Pill escuro com palavra ativa em destaque — padrão 16:9.', hyperframesId: 'caption-pill-karaoke' },
  { id: 'caption-highlight', label: 'Highlight', hint: 'Destaque amarelo por palavra em formato horizontal.', hyperframesId: 'caption-highlight' },
  { id: 'caption-neon-glow', label: 'Neon Glow', hint: 'Glow dourado/ciano na palavra ativa.', hyperframesId: 'caption-neon-glow' },
  { id: 'caption-weight-shift', label: 'Weight Shift', hint: 'Contraste de peso tipográfico entre palavras.', hyperframesId: 'caption-weight-shift' },
  { id: 'caption-gradient-fill', label: 'Gradient Fill', hint: 'Gradiente na palavra ativa com entrada suave.', hyperframesId: 'caption-gradient-fill' },
  { id: 'caption-kinetic-slam', label: 'Kinetic Slam', hint: 'Palavra isolada com impacto central.', hyperframesId: 'caption-kinetic-slam' },
  { id: 'caption-glitch-rgb', label: 'Glitch RGB', hint: 'Aberração cromática estilo cyber/tech.', hyperframesId: 'caption-glitch-rgb' },
  { id: 'caption-matrix-decode', label: 'Matrix Decode', hint: 'Texto decodificado letra a letra.', hyperframesId: 'caption-matrix-decode' },
  { id: 'caption-clip-wipe', label: 'Clip Wipe', hint: 'Wipe horizontal na palavra ativa.', hyperframesId: 'caption-clip-wipe' },
  { id: 'caption-particle-burst', label: 'Particle Burst', hint: 'Explosão de partículas no destaque.', hyperframesId: 'caption-particle-burst' },
];

/** Compat: UI antiga style + effect */
export const SHORT_CAPTION_STYLES = SHORT_CAPTION_MODES;
export const LONG_CAPTION_STYLES = LONG_CAPTION_MODES;
export const SHORT_CAPTION_EFFECTS = SHORT_CAPTION_MODES;
export const LONG_CAPTION_EFFECTS = LONG_CAPTION_MODES;

const LEGACY_SHORT_MODE: Record<string, CaptionModeId> = {
  'viral-pop': 'caption-highlight',
  'viral-pulse': 'caption-highlight',
  'viral-static': 'caption-highlight',
  'shorts-viral': 'caption-highlight',
  documentary: 'caption-pill-karaoke',
};

const LEGACY_LONG_MODE: Record<string, CaptionModeId> = {
  'doc-pill': 'caption-pill-karaoke',
  'doc-glow': 'caption-neon-glow',
  'doc-minimal': 'caption-weight-shift',
  documentary: 'caption-pill-karaoke',
  'shorts-viral': 'caption-highlight',
};

export function isCaptionModeId(raw?: string): raw is CaptionModeId {
  return CAPTION_MODE_IDS.includes(raw as CaptionModeId);
}

export function isWordByWordMode(mode: CaptionModeId): boolean {
  return mode !== 'caption-pill-karaoke' && mode !== 'caption-weight-shift';
}

export function resolveCaptionChunkStyle(mode: CaptionModeId): CaptionStyleId {
  return isWordByWordMode(mode) ? 'shorts-viral' : 'documentary';
}

export function migrateLegacyShortMode(
  style?: string,
  effect?: string,
  legacyCaption?: string,
  bgmPulse?: boolean,
): CaptionModeId {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_SHORT_MODE[effect]) return LEGACY_SHORT_MODE[effect];
  if (style && LEGACY_SHORT_MODE[style]) return LEGACY_SHORT_MODE[style];
  if (legacyCaption === 'documentary') return 'caption-pill-karaoke';
  if (bgmPulse === false && !effect) return 'caption-highlight';
  return 'caption-highlight';
}

export function migrateLegacyLongMode(
  style?: string,
  effect?: string,
  legacyCaption?: string,
): CaptionModeId {
  if (isCaptionModeId(effect)) return effect;
  if (isCaptionModeId(style)) return style;
  if (effect && LEGACY_LONG_MODE[effect]) return LEGACY_LONG_MODE[effect];
  if (style && LEGACY_LONG_MODE[style]) return LEGACY_LONG_MODE[style];
  if (legacyCaption === 'shorts-viral') return 'caption-highlight';
  return 'caption-pill-karaoke';
}

export function resolveShortCaptionMode(config: {
  caption_mode_short?: string;
  caption_style_short?: string;
  caption_effect_short?: string;
  caption_style?: string;
  shorts_caption_bgm_pulse?: boolean;
} = {}): CaptionModeId {
  if (isCaptionModeId(config.caption_mode_short)) return config.caption_mode_short;
  return migrateLegacyShortMode(
    config.caption_style_short || config.caption_style,
    config.caption_effect_short,
    config.caption_style,
    config.shorts_caption_bgm_pulse,
  );
}

export function resolveLongCaptionMode(config: {
  caption_mode_long?: string;
  caption_style_long?: string;
  caption_effect_long?: string;
  caption_style?: string;
} = {}): CaptionModeId {
  if (isCaptionModeId(config.caption_mode_long)) return config.caption_mode_long;
  return migrateLegacyLongMode(
    config.caption_style_long || config.caption_style,
    config.caption_effect_long,
    config.caption_style,
  );
}

export function resolveShortCaptionBgmPulse(
  mode: CaptionModeId,
  config: { caption_effect_short?: string; shorts_caption_bgm_pulse?: boolean } = {},
): boolean {
  if (mode !== 'caption-highlight') return false;
  if (config.caption_effect_short === 'viral-static') return false;
  if (config.caption_effect_short === 'viral-pulse') return true;
  if (config.shorts_caption_bgm_pulse === false) return false;
  return config.shorts_caption_bgm_pulse !== false;
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
export function resolveShortCaptionEffect(raw?: string, legacyBgmPulse?: boolean): ShortCaptionEffectId {
  const mode = migrateLegacyShortMode(undefined, raw, undefined, legacyBgmPulse);
  if (mode === 'caption-highlight' && legacyBgmPulse === false) return 'viral-static';
  if (mode === 'caption-highlight' && legacyBgmPulse) return 'viral-pulse';
  if (mode === 'caption-highlight') return 'viral-pop';
  if (mode === 'caption-pill-karaoke') return 'viral-static';
  return 'viral-pop';
}

/** @deprecated */
export function resolveLongCaptionEffect(raw?: string): LongCaptionEffectId {
  const mode = migrateLegacyLongMode(undefined, raw);
  if (mode === 'caption-neon-glow') return 'doc-glow';
  if (mode === 'caption-weight-shift') return 'doc-minimal';
  return 'doc-pill';
}