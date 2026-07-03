export type BlockProgressDesign =
  | 'cinematic' | 'neon' | 'minimal' | 'documentary' | 'tech'
  | 'dashed' | 'dotted' | 'bold' | 'glass' | 'elegant' | 'gradient' | 'glow' | 'retro' | 'outline';

export type ExtraLineStyle = {
  offset: number;
  height: number;
  background: string;
};

export type DesignTokens = {
  trackH: number;
  trackBg: string;
  fill: string;
  fillGlow: string;
  iconGap: number;
  trackRadius?: number | string;
  fillRadius?: number | string;
  trackBorder?: string;
  fillBorder?: string;
  trackBoxShadow?: string;
  fillBoxShadow?: string;
  extraLine?: ExtraLineStyle | null;
  backdropBlur?: number;
};

export type BarLineCss = {
  background?: string;
  borderRadius?: number | string;
  border?: string;
  boxShadow?: string;
  backdropFilter?: string;
};

export const BLOCK_PROGRESS_DESIGNS: BlockProgressDesign[] = [
  'cinematic', 'neon', 'minimal', 'documentary', 'tech',
  'dashed', 'dotted', 'bold', 'glass', 'elegant', 'gradient', 'glow', 'retro', 'outline',
];

export function normalizeBlockProgressDesign(raw: unknown): BlockProgressDesign {
  const id = String(raw || 'cinematic').toLowerCase() as BlockProgressDesign;
  return BLOCK_PROGRESS_DESIGNS.includes(id) ? id : 'cinematic';
}

export function blockProgressDesignTokens(design: BlockProgressDesign, accent: string): DesignTokens {
  switch (design) {
    case 'neon':
      return {
        trackH: 4,
        trackBg: 'rgba(0,255,255,0.12)',
        fill: `linear-gradient(90deg, #00E5FF, ${accent})`,
        fillGlow: '0 0 16px #00E5FF88, 0 0 8px rgba(212,175,55,0.4)',
        iconGap: 6,
      };
    case 'minimal':
      return {
        trackH: 2,
        trackBg: 'rgba(255,255,255,0.1)',
        fill: 'rgba(255,255,255,0.85)',
        fillGlow: 'none',
        iconGap: 5,
      };
    case 'documentary':
      return {
        trackH: 3,
        trackBg: 'rgba(197,168,128,0.15)',
        fill: `linear-gradient(90deg, ${accent}66, ${accent})`,
        fillGlow: `0 0 10px ${accent}44`,
        iconGap: 7,
        extraLine: { offset: 1, height: 1, background: `${accent}33` },
      };
    case 'tech':
      return {
        trackH: 4,
        trackBg: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px)',
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: `0 0 12px ${accent}55`,
        iconGap: 6,
      };
    case 'dashed':
      return {
        trackH: 3,
        trackBg: 'transparent',
        trackBorder: '1.5px dashed rgba(255,255,255,0.35)',
        fill: `linear-gradient(90deg, ${accent}99, ${accent})`,
        fillGlow: 'none',
        iconGap: 7,
        trackRadius: 2,
        fillRadius: 2,
      };
    case 'dotted':
      return {
        trackH: 4,
        trackBg: 'radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)',
        trackBoxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        fill: accent,
        fillGlow: `0 0 6px ${accent}55`,
        iconGap: 6,
        trackRadius: 4,
        fillRadius: 4,
      };
    case 'bold':
      return {
        trackH: 6,
        trackBg: 'rgba(0,0,0,0.35)',
        fill: accent,
        fillGlow: `0 0 8px ${accent}77`,
        iconGap: 8,
        trackRadius: 3,
        fillRadius: 3,
      };
    case 'glass':
      return {
        trackH: 5,
        trackBg: 'rgba(255,255,255,0.12)',
        trackBorder: '1px solid rgba(255,255,255,0.22)',
        trackBoxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        fill: `linear-gradient(90deg, ${accent}55, ${accent}cc)`,
        fillGlow: `0 0 14px ${accent}44`,
        iconGap: 7,
        trackRadius: 8,
        fillRadius: 8,
        backdropBlur: 6,
      };
    case 'elegant':
      return {
        trackH: 2,
        trackBg: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: 'none',
        iconGap: 8,
        trackRadius: 1,
        fillRadius: 1,
        extraLine: { offset: 2, height: 1, background: `${accent}22` },
      };
    case 'gradient':
      return {
        trackH: 4,
        trackBg: 'rgba(255,255,255,0.08)',
        fill: `linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, ${accent})`,
        fillGlow: '0 0 14px rgba(255,217,61,0.35)',
        iconGap: 7,
        trackRadius: 4,
        fillRadius: 4,
      };
    case 'glow':
      return {
        trackH: 5,
        trackBg: 'rgba(0,0,0,0.45)',
        trackBorder: `1px solid ${accent}33`,
        fill: accent,
        fillGlow: `0 0 18px ${accent}, 0 0 36px ${accent}88, inset 0 0 8px rgba(255,255,255,0.25)`,
        fillBoxShadow: `0 0 18px ${accent}, 0 0 36px ${accent}66`,
        iconGap: 8,
        trackRadius: 6,
        fillRadius: 6,
      };
    case 'retro':
      return {
        trackH: 5,
        trackBg: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 3px), rgba(255,255,255,0.06)',
        fill: `repeating-linear-gradient(90deg, ${accent} 0 6px, ${accent}cc 6px 8px)`,
        fillGlow: 'none',
        iconGap: 7,
        trackRadius: 0,
        fillRadius: 0,
        trackBorder: '1px solid rgba(255,255,255,0.12)',
      };
    case 'outline':
      return {
        trackH: 4,
        trackBg: 'transparent',
        trackBorder: `1.5px solid ${accent}55`,
        fill: 'transparent',
        fillBorder: `2px solid ${accent}`,
        fillGlow: `0 0 10px ${accent}44`,
        iconGap: 7,
        trackRadius: 4,
        fillRadius: 4,
      };
    case 'cinematic':
    default:
      return {
        trackH: 3,
        trackBg: 'rgba(255,255,255,0.08)',
        fill: `linear-gradient(90deg, ${accent}88, ${accent})`,
        fillGlow: `0 0 12px ${accent}66`,
        iconGap: 8,
      };
  }
}

