import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { mergeCustomStyle } from "./overlayStyleUtils";
import { OverlayIconSlot } from "./overlayIconSlot";

export interface LowerThirdProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  position?: "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-right";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  variant?: "glass" | "bild" | "accent-underline" | "bold-block" | "clean-bar" | "soft-pill";
  iconType?: string;
  iconStyle?: "lottie" | "svg";
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

const TechCorners: React.FC<{ color: string }> = () => null;

const AncientCorners: React.FC<{ color: string }> = () => null;

const IndustrialRivets: React.FC = () => null;

const MysteriousStars: React.FC<{ color: string }> = () => null;

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  accentColor = "#D4AF37",
  position = "bottom-left",
  theme = "classic",
  variant,
  iconType,
  iconStyle,
  customStyle,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const iconSlot = (px: number) =>
    iconType ? (
      <div style={{ flexShrink: 0, width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <OverlayIconSlot iconType={iconType} iconStyle={iconStyle} size={px} accentColor={accentColor} />
      </div>
    ) : null;
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

  const slideOffset = position.includes("right") ? -translateX : translateX;

  // Position styles
  const positionStyle: React.CSSProperties =
    position === "top-left"
      ? {
          top: isVertical ? 180 : 80,
          left: isVertical ? 48 : 64,
          bottom: "auto",
        }
      : position === "top-right"
      ? {
          top: isVertical ? 180 : 80,
          right: isVertical ? 48 : 64,
          left: "auto",
          bottom: "auto",
        }
      : position === "bottom-center"
      ? {
          bottom: isVertical ? 640 : 210,
          left: "50%",
          transform: `translateX(-50%) translateX(${slideOffset}px)`,
        }
      : position === "bottom-right"
      ? {
          bottom: isVertical ? 640 : 210,
          right: isVertical ? 48 : 64,
          left: "auto",
        }
      : {
          bottom: isVertical ? 640 : 210,
          left: isVertical ? 48 : 64,
        };

  const transformStyle =
    position === "bottom-center"
      ? positionStyle.transform
      : `translateX(${slideOffset}px)`;

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
    base = mergeCustomStyle(base, customStyle);
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

  // 1. variant === "bild"
  if (variant === "bild") {
    return (
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          transform: transformStyle,
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            padding: isVertical ? "12px 24px" : "8px 18px",
            boxShadow: `4px 4px 0px ${accentColor || "#E50000"}`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {iconSlot(isVertical ? 50 : 36)}
          <span
            style={{
              color: "#111111",
              fontSize: isVertical ? 34 : 24,
              fontWeight: 900,
              textTransform: "uppercase",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {title}
          </span>
        </div>
        {subtitle && (
          <div
            style={{
              background: accentColor || "#E50000",
              padding: isVertical ? "8px 18px" : "6px 14px",
              boxShadow: "4px 4px 0px #FFFFFF",
              marginLeft: 4,
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
                fontSize: isVertical ? 22 : 15,
                fontWeight: 800,
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
              }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. variant === "bold-block"
  if (variant === "bold-block") {
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
        <div
          style={{
            background: "#111111",
            padding: isVertical ? "20px 32px" : "14px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 200,
            border: "1.5px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
            {iconSlot(isVertical ? 46 : 32)}
            <span
              style={{
                color: "#FFFFFF",
                fontSize: isVertical ? 34 : 24,
                fontWeight: 900,
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <div
              style={{
                background: accentColor || "gold",
                padding: "3px 10px",
                borderRadius: "2px",
                alignSelf: "flex-start",
              }}
            >
              <span
                style={{
                  color: "#111111",
                  fontSize: isVertical ? 22 : 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  fontFamily: "'Montserrat', sans-serif",
                }}
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. variant === "accent-underline"
  if (variant === "accent-underline") {
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
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderBottom: `3.5px solid ${accentColor}`,
              paddingBottom: 6,
            }}
          >
            {iconSlot(isVertical ? 46 : 32)}
            <span
              style={{
                color: "#FFFFFF",
                fontSize: isVertical ? 38 : 28,
                fontWeight: 800,
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: "0.03em",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <span
              style={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: isVertical ? 26 : 18,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                paddingTop: 4,
              }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />
          )}
        </div>
      </div>
    );
  }

  // 4. variant === "soft-pill"
  if (variant === "soft-pill") {
    return (
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          transform: transformStyle,
          opacity,
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, rgba(12, 12, 16, 0.88) 0%, rgba(24, 24, 32, 0.82) 100%)`,
            backdropFilter: "blur(14px)",
            border: `1px solid ${accentColor}44`,
            borderRadius: 999,
            padding: isVertical ? "14px 28px" : "10px 22px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${accentColor}22 inset`,
          }}
        >
          {iconSlot(isVertical ? 40 : 30)}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                color: "#FFFFFF",
                fontSize: isVertical ? 28 : 20,
                fontWeight: 700,
                letterSpacing: "0.04em",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {title}
            </span>
            {subtitle && (
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: isVertical ? 18 : 13,
                  fontFamily: "'Inter', sans-serif",
                }}
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. variant === "clean-bar"
  if (variant === "clean-bar") {
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
          filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.55))",
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: 6,
            backgroundColor: accentColor,
            borderRadius: "4px 0 0 4px",
          }}
        />
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(255, 255, 255, 0.1)",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            padding: isVertical ? "16px 28px" : "12px 20px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          {iconSlot(isVertical ? 50 : 36)}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                color: "#FFFFFF",
                fontSize: isVertical ? 34 : 24,
                fontWeight: 800,
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {title}
            </span>
            {subtitle && (
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.75)",
                  fontSize: isVertical ? 22 : 15,
                  fontFamily: "'Inter', sans-serif",
                }}
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. Classic Fallback (Default)
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
        {iconSlot(isVertical ? 48 : 36)}

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
