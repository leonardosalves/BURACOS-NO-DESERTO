import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { READABLE_TEXT_SHADOW, lottieDataForKey, lottieVariantSeed, resolveLottieKey } from "./listicleHudTheme";
import { TitleLottieIcon } from "./TitleLottieIcon";
import crownLottie from "./lottie_assets/lottie_biz_crown_1.json";

export interface ListicleRecapLine {
  rank: number;
  title: string;
  visualHook?: string;
}

export interface ListicleRecapProps {
  title: string;
  lines?: ListicleRecapLine[];
  cta?: string;
  accentColor?: string;
  theme?: string;
  fontTitle?: string;
  position?: "top-center" | "bottom-right" | "bottom-left" | "bottom-center";
  videoSeed?: string;
}

export const ListicleRecap: React.FC<ListicleRecapProps> = ({
  title,
  lines = [],
  cta = "Qual você colocaria em 1º? Comenta!",
  accentColor = "#D4AF37",
  fontTitle = "Cinzel",
  position = "top-center",
  videoSeed = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const useTop = position === "top-center";
  const positionStyle: React.CSSProperties = useTop
    ? {
      top: isVertical ? 96 : 48,
      left: "50%",
      transform: "translateX(-50%)",
      alignItems: "center",
      width: isVertical ? width - 28 : Math.min(560, width * 0.88),
    }
    : position === "bottom-left"
      ? { left: isVertical ? 20 : 40, bottom: isVertical ? 120 : 60, alignItems: "flex-start" }
      : position === "bottom-center"
        ? { left: "50%", bottom: isVertical ? 120 : 60, transform: "translateX(-50%)", alignItems: "center" }
        : { right: isVertical ? 20 : 40, bottom: isVertical ? 120 : 60, alignItems: "flex-end" };

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 28, opacity: fadeIn }}>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: isVertical ? "18px 20px" : "16px 18px",
          borderRadius: 18,
          background: "rgba(0,0,0,0.88)",
          border: `2px solid ${accentColor}66`,
          backdropFilter: "blur(14px)",
          boxShadow: `0 14px 36px rgba(0,0,0,0.55), 0 0 24px ${accentColor}28`,
          ...positionStyle,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%" }}>
          <TitleLottieIcon
            animationData={crownLottie}
            size={isVertical ? 44 : 36}
            accentColor={accentColor}
            isClimax
          />
          <span
            style={{
              fontFamily: `${fontTitle}, serif`,
              fontSize: isVertical ? 28 : 22,
              fontWeight: 800,
              color: accentColor,
              letterSpacing: "0.05em",
              textAlign: "center",
              textShadow: READABLE_TEXT_SHADOW,
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "center" }}>
          {lines.map((line, index) => {
            const delay = index * 6;
            const lineOpacity = interpolate(frame, [delay, delay + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const lineY = interpolate(frame, [delay, delay + 12], [16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const iconKey = resolveLottieKey({
              rank: line.rank,
              title: line.title,
              visualHook: line.visualHook || "",
              videoSeed,
            });

            return (
              <div
                key={`${line.rank}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  opacity: lineOpacity,
                  transform: `translateY(${lineY}px)`,
                  width: "100%",
                }}
              >
                <TitleLottieIcon
                  animationData={lottieDataForKey(iconKey, lottieVariantSeed([videoSeed, line.rank, line.title, line.visualHook || "", iconKey]))}
                  size={isVertical ? 36 : 30}
                  accentColor={accentColor}
                  isClimax={line.rank === 1}
                />
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: isVertical ? 22 : 17,
                    fontWeight: line.rank === 1 ? 800 : 600,
                    color: line.rank === 1 ? "#FFE9A8" : "#FFFFFF",
                    lineHeight: 1.25,
                    textAlign: "center",
                    textShadow: READABLE_TEXT_SHADOW,
                  }}
                >
                  #{line.rank} {line.title}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 4,
            paddingTop: 10,
            borderTop: `1px solid ${accentColor}33`,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(frame, [lines.length * 6 + 8, lines.length * 6 + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: isVertical ? 18 : 14,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: "0.04em",
              textShadow: READABLE_TEXT_SHADOW,
            }}
          >
            {cta}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};