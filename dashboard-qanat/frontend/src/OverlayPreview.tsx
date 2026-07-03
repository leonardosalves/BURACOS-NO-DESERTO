import React from 'react';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';
import { iconLabel, resolveIconStyle } from './overlayIconCatalog';
import {
  getOverlayPreviewMetrics,
  overlayPreviewFrameClass,
} from './overlayPreviewScale';
import {
  barChartPreviewShell,
  infoCardVariantStyle,
  kineticStyleProps,
  lowerThirdVariantShell,
  normalizeBarChartItems,
  themePanelBg,
} from './overlayPreviewStyles';
import {
  OVERLAY_POSITION_GRID,
  OVERLAY_POSITIONS,
  OVERLAY_TYPE_LABELS,
  overlaySummary,
  type OverlayDraft,
} from './overlayEditorConfig';
import type { OverlayPreviewMetrics } from './overlayPreviewScale';

type Props = {
  overlay: OverlayDraft;
  aspectRatio?: '16:9' | '9:16' | string;
  accentColor?: string;
  sceneLabel?: string;
  sceneNarration?: string;
  compact?: boolean;
  className?: string;
  /** Clique no preview para escolher posição (grade 3×3). */
  onPositionSelect?: (positionId: string) => void;
};

function positionStyle(
  position: string,
  pad: OverlayPreviewMetrics['positionPad'],
): React.CSSProperties {
  const base: Record<string, React.CSSProperties> = {
    'bottom-left': { bottom: pad.bottom, left: pad.left },
    'bottom-right': { bottom: pad.bottom, right: pad.right },
    'bottom-center': { bottom: pad.bottom, left: '50%', transform: 'translateX(-50%)' },
    'top-left': { top: pad.top, left: pad.left },
    'top-center': { top: pad.top, left: '50%', transform: 'translateX(-50%)' },
    'top-right': { top: pad.top, right: pad.right },
    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    right: { bottom: pad.bottom, right: pad.right },
  };
  const key = position === 'right' ? 'bottom-right' : position;
  return { position: 'absolute', ...(base[key] || base['bottom-left']) };
}

function IconSlot({
  props,
  accent,
  sizeCss,
}: {
  props: Record<string, unknown>;
  accent: string;
  sizeCss: string;
}) {
  const iconId = props.iconType ? String(props.iconType) : undefined;
  if (!iconId) return null;
  return (
    <div className="shrink-0" style={{ width: sizeCss, height: sizeCss }}>
      <OverlayAnimatedIcon
        iconId={iconId}
        iconStyle={resolveIconStyle(props)}
        fill
        color={accent}
      />
    </div>
  );
}

