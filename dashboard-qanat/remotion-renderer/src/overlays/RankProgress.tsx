import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface RankProgressProps {
  current: number;
  total: number;
  progress?: number;
  rank?: number;
  rankOrder?: "asc" | "desc";
  accentColor?: string;
}

export const RankProgress: React.FC<RankProgressProps> = ({
  current,
  total,
  progress,
  rank,
  rankOrder = "desc",
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
  const filledDots = Math.min(safeTotal, Math.max(0, progress ?? current));
  const dots = Array.from({ length: safeTotal }, (_, i) => i < filledDots);
  const displayRank = rank ?? current;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 30,
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
          background: "rgba(0,0,0,0.72)",
          border: `1px solid ${accentColor}44`,
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        }}
      >
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: isVertical ? 16 : 14,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "0.04em",
          }}
        >
          #{displayRank}
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: isVertical ? 11 : 10,
            fontWeight: 600,
            color: accentColor,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {rankOrder === "desc" ? `Top ${safeTotal}` : `Top ${safeTotal}`}
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
      </div>
    </AbsoluteFill>
  );
};