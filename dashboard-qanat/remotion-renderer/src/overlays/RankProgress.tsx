import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface RankProgressProps {
  current: number;
  total: number;
  rank?: number;
  accentColor?: string;
}

export const RankProgress: React.FC<RankProgressProps> = ({
  current,
  total,
  rank,
  accentColor = "#C5A880",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const fadeIn = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const safeTotal = Math.max(1, total);
  const dots = Array.from({ length: safeTotal }, (_, i) => i < current);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 12,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: isVertical ? 88 : 36,
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: `1px solid ${accentColor}44`,
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: isVertical ? 13 : 11,
            fontWeight: 700,
            color: accentColor,
            letterSpacing: "0.08em",
          }}
        >
          {current}/{safeTotal}
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          {dots.map((filled, i) => (
            <div
              key={i}
              style={{
                width: isVertical ? 8 : 7,
                height: isVertical ? 8 : 7,
                borderRadius: "50%",
                background: filled ? accentColor : "rgba(255,255,255,0.2)",
                boxShadow: filled ? `0 0 8px ${accentColor}` : "none",
              }}
            />
          ))}
        </div>
        {rank != null && (
          <span
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: isVertical ? 12 : 10,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            #{rank}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};