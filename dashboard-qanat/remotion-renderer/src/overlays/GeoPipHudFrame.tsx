import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { formatCoordDms } from "../../../shared/geoPipStudioTemplate.js";
import { GeoPipMapSlot, type GeoPipWindow } from "./GeoPipMapSlot";

type Props = {
  location?: string;
  region?: string;
  country?: string;
  referencePoint?: string;
  lat?: number;
  lng?: number;
  flyover_video?: string;
  backgroundImage?: string;
  backgroundImageWide?: string;
  geo_pip_window?: GeoPipWindow;
  mapSlot?: React.ReactNode;
  zoom?: number;
};

export const GeoPipHudFrame: React.FC<Props> = ({
  location = "",
  region = "",
  country = "",
  referencePoint = "",
  lat,
  lng,
  flyover_video = "",
  backgroundImage = "",
  backgroundImageWide = "",
  geo_pip_window,
  mapSlot,
  zoom = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const label = String(referencePoint || location || region || "Local").trim();
  const subtitle =
    [region, country].filter(Boolean).join(" · ") || "MAPA · ROTA · SETOR";
  const latLabel = Number.isFinite(Number(lat))
    ? formatCoordDms(Number(lat), "lat")
    : "";
  const lngLabel = Number.isFinite(Number(lng))
    ? formatCoordDms(Number(lng), "lng")
    : "";

  const enter = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const slide = interpolate(frame, [0, fps * 0.5], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 18%, rgba(0,229,255,0.08) 0%, transparent 55%), linear-gradient(180deg, #04070d 0%, #071018 55%, #04070d 100%)",
        }}
      />

      {mapSlot || (
        <GeoPipMapSlot
          width={width}
          height={height}
          window={geo_pip_window}
          flyoverVideo={flyover_video}
          backgroundImage={backgroundImage}
          backgroundImageWide={backgroundImageWide}
          zoom={zoom}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: "5%",
          right: "5%",
          bottom: "6%",
          opacity: enter,
          transform: `translateY(${slide}px)`,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,214,0,0.35)",
            background:
              "linear-gradient(180deg, rgba(8,18,28,0.92) 0%, rgba(4,10,16,0.96) 100%)",
            padding: "14px 16px 12px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              color: "#FFD600",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "#FFD600",
                display: "inline-block",
              }}
            />
            Ponto de referência / PIP
          </div>
          <div
            style={{
              color: "#00E5FF",
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              textShadow: "0 0 24px rgba(0,229,255,0.25)",
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 6,
              color: "rgba(255,255,255,0.72)",
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </div>
          {(latLabel || lngLabel) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              <span>
                {latLabel}
                {latLabel && lngLabel ? " · " : ""}
                {lngLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
