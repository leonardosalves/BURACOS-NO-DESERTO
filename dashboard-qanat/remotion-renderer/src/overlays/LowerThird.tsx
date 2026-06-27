import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { SafeLottie } from "./SafeLottie";

import sparklesLottie from "./lottie_assets/sparkles.json";
import flameLottie from "./lottie_assets/flame.json";
import globeLottie from "./lottie_assets/globe.json";
import infoLottie from "./lottie_assets/info.json";
import gearLottie from "./lottie_assets/lottie_ui_gear_1.json";
import lockLottie from "./lottie_assets/lottie_ui_lock_3.json";
import crownLottie from "./lottie_assets/lottie_biz_crown_1.json";
import apiLottie from "./lottie_assets/lottie_tech_api_1.json";
import timeLottie from "./lottie_assets/lottie_ui_time_1.json";
import windLottie from "./lottie_assets/weather_wind.json";
import moneyLottie from "./lottie_assets/lottie_biz_money_1.json";
import warningLottie from "./lottie_assets/lottie_ui_warning_1.json";
import locationLottie from "./lottie_assets/lottie_life_location_1.json";
import docLottie from "./lottie_assets/lottie_tech_document_1.json";
import heartLottie from "./lottie_assets/lottie_interact_heart_1.json";
import ideaLottie from "./lottie_assets/lottie_life_idea_1.json";

const lottieMap: Record<string, any> = {
  sparkles: sparklesLottie,
  flame: flameLottie,
  earth: globeLottie,
  building: globeLottie,
  info: infoLottie,
  gear: gearLottie,
  shield: lockLottie,
  crown: crownLottie,
  science: apiLottie,
  history: timeLottie,
  nature: windLottie,
  money: moneyLottie,
  warning: warningLottie,
  compass: locationLottie,
  book: docLottie,
  heart: heartLottie,
  lightbulb: ideaLottie,
};

export interface LowerThirdProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  position?: "bottom-left" | "bottom-center" | "top-left";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  iconType?: string;
  customStyle?: {
    background?: string;
    border?: string;
    borderLeft?: string;
    borderRadius?: string;
    boxShadow?: string;
    padding?: string;
    fontFamilyTitle?: string;
    fontFamilySubtitle?: string;
    fontSizeTitle?: number;
    fontSizeSubtitle?: number;
    colorTitle?: string;
    colorSubtitle?: string;
  };
}

