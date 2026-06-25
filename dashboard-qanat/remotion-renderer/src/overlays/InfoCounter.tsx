import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// InfoCounter — Animated numeric counter
// Shows a number counting up from 0 to the target value with
// a label, unit prefix/suffix, and optional icon.
// Example: "71.000 km" or "3.000 anos"
// ─────────────────────────────────────────────────────────────────────

export interface InfoCounterProps {
  /** Target number to count up to */
  value: number;
  /** Label above or below the number */
  label: string;
  /** Unit suffix (e.g. "km", "anos", "%") */
  suffix?: string;
  /** Unit prefix (e.g. "+", "$", "~") */
  prefix?: string;
  /** Format with thousands separator */
  formatNumber?: boolean;
  /** Accent color */
  accentColor?: string;
  /** Position on screen */
  position?: "center" | "bottom-right" | "bottom-left" | "top-right";
}

const formatWithSeparator = (n: number): string => {
  return n.toLocaleString("pt-BR");
};

export const InfoCounter: React.FC<InfoCounterProps> = ({
  value,
  label,
  suffix = "",
  prefix = "",
  formatNumber = true,
  accentColor = "#D4AF37",
  position = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Spring animation for scale entrance
  const scaleSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
    durationInFrames: 20,
  });

  // Count up animation (accelerates then decelerates)
  const countProgress = interpolate(frame, [6, Math.min(durationInFrames * 0.65, 45)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Ease-out cubic
  const easedProgress = 1 - Math.pow(1 - countProgress, 3);
  const currentValue = Math.round(easedProgress * value);

  // Fade in
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // Glow pulse when counter finishes
  const glowOpacity =
    countProgress >= 1
      ? interpolate(
          frame,
          [Math.min(durationInFrames * 0.65, 45), Math.min(durationInFrames * 0.65, 45) + 15],
          [0.6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 0;

  // Position mapping
  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    "bottom-right": {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: isVertical ? "0 60px 640px" : "0 100px 220px",
    },
    "bottom-left": {
      justifyContent: "flex-end",
      alignItems: "flex-start",
      padding: isVertical ? "0 60px 640px" : "0 100px 220px",
    },
    "top-right": {
      justifyContent: "flex-start",
      alignItems: "flex-end",
      padding: isVertical ? "200px 60px 0" : "100px 100px 0",
    },
  };

  const displayValue = formatNumber
    ? formatWithSeparator(currentValue)
    : currentValue.toString();

  return (
    <AbsoluteFill
      style={{
        ...positionStyles[position],
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isVertical ? 12 : 8,
          transform: `scale(${scaleSpring})`,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
        }}
      >
        {/* Background container */}
        <div
          style={{
            background:
              "linear-gradient(145deg, rgba(8,8,12,0.88) 0%, rgba(18,18,26,0.85) 100%)",
            backdropFilter: "blur(16px)",
            borderRadius: isVertical ? 24 : 18,
            padding: isVertical ? "32px 52px" : "24px 40px",
            border: `1px solid ${accentColor}2e`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isVertical ? 10 : 6,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow effect on completion */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              background: `radial-gradient(circle at center, ${accentColor}40, transparent 70%)`,
              opacity: glowOpacity,
              pointerEvents: "none",
            }}
          />

          {/* Label */}
          <span
            style={{
              color: "rgba(248,250,252,0.65)",
              fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
              fontSize: isVertical ? 24 : 18,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {label}
          </span>

          {/* Counter Value */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: isVertical ? 10 : 8,
            }}
          >
            {prefix && (
              <span
                style={{
                  color: accentColor,
                  fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                  fontSize: isVertical ? 48 : 36,
                  fontWeight: 300,
                }}
              >
                {prefix}
              </span>
            )}
            <span
              style={{
                color: "#F8FAFC",
                fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                fontSize: isVertical ? 72 : 54,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {displayValue}
            </span>
            {suffix && (
              <span
                style={{
                  color: accentColor,
                  fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                  fontSize: isVertical ? 32 : 24,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {suffix}
              </span>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            style={{
              width: interpolate(
                frame,
                [8, ANIM_LINE_END(durationInFrames)],
                [0, isVertical ? 180 : 140],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              height: 2,
              background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
              marginTop: 4,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ANIM_LINE_END = (dur: number) => Math.min(dur * 0.5, 30);
