import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// KineticText — Impact text with cinematic animations
// Full-screen or positioned text that appears with force.
// Multiple animation styles: slam, typewriter, glitch, reveal.
// ─────────────────────────────────────────────────────────────────────

export interface KineticTextProps {
  /** The text to display */
  text: string;
  /** Animation style */
  style?: "slam" | "typewriter" | "reveal" | "glitch" | "fade-up";
  /** Accent color */
  accentColor?: string;
  /** Font size override */
  fontSize?: number;
  /** Position */
  position?: "center" | "bottom" | "top";
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style: animStyle = "slam",
  accentColor = "#D4AF37",
  fontSize: fontSizeOverride,
  position = "bottom",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const baseFontSize =
    fontSizeOverride || (isVertical ? 48 : 36);

  // Overall fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Position mapping
  const positionStyle: React.CSSProperties =
    position === "top"
      ? {
          justifyContent: "flex-start",
          paddingTop: isVertical ? 260 : 120,
        }
      : position === "bottom"
      ? {
          justifyContent: "flex-end",
          paddingBottom: isVertical ? 380 : 200,
        }
      : {
          justifyContent: "center",
        };

  const renderSlamStyle = () => {
    const slamScale = spring({
      fps,
      frame,
      config: { damping: 8, stiffness: 280, mass: 0.6 },
      durationInFrames: 14,
    });

    const slamOpacity = interpolate(frame, [0, 3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Shake effect right after slam
    const shakeX =
      frame < 8
        ? interpolate(frame, [3, 8], [6, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * Math.sin(frame * 12)
        : 0;

    return {
      transform: `scale(${slamScale}) translateX(${shakeX}px)`,
      opacity: slamOpacity * fadeOut,
    };
  };

  const renderTypewriterStyle = () => {
    const charsToShow = Math.floor(
      interpolate(frame, [0, Math.min(text.length * 2, 40)], [0, text.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );

    const cursorBlink = Math.floor(frame / 8) % 2 === 0;
    const showCursor = frame < text.length * 2 + 15;

    return {
      text: text.substring(0, charsToShow) + (showCursor && cursorBlink ? "▌" : ""),
      opacity: fadeOut,
    };
  };

  const renderRevealStyle = () => {
    const revealProgress = interpolate(frame, [0, 18], [100, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return {
      clipPath: `inset(0 ${revealProgress}% 0 0)`,
      opacity: fadeOut,
    };
  };

  const renderGlitchStyle = () => {
    const glitchOpacity = interpolate(frame, [0, 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Glitch offset
    const isGlitching = frame < 12 && frame % 3 === 0;
    const glitchX = isGlitching ? (Math.random() - 0.5) * 12 : 0;
    const glitchY = isGlitching ? (Math.random() - 0.5) * 6 : 0;

    // RGB split effect
    const rgbSplit = frame < 12 ? interpolate(frame, [0, 12], [8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) : 0;

    return {
      transform: `translate(${glitchX}px, ${glitchY}px)`,
      opacity: glitchOpacity * fadeOut,
      textShadow: rgbSplit > 0
        ? `${rgbSplit}px 0 rgba(255,0,0,0.6), -${rgbSplit}px 0 rgba(0,255,255,0.6)`
        : "none",
    };
  };

  const renderFadeUpStyle = () => {
    const translateY = interpolate(frame, [0, 16], [40, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const fadeIn = interpolate(frame, [0, 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return {
      transform: `translateY(${translateY}px)`,
      opacity: fadeIn * fadeOut,
    };
  };

  let animProps: Record<string, any> = {};
  let displayText = text;

  switch (animStyle) {
    case "slam":
      animProps = renderSlamStyle();
      break;
    case "typewriter":
      const tw = renderTypewriterStyle();
      displayText = tw.text;
      animProps = { opacity: tw.opacity };
      break;
    case "reveal":
      animProps = renderRevealStyle();
      break;
    case "glitch":
      animProps = renderGlitchStyle();
      break;
    case "fade-up":
      animProps = renderFadeUpStyle();
      break;
  }

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        alignItems: "center",
        pointerEvents: "none",
        padding: isVertical ? "0 60px" : "0 120px",
      }}
    >
      <span
        style={{
          color: "#F8FAFC",
          fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
          fontSize: baseFontSize,
          fontWeight: 900,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.15,
          WebkitTextStroke: `${isVertical ? 2 : 1.5}px rgba(2,6,23,0.7)`,
          textShadow: `0 0 30px ${accentColor}40, 0 4px 16px rgba(0,0,0,0.8)`,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
          ...animProps,
        }}
      >
        {displayText}
      </span>
    </AbsoluteFill>
  );
};
