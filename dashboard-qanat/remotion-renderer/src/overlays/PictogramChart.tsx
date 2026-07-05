import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export interface PictogramSegment {
  label: string;
  value: number;
  color?: string;
}

export interface PictogramChartProps {
  title: string;
  source?: string;
  segments: PictogramSegment[];
  icon?: "ship" | "building" | "factory" | "person" | "dot" | "plane" | "car";
  scaleLabel?: string;
  accentColor?: string;
  totalIcons?: number;
}

const DEFAULT_COLORS = ["#E91E8C", "#1565C0", "#00838F", "#546E7A", "#78909C"];

const PictogramIcon: React.FC<{
  type: string;
  color: string;
  size: number;
}> = ({ type, color, size }) => {
  const common = { width: size, height: size, display: "block" as const };

  switch (type) {
    case "ship":
      return (
        <svg viewBox="0 0 24 16" style={common} fill={color}>
          <rect x="1" y="8" width="22" height="5" rx="1" />
          <rect x="4" y="4" width="4" height="4" />
          <rect x="9" y="2" width="3" height="6" />
          <rect x="13" y="3" width="3" height="5" />
          <rect x="17" y="4" width="3" height="4" />
          <rect x="20" y="1" width="2" height="7" />
        </svg>
      );
    case "building":
      return (
        <svg viewBox="0 0 16 20" style={common} fill={color}>
          <rect x="2" y="4" width="12" height="16" rx="1" />
          <rect
            x="4"
            y="7"
            width="2"
            height="2"
            fill="rgba(255,255,255,0.35)"
          />
          <rect
            x="8"
            y="7"
            width="2"
            height="2"
            fill="rgba(255,255,255,0.35)"
          />
          <rect
            x="4"
            y="11"
            width="2"
            height="2"
            fill="rgba(255,255,255,0.35)"
          />
          <rect
            x="8"
            y="11"
            width="2"
            height="2"
            fill="rgba(255,255,255,0.35)"
          />
        </svg>
      );
    case "factory":
      return (
        <svg viewBox="0 0 20 16" style={common} fill={color}>
          <rect x="1" y="8" width="18" height="8" />
          <rect x="3" y="2" width="3" height="6" />
          <rect x="8" y="4" width="3" height="4" />
          <rect x="13" y="1" width="3" height="7" />
        </svg>
      );
    case "person":
      return (
        <svg viewBox="0 0 12 16" style={common} fill={color}>
          <circle cx="6" cy="4" r="3" />
          <path d="M1 16 Q6 9 11 16 Z" />
        </svg>
      );
    case "plane":
      return (
        <svg viewBox="0 0 20 12" style={common} fill={color}>
          <path d="M10 1 L18 6 L10 8 L10 11 L6 9 L2 11 L4 6 L0 6 L10 1 Z" />
        </svg>
      );
    case "car":
      return (
        <svg viewBox="0 0 20 10" style={common} fill={color}>
          <rect x="1" y="4" width="18" height="5" rx="2" />
          <rect x="5" y="1" width="10" height="4" rx="1" />
          <circle cx="5" cy="9" r="2" fill="#333" />
          <circle cx="15" cy="9" r="2" fill="#333" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 10 10" style={common}>
          <circle cx="5" cy="5" r="4" fill={color} />
        </svg>
      );
  }
};

function buildIconGrid(segments: PictogramSegment[], totalIcons: number) {
  const normalized = segments
    .map((s, i) => ({
      label: s.label,
      value: Number(s.value) || 0,
      color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      count: Math.max(0, Math.round((Number(s.value) / 100) * totalIcons)),
    }))
    .filter((s) => s.count > 0);

  const assigned = normalized.reduce((sum, s) => sum + s.count, 0);
  const remainder = Math.max(0, totalIcons - assigned);
  if (remainder > 0 && normalized.length > 0) {
    normalized[normalized.length - 1].count += remainder;
  }

  const icons: { color: string; segmentIdx: number }[] = [];
  normalized.forEach((seg, segIdx) => {
    for (let i = 0; i < seg.count; i++) {
      icons.push({ color: seg.color, segmentIdx: segIdx });
    }
  });

  return { icons, normalized };
}

export const PictogramChart: React.FC<PictogramChartProps> = ({
  title,
  source = "",
  segments = [],
  icon = "ship",
  scaleLabel = "",
  accentColor = "#111111",
  totalIcons = 100,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const { icons, normalized } = useMemo(
    () => buildIconGrid(segments, totalIcons),
    [segments, totalIcons]
  );

  const cols = isVertical ? 10 : 20;
  const iconSize = isVertical ? 22 : 28;
  const gap = isVertical ? 6 : 8;

  const titleOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const titleY = interpolate(frame, [0, fps * 0.5], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleFontSize = isVertical ? 28 : 42;
  const sourceFontSize = isVertical ? 11 : 14;
  const labelFontSize = isVertical ? 12 : 15;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F4F4F2",
        backgroundImage:
          "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        pointerEvents: "none",
        zIndex: 50,
        opacity: exitOpacity,
      }}
    >
      <AbsoluteFill
        style={{
          padding: isVertical ? "80px 36px 120px" : "64px 96px 72px",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isVertical ? 960 : 1400,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: titleFontSize,
              fontWeight: 800,
              lineHeight: 1.15,
              color: accentColor,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          {source ? (
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "'Inter', sans-serif",
                fontSize: sourceFontSize,
                color: "rgba(0,0,0,0.45)",
                fontWeight: 400,
              }}
            >
              {source}
            </p>
          ) : null}
        </div>

        <div
          style={{
            marginTop: isVertical ? 36 : 48,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${iconSize}px)`,
            gap,
            justifyContent: "center",
          }}
        >
          {icons.map((item, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const staggerFrame = row * 3 + col * 0.4;
            const iconOpacity = interpolate(
              frame,
              [fps * 0.3 + staggerFrame, fps * 0.3 + staggerFrame + 8],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const iconScale = interpolate(
              frame,
              [fps * 0.3 + staggerFrame, fps * 0.3 + staggerFrame + 10],
              [0.6, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.4, 0.64, 1),
              }
            );

            return (
              <div
                key={`icon-${idx}`}
                style={{
                  width: iconSize,
                  height: iconSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: iconOpacity,
                  transform: `scale(${iconScale})`,
                }}
              >
                <PictogramIcon type={icon} color={item.color} size={iconSize} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: isVertical ? 28 : 32,
            width: "100%",
            maxWidth: isVertical ? 960 : 1400,
            display: "flex",
            flexWrap: "wrap",
            gap: isVertical ? 12 : 20,
            alignItems: "center",
          }}
        >
          {normalized.map((seg) => (
            <div
              key={seg.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: labelFontSize,
                fontWeight: 600,
                color: "rgba(0,0,0,0.65)",
              }}
            >
              <PictogramIcon
                type={icon}
                color={seg.color}
                size={labelFontSize + 4}
              />
              <span>
                {seg.label} {seg.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {scaleLabel ? (
          <div
            style={{
              position: "absolute",
              bottom: isVertical ? 140 : 48,
              right: isVertical ? 36 : 96,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Inter', sans-serif",
              fontSize: sourceFontSize,
              color: "rgba(0,0,0,0.5)",
            }}
          >
            <PictogramIcon
              type={icon}
              color="#90A4AE"
              size={sourceFontSize + 6}
            />
            <span>{scaleLabel}</span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
