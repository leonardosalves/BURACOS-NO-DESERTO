import { useEffect, useRef, useState } from "react";

export function BlenderFlyoverPreview({
  src,
  scrubSeconds = 0,
  className = "",
}: {
  src: string;
  scrubSeconds?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;
    const seek = () => {
      const t = Math.max(0, Number(scrubSeconds) || 0);
      if (Math.abs(el.currentTime - t) > 0.15) {
        try {
          el.currentTime = t;
        } catch {
          /* metadata ainda não carregou */
        }
      }
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });
  }, [src, scrubSeconds]);

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
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="auto"
      className={className}
      onError={() => setLoadFailed(true)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: 1,
      }}
    />
  );
}
