/**
 * ShotcraftTransition.tsx
 * Transição de entrada da cena (primeiros ~0.6s) com efeitos variados.
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

type TransitionKind =
  | "flash"
  | "wipe-left"
  | "wipe-right"
  | "iris"
  | "push-up"
  | "push-down"
  | "fade"
  | "zoom-burst"
  | "curtain"
  | "none";

function resolveKind(
  templateId?: string | null,
  style?: string
): TransitionKind {
  const id = String(templateId || "").toLowerCase();
  const st = String(style || "").toLowerCase();
  if (!id && !st) return "none";
  if (
    st === "flash-cut" ||
    id.includes("shot-transitions") ||
    id.includes("tear") ||
    id.includes("flash")
  )
    return "flash";
  if (id.includes("circle") || id.includes("iris")) return "iris";
  if (id.includes("color-block") || id.includes("step-wipe"))
    return "wipe-left";
  if (id.includes("wipe") || id.includes("page-turn")) return "wipe-right";
  if (id.includes("push") || id.includes("bottom-push")) return "push-up";
  if (id.includes("curtain") || id.includes("print-texture")) return "curtain";
  if (id.includes("bubble") || id.includes("swarm")) return "zoom-burst";
  if (id.includes("hidden-cut") || id.includes("transition-travel"))
    return "fade";
  if (id.includes("line-carry")) return "wipe-left";
  return "fade";
}

export function ShotcraftTransition({
  templateId,
  style,
  palette,
  children,
}: {
  templateId?: string | null;
  style?: string;
  palette?: Record<string, string>;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.max(4, Math.round(fps * 0.55));
  const kind = resolveKind(templateId, style);

  if (kind === "none" || frame >= dur) {
    return <>{children}</>;
  }

  const t = interpolate(frame, [0, dur], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const primary = palette?.primary || "#F5A623";
  const bg = palette?.bg || "#0a0a12";
  const accent = palette?.accent || "#4A9EFF";

  let overlay: React.ReactNode = null;

  switch (kind) {
    case "flash": {
      const op = interpolate(t, [0, 0.3, 1], [0.9, 0.4, 0], {
        extrapolateRight: "clamp",
      });
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            opacity: op,
            background: `radial-gradient(circle, ${accent}88, ${bg})`,
          }}
        />
      );
      break;
    }
    case "wipe-left": {
      const x = interpolate(t, [0, 1], [0, 100]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            background: primary,
            clipPath: `inset(0 0 0 ${x}%)`,
          }}
        />
      );
      break;
    }
    case "wipe-right": {
      const x = interpolate(t, [0, 1], [0, 100]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            background: primary,
            clipPath: `inset(0 ${x}% 0 0)`,
          }}
        />
      );
      break;
    }
    case "iris": {
      const r = interpolate(t, [0, 1], [0, 75]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            background: bg,
            clipPath: `circle(${r}% at 50% 50%)`,
            opacity: 1 - t,
          }}
        />
      );
      break;
    }
    case "push-up": {
      const y = interpolate(t, [0, 1], [0, -100]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            background: primary,
            transform: `translateY(${y}%)`,
          }}
        />
      );
      break;
    }
    case "push-down": {
      const y = interpolate(t, [0, 1], [0, 100]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            background: primary,
            transform: `translateY(${y}%)`,
          }}
        />
      );
      break;
    }
    case "zoom-burst": {
      const scale = interpolate(t, [0, 1], [3, 1]);
      const op = interpolate(t, [0, 0.6, 1], [0.8, 0.3, 0]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            opacity: op,
            background: `radial-gradient(circle, ${accent}, ${bg})`,
            transform: `scale(${scale})`,
          }}
        />
      );
      break;
    }
    case "curtain": {
      const left = interpolate(t, [0, 1], [0, 50]);
      const right = interpolate(t, [0, 1], [0, 50]);
      overlay = (
        <AbsoluteFill style={{ zIndex: 35, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${50 - left}%`,
              background: bg,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: `${50 - right}%`,
              background: bg,
            }}
          />
        </AbsoluteFill>
      );
      break;
    }
    case "fade":
    default: {
      const op = interpolate(t, [0, 1], [1, 0]);
      overlay = (
        <AbsoluteFill
          style={{
            zIndex: 35,
            pointerEvents: "none",
            opacity: op,
            background: bg,
          }}
        />
      );
      break;
    }
  }

  return (
    <AbsoluteFill>
      {children}
      {overlay}
    </AbsoluteFill>
  );
}
