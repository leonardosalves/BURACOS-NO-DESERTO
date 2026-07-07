import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface GeoMapOverlayProps {
  location: string;
  region?: string;
  accentColor?: string;
  position?: "bottom-right" | "bottom-left" | "top-right";
  backgroundImage?: string;
}

export const GeoMapOverlay: React.FC<GeoMapOverlayProps> = ({
  location,
  region = "",
  accentColor = "#00E5FF",
  position = "bottom-right",
  backgroundImage = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const enter = spring({ fps, frame, config: { damping: 20, stiffness: 120 } });
  const exitStart = Math.max(0, durationInFrames - 14);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);
  const pinPulse = 1 + 0.15 * Math.sin((frame / fps) * Math.PI * 2.5);

  const posStyle: React.CSSProperties =
    position === "top-right"
      ? { top: isVertical ? 200 : 100, right: isVertical ? 36 : 56 }
      : position === "bottom-left"
        ? { bottom: isVertical ? 260 : 140, left: isVertical ? 36 : 56 }
        : { bottom: isVertical ? 260 : 140, right: isVertical ? 36 : 56 };

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        opacity,
        transform: `scale(${0.92 + enter * 0.08})`,
        pointerEvents: "none",
        zIndex: 42,
        width: isVertical ? 220 : 260,
        background: "rgba(8,16,24,0.92)",
        border: `1px solid ${accentColor}44`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: `0 10px 32px rgba(0,0,0,0.5)`,
      }}
    >
      {backgroundImage ? (
        <Img
          src={staticFile(backgroundImage.replace(/^\/+/, ""))}
          style={{
            width: "100%",
            height: isVertical ? 90 : 100,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <svg
          viewBox="0 0 260 120"
          width="100%"
          height={isVertical ? 90 : 100}
          style={{ display: "block" }}
        >
          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="260" height="120" fill="#0A1420" />
          <ellipse cx="130" cy="60" rx="90" ry="42" fill="url(#mapGlow)" />
          <path
            d="M40,70 Q80,35 130,50 T220,65 L220,120 L40,120 Z"
            fill={`${accentColor}22`}
            stroke={`${accentColor}66`}
            strokeWidth="1.5"
          />
          <circle
            cx="148"
            cy="52"
            r={6 * pinPulse}
            fill={accentColor}
            opacity="0.9"
          />
          <circle
            cx="148"
            cy="52"
            r={14 * pinPulse}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity="0.5"
          />
          <line
            x1="148"
            y1="58"
            x2="148"
            y2="78"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.7"
          />
        </svg>
      )}
      <div
        style={{
          padding: "8px 12px 10px",
          borderTop: `1px solid ${accentColor}33`,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#F0F8FF",
          }}
        >
          📍 {location}
        </div>
        {region ? (
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.55)",
              marginTop: 2,
            }}
          >
            {region}
          </div>
        ) : null}
      </div>
    </div>
  );
};
