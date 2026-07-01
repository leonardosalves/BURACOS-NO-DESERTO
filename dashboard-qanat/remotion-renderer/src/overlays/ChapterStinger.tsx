import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface ChapterStingerProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  fontTitle?: string;
}

export const ChapterStinger: React.FC<ChapterStingerProps> = ({
  title,
  subtitle = "",
  accentColor = "#C5A880",
  fontTitle = "Cinzel",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ fps, frame, config: { damping: 18, stiffness: 120 } });
  const exitStart = Math.max(0, durationInFrames - 12);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [0, 14], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 25 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor}22 0%, transparent 70%)`,
          opacity: opacity * 0.9,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 14,
          opacity,
          transform: `scale(${0.92 + enter * 0.08})`,
        }}
      >
        <div
          style={{
            width: `${lineWidth}%`,
            maxWidth: 520,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            boxShadow: `0 0 20px ${accentColor}88`,
          }}
        />
        <span
          style={{
            fontFamily: `'${fontTitle}', 'Cinzel', serif`,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#F5F0E8",
            textShadow: `0 2px 24px ${accentColor}66, 0 0 40px rgba(0,0,0,0.8)`,
            padding: "0 48px",
            textAlign: "center",
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.72)",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </span>
        ) : null}
        <div
          style={{
            width: `${lineWidth * 0.6}%`,
            maxWidth: 280,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};