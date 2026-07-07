import React, { useState } from "react";
import { MapPin, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  formatStudioTime,
  type StudioClip,
  type StudioTrack,
} from "./timelineStudioTypes";
import { isClipEditable } from "./timelineStudioClipOps";

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
  const isCesiumReady = mapProvider === "cesium" && hasCoords;
  const hasSatelliteTiles = Boolean(
    isCesiumReady ||
    String(clip.props?.backgroundImage || "").trim() ||
    (Array.isArray(clip.props?.zoom_keyframes) &&
      clip.props.zoom_keyframes.some((kf: { image?: string }) =>
        Boolean(String(kf?.image || "").trim())
      ))
  );
  const motionQcOk = clip.props?.motion_quality_ok !== false;
  const motionQcScore = Number(clip.props?.motion_quality_score) || 0;
  const keyframeCount = Array.isArray(clip.props?.zoom_keyframes)
    ? clip.props.zoom_keyframes.length
    : 0;
  const zoomTo = Number(clip.props?.zoom_to) || 0;

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
                    motionQcOk && hasSatelliteTiles
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {motionQcOk && hasSatelliteTiles
                    ? isCesiumReady
                      ? `QC OK · ${keyframeCount} keyframes · Cesium 3D · zoom ${zoomTo || "—"}`
                      : `QC OK · ${keyframeCount} tiles · zoom ${zoomTo || "—"}`
                    : hasSatelliteTiles
                      ? isCesiumReady
                        ? `QC pendente · ${keyframeCount} keyframes Cesium (revise zoom/contorno)`
                        : `QC pendente · ${keyframeCount} tiles (revise zoom/contorno)`
                      : "Sem tiles — QC vai re-baixar ao orquestrar"}
                </span>
                {getProjectUrl ? (
                  <button
                    type="button"
                    disabled={fetchingSatellite}
                    onClick={async () => {
                      setFetchingSatellite(true);
                      try {
                        const res = await fetch(
                          getProjectUrl(
                            "/api/ai/creator/motion-scenes/satellite"
                          ),
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({}),
                          }
                        );
                        if (!res.ok) throw new Error(await res.text());
                        const data = await res.json();
                        const hit = (data.results || []).find(
                          (row: { id?: string }) => row.id === clip.id
                        );
                        if (hit?.ok === false) {
                          const detail =
                            hit.reason === "geocode_failed"
                              ? "geocode_failed — preencha local/cidade/país ou use nome canônico (ex.: Laufenburg, Suíça)"
                              : hit.reason || "Falha ao baixar mapa satélite";
                          throw new Error(detail);
                        }
                        if (data.studio && onSatelliteSynced) {
                          onSatelliteSynced(data.studio);
                        } else {
                          const motion = (data.motion_scenes || []).find(
                            (ms: { id?: string }) => ms.id === clip.id
                          );
                          if (motion?.props) {
                            onUpdate({
                              props: { ...clip.props, ...motion.props },
                            });
                          }
                        }
                        const q = data.quality as
                          { ok?: boolean; score?: number } | undefined;
                        toast.success(
                          `Satélite + QC ${q?.score ?? motionQcScore}/100${q?.ok ? " ✓" : " — revise inspector"}`
                        );
                      } catch (err) {
                        toast.error(
                          `Mapa: ${(err as Error).message || "erro desconhecido"}`
                        );
                      } finally {
                        setFetchingSatellite(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 cursor-pointer disabled:opacity-50"
                  >
                    <MapPin
                      className={`w-3 h-3 ${fetchingSatellite ? "animate-pulse" : ""}`}
                    />
                    {fetchingSatellite ? "Baixando…" : "Baixar voo satélite"}
                  </button>
                ) : null}
              </div>
              <p className="text-[9px] text-zinc-600 mt-1">
                Cidade: descida do espaço + contorno OSM. POI: zoom até o
                monumento/prédio (satélite 3D real exige Google Earth Studio).
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
