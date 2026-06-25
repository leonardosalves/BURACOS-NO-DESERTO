import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// InfoBar — Animated comparison bar chart
// Shows 2-4 items as horizontal bars that grow from left to right.
// Perfect for comparisons: "Pirâmide de Gizé vs Burj Khalifa"
// ─────────────────────────────────────────────────────────────────────

export interface InfoBarItem {
  label: string;
  value: number;
  /** Optional display value (e.g. "146m") */
  displayValue?: string;
  color?: string;
}

export interface InfoBarProps {
  /** Title above the chart */
  title: string;
  /** Bar data items (2-4) */
  items: InfoBarItem[];
  /** Accent color for main highlights */
  accentColor?: string;
  /** Position on screen */
  position?: "center" | "bottom-center" | "right";
}

const DEFAULT_COLORS = ["#D4AF37", "#4ECDC4", "#FF6B6B", "#A78BFA"];

export const InfoBar: React.FC<InfoBarProps> = ({
  title,
  items,
  accentColor = "#D4AF37",
  position = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const maxValue = Math.max(...items.map((i) => i.value));

  // Overall fade
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Scale entrance
  const scaleSpring = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 100, mass: 0.7 },
    durationInFrames: 18,
  });

  // Position styles
  const positionStyle: React.CSSProperties =
    position === "bottom-center"
      ? {
          justifyContent: "flex-end",
          alignItems: "center",
          padding: isVertical ? "0 48px 640px" : "0 80px 220px",
        }
      : position === "right"
      ? {
          justifyContent: "center",
          alignItems: "flex-end",
          padding: isVertical ? "0 48px" : "0 80px",
        }
      : {
          justifyContent: "center",
          alignItems: "center",
        };

  const barMaxWidth = isVertical ? 720 : 520;

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isVertical ? 20 : 14,
          transform: `scale(${scaleSpring})`,
          filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.7))",
          width: isVertical ? 820 : 600,
        }}
      >
        {/* Background panel */}
        <div
          style={{
            background:
              "linear-gradient(145deg, rgba(8,8,12,0.90) 0%, rgba(18,18,26,0.87) 100%)",
            backdropFilter: "blur(14px)",
            borderRadius: isVertical ? 20 : 16,
            padding: isVertical ? "28px 36px" : "20px 28px",
            border: `1px solid ${accentColor}26`,
            display: "flex",
            flexDirection: "column",
            gap: isVertical ? 22 : 16,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 4,
                height: isVertical ? 28 : 22,
                backgroundColor: accentColor,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: "#F8FAFC",
                fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
                fontSize: isVertical ? 28 : 22,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {title}
            </span>
          </div>

          {/* Bars */}
          {items.map((item, index) => {
            const staggerDelay = index * 6;
            const barProgress = interpolate(
              frame,
              [10 + staggerDelay, 32 + staggerDelay],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            // Ease-out
            const easedProgress = 1 - Math.pow(1 - barProgress, 3);
            const barWidth = (item.value / maxValue) * barMaxWidth * easedProgress;
            const barColor = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

            // Value counter
            const currentVal = Math.round(easedProgress * item.value);
            const displayVal = item.displayValue
              ? barProgress >= 1
                ? item.displayValue
                : currentVal.toLocaleString("pt-BR")
              : currentVal.toLocaleString("pt-BR");

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isVertical ? 6 : 4,
                }}
              >
                {/* Label row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(248,250,252,0.8)",
                      fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                      fontSize: isVertical ? 22 : 16,
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: barColor,
                      fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                      fontSize: isVertical ? 22 : 16,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {displayVal}
                  </span>
                </div>

                {/* Bar track */}
                <div
                  style={{
                    width: "100%",
                    height: isVertical ? 14 : 10,
                    backgroundColor: "rgba(248,250,252,0.06)",
                    borderRadius: isVertical ? 7 : 5,
                    overflow: "hidden",
                  }}
                >
                  {/* Bar fill */}
                  <div
                    style={{
                      width: barWidth,
                      height: "100%",
                      background: `linear-gradient(90deg, ${barColor}CC, ${barColor})`,
                      borderRadius: isVertical ? 7 : 5,
                      boxShadow: `0 0 12px ${barColor}40`,
                      transition: "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
