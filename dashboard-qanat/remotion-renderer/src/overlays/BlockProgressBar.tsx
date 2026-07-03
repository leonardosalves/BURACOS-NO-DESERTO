import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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
  | "cinematic" | "neon" | "minimal" | "documentary" | "tech"
  | "dashed" | "dotted" | "bold" | "glass" | "elegant" | "gradient" | "glow" | "retro" | "outline";

const BLOCK_PROGRESS_DESIGNS: BlockProgressDesign[] = [
  "cinematic", "neon", "minimal", "documentary", "tech",
  "dashed", "dotted", "bold", "glass", "elegant", "gradient", "glow", "retro", "outline",
];

function normalizeBlockProgressDesign(raw: unknown): BlockProgressDesign {
  const id = String(raw || "cinematic").toLowerCase() as BlockProgressDesign;
  return BLOCK_PROGRESS_DESIGNS.includes(id) ? id : "cinematic";
}

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
  showChannelLogo?: boolean;
  channelLogoSize?: number;
  channelLogoSrc?: string | null;
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
  return String(marker.title || marker.label || `Bloco ${marker.block}`).trim();
}

function titleStyle(
  isActive: boolean,
  titleFontFamily: string,
  resolvedTitleSize: number,
  titleColor: string,
  maxWidth: number,
  textAlign: "left" | "center" = "center",
) {
  return {
    fontFamily: titleFontFamily,
    fontSize: isActive ? resolvedTitleSize : Math.max(7, resolvedTitleSize - 1),
    fontWeight: isActive ? 700 : 500,
    color: isActive ? titleColor : `${titleColor}88`,
    lineHeight: 1.2,
    textAlign,
    whiteSpace: "normal" as const,
    wordBreak: "break-word" as const,
    maxWidth,
    textShadow: isActive ? "0 1px 4px rgba(0,0,0,0.85)" : "0 1px 3px rgba(0,0,0,0.7)",
  };
}

type ExtraLineStyle = {
  offset: number;
  height: number;
  background: string;
};

type DesignTokens = {
  trackH: number;
  trackBg: string;
  fill: string;
  fillGlow: string;
  iconGap: number;
  trackRadius?: number | string;
  fillRadius?: number | string;
  trackBorder?: string;
  fillBorder?: string;
  trackBoxShadow?: string;
  fillBoxShadow?: string;
  extraLine?: ExtraLineStyle | null;
  backdropBlur?: number;
};

function designTokens(design: BlockProgressDesign, accent: string): DesignTokens {
  switch (design) {
    case "neon":
      return {
        trackH: 4,
        trackBg: "rgba(0,255,255,0.12)",
        fill: `linear-gradient(90deg, #00E5FF, ${accent})`,
        fillGlow: "0 0 16px #00E5FF88, 0 0 8px rgba(212,175,55,0.4)",
        iconGap: 6,
      };
    case "minimal":
      return {
        trackH: 2,
        trackBg: "rgba(255,255,255,0.1)",
        fill: "rgba(255,255,255,0.85)",
        fillGlow: "none",
        iconGap: 5,
      };
    case "documentary":
      return {
        trackH: 3,
        trackBg: "rgba(197,168,128,0.15)",
        fill: `linear-gradient(90deg, ${accent}66, ${accent})`,
        fillGlow: `0 0 10px ${accent}44`,
        iconGap: 7,
        extraLine: { offset: 1, height: 1, background: `${accent}33` },
      };
    case "tech":
      return {
        trackH: 4,
        trackBg: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px)",
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: `0 0 12px ${accent}55`,
        iconGap: 6,
      };
    case "dashed":
      return {
        trackH: 3,
        trackBg: "transparent",
        trackBorder: "1.5px dashed rgba(255,255,255,0.35)",
        fill: `linear-gradient(90deg, ${accent}99, ${accent})`,
        fillGlow: "none",
        iconGap: 7,
        trackRadius: 2,
        fillRadius: 2,
      };
    case "dotted":
      return {
        trackH: 4,
        trackBg: "radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)",
        trackBoxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        fill: accent,
        fillGlow: `0 0 6px ${accent}55`,
        iconGap: 6,
        trackRadius: 4,
        fillRadius: 4,
      };
    case "bold":
      return {
        trackH: 6,
        trackBg: "rgba(0,0,0,0.35)",
        fill: accent,
        fillGlow: `0 0 8px ${accent}77`,
        iconGap: 8,
        trackRadius: 3,
        fillRadius: 3,
      };
    case "glass":
      return {
        trackH: 5,
        trackBg: "rgba(255,255,255,0.12)",
        trackBorder: "1px solid rgba(255,255,255,0.22)",
        trackBoxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
        fill: `linear-gradient(90deg, ${accent}55, ${accent}cc)`,
        fillGlow: `0 0 14px ${accent}44`,
        iconGap: 7,
        trackRadius: 8,
        fillRadius: 8,
        backdropBlur: 6,
      };
    case "elegant":
      return {
        trackH: 2,
        trackBg: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        fill: `linear-gradient(90deg, ${accent}44, ${accent})`,
        fillGlow: "none",
        iconGap: 8,
        trackRadius: 1,
        fillRadius: 1,
        extraLine: { offset: 2, height: 1, background: `${accent}22` },
      };
    case "gradient":
      return {
        trackH: 4,
        trackBg: "rgba(255,255,255,0.08)",
        fill: `linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, ${accent})`,
        fillGlow: "0 0 14px rgba(255,217,61,0.35)",
        iconGap: 7,
        trackRadius: 4,
        fillRadius: 4,
      };
    case "glow":
      return {
        trackH: 5,
        trackBg: "rgba(0,0,0,0.45)",
        trackBorder: `1px solid ${accent}33`,
        fill: accent,
        fillGlow: `0 0 18px ${accent}, 0 0 36px ${accent}88, inset 0 0 8px rgba(255,255,255,0.25)`,
        fillBoxShadow: `0 0 18px ${accent}, 0 0 36px ${accent}66`,
        iconGap: 8,
        trackRadius: 6,
        fillRadius: 6,
      };
    case "retro":
      return {
        trackH: 5,
        trackBg: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 3px), rgba(255,255,255,0.06)",
        fill: `repeating-linear-gradient(90deg, ${accent} 0 6px, ${accent}cc 6px 8px)`,
        fillGlow: "none",
        iconGap: 7,
        trackRadius: 0,
        fillRadius: 0,
        trackBorder: "1px solid rgba(255,255,255,0.12)",
      };
    case "outline":
      return {
        trackH: 4,
        trackBg: "transparent",
        trackBorder: `1.5px solid ${accent}55`,
        fill: "transparent",
        fillBorder: `2px solid ${accent}`,
        fillGlow: `0 0 10px ${accent}44`,
        iconGap: 7,
        trackRadius: 4,
        fillRadius: 4,
      };
    case "cinematic":
    default:
      return {
        trackH: 3,
        trackBg: "rgba(255,255,255,0.08)",
        fill: `linear-gradient(90deg, ${accent}88, ${accent})`,
        fillGlow: `0 0 12px ${accent}66`,
        iconGap: 8,
      };
  }
}

function barStackBelowTrack(tokens: DesignTokens) {
  if (!tokens.extraLine) return 0;
  return tokens.extraLine.offset + tokens.extraLine.height;
}

function barIconRowOffset(tokens: DesignTokens) {
  return tokens.trackH + barStackBelowTrack(tokens) + tokens.iconGap;
}

function markerCenter(marker: BlockProgressMarker, total: number) {
  return ((marker.start + marker.duration / 2) / Math.max(1, total)) * 100;
}

export const BlockProgressBar: React.FC<BlockProgressBarProps> = ({
  totalDuration,
  blocks = [],
  design: designProp = "cinematic",
  iconSize = 22,
  defaultIconStyle = "lottie",
  showBlockTitles = false,
  titleFont = "inter",
  titleFontSize,
  titleColor = "#FFFFFF",
  accentColor = "#C5A880",
  orientation = "horizontal",
  showChannelLogo = false,
  channelLogoSize,
  channelLogoSrc = null,
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

  const design = normalizeBlockProgressDesign(designProp);
  const tokens = designTokens(design, accentColor);
  const safeBlocks = (blocks || []).filter((b) => b && b.iconType);
  const activeBlock = safeBlocks.find(
    (b) => currentSec >= b.start && currentSec < b.start + b.duration,
  )?.block;

  const baseIcon = Math.max(12, Math.min(36, iconSize));
  const scale = isVertical ? 0.85 : 1;
  const slotWidth = Math.max(56, Math.floor((width - 48) / Math.max(1, safeBlocks.length)));
  const logoPx = Math.max(14, Math.min(56, channelLogoSize || (isVertical ? 22 : 28)));
  const showLogo = showChannelLogo === true && Boolean(channelLogoSrc);

  const progressTipLogo = (left: number | string, top: number | string) => (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: logoPx,
        height: logoPx,
        transform: "translate(-50%, -50%)",
        filter: `drop-shadow(0 0 8px ${accentColor}88)`,
        pointerEvents: "none",
      }}
    >
      <Img
        src={staticFile(String(channelLogoSrc).replace(/\\/g, "/"))}
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
      />
    </div>
  );

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
            borderRadius: tokens.trackRadius ?? barWidth,
            border: tokens.trackBorder,
            boxShadow: tokens.trackBoxShadow,
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
              borderRadius: tokens.fillRadius ?? barWidth,
              border: tokens.fillBorder,
              boxShadow: tokens.fillBoxShadow || tokens.fillGlow,
            }}
          />
        </div>
        {showLogo && progressTipLogo(
          barLeft + barWidth / 2,
          barTop + barHeight * (1 - progress / 100),
        )}
        {safeBlocks.map((marker) => {
          const pct = markerCenter(marker, totalDuration);
          const size = Math.round((marker.iconSize || baseIcon) * scale);
          const isActive = marker.block === activeBlock;
          const markerY = barTop + (pct / 100) * barHeight;
          const titleMaxW = Math.max(64, width - iconLeft - 10);
          return (
            <div
              key={`bp-${marker.block}`}
              style={{
                position: "absolute",
                left: iconLeft,
                top: markerY,
                transform: `translateY(-50%) scale(${isActive ? 1.08 : 0.92})`,
                transformOrigin: "top left",
                opacity: isActive ? 1 : 0.45,
                filter: isActive ? `drop-shadow(0 0 6px ${accentColor}88)` : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 3,
                maxWidth: titleMaxW,
              }}
            >
              <OverlayIconSlot
                iconType={marker.iconType}
                iconStyle={marker.iconStyle || defaultIconStyle}
                size={size}
                accentColor={isActive ? accentColor : `${accentColor}99`}
              />
              {showBlockTitles && (
                <span style={titleStyle(isActive, titleFontFamily, resolvedTitleSize, titleColor, titleMaxW, "left")}>
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
  const iconTop = barTop + barIconRowOffset(tokens);

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
          borderRadius: tokens.trackRadius ?? tokens.trackH,
          border: tokens.trackBorder,
          boxShadow: tokens.trackBoxShadow,
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
          borderRadius: tokens.fillRadius ?? tokens.trackRadius ?? tokens.trackH,
          border: tokens.fillBorder,
          boxShadow: tokens.fillBoxShadow || tokens.fillGlow,
        }}
      />
      {tokens.extraLine && (
        <div
          style={{
            position: "absolute",
            top: barTop + tokens.trackH + tokens.extraLine.offset,
            left: 24,
            right: 24,
            height: tokens.extraLine.height,
            background: tokens.extraLine.background,
          }}
        />
      )}
      {showLogo && progressTipLogo(
        `calc(24px + (100% - 48px) * ${progress / 100})`,
        barTop + tokens.trackH / 2,
      )}
      {safeBlocks.map((marker) => {
        const pct = markerCenter(marker, totalDuration);
        const size = Math.round(marker.iconSize || baseIcon);
        const isActive = marker.block === activeBlock;
        const titleMaxW = showBlockTitles ? Math.max(size, slotWidth - 4) : size;
        return (
          <div
            key={`bp-${marker.block}`}
            style={{
              position: "absolute",
              left: `calc(24px + (100% - 48px) * ${pct / 100})`,
              top: iconTop,
              transform: `translateX(-50%) scale(${isActive ? 1.08 : 0.9})`,
              transformOrigin: "top center",
              opacity: isActive ? 1 : 0.42,
              filter: isActive ? `drop-shadow(0 0 8px ${accentColor}99)` : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              width: titleMaxW,
            }}
          >
            <OverlayIconSlot
              iconType={marker.iconType}
              iconStyle={marker.iconStyle || defaultIconStyle}
              size={size}
              accentColor={isActive ? accentColor : `${accentColor}88`}
            />
            {showBlockTitles && (
              <span style={titleStyle(isActive, titleFontFamily, resolvedTitleSize, titleColor, titleMaxW)}>
                {blockTitleLabel(marker)}
              </span>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};