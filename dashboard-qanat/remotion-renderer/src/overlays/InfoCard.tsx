import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SafeLottie } from "./SafeLottie";

import sparklesAnim from "./lottie_assets/sparkles.json";
import flameAnim from "./lottie_assets/flame.json";
import globeAnim from "./lottie_assets/globe.json";
import infoAnim from "./lottie_assets/info.json";

export interface InfoCardProps {
  title: string;
  description: string;
  iconType?: "sparkles" | "gear" | "shield" | "flame" | "info" | "earth" | "building" | "crown";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  accentColor?: string;
}

const ANIM_IN_FRAMES = 15;
const ANIM_OUT_FRAMES = 12;

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  iconType = "info",
  position = "top-left",
  accentColor = "#D4AF37",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Slide & Fade animation
  const slideIn = interpolate(frame, [0, ANIM_IN_FRAMES], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, ANIM_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outStart = durationInFrames - ANIM_OUT_FRAMES;
  const slideOut = interpolate(frame, [outStart, durationInFrames], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(fadeIn, fadeOut);

  // Position coordinates
  const positionStyle: React.CSSProperties = {};
  
  if (position.includes("top")) {
    positionStyle.top = isVertical ? 180 : 80;
  } else {
    positionStyle.bottom = isVertical ? 640 : 210;
  }

  if (position.includes("left")) {
    positionStyle.left = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideIn - slideOut}px)`;
  } else {
    positionStyle.right = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideOut - slideIn}px)`;
  }

  // Get Lottie animation data based on iconType
  const getLottieData = () => {
    switch (iconType) {
      case "sparkles":
      case "crown":
        return sparklesAnim;
      case "flame":
      case "gear":
      case "shield":
        return flameAnim;
      case "earth":
      case "building":
        return globeAnim;
      case "info":
      default:
        return infoAnim;
    }
  };

  const size = isVertical ? 42 : 32;

  return (
    <AbsoluteFill
      style={{
        position: "absolute",
        ...positionStyle,
        opacity,
        pointerEvents: "none",
        width: isVertical ? 680 : 400,
        height: "auto",
        zIndex: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, rgba(6,6,10,0.95) 0%, rgba(14,14,20,0.92) 100%)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderLeft: `3px solid ${accentColor}`,
          borderRadius: "8px",
          padding: isVertical ? "16px 20px" : "10px 14px",
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.45)",
          gap: isVertical ? 16 : 10,
        }}
      >
        {/* Lottie Animation Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            flexShrink: 0,
          }}
        >
          <SafeLottie animationData={getLottieData()} style={{ width: size, height: size }} />
        </div>

        {/* Content panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              color: accentColor,
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontSize: isVertical ? 20 : 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <span
            style={{
              color: "rgba(248,250,252,0.9)",
              fontFamily: "'Inter', sans-serif",
              fontSize: isVertical ? 16 : 10.5,
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
