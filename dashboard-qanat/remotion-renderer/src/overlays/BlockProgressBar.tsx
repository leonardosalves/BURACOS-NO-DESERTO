import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { OverlayIconSlot } from "./overlayIconSlot";

export type BlockProgressMarker = {
  block: number;
  start: number;
  duration: number;
  title?: string;
  label?: string;
  iconType: string;
  iconStyle?: "lottie" | "svg";
  iconSize?: number;
};

export type BlockProgressDesign =
  | "cinematic"
  | "neon"
  | "minimal"
  | "documentary"
  | "tech";

export interface BlockProgressBarProps {
  enabled?: boolean;
  totalDuration: number;
  blocks: BlockProgressMarker[];
  design?: BlockProgressDesign;
  iconSize?: number;
  defaultIconStyle?: "lottie" | "svg";
  showBlockTitles?: boolean;
  titleFont?: string;
  titleFontSize?: number;
  titleColor?: string;
  accentColor?: string;
  orientation?: "horizontal" | "vertical";
}

const TITLE_FONT_STACKS: Record<string, string> = {
  inter: "Inter, sans-serif",
  oswald: "Oswald, sans-serif",
  playfair: "Playfair Display, serif",
  cinzel: "Cinzel, serif",
  bebas: "Bebas Neue, sans-serif",
  jetbrains: "JetBrains Mono, monospace",
};

function blockTitleLabel(marker: BlockProgressMarker) {
  const text = String(marker.title || marker.label || `Bloco ${marker.block}`).trim();
  return text.length > 28 ? `${text.slice(0, 26).replace(/\s+\S*$/, "")}…` : text;
}

type DesignTokens = {
  trackH: number;
  trackBg: string;
  fill: string;
  fillGlow: string;
  dot: string;
  iconGap: number;
};

function designTokens(design: BlockProgressDesign, accent: string): DesignTokens {
  switch (design) {
    case "neon":
      return {
        trackH: 4,
        trackBg: "rgba(0,255,255,0.12)",
        fill: `linear-gradient(90deg, #00E5FF, ${accent})`,
        fillGlow: `0 0 16px #00E5FF88, 0 0 8px ${accent}66`,
        dot: "#00E5FF",
        iconGap: 6,
      };
    case "minimal":
      return {
        trackH: 2,
        trackBg: "rgba(255,255,255,0.1)",
        fill: "rgba(255,255,255,0.85)",
        fillGlow: "none",
        dot: "rgba(255,255,255,0.5)",
        iconGap: 5,
      };
    case "documentary":
      return {
        trackH: 3,
        trackBg: "rgba(197,168,128,0.15)",
        fill: `linear-gradient(90deg, ${accent}66, ${accent})`,
        fillGlow: `0 0 10px ${accent}44`,
        dot: accent,
        iconGap: 7,
      };
    case "tech":
      return {
        trackH: 4,
        trackBg: `repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px)`,
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: `0 0 12px ${accent}55`,
        dot: accent,
        iconGap: 6,
      };
    case "cinematic":
    default:
      return {
        trackH: 3,
        trackBg: "rgba(255,255,255,0.08)",
        fill: `linear-gradient(90deg, ${accent}88, ${accent})`,
        fillGlow: `0 0 12px ${accent}66`,
        dot: accent,
        iconGap: 8,
      };
  }
}

function markerCenter(marker: BlockProgressMarker, total: number) {
  return ((marker.start + marker.duration / 2) / Math.max(1, total)) * 100;
}

export const BlockProgressBar: React.FC<BlockProgressBarProps> = ({
  totalDuration,
  blocks = [],
  design = "cinematic",
  iconSize = 22,
  defaultIconStyle = "lottie",
  showBlockTitles = false,
  titleFont = "inter",
  titleFontSize,
  titleColor = "#FFFFFF",
  accentColor = "#C5A880",
  orientation = "horizontal",
}) => {
  const resolvedTitleSize = titleFontSize || (orientation === "vertical" ? 9 : 10);
  const titleFontFamily = TITLE_FONT_STACKS[titleFont] || TITLE_FONT_STACKS.inter;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = orientation === "vertical" || height > width;
  const currentSec = frame / fps;
  const progress = interpolate(
    currentSec,
    [0, Math.max(1, totalDuration)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const tokens = designTokens(design, accentColor);
  const safeBlocks = (blocks || []).filter((b) => b && b.iconType);
  const activeBlock = safeBlocks.find(
    (b) => currentSec >= b.start && currentSec < b.start + b.duration,
  )?.block;

  const baseIcon = Math.max(12, Math.min(36, iconSize));
  const scale = isVertical ? 0.85 : 1;

  if (isVertical) {
    const barLeft = 10;
    const barWidth = tokens.trackH;
    const iconLeft = barLeft + barWidth + tokens.iconGap + 2;
    const barTop = 48;
    const barBottom = 120;
    const barHeight = Math.max(80, height - barTop - barBottom);

    return (
      <AbsoluteFill style={{ pointerEvents: "none", zIndex: 55 }}>
        <div
          style={{
            position: "absolute",
            top: barTop,
            left: barLeft,
            width: barWidth,
            height: barHeight,
            background: tokens.trackBg,
            borderRadius: barWidth,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: `${progress}%`,
              background: tokens.fill,
              boxShadow: tokens.fillGlow,
            }}
          />
        </div>
        {safeBlocks.map((marker) => {
          const pct = markerCenter(marker, totalDuration);
          const size = Math.round((marker.iconSize || baseIcon) * scale);
          const isActive = marker.block === activeBlock;
          const markerY = barTop + (pct / 100) * barHeight;
          return (
            <div
              key={`bp-${marker.block}`}
              style={{
                position: "absolute",
                left: iconLeft,
                top: markerY,
                transform: `translateY(-50%) scale(${isActive ? 1.08 : 0.92})`,
                opacity: isActive ? 1 : 0.45,
                filter: isActive ? `drop-shadow(0 0 6px ${accentColor}88)` : "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                maxWidth: Math.max(72, width - iconLeft - 8),
              }}
            >
              <OverlayIconSlot
                iconType={marker.iconType}
                iconStyle={marker.iconStyle || defaultIconStyle}
                size={size}
                accentColor={isActive ? accentColor : `${accentColor}99`}
              />
              {showBlockTitles && (
                <span
                  style={{
                    fontFamily: titleFontFamily,
                    fontSize: isActive ? resolvedTitleSize : Math.max(7, resolvedTitleSize - 1),
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? titleColor : `${titleColor}88`,
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: Math.max(48, width - iconLeft - size - 16),
                    textShadow: isActive ? "0 1px 4px rgba(0,0,0,0.85)" : "0 1px 3px rgba(0,0,0,0.7)",
                  }}
                >
                  {blockTitleLabel(marker)}
                </span>
              )}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  const barTop = 10;
  const iconTop = barTop + tokens.trackH + tokens.iconGap;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 55 }}>
      <div
        style={{
          position: "absolute",
          top: barTop,
          left: 24,
          right: 24,
          height: tokens.trackH,
          background: tokens.trackBg,
          borderRadius: tokens.trackH,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: barTop,
          left: 24,
          width: `calc((100% - 48px) * ${progress / 100})`,
          height: tokens.trackH,
          background: tokens.fill,
          borderRadius: tokens.trackH,
          boxShadow: tokens.fillGlow,
        }}
      />
      {safeBlocks.map((marker) => {
        const pct = markerCenter(marker, totalDuration);
        const size = Math.round(marker.iconSize || baseIcon);
        const isActive = marker.block === activeBlock;
        return (
          <div
            key={`bp-${marker.block}`}
            style={{
              position: "absolute",
              left: `calc(24px + (100% - 48px) * ${pct / 100})`,
              top: iconTop,
              transform: `translateX(-50%) scale(${isActive ? 1.08 : 0.9})`,
              opacity: isActive ? 1 : 0.42,
              filter: isActive ? `drop-shadow(0 0 8px ${accentColor}99)` : "none",
              display: "flex",
              alignItems: "center",
              gap: 5,
              maxWidth: showBlockTitles ? 140 : size,
            }}
          >
            <OverlayIconSlot
              iconType={marker.iconType}
              iconStyle={marker.iconStyle || defaultIconStyle}
              size={size}
              accentColor={isActive ? accentColor : `${accentColor}88`}
            />
            {showBlockTitles && (
              <span
                style={{
                  fontFamily: titleFontFamily,
                  fontSize: isActive ? resolvedTitleSize : Math.max(7, resolvedTitleSize - 1),
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? titleColor : `${titleColor}88`,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 96,
                  textShadow: isActive ? "0 1px 4px rgba(0,0,0,0.85)" : "0 1px 3px rgba(0,0,0,0.7)",
                }}
              >
                {blockTitleLabel(marker)}
              </span>
            )}
          </div>
        );
      })}
      {design === "documentary" && (
        <div
          style={{
            position: "absolute",
            top: barTop + tokens.trackH + 1,
            left: 24,
            right: 24,
            height: 1,
            background: `${accentColor}33`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};