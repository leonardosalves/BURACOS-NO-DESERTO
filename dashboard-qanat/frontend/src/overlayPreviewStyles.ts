import type { CSSProperties } from 'react';

export function themePanelBg(theme: string, accent: string): string {
  switch (theme) {
    case 'minimal':
      return 'linear-gradient(135deg, rgba(12,12,14,0.96), rgba(24,24,28,0.94))';
    case 'modern':
      return 'linear-gradient(145deg, rgba(8,8,12,0.9), rgba(18,18,26,0.88))';
    case 'futuristic':
      return 'linear-gradient(135deg, rgba(4,8,14,0.94), rgba(0,229,255,0.12))';
    case 'neon':
      return `linear-gradient(135deg, rgba(6,4,14,0.95), ${accent}22)`;
    case 'tech':
      return 'linear-gradient(135deg, rgba(8,12,16,0.92), rgba(0,229,255,0.14))';
    case 'ancient':
      return 'linear-gradient(135deg, rgba(22,16,12,0.94), rgba(197,168,128,0.18))';
    case 'nature':
      return 'linear-gradient(135deg, rgba(8,14,10,0.94), rgba(46,125,50,0.2))';
    case 'mysterious':
      return 'linear-gradient(135deg, rgba(12,8,16,0.94), rgba(124,77,255,0.2))';
    case 'industrial':
      return 'linear-gradient(135deg, rgba(16,16,18,0.94), rgba(255,61,0,0.16))';
    default:
      return `linear-gradient(145deg, rgba(8,8,12,0.9), rgba(18,18,26,0.87))`;
  }
}

type BarChartItem = {
  label?: string;
  value?: number;
  displayValue?: string;
  color?: string;
};

export function barChartPreviewShell(theme: string, accent: string): {
  container: CSSProperties;
  title: CSSProperties;
  accentStripe: CSSProperties;
  label: CSSProperties;
  track: CSSProperties;
} {
  const bg = themePanelBg(theme, accent);
  return {
    container: {
      background: bg,
      backdropFilter: 'blur(8px)',
      border: theme === 'neon'
        ? `1px solid ${accent}66`
        : theme === 'minimal'
          ? '1px solid rgba(255,255,255,0.08)'
          : `1px solid ${accent}33`,
      borderRadius: theme === 'industrial' ? '0.15em' : '0.45em',
      padding: '0.45em 0.55em',
      boxShadow: theme === 'neon' ? `0 0 0.6em ${accent}33` : undefined,
    },
    title: {
      color: '#f8fafc',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      fontSize: '0.72em',
    },
    accentStripe: {
      width: '0.18em',
      alignSelf: 'stretch',
      background: accent,
      borderRadius: '0.1em',
      flexShrink: 0,
    },
    label: {
      color: 'rgba(248,250,252,0.82)',
      fontSize: '0.62em',
      fontWeight: 500,
    },
    track: {
      height: '0.35em',
      background: 'rgba(248,250,252,0.08)',
      borderRadius: '0.2em',
      overflow: 'hidden',
    },
  };
}

