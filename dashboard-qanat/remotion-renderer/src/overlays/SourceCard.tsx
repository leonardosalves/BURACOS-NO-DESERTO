import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { mergeCustomStyle } from "./overlayStyleUtils";

export interface SourceCardProps {
  source: string;
  detail?: string;
  accentColor?: string;
  position?: "bottom-left" | "bottom-right";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  customStyle?: Record<string, string | number>;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  detail = "",
  accentColor = "#C5A880",
  position = "bottom-left",
  theme = "classic",
  customStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const enter = spring({ fps, frame, config: { damping: 20, stiffness: 140 } });
  const exitStart = Math.max(0, durationInFrames - 14);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);

  const themeBg = theme === "ancient"
    ? "linear-gradient(135deg, rgba(22, 14, 8, 0.94) 0%, rgba(36, 24, 14, 0.9) 100%)"
    : "rgba(14, 14, 18, 0.9)";

  const posStyle: React.CSSProperties = position === "bottom-right"
    ? { bottom: isVertical ? 200 : 120, right: isVertical ? 40 : 64 }
    : { bottom: isVertical ? 200 : 120, left: isVertical ? 40 : 64 };

  const merged = mergeCustomStyle({
    background: themeBg,
    border: `1px solid ${accentColor}55`,
    borderLeft: `4px solid ${accentColor}`,
    borderRadius: 8,
    padding: isVertical ? "12px 18px" : "10px 16px",
    boxShadow: `0 8px 28px rgba(0,0,0,0.55)`,
    maxWidth: isVertical ? 420 : 480,
  }, customStyle);

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        opacity,
        transform: `translateY(${(1 - enter) * 16}px)`,
        pointerEvents: "none",
        zIndex: 45,
        ...merged,
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: isVertical ? 13 : 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: accentColor,
          marginBottom: 4,
        }}
      >
        Fonte
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: isVertical ? 20 : 15,
          fontWeight: 600,
          color: "#F0F0F2",
          lineHeight: 1.35,
        }}
      >
        {source}
      </div>
      {detail ? (
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isVertical ? 15 : 12,
            color: "rgba(255,255,255,0.62)",
            marginTop: 4,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
};