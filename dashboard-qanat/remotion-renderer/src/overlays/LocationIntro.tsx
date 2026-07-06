import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export interface LocationIntroProps {
  location: string;
  region?: string;
  country?: string;
  accentColor?: string;
  backgroundImage?: string;
  variant?: "satellite" | "map" | "minimal";
  /** Nível de zoom inicial (estilo Google Earth) — default 4 */
  zoom_from?: number;
  /** Nível de zoom final — default 12 */
  zoom_to?: number;
  map_style?: string;
}

const SatelliteTerrain: React.FC = () => (
  <AbsoluteFill>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(160deg, #2d5a27 0%, #3d7a35 25%, #4a8f40 45%, #2e6b2a 70%, #1f4d1c 100%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "8%",
        bottom: "12%",
        width: "42%",
        height: "28%",
        borderRadius: "40% 60% 50% 45%",
        background:
          "linear-gradient(135deg, #1a5f7a 0%, #0d3d56 50%, #082a3d 100%)",
        opacity: 0.92,
        filter: "blur(1px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "18%",
        top: "22%",
        width: "38%",
        height: "42%",
        borderRadius: "12px",
        background:
          "radial-gradient(ellipse at 40% 50%, #8a9098 0%, #6b7078 30%, #4a4f55 60%, transparent 80%)",
        opacity: 0.75,
        transform: "rotate(-8deg)",
      }}
    />
    <div
      style={{
        position: "absolute",
        right: "5%",
        top: "8%",
        width: "55%",
        height: "75%",
        background:
          "radial-gradient(ellipse at 30% 40%, #3a6b32 0%, #2d5528 40%, #1e3d1a 80%)",
        opacity: 0.6,
      }}
    />
    <svg
      viewBox="0 0 1920 1080"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.25,
      }}
    >
      <path
        d="M200,600 Q400,500 600,550 T1000,520 T1400,580 T1800,540"
        fill="none"
        stroke="#f0e6c8"
        strokeWidth="3"
      />
      <path
        d="M300,400 Q500,350 700,380 T1100,360"
        fill="none"
        stroke="#e8dcc0"
        strokeWidth="2"
      />
    </svg>
  </AbsoluteFill>
);

export const LocationIntro: React.FC<LocationIntroProps> = ({
  location,
  region = "",
  country = "",
  accentColor = "#FFFFFF",
  backgroundImage = "",
  variant = "satellite",
  zoom_from = 4,
  zoom_to = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const enterOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const zoomStart = 1 + Math.min(0.35, Number(zoom_from) / 28);
  const zoomEnd = 1 + Math.min(0.55, Number(zoom_to) / 22);
  const zoom = interpolate(frame, [0, durationInFrames], [zoomStart, zoomEnd], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  const panX = interpolate(frame, [0, durationInFrames], [2, -1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panY = interpolate(frame, [0, durationInFrames], [1, -0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelY = interpolate(frame, [fps * 0.3, fps * 0.8], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const labelOpacity = interpolate(frame, [fps * 0.25, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pinPulse = 1 + 0.12 * Math.sin((frame / fps) * Math.PI * 2);
  const subtitle = [region, country].filter(Boolean).join(" · ");
  const locationFontSize = isVertical ? 52 : 64;
  const subtitleFontSize = isVertical ? 20 : 24;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 55,
        opacity: Math.min(enterOpacity, exitOpacity),
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
        }}
      >
        {backgroundImage && variant !== "minimal" ? (
          <Img
            src={backgroundImage}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : variant === "minimal" ? (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, #0a1628 0%, #142238 50%, #0d1a2d 100%)",
            }}
          />
        ) : (
          <SatelliteTerrain />
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {variant !== "minimal" ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 16 * pinPulse,
              height: 16 * pinPulse,
              borderRadius: "50%",
              background: accentColor,
              boxShadow: `0 0 24px ${accentColor}88, 0 0 48px ${accentColor}44`,
            }}
          />
          <div
            style={{
              width: 40 * pinPulse,
              height: 40 * pinPulse,
              borderRadius: "50%",
              border: `2px solid ${accentColor}66`,
              position: "absolute",
              marginTop: -8,
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: isVertical ? 280 : 80,
        }}
      >
        <div
          style={{
            textAlign: "center",
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
            padding: "0 48px",
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: locationFontSize,
              fontWeight: 800,
              color: accentColor,
              letterSpacing: "-0.02em",
              textShadow: "0 4px 24px rgba(0,0,0,0.8)",
              lineHeight: 1.1,
            }}
          >
            {location}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 12,
                fontFamily: "'Inter', sans-serif",
                fontSize: subtitleFontSize,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
