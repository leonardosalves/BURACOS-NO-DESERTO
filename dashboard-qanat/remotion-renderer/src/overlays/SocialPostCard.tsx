import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface SocialPostCardProps {
  platform?: "reddit" | "x" | "instagram" | "tiktok" | "spotify" | "macos-notification" | "generic";
  username?: string;
  text: string;
  upvotes?: string;
  accentColor?: string;
  position?: "bottom-left" | "bottom-right";
}

type PlatformTheme = {
  color: string;
  label: string;
  badge: string;
  bg: string;
  border: string;
};

function platformTheme(platform: string, accent: string): PlatformTheme {
  switch (platform) {
    case "x":
      return { color: "#1DA1F2", label: "X", badge: "𝕏", bg: "rgba(18,18,22,0.94)", border: "#1DA1F255" };
    case "instagram":
      return { color: "#E1306C", label: "Instagram", badge: "IG", bg: "rgba(14,10,16,0.95)", border: "#E1306C55" };
    case "tiktok":
      return { color: "#25F4EE", label: "TikTok", badge: "TT", bg: "rgba(8,8,10,0.96)", border: "#25F4EE44" };
    case "spotify":
      return { color: "#1DB954", label: "Spotify", badge: "♫", bg: "rgba(10,14,10,0.95)", border: "#1DB95455" };
    case "macos-notification":
      return { color: accent, label: "Notificação", badge: "🔔", bg: "rgba(248,248,248,0.92)", border: "rgba(0,0,0,0.08)" };
    case "reddit":
      return { color: "#FF4500", label: "reddit", badge: "r/", bg: "rgba(18,18,22,0.94)", border: "#FF450055" };
    default:
      return { color: accent, label: "web", badge: "W", bg: "rgba(18,18,22,0.94)", border: `${accent}55` };
  }
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  platform = "reddit",
  username = "curiosidades",
  text,
  upvotes = "12k",
  accentColor = "#FF4500",
  position = "bottom-left",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;
  const theme = platformTheme(platform, accentColor);
  const isLight = platform === "macos-notification";

  const enter = spring({ fps, frame, config: { damping: 18, stiffness: 130 } });
  const exitStart = Math.max(0, durationInFrames - 14);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);

  const posStyle: React.CSSProperties = platform === "macos-notification"
    ? { top: isVertical ? 120 : 64, left: "50%", transform: `translateX(-50%) translateY(${(1 - enter) * -16}px)`, right: "auto", bottom: "auto" }
    : position === "bottom-right"
      ? { bottom: isVertical ? 260 : 140, right: isVertical ? 36 : 56 }
      : { bottom: isVertical ? 260 : 140, left: isVertical ? 36 : 56 };

  const textColor = isLight ? "#1a1a1a" : "#E8E8EC";
  const subColor = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.45)";

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        opacity,
        transform: platform === "macos-notification"
          ? posStyle.transform
          : `translateY(${(1 - enter) * 20}px) scale(${0.94 + enter * 0.06})`,
        pointerEvents: "none",
        zIndex: 42,
        maxWidth: platform === "macos-notification" ? (isVertical ? 360 : 420) : (isVertical ? 400 : 440),
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: platform === "macos-notification" ? 16 : platform === "spotify" ? 12 : 14,
        padding: isVertical ? "14px 16px" : "12px 14px",
        boxShadow: isLight
          ? "0 12px 40px rgba(0,0,0,0.18)"
          : `0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px ${theme.color}22 inset`,
        backdropFilter: platform === "macos-notification" ? "blur(20px)" : undefined,
      }}
    >
      {platform === "spotify" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: `linear-gradient(135deg, ${theme.color}, #121212)` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: textColor }}>{username}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: subColor, marginBottom: 8 }}>{text.slice(0, 48)}</div>
            <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <div style={{ width: "42%", height: "100%", background: theme.color, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      ) : platform === "tiktok" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #25F4EE, #FE2C55)" }} />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: textColor }}>@{username}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: subColor }}>TikTok · viral</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#FE2C55", border: "1px solid #FE2C55", borderRadius: 4, padding: "4px 8px" }}>Seguir</div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: isVertical ? 17 : 14, fontWeight: 600, color: textColor, lineHeight: 1.4 }}>{text}</div>
        </div>
      ) : platform === "instagram" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", padding: 2, background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                {username.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: textColor }}>@{username}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: subColor }}>Instagram</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#3897f0" }}>Seguir</div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: isVertical ? 17 : 14, fontWeight: 600, color: textColor, lineHeight: 1.4 }}>{text}</div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: platform === "macos-notification" ? 8 : "50%",
                background: isLight ? theme.color : `linear-gradient(135deg, ${theme.color}, ${theme.color}88)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: isLight ? "#fff" : "#fff",
              }}
            >
              {theme.badge.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: textColor }}>
                {platform === "macos-notification" ? username : `@${username}`}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: subColor }}>
                {theme.label}{platform === "macos-notification" ? "" : " · viral"}
              </div>
            </div>
            {platform === "reddit" && (
              <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: theme.color }}>
                ▲ {upvotes}
              </div>
            )}
            {platform === "x" && (
              <div style={{ marginLeft: "auto", fontSize: 10, color: subColor }}>♥ {upvotes}</div>
            )}
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: isVertical ? 17 : 14,
              fontWeight: 600,
              color: textColor,
              lineHeight: 1.4,
            }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
};