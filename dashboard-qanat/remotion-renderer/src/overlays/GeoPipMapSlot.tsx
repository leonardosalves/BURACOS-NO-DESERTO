import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";
import type { ZoomKeyframe } from "./locationIntroGeo";

export type GeoPipWindow = {
  leftPct?: number;
  topPct?: number;
  widthPct?: number;
  heightPct?: number;
  radiusPx?: number;
};

type Props = {
  width: number;
  height: number;
  window?: GeoPipWindow;
  flyoverVideo?: string;
  backgroundImage?: string;
  backgroundImageWide?: string;
  zoomKeyframes?: ZoomKeyframe[];
  zoom?: number;
  mapContent?: React.ReactNode;
};

function resolveSrc(src = "") {
  const s = String(src || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const normalized = s.replace(/\\/g, "/").replace(/^\/+/, "");
  return staticFile(normalized);
}

export function resolveGeoPipWindowRect(
  width: number,
  height: number,
  window: GeoPipWindow = {}
) {
  const leftPct = Number(window.leftPct ?? 52);
  const topPct = Number(window.topPct ?? 66);
  const widthPct = Number(window.widthPct ?? 44);
  const heightPct = Number(window.heightPct ?? 22);
  const radiusPx = Number(window.radiusPx ?? 14);
  return {
    left: (width * leftPct) / 100,
    top: (height * topPct) / 100,
    width: (width * widthPct) / 100,
    height: (height * heightPct) / 100,
    borderRadius: radiusPx,
  };
}

export const GeoPipMapSlot: React.FC<Props> = ({
  width,
  height,
  window,
  flyoverVideo = "",
  backgroundImage = "",
  backgroundImageWide = "",
  zoom = 1,
  mapContent,
}) => {
  const rect = resolveGeoPipWindowRect(width, height, window);
  const flyoverSrc = resolveSrc(flyoverVideo);
  const tightSrc = resolveSrc(backgroundImage);
  const wideSrc = resolveSrc(backgroundImageWide);

  let inner: React.ReactNode = mapContent || null;
  if (!inner && flyoverSrc) {
    inner = (
      <OffthreadVideo
        src={flyoverSrc}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  } else if (!inner && (tightSrc || wideSrc)) {
    inner = (
      <>
        {wideSrc ? (
          <Img
            src={wideSrc}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: tightSrc && tightSrc !== wideSrc ? 0.35 : 1,
            }}
          />
        ) : null}
        {tightSrc ? (
          <Img
            src={tightSrc}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
      </>
    );
  }

  if (!inner) {
    inner = (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(160deg, #0d2137 0%, #14324a 45%, #071018 100%)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        borderRadius: rect.borderRadius,
        overflow: "hidden",
        background: "#050506",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.12), 0 12px 32px rgba(0,0,0,0.55)",
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
      }}
    >
      <AbsoluteFill>{inner}</AbsoluteFill>
    </div>
  );
};
