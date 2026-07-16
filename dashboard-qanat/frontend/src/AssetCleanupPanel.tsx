import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type CleanupRect = { x: number; y: number; width: number; height: number };
type CleanupAsset = {
  id: string;
  block: string;
  assetIndex: number;
  asset: string;
  type: "image" | "video";
  sceneRef: string;
};
type CleanupJob = {
  id: string;
  status: "preview_ready" | "applied" | "reverted" | string;
  source_asset: string;
  result_asset: string;
  media_type: "image" | "video";
  method: string;
};

type Props = {
  timelineAssets?: Record<string, any[]>;
  getProjectUrl: (path: string) => string;
  getMediaUrl: (file: string) => string;
  onApplied?: () => void | Promise<void>;
  toast: (message: string, options?: unknown) => void;
};

const DEFAULT_RECT: CleanupRect = {
  x: 0.68,
  y: 0.82,
  width: 0.28,
  height: 0.12,
};

const SUPPORTED_IMAGE = /\.(png|jpe?g|webp)(\?|$)/i;
const SUPPORTED_VIDEO = /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i;

function mediaKind(asset: string, slotType = ""): "image" | "video" | null {
  if (SUPPORTED_VIDEO.test(asset) || /video|vídeo/i.test(slotType))
    return "video";
  if (SUPPORTED_IMAGE.test(asset) || /image|imagem/i.test(slotType))
    return "image";
  return null;
}

function AssetPreview({
  src,
  type,
  className = "",
  onDimensions,
}: {
  src: string;
  type: "image" | "video";
  className?: string;
  onDimensions?: (width: number, height: number) => void;
}) {
  if (type === "video") {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        onLoadedMetadata={(event) =>
          onDimensions?.(
            event.currentTarget.videoWidth,
            event.currentTarget.videoHeight
          )
        }
        className={`h-full w-full object-contain ${className}`}
      />
    );
  }
  return (
    <img
      src={src}
      alt="Asset selecionado para higienização"
      onLoad={(event) =>
        onDimensions?.(
          event.currentTarget.naturalWidth,
          event.currentTarget.naturalHeight
        )
      }
      className={`h-full w-full object-contain ${className}`}
    />
  );
}

export function AssetCleanupPanel({
  timelineAssets = {},
  getProjectUrl,
  getMediaUrl,
  onApplied,
  toast,
}: Props) {
  const assets = useMemo<CleanupAsset[]>(() => {
    const result: CleanupAsset[] = [];
    for (const [block, slots] of Object.entries(timelineAssets || {})) {
      (Array.isArray(slots) ? slots : []).forEach((slot, assetIndex) => {
        const asset = String(slot?.asset || "").trim();
        const type = mediaKind(asset, String(slot?.type || ""));
        if (!asset || !type) return;
        result.push({
          id: `${block}:${assetIndex}`,
          block,
          assetIndex,
          asset,
          type,
          sceneRef: String(slot?.scene_ref || `${block}.${assetIndex + 1}`),
        });
      });
    }
    return result;
  }, [timelineAssets]);
  const [selectedId, setSelectedId] = useState(assets[0]?.id || "");
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const [rect, setRect] = useState<CleanupRect>(DEFAULT_RECT);
  const [dimensions, setDimensions] = useState({ width: 16, height: 9 });
  const [method, setMethod] = useState<"reconstruct" | "blur">("reconstruct");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [job, setJob] = useState<CleanupJob | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  useEffect(() => {
    setRect(DEFAULT_RECT);
    setRightsConfirmed(false);
    setJob(null);
  }, [selected?.id]);

  const pointerPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const beginMask = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPoint(event);
    drawStartRef.current = point;
    setRect({ x: point.x, y: point.y, width: 0.01, height: 0.01 });
    setJob(null);
  };

  const moveMask = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = drawStartRef.current;
    if (!start) return;
    const point = pointerPoint(event);
    setRect({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.max(0.01, Math.abs(point.x - start.x)),
      height: Math.max(0.01, Math.abs(point.y - start.y)),
    });
  };

  const endMask = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawStartRef.current = null;
  };

  const processAsset = async () => {
    if (!selected) return;
    if (!rightsConfirmed) {
      toast("Confirme os direitos da mídia antes de processar.");
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(
        getProjectUrl("/api/asset-cleanup/process"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset: selected.asset,
            block: selected.block,
            asset_index: selected.assetIndex,
            rect,
            method,
            rights_confirmed: true,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Falha ao higienizar asset.");
      setJob(data.job);
      toast("Prévia criada. Compare antes de aplicar na timeline.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Falha ao processar asset."
      );
    } finally {
      setProcessing(false);
    }
  };

  const changeAppliedState = async (action: "apply" | "revert") => {
    if (!job) return;
    setApplying(true);
    try {
      const response = await fetch(
        getProjectUrl(`/api/asset-cleanup/${action}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: job.id }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Falha ao atualizar timeline.");
      setJob(data.job);
      await onApplied?.();
      toast(
        action === "apply"
          ? "Resultado aprovado e aplicado somente nesta cena."
          : "Asset original restaurado na timeline."
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Falha ao atualizar timeline."
      );
    } finally {
      setApplying(false);
    }
  };

  if (!assets.length) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-[#090b0d] p-5">
        <p className="text-xs font-bold text-white">Higienizador de Assets</p>
        <p className="mt-2 text-[10px] text-zinc-500">
          Adicione uma imagem ou vídeo à timeline para liberar a comparação
          antes/depois.
        </p>
      </section>
    );
  }

  const sourceUrl = selected ? getMediaUrl(selected.asset) : "";
  const resultUrl = job ? getMediaUrl(job.result_asset) : "";
  const aspectRatio = `${dimensions.width} / ${dimensions.height}`;

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-cyan-500/25 bg-[#070b0d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(34,211,238,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.06)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-2.5 text-cyan-300">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                Sala de restauração · antes do render
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">
                Higienizador de Assets
              </h3>
              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-zinc-400">
                Desenhe a máscara, processe uma cópia e aprove somente depois de
                comparar. O arquivo original nunca é sobrescrito.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-bold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> uso próprio/licenciado
          </span>
        </header>

        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                Cena e arquivo
              </span>
              <select
                value={selected?.id || ""}
                onChange={(event) => setSelectedId(event.target.value)}
                className="dash-select w-full text-[10px]"
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    Cena {asset.sceneRef} ·{" "}
                    {asset.type === "video" ? "vídeo" : "imagem"}
                  </option>
                ))}
              </select>
            </label>

            {selected?.type === "image" && (
              <div>
                <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                  Tratamento
                </span>
                <div className="grid gap-2">
                  {[
                    ["reconstruct", "Reconstruir pelas bordas"],
                    ["blur", "Desfoque de segurança"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value as "reconstruct" | "blur")}
                      className={`rounded-lg border px-3 py-2 text-left text-[9px] font-semibold transition ${
                        method === value
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                          : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
                className="mt-0.5 rounded border-zinc-600"
              />
              <span className="text-[9px] leading-relaxed text-amber-100/80">
                Confirmo que sou proprietário ou tenho licença para modificar
                esta mídia.
              </span>
            </label>

            <button
              type="button"
              disabled={processing || !rightsConfirmed}
              onClick={() => void processAsset()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-[10px] font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {processing ? "Reconstruindo…" : "Gerar comparação"}
            </button>
          </aside>

          <div className="min-w-0 space-y-4">
            {!job ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-[9px] text-zinc-500">
                  <span>ARRASTE SOBRE A ÁREA A TRATAR</span>
                  <span>
                    {Math.round(rect.width * 100)}% ×{" "}
                    {Math.round(rect.height * 100)}%
                  </span>
                </div>
                <div
                  className="relative mx-auto max-h-[520px] w-full max-w-4xl cursor-crosshair overflow-hidden rounded-2xl border border-zinc-700 bg-black select-none"
                  style={{ aspectRatio, touchAction: "none" }}
                  onPointerDown={beginMask}
                  onPointerMove={moveMask}
                  onPointerUp={endMask}
                  onPointerCancel={endMask}
                >
                  <AssetPreview
                    src={sourceUrl}
                    type={selected.type}
                    onDimensions={(width, height) =>
                      setDimensions({ width, height })
                    }
                    className="pointer-events-none"
                  />
                  <div
                    className="pointer-events-none absolute border border-cyan-200 bg-cyan-300/15 shadow-[0_0_0_9999px_rgba(0,0,0,.28),0_0_30px_rgba(34,211,238,.35)]"
                    style={{
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.width * 100}%`,
                      height: `${rect.height * 100}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-0 rounded bg-cyan-300 px-1.5 py-0.5 text-[7px] font-black text-slate-950">
                      MÁSCARA
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {[
                  { label: "Antes · original preservado", src: sourceUrl },
                  { label: "Depois · cópia processada", src: resultUrl },
                ].map((preview) => (
                  <figure
                    key={preview.label}
                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-black"
                  >
                    <figcaption className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                      <Eye className="h-3 w-3" /> {preview.label}
                    </figcaption>
                    <div style={{ aspectRatio }}>
                      <AssetPreview src={preview.src} type={selected.type} />
                    </div>
                  </figure>
                ))}
              </div>
            )}

            {job && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/35 p-3">
                <p className="text-[9px] text-zinc-400">
                  {job.status === "applied"
                    ? "Resultado aplicado nesta cena. O original continua guardado."
                    : job.status === "reverted"
                      ? "O original voltou para a timeline."
                      : "Compare movimento, textura e bordas antes de aprovar."}
                </p>
                <div className="flex gap-2">
                  {job.status === "applied" ? (
                    <button
                      type="button"
                      disabled={applying}
                      onClick={() => void changeAppliedState("revert")}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[9px] font-bold text-zinc-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Desfazer
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={applying || job.status === "reverted"}
                      onClick={() => void changeAppliedState("apply")}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-[9px] font-black text-emerald-950 disabled:opacity-40"
                    >
                      {applying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Aprovar para o render
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setJob(null)}
                    className="rounded-lg border border-zinc-800 px-3 py-2 text-[9px] text-zinc-500"
                  >
                    Refazer máscara
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
