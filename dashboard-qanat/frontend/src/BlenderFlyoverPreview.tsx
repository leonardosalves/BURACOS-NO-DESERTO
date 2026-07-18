import React, { useEffect, useRef, useState } from "react";

export function BlenderFlyoverPreview({
  src,
  scrubSeconds = 0,
  playing = false,
  poster,
  className = "",
  style,
  blendMode = "lighten",
  objectFit = "cover",
}: {
  src: string;
  scrubSeconds?: number;
  playing?: boolean;
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
  blendMode?: React.CSSProperties["mixBlendMode"];
  objectFit?: React.CSSProperties["objectFit"];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;
    const t = Math.max(0, Number(scrubSeconds) || 0);
    const sync = () => {
      if (playing) {
        if (Math.abs(el.currentTime - t) > 0.35) {
          try {
            el.currentTime = t;
          } catch {
            /* metadata ainda não carregou */
          }
        }
        void el.play().catch(() => {});
        return;
      }
      el.pause();
      if (Math.abs(el.currentTime - t) > 0.08) {
        try {
          el.currentTime = t;
        } catch {
          /* metadata ainda não carregou */
        }
      }
    };
    if (el.readyState >= 1) sync();
    else el.addEventListener("loadedmetadata", sync, { once: true });
  }, [src, scrubSeconds, playing]);

  if (!src) {
    return (
      <div
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          background: "#050506",
        }}
      />
    );
  }

  if (loadFailed) {
    return (
      <div
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050506",
          color: "#a1a1aa",
          fontSize: 11,
          textAlign: "center",
          padding: 12,
        }}
      >
        Flyover Blender indisponível
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
      ) : null}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => {
          const el = videoRef.current;
          if (!el || playing) return;
          const t = Math.max(0, Number(scrubSeconds) || 0);
          try {
            el.currentTime = t;
          } catch {
            /* ignore */
          }
        }}
        onError={() => setLoadFailed(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit,
          zIndex: 1,
          /* Frames pretos do Blender deixam ver os tiles satélite por baixo */
          mixBlendMode: blendMode,
        }}
      />
    </div>
  );
}