export function normalizeBarChartItems(
  raw: unknown,
  accent: string,
): BarChartItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      { label: 'Foguete Químico', value: 100, displayValue: '100', color: accent },
      { label: 'Propulsão Plasma', value: 10, displayValue: '90% menos', color: '#4ECDC4' },
    ];
  }
  return raw.slice(0, 4).map((item, index) => {
    const row = item as BarChartItem;
    return {
      label: String(row.label || `Item ${index + 1}`),
      value: Number(row.value) || 0,
      displayValue: row.displayValue ? String(row.displayValue) : undefined,
      color: row.color ? String(row.color) : (index === 0 ? accent : '#4ECDC4'),
    };
  });
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
    case 'color-block':
      return {
        container: {
          background: accent,
          padding: '0.4em 0.65em',
          borderRadius: '0.2em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        },
        title: { color: '#0a0a0a', fontWeight: 900, textTransform: 'uppercase' as const },
        subtitle: { color: 'rgba(0,0,0,0.75)', fontWeight: 600, fontSize: '0.82em' },
      };
    case 'dark-card':
      return {
        container: {
          background: 'rgba(12,12,16,0.94)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0.55em',
          padding: '0.45em 0.6em',
        },
        title: { color: '#fff', fontWeight: 800 },
        subtitle: { color: '#a1a1aa', fontSize: '0.82em', marginTop: '0.12em' },
      };
    case 'kicker-name':
      return {
        container: { display: 'flex', flexDirection: 'column', gap: '0.1em' },
        title: { color: '#fff', fontWeight: 900, fontSize: '1.05em' },
        subtitle: {
          color: accent,
          fontWeight: 700,
          fontSize: '0.65em',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.14em',
        },
      };
    case 'mask-reveal':
      return {
        container: {
          background: 'rgba(8,8,12,0.9)',
          borderLeft: `4px solid ${accent}`,
          padding: '0.35em 0.55em',
        },
        title: { color: '#fff', fontWeight: 800 },
        subtitle: { color: '#d4d4d8', fontSize: '0.82em' },
      };
    case 'side-rule':
      return {
        container: {
          display: 'flex',
          alignItems: 'center',
          gap: '0.45em',
          padding: '0.3em 0',
        },
        title: { color: '#fff', fontWeight: 800 },
        subtitle: { color: accent, fontWeight: 600, fontSize: '0.82em' },
      };
    case 'stack-bars':
      return {
        container: { display: 'flex', flexDirection: 'column', gap: '0.15em' },
        title: {
          background: accent,
          color: '#0a0a0a',
          fontWeight: 900,
          padding: '0.25em 0.5em',
          textTransform: 'uppercase' as const,
        },
        subtitle: {
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          padding: '0.2em 0.5em',
          fontSize: '0.82em',
        },
      };
    case 'youtube-bar':
      return {
        container: {
          background: 'rgba(18,18,18,0.92)',
          borderRadius: '0.35em',
          padding: '0.35em 0.5em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        },
        title: { color: '#fff', fontWeight: 700, fontSize: '0.9em' },
        subtitle: { color: '#aaa', fontSize: '0.72em' },
      };
    case 'news-ticker':
      return {
        container: {
          background: 'rgba(180,0,0,0.92)',
          padding: '0.3em 0.5em',
          width: '100%',
        },
        title: { color: '#fff', fontWeight: 800, fontSize: '0.75em', textTransform: 'uppercase' as const },
        subtitle: { color: '#ffe4e4', fontSize: '0.72em' },
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
  if (style === 'reveal' || style === 'mask-reveal') {
    return {
      color: accent,
      borderBottom: `2px solid ${accent}`,
      letterSpacing: '0.12em',
      clipPath: 'inset(0 15% 0 0)',
    };
  }
  if (style === 'blend-difference') {
    return {
      color: '#fff',
      mixBlendMode: 'difference',
      letterSpacing: '0.1em',
    };
  }
  if (style === 'morph-text') {
    return {
      color: accent,
      filter: 'blur(0.3px)',
      transform: 'scale(1.04)',
      letterSpacing: '0.06em',
    };
  }
  if (style === 'texture-mask') {
    return {
      background: `linear-gradient(120deg, ${accent}, #fff, ${accent})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 900,
    };
  }
  if (style === 'typewriter') {
    return { color: accent, fontFamily: 'monospace', letterSpacing: '0.05em' };
  }
  if (style === 'fade-up') {
    return { color: accent, opacity: 0.85, transform: 'translateY(-2px)' };
  }
  return {
    color: accent,
    textShadow: `0 0 0.35em ${accent}88`,
    transform: 'scale(1.02)',
  };
}

export type TimelineEventDraft = {
  year: string;
  description: string;
  highlight?: boolean;
};

export function normalizeTimelineEvents(props: Record<string, unknown>): TimelineEventDraft[] {
  const raw = props.events;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((e, i) => {
      const item = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      return {
        year: String(item.year || `Evento ${i + 1}`),
        description: String(item.description || item.label || '…'),
        highlight: item.highlight === true,
      };
    });
  }
  return [
    { year: '2008', description: 'Início do projeto' },
    { year: '2015', description: 'Expansão' },
    { year: '2024', description: 'Marco atual', highlight: true },
  ];
}

export function infoTimelineTitleStyle(
  theme: string,
  accent: string,
  isShort: boolean,
): CSSProperties {
  const pad = isShort ? '0.9em 1.4em' : '0.65em 1em';
  switch (theme) {
    case 'ancient':
      return {
        background: 'linear-gradient(135deg, rgba(20, 16, 12, 0.97) 0%, rgba(32, 24, 18, 0.95) 100%)',
        border: `3px double ${accent}`,
        borderRadius: '4px',
        padding: pad,
        boxShadow: `0 8px 24px rgba(0,0,0,0.6), inset 0 0 10px ${accent}15`,
      };
    case 'tech':
      return {
        background: 'rgba(4, 8, 12, 0.93)',
        backgroundImage: `radial-gradient(${accent}15 1px, transparent 0)`,
        backgroundSize: '8px 8px',
        border: `1px solid ${accent}33`,
        borderRadius: 0,
        padding: pad,
        boxShadow: `0 0 20px ${accent}15`,
      };
    case 'nature':
      return {
        background: 'linear-gradient(135deg, rgba(6, 12, 8, 0.97) 0%, rgba(12, 24, 16, 0.95) 100%)',
        border: `1px solid ${accent}30`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: '24px 6px 24px 6px',
        padding: pad,
        boxShadow: `0 8px 32px ${accent}15`,
      };
    case 'industrial':
      return {
        background: 'linear-gradient(135deg, rgba(14, 14, 16, 0.99) 0%, rgba(24, 24, 28, 0.97) 100%)',
        border: '2px solid #333336',
        borderLeft: `6px solid ${accent}`,
        borderRadius: '2px',
        padding: pad,
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
      };
    case 'mysterious':
      return {
        background: 'linear-gradient(135deg, rgba(10, 6, 14, 0.96) 0%, rgba(20, 12, 28, 0.94) 100%)',
        border: `1px solid ${accent}40`,
        borderRadius: '12px',
        padding: pad,
        boxShadow: `0 8px 32px ${accent}25, inset 0 0 15px rgba(255,255,255,0.03)`,
      };
    case 'classic':
    default:
      return {
        background: 'linear-gradient(145deg, rgba(6,6,10,0.97) 0%, rgba(14,14,22,0.95) 100%)',
        backdropFilter: 'blur(16px)',
        borderRadius: isShort ? 16 : 12,
        padding: pad,
        border: `1px solid ${accent}55`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
      };
  }
}