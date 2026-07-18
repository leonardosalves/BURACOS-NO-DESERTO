import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";

function resolveAssetSrc(src = "") {
  const s = String(src || "")
    .trim()
    .replace(/\\/g, "/");
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  try {
    return staticFile(s.replace(/^\//, ""));
  } catch {
    return s;
  }
}

function isVideoAssetSrc(src = "") {
  return /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(String(src || ""));
}

export type CinematicEffectKind =
  | "film-burn"
  | "vignette-pulse"
  | "parallax-pan"
  | "ken-burns"
  | "whip-pan"
  | "letterbox"
  | "spotlight"
  | "camera-shake"
  | "generic";

type Props = {
  kind?: CinematicEffectKind | string;
  intensity?: "subtle" | "normal" | "strong" | string;
  sceneAsset?: string;
  accentColor?: string;
  opacity?: number;
};

function resolveKind(raw = ""): CinematicEffectKind {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (s.includes("film") || s.includes("burn")) return "film-burn";
  if (s.includes("vignette")) return "vignette-pulse";
  if (s.includes("parallax")) return "parallax-pan";
  if (s.includes("ken")) return "ken-burns";
  if (s.includes("whip")) return "whip-pan";
  if (s.includes("letterbox")) return "letterbox";
  if (s.includes("spotlight")) return "spotlight";
  if (s.includes("shake")) return "camera-shake";
  return "generic";
}

function intensityMul(level = "normal") {
  if (level === "subtle") return 0.55;
  if (level === "strong") return 1.15;
  return 0.85;
}

/**
 * Efeitos cinematográficos nativos — estáveis no Remotion, usam sceneAsset quando houver.
 * Preferidos a templates Studio “sujos” da categoria cinematic.
 */
export const CinematicEffectLayer: React.FC<Props> = ({
  kind: kindRaw = "generic",
  intensity = "normal",
  sceneAsset = "",
  accentColor = "#D4AF37",
  opacity = 0.85,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const kind = resolveKind(kindRaw);
  const mul = intensityMul(intensity);
  const baseOpacity = Math.min(1, Math.max(0, opacity) * mul);
  const t = frame / Math.max(1, fps);

  if (kind === "parallax-pan" || kind === "ken-burns") {
    const progress = frame / Math.max(1, durationInFrames - 1);
    const scale =
      kind === "ken-burns" ? interpolate(progress, [0, 1], [1.12, 1.0]) : 1.08;
    const x =
      kind === "parallax-pan"
        ? interpolate(progress, [0, 1], [-width * 0.04, width * 0.04])
        : 0;
    const y =
      kind === "ken-burns"
        ? interpolate(progress, [0, 1], [-height * 0.02, height * 0.02])
        : 0;
    const assetSrc = resolveAssetSrc(sceneAsset);
    const mediaStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
    };
    return (
      <AbsoluteFill style={{ overflow: "hidden", opacity: baseOpacity }}>
        {assetSrc ? (
          isVideoAssetSrc(sceneAsset) || isVideoAssetSrc(assetSrc) ? (
            <Video src={assetSrc} muted volume={0} style={mediaStyle} />
          ) : (
            <Img src={assetSrc} style={mediaStyle} />
          )
        ) : (
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at 50% 50%, ${accentColor}33, #050506ee)`,
              transform: `scale(${scale})`,
            }}
          />
        )}
      </AbsoluteFill>
    );
  }

  if (kind === "film-burn") {
    const flicker = 0.7 + 0.3 * Math.sin(frame * 0.7) * Math.sin(frame * 0.13);
    return (
      <AbsoluteFill
        style={{ pointerEvents: "none", opacity: baseOpacity * flicker }}
      >
        <AbsoluteFill
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
            mixBlendMode: "overlay",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at ${50 + Math.sin(t * 2) * 10}% ${40 + Math.cos(t) * 10}%, rgba(255,120,40,${0.15 * mul}), transparent 55%)`,
            mixBlendMode: "screen",
          }}
        />
        <AbsoluteFill
          style={{
            boxShadow: "inset 0 0 80px rgba(0,0,0,0.55)",
          }}
        />
      </AbsoluteFill>
    );
  }

  if (kind === "vignette-pulse") {
    const pulse = 0.55 + 0.45 * Math.sin(frame * 0.08);
    return (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: baseOpacity,
          background: `radial-gradient(circle, transparent ${35 - pulse * 8}%, rgba(0,0,0,${0.55 * mul * pulse}) 100%)`,
        }}
      />
    );
  }

  if (kind === "letterbox") {
    const bar = Math.round(height * 0.08 * mul);
    return (
      <AbsoluteFill style={{ pointerEvents: "none", opacity: baseOpacity }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: bar,
            background: "#000",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: bar,
            background: "#000",
          }}
        />
      </AbsoluteFill>
    );
  }

  if (kind === "spotlight") {
    const cx = 50 + Math.sin(t * 0.6) * 8;
    const cy = 45 + Math.cos(t * 0.5) * 6;
    return (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: baseOpacity,
          background: `radial-gradient(circle at ${cx}% ${cy}%, transparent 18%, rgba(0,0,0,${0.65 * mul}) 55%)`,
        }}
      />
    );
  }

  if (kind === "camera-shake") {
    const sx = Math.sin(frame * 1.7) * 3 * mul;
    const sy = Math.cos(frame * 1.3) * 2 * mul;
    return (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: baseOpacity * 0.35,
          transform: `translate(${sx}px, ${sy}px)`,
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
        }}
      />
    );
  }

  if (kind === "whip-pan") {
    const x = interpolate(
      frame,
      [0, Math.max(2, durationInFrames * 0.35)],
      [width, -width * 0.2],
      { extrapolateRight: "clamp" }
    );
    return (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: baseOpacity * 0.5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "30%",
            left: x,
            background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
            filter: "blur(8px)",
          }}
        />
      </AbsoluteFill>
    );
  }

  // generic soft grade
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: baseOpacity * 0.4,
        background: `linear-gradient(180deg, ${accentColor}22, transparent 40%, rgba(0,0,0,0.25))`,
        mixBlendMode: "soft-light",
      }}
    />
  );
};

export function isNativeCinematicEffect(subcategoryOrName = "") {
  const s = String(subcategoryOrName || "").toLowerCase();
  return /film\s*burn|vignette|parallax|ken\s*burns|whip\s*pan|letterbox|spotlight|camera\s*shake|cinematic/i.test(
    s
  );
}
