import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { mergeCustomStyle } from "./overlayStyleUtils";
import { OverlayIconSlot } from "./overlayIconSlot";

export interface InfoCardProps {
  title: string;
  description: string;
  iconType?: string;
  iconStyle?: "lottie" | "svg";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  accentColor?: string;
  variant?: "glass" | "minimal" | "accent" | "floating";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  customStyle?: {
    background?: string;
    border?: string;
    borderLeft?: string;
    borderRadius?: string;
    boxShadow?: string;
    padding?: string;
    fontFamilyTitle?: string;
    fontFamilyDesc?: string;
    letterSpacingTitle?: string;
    textTransformTitle?: "uppercase" | "none" | "capitalize";
    fontSizeTitle?: number;
    fontSizeDesc?: number;
    colorTitle?: string;
    colorDesc?: string;
  };
}

const ANIM_IN_FRAMES = 15;
const ANIM_OUT_FRAMES = 12;


const TechCorners: React.FC<{ color: string }> = () => null;

const AncientCorners: React.FC<{ color: string }> = () => null;

const IndustrialRivets: React.FC = () => null;

const MysteriousStars: React.FC<{ color: string }> = () => null;
export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  iconType = "info",
  iconStyle,
  position = "top-left",
  accentColor = "#D4AF37",
  variant = "glass",
  theme = "classic",
  customStyle,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isVertical = height > width;

  // Slide & Fade animation
  const slideIn = interpolate(frame, [0, ANIM_IN_FRAMES], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, ANIM_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const { durationInFrames } = useVideoConfig();
  const outStart = durationInFrames - ANIM_OUT_FRAMES;
  const slideOut = interpolate(frame, [outStart, durationInFrames], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(fadeIn, fadeOut);

  // Position coordinates
  const positionStyle: React.CSSProperties = {};
  
  if (position.includes("top")) {
    positionStyle.top = isVertical ? 180 : 80;
  } else {
    positionStyle.bottom = isVertical ? 640 : 210;
  }

  if (position.includes("left")) {
    positionStyle.left = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideIn - slideOut}px)`;
  } else {
    positionStyle.right = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideOut - slideIn}px)`;
  }

  const size = isVertical ? 60 : 44;



  // Layout variants mapping (classic style)
  const variantStyles: Record<string, React.CSSProperties> = {
    glass: {
      background: "linear-gradient(135deg, rgba(6,6,10,0.95) 0%, rgba(14,14,20,0.92) 100%)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "8px",
    },
    minimal: {
      background: "rgba(5, 5, 8, 0.65)",
      backdropFilter: "blur(20px)",
      border: "none",
      borderLeft: `2.5px dashed ${accentColor}`,
      borderRadius: "4px",
    },
    accent: {
      background: `linear-gradient(135deg, rgba(6,6,10,0.95) 0%, ${accentColor}12 100%)`,
      backdropFilter: "blur(14px)",
      border: `1px solid ${accentColor}40`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: "6px",
    },
    floating: {
      background: "rgba(10,10,15,0.98)",
      backdropFilter: "blur(16px)",
      border: `2px solid ${accentColor}`,
      borderRadius: "16px",
    }
  };

  // Theme custom styling mapper
  const getThemeStyle = (): React.CSSProperties => {
    let base: React.CSSProperties = {};
    switch (theme) {
      case "ancient":
        base = {
          background: "linear-gradient(135deg, rgba(22, 16, 12, 0.88) 0%, rgba(36, 26, 20, 0.82) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "tech":
        base = {
          background: "linear-gradient(135deg, rgba(8, 12, 16, 0.85) 0%, rgba(14, 20, 28, 0.8) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}25`,
        };
        break;
      case "nature":
        base = {
          background: "linear-gradient(135deg, rgba(8, 14, 10, 0.85) 0%, rgba(14, 24, 18, 0.8) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "industrial":
        base = {
          background: "linear-gradient(135deg, rgba(16, 16, 18, 0.9) 0%, rgba(26, 26, 30, 0.85) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "mysterious":
        base = {
          background: "linear-gradient(135deg, rgba(12, 8, 16, 0.88) 0%, rgba(22, 14, 30, 0.82) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}25`,
        };
        break;
      case "classic":
      default:
        base = {
          ...variantStyles[variant],
          borderRadius: "16px", // Ensure standard variants have rounded corners too
        };
        break;
    }

    base = mergeCustomStyle(base, customStyle);
    return base;
  };

  const getThemeFont = (type: "title" | "desc") => {
    let fontStyle: React.CSSProperties = {};
    if (type === "title") {
      switch (theme) {
        case "ancient":
        case "mysterious":
        case "industrial":
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 800, letterSpacing: "0.03em" };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 900, letterSpacing: "0.04em" };
          break;
        case "nature":
        default:
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 900 };
          break;
      }
      if (customStyle?.fontFamilyTitle) fontStyle.fontFamily = customStyle.fontFamilyTitle;
      if (customStyle?.letterSpacingTitle) fontStyle.letterSpacing = customStyle.letterSpacingTitle;
      if (customStyle?.textTransformTitle) fontStyle.textTransform = customStyle.textTransformTitle;
      if (customStyle?.fontSizeTitle) fontStyle.fontSize = isVertical ? customStyle.fontSizeTitle * 1.4 : customStyle.fontSizeTitle;
      if (customStyle?.colorTitle) fontStyle.color = customStyle.colorTitle;
    } else {
      switch (theme) {
        case "tech":
        default:
          fontStyle = { fontFamily: "'Inter', sans-serif" };
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
        position: "absolute",
        ...positionStyle,
        opacity,
        pointerEvents: "none",
        width: isVertical ? 680 : 400,
        height: "auto",
        zIndex: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          padding: variant === "floating" || theme === "ancient" || theme === "mysterious"
            ? (isVertical ? "20px 24px" : "12px 18px")
            : (isVertical ? "16px 20px" : "10px 14px"),
          gap: isVertical ? 16 : 10,
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

        {/* Animated Vector SVG Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            flexShrink: 0,
          }}
        >
          <OverlayIconSlot iconType={iconType} iconStyle={iconStyle} size={size} accentColor={accentColor} />
        </div>

        {/* Content panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span
            style={{
              color: accentColor,
              fontSize: isVertical ? 20 : 13,
              textTransform: customStyle?.textTransformTitle || "none",
              lineHeight: 1.2,
              ...getThemeFont("title")
            }}
          >
            {title}
          </span>
          <div
            style={{
              color: "rgba(248,250,252,0.9)",
              fontSize: isVertical ? 16 : 10.5,
              fontWeight: 400,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              ...getThemeFont("desc")
            }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
