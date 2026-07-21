/**
 * ShotcraftCamera.tsx
 * Aplica camera moves 2.5D ao footage da cena (motion plan).
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export type CameraMove =
  | "slow-push-in"
  | "pull-back-isolation"
  | "drone-dive-landing"
  | "multiplane"
  | "dolly-zoom"
  | "crash-zoom-punch"
  | string
  | null
  | undefined;

export function ShotcraftCamera({
  move,
  durationInFrames,
  children,
}: {
  move?: CameraMove;
  durationInFrames: number;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!move) return <>{children}</>;

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  let transform = "none";

  switch (move) {
    case "slow-push-in":
      transform = `scale(${interpolate(progress, [0, 1], [1, 1.12])})`;
      break;
    case "pull-back-isolation":
      transform = `scale(${interpolate(progress, [0, 1], [1.15, 1])})`;
      break;
    case "drone-dive-landing":
      transform = `scale(${interpolate(progress, [0, 1], [1.4, 1])}) translateY(${interpolate(progress, [0, 1], [-8, 0])}%)`;
      break;
    case "dolly-zoom":
      transform = `scale(${interpolate(progress, [0, 1], [1, 1.25])}) rotate(${interpolate(progress, [0, 1], [0, 1.5])}deg)`;
      break;
    case "crash-zoom-punch": {
      const punch = interpolate(frame, [0, Math.max(1, fps * 0.25)], [1.6, 1], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.exp),
      });
      transform = `scale(${punch})`;
      break;
    }
    case "multiplane":
      transform = `scale(${interpolate(progress, [0, 1], [1.05, 1.15])}) translateX(${interpolate(progress, [0, 1], [-2, 2])}%)`;
      break;
    default:
      transform = `scale(${interpolate(progress, [0, 1], [1, 1.08])})`;
  }

  return (
    <AbsoluteFill
      style={{
        transform,
        transformOrigin: "center center",
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
