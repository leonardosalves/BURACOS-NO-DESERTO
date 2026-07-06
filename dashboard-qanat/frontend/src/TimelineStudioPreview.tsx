import React from "react";
import {
  activeCaptionAt,
  activeVideoAt,
  formatStudioTime,
  type StudioClip,
  type TimelineStudioState,
} from "./timelineStudioTypes";

type Props = {
  studio: TimelineStudioState;
  getAssetUrl: (fileName: string) => string;
  aspectRatio: string;
};

export function TimelineStudioPreview({
  studio,
  getAssetUrl,
  aspectRatio,
}: Props) {
  const isVertical = aspectRatio === "9:16";
  const videoClip = activeVideoAt(studio.clips, studio.playhead);
  const caption = activeCaptionAt(studio.clips, studio.playhead);
  const overlayClip = studio.clips.find(
    (c) =>
      c.trackId === "overlays" &&
      studio.playhead >= c.start &&
      studio.playhead < c.start + c.duration
  );

  const assetSrc = videoClip?.source ? getAssetUrl(videoClip.source) : null;
  const isVideo =
    videoClip?.props?.type === "video" ||
    /\.(mp4|webm|mov)$/i.test(String(videoClip?.source || ""));

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Preview
        </span>
        <span className="text-[10px] font-mono text-gold-400/90">
          {formatStudioTime(studio.playhead)}
        </span>
      </div>

      <div
        className={`relative flex-1 flex items-center justify-center bg-zinc-950 ${
          isVertical
            ? "aspect-[9/16] max-h-[min(52vh,520px)] mx-auto w-full"
            : "aspect-video w-full"
        }`}
      >
        {assetSrc ? (
          isVideo ? (
            <video
              key={assetSrc}
              src={assetSrc}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={assetSrc}
              alt={videoClip?.label || "B-roll"}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="text-center px-6">
            <p className="text-sm text-zinc-500">Sem mídia neste momento</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Arraste stock ou selecione um clip de vídeo
            </p>
          </div>
        )}

        {overlayClip ? (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-200 font-bold">
            {overlayClip.templateId}: {overlayClip.label}
          </div>
        ) : null}

        {caption ? (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-[90%] px-4 py-2 rounded-lg bg-black/75 border border-white/10">
            <p className="text-white text-sm font-semibold text-center leading-snug">
              {String(caption.props?.text || caption.label || "")}
            </p>
          </div>
        ) : null}
      </div>

      {videoClip ? (
        <div className="px-3 py-2 border-t border-zinc-800/50 text-[10px] text-zinc-500 truncate">
          {videoClip.label}
          {videoClip.source ? ` · ${videoClip.source}` : ""}
        </div>
      ) : null}
    </div>
  );
}
