import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface ProgressBarProps {
  totalDuration: number;
  accentColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  totalDuration,
  accentColor = "#C5A880",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;
  const progress = interpolate(
    currentSec,
    [0, Math.max(1, totalDuration)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 60 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${progress}%`,
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
          boxShadow: `0 0 12px ${accentColor}66`,
        }}
      />
    </AbsoluteFill>
  );
};