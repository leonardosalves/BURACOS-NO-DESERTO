import React, { useMemo, useState } from "react";
import {
  Clock,
  Film,
  Layers,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { SettingLabel } from "./SettingHelpTip";
import {
  buildFilmstripSegments,
  filterFilmstripSegmentsForPreview,
  resolveTotalDuration,
} from "./overlayFilmstrip";
import {
  buildSceneOptions,
  formatOverlayTime,
  isSceneId,
  resolveSceneSeconds,
} from "./overlayEditorConfig";
import {
  MOTION_CONTENT_FIELDS,
  MOTION_TEMPLATE_LABELS,
  MOTION_TEMPLATE_OPTIONS,
  motionSceneSummary,
  normalizeMotionScenes,
  type MotionSceneDraft,
} from "./motionEditorConfig";

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
  getAssetUrl?: (path: string) => string;
  generating?: boolean;
  saving?: boolean;
  onChange: (
    nextScenes: MotionSceneDraft[],
    opts?: { immediate?: boolean }
  ) => void;
  onGenerate: () => void;
  onSave?: () => void | Promise<void>;
};

function numericStart(scene: MotionSceneDraft, starts: number[]): number {
  const hint = Number(scene.start_hint);
  if (Number.isFinite(hint)) return hint;
  const ref = String(scene.scene_ref || "").trim();
  if (ref && isSceneId(ref)) {
    const resolved = resolveSceneSeconds(ref, starts);
    if (resolved != null) return resolved;
  }
  return 0;
}

function sceneDisplayFor(
  scene: MotionSceneDraft,
  sceneOptions: { id: string; label: string }[],
  starts: number[]
): string {
  const ref = String(scene.scene_ref || "").trim();
  if (ref) {
    const match = sceneOptions.find((s) => s.id === ref);
    if (match) return match.label;
    return `Cena ${ref}`;
  }
  return `Manual · ${formatOverlayTime(numericStart(scene, starts))}`;
}