export function barTrackLineStyle(tokens: DesignTokens): BarLineCss {
  return {
    background: tokens.trackBg,
    borderRadius: tokens.trackRadius ?? tokens.trackH,
    border: tokens.trackBorder,
    boxShadow: tokens.trackBoxShadow,
    backdropFilter: tokens.backdropBlur ? `blur(${tokens.backdropBlur}px)` : undefined,
  };
}

export function barFillLineStyle(tokens: DesignTokens): BarLineCss {
  return {
    background: tokens.fill,
    borderRadius: tokens.fillRadius ?? tokens.trackRadius ?? tokens.trackH,
    border: tokens.fillBorder,
    boxShadow: tokens.fillBoxShadow || tokens.fillGlow,
  };
}

export function barStackBelowTrack(tokens: DesignTokens): number {
  if (!tokens.extraLine) return 0;
  return tokens.extraLine.offset + tokens.extraLine.height;
}

export function barIconRowOffset(tokens: DesignTokens): number {
  return tokens.trackH + barStackBelowTrack(tokens) + tokens.iconGap;
}

/** Centro do marcador na barra (%), com margem nas bordas para não cortar ícones. */
export function markerCenterPercent(
  start: number,
  duration: number,
  total: number,
  blockCount = 1,
) {
  const raw = ((start + duration / 2) / Math.max(1, total)) * 100;
  if (blockCount <= 1) return 50;
  const edgePad = Math.min(8, Math.max(2.2, 52 / blockCount));
  return Math.min(100 - edgePad, Math.max(edgePad, raw));
}