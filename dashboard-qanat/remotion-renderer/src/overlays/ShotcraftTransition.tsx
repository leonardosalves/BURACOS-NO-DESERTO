/**
 * ShotcraftTransition.tsx
 * Transição de entrada da cena (primeiros ~0.6s) com fallback nativo.
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

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
  const transitionDuration = Math.max(4, Math.round(fps * 0.55));
  const inTransition = Boolean(templateId) && frame < transitionDuration;

  if (!inTransition) {
    return <>{children}</>;
  }

  // flash / wipe fallback (não depende de demos vendor)
  const flashOpacity = interpolate(
    frame,
    [0, transitionDuration * 0.35, transitionDuration],
    [0.85, 0.35, 0],
    { extrapolateRight: "clamp" }
  );

  const isFlash =
    !templateId ||
    templateId.includes("shot-transitions") ||
    templateId.includes("tear") ||
    style === "flash-cut";

  const isWipe =
    templateId?.includes("wipe") ||
    templateId?.includes("iris") ||
    templateId?.includes("color-block");

  let overlayStyle: React.CSSProperties = {
    zIndex: 35,
    pointerEvents: "none",
    opacity: flashOpacity,
    backgroundColor: palette?.bg || "#000",
  };

  if (isWipe) {
    const wipe = interpolate(frame, [0, transitionDuration], [100, 0], {
      extrapolateRight: "clamp",
    });
    overlayStyle = {
      ...overlayStyle,
      backgroundColor: palette?.primary || palette?.bg || "#111",
      clipPath: `inset(0 ${wipe}% 0 0)`,
      opacity: 1,
    };
  } else if (!isFlash) {
    overlayStyle.backgroundColor = palette?.accent || palette?.bg || "#000";
  }

  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={overlayStyle} />
    </AbsoluteFill>
  );
}
