import React, { useEffect, useRef, useState } from "react";
import { MapPin, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  formatStudioTime,
  type StudioClip,
  type StudioTrack,
} from "./timelineStudioTypes";
import { isClipEditable } from "./timelineStudioClipOps";
import {
  applySatelliteResultToClip,
  fetchProjectSatellite,
  locationIntroHasSatellite,
  locationIntroNeedsSatelliteFetch,
} from "./timelineStudioSatellite";
import { GeoFlyoverUploadField } from "./GeoFlyoverUploadField";
import {
  applyStudioSlotPatch,
  applyTimingManualPatch,
  parseSlotInput,
  resolveStudioInspectorSlots,
  slotDisplayValue,
  studioSlotKind,
} from "./studioClipInspectorSlots";

function incomingStudioKeepsMotionClip(
  studio: unknown,
  clipId: string
): boolean {
  const clips = Array.isArray((studio as { clips?: unknown[] })?.clips)
    ? ((studio as { clips: StudioClip[] }).clips ?? [])
    : [];
  return clips.some(
    (c) =>
      String(c.id || "") === clipId &&
      (c.trackId === "motion" || c.motionScene === true)
  );
}

type Props = {
  clip: StudioClip;
  track: StudioTrack | undefined;
  onClose: () => void;
  onUpdate: (patch: Partial<StudioClip>) => void;
  onCaptionText: (text: string) => void;
  onDelete: () => void;
  getProjectUrl?: (endpoint: string) => string;
  getAssetUrl?: (fileName: string) => string;
  onSatelliteSynced?: (studio: unknown) => void;
  onPersistStudio?: () => Promise<void>;
};

