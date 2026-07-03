import React from 'react';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';
import { iconLabel, resolveIconStyle } from './overlayIconCatalog';
import {
  infoCardVariantStyle,
  kineticStyleProps,
  lowerThirdVariantShell,
  themePanelBg,
} from './overlayPreviewStyles';
import {
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
  compact?: boolean;
  className?: string;
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
  return { position: 'absolute', ...(base[position] || base['bottom-left']) };
}

function IconSlot({
  props,
  accent,
  size,
}: {
  props: Record<string, unknown>;
  accent: string;
  size: number;
}) {
  const iconId = props.iconType ? String(props.iconType) : undefined;
  if (!iconId) return null;
  return (
    <OverlayAnimatedIcon
      iconId={iconId}
      iconStyle={resolveIconStyle(props)}
      size={size}
      color={accent}
    />
  );
}

export function OverlayPreview({
  overlay,
  aspectRatio = '16:9',
  accentColor = '#D4AF37',
  sceneNarration,
  compact = false,
  className = '',
}: Props) {
  const isShort = aspectRatio === '9:16';
  const props = overlay.props || {};
  const position = String(props.position || 'bottom-left');
  const variant = String(props.variant || 'glass');
  const theme = String(props.theme || 'classic');
  const iconKey = props.iconType ? String(props.iconType) : '';
  const iconStyle = resolveIconStyle(props);
  const fs = isShort ? '0.62em' : '0.72em';
  const iconSize = isShort ? 16 : 20;

  const renderLowerThird = () => {
    const shell = lowerThirdVariantShell(variant, accentColor, theme);
    const pos = positionStyle(position, isShort);

    if (variant === 'bild') {
      return (
        <div style={pos} className="max-w-[88%]">
          <div style={shell.container}>
            <IconSlot props={props} accent={accentColor} size={iconSize} />
            <span style={{ ...shell.title, fontSize: fs }}>{String(props.title || 'Título')}</span>
          </div>
          {props.subtitle && (
            <div style={shell.subtitle}>
              <span style={{ fontSize: `calc(${fs} * 0.85)` }}>{String(props.subtitle)}</span>
            </div>
          )}
        </div>
      );
    }

    if (variant === 'bold-block') {
      return (
        <div style={{ ...pos, ...shell.container, maxWidth: '88%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35em', ...shell.title, fontSize: fs }}>
            <IconSlot props={props} accent={accentColor} size={iconSize} />
            {String(props.title || 'Título')}
          </div>
          {props.subtitle && (
            <div style={{ ...shell.subtitle, fontSize: `calc(${fs} * 0.9)` }}>{String(props.subtitle)}</div>
          )}
        </div>
      );
    }

    return (
      <div style={{ ...pos, ...shell.container, maxWidth: '88%', flexDirection: variant === 'clean-bar' ? 'row' : 'column', alignItems: variant === 'soft-pill' ? 'center' : 'flex-start' }}>
        <IconSlot props={props} accent={accentColor} size={iconSize} />
        <div className="min-w-0">
          <p style={{ ...shell.title, fontSize: fs, margin: 0 }}>{String(props.title || 'Título')}</p>
          {props.subtitle && (
            <p style={{ ...shell.subtitle, fontSize: `calc(${fs} * 0.82)`, margin: '0.1em 0 0' }}>{String(props.subtitle)}</p>
          )}
        </div>
      </div>
    );
  };

  const renderOverlayContent = () => {
    switch (overlay.type) {
      case 'lower-third':
        return renderLowerThird();

      case 'info-card':
        return (
          <div
            className="max-w-[78%] flex gap-1.5 items-start"
            style={{ ...positionStyle(position, isShort), ...infoCardVariantStyle(variant, accentColor, theme), padding: '0.55em 0.65em' }}
          >
            <IconSlot props={props} accent={accentColor} size={iconSize + 2} />
            <div className="min-w-0">
              <p className="font-bold text-white" style={{ fontSize: fs }}>{String(props.title || 'Info')}</p>
              <p className="text-zinc-300 leading-snug line-clamp-3" style={{ fontSize: `calc(${fs} * 0.88)` }}>
                {String(props.description || 'Descrição')}
              </p>
            </div>
          </div>
        );

      case 'source-card':
        return (
          <div
            className="rounded-lg max-w-[78%]"
            style={{
              ...positionStyle(position, isShort),
              borderLeft: `3px solid ${accentColor}`,
              background: themePanelBg(theme, accentColor),
              padding: '0.45em 0.6em',
            }}
          >
            <p style={{ fontSize: '0.5em' }} className="uppercase tracking-wider text-zinc-500">Fonte</p>
            <p className="font-semibold text-white truncate" style={{ fontSize: fs }}>{String(props.source || 'Referência')}</p>
            {props.detail && <p className="text-zinc-400 truncate" style={{ fontSize: `calc(${fs} * 0.82)` }}>{String(props.detail)}</p>}
          </div>
        );

      case 'social-post': {
        const platform = String(props.platform || 'reddit');
        const platformColor = platform === 'x' ? '#1DA1F2' : '#FF4500';
        return (
          <div
            className="rounded-xl max-w-[72%] shadow-lg"
            style={{
              ...positionStyle(position, isShort),
              background: 'rgba(10,10,14,0.92)',
              border: `1px solid ${platformColor}55`,
              padding: '0.5em 0.6em',
            }}
          >
            <p className="font-bold" style={{ fontSize: `calc(${fs} * 0.85)`, color: platformColor }}>
              {platform === 'x' ? '𝕏' : 'reddit'} · @{String(props.username || 'usuario')}
            </p>
            <p className="text-zinc-200 line-clamp-2" style={{ fontSize: fs }}>{String(props.text || 'Texto')}</p>
          </div>
        );
      }

      case 'geo-map':
        return (
          <div className="rounded-xl overflow-hidden max-w-[58%]" style={{ ...positionStyle(position, isShort), background: 'rgba(8,14,22,0.9)', border: `1px solid ${accentColor}44` }}>
            <div className="h-[2em] bg-gradient-to-br from-cyan-900/50 to-emerald-900/40 flex items-center justify-center text-[1.2em]">🗺️</div>
            <div className="px-2 py-1">
              <p className="font-bold text-white" style={{ fontSize: fs }}>{String(props.location || 'Local')}</p>
            </div>
          </div>
        );

      case 'counter':
        return (
          <div className="text-center" style={positionStyle(position, isShort)}>
            <p className="font-black leading-none" style={{ fontSize: isShort ? '1.6em' : '1.35em', color: accentColor }}>
              {String(props.value ?? '0')}{props.suffix ? String(props.suffix) : ''}
            </p>
            <p className="text-zinc-300 uppercase" style={{ fontSize: `calc(${fs} * 0.75)` }}>{String(props.label || 'Métrica')}</p>
          </div>
        );

      case 'kinetic-text':
        return (
          <p
            className="font-black uppercase text-center px-[6%] max-w-full absolute"
            style={{ ...positionStyle(position, isShort), fontSize: isShort ? '1em' : '0.9em', ...kineticStyleProps(String(props.style || 'slam'), accentColor) }}
          >
            {String(props.text || 'TEXTO')}
          </p>
        );

      case 'bar-chart':
        return (
          <div className="rounded-lg p-2 max-w-[62%]" style={{ ...positionStyle(position, isShort), background: 'rgba(8,8,12,0.88)', border: `1px solid ${accentColor}33` }}>
            <p className="text-white font-bold mb-1" style={{ fontSize: `calc(${fs} * 0.9)` }}>{String(props.title || 'Gráfico')}</p>
            <div className="flex items-end gap-1 h-[1.6em]">
              {[0.5, 0.95, 0.4, 0.7].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h * 100}%`, background: i === 1 ? accentColor : `${accentColor}55` }} />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="rounded-lg px-2 py-1.5 absolute" style={{ ...positionStyle('bottom-left', isShort), background: 'rgba(0,0,0,0.75)', fontSize: fs, color: '#fff' }}>
            {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
          </div>
        );
    }
  };

  const posLabel = OVERLAY_POSITIONS[overlay.type]?.find((p) => p.id === position)?.label || position;
  const frameMaxW = compact
    ? (isShort ? 'max-w-[108px]' : 'max-w-[200px]')
    : (isShort ? 'max-w-[min(100%,300px)] mx-auto' : 'w-full');

  return (
    <div className={`space-y-1 min-w-0 ${className}`.trim()}>
      <p className="text-[8px] text-[var(--dash-muted)] uppercase tracking-wider">
        Preview · {variant} · {isShort ? '9:16' : '16:9'}
      </p>
      <div
        className={`overlay-preview-frame relative overflow-hidden rounded-xl border border-[var(--dash-border)] bg-zinc-950 w-full ${frameMaxW}`}
        style={{ aspectRatio: isShort ? '9 / 16' : '16 / 9', maxHeight: compact ? (isShort ? 140 : 120) : (isShort ? 280 : undefined) }}
      >
        <div className="absolute inset-0 opacity-90" style={{
          background: isShort
            ? 'linear-gradient(160deg, #1a1a2e, #0f0f14 50%, #2d1f3d)'
            : 'linear-gradient(180deg, #1c1917, #0c0a09 55%, #1e293b)',
        }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />
        {renderOverlayContent()}
        <div className="absolute top-[0.45em] left-[0.45em] flex flex-wrap gap-0.5 pointer-events-none">
          <span className="text-[max(6px,0.85cqw)] font-bold uppercase text-zinc-400 bg-black/50 px-1 py-0.5 rounded">{posLabel}</span>
          {iconKey && (
            <span className="text-[max(6px,0.85cqw)] text-cyan-400/90 bg-black/45 px-1 py-0.5 rounded">
              {iconStyle === 'svg' ? 'SVG' : 'Lottie'} · {iconLabel(iconKey, iconStyle)}
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2 py-1.5">
          <p className="text-[9px] font-semibold text-zinc-200 truncate">{overlaySummary(overlay)}</p>
          {sceneNarration && <p className="text-[8px] text-[var(--dash-muted)] line-clamp-2 mt-0.5">{sceneNarration}</p>}
        </div>
      )}
    </div>
  );
}