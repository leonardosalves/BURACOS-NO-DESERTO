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

type Props = {
  clip: StudioClip;
  track: StudioTrack | undefined;
  onClose: () => void;
  onUpdate: (patch: Partial<StudioClip>) => void;
  onCaptionText: (text: string) => void;
  onDelete: () => void;
  getProjectUrl?: (endpoint: string) => string;
  onSatelliteSynced?: (studio: unknown) => void;
};

export function TimelineStudioClipInspector({
  clip,
  track,
  onClose,
  onUpdate,
  onCaptionText,
  onDelete,
  getProjectUrl,
  onSatelliteSynced,
}: Props) {
  const editable = isClipEditable(clip);
  const captionText = String(clip.props?.text || clip.label || "");
  const [fetchingSatellite, setFetchingSatellite] = useState(false);
  const mapProvider = String(clip.props?.map_provider || "");
  const hasCoords =
    Number.isFinite(Number(clip.props?.lat)) &&
    Number.isFinite(Number(clip.props?.lng));
  const flyoverVideo = String(clip.props?.flyover_video || "").trim();
  const isBlenderReady = mapProvider === "blender" && Boolean(flyoverVideo);
  const isCesiumReady = mapProvider === "cesium" && hasCoords;
  const hasSatelliteTiles = locationIntroHasSatellite(clip);
  const needsSatelliteFetch = locationIntroNeedsSatelliteFetch(clip);
  const motionQcOk = clip.props?.motion_quality_ok !== false;
  const motionQcScore = Number(clip.props?.motion_quality_score) || 0;
  const keyframeCount = Array.isArray(clip.props?.zoom_keyframes)
    ? clip.props.zoom_keyframes.length
    : 0;
  const zoomTo = Number(clip.props?.zoom_to) || 0;

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
          `Satélite + QC ${q?.score ?? motionQcScore}/100${q?.ok ? " ✓" : " — revise inspector"}`
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
    if (!needsSatelliteFetch || !getProjectUrl || autoFetchStartedRef.current) {
      return;
    }
    autoFetchStartedRef.current = true;
    void runSatelliteFetch(true);
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
              onUpdate({ start: Math.max(0, Number(e.target.value) || 0) })
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
              onUpdate({
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
            <Field label="Mapa satélite" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-semibold ${
                    fetchingSatellite
                      ? "text-sky-400"
                      : motionQcOk && hasSatelliteTiles
                        ? "text-emerald-400"
                        : "text-amber-400"
                  }`}
                >
                  {fetchingSatellite
                    ? "Baixando voo satélite automaticamente…"
                    : motionQcOk && hasSatelliteTiles
                      ? isBlenderReady
                        ? `QC OK · Blender MP4 · zoom ${zoomTo || "—"}`
                        : isCesiumReady
                          ? `QC OK · ${keyframeCount} keyframes · Cesium 3D · zoom ${zoomTo || "—"}`
                          : `QC OK · ${keyframeCount} tiles · zoom ${zoomTo || "—"}`
                      : hasSatelliteTiles
                        ? isCesiumReady
                          ? `QC pendente · ${keyframeCount} keyframes Cesium (revise zoom/contorno)`
                          : `QC pendente · ${keyframeCount} tiles (revise zoom/contorno)`
                        : "Aguardando geocode — baixa automática ao abrir o clip"}
                </span>
                {isCesiumReady ? (
                  <span className="text-[9px] text-zinc-500 w-full">
                    Preview 3D fullscreen — posicione o playhead dentro do clip
                    ({Number(clip.start).toFixed(1)}s)
                  </span>
                ) : null}
                {getProjectUrl && needsSatelliteFetch ? (
                  <button
                    type="button"
                    disabled={fetchingSatellite}
                    onClick={() => void runSatelliteFetch(false)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 text-zinc-400 cursor-pointer disabled:opacity-50"
                  >
                    <MapPin
                      className={`w-3 h-3 ${fetchingSatellite ? "animate-pulse" : ""}`}
                    />
                    {fetchingSatellite ? "Baixando…" : "Re-baixar satélite"}
                  </button>
                ) : null}
              </div>
              <p className="text-[9px] text-zinc-600 mt-1">
                Orquestração automática ao abrir a timeline: escolhe template,
                preenche dados (mapa Blender, contadores, etc.) e sincroniza
                clips. Requer Blender para flyover (BLENDER_PATH).
              </p>
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
