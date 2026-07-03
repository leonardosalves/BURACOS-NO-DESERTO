import type { CSSProperties } from 'react';

export function themePanelBg(theme: string, accent: string): string {
  switch (theme) {
    case 'tech': return 'linear-gradient(135deg, rgba(8,12,16,0.92), rgba(0,229,255,0.14))';
    case 'ancient': return 'linear-gradient(135deg, rgba(22,16,12,0.94), rgba(197,168,128,0.18))';
    case 'nature': return 'linear-gradient(135deg, rgba(8,14,10,0.94), rgba(46,125,50,0.2))';
    case 'mysterious': return 'linear-gradient(135deg, rgba(12,8,16,0.94), rgba(124,77,255,0.2))';
    case 'industrial': return 'linear-gradient(135deg, rgba(16,16,18,0.94), rgba(255,61,0,0.16))';
    default: return `linear-gradient(135deg, rgba(10,10,14,0.92), ${accent}18)`;
  }
}

export function infoCardVariantStyle(variant: string, accent: string, theme: string): CSSProperties {
  if (theme !== 'classic') {
    return {
      background: themePanelBg(theme, accent),
      backdropFilter: 'blur(10px)',
      border: `1px solid ${accent}33`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: '0.5em',
    };
  }
  const map: Record<string, CSSProperties> = {
    glass: {
      background: 'linear-gradient(135deg, rgba(6,6,10,0.95), rgba(14,14,20,0.92))',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: '0.45em',
    },
    minimal: {
      background: 'rgba(5,5,8,0.7)',
      border: 'none',
      borderLeft: `2px dashed ${accent}`,
      borderRadius: '0.25em',
    },
    accent: {
      background: `linear-gradient(135deg, rgba(6,6,10,0.95), ${accent}14)`,
      border: `1px solid ${accent}44`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: '0.35em',
    },
    floating: {
      background: 'rgba(10,10,15,0.96)',
      border: `2px solid ${accent}`,
      borderRadius: '0.75em',
      boxShadow: `0 0.4em 1em ${accent}22`,
    },
  };
  return map[variant] || map.glass;
}

export function lowerThirdVariantShell(
  variant: string,
  accent: string,
  theme: string,
): { container: CSSProperties; title: CSSProperties; subtitle?: CSSProperties } {
  switch (variant) {
    case 'bild':
      return {
        container: {
          background: '#fff',
          boxShadow: `0.2em 0.2em 0 ${accent}`,
          padding: '0.45em 0.65em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        },
        title: { color: '#111', fontWeight: 900, textTransform: 'uppercase' as const },
        subtitle: {
          background: accent,
          color: '#fff',
          padding: '0.3em 0.55em',
          marginTop: '0.25em',
          boxShadow: '0.15em 0.15em 0 #fff',
          fontWeight: 800,
          textTransform: 'uppercase' as const,
        },
      };
    case 'bold-block':
      return {
        container: {
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          borderRadius: '0.25em',
        },
        title: {
          background: accent,
          color: '#0a0a0a',
          fontWeight: 900,
          padding: '0.45em 0.6em',
          textTransform: 'uppercase' as const,
        },
        subtitle: {
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          padding: '0.45em 0.6em',
          fontWeight: 600,
        },
      };
    case 'accent-underline':
      return {
        container: {
          background: 'rgba(8,8,12,0.88)',
          padding: '0.4em 0.55em 0.5em',
          borderBottom: `3px solid ${accent}`,
        },
        title: { color: '#fff', fontWeight: 800, textTransform: 'uppercase' as const },
        subtitle: { color: '#a1a1aa', fontWeight: 500, marginTop: '0.15em' },
      };
    case 'soft-pill':
      return {
        container: {
          background: 'rgba(10,10,14,0.82)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${accent}44`,
          borderRadius: '999px',
          padding: '0.4em 0.75em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        },
        title: { color: '#fff', fontWeight: 700 },
        subtitle: { color: '#d4d4d8', fontSize: '0.85em' },
      };
    case 'clean-bar':
      return {
        container: {
          background: 'rgba(6,6,10,0.9)',
          borderLeft: `4px solid ${accent}`,
          padding: '0.35em 0.55em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45em',
        },
        title: { color: '#fff', fontWeight: 800, letterSpacing: '0.04em' },
        subtitle: { color: accent, fontWeight: 600, fontSize: '0.82em' },
      };
    case 'glass':
    default:
      return {
        container: {
          background: themePanelBg(theme, accent),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${accent}44`,
          borderRadius: '0.45em',
          padding: '0.4em 0.6em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        },
        title: { color: '#fff', fontWeight: 800 },
        subtitle: { color: '#d4d4d8', fontSize: '0.85em' },
      };
  }
}

export function kineticStyleProps(style: string, accent: string): CSSProperties {
  if (style === 'glitch') {
    return {
      color: '#e2e8f0',
      textShadow: `-1px 0 #ff4d6d, 1px 0 #22d3ee`,
      letterSpacing: '0.08em',
    };
  }
  if (style === 'reveal') {
    return {
      color: accent,
      borderBottom: `2px solid ${accent}`,
      letterSpacing: '0.12em',
    };
  }
  return {
    color: accent,
    textShadow: `0 0 0.35em ${accent}88`,
    transform: 'scale(1.02)',
  };
}