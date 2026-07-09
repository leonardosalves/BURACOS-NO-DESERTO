import React, { useRef, useState } from "react";
import { CheckCircle, Film, Upload } from "lucide-react";
import toast from "react-hot-toast";
import {
  probeVideoFileDurationSec,
  uploadMotionFlyoverVideo,
} from "./geoVideoFlyover";

type Props = {
  motionId: string;
  flyoverPath?: string;
  getProjectUrl: (path: string) => string;
  getAssetUrl: (fileName: string) => string;
  onUploaded?: (result: {
    flyover_video: string;
    duration_seconds?: number;
    clip?: Record<string, unknown>;
    motion_scenes?: unknown[];
    studio?: unknown;
  }) => void;
  onBeforeUpload?: () => Promise<void>;
  compact?: boolean;
};

function resolveFlyoverPreviewUrl(
  relPath: string,
  getAssetUrl: (fileName: string) => string
): string {
  const normalized = String(relPath || "")
    .trim()
    .replace(/^ASSETS\//i, "")
    .replace(/\\/g, "/");
  return getAssetUrl(normalized);
}

export function GeoFlyoverUploadField({
  motionId,
  flyoverPath = "",
  getProjectUrl,
  getAssetUrl,
  onUploaded,
  onBeforeUpload,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasVideo = Boolean(flyoverPath?.trim());
  const previewUrl = hasVideo
    ? resolveFlyoverPreviewUrl(flyoverPath, getAssetUrl)
    : "";

  const handleFile = async (file: File | null | undefined) => {
    if (!file || uploading) return;
    if (!/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
      toast.error("Use MP4, WebM ou MOV.");
      return;
    }
    setUploading(true);
    try {
      if (onBeforeUpload) {
        await onBeforeUpload();
      }
      const probedDuration = await probeVideoFileDurationSec(file);
      const result = await uploadMotionFlyoverVideo(
        getProjectUrl,
        motionId,
        file,
        { durationSec: probedDuration }
      );
      if (!result.ok || !result.flyover_video) {
        throw new Error(result.error || "Upload falhou.");
      }
      toast.success("Vídeo geo vinculado à cena Remotion.");
      onUploaded?.({
        flyover_video: result.flyover_video,
        duration_seconds: result.duration_seconds ?? probedDuration,
        clip: result.clip,
        motion_scenes: result.motion_scenes,
        studio: result.studio,
      });
    } catch (err) {
      toast.error((err as Error).message || "Erro no upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`rounded-xl border ${
        hasVideo
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/25 bg-amber-500/5"
      } ${compact ? "p-2.5" : "p-3"} space-y-2`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {hasVideo ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Film className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              hasVideo ? "text-emerald-200" : "text-amber-200"
            }`}
          >
            {hasVideo ? "Vídeo geo anexado" : "Aguardando vídeo gerado"}
          </span>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 disabled:opacity-50 cursor-pointer"
        >
          <Upload className={`w-3 h-3 ${uploading ? "animate-pulse" : ""}`} />
          {uploading
            ? "Enviando…"
            : hasVideo
              ? "Substituir vídeo"
              : "Enviar MP4"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {!compact ? (
        <p className="text-[9px] text-zinc-500 leading-relaxed">
          Gere o voo no Grok ou Google Flow com o prompt abaixo, baixe o MP4 e
          envie aqui. O arquivo vai para{" "}
          <span className="font-mono text-zinc-400">ASSETS/satellite/</span> e
          entra no render automaticamente.
        </p>
      ) : null}

      {hasVideo && previewUrl ? (
        <video
          src={previewUrl}
          className="w-full max-h-28 rounded-lg bg-black object-contain"
          muted
          playsInline
          controls
          preload="metadata"
        />
      ) : null}

      {hasVideo ? (
        <p
          className="text-[9px] text-zinc-500 font-mono truncate"
          title={flyoverPath}
        >
          {flyoverPath}
        </p>
      ) : null}
    </div>
  );
}
