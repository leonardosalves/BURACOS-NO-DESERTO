import type { BlockProgressBarDraft } from './BlockProgressBarEditor';

export type BlockProgressDesign = BlockProgressBarDraft['design'];

export type DesignTokens = {
  trackH: number;
  trackBg: string;
  fill: string;
  fillGlow: string;
  iconGap: number;
};

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
      };
    case 'tech':
      return {
        trackH: 4,
        trackBg: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px)',
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: `0 0 12px ${accent}55`,
        iconGap: 6,
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

export function markerCenterPercent(start: number, duration: number, total: number) {
  return ((start + duration / 2) / Math.max(1, total)) * 100;
}