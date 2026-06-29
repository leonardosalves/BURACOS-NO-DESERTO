import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// InfoTimeline — Animated historical timeline
// Shows chronological events as dots connected by a line that
// draws itself progressively. Great for history-themed videos.
// Example: "3000 a.C." → "500 a.C." → "Presente"
// ─────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  /** Year or period label */
  year: string;
  /** Short description */
  description: string;
  /** Whether this event should be highlighted */
  highlight?: boolean;
}

export interface InfoTimelineProps {
  /** Title for the timeline */
  title: string;
  /** Events to show (2-6 items) */
  events: TimelineEvent[];
  /** Accent color */
  accentColor?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Visual Theme */
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  /** Dynamic CSS overrides */
  customStyle?: {
    background?: string;
    border?: string;
    borderRadius?: string;
    boxShadow?: string;
    padding?: string;
    fontFamilyTitle?: string;
    fontSizeTitle?: number;
    colorTitle?: string;
    fontFamilyYear?: string;
    fontSizeYear?: number;
    colorYear?: string;
    fontFamilyDesc?: string;
    fontSizeDesc?: number;
    colorDesc?: string;
  };
}

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

export const InfoTimeline: React.FC<InfoTimelineProps> = ({
  title,
  events = [],
  accentColor = "#D4AF37",
  orientation = "horizontal",
  theme = "classic",
  customStyle,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  if (safeEvents.length === 0) return null;

  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Overall entrance
  const scaleSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
    durationInFrames: 20,
  });

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

  // Line drawing progress
  const lineProgress = interpolate(
    frame,
    [8, Math.min(durationInFrames * 0.6, 50)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isHorizontal = orientation === "horizontal";

  // Theme custom styling mapper for title card
  const getThemeStyle = (): React.CSSProperties => {
    let base: React.CSSProperties = {};
    switch (theme) {
      case "ancient":
        base = {
          background: "linear-gradient(135deg, rgba(20, 16, 12, 0.97) 0%, rgba(32, 24, 18, 0.95) 100%)",
          border: `3px double ${accentColor}`,
          borderRadius: "4px",
          padding: isVertical ? "16px 32px" : "12px 24px",
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
          padding: isVertical ? "16px 32px" : "12px 24px",
          boxShadow: `0 0 20px ${accentColor}15`,
        };
        break;
      case "nature":
        base = {
          background: "linear-gradient(135deg, rgba(6, 12, 8, 0.97) 0%, rgba(12, 24, 16, 0.95) 100%)",
          border: `1px solid ${accentColor}30`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "24px 6px 24px 6px",
          padding: isVertical ? "16px 32px" : "12px 24px",
          boxShadow: `0 8px 32px ${accentColor}15`,
        };
        break;
      case "industrial":
        base = {
          background: "linear-gradient(135deg, rgba(14, 14, 16, 0.99) 0%, rgba(24, 24, 28, 0.97) 100%)",
          border: `2px solid #333336`,
          borderLeft: `6px solid ${accentColor}`,
          borderRadius: "2px",
          padding: isVertical ? "16px 32px" : "12px 24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
        };
        break;
      case "mysterious":
        base = {
          background: "linear-gradient(135deg, rgba(10, 6, 14, 0.96) 0%, rgba(20, 12, 28, 0.94) 100%)",
          border: `1px solid ${accentColor}40`,
          borderRadius: "12px",
          padding: isVertical ? "16px 32px" : "12px 24px",
          boxShadow: `0 8px 32px ${accentColor}25, inset 0 0 15px rgba(255,255,255,0.03)`,
        };
        break;
      case "classic":
      default:
        base = {
          background: "linear-gradient(145deg, rgba(8,8,12,0.90) 0%, rgba(18,18,26,0.87) 100%)",
          backdropFilter: "blur(14px)",
          borderRadius: isVertical ? 16 : 12,
          padding: isVertical ? "16px 32px" : "12px 24px",
          border: `1px solid ${accentColor}26`,
        };
        break;
    }
    if (customStyle) {
      // Pick title-specific layout overrides if passed
      const styleOverrides: React.CSSProperties = {};
      if (customStyle.background) styleOverrides.background = customStyle.background;
      if (customStyle.border) styleOverrides.border = customStyle.border;
      if (customStyle.borderRadius) styleOverrides.borderRadius = customStyle.borderRadius;
      if (customStyle.boxShadow) styleOverrides.boxShadow = customStyle.boxShadow;
      if (customStyle.padding) styleOverrides.padding = customStyle.padding;
      base = { ...base, ...styleOverrides };
    }
    return base;
  };

  // Theme custom typography mapper
  const getThemeFont = (type: "title" | "year" | "desc") => {
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
    } else if (type === "year") {
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
      if (customStyle?.fontFamilyYear) fontStyle.fontFamily = customStyle.fontFamilyYear;
      if (customStyle?.fontSizeYear) fontStyle.fontSize = isVertical ? customStyle.fontSizeYear * 1.4 : customStyle.fontSizeYear;
      if (customStyle?.colorYear) fontStyle.color = customStyle.colorYear;
    } else {
      switch (theme) {
        case "ancient":
        case "mysterious":
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 400 };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Courier New', Courier, monospace", fontWeight: 400 };
          break;
        case "industrial":
          fontStyle = { fontFamily: "'Oswald', sans-serif", fontWeight: 400 };
          break;
        case "nature":
          fontStyle = { fontFamily: "'Outfit', sans-serif", fontWeight: 400 };
          break;
        case "classic":
        default:
          fontStyle = { fontFamily: "'Inter', 'Montserrat', Arial, sans-serif", fontWeight: 400 };
          break;
      }
      if (customStyle?.fontFamilyDesc) fontStyle.fontFamily = customStyle.fontFamilyDesc;
      if (customStyle?.fontSizeDesc) fontStyle.fontSize = isVertical ? customStyle.fontSizeDesc * 1.4 : customStyle.fontSizeDesc;
      if (customStyle?.colorDesc) fontStyle.color = customStyle.colorDesc;
    }
    return fontStyle;
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scaleSpring})`,
          filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.7))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isVertical ? 28 : 20,
        }}
      >
        {/* Title */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
            ...getThemeStyle(),
          }}
        >
          {/* Theme Corner Decorators */}
          {theme === "tech" && <TechCorners color={accentColor} />}
          {theme === "ancient" && <AncientCorners color={accentColor} />}
          {theme === "industrial" && <IndustrialRivets />}
          {theme === "mysterious" && <MysteriousStars color={accentColor} />}

          <div
            style={{
              width: 4,
              height: isVertical ? 24 : 18,
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

        {/* Timeline Container */}
        <div
          style={{
            display: "flex",
            flexDirection: isHorizontal ? "row" : "column",
            alignItems: "center",
            gap: 0,
            position: "relative",
            padding: isVertical ? "16px 20px" : "12px 16px",
          }}
        >
          {safeEvents.map((event, index) => {
            const progress = safeEvents.length > 1 ? (index / (safeEvents.length - 1)) * 100 : 0;
            const isRevealed = lineProgress >= progress;
            const dotDelay = 8 + index * 8;

            // Dot scale animation
            const dotScale = spring({
              fps,
              frame: Math.max(0, frame - dotDelay),
              config: { damping: 12, stiffness: 200, mass: 0.5 },
              durationInFrames: 12,
            });

            // Text fade in
            const textOpacity = interpolate(
              frame,
              [dotDelay + 4, dotDelay + 14],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const isHighlight = event.highlight || index === safeEvents.length - 1;

            return (
              <React.Fragment key={index}>
                {/* Connector line (not before first) */}
                {index > 0 && (
                  <div
                    style={{
                      [isHorizontal ? "width" : "height"]: isVertical ? 80 : 60,
                      [isHorizontal ? "height" : "width"]: 2,
                      background: `linear-gradient(${isHorizontal ? "to right" : "to bottom"}, ${accentColor}60, ${accentColor}30)`,
                      opacity: isRevealed ? 1 : 0.15,
                      transition: "opacity 0.2s",
                    }}
                  />
                )}

                {/* Event dot + labels */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: isVertical ? 8 : 6,
                    minWidth: isVertical ? 120 : 90,
                    opacity: textOpacity,
                  }}
                >
                  {/* Year label */}
                  <span
                    style={{
                      color: isHighlight ? accentColor : "rgba(248,250,252,0.65)",
                      textAlign: "center",
                      ...getThemeFont("year"),
                    }}
                  >
                    {event.year}
                  </span>

                  {/* Dot */}
                  <div
                    style={{
                      width: isHighlight ? (isVertical ? 18 : 14) : (isVertical ? 12 : 10),
                      height: isHighlight ? (isVertical ? 18 : 14) : (isVertical ? 12 : 10),
                      borderRadius: "50%",
                      backgroundColor: isHighlight ? accentColor : "rgba(248,250,252,0.4)",
                      transform: `scale(${dotScale})`,
                      boxShadow: isHighlight
                        ? `0 0 16px ${accentColor}60, 0 0 4px ${accentColor}`
                        : "none",
                      border: isHighlight
                        ? `2px solid ${accentColor}`
                        : "1px solid rgba(248,250,252,0.2)",
                    }}
                  />

                  {/* Description */}
                  <span
                    style={{
                      color: "rgba(248,250,252,0.72)",
                      textAlign: "center",
                      maxWidth: isVertical ? 140 : 100,
                      lineHeight: 1.3,
                      ...getThemeFont("desc"),
                    }}
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