export function TimelineStudioClipInspector({
  clip,
  track,
  onClose,
  onUpdate,
  onCaptionText,
  onDelete,
  getProjectUrl,
  getAssetUrl,
  onSatelliteSynced,
  onPersistStudio,
}: Props) {
  const editable = isClipEditable(clip);
  const captionText = String(clip.props?.text || clip.label || "");
  const [fetchingSatellite, setFetchingSatellite] = useState(false);
  const mapProvider = String(clip.props?.map_provider || "ai_t2v");
  const aiGeoPrompt = String(clip.props?.ai_video_prompt || "").trim();
  const geoBrief = String(clip.props?.geo_prompt_brief || "").trim();
  const hasAiGeoPrompt = aiGeoPrompt.length >= 80;
  const hasSatelliteTiles = locationIntroHasSatellite(clip);
  const needsSatelliteFetch = locationIntroNeedsSatelliteFetch(clip);
  const motionQcOk = clip.props?.motion_quality_ok !== false;
  const motionQcScore = Number(clip.props?.motion_quality_score) || 0;
  const studioSource = String(clip.props?.studio_source_code || "").trim();
  const studioProps =
    clip.props?.studio_props &&
    typeof clip.props.studio_props === "object" &&
    !Array.isArray(clip.props.studio_props)
      ? (clip.props.studio_props as Record<string, unknown>)
      : {};
  const studioMeta = clip.props?.studio_props_meta as
    { confidence?: number; filled_slots?: string[] } | undefined;
  const studioInspectorSlots = resolveStudioInspectorSlots(clip);
  const userLocked = clip.props?.studio_user_locked === true;

  const patchStudioSlot = (slot: string, raw: string) => {
    try {
      const value = parseSlotInput(slot, raw);
      onUpdate(applyStudioSlotPatch(clip, slot, value));
    } catch {
      toast.error(`JSON inválido no campo ${slot}`);
    }
  };

  const patchTiming = (patch: Partial<typeof clip>) => {
    onUpdate(applyTimingManualPatch(clip, patch));
  };

  const autoFetchStartedRef = useRef(false);

  const runSatelliteFetch = async (silent = false) => {
    if (!getProjectUrl) return;
    setFetchingSatellite(true);
    try {
      const data = await fetchProjectSatellite(getProjectUrl, { silent });
      if (!data) return;

      if (data.studio && onSatelliteSynced) {
        onSatelliteSynced(data.studio);
      } else {
        const patch = applySatelliteResultToClip(clip, data);
        if (patch) onUpdate(patch);
      }

      const q = data.quality as { ok?: boolean; score?: number } | undefined;
      if (!silent) {
        toast.success(
          `Prompt IA Geo + QC ${q?.score ?? motionQcScore}/100${q?.ok ? " ✓" : " — revise inspector"}`
        );
      }
    } catch (err) {
      if (!silent) {
        toast.error(`Mapa: ${(err as Error).message || "erro desconhecido"}`);
      }
    } finally {
      setFetchingSatellite(false);
    }
  };

  useEffect(() => {
    autoFetchStartedRef.current = false;
  }, [clip.id]);

  useEffect(() => {
    if (!needsSatelliteFetch || !getProjectUrl || autoFetchStartedRef.current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (autoFetchStartedRef.current) return;
      autoFetchStartedRef.current = true;
      void runSatelliteFetch(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [clip.id, needsSatelliteFetch, getProjectUrl]);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: clip.color || track?.color || "#64748b" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 truncate">
            {track?.label || clip.trackId}
          </span>
          <span className="text-[9px] text-zinc-600 font-mono truncate">
            {clip.id}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editable ? (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Remover clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Início">
          <input
            type="number"
            min={0}
            step={0.05}
            disabled={!editable}
            value={Number(clip.start.toFixed(2))}
            onChange={(e) =>
              patchTiming({
                start: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono disabled:opacity-50"
          />
          <span className="text-[9px] text-zinc-600">
            {formatStudioTime(clip.start)}
          </span>
        </Field>

        <Field label="Duração">
          <input
            type="number"
            min={0.08}
            step={0.05}
            disabled={!editable}
            value={Number(clip.duration.toFixed(2))}
            onChange={(e) =>
              patchTiming({
                duration: Math.max(0.08, Number(e.target.value) || 0.08),
              })
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono disabled:opacity-50"
          />
          <span className="text-[9px] text-zinc-600">
            fim {formatStudioTime(clip.start + clip.duration)}
          </span>
        </Field>

        {clip.source ? (
          <Field label="Fonte" className="sm:col-span-2">
            <p className="text-[10px] text-zinc-400 truncate font-mono">
              {clip.source}
            </p>
          </Field>
        ) : null}

        {clip.templateId ? (
          <Field label="Template">
            <p className="text-[10px] text-emerald-400 font-semibold">
              {clip.templateId}
            </p>
          </Field>
        ) : null}

        {studioSource ? (
          <>
            <Field label="Template Studio" className="sm:col-span-2">
              <p className="text-[10px] text-purple-300 font-semibold">
                {String(
                  clip.props?.template_studio_name ||
                    clip.props?.template_studio_id ||
                    "Studio"
                )}
              </p>
              {studioMeta?.confidence !== undefined ? (
                <p className="text-[9px] text-zinc-500 mt-0.5">
                  Contrato preenchido · confiança{" "}
                  {Math.round(Number(studioMeta.confidence) * 100)}%
                  {clip.props?.studio_role
                    ? ` · papel ${String(clip.props.studio_role)}`
                    : ""}
                  {clip.props?.boosted ? " · boost IA" : ""}
                  {userLocked ? " · edição manual protegida" : ""}
                  {clip.props?.timing_manual ? " · timing manual" : ""}
                  {clip.props?.studio_z_index === "under"
                    ? " · fundo (atrás do B-roll)"
                    : ""}
                  {clip.props?.studio_opacity !== undefined
                    ? ` · opacidade ${Math.round(Number(clip.props.studio_opacity) * 100)}%`
                    : ""}
                </p>
              ) : null}
              {Array.isArray(clip.props?.template_studio_data_slots) ? (
                <p className="text-[9px] text-zinc-600 mt-0.5 font-mono truncate">
                  slots:{" "}
                  {(clip.props.template_studio_data_slots as string[]).join(
                    ", "
                  )}
                </p>
              ) : null}
            </Field>
            {studioInspectorSlots.map((slot) => {
              const kind = studioSlotKind(slot);
              const wide =
                kind === "array" ||
                [
                  "text",
                  "subtitle",
                  "headline",
                  "title",
                  "descriptorText",
                ].includes(slot);
              const display = slotDisplayValue(clip, slot);
              const lockedSlots = Array.isArray(
                clip.props?.studio_user_locked_slots
              )
                ? (clip.props.studio_user_locked_slots as string[])
                : [];
              const isLocked = lockedSlots.includes(slot);

              return (
                <Field
                  key={slot}
                  label={`${slot}${isLocked ? " 🔒" : ""}`}
                  className={wide ? "sm:col-span-2 lg:col-span-4" : ""}
                >
                  {kind === "array" ? (
                    <textarea
                      disabled={!editable}
                      value={display}
                      onChange={(e) => patchStudioSlot(slot, e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-200 resize-y min-h-[100px] font-mono leading-relaxed disabled:opacity-50"
                      placeholder='[{"label":"Aço","value":250}]'
                    />
                  ) : kind === "color" ? (
                    <input
                      type="color"
                      disabled={!editable}
                      value={
                        /^#[0-9a-f]{6}$/i.test(display) ? display : "#d4af37"
                      }
                      onChange={(e) => patchStudioSlot(slot, e.target.value)}
                      className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
                    />
                  ) : (
                    <input
                      type={kind === "number" ? "number" : "text"}
                      disabled={!editable}
                      value={display}
                      onChange={(e) => patchStudioSlot(slot, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
                    />
                  )}
                </Field>
              );
            })}
          </>
        ) : null}

        {clip.templateId === "location-intro" ? (
          <>
            <Field label="Local" className="sm:col-span-2">
              <input
                type="text"
                disabled={!editable}
                value={String(clip.props?.location || "")}
                onChange={(e) =>
                  onUpdate({
                    props: { ...clip.props, location: e.target.value },
                    label: e.target.value || clip.label,
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
              />
            </Field>
            <Field
              label="Vídeo geográfico IA"
              className="sm:col-span-2 lg:col-span-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-semibold ${
                    fetchingSatellite
                      ? "text-sky-400"
                      : motionQcOk && hasAiGeoPrompt
                        ? "text-emerald-400"
                        : "text-amber-400"
                  }`}
                >
                  {fetchingSatellite
                    ? "Gerando prompt IA Geo automaticamente…"
                    : motionQcOk && hasAiGeoPrompt
                      ? `QC OK · ${mapProvider} · ${geoBrief || "zoom Terra→alvo"}`
                      : hasSatelliteTiles
                        ? "QC pendente — revise o prompt"
                        : "Aguardando prompt — geração automática ao abrir o clip"}
                </span>
                {getProjectUrl && (needsSatelliteFetch || hasAiGeoPrompt) ? (
                  <button
                    type="button"
                    disabled={fetchingSatellite}
                    onClick={() => void runSatelliteFetch(false)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-200 cursor-pointer disabled:opacity-50"
                  >
                    <MapPin
                      className={`w-3 h-3 ${fetchingSatellite ? "animate-pulse" : ""}`}
                    />
                    {fetchingSatellite ? "Gerando…" : "Regenerar prompt IA"}
                  </button>
                ) : null}
                {hasAiGeoPrompt ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(aiGeoPrompt);
                      toast.success(
                        "Prompt copiado - cole no Grok ou Google Flow"
                      );
                    }}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    Copiar prompt
                  </button>
                ) : null}
              </div>
              <textarea
                disabled={!editable}
                value={aiGeoPrompt}
                onChange={(e) =>
                  onUpdate({
                    props: {
                      ...clip.props,
                      ai_video_prompt: e.target.value,
                      map_provider: "ai_t2v",
                      geo_generation: "ai_prompt",
                    },
                  })
                }
                rows={8}
                placeholder="Zoom continuo da Terra ate o local, destaque territorial, orbita 360 em POIs - prompt rico para Grok ou Google Flow."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-200 resize-y min-h-[140px] font-mono leading-relaxed disabled:opacity-50"
              />
              <p className="text-[9px] text-zinc-600 mt-1">
                Substitui Blender/Cesium: use este prompt no Grok ou Google Flow
                para gerar o voo satelite fotorrealista. Destaque de pais/cidade
                e clima vem da narracao.
              </p>
              {getProjectUrl && getAssetUrl ? (
                <div className="mt-3">
                  <GeoFlyoverUploadField
                    motionId={clip.id}
                    flyoverPath={String(clip.props?.flyover_video || "")}
                    getProjectUrl={getProjectUrl}
                    getAssetUrl={getAssetUrl}
                    compact
                    onBeforeUpload={async () => {
                      if (!getProjectUrl) return;
                      const res = await fetch(
                        getProjectUrl(
                          "/api/timeline-studio/motion-clip/ensure"
                        ),
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ clip }),
                        }
                      );
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(
                          String(
                            (data as { error?: string }).error ||
                              "Falha ao sincronizar cena motion no projeto."
                          )
                        );
                      }
                      const data = await res.json();
                      if (data.studio && onSatelliteSynced) {
                        onSatelliteSynced(data.studio);
                      }
                      if (onPersistStudio) await onPersistStudio();
                    }}
                    onUploaded={(result) => {
                      onUpdate({
                        props: {
                          ...clip.props,
                          flyover_video: result.flyover_video,
                          map_provider: "ai_t2v",
                          geo_generation: "ai_prompt",
                        },
                      });
                      if (
                        result.studio &&
                        onSatelliteSynced &&
                        incomingStudioKeepsMotionClip(result.studio, clip.id)
                      ) {
                        onSatelliteSynced(result.studio);
                      }
                    }}
                  />
                </div>
              ) : null}
            </Field>
          </>
        ) : null}

        {clip.templateId === "pictogram-chart" ? (
          <Field label="Título do pictograma" className="sm:col-span-2">
            <input
              type="text"
              disabled={!editable}
              value={String(clip.props?.title || "")}
              onChange={(e) =>
                onUpdate({
                  props: { ...clip.props, title: e.target.value },
                })
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
            />
          </Field>
        ) : null}

        {clip.trackId === "captions" ? (
          <Field
            label="Texto da legenda"
            className="sm:col-span-2 lg:col-span-4"
          >
            <textarea
              value={captionText}
              disabled={!editable}
              onChange={(e) => onCaptionText(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-white resize-y min-h-[56px] disabled:opacity-50 focus:outline-none focus:border-indigo-500/50"
              placeholder="Edite a legenda…"
            />
          </Field>
        ) : clip.label ? (
          <Field label="Rótulo" className="sm:col-span-2">
            <input
              type="text"
              disabled={!editable}
              value={clip.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}