const ANIM_IN_FRAMES = 18; // 0.6s at 30fps
const ANIM_OUT_FRAMES = 14; // ~0.47s
const ACCENT_BAR_WIDTH = 5;

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

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  accentColor = "#D4AF37",
  position = "bottom-left",
  theme = "classic",
  iconType,
  customStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Slide-in from left
  const slideIn = interpolate(frame, [0, ANIM_IN_FRAMES], [-100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade in
  const fadeIn = interpolate(frame, [0, ANIM_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slide-out before sequence ends
  const outStart = durationInFrames - ANIM_OUT_FRAMES;
  const slideOut = interpolate(
    frame,
    [outStart, durationInFrames],
    [0, -120],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = slideIn + slideOut;
  const opacity = Math.min(fadeIn, fadeOut);

  // Accent bar reveal
  const barScale = interpolate(frame, [0, ANIM_IN_FRAMES * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background panel width expansion
  const panelExpand = interpolate(
    frame,
    [ANIM_IN_FRAMES * 0.3, ANIM_IN_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Position styles
  const positionStyle: React.CSSProperties =
    position === "top-left"
      ? {
          top: isVertical ? 180 : 80,
          left: isVertical ? 48 : 64,
          bottom: "auto",
        }
      : position === "bottom-center"
      ? {
          bottom: isVertical ? 640 : 210,
          left: "50%",
          transform: `translateX(-50%) translateX(${translateX}px)`,
        }
      : {
          bottom: isVertical ? 640 : 210,
          left: isVertical ? 48 : 64,
        };

  const transformStyle =
    position === "bottom-center"
      ? positionStyle.transform
      : `translateX(${translateX}px)`;

  // Theme custom styling mapper
  const getThemeStyle = (): React.CSSProperties => {
    let base: React.CSSProperties = {};
    switch (theme) {
      case "ancient":
        base = {
          background: "linear-gradient(135deg, rgba(20, 16, 12, 0.97) 0%, rgba(32, 24, 18, 0.95) 100%)",
          border: `3px double ${accentColor}`,
          borderLeft: `5px double ${accentColor}`,
          borderRadius: "4px",
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
          boxShadow: `0 0 20px ${accentColor}15`,
        };
        break;
      case "nature":
        base = {
          background: "linear-gradient(135deg, rgba(6, 12, 8, 0.97) 0%, rgba(12, 24, 16, 0.95) 100%)",
          border: `1px solid ${accentColor}30`,
          borderLeft: `4.5px solid ${accentColor}`,
          borderRadius: "24px 6px 24px 6px",
          boxShadow: `0 8px 32px ${accentColor}15`,
        };
        break;
      case "industrial":
        base = {
          background: "linear-gradient(135deg, rgba(14, 14, 16, 0.99) 0%, rgba(24, 24, 28, 0.97) 100%)",
          border: `2px solid #333336`,
          borderLeft: `7px solid ${accentColor}`,
          borderRadius: "2px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
        };
        break;
      case "mysterious":
        base = {
          background: "linear-gradient(135deg, rgba(10, 6, 14, 0.96) 0%, rgba(20, 12, 28, 0.94) 100%)",
          border: `1px solid ${accentColor}40`,
          borderRadius: "12px",
          boxShadow: `0 8px 32px ${accentColor}25, inset 0 0 15px rgba(255,255,255,0.03)`,
        };
        break;
      case "classic":
      default:
        base = {
          background: "linear-gradient(135deg, rgba(10,10,14,0.92) 0%, rgba(20,20,28,0.88) 100%)",
          borderRadius: "0 8px 8px 0",
          borderTop: `1px solid ${accentColor}26`,
          borderRight: `1px solid ${accentColor}14`,
          borderBottom: `1px solid ${accentColor}26`,
        };
        break;
    }
    if (customStyle) {
      base = { ...base, ...customStyle };
    }
    if (customStyle?.borderRadius) {
      // If a custom border radius is applied, remove the asymmetric borderLeft to prevent browser rendering artifacts
      delete base.borderLeft;
      if (theme === "classic") {
        // For classic theme, add a uniform border all around to match the top/right/bottom border
        if (!customStyle.border) {
          base.border = `1px solid ${accentColor}26`;
        }
        delete base.borderTop;
        delete base.borderRight;
        delete base.borderBottom;
      }
    }
    return base;
  };

  // Theme custom typography mapper
  const getThemeFont = (type: "title" | "subtitle") => {
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
          fontStyle = { fontFamily: "'Oswald', sans-serif", fontWeight: 800, letterSpacing: "0.05em" };
          break;
        case "nature":
        default:
          fontStyle = { fontFamily: "'Cinzel', 'Playfair Display', serif", fontWeight: 700, letterSpacing: "0.06em" };
          break;
      }
      if (customStyle?.fontFamilyTitle) fontStyle.fontFamily = customStyle.fontFamilyTitle;
      if (customStyle?.fontSizeTitle) fontStyle.fontSize = isVertical ? customStyle.fontSizeTitle * 1.4 : customStyle.fontSizeTitle;
      if (customStyle?.colorTitle) fontStyle.color = customStyle.colorTitle;
    } else {
      switch (theme) {
        case "tech":
          fontStyle = { fontFamily: "'Courier New', Courier, monospace", fontSize: isVertical ? 24 : 18 };
          break;
        default:
          fontStyle = { fontFamily: "'Inter', sans-serif" };
          break;
      }
      if (customStyle?.fontFamilySubtitle) fontStyle.fontFamily = customStyle.fontFamilySubtitle;
      if (customStyle?.fontSizeSubtitle) fontStyle.fontSize = isVertical ? customStyle.fontSizeSubtitle * 1.4 : customStyle.fontSizeSubtitle;
      if (customStyle?.colorSubtitle) fontStyle.color = customStyle.colorSubtitle;
    }
    return fontStyle;
  };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        transform: transformStyle,
        opacity,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        pointerEvents: "none",
        filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.65))",
        zIndex: 50,
      }}
    >
      {/* Accent Bar (only in classic mode without custom border radius) */}
      {theme === "classic" && !customStyle?.borderRadius && (
        <div
          style={{
            width: ACCENT_BAR_WIDTH,
            backgroundColor: accentColor,
            borderRadius: "3px 0 0 3px",
            transform: `scaleY(${barScale})`,
            transformOrigin: "center",
            minHeight: 48,
          }}
        />
      )}

      {/* Content Panel */}
      <div
        style={{
          backdropFilter: "blur(12px)",
          padding: isVertical ? "20px 36px" : "14px 28px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          maxWidth: isVertical ? 860 : 640,
          clipPath: `inset(0 ${(1 - panelExpand) * 100}% 0 0)`,
          position: "relative",
          ...getThemeStyle(),
        }}
      >
        {/* Render Corner Decorator components based on theme (only when not using a custom border radius) */}
        {!customStyle?.borderRadius && (
          <>
            {theme === "tech" && <TechCorners color={accentColor} />}
            {theme === "ancient" && <AncientCorners color={accentColor} />}
            {theme === "industrial" && <IndustrialRivets />}
            {theme === "mysterious" && <MysteriousStars color={accentColor} />}
          </>
        )}

        {/* Lottie Icon */}
        {iconType && lottieMap[iconType] && (
          <div style={{ flexShrink: 0, width: isVertical ? 48 : 36, height: isVertical ? 48 : 36 }}>
            <SafeLottie animationData={lottieMap[iconType]} style={{ width: "100%", height: "100%" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
          {/* Title */}
          <span
            style={{
              color: "#F8FAFC",
              fontSize: isVertical ? 38 : 28,
              textTransform: "uppercase",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              ...getThemeFont("title")
            }}
          >
            {title}
          </span>

          {/* Subtitle */}
          {subtitle && (
            <span
              style={{
                color: "rgba(248,250,252,0.72)",
                fontWeight: 400,
                letterSpacing: "0.02em",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                marginTop: 2,
                ...getThemeFont("subtitle")
              }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />
          )}
        </div>
      </div>

      {/* Decorative line extending from panel (only in classic mode without custom border radius) */}
      {theme === "classic" && !customStyle?.borderRadius && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: ACCENT_BAR_WIDTH,
            right: 0,
            height: 1,
            background: `linear-gradient(to right, ${accentColor}80, transparent)`,
            opacity: panelExpand,
          }}
        />
      )}
    </div>
  );
};
