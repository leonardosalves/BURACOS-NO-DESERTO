import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface SocialPostCardProps {
  platform?: "reddit" | "x" | "generic";
  username?: string;
  text: string;
  upvotes?: string;
  accentColor?: string;
  position?: "bottom-left" | "bottom-right";
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  platform = "reddit",
  username = "curiosidades",
  text,
  upvotes = "12k",
  accentColor = "#FF4500",
  position = "bottom-left",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const enter = spring({ fps, frame, config: { damping: 18, stiffness: 130 } });
  const exitStart = Math.max(0, durationInFrames - 14);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);

  const platformColor = platform === "x" ? "#1DA1F2" : platform === "reddit" ? "#FF4500" : accentColor;
  const platformLabel = platform === "x" ? "𝕏" : platform === "reddit" ? "reddit" : "web";

  const posStyle: React.CSSProperties = position === "bottom-right"
    ? { bottom: isVertical ? 260 : 140, right: isVertical ? 36 : 56 }
    : { bottom: isVertical ? 260 : 140, left: isVertical ? 36 : 56 };

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        opacity,
        transform: `translateY(${(1 - enter) * 20}px) scale(${0.94 + enter * 0.06})`,
        pointerEvents: "none",
        zIndex: 42,
        maxWidth: isVertical ? 400 : 440,
        background: "rgba(18,18,22,0.94)",
        border: `1px solid ${platformColor}55`,
        borderRadius: 14,
        padding: isVertical ? "14px 16px" : "12px 14px",
        boxShadow: `0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px ${platformColor}22 inset`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${platformColor}, ${platformColor}88)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {platformLabel.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#F0F0F2" }}>
            @{username}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
            {platformLabel} · viral
          </div>
        </div>
        {platform === "reddit" && (
          <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: platformColor }}>
            ▲ {upvotes}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: isVertical ? 17 : 14,
          fontWeight: 600,
          color: "#E8E8EC",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
};