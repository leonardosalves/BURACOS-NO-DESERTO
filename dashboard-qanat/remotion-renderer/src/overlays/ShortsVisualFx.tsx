import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface ShortsVisualFxProps {
  hookFlash?: boolean;
  edgeGlow?: boolean;
  accentColor?: string;
}

export const ShortsVisualFx: React.FC<ShortsVisualFxProps> = ({
  hookFlash = true,
  edgeGlow = false,
  accentColor = "#D4AF37",
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const isVertical = height > width;

  const flashOpacity = hookFlash
    ? interpolate(frame, [0, 4, 10], [0.55, 0.18, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const glowPulse = edgeGlow
    ? 0.35 + 0.12 * Math.sin((frame / fps) * Math.PI * 0.8)
    : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 8 }}>
      {flashOpacity > 0.01 && (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.9) 0%, transparent 62%)",
            opacity: flashOpacity,
            mixBlendMode: "screen",
          }}
        />
      )}
      {edgeGlow && (
        <AbsoluteFill
          style={{
            background: isVertical
              ? `linear-gradient(to top, ${accentColor}44 0%, transparent 28%)`
              : `linear-gradient(to top, ${accentColor}33 0%, transparent 22%)`,
            opacity: glowPulse,
          }}
        />
      )}
    </AbsoluteFill>
  );
};