import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

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
 * Overlay de Grifo Vetorial Procedural (Pure React/CSS/SVG).
 * 100% isolado, sem dependências internas de versão do Remotion.
 */
export const RoughNotationOverlay: React.FC<RoughNotationOverlayProps> = ({
  text = "DESTAQUE IMPORTANTE",
  type = "highlight",
  color = "#FFE600",
  strokeWidth = 3,
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

  const renderStyle = (): React.CSSProperties => {
    switch (type) {
      case "highlight":
        return {
          backgroundColor: color,
          color: "#000000",
          padding: `${padding}px ${padding * 1.5}px`,
          borderRadius: "4px",
          fontWeight: 800,
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        };
      case "underline":
        return {
          borderBottom: `${strokeWidth}px solid ${color}`,
          paddingBottom: `${padding / 2}px`,
        };
      case "box":
        return {
          border: `${strokeWidth}px solid ${color}`,
          padding: `${padding}px`,
          borderRadius: "6px",
        };
      case "circle":
        return {
          border: `${strokeWidth}px solid ${color}`,
          padding: `${padding}px ${padding * 1.5}px`,
          borderRadius: "9999px",
        };
      case "strike-through":
        return {
          textDecoration: `line-through ${color}`,
          textDecorationThickness: `${strokeWidth}px`,
        };
      case "crossed-off":
        return {
          textDecoration: `line-through wavy ${color}`,
          textDecorationThickness: `${strokeWidth}px`,
        };
      case "bracket":
        return {
          borderLeft: `${strokeWidth}px solid ${color}`,
          borderRight: `${strokeWidth}px solid ${color}`,
          padding: `0 ${padding * 1.5}px`,
        };
      default:
        return {};
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        fontSize: `${fontSize}px`,
        fontFamily: "Inter, sans-serif",
        color: type === "highlight" ? "#000000" : "#FFFFFF",
        zIndex: 50,
        pointerEvents: "none",
        display: "inline-block",
        ...renderStyle(),
      }}
    >
      {text}
    </div>
  );
};
