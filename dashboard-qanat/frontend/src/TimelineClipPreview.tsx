import React, { useEffect, useRef } from "react";
import { Volume2, Gauge } from "lucide-react";
import { clampPlaybackRate, clampVolume } from "./opencutTimeline";

type AssetPreview = {
  asset?: string;
  type?: string;
  volume?: number;
  playback_rate?: number;
};

type Props = {
  asset: AssetPreview;
  getAssetUrl: (path: string) => string;
  aspectRatio?: string;
  previewZoom?: number;
  canvasBackground?: string;
  clipDuration: number;
  sourceDuration?: number;
  onSourceDuration?: (assetPath: string, duration: number) => void;
  compact?: boolean;
};

export function TimelineClipPreview({
  asset,
  getAssetUrl,
  aspectRatio = "16:9",
  previewZoom = 100,
  canvasBackground = "#050506",
  clipDuration,
  sourceDuration,
  onSourceDuration,
  compact = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const volume = clampVolume(asset.volume, 0);
  const rate = clampPlaybackRate(asset.playback_rate, 1);
  const isVideo = asset.type === "video";
  const isPortrait = aspectRatio === "9:16";
  const hasAsset = Boolean(asset.asset?.trim());

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    el.playbackRate = rate;
    el.volume = volume;
    el.muted = volume <= 0.001;
    if (el.readyState >= 2) {
      void el.play().catch(() => {});
    }
  }, [volume, rate, asset.asset, isVideo]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration;
    if (dur && !Number.isNaN(dur) && asset.asset && onSourceDuration) {
      onSourceDuration(asset.asset, dur);
    }
    const el = e.currentTarget;
    el.playbackRate = rate;
    el.volume = volume;
    el.muted = volume <= 0.001;
    void el.play().catch(() => {});
  };

  return (
    <div
      className={`rounded-lg overflow-hidden relative flex items-center justify-center border border-zinc-900 group/preview mx-auto ${
        compact
          ? "w-full h-24 rounded-xl"
          : isPortrait
            ? "h-64 w-full"
            : "w-full"
      }`}
      style={{
        aspectRatio: compact ? undefined : isPortrait ? "9/16" : "16/9",
        transform: compact ? undefined : `scale(${previewZoom / 100})`,
        transformOrigin: "center center",
        backgroundColor: canvasBackground,
      }}
    >
      {!hasAsset ? (
        <span className="text-[10px] text-zinc-600 px-2 text-center">
          Sem asset
        </span>
      ) : isVideo ? (
        <video
          ref={videoRef}
          key={asset.asset}
          src={getAssetUrl(asset.asset!)}
          className="w-full h-full object-cover"
          controls={false}
          muted={volume <= 0.001}
          loop
          autoPlay
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={(e) => {
            const el = e.currentTarget;
            el.style.display = "block";
            try {
              if (el.currentTime < 0.05) el.currentTime = 0.05;
            } catch {
              /* ignore */
            }
            void el.play().catch(() => {});
          }}
          onError={() => {
            /* mantém área visível — mensagem «Sem asset» só quando asset vazio */
          }}
        />
      ) : (
        <img
          key={asset.asset}
          src={getAssetUrl(asset.asset!)}
          className="w-full h-full object-cover"
          alt="Preview"
          onLoad={(e) => {
            e.currentTarget.style.display = "block";
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {isVideo && volume > 0.001 && (
        <div className="absolute top-2 left-2 bg-black/75 text-emerald-300 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
          <Volume2 className="w-2.5 h-2.5" />
          {Math.round(volume * 100)}%
        </div>
      )}

      {isVideo && rate !== 1 && (
        <div className="absolute top-2 right-2 bg-black/75 text-violet-300 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
          <Gauge className="w-2.5 h-2.5" />
          {rate.toFixed(2)}×
        </div>
      )}

      <div className="absolute bottom-2 right-2 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold pointer-events-none">
        ⏱️ {clipDuration.toFixed(1)}s
        {isVideo && sourceDuration !== undefined && (
          <span className="text-zinc-400 font-normal ml-0.5 border-l border-zinc-700 pl-1">
            / {sourceDuration.toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}