export function MotionTimelineEditor({
  storyboard,
  blockTimings,
  timelineAssets = {},
  aspectRatio = "16:9",
  getAssetUrl,
  generating = false,
  saving = false,
  onChange,
  onGenerate,
  onSave,
}: Props) {
  const starts = blockTimings?.starts || [];
  const filmstrip = useMemo(
    () => buildFilmstripSegments(timelineAssets, blockTimings),
    [timelineAssets, blockTimings]
  );
  const visibleFilmstrip = useMemo(
    () => filterFilmstripSegmentsForPreview(filmstrip),
    [filmstrip]
  );
  const totalDuration = useMemo(
    () => resolveTotalDuration(blockTimings, filmstrip),
    [blockTimings, filmstrip]
  );

  const visualPrompts = (storyboard?.visual_prompts || []) as Array<{
    scene?: string;
    block?: number;
    narration_text?: string;
  }>;
  const scenes = useMemo(
    () => normalizeMotionScenes(storyboard?.motion_scenes, starts),
    [storyboard?.motion_scenes, starts]
  );

  const sceneOptions = useMemo(() => {
    return buildSceneOptions(visualPrompts).map((opt) => ({
      ...opt,
      seconds: resolveSceneSeconds(opt.id, starts),
    }));
  }, [visualPrompts, starts]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenes.find((s) => s.id === selectedId) || scenes[0] || null;

  const emitChange = (next: MotionSceneDraft[], immediate = false) => {
    onChange(next, { immediate });
  };

  const patchScene = (
    id: string,
    patch: Partial<MotionSceneDraft>,
    propsPatch?: Record<string, unknown>,
    immediate = false
  ) => {
    const next = scenes.map((s) => {
      if (s.id !== id) return s;
      const merged: MotionSceneDraft = { ...s, ...patch };
      if (propsPatch) {
        merged.props = { ...(s.props || {}), ...propsPatch };
      } else if (patch.props) {
        merged.props = { ...(s.props || {}), ...patch.props };
      }
      return merged;
    });
    emitChange(next, immediate);
  };

  const patchProp = (id: string, key: string, value: unknown) => {
    patchScene(id, {}, { [key]: value }, false);
  };

  const removeScene = (id: string) => {
    const next = scenes.filter((s) => s.id !== id);
    emitChange(next, true);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const addScene = () => {
    const scene = sceneOptions[0];
    const start = scene?.seconds ?? 0;
    const id = `manual-motion-${Date.now()}`;
    const next: MotionSceneDraft = {
      id,
      template_id: "lower-third",
      scene_ref: scene?.id,
      start_hint: start,
      duration_seconds: 4,
      media_mode: "remotion",
      props: {
        title: "Novo template",
        subtitle: "",
      },
    };
    emitChange([...scenes, next], true);
    setSelectedId(id);
  };

  const anchorToScene = (id: string, sceneId: string) => {
    if (!sceneId) {
      const current = scenes.find((s) => s.id === id);
      patchScene(
        id,
        {
          scene_ref: undefined,
          start_hint: current ? numericStart(current, starts) : 0,
        },
        undefined,
        true
      );
      return;
    }
    const seconds = resolveSceneSeconds(sceneId, starts);
    patchScene(
      id,
      {
        scene_ref: sceneId,
        start_hint: seconds ?? 0,
      },
      undefined,
      true
    );
  };

  const timeRulerTicks = useMemo(() => {
    const ticks: number[] = [0];
    const step = totalDuration > 120 ? 30 : totalDuration > 60 ? 15 : 10;
    for (let t = step; t < totalDuration; t += step) ticks.push(t);
    ticks.push(totalDuration);
    return [...new Set(ticks)].sort((a, b) => a - b);
  }, [totalDuration]);

  const renderTimeline = () => (
    <div className="space-y-2">
      <div className="relative rounded-xl border border-[var(--dash-border)] overflow-hidden bg-zinc-950">
        <div className="relative h-20 flex overflow-x-auto border-b border-[var(--dash-border)]">
          {visibleFilmstrip.length === 0 ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-[10px] text-zinc-500 px-4 text-center">
              <Film className="w-3.5 h-3.5 shrink-0" />
              Nenhum B-roll mapeado — associe mídias em Mídia por bloco
            </div>
          ) : (
            visibleFilmstrip.map((seg) => {
              const widthPct = Math.max(
                4,
                (seg.duration / totalDuration) * 100
              );
              const hasMedia = Boolean(seg.asset && getAssetUrl);
              const url = hasMedia ? getAssetUrl!(seg.asset!) : "";
              const isVideo = seg.assetType === "video";
              return (
                <div
                  key={seg.id}
                  className="overlay-filmstrip-cell h-full"
                  style={{ width: `${widthPct}%` }}
                  title={`${seg.blockLabel} · ${formatOverlayTime(seg.start)}`}
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
                      <img
                        src={url}
                        alt=""
                        className="pointer-events-none"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
                      <span className="text-[8px] text-zinc-600 font-mono">
                        {seg.blockLabel}
                      </span>
                    </div>
                  )}
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
                style={{ left: `${left}%`, transform: "translateX(-50%)" }}
              >
                <span className="text-[7px] font-mono text-zinc-500 px-0.5 pb-0.5 whitespace-nowrap">
                  {formatOverlayTime(tick)}
                </span>
              </span>
            );
          })}
        </div>

        <div className="relative h-14 bg-[rgba(106,27,154,0.06)]">
          {scenes.map((scene) => {
            const start = numericStart(scene, starts);
            const duration = Number(scene.duration_seconds) || 4;
            const left = Math.min(97, (start / totalDuration) * 100);
            const width = Math.max(
              3,
              Math.min(100 - left, (duration / totalDuration) * 100)
            );
            const active = selected?.id === scene.id;
            const label =
              MOTION_TEMPLATE_LABELS[scene.template_id] || scene.template_id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => setSelectedId(scene.id)}
                className={`absolute top-1 bottom-1 rounded-md border px-1 flex flex-col justify-center overflow-hidden transition text-left ${
                  active
                    ? "border-purple-400/70 bg-purple-500/35 z-10 shadow-lg"
                    : "border-purple-500/35 bg-purple-500/18 hover:bg-purple-500/28"
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${label} · ${motionSceneSummary(scene)}`}
              >
                <span className="text-[7px] font-bold uppercase tracking-wide text-white/90 truncate">
                  {label.split(" ")[0]}
                </span>
                <span className="text-[6px] text-purple-200/90 truncate">
                  {scene.scene_ref
                    ? `Cena ${scene.scene_ref}`
                    : formatOverlayTime(start)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-purple-500/25 bg-purple-500/6 px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px]">
          <span className="font-bold text-purple-200">
            {MOTION_TEMPLATE_LABELS[selected.template_id] ||
              selected.template_id}
          </span>
          <span className="text-zinc-300 truncate max-w-[200px]">
            {motionSceneSummary(selected)}
          </span>
          <span className="text-[var(--dash-muted)] font-mono">
            {formatOverlayTime(numericStart(selected, starts))} →{" "}
            {selected.duration_seconds}s
          </span>
        </div>
      )}
    </div>
  );

  const renderInspector = (scene: MotionSceneDraft) => {
    const props = scene.props || {};
    const contentFields = MOTION_CONTENT_FIELDS[scene.template_id] || [];

    return (
      <div className="dash-layer-card space-y-3 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-200">
              {MOTION_TEMPLATE_LABELS[scene.template_id] || scene.template_id}
            </p>
            <p className="text-[9px] text-[var(--dash-muted)] mt-0.5 truncate">
              {motionSceneSummary(scene)}
            </p>
            <p className="text-[8px] text-purple-300/90 mt-1 truncate font-medium">
              {sceneDisplayFor(scene, sceneOptions, starts)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeScene(scene.id)}
            className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
            title="Remover template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <SettingLabel
              helpTitle="Template"
              help="Tipo de motion graphic Remotion."
            >
              Template Remotion
            </SettingLabel>
            <select
              value={scene.template_id}
              onChange={(e) =>
                patchScene(
                  scene.id,
                  { template_id: e.target.value },
                  undefined,
                  true
                )
              }
              className="dash-select text-[10px]"
            >
              {MOTION_TEMPLATE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {MOTION_TEMPLATE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <SettingLabel
              helpTitle="Cena âncora"
              help="Associa o template à cena do roteiro."
            >
              Cena no roteiro
            </SettingLabel>
            <select
              value={String(scene.scene_ref || "")}
              onChange={(e) => anchorToScene(scene.id, e.target.value)}
              className="dash-select text-[10px]"
            >
              <option value="">— Manual (segundos) —</option>
              {sceneOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Início" help="Segundo absoluto no vídeo.">
              Início (s)
            </SettingLabel>
            <input
              type="number"
              min={0}
              max={totalDuration}
              step={0.01}
              value={numericStart(scene, starts)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                patchScene(
                  scene.id,
                  {
                    start_hint: Math.max(0, Math.min(totalDuration, v)),
                    scene_ref: undefined,
                  },
                  undefined,
                  true
                );
              }}
              className="dash-input font-mono text-[10px]"
            />
          </div>
          <div className="space-y-1.5">
            <SettingLabel helpTitle="Duração" help="Tempo visível no vídeo.">
              Duração (s)
            </SettingLabel>
            <input
              type="number"
              min={0.5}
              max={120}
              step={0.1}
              value={scene.duration_seconds}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v) || v <= 0) return;
                patchScene(
                  scene.id,
                  {
                    duration_seconds: Math.min(120, v),
                  },
                  undefined,
                  true
                );
              }}
              className="dash-input font-mono text-[10px]"
            />
          </div>
        </div>

        {contentFields.length > 0 && (
          <div className="space-y-3 pt-1 border-t border-[var(--dash-border)]">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              Props do template
            </p>
            {contentFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] text-zinc-400">
                  {field.label}
                </label>
                {field.kind === "textarea" ? (
                  <textarea
                    value={String(props[field.key] ?? "")}
                    onChange={(e) =>
                      patchProp(scene.id, field.key, e.target.value)
                    }
                    rows={field.key === "ai_video_prompt" ? 10 : 3}
                    placeholder={
                      "placeholder" in field
                        ? String(
                            (field as { placeholder?: string }).placeholder ||
                              ""
                          )
                        : undefined
                    }
                    className={`dash-input text-[10px] resize-y font-mono leading-relaxed ${
                      field.key === "ai_video_prompt"
                        ? "min-h-[160px]"
                        : "min-h-[72px]"
                    }`}
                  />
                ) : (
                  <input
                    type={field.kind === "number" ? "number" : "text"}
                    value={String(props[field.key] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      patchProp(
                        scene.id,
                        field.key,
                        field.kind === "number"
                          ? Number(e.target.value)
                          : e.target.value
                      )
                    }
                    className="dash-input text-[10px]"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[8px] text-zinc-500 leading-relaxed">
          Formato {aspectRatio}. Edite catálogo global em Configurações →
          Template Studio.
        </p>
      </div>
    );
  };

  return (
    <div className="dash-effect-panel space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <SectionHeader
          title="Templates Remotion"
          helpId="timeline-motion-templates"
          size="sm"
          titleClassName="tracking-wider uppercase text-xs"
          icon={<Layers className="w-4 h-4 text-purple-400" />}
          subtitle={
            <span className="inline-flex items-center gap-1 text-[9px] text-[var(--dash-muted)]">
              <Clock className="w-3 h-3" />
              {scenes.length} template(s) · duração{" "}
              {formatOverlayTime(totalDuration)}
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scenes.length > 0 && (
            <span className="text-[9px] text-zinc-500 tabular-nums">
              {saving ? "Salvando…" : "Autosave ativo"}
            </span>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || saving}
            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {generating ? "Planejando…" : "Planejar com IA"}
          </button>
          <button
            type="button"
            onClick={addScene}
            disabled={saving}
            className="dash-btn-ghost text-[10px] px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Novo template
          </button>
          {onSave && scenes.length > 0 && (
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || generating}
              className="bg-zinc-900 border border-zinc-700 hover:border-purple-500/40 text-purple-200 disabled:opacity-50 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando…" : "Salvar agora"}
            </button>
          )}
        </div>
      </div>

      {scenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--dash-border)] p-8 text-center space-y-3">
          <p className="text-[11px] text-[var(--dash-muted)]">
            Nenhum template planejado. Use &quot;Planejar com IA&quot;
            (orquestração Remotion) ou adicione manualmente.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-5 py-2 rounded-lg inline-flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Planejar templates
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Linha do tempo · B-roll + templates
            </p>
            {renderTimeline()}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.32fr)_minmax(0,1.68fr)] gap-4">
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0 z-[1]">
                Lista ({scenes.length})
              </p>
              {scenes.map((scene) => {
                const start = numericStart(scene, starts);
                const active = selected?.id === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedId(scene.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      active
                        ? "border-purple-500/50 bg-purple-500/12"
                        : "border-[var(--dash-border)] bg-[var(--dash-bg)] hover:border-purple-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-zinc-200">
                        {MOTION_TEMPLATE_LABELS[scene.template_id] ||
                          scene.template_id}
                      </span>
                      <span className="text-[8px] font-mono text-[var(--dash-muted)]">
                        {formatOverlayTime(start)} · {scene.duration_seconds}s
                      </span>
                    </div>
                    <p className="text-[9px] text-[var(--dash-muted)] mt-1 line-clamp-2">
                      {motionSceneSummary(scene)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 max-h-[480px] overflow-y-auto">
              {selected ? (
                renderInspector(selected)
              ) : (
                <p className="text-[10px] text-[var(--dash-muted)]">
                  Selecione um template na lista ou na faixa.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
