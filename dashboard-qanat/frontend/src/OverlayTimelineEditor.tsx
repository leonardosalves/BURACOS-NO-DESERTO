import React, { useMemo, useState } from 'react';
import {
  Clock,
  Layers,
  MapPin,
  Palette,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { SettingLabel } from './SettingHelpTip';
import {
  INFORMATIVE_OVERLAY_TYPES,
  LOTTIE_ICON_OPTIONS,
  OVERLAY_CONTENT_FIELDS,
  OVERLAY_POSITIONS,
  OVERLAY_THEMES,
  OVERLAY_TYPE_LABELS,
  OVERLAY_VARIANTS,
  SYSTEM_OVERLAY_TYPES,
  buildSceneOptions,
  formatOverlayTime,
  isSceneId,
  normalizeOverlayList,
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

export function OverlayTimelineEditor({
  storyboard,
  blockTimings,
  generating = false,
  onChange,
  onGenerate,
}: Props) {
  const starts = blockTimings?.starts || [];
  const totalDuration = useMemo(() => {
    if (blockTimings?.total_duration && blockTimings.total_duration > 0) {
      return blockTimings.total_duration;
    }
    const durations = blockTimings?.durations || [];
    const sum = durations.reduce((acc, d) => acc + (Number(d) || 0), 0);
    return sum > 0 ? sum : 60;
  }, [blockTimings]);

  const rawOverlays = (storyboard?.overlays_ai || storyboard?.overlays || []) as OverlayDraft[];
  const overlays = useMemo(() => normalizeOverlayList(rawOverlays), [rawOverlays]);
  const visualPrompts = (storyboard?.visual_prompts || []) as Array<{
    scene?: string;
    block?: number;
    narration_text?: string;
  }>;

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
      },
    };
    onChange([...overlays, next]);
    setSelectedId(id);
  };

  const anchorToScene = (id: string, sceneId: string) => {
    const seconds = resolveSceneSeconds(sceneId, starts);
    patchOverlay(id, {
      scene_ref: sceneId,
      start: seconds ?? sceneId,
    });
  };

  const setLottieEnabled = (id: string, enabled: boolean, current?: OverlayDraft) => {
    const overlay = current || overlays.find((o) => o.id === id);
    if (!overlay) return;
    if (enabled) {
      patchProp(id, 'iconType', overlay.props?.iconType || 'sparkles');
      return;
    }
    const nextProps = { ...(overlay.props || {}), iconType: undefined };
    patchOverlay(id, { props: nextProps });
  };

  const renderTimelineBar = () => (
    <div className="relative h-10 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 9.5%, rgba(130,128,253,0.15) 10%)',
      }} />
      {overlays.map((overlay) => {
        const start = numericStart(overlay, starts);
        const duration = Number(overlay.duration) || 4;
        const left = Math.min(98, (start / totalDuration) * 100);
        const width = Math.max(2, Math.min(100 - left, (duration / totalDuration) * 100));
        const isHud = SYSTEM_OVERLAY_TYPES.includes(overlay.type as never);
        const active = selected?.id === overlay.id;
        return (
          <button
            key={overlay.id}
            type="button"
            title={`${OVERLAY_TYPE_LABELS[overlay.type] || overlay.type} · ${formatOverlayTime(start)}`}
            onClick={() => setSelectedId(overlay.id)}
            className={`absolute top-1 bottom-1 rounded-md border text-[7px] font-bold uppercase tracking-wide px-1 truncate transition ${
              active
                ? 'border-[var(--dash-primary-light)] bg-[rgba(130,128,253,0.35)] text-white z-10'
                : isHud
                  ? 'border-zinc-600 bg-zinc-800/80 text-zinc-400'
                  : 'border-[rgba(130,128,253,0.35)] bg-[rgba(130,128,253,0.18)] text-[var(--dash-primary-light)] hover:bg-[rgba(130,128,253,0.28)]'
            }`}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            {OVERLAY_TYPE_LABELS[overlay.type]?.split(' ')[0] || overlay.type}
          </button>
        );
      })}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-[var(--dash-muted)] pointer-events-none">
        {formatOverlayTime(totalDuration)}
      </div>
    </div>
  );

  const renderInspector = (overlay: OverlayDraft) => {
    const props = overlay.props || {};
    const isSystem = SYSTEM_OVERLAY_TYPES.includes(overlay.type as never);
    const contentFields = OVERLAY_CONTENT_FIELDS[overlay.type] || [];
    const positions = OVERLAY_POSITIONS[overlay.type] || [];
    const variants = OVERLAY_VARIANTS[overlay.type] || [];
    const hasLottie = overlaySupportsLottie(overlay.type);
    const lottieOn = Boolean(props.iconType);

    return (
      <div className="dash-layer-card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-zinc-200">
              {OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}
            </p>
            <p className="text-[9px] text-[var(--dash-muted)] mt-0.5 truncate max-w-[240px]">
              {overlaySummary(overlay)}
            </p>
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

        {/* Tempo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Cena âncora" help="Associa o overlay à cena do roteiro. O início em segundos segue o bloco narrativo." align="start">
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
            <SettingLabel helpTitle="Início" help="Segundo absoluto no vídeo onde o overlay entra." align="start">
              Início (s)
            </SettingLabel>
            <input
              type="number"
              min={0}
              max={totalDuration}
              step={0.1}
              disabled={isSystem}
              value={Number.isFinite(numericStart(overlay, starts)) ? numericStart(overlay, starts) : 0}
              onChange={(e) => patchOverlay(overlay.id, { start: Number(e.target.value) })}
              className="dash-input font-mono text-[10px]"
            />
          </div>
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Duração" help="Quanto tempo o overlay permanece visível." align="start">
              Duração (s)
            </SettingLabel>
            <input
              type="number"
              min={1}
              max={30}
              step={0.5}
              disabled={isSystem}
              value={overlay.duration}
              onChange={(e) => patchOverlay(overlay.id, { duration: Number(e.target.value) })}
              className="dash-input font-mono text-[10px]"
            />
          </div>
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Tipo" help="Formato visual do informativo." align="start">
              Tipo de overlay
            </SettingLabel>
            <select
              value={overlay.type}
              disabled={isSystem}
              onChange={(e) => patchOverlay(overlay.id, { type: e.target.value })}
              className="dash-select text-[10px]"
            >
              {INFORMATIVE_OVERLAY_TYPES.map((t) => (
                <option key={t} value={t}>{OVERLAY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Posição */}
        {overlaySupportsPosition(overlay.type) && !isSystem && (
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Posição" help="Onde o overlay aparece no quadro 16:9 ou 9:16." align="start">
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Posição no quadro</span>
            </SettingLabel>
            <div className="flex flex-wrap gap-1.5">
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
        )}

        {/* Design */}
        {!isSystem && (overlaySupportsVariant(overlay.type) || overlaySupportsTheme(overlay.type)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overlaySupportsVariant(overlay.type) && (
              <div className="space-y-1.5">
                <SettingLabel helpTitle="Design" help="Variante visual HyperFrames / Remotion." align="start">
                  <span className="inline-flex items-center gap-1"><Palette className="w-3 h-3" /> Design</span>
                </SettingLabel>
                <select
                  value={String(props.variant || variants[0]?.id || '')}
                  onChange={(e) => patchProp(overlay.id, 'variant', e.target.value)}
                  className="dash-select text-[10px]"
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
            )}
            {overlaySupportsTheme(overlay.type) && (
              <div className="space-y-1.5">
                <SettingLabel helpTitle="Tema" help="Paleta e ornamentos do overlay." align="start">
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

        {/* Lottie */}
        {hasLottie && !isSystem && (
          <div className="space-y-2 pt-1 border-t border-[var(--dash-border)]">
            <div className="flex items-center justify-between gap-3">
              <SettingLabel helpTitle="Ícone Lottie" help="Animação LottieFiles ao lado do texto." align="start">
                Ícone Lottie
              </SettingLabel>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={lottieOn}
                  onChange={(e) => setLottieEnabled(overlay.id, e.target.checked, overlay)}
                  className="dash-checkbox"
                />
                {lottieOn ? 'Ligado' : 'Desligado'}
              </label>
            </div>
            {lottieOn && (
              <select
                value={String(props.iconType || 'sparkles')}
                onChange={(e) => patchProp(overlay.id, 'iconType', e.target.value)}
                className="dash-select text-[10px]"
              >
                {LOTTIE_ICON_OPTIONS.map((icon) => (
                  <option key={icon.id} value={icon.id}>{icon.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Conteúdo */}
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
    );
  };

  return (
    <div className="dash-effect-panel space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <SectionHeader
          title="Overlays informativos (IA)"
          helpId="timeline-overlays"
          help="Ajuste posição, tempo, conteúdo, design e ícone Lottie de cada overlay gerado pela IA. As mudanças são salvas no storyboard.json."
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
            Nenhum overlay planejado ainda. Use <strong className="text-zinc-300">Gerar com IA</strong> para criar
            informativos (lower thirds, cards, mapas, posts) sincronizados ao roteiro.
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
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Linha do tempo</p>
            {renderTimelineBar()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0 bg-transparent z-[1]">
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
                    <p className="text-[9px] text-[var(--dash-muted)] mt-1 truncate">
                      {overlaySummary(overlay)}
                    </p>
                    {isHud && (
                      <span className="inline-block mt-1 text-[7px] uppercase tracking-wide text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                        sistema
                      </span>
                    )}
                    {String(propsHasLottie(overlay)) && !isHud && (
                      <span className="inline-block mt-1 ml-1 text-[7px] uppercase tracking-wide text-cyan-400/80 border border-cyan-500/30 rounded px-1.5 py-0.5">
                        lottie
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0">
              {selected ? renderInspector(selected) : (
                <p className="text-[10px] text-[var(--dash-muted)]">Selecione um overlay na lista.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function propsHasLottie(overlay: OverlayDraft): boolean {
  return Boolean(overlay.props?.iconType);
}