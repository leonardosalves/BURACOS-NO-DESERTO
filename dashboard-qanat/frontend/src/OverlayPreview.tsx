import React from 'react';
import {
  LOTTIE_ICON_OPTIONS,
  OVERLAY_POSITIONS,
  OVERLAY_TYPE_LABELS,
  overlaySummary,
  type OverlayDraft,
} from './overlayEditorConfig';

type Props = {
  overlay: OverlayDraft;
  aspectRatio?: '16:9' | '9:16' | string;
  accentColor?: string;
  sceneNarration?: string;
  className?: string;
};

const LOTTIE_EMOJI: Record<string, string> = {
  sparkles: '✨',
  flame: '🔥',
  earth: '🌍',
  info: 'ℹ️',
  gear: '⚙️',
  shield: '🛡️',
  crown: '👑',
  science: '⚡',
  history: '🕐',
  nature: '🌿',
  money: '💰',
  warning: '⚠️',
  compass: '🧭',
  book: '📖',
  heart: '❤️',
  lightbulb: '💡',
};

function positionStyle(position: string, isShort: boolean): React.CSSProperties {
  const pad = isShort ? '8%' : '6%';
  const base: Record<string, React.CSSProperties> = {
    'bottom-left': { bottom: pad, left: pad },
    'bottom-right': { bottom: pad, right: pad },
    'bottom-center': { bottom: pad, left: '50%', transform: 'translateX(-50%)' },
    'top-left': { top: pad, left: pad },
    'top-right': { top: pad, right: pad },
    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  };
  return base[position] || base['bottom-left'];
}

function themeBg(theme: string): string {
  switch (theme) {
    case 'tech':
      return 'linear-gradient(135deg, rgba(15,20,28,0.92), rgba(0,229,255,0.12))';
    case 'ancient':
      return 'linear-gradient(135deg, rgba(36,24,14,0.94), rgba(197,168,128,0.15))';
    case 'nature':
      return 'linear-gradient(135deg, rgba(10,26,18,0.94), rgba(46,125,50,0.2))';
    case 'mysterious':
      return 'linear-gradient(135deg, rgba(18,10,28,0.94), rgba(124,77,255,0.18))';
    case 'industrial':
      return 'linear-gradient(135deg, rgba(18,18,20,0.94), rgba(255,61,0,0.15))';
    default:
      return 'linear-gradient(135deg, rgba(12,12,18,0.9), rgba(212,175,55,0.12))';
  }
}

export function OverlayPreview({
  overlay,
  aspectRatio = '16:9',
  accentColor = '#D4AF37',
  sceneNarration,
  className = '',
}: Props) {
  const isShort = aspectRatio === '9:16';
  const props = overlay.props || {};
  const position = String(props.position || 'bottom-left');
  const variant = String(props.variant || 'glass');
  const theme = String(props.theme || 'classic');
  const iconKey = String(props.iconType || '');
  const iconEmoji = LOTTIE_EMOJI[iconKey] || (iconKey ? '◆' : '');
  const iconLabel = LOTTIE_ICON_OPTIONS.find((i) => i.id === iconKey)?.label;

  const renderOverlayContent = () => {
    switch (overlay.type) {
      case 'lower-third':
        return (
          <div
            className="rounded-lg border backdrop-blur-sm shadow-lg max-w-[85%]"
            style={{
              ...positionStyle(position, isShort),
              background: variant === 'bold-block'
                ? accentColor
                : themeBg(theme),
              borderColor: `${accentColor}55`,
              padding: isShort ? '0.55em 0.75em' : '0.5em 0.7em',
            }}
          >
            <div className="flex items-center gap-1.5">
              {iconEmoji && <span className="text-[1.1em] leading-none">{iconEmoji}</span>}
              <div className="min-w-0">
                <p className="font-bold text-white truncate" style={{ fontSize: isShort ? '0.75em' : '0.85em' }}>
                  {String(props.title || 'Título')}
                </p>
                {props.subtitle && (
                  <p className="text-zinc-300 truncate opacity-90" style={{ fontSize: '0.62em' }}>
                    {String(props.subtitle)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'info-card':
        return (
          <div
            className="rounded-xl border backdrop-blur-md shadow-xl max-w-[72%]"
            style={{
              ...positionStyle(position, isShort),
              background: themeBg(theme),
              borderColor: `${accentColor}44`,
              padding: '0.6em 0.75em',
            }}
          >
            <div className="flex gap-1.5 items-start">
              {iconEmoji && <span className="text-[1.2em]">{iconEmoji}</span>}
              <div className="min-w-0">
                <p className="font-bold text-white" style={{ fontSize: '0.72em' }}>{String(props.title || 'Info')}</p>
                <p className="text-zinc-300 leading-snug mt-0.5 line-clamp-3" style={{ fontSize: '0.58em' }}>
                  {String(props.description || 'Descrição do card')}
                </p>
              </div>
            </div>
          </div>
        );

      case 'source-card':
        return (
          <div
            className="rounded-lg border-l-4 max-w-[78%]"
            style={{
              ...positionStyle(position, isShort),
              borderLeftColor: accentColor,
              background: 'rgba(8,8,12,0.88)',
              padding: '0.5em 0.65em',
            }}
          >
            <p className="text-[0.55em] uppercase tracking-wider text-zinc-500">Fonte</p>
            <p className="font-semibold text-white truncate" style={{ fontSize: '0.68em' }}>{String(props.source || 'Referência')}</p>
            {props.detail && (
              <p className="text-zinc-400 truncate" style={{ fontSize: '0.55em' }}>{String(props.detail)}</p>
            )}
          </div>
        );

      case 'social-post': {
        const platform = String(props.platform || 'reddit');
        const platformColor = platform === 'x' ? '#1DA1F2' : '#FF4500';
        return (
          <div
            className="rounded-xl border shadow-lg max-w-[70%]"
            style={{
              ...positionStyle(position, isShort),
              background: 'rgba(10,10,14,0.92)',
              borderColor: `${platformColor}55`,
              padding: '0.55em 0.65em',
            }}
          >
            <p className="font-bold" style={{ fontSize: '0.58em', color: platformColor }}>
              {platform === 'x' ? '𝕏' : 'reddit'} · @{String(props.username || 'usuario')}
            </p>
            <p className="text-zinc-200 mt-0.5 line-clamp-2" style={{ fontSize: '0.62em' }}>{String(props.text || 'Texto do post')}</p>
            {props.upvotes && (
              <p className="text-zinc-500 mt-0.5" style={{ fontSize: '0.52em' }}>▲ {String(props.upvotes)}</p>
            )}
          </div>
        );
      }

      case 'geo-map':
        return (
          <div
            className="rounded-xl border overflow-hidden max-w-[55%]"
            style={{
              ...positionStyle(position, isShort),
              background: 'rgba(8,14,22,0.9)',
              borderColor: `${accentColor}44`,
            }}
          >
            <div className="h-[2.2em] bg-gradient-to-br from-cyan-900/40 to-emerald-900/30 flex items-center justify-center">
              <span className="text-[1.4em] opacity-70">🗺️</span>
            </div>
            <div className="px-2 py-1">
              <p className="font-bold text-white" style={{ fontSize: '0.65em' }}>{String(props.location || 'Local')}</p>
              {props.region && <p className="text-zinc-400" style={{ fontSize: '0.52em' }}>{String(props.region)}</p>}
            </div>
          </div>
        );

      case 'counter':
        return (
          <div
            className="text-center"
            style={positionStyle(position, isShort)}
          >
            <p className="font-black leading-none" style={{ fontSize: isShort ? '1.8em' : '1.5em', color: accentColor }}>
              {String(props.value ?? '0')}{props.suffix ? String(props.suffix) : ''}
            </p>
            <p className="text-zinc-300 uppercase tracking-wider mt-0.5" style={{ fontSize: '0.55em' }}>
              {String(props.label || 'Métrica')}
            </p>
          </div>
        );

      case 'kinetic-text':
        return (
          <p
            className="font-black uppercase text-center px-[6%] max-w-full"
            style={{
              ...positionStyle(position, isShort),
              fontSize: isShort ? '1.1em' : '0.95em',
              color: accentColor,
              textShadow: `0 0 0.4em ${accentColor}88`,
            }}
          >
            {String(props.text || 'TEXTO')}
          </p>
        );

      case 'bar-chart':
        return (
          <div
            className="rounded-lg border p-2 max-w-[60%]"
            style={{
              ...positionStyle(position, isShort),
              background: 'rgba(8,8,12,0.88)',
              borderColor: `${accentColor}33`,
            }}
          >
            <p className="text-white font-bold mb-1" style={{ fontSize: '0.6em' }}>{String(props.title || 'Gráfico')}</p>
            <div className="flex items-end gap-1 h-[1.8em]">
              {[0.6, 0.9, 0.45, 0.75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${h * 100}%`, background: i === 1 ? accentColor : `${accentColor}66` }}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div
            className="rounded-lg border px-3 py-2"
            style={{
              ...positionStyle('bottom-left', isShort),
              background: 'rgba(0,0,0,0.75)',
              borderColor: `${accentColor}44`,
              fontSize: '0.65em',
              color: '#fff',
            }}
          >
            {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
          </div>
        );
    }
  };

  const posLabel = OVERLAY_POSITIONS[overlay.type]?.find((p) => p.id === position)?.label || position;

  return (
    <div className={`space-y-1.5 min-w-0 ${className}`.trim()}>
      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider">
        Preview · {isShort ? '9:16' : '16:9'} · {OVERLAY_TYPE_LABELS[overlay.type]}
      </p>
      <div
        className="overlay-preview-frame relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950"
        style={{ aspectRatio: isShort ? '9 / 16' : '16 / 9', maxHeight: isShort ? '280px' : undefined }}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: isShort
              ? 'linear-gradient(160deg, #1a1a2e 0%, #0f0f14 50%, #2d1f3d 100%)'
              : 'linear-gradient(180deg, #1c1917 0%, #0c0a09 55%, #1e293b 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />

        <div className="absolute inset-0">
          {renderOverlayContent()}
        </div>

        <div className="absolute top-[0.5em] left-[0.5em] flex flex-wrap gap-1 pointer-events-none">
          <span className="text-[max(6px,0.9cqw)] font-bold uppercase tracking-wide text-zinc-400 bg-black/50 px-1.5 py-0.5 rounded">
            {posLabel}
          </span>
          {variant && overlaySupportsVariant(overlay.type) && (
            <span className="text-[max(6px,0.9cqw)] text-zinc-500 bg-black/40 px-1.5 py-0.5 rounded">{variant}</span>
          )}
          {iconKey && (
            <span className="text-[max(6px,0.9cqw)] text-cyan-400/90 bg-black/40 px-1.5 py-0.5 rounded">
              {iconLabel || 'Lottie'}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2 space-y-1">
        <p className="text-[10px] font-semibold text-zinc-200 truncate">{overlaySummary(overlay)}</p>
        {sceneNarration && (
          <p className="text-[9px] text-[var(--dash-muted)] leading-relaxed line-clamp-2">
            <span className="text-zinc-500">Narração na cena: </span>{sceneNarration}
          </p>
        )}
      </div>
    </div>
  );
}

function overlaySupportsVariant(type: string): boolean {
  return ['lower-third', 'info-card'].includes(type);
}