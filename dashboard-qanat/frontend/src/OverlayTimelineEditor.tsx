import React, { useMemo, useState } from 'react';
import {
  Clock,
  Film,
  Layers,
  MapPin,
  Palette,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { SettingLabel } from './SettingHelpTip';
import { OverlayAiBriefing } from './OverlayAiBriefing.tsx';
import { OverlayPreview } from './OverlayPreview';
import type { OverlayResearchSnapshot } from './overlayBriefingLogic';
import {
  buildFilmstripSegments,
  filterFilmstripSegmentsForPreview,
  resolveTotalDuration,
} from './overlayFilmstrip';
import { OverlayIconPicker } from './OverlayIconPicker';
import { OverlayVariantPicker } from './OverlayVariantPicker';
import { OverlayPositionPicker } from './OverlayPositionPicker';
import { iconLabel, resolveIconStyle, type OverlayIconStyle } from './overlayIconCatalog';
import {
  INFORMATIVE_OVERLAY_TYPES,
  OVERLAY_CONTENT_FIELDS,
  OVERLAY_POSITIONS,
  OVERLAY_THEMES,
  defaultOverlayPosition,
  isValidOverlayPosition,
  OVERLAY_TYPE_LABELS,
  OVERLAY_VARIANTS,
  SYSTEM_OVERLAY_TYPES,
  buildSceneOptions,
  formatOverlayTime,
  parseOverlaySeconds,
  isSceneId,
  normalizeOverlayList,
  overlaySceneLabel,
  overlaySceneRef,
  overlaySummary,
  overlaySupportsLottie,
  overlaySupportsPosition,
  overlaySupportsTheme,
  overlaySupportsVariant,
  resolveSceneSeconds,
  type OverlayDraft,
} from './overlayEditorConfig';

type BlockTimings = {
  starts?: number[];
  durations?: number[];
  total_duration?: number;
};

type Props = {
  storyboard: Record<string, unknown> | null;
  blockTimings?: BlockTimings | null;
  timelineAssets?: Record<string, Array<Record<string, unknown>>>;
  aspectRatio?: string;
  accentColor?: string;
  getAssetUrl?: (path: string) => string;
  generating?: boolean;
  onChange: (nextOverlays: OverlayDraft[]) => void;
  onGenerate: () => void;
};

function numericStart(overlay: OverlayDraft, starts: number[]): number {
  if (Number.isFinite(Number(overlay.start)) && !isSceneId(overlay.start)) {
    return Number(overlay.start);
  }
  const scene = String(overlay.scene_ref || overlay.start || '').trim();
  if (isSceneId(scene)) {
    const resolved = resolveSceneSeconds(scene, starts);
    if (resolved != null) return resolved;
  }
  return 0;
}

function sceneNarrationFor(
  overlay: OverlayDraft,
  visualPrompts: Array<{ scene?: string; block?: number; narration_text?: string }>,
): string | undefined {
  const sceneId = overlaySceneRef(overlay);
  if (!sceneId) return undefined;
  const match = visualPrompts.find((vp) => String(vp.scene || '') === sceneId);
  return match?.narration_text?.replace(/\s+/g, ' ').trim();
}

function sceneDisplayFor(
  overlay: OverlayDraft,
  sceneOptions: { id: string; label: string }[],
  starts: number[],
): string {
  const label = overlaySceneLabel(overlay, sceneOptions);
  if (label) return label;
  const start = numericStart(overlay, starts);
  return `Manual · ${formatOverlayTime(start)}`;
}

export function OverlayTimelineEditor({
  storyboard,
  blockTimings,
  timelineAssets = {},
  aspectRatio = '16:9',
  accentColor = '#D4AF37',
  getAssetUrl,
  generating = false,
  onChange,
  onGenerate,
}: Props) {
  const starts = blockTimings?.starts || [];
  const filmstrip = useMemo(
    () => buildFilmstripSegments(timelineAssets, blockTimings),
    [timelineAssets, blockTimings],
  );
  const visibleFilmstrip = useMemo(
    () => filterFilmstripSegmentsForPreview(filmstrip),
    [filmstrip],
  );
  const totalDuration = useMemo(
    () => resolveTotalDuration(blockTimings, filmstrip),
    [blockTimings, filmstrip],
  );

  const rawOverlays = (storyboard?.overlays_ai || storyboard?.overlays || []) as OverlayDraft[];
  const overlays = useMemo(() => normalizeOverlayList(rawOverlays), [rawOverlays]);
  const visualPrompts = (storyboard?.visual_prompts || []) as Array<{
    scene?: string;
    block?: number;
    narration_text?: string;
    prompt?: string;
    visual_description?: string;
  }>;
  const overlayResearch = (storyboard?.overlays_research || null) as OverlayResearchSnapshot | null;
  const globalPlanning = (storyboard?.overlays_planejamento || []) as string[];

  const sceneOptions = useMemo(() => {
    const base = buildSceneOptions(visualPrompts);
    return base.map((opt) => ({
      ...opt,
      seconds: resolveSceneSeconds(opt.id, starts),
    }));
  }, [visualPrompts, starts]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = overlays.find((o) => o.id === selectedId) || overlays[0] || null;

  const informative = overlays.filter((o) => INFORMATIVE_OVERLAY_TYPES.includes(o.type as never));
  const system = overlays.filter((o) => SYSTEM_OVERLAY_TYPES.includes(o.type as never));

  const patchOverlay = (id: string, patch: Partial<OverlayDraft>, propsPatch?: Record<string, unknown>) => {
    const next = overlays.map((o) => {
      if (o.id !== id) return o;
      const merged: OverlayDraft = { ...o, ...patch };
      if (propsPatch) {
        merged.props = { ...(o.props || {}), ...propsPatch };
      } else if (patch.props) {
        merged.props = { ...(o.props || {}), ...patch.props };
      }
      if (merged.props) {
        Object.keys(merged.props).forEach((key) => {
          if (merged.props![key] === undefined) delete merged.props![key];
        });
      }
      return merged;
    });
    onChange(next);
  };

  const patchProp = (id: string, key: string, value: unknown) => {
    patchOverlay(id, {}, { [key]: value });
  };

  const removeOverlay = (id: string) => {
    const next = overlays.filter((o) => o.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const addOverlay = () => {
    const id = `manual-overlay-${Date.now()}`;
    const scene = sceneOptions[0];
    const start = scene?.seconds ?? 0;
    const next: OverlayDraft = {
      id,
      type: 'lower-third',
      start,
      duration: 4,
      scene_ref: scene?.id,
      props: {
        title: 'Novo informativo',
        subtitle: '',
        position: 'bottom-left',
        variant: 'glass',
        theme: 'classic',
        accentColor,
      },
    };
    onChange([...overlays, next]);
    setSelectedId(id);
  };

  const anchorToScene = (id: string, sceneId: string) => {
    const current = overlays.find((o) => o.id === id);
    if (!sceneId) {
      patchOverlay(id, {
        scene_ref: undefined,
        start: current ? numericStart(current, starts) : 0,
        timing_manual: true,
      });
      return;
    }
    const seconds = resolveSceneSeconds(sceneId, starts);
    patchOverlay(id, {
      scene_ref: sceneId,
      start: seconds ?? sceneId,
      timing_manual: false,
    });
  };

  const setManualTiming = (id: string, patch: Partial<OverlayDraft>) => {
    patchOverlay(id, { ...patch, timing_manual: true });
  };

  const setIcon = (id: string, iconId: string | undefined, style: OverlayIconStyle) => {
    if (!iconId) {
      patchOverlay(id, { props: { ...(overlays.find((o) => o.id === id)?.props || {}), iconType: undefined, iconStyle: undefined } });
      return;
    }
    patchOverlay(id, {}, { iconType: iconId, iconStyle: style });
  };

  const timeRulerTicks = useMemo(() => {
    const ticks: number[] = [0];
    const step = totalDuration > 120 ? 30 : totalDuration > 60 ? 15 : 10;
    for (let t = step; t < totalDuration; t += step) ticks.push(t);
    ticks.push(totalDuration);
    return [...new Set(ticks)].sort((a, b) => a - b);
  }, [totalDuration]);

  const renderOverlayTimeline = () => (
    <div className="space-y-2">
      <div className="relative rounded-xl border border-[var(--dash-border)] overflow-hidden bg-zinc-950">
        {/* B-roll do projeto (só assets reais — sem logos herdados) */}
        <div className="relative h-20 flex overflow-x-auto border-b border-[var(--dash-border)]">
          {visibleFilmstrip.length === 0 ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-[10px] text-zinc-500 px-4 text-center">
              <Film className="w-3.5 h-3.5 shrink-0" />
              Nenhum B-roll mapeado neste projeto — associe mídias em <span className="text-zinc-400">Mídia por bloco</span>
            </div>
          ) : (
            visibleFilmstrip.map((seg) => {
              const widthPct = Math.max(4, (seg.duration / totalDuration) * 100);
              const hasMedia = Boolean(seg.asset && getAssetUrl);
              const url = hasMedia ? getAssetUrl!(seg.asset!) : '';
              const isVideo = seg.assetType === 'video';
              return (
                <div
                  key={seg.id}
                  className="overlay-filmstrip-cell h-full"
                  style={{ width: `${widthPct}%` }}
                  title={`${seg.blockLabel} · ${formatOverlayTime(seg.start)} · ${seg.duration.toFixed(1)}s`}
                >
                  {hasMedia ? (
                    isVideo ? (
                      <video
                        src={url}
                        className="pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img src={url} alt="" className="pointer-events-none" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
                      <span className="text-[8px] text-zinc-600 font-mono">{seg.blockLabel}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/65 px-1 py-0.5">
                    <p className="text-[7px] font-mono text-zinc-400 truncate">{formatOverlayTime(seg.start)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="relative h-5 border-b border-[var(--dash-border)] bg-zinc-950/90">
          {timeRulerTicks.map((tick) => {
            const left = totalDuration > 0 ? (tick / totalDuration) * 100 : 0;
            return (
              <span
                key={`tick-${tick}`}
                className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-[7px] font-mono text-zinc-500 px-0.5 pb-0.5 whitespace-nowrap">
                  {formatOverlayTime(tick)}
                </span>
              </span>
            );
          })}
        </div>

        {/* Faixa de overlays (sem B-roll — mídia fica em Mídia por bloco) */}
        <div className="relative h-14 bg-[rgba(130,128,253,0.04)]">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 9.5%, rgba(130,128,253,0.2) 10%)',
          }} />
          {overlays.map((overlay) => {
            const start = numericStart(overlay, starts);
            const duration = Number(overlay.duration) || 4;
            const left = Math.min(97, (start / totalDuration) * 100);
            const width = Math.max(3, Math.min(100 - left, (duration / totalDuration) * 100));
            const isHud = SYSTEM_OVERLAY_TYPES.includes(overlay.type as never);
            const active = selected?.id === overlay.id;
            const summary = overlaySummary(overlay);
            return (
              <button
                key={overlay.id}
                type="button"
                onClick={() => setSelectedId(overlay.id)}
                className={`absolute top-1 bottom-1 rounded-md border px-1 flex flex-col justify-center overflow-hidden transition text-left ${
                  active
                    ? 'border-[var(--dash-primary-light)] bg-[rgba(130,128,253,0.4)] z-10 shadow-lg'
                    : isHud
                      ? 'border-zinc-600 bg-zinc-800/90 text-zinc-400'
                      : 'border-[rgba(130,128,253,0.45)] bg-[rgba(130,128,253,0.22)] hover:bg-[rgba(130,128,253,0.32)]'
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${OVERLAY_TYPE_LABELS[overlay.type]} · ${summary} · ${sceneDisplayFor(overlay, sceneOptions, starts)} · ${formatOverlayTime(start)}`}
              >
                <span className="text-[7px] font-bold uppercase tracking-wide text-white/90 truncate leading-tight">
                  {OVERLAY_TYPE_LABELS[overlay.type]?.split(' ')[0]}
                </span>
                <span className="text-[6px] text-violet-300/90 truncate leading-tight">
                  {overlaySceneRef(overlay) ? `Cena ${overlaySceneRef(overlay)}` : formatOverlayTime(start)}
                </span>
                <span className="text-[6px] text-zinc-300 truncate leading-tight">{summary}</span>
              </button>
            );
          })}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-[var(--dash-muted)] pointer-events-none">
            {formatOverlayTime(totalDuration)}
          </div>
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-[rgba(130,128,253,0.25)] bg-[rgba(130,128,253,0.06)] px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px]">
          <span className="font-bold text-[var(--dash-primary-light)]">{OVERLAY_TYPE_LABELS[selected.type]}</span>
          <span className="text-zinc-300 truncate max-w-[200px]">{overlaySummary(selected)}</span>
          <span className="text-[var(--dash-muted)] font-mono">
            {formatOverlayTime(numericStart(selected, starts))} → {selected.duration}s
          </span>
          <span className="text-[var(--dash-primary-light)] font-medium truncate max-w-[240px]" title={sceneDisplayFor(selected, sceneOptions, starts)}>
            {sceneDisplayFor(selected, sceneOptions, starts)}
          </span>
          {selected.props?.position && (
            <span className="text-zinc-500">
              {OVERLAY_POSITIONS[selected.type]?.find((p) => p.id === selected.props?.position)?.label
                || String(selected.props.position)}
            </span>
          )}
          {selected.props?.iconType && (
            <span className="text-cyan-400/80">
              {resolveIconStyle(selected.props || {}) === 'svg' ? 'SVG' : 'Lottie'}: {iconLabel(String(selected.props.iconType), resolveIconStyle(selected.props || {}))}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderInspector = (overlay: OverlayDraft) => {
    const props = overlay.props || {};
    const isSystem = SYSTEM_OVERLAY_TYPES.includes(overlay.type as never);
    const contentFields = OVERLAY_CONTENT_FIELDS[overlay.type] || [];
    const positions = OVERLAY_POSITIONS[overlay.type] || [];
    const variants = OVERLAY_VARIANTS[overlay.type] || [];
    const hasIcon = overlaySupportsLottie(overlay.type);
    const iconStyle = resolveIconStyle(props);
    const narration = sceneNarrationFor(overlay, visualPrompts);
    const sceneLabel = sceneDisplayFor(overlay, sceneOptions, starts);

    const previewWrapClass = aspectRatio === '9:16'
      ? 'w-full max-w-[min(100%,300px)]'
      : 'w-full';

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 items-start">
        <div className={`lg:sticky lg:top-2 shrink-0 min-w-0 space-y-2 ${previewWrapClass}`}>
          <OverlayPreview
            overlay={overlay}
            aspectRatio={aspectRatio}
            accentColor={String(props.accentColor || accentColor)}
            sceneLabel={sceneLabel}
            sceneNarration={narration}
            durationSeconds={overlay.duration}
            compact
            onPositionSelect={
              overlaySupportsPosition(overlay.type) && !isSystem
                ? (pos) => patchProp(overlay.id, 'position', pos)
                : undefined
            }
          />
          {overlaySupportsPosition(overlay.type) && !isSystem && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2">
              <OverlayPositionPicker
                overlayType={overlay.type}
                value={String(props.position || defaultOverlayPosition(overlay.type))}
                onChange={(pos) => patchProp(overlay.id, 'position', pos)}
              />
              <p className="text-[8px] text-[var(--dash-muted)] leading-snug min-w-0">
                Clique na grade ou no preview para posicionar o overlay no quadro.
              </p>
            </div>
          )}
        </div>

        <div className="dash-layer-card space-y-3 min-w-0">
          {!isSystem && (
            <OverlayAiBriefing
              overlay={overlay}
              visualPrompts={visualPrompts}
              overlayResearch={overlayResearch}
              globalPlanning={globalPlanning}
              onApplySuggestions={(patch) => {
                patchOverlay(overlay.id, {
                  ...(patch.type ? { type: patch.type } : {}),
                }, patch.props);
              }}
            />
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-200">
                {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
              </p>
              <p className="text-[9px] text-[var(--dash-muted)] mt-0.5 truncate">
                {overlaySummary(overlay)}
              </p>
              <p className="text-[8px] text-[var(--dash-primary-light)] mt-1 truncate font-medium" title={sceneLabel}>
                {sceneLabel}
              </p>
              {narration && (
                <p className="text-[8px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {narration}
                </p>
              )}
            </div>
            {!isSystem && (
              <button
                type="button"
                onClick={() => removeOverlay(overlay.id)}
                className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                title="Remover overlay"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isSystem && (
            <p className="text-[9px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              Overlay de sistema (HUD / capítulo). Posição e conteúdo são definidos automaticamente no render.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Cena âncora" help="Associa o overlay à cena do roteiro." align="start">
                Cena no roteiro
              </SettingLabel>
              <select
                value={String(overlay.scene_ref || (isSceneId(overlay.start) ? overlay.start : '') || '')}
                onChange={(e) => anchorToScene(overlay.id, e.target.value)}
                disabled={isSystem}
                className="dash-select text-[10px]"
              >
                <option value="">— Manual (segundos) —</option>
                {sceneOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Início" help="Segundo absoluto no vídeo." align="start">
                Início (s)
              </SettingLabel>
              <input
                type="number"
                min={0}
                max={totalDuration}
                step={0.01}
                inputMode="decimal"
                disabled={isSystem}
                value={numericStart(overlay, starts)}
                onChange={(e) => {
                  const v = parseOverlaySeconds(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setManualTiming(overlay.id, {
                    start: Math.max(0, Math.min(totalDuration, v)),
                  });
                }}
                className="dash-input font-mono text-[10px]"
              />
            </div>
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Duração" help="Tempo visível no vídeo." align="start">
                Duração (s)
              </SettingLabel>
              <input
                type="number"
                min={1}
                max={120}
                step={0.1}
                inputMode="decimal"
                disabled={isSystem}
                value={overlay.duration}
                onChange={(e) => {
                  const v = parseOverlaySeconds(e.target.value);
                  if (!Number.isFinite(v) || v <= 0) return;
                  setManualTiming(overlay.id, { duration: Math.min(120, v) });
                }}
                className="dash-input font-mono text-[10px]"
              />
            </div>
            {overlay.timing_manual && !isSystem && (
              <p className="sm:col-span-2 text-[8px] text-emerald-400/90 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                Timing manual — o render usa exatamente este início e duração.
              </p>
            )}
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Tipo" help="Formato visual." align="start">
                Tipo de overlay
              </SettingLabel>
              <select
                value={overlay.type}
                disabled={isSystem}
                onChange={(e) => {
                  const newType = e.target.value;
                  const nextProps: Record<string, unknown> = {};
                  if (overlaySupportsPosition(newType)) {
                    nextProps.position = isValidOverlayPosition(newType, String(props.position || ''))
                      ? props.position
                      : defaultOverlayPosition(newType);
                  }
                  patchOverlay(overlay.id, { type: newType }, nextProps);
                }}
                className="dash-select text-[10px]"
              >
                {INFORMATIVE_OVERLAY_TYPES.map((t) => (
                  <option key={t} value={t}>{OVERLAY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {overlaySupportsPosition(overlay.type) && !isSystem && (
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Posição" help="Onde aparece no quadro — grade, preview ou botões." align="start">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Posição no vídeo</span>
              </SettingLabel>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <OverlayPositionPicker
                  overlayType={overlay.type}
                  value={String(props.position || defaultOverlayPosition(overlay.type))}
                  onChange={(pos) => patchProp(overlay.id, 'position', pos)}
                />
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {positions.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => patchProp(overlay.id, 'position', pos.id)}
                      className={`dash-layer-tri-btn !flex-none px-2.5 ${
                        props.position === pos.id ? 'dash-layer-tri-btn-active' : ''
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isSystem && (overlaySupportsVariant(overlay.type) || overlaySupportsTheme(overlay.type)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overlaySupportsVariant(overlay.type) && (
                <div className="space-y-1.5 sm:col-span-2">
                  <SettingLabel helpTitle="Design" help="Variante visual — clique no preview." align="start">
                    <span className="inline-flex items-center gap-1"><Palette className="w-3 h-3" /> Design</span>
                  </SettingLabel>
                  <OverlayVariantPicker
                    overlayType={overlay.type}
                    variants={variants}
                    value={String(props.variant || variants[0]?.id || '')}
                    accentColor={String(props.accentColor || accentColor)}
                    theme={String(props.theme || 'classic')}
                    onChange={(id) => patchProp(overlay.id, 'variant', id)}
                  />
                </div>
              )}
              {overlaySupportsTheme(overlay.type) && (
                <div className="space-y-1.5">
                  <SettingLabel helpTitle="Tema" help="Paleta do overlay." align="start">
                    Tema visual
                  </SettingLabel>
                  <select
                    value={String(props.theme || 'classic')}
                    onChange={(e) => patchProp(overlay.id, 'theme', e.target.value)}
                    className="dash-select text-[10px]"
                  >
                    {OVERLAY_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {hasIcon && !isSystem && (
            <OverlayIconPicker
              iconId={props.iconType ? String(props.iconType) : undefined}
              iconStyle={iconStyle}
              accentColor={String(props.accentColor || accentColor)}
              onChange={(iconId, style) => setIcon(overlay.id, iconId, style)}
            />
          )}

          {contentFields.length > 0 && !isSystem && (
            <div className="space-y-3 pt-1 border-t border-[var(--dash-border)]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Conteúdo</p>
              {contentFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] text-zinc-400">{field.label}</label>
                  {field.kind === 'textarea' ? (
                    <textarea
                      value={String(props[field.key] ?? '')}
                      onChange={(e) => patchProp(overlay.id, field.key, e.target.value)}
                      rows={3}
                      className="dash-input text-[10px] min-h-[72px] resize-y"
                    />
                  ) : field.kind === 'select' ? (
                    <select
                      value={String(props[field.key] ?? field.options?.[0]?.id ?? '')}
                      onChange={(e) => patchProp(overlay.id, field.key, e.target.value)}
                      className="dash-select text-[10px]"
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind === 'number' ? 'number' : 'text'}
                      value={String(props[field.key] ?? '')}
                      placeholder={field.placeholder}
                      onChange={(e) => patchProp(
                        overlay.id,
                        field.key,
                        field.kind === 'number' ? Number(e.target.value) : e.target.value,
                      )}
                      className="dash-input text-[10px]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dash-effect-panel space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <SectionHeader
          title="Overlays informativos (IA)"
          helpId="timeline-overlays"
          size="sm"
          titleClassName="tracking-wider uppercase text-xs"
          icon={<Layers className="w-4 h-4 text-[var(--dash-primary)]" />}
          subtitle={(
            <span className="inline-flex items-center gap-1 text-[9px] text-[var(--dash-muted)]">
              <Clock className="w-3 h-3" />
              {informative.length} editáveis
              {system.length > 0 && ` · ${system.length} de sistema`}
              {' · '}
              duração {formatOverlayTime(totalDuration)}
            </span>
          )}
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {generating ? 'Planejando…' : 'Gerar com IA'}
          </button>
          <button
            type="button"
            onClick={addOverlay}
            className="dash-btn-ghost text-[10px] px-4 py-2 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Novo overlay
          </button>
        </div>
      </div>

      {overlays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--dash-border)] p-8 text-center space-y-3">
          <p className="text-[11px] text-[var(--dash-muted)]">
            Nenhum overlay planejado. Gere com IA ou adicione manualmente. O preview de B-roll aparece na faixa superior quando houver mídia em Mídia por bloco.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-5 py-2 rounded-lg inline-flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Gerar overlays pela IA
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Linha do tempo · B-roll + overlays
            </p>
            {renderOverlayTimeline()}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.32fr)_minmax(0,1.68fr)] gap-4">
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0 z-[1]">
                Lista ({overlays.length})
              </p>
              {overlays.map((overlay) => {
                const start = numericStart(overlay, starts);
                const active = selected?.id === overlay.id;
                const isHud = SYSTEM_OVERLAY_TYPES.includes(overlay.type as never);
                return (
                  <button
                    key={overlay.id}
                    type="button"
                    onClick={() => setSelectedId(overlay.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      active
                        ? 'border-[rgba(130,128,253,0.5)] bg-[rgba(130,128,253,0.12)]'
                        : 'border-[var(--dash-border)] bg-[var(--dash-bg)] hover:border-[rgba(130,128,253,0.3)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-zinc-200">
                        {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
                      </span>
                      <span className="text-[8px] font-mono text-[var(--dash-muted)]">
                        {formatOverlayTime(start)} · {overlay.duration}s
                      </span>
                    </div>
                    <p className="text-[9px] text-[var(--dash-muted)] mt-1 line-clamp-2">
                      {overlaySummary(overlay)}
                    </p>
                    <p className="text-[8px] text-[var(--dash-primary-light)]/90 mt-1 truncate font-medium">
                      {sceneDisplayFor(overlay, sceneOptions, starts)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {isHud && (
                        <span className="text-[7px] uppercase tracking-wide text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                          sistema
                        </span>
                      )}
                      {propsHasIcon(overlay) && !isHud && (
                        <span className="text-[7px] uppercase tracking-wide text-cyan-400/80 border border-cyan-500/30 rounded px-1.5 py-0.5">
                          {resolveIconStyle(overlay.props || {}) === 'svg' ? 'svg' : 'lottie'}
                        </span>
                      )}
                      {overlay.props?.position && (
                        <span className="text-[7px] text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5">
                          {String(overlay.props.position)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 max-h-[480px] overflow-y-auto">
              {selected ? renderInspector(selected) : (
                <p className="text-[10px] text-[var(--dash-muted)]">Selecione um overlay na lista ou na faixa.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function propsHasIcon(overlay: OverlayDraft): boolean {
  return Boolean(overlay.props?.iconType);
}