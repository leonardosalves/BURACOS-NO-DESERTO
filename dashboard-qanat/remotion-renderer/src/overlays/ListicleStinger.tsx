import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface ListicleStingerProps {
  accentColor?: string;
}

export const ListicleStinger: React.FC<ListicleStingerProps> = ({
  accentColor = "#C5A880",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const flash = interpolate(frame, [0, 3, durationInFrames], [0, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineScale = interpolate(frame, [0, 6], [0.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 20 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${accentColor}55 0%, transparent 65%)`,
          opacity: flash,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "120%",
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            transform: `scaleX(${lineScale})`,
            opacity: flash,
            boxShadow: `0 0 24px ${accentColor}`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};