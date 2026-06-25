import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// Lower Third — Animated title card for block introductions
// Appears at the bottom of the screen with a gold accent bar and
// smooth slide-in / slide-out animation.
// ─────────────────────────────────────────────────────────────────────

export interface LowerThirdProps {
  /** Main title text */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Accent color (hex). Defaults to gold */
  accentColor?: string;
  /** Position: 'bottom-left' | 'bottom-center' | 'top-left' */
  position?: "bottom-left" | "bottom-center" | "top-left";
}

const ANIM_IN_FRAMES = 18; // 0.6s at 30fps
const ANIM_OUT_FRAMES = 14; // ~0.47s
const ACCENT_BAR_WIDTH = 5;

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  accentColor = "#D4AF37",
  position = "bottom-left",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Slide-in from left
  const slideIn = interpolate(frame, [0, ANIM_IN_FRAMES], [-100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade in
  const fadeIn = interpolate(frame, [0, ANIM_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slide-out before sequence ends
  const outStart = durationInFrames - ANIM_OUT_FRAMES;
  const slideOut = interpolate(
    frame,
    [outStart, durationInFrames],
    [0, -120],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = slideIn + slideOut;
  const opacity = Math.min(fadeIn, fadeOut);

  // Accent bar reveal (grows from 0 to full height)
  const barScale = interpolate(frame, [0, ANIM_IN_FRAMES * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background panel width expansion
  const panelExpand = interpolate(
    frame,
    [ANIM_IN_FRAMES * 0.3, ANIM_IN_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Position styles
  const positionStyle: React.CSSProperties =
    position === "top-left"
      ? {
          top: isVertical ? 180 : 80,
          left: isVertical ? 48 : 64,
          bottom: "auto",
        }
      : position === "bottom-center"
      ? {
          bottom: isVertical ? 640 : 210,
          left: "50%",
          transform: `translateX(-50%) translateX(${translateX}px)`,
        }
      : {
          bottom: isVertical ? 640 : 210,
          left: isVertical ? 48 : 64,
        };

  // When position is not bottom-center, apply translateX normally
  const transformStyle =
    position === "bottom-center"
      ? positionStyle.transform
      : `translateX(${translateX}px)`;

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        transform: transformStyle,
        opacity,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        pointerEvents: "none",
        filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.65))",
        zIndex: 50,
      }}
    >
      {/* Gold Accent Bar */}
      <div
        style={{
          width: ACCENT_BAR_WIDTH,
          backgroundColor: accentColor,
          borderRadius: "3px 0 0 3px",
          transform: `scaleY(${barScale})`,
          transformOrigin: "center",
          minHeight: 48,
        }}
      />

      {/* Content Panel */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(10,10,14,0.92) 0%, rgba(20,20,28,0.88) 100%)",
          backdropFilter: "blur(12px)",
          borderRadius: "0 8px 8px 0",
          padding: isVertical ? "20px 36px" : "14px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 4,
          maxWidth: isVertical ? 860 : 640,
          clipPath: `inset(0 ${(1 - panelExpand) * 100}% 0 0)`,
          borderTop: `1px solid rgba(212,175,55,0.15)`,
          borderRight: `1px solid rgba(212,175,55,0.08)`,
          borderBottom: `1px solid rgba(212,175,55,0.15)`,
        }}
      >
        {/* Title */}
        <span
          style={{
            color: "#F8FAFC",
            fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
            fontSize: isVertical ? 38 : 28,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </span>

        {/* Subtitle */}
        {subtitle && (
          <span
            style={{
              color: "rgba(248,250,252,0.72)",
              fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
              fontSize: isVertical ? 24 : 18,
              fontWeight: 400,
              letterSpacing: "0.02em",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              marginTop: 2,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Decorative line extending from panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: ACCENT_BAR_WIDTH,
          right: 0,
          height: 1,
          background: `linear-gradient(to right, ${accentColor}80, transparent)`,
          opacity: panelExpand,
        }}
      />
    </div>
  );
};
