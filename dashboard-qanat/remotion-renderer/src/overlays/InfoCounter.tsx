import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

export interface InfoCounterProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  formatNumber?: boolean;
  accentColor?: string;
  position?: "center" | "bottom-right" | "bottom-left" | "top-right";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
}

const formatWithSeparator = (n: number): string => {
  return n.toLocaleString("pt-BR");
};

// ─────────────────────────────────────────────────────────────────────────────
// Corner Ornaments Components for Themes
// ─────────────────────────────────────────────────────────────────────────────

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

export const InfoCounter: React.FC<InfoCounterProps> = ({
  value,
  label,
  suffix = "",
  prefix = "",
  formatNumber = true,
  accentColor = "#D4AF37",
  position = "center",
  theme = "classic",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Spring animation for scale entrance
  const scaleSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
    durationInFrames: 20,
  });

  // Count up animation
  const countProgress = interpolate(frame, [6, Math.min(durationInFrames * 0.65, 45)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const easedProgress = 1 - Math.pow(1 - countProgress, 3);
  const currentValue = Math.round(easedProgress * value);

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // Glow pulse when counter finishes
  const glowOpacity =
    countProgress >= 1
      ? interpolate(
          frame,
          [Math.min(durationInFrames * 0.65, 45), Math.min(durationInFrames * 0.65, 45) + 15],
          [0.6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 0;

  // Position mapping
  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    "bottom-right": {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: isVertical ? "0 60px 640px" : "0 100px 220px",
    },
    "bottom-left": {
      justifyContent: "flex-end",
      alignItems: "flex-start",
      padding: isVertical ? "0 60px 640px" : "0 100px 220px",
    },
    "top-right": {
      justifyContent: "flex-start",
      alignItems: "flex-end",
      padding: isVertical ? "200px 60px 0" : "100px 100px 0",
    },
  };

  const displayValue = formatNumber
    ? formatWithSeparator(currentValue)
    : currentValue.toString();

  // Theme custom styling mapper
  const getThemeStyle = (): React.CSSProperties => {
    switch (theme) {
      case "ancient":
        return {
          background: "linear-gradient(135deg, rgba(20, 16, 12, 0.97) 0%, rgba(32, 24, 18, 0.95) 100%)",
          border: `3px double ${accentColor}`,
          borderRadius: "4px",
          padding: isVertical ? "32px 52px" : "24px 40px",
          boxShadow: `0 8px 24px rgba(0,0,0,0.6), inset 0 0 10px ${accentColor}15`,
        };
      case "tech":
        return {
          background: "rgba(4, 8, 12, 0.93)",
          backgroundImage: `radial-gradient(${accentColor}15 1px, transparent 0)`,
          backgroundSize: "8px 8px",
          border: `1px solid ${accentColor}33`,
          borderRadius: "0px",
          padding: isVertical ? "24px 40px" : "18px 30px",
          boxShadow: `0 0 20px ${accentColor}15`,
        };
      case "nature":
        return {
          background: "linear-gradient(135deg, rgba(6, 12, 8, 0.97) 0%, rgba(12, 24, 16, 0.95) 100%)",
          border: `1px solid ${accentColor}30`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "24px 6px 24px 6px",
          padding: isVertical ? "30px 48px" : "22px 36px",
          boxShadow: `0 8px 32px ${accentColor}15`,
        };
      case "industrial":
        return {
          background: "linear-gradient(135deg, rgba(14, 14, 16, 0.99) 0%, rgba(24, 24, 28, 0.97) 100%)",
          border: `2px solid #333336`,
          borderLeft: `6px solid ${accentColor}`,
          borderRadius: "2px",
          padding: isVertical ? "30px 48px" : "22px 36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
        };
      case "mysterious":
        return {
          background: "linear-gradient(135deg, rgba(10, 6, 14, 0.96) 0%, rgba(20, 12, 28, 0.94) 100%)",
          border: `1px solid ${accentColor}40`,
          borderRadius: "12px",
          padding: isVertical ? "32px 52px" : "24px 40px",
          boxShadow: `0 8px 32px ${accentColor}25, inset 0 0 15px rgba(255,255,255,0.03)`,
        };
      case "classic":
      default:
        return {
          background: "linear-gradient(145deg, rgba(8,8,12,0.88) 0%, rgba(18,18,26,0.85) 100%)",
          borderRadius: isVertical ? 24 : 18,
          padding: isVertical ? "32px 52px" : "24px 40px",
          border: `1px solid ${accentColor}2e`,
        };
    }
  };

  // Theme custom typography mapper
  const getThemeFont = (type: "label" | "value") => {
    if (type === "label") {
      switch (theme) {
        case "ancient":
        case "mysterious":
          return { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 700, letterSpacing: "0.06em" };
        case "tech":
          return { fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, letterSpacing: "0.1em" };
        case "industrial":
          return { fontFamily: "'Oswald', sans-serif", fontWeight: 800, letterSpacing: "0.05em" };
        case "nature":
        default:
          return { fontFamily: "'Montserrat', sans-serif", fontWeight: 500, letterSpacing: "0.08em" };
      }
    } else {
      switch (theme) {
        case "tech":
          return { fontFamily: "'Courier New', Courier, monospace", fontWeight: 700 };
        case "industrial":
          return { fontFamily: "'Oswald', sans-serif", fontWeight: 800 };
        default:
          return { fontFamily: "'Montserrat', sans-serif", fontWeight: 800 };
      }
    }
  };

  return (
    <AbsoluteFill
      style={{
        ...positionStyles[position],
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isVertical ? 12 : 8,
          transform: `scale(${scaleSpring})`,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
        }}
      >
        {/* Background container */}
        <div
          style={{
            backdropFilter: "blur(16px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isVertical ? 10 : 6,
            position: "relative",
            overflow: "hidden",
            ...getThemeStyle(),
          }}
        >
          {/* Render Corner Decorator components based on theme */}
          {theme === "tech" && <TechCorners color={accentColor} />}
          {theme === "ancient" && <AncientCorners color={accentColor} />}
          {theme === "industrial" && <IndustrialRivets />}
          {theme === "mysterious" && <MysteriousStars color={accentColor} />}

          {/* Glow effect on completion */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              background: `radial-gradient(circle at center, ${accentColor}40, transparent 70%)`,
              opacity: glowOpacity,
              pointerEvents: "none",
            }}
          />

          {/* Label */}
          <span
            style={{
              color: "rgba(248,250,252,0.65)",
              fontSize: isVertical ? 24 : 18,
              textTransform: "uppercase",
              lineHeight: 1,
              ...getThemeFont("label")
            }}
          >
            {label}
          </span>

          {/* Counter Value */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: isVertical ? 10 : 8,
            }}
          >
            {prefix && (
              <span
                style={{
                  color: accentColor,
                  fontSize: isVertical ? 48 : 36,
                  ...getThemeFont("value"),
                  fontWeight: 300,
                }}
              >
                {prefix}
              </span>
            )}
            <span
              style={{
                color: "#F8FAFC",
                fontSize: isVertical ? 72 : 54,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                ...getThemeFont("value")
              }}
            >
              {displayValue}
            </span>
            {suffix && (
              <span
                style={{
                  color: accentColor,
                  fontSize: isVertical ? 32 : 24,
                  letterSpacing: "0.02em",
                  ...getThemeFont("value"),
                  fontWeight: 600,
                }}
              >
                {suffix}
              </span>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            style={{
              width: interpolate(
                frame,
                [8, ANIM_LINE_END(durationInFrames)],
                [0, isVertical ? 180 : 140],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              height: 2,
              background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
              marginTop: 4,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ANIM_LINE_END = (dur: number) => Math.min(dur * 0.5, 30);