export function OverlayPreview({
  overlay,
  aspectRatio = '16:9',
  accentColor = '#D4AF37',
  sceneLabel,
  sceneNarration,
  compact = false,
  className = '',
  onPositionSelect,
}: Props) {
  const isShort = aspectRatio === '9:16';
  const format = isShort ? 'short' : 'long';
  const metrics = getOverlayPreviewMetrics(format);
  const props = overlay.props || {};
  const position = String(props.position || 'bottom-left');
  const variant = String(props.variant || 'glass');
  const theme = String(props.theme || 'classic');
  const iconKey = props.iconType ? String(props.iconType) : '';
  const iconStyle = resolveIconStyle(props);
  const pos = positionStyle(position, metrics.positionPad);

  const renderLowerThird = () => {
    const shell = lowerThirdVariantShell(variant, accentColor, theme);

    if (variant === 'bild') {
      return (
        <div style={{ ...pos, maxWidth: metrics.maxWidth }}>
          <div style={{ ...shell.container, gap: metrics.cardGap, padding: metrics.cardPadding }}>
            <IconSlot props={props} accent={accentColor} sizeCss={metrics.iconSize} />
            <span style={{ ...shell.title, fontSize: metrics.fontSizeTitle, whiteSpace: 'nowrap' }}>
              {String(props.title || 'Título')}
            </span>
          </div>
          {props.subtitle && (
            <div style={shell.subtitle}>
              <span style={{ fontSize: metrics.fontSizeSubtitle }}>{String(props.subtitle)}</span>
            </div>
          )}
        </div>
      );
    }

    if (variant === 'bold-block') {
      return (
        <div style={{ ...pos, ...shell.container, maxWidth: metrics.maxWidth }}>
          <div
            style={{
              ...shell.title,
              fontSize: metrics.fontSizeTitle,
              padding: metrics.cardPadding,
              display: 'flex',
              alignItems: 'center',
              gap: metrics.cardGap,
            }}
          >
            <IconSlot props={props} accent={accentColor} sizeCss={metrics.iconSize} />
            <span style={{ whiteSpace: 'nowrap' }}>{String(props.title || 'Título')}</span>
          </div>
          {props.subtitle && (
            <div style={{ ...shell.subtitle, fontSize: metrics.fontSizeSubtitle, padding: metrics.cardPadding }}>
              {String(props.subtitle)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          ...pos,
          ...shell.container,
          maxWidth: metrics.maxWidth,
          padding: metrics.cardPadding,
          gap: metrics.cardGap,
          flexDirection: variant === 'clean-bar' ? 'row' : 'column',
          alignItems: variant === 'soft-pill' ? 'center' : 'flex-start',
        }}
      >
        <IconSlot props={props} accent={accentColor} sizeCss={metrics.iconSize} />
        <div className="min-w-0">
          <p style={{ ...shell.title, fontSize: metrics.fontSizeTitle, margin: 0, whiteSpace: 'nowrap' }}>
            {String(props.title || 'Título')}
          </p>
          {props.subtitle && (
            <p style={{ ...shell.subtitle, fontSize: metrics.fontSizeSubtitle, margin: `${metrics.cardGap} 0 0` }}>
              {String(props.subtitle)}
            </p>
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
            className="flex items-start"
            style={{
              ...pos,
              ...infoCardVariantStyle(variant, accentColor, theme),
              padding: metrics.cardPadding,
              gap: metrics.cardGap,
              maxWidth: metrics.maxWidth,
            }}
          >
            <IconSlot props={props} accent={accentColor} sizeCss={metrics.iconSize} />
            <div className="min-w-0">
              <p className="font-bold text-white" style={{ fontSize: metrics.fontSizeTitle }}>
                {String(props.title || 'Info')}
              </p>
              <p className="text-zinc-300 leading-snug line-clamp-3" style={{ fontSize: metrics.fontSizeDesc }}>
                {String(props.description || 'Descrição')}
              </p>
            </div>
          </div>
        );

      case 'source-card':
        return (
          <div
            style={{
              ...pos,
              maxWidth: metrics.maxWidth,
              borderLeft: `3px solid ${accentColor}`,
              background: themePanelBg(theme, accentColor),
              padding: metrics.cardPadding,
            }}
          >
            <p style={{ fontSize: metrics.fontSizeDesc }} className="uppercase tracking-wider text-zinc-500">Fonte</p>
            <p className="font-semibold text-white truncate" style={{ fontSize: metrics.fontSizeTitle }}>
              {String(props.source || 'Referência')}
            </p>
            {props.detail && (
              <p className="text-zinc-400 truncate" style={{ fontSize: metrics.fontSizeSubtitle }}>
                {String(props.detail)}
              </p>
            )}
          </div>
        );

      case 'social-post': {
        const platform = String(props.platform || 'reddit');
        const platformColor = platform === 'x' ? '#1DA1F2' : '#FF4500';
        return (
          <div
            style={{
              ...pos,
              maxWidth: metrics.maxWidth,
              background: 'rgba(10,10,14,0.92)',
              border: `1px solid ${platformColor}55`,
              padding: metrics.cardPadding,
              borderRadius: metrics.cardGap,
            }}
          >
            <p className="font-bold" style={{ fontSize: metrics.fontSizeSubtitle, color: platformColor }}>
              {platform === 'x' ? '𝕏' : 'reddit'} · @{String(props.username || 'usuario')}
            </p>
            <p className="text-zinc-200 line-clamp-2" style={{ fontSize: metrics.fontSizeTitle }}>
              {String(props.text || 'Texto')}
            </p>
          </div>
        );
      }

      case 'geo-map':
        return (
          <div
            style={{
              ...pos,
              maxWidth: metrics.maxWidth,
              background: 'rgba(8,14,22,0.9)',
              border: `1px solid ${accentColor}44`,
              borderRadius: metrics.cardGap,
              overflow: 'hidden',
            }}
          >
            <div
              className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/40 flex items-center justify-center"
              style={{ height: metrics.fontSizeCounter }}
            >
              🗺️
            </div>
            <div style={{ padding: metrics.cardPadding }}>
              <p className="font-bold text-white" style={{ fontSize: metrics.fontSizeTitle }}>
                {String(props.location || 'Local')}
              </p>
            </div>
          </div>
        );

      case 'counter':
        return (
          <div className="text-center" style={pos}>
            <p className="font-black leading-none" style={{ fontSize: metrics.fontSizeCounter, color: accentColor }}>
              {String(props.value ?? '0')}{props.suffix ? String(props.suffix) : ''}
            </p>
            <p className="text-zinc-300 uppercase" style={{ fontSize: metrics.fontSizeSubtitle }}>
              {String(props.label || 'Métrica')}
            </p>
          </div>
        );

      case 'kinetic-text':
        return (
          <p
            className="font-black uppercase text-center max-w-full"
            style={{
              ...pos,
              fontSize: metrics.fontSizeKinetic,
              paddingLeft: metrics.positionPad.left,
              paddingRight: metrics.positionPad.right,
              ...kineticStyleProps(String(props.style || 'slam'), accentColor),
            }}
          >
            {String(props.text || 'TEXTO')}
          </p>
        );

      case 'bar-chart': {
        const chartTheme = String(props.theme || 'classic');
        const shell = barChartPreviewShell(chartTheme, accentColor);
        const items = normalizeBarChartItems(props.items, accentColor);
        const maxValue = Math.max(...items.map((it) => Number(it.value) || 0), 1);
        return (
          <div style={{ ...pos, maxWidth: metrics.maxWidth, ...shell.container }}>
            <div className="flex items-center gap-1 mb-1.5">
              <div style={shell.accentStripe} />
              <p style={{ ...shell.title, fontSize: metrics.fontSizeSubtitle, margin: 0 }}>
                {String(props.title || 'COMPARAÇÃO')}
              </p>
            </div>
            <div className="space-y-1">
              {items.map((item, index) => {
                const barColor = item.color || (index === 0 ? accentColor : '#4ECDC4');
                const widthPct = Math.max(8, ((Number(item.value) || 0) / maxValue) * 100);
                return (
                  <div key={`${item.label}-${index}`}>
                    <div className="flex justify-between items-baseline gap-1 mb-0.5">
                      <span style={{ ...shell.label, fontSize: metrics.fontSizeDesc }}>{item.label}</span>
                      <span style={{ color: barColor, fontSize: metrics.fontSizeDesc, fontWeight: 700 }}>
                        {item.displayValue || item.value}
                      </span>
                    </div>
                    <div style={shell.track}>
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                          borderRadius: 'inherit',
                          boxShadow: chartTheme === 'neon' ? `0 0 0.35em ${barColor}` : undefined,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      default:
        return (
          <div
            style={{
              ...positionStyle('bottom-left', metrics.positionPad),
              background: 'rgba(0,0,0,0.75)',
              fontSize: metrics.fontSizeTitle,
              color: '#fff',
              padding: metrics.cardPadding,
              borderRadius: metrics.cardGap,
            }}
          >
            {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
          </div>
        );
    }
  };

  const posLabel = OVERLAY_POSITIONS[overlay.type]?.find((p) => p.id === position)?.label || position;
  const metaParts = [
    sceneLabel,
    posLabel,
    iconKey ? `${iconStyle === 'svg' ? 'SVG' : 'Lottie'} · ${iconLabel(iconKey, iconStyle)}` : null,
  ].filter(Boolean);

  return (
    <div className={`space-y-1.5 min-w-0 ${overlayPreviewFrameClass(format)} ${className}`.trim()}>
      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider">
        Preview em escala real · {metrics.refLabel} · {variant}
      </p>
      <div
        className="overlay-preview-frame relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950 w-full"
        style={{ aspectRatio: isShort ? '9 / 16' : '16 / 9' }}
      >
        <div
          className="absolute inset-0 z-0 opacity-90"
          style={{
            background: isShort
              ? 'linear-gradient(160deg, #1a1a2e, #0f0f14 50%, #2d1f3d)'
              : 'linear-gradient(180deg, #1c1917, #0c0a09 55%, #1e293b)',
          }}
        />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />
        {isShort && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none z-[1]"
            style={{ bottom: '22%' }}
          />
        )}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {renderOverlayContent()}
        </div>
        {onPositionSelect && (
          <div className="absolute inset-0 z-20 grid grid-cols-3 grid-rows-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {OVERLAY_POSITION_GRID.map((cell) => {
              const allowed = new Set((OVERLAY_POSITIONS[overlay.type] || []).map((p) => p.id));
              if (!allowed.has(cell.id)) return null;
              const isActive = position === cell.id || (position === 'right' && cell.id === 'bottom-right');
              return (
                <button
                  key={cell.id}
                  type="button"
                  title={OVERLAY_POSITIONS[overlay.type]?.find((p) => p.id === cell.id)?.label || cell.id}
                  onClick={() => onPositionSelect(cell.id)}
                  className={`border border-dashed transition ${
                    isActive
                      ? 'border-violet-400/80 bg-violet-500/20'
                      : 'border-white/10 bg-black/20 hover:border-violet-400/50 hover:bg-violet-500/10'
                  }`}
                  style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
                />
              );
            })}
          </div>
        )}
        <div className="absolute top-[0.6em] right-[0.6em] z-[1] text-[max(7px,1.1cqw)] font-bold uppercase tracking-widest text-zinc-500 bg-black/40 px-[0.5em] py-[0.25em] rounded pointer-events-none">
          {isShort ? '9:16' : '16:9'}
        </div>
      </div>
      {metaParts.length > 0 && (
        <p className="text-[8px] text-zinc-500 truncate leading-tight" title={metaParts.join(' · ')}>
          {sceneLabel && (
            <span className="text-[var(--dash-primary-light)] font-semibold">{sceneLabel}</span>
          )}
          {sceneLabel && metaParts.length > 1 && <span className="text-zinc-600"> · </span>}
          {metaParts.filter((p) => p !== sceneLabel).join(' · ')}
        </p>
      )}
      {compact && sceneNarration && (
        <p className="text-[8px] text-zinc-600 line-clamp-2 leading-snug" title={sceneNarration}>
          {sceneNarration}
        </p>
      )}
      {!compact && (
        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2 py-1.5">
          <p className="text-[9px] font-semibold text-zinc-200 truncate">{overlaySummary(overlay)}</p>
          {sceneNarration && (
            <p className="text-[8px] text-[var(--dash-muted)] line-clamp-2 mt-0.5">{sceneNarration}</p>
          )}
        </div>
      )}
    </div>
  );
}