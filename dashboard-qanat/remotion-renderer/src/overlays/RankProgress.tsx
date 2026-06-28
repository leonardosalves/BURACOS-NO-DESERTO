import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  hudThemeStyles,
  lottieDataForKey,
  lottieVariantSeed,
  READABLE_TEXT_SHADOW,
  resolveLottieKey,
  type ListicleHudTheme,
} from "./listicleHudTheme";
import { TitleLottieIcon } from "./TitleLottieIcon";

export interface RankProgressSegment {
  at: number;
  mode?: "intro" | "item";
  rank?: number;
  title?: string;
  progress: number;
  visualHook?: string;
  lottieKey?: string;
}

export interface RankProgressProps {
  current?: number;
  total: number;
  progress?: number;
  rank?: number;
  rankOrder?: "asc" | "desc";
  accentColor?: string;
  persistentHud?: boolean;
  fadeOnEntry?: boolean;
  segments?: RankProgressSegment[];
  hudStyle?: "compact" | "full" | "auto";
  hudTheme?: ListicleHudTheme;
  fontTitle?: string;
  secondaryColor?: string;
  thumbnailPalette?: string[];
}

function resolveSegment(segments: RankProgressSegment[], timeSec: number) {
  let active = segments[0];
  for (const seg of segments) {
    if (seg.at <= timeSec) active = seg;
    else break;
  }
  return active;
}

export const RankProgress: React.FC<RankProgressProps> = ({
  current,
  total,
  progress,
  rank,
  rankOrder = "desc",
  accentColor = "#C5A880",
  persistentHud = false,
  fadeOnEntry = true,
  segments = [],
  hudStyle = "full",
  hudTheme = "ancient",
  fontTitle = "Cinzel",
  secondaryColor,
  thumbnailPalette = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const timeSec = frame / fps;

  const safeTotal = Math.max(1, total);
  const climaxRank = rankOrder === "desc" ? 1 : safeTotal;
  const isCompact = hudStyle === "compact" || (hudStyle === "auto" && safeTotal > 8);

  const { active, next, segAge, isLegacy, prevRank } = useMemo(() => {
    if (!segments.length) {
      const displayRank = rank ?? current ?? 1;
      const prog = progress ?? current ?? 1;
      return {
        active: {
          at: 0,
          mode: "item" as const,
          rank: displayRank,
          title: "",
          progress: prog,
        },
        next: null as RankProgressSegment | null,
        segAge: timeSec,
        isLegacy: true,
        prevRank: displayRank,
      };
    }

    const activeSeg = resolveSegment(segments, timeSec);
    const activeIdx = segments.indexOf(activeSeg);
    const nextSeg = activeIdx >= 0 && activeIdx < segments.length - 1 ? segments[activeIdx + 1] : null;
    const prevSeg = activeIdx > 0 ? segments[activeIdx - 1] : null;
    return {
      active: activeSeg,
      next: nextSeg,
      segAge: timeSec - activeSeg.at,
      isLegacy: false,
      prevRank: prevSeg?.rank ?? activeSeg.rank,
    };
  }, [segments, timeSec, rank, current, progress]);

  const isIntro = active.mode === "intro" || !active.rank;
  if (isIntro) return null;

  const displayRank = active.rank;
  const filledProgress = Math.min(safeTotal, Math.max(0, active.progress));
  const isClimax = !isIntro && displayRank === climaxRank;
  const titleLine = String(active.title || "").trim();
  const rankChanged = !isIntro && displayRank !== prevRank && segAge < 0.5;

  const lottieKey = resolveLottieKey({
    isClimax,
    rank: displayRank,
    visualHook: active.visualHook,
    title: titleLine,
    lottieKey: active.lottieKey,
  });
  const lottieSeed = lottieVariantSeed([displayRank, titleLine, lottieKey]);
  const lottieData = lottieDataForKey(lottieKey, lottieSeed);

  const brandAccent = thumbnailPalette[0] || accentColor;
  const activeAccent = isClimax ? (secondaryColor || "#D4AF37") : brandAccent;
  const theme = hudThemeStyles(hudTheme, activeAccent, isClimax);

  const fadeIn = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = persistentHud && !fadeOnEntry && !isLegacy ? 1 : fadeIn;

  const popScale = interpolate(segAge * fps, [0, 10], [1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rankSlideY = interpolate(segAge * fps, [0, 9], [isCompact ? -12 : -20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rankFade = interpolate(segAge * fps, [0, 7], [0.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const transitionFlash = interpolate(segAge * fps, [0, 5], [rankChanged ? 0.55 : 0.22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const showNextHint =
    !isIntro &&
    next?.rank &&
    next.at - timeSec > 0 &&
    next.at - timeSec < 0.85;

  const nextHintProgress = showNextHint && next
    ? interpolate((next.at - timeSec) * fps, [0, fps * 0.85], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
    : 0;

  const rankFontSize = isCompact
    ? (isVertical ? 44 : 32)
    : (isVertical ? 58 : 38);
  const labelFontSize = isCompact
    ? (isVertical ? 22 : 18)
    : (isVertical ? 30 : 22);
  const titleFontSize = isVertical ? 36 : 26;
  const dotSize = isVertical
    ? (safeTotal > 12 ? 14 : safeTotal > 8 ? 16 : 18)
    : (safeTotal > 12 ? 10 : safeTotal > 8 ? 12 : 14);
  const dotGap = safeTotal > 10 ? 6 : isVertical ? 8 : 7;
  const cardPadding = isCompact
    ? (isVertical ? "14px 18px" : "12px 16px")
    : (isVertical ? "20px 24px" : "16px 22px");
  const rowGap = isCompact ? 10 : isVertical ? 14 : 10;
  const useBar = safeTotal > 8;
  const barWidth = isVertical ? Math.min(width - 180, safeTotal > 12 ? 140 : 168) : 128;
  const lottieSize = isCompact ? (isVertical ? 52 : 40) : (isVertical ? 76 : 56);
  const cardWidth = isVertical ? width - 24 : width * 0.9;

  const progressRow = useBar ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%" }}>
      <div
        style={{
          flex: 1,
          maxWidth: barWidth,
          height: isVertical ? 12 : 9,
          borderRadius: 99,
          background: "rgba(255,255,255,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(filledProgress / safeTotal) * 100}%`,
            height: "100%",
            borderRadius: 99,
            background: `linear-gradient(90deg, ${activeAccent}, ${isClimax ? "#FFE9A8" : activeAccent})`,
            boxShadow: `0 0 14px ${activeAccent}`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: isVertical ? 20 : 15,
          fontWeight: 800,
          color: "rgba(255,255,255,0.95)",
          minWidth: 48,
          flexShrink: 0,
          textShadow: READABLE_TEXT_SHADOW,
        }}
      >
        {filledProgress}/{safeTotal}
      </span>
    </div>
  ) : (
    <div style={{ display: "flex", gap: dotGap, alignItems: "center", justifyContent: "center", width: "100%" }}>
      {Array.from({ length: safeTotal }, (_, i) => (
        <div
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: i < filledProgress ? activeAccent : "rgba(255,255,255,0.24)",
            boxShadow: i < filledProgress ? `0 0 14px ${activeAccent}` : "none",
          }}
        />
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 30, opacity }}>
      <AbsoluteFill
        style={{
          background: theme.topGradient,
          opacity: 0.95,
        }}
      />

      {transitionFlash > 0.01 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 12%, ${activeAccent}55 0%, transparent 55%)`,
            opacity: transitionFlash,
          }}
        />
      )}

      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: isVertical ? 88 : 36,
          paddingLeft: isVertical ? 12 : 20,
          paddingRight: isVertical ? 12 : 20,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
            width: cardWidth,
            maxWidth: cardWidth,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: rowGap,
              padding: cardPadding,
              borderRadius: isVertical ? 22 : 18,
              background: theme.cardBackground,
              border: `2.5px solid ${theme.borderColor}`,
              backdropFilter: "blur(16px)",
              boxShadow: theme.glow,
              transform: `scale(${popScale})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isVertical ? 14 : 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: isVertical ? 14 : 10,
                  transform: `translateY(${rankSlideY}px)`,
                  opacity: rankFade,
                }}
              >
                <span
                  style={{
                    fontFamily: `${fontTitle}, serif`,
                    fontSize: rankFontSize,
                    fontWeight: 800,
                    color: isClimax ? "#FFE9A8" : "#FFFFFF",
                    letterSpacing: "0.04em",
                    lineHeight: 1.05,
                    textShadow: READABLE_TEXT_SHADOW,
                    WebkitTextStroke: "1.5px rgba(0,0,0,0.4)",
                  }}
                >
                  #{displayRank}
                </span>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: labelFontSize,
                    fontWeight: 800,
                    color: activeAccent,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    lineHeight: 1.05,
                    textShadow: READABLE_TEXT_SHADOW,
                  }}
                >
                  Top {safeTotal}
                </span>
              </div>
            </div>

            {!isCompact && titleLine && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: isVertical ? 14 : 10,
                  width: "100%",
                  paddingTop: 4,
                  borderTop: `1px solid ${theme.divider}`,
                }}
              >
                <TitleLottieIcon animationData={lottieData} size={lottieSize} />
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: titleFontSize,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: "0.01em",
                    lineHeight: 1.3,
                    maxWidth: isVertical ? width - 140 : width * 0.7,
                    whiteSpace: "normal",
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                    hyphens: "none",
                    textAlign: "center",
                    textShadow: READABLE_TEXT_SHADOW,
                    WebkitTextStroke: "0.75px rgba(0,0,0,0.35)",
                  }}
                >
                  {titleLine}
                </span>
              </div>
            )}

            <div style={{ paddingTop: 2 }}>{progressRow}</div>
          </div>

          {showNextHint && next?.rank && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: isVertical ? "10px 16px" : "8px 14px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.78)",
                border: `2px solid ${activeAccent}55`,
                backdropFilter: "blur(10px)",
                boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 18px ${activeAccent}22`,
                transform: `translateX(${interpolate(nextHintProgress, [0, 1], [-8, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px)`,
                opacity: interpolate(nextHintProgress, [0, 1], [0.5, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: isVertical ? 22 : 17,
                  fontWeight: 900,
                  color: activeAccent,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  textShadow: READABLE_TEXT_SHADOW,
                }}
              >
                →
              </span>
              <span
                style={{
                  fontFamily: `${fontTitle}, serif`,
                  fontSize: isVertical ? 26 : 20,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "0.06em",
                  textShadow: READABLE_TEXT_SHADOW,
                }}
              >
                #{next.rank}
              </span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: isVertical ? 14 : 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                em seguida
              </span>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};