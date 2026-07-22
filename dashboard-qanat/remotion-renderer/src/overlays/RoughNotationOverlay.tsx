import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Highlight,
  Underline,
  Box,
  Circle,
  StrikeThrough,
  CrossedOff,
  Bracket,
} from "@remotion/rough-notation";

export interface RoughNotationOverlayProps {
  text?: string;
  type?: "underline" | "box" | "circle" | "highlight" | "strike-through" | "crossed-off" | "bracket";
  color?: string;
  strokeWidth?: number;
  iterations?: number;
  fontSize?: number;
  top?: string | number;
  left?: string | number;
  padding?: number;
}

/**
 * Overlay de Grifo Vetorial (Rough Notation / Hand-drawn Stomps).
 * Totalmente OPCIONAL. Inspirado no Remotion Rough-Notation e HyperFrames.
 */
export const RoughNotationOverlay: React.FC<RoughNotationOverlayProps> = ({
  text = "DESTAQUE IMPORTANTE",
  type = "highlight",
  color = "#FFE600",
  strokeWidth = 3,
  iterations = 2,
  fontSize = 32,
  top = "40%",
  left = "50%",
  padding = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.6 },
  });

  const commonProps = {
    color,
    strokeWidth,
    iterations,
    padding,
  };

  const renderAnnotation = () => {
    switch (type) {
      case "underline":
        return <Underline {...commonProps}><span>{text}</span></Underline>;
      case "box":
        return <Box {...commonProps}><span>{text}</span></Box>;
      case "circle":
        return <Circle {...commonProps}><span>{text}</span></Circle>;
      case "strike-through":
        return <StrikeThrough {...commonProps}><span>{text}</span></StrikeThrough>;
      case "crossed-off":
        return <CrossedOff {...commonProps}><span>{text}</span></CrossedOff>;
      case "bracket":
        return <Bracket {...commonProps}><span>{text}</span></Bracket>;
      case "highlight":
      default:
        return <Highlight {...commonProps}><span>{text}</span></Highlight>;
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        zIndex: 200,
        fontFamily: "'Inter', 'Montserrat', sans-serif",
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        color: type === "highlight" ? "#111111" : "#FFFFFF",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {renderAnnotation()}
    </div>
  );
};
