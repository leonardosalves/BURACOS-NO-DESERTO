import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { mergeCustomStyle } from "./overlayStyleUtils";

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
  /** Visual Theme */
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  /** Actual overlay sequence duration in frames */
  durationInFrames?: number;
  /** Dynamic CSS override styles from Gemini AI */
  customStyle?: {
    background?: string;
    border?: string;
    borderLeft?: string;
    borderRadius?: string;
    boxShadow?: string;
    padding?: string;
    fontFamilyTitle?: string;
    fontSizeTitle?: number;
    colorTitle?: string;
    fontFamilyLabel?: string;
    fontSizeLabel?: number;
    colorLabel?: string;
    fontFamilyValue?: string;
    fontSizeValue?: number;
    colorValue?: string;
  };
}

const DEFAULT_COLORS = ["#D4AF37", "#4ECDC4", "#FF6B6B", "#A78BFA"];

// Ornaments
const TechCorners: React.FC<{ color: string }> = ({ color }) => (
  <>
    <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
    <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, width: 8, height: 8, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
    <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
  </>
);

const AncientCorners: React.FC<{ color: string }> = ({ color }) => (
  <>
    <div style={{ position: "absolute", top: 3, left: 3, width: 4, height: 4, borderRadius: "50%", backgroundColor: color }} />
    <div style={{ position: "absolute", top: 3, right: 3, width: 4, height: 4, borderRadius: "50%", backgroundColor: color }} />
    <div style={{ position: "absolute", bottom: 3, left: 3, width: 4, height: 4, borderRadius: "50%", backgroundColor: color }} />
    <div style={{ position: "absolute", bottom: 3, right: 3, width: 4, height: 4, borderRadius: "50%", backgroundColor: color }} />
  </>
);

const IndustrialRivets: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 4, left: 4, width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle, #888, #444)", border: "1px solid #222", opacity: 0.8 }} />
    <div style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle, #888, #444)", border: "1px solid #222", opacity: 0.8 }} />
    <div style={{ position: "absolute", bottom: 4, left: 4, width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle, #888, #444)", border: "1px solid #222", opacity: 0.8 }} />
    <div style={{ position: "absolute", bottom: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle, #888, #444)", border: "1px solid #222", opacity: 0.8 }} />
  </>
);

const MysteriousStars: React.FC<{ color: string }> = ({ color }) => (
  <>
    <div style={{ position: "absolute", top: 1, left: 2, color, fontSize: 10, opacity: 0.8 }}>✦</div>
    <div style={{ position: "absolute", top: 1, right: 2, color, fontSize: 10, opacity: 0.8 }}>✦</div>
    <div style={{ position: "absolute", bottom: 5, left: 2, color, fontSize: 10, opacity: 0.8 }}>✦</div>
    <div style={{ position: "absolute", bottom: 5, right: 2, color, fontSize: 10, opacity: 0.8 }}>✦</div>
  </>
);

export const InfoBar: React.FC<InfoBarProps> = ({
  title,
  items = [],
  accentColor = "#D4AF37",
  position = "center",
  theme = "classic",
  durationInFrames: propDurationInFrames,
  customStyle,
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return null;

  const frame = useCurrentFrame();
  const { fps, durationInFrames: videoDurationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  const effectiveDurationInFrames = propDurationInFrames ?? videoDurationInFrames;
  const maxValue = Math.max(...safeItems.map((i) => i.value), 1);

  // Overall fade
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [effectiveDurationInFrames - 14, effectiveDurationInFrames],
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

  // Theme custom styling mapper
  const getThemeStyle = (): React.CSSProperties => {
    let base: React.CSSProperties = {};
    switch (theme) {
      case "ancient":
        base = {
          background: "linear-gradient(135deg, rgba(20, 16, 12, 0.97) 0%, rgba(32, 24, 18, 0.95) 100%)",
          border: `3px double ${accentColor}`,
          borderRadius: "4px",
          padding: isVertical ? "28px 36px" : "20px 28px",
          boxShadow: `0 8px 24px rgba(0,0,0,0.6), inset 0 0 10px ${accentColor}15`,
        };
        break;
      case "tech":
        base = {
          background: "rgba(4, 8, 12, 0.93)",
          backgroundImage: `radial-gradient(${accentColor}15 1px, transparent 0)`,
          backgroundSize: "8px 8px",
          border: `1px solid ${accentColor}33`,
          borderRadius: "0px",
          padding: isVertical ? "28px 36px" : "20px 28px",
          boxShadow: `0 0 20px ${accentColor}15`,
        };
        break;
      case "nature":
        base = {
          background: "linear-gradient(135deg, rgba(6, 12, 8, 0.97) 0%, rgba(12, 24, 16, 0.95) 100%)",
          border: `1px solid ${accentColor}30`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "24px 6px 24px 6px",
          padding: isVertical ? "28px 36px" : "20px 28px",
          boxShadow: `0 8px 32px ${accentColor}15`,
        };
        break;
      case "industrial":
        base = {
          background: "linear-gradient(135deg, rgba(14, 14, 16, 0.99) 0%, rgba(24, 24, 28, 0.97) 100%)",
          border: `2px solid #333336`,
          borderLeft: `6px solid ${accentColor}`,
          borderRadius: "2px",
          padding: isVertical ? "28px 36px" : "20px 28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
        };
        break;
      case "mysterious":
        base = {
          background: "linear-gradient(135deg, rgba(10, 6, 14, 0.96) 0%, rgba(20, 12, 28, 0.94) 100%)",
          border: `1px solid ${accentColor}40`,
          borderRadius: "12px",
          padding: isVertical ? "28px 36px" : "20px 28px",
          boxShadow: `0 8px 32px ${accentColor}25, inset 0 0 15px rgba(255,255,255,0.03)`,
        };
        break;
      case "classic":
      default:
        base = {
          background: "linear-gradient(145deg, rgba(8,8,12,0.90) 0%, rgba(18,18,26,0.87) 100%)",
          borderRadius: isVertical ? 20 : 16,
          padding: isVertical ? "28px 36px" : "20px 28px",
          border: `1px solid ${accentColor}26`,
        };
        break;
    }
    base = mergeCustomStyle(base, customStyle);
    return base;
  };

  // Theme custom typography mapper
  const getThemeFont = (type: "title" | "label" | "value") => {
    let fontStyle: React.CSSProperties = {};
    if (type === "title") {
      switch (theme) {
        case "ancient":
        case "mysterious":
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 700, letterSpacing: "0.06em" };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, letterSpacing: "0.1em" };
          break;
        case "industrial":
          fontStyle = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: "0.05em" };
          break;
        case "nature":
          fontStyle = { fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: "0.02em" };
          break;
        case "classic":
        default:
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif", fontWeight: 700, letterSpacing: "0.04em" };
          break;
      }
      if (customStyle?.fontFamilyTitle) fontStyle.fontFamily = customStyle.fontFamilyTitle;
      if (customStyle?.fontSizeTitle) fontStyle.fontSize = isVertical ? customStyle.fontSizeTitle * 1.4 : customStyle.fontSizeTitle;
      if (customStyle?.colorTitle) fontStyle.color = customStyle.colorTitle;
    } else if (type === "label") {
      switch (theme) {
        case "ancient":
        case "mysterious":
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 500 };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Courier New', Courier, monospace", fontWeight: 500 };
          break;
        case "industrial":
          fontStyle = { fontFamily: "'Oswald', sans-serif", fontWeight: 500 };
          break;
        case "nature":
          fontStyle = { fontFamily: "'Outfit', sans-serif", fontWeight: 500 };
          break;
        case "classic":
        default:
          fontStyle = { fontFamily: "'Inter', 'Montserrat', Arial, sans-serif", fontWeight: 500 };
          break;
      }
      if (customStyle?.fontFamilyLabel) fontStyle.fontFamily = customStyle.fontFamilyLabel;
      if (customStyle?.fontSizeLabel) fontStyle.fontSize = isVertical ? customStyle.fontSizeLabel * 1.4 : customStyle.fontSizeLabel;
      if (customStyle?.colorLabel) fontStyle.color = customStyle.colorLabel;
    } else {
      switch (theme) {
        case "ancient":
        case "mysterious":
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 700 };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Courier New', Courier, monospace", fontWeight: 700 };
          break;
        case "industrial":
          fontStyle = { fontFamily: "'Oswald', sans-serif", fontWeight: 700 };
          break;
        case "nature":
          fontStyle = { fontFamily: "'Outfit', sans-serif", fontWeight: 700 };
          break;
        case "classic":
        default:
          fontStyle = { fontFamily: "'Inter', 'Montserrat', Arial, sans-serif", fontWeight: 700 };
          break;
      }
      if (customStyle?.fontFamilyValue) fontStyle.fontFamily = customStyle.fontFamilyValue;
      if (customStyle?.fontSizeValue) fontStyle.fontSize = isVertical ? customStyle.fontSizeValue * 1.4 : customStyle.fontSizeValue;
      if (customStyle?.colorValue) fontStyle.color = customStyle.colorValue;
    }
    return fontStyle;
  };

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
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: isVertical ? 22 : 16,
            backdropFilter: "blur(14px)",
            ...getThemeStyle(),
          }}
        >
          {/* Theme Corner Decorators */}
          {theme === "tech" && <TechCorners color={accentColor} />}
          {theme === "ancient" && <AncientCorners color={accentColor} />}
          {theme === "industrial" && <IndustrialRivets />}
          {theme === "mysterious" && <MysteriousStars color={accentColor} />}

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
                textTransform: "uppercase",
                ...getThemeFont("title"),
              }}
            >
              {title}
            </span>
          </div>

          {/* Bars */}
          {safeItems.map((item, index) => {
            const staggerDelay = index * 4;
            const barProgress = interpolate(
              frame,
              [6 + staggerDelay, 20 + staggerDelay],
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
                      ...getThemeFont("label"),
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: barColor,
                      fontVariantNumeric: "tabular-nums",
                      ...getThemeFont("value"),
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
