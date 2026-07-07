import { useEffect, useState } from "react";

const PREVIEW_FPS = 30;
const FADE_FRAMES = 14;

export type OverlayPreviewMotion = {
  frame: number;
  totalFrames: number;
  fps: number;
  opacity: number;
  scale: number;
  slideX: number;
  slideY: number;
  lineProgress: number;
  playing: boolean;
};

export function interpolateClamped(
  frame: number,
  input: [number, number],
  output: [number, number]
): number {
  const [i0, i1] = input;
  const [o0, o1] = output;
  if (frame <= i0) return o0;
  if (frame >= i1) return o1;
  const t = (frame - i0) / (i1 - i0);
  return o0 + (o1 - o0) * t;
}

/** Aproximação do spring Remotion (entrada com leve overshoot). */
export function previewSpring(frame: number, durationFrames = 20): number {
  const t = Math.min(1, Math.max(0, frame / durationFrames));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function computeOverlayPreviewMotion(
  frame: number,
  totalFrames: number,
  overlayType: string
): Pick<
  OverlayPreviewMotion,
  "opacity" | "scale" | "slideX" | "slideY" | "lineProgress"
> {
  const fadeIn = interpolateClamped(frame, [0, FADE_FRAMES], [0, 1]);
  const fadeOut = interpolateClamped(
    frame,
    [totalFrames - FADE_FRAMES, totalFrames],
    [1, 0]
  );
  const opacity = Math.min(fadeIn, fadeOut);

  const enterScale = previewSpring(frame, 20);
  const lineProgress = interpolateClamped(
    frame,
    [8, Math.min(totalFrames * 0.6, 50)],
    [0, 100]
  );

  switch (overlayType) {
    case "lower-third":
    case "source-card":
    case "social-post": {
      const slideIn = interpolateClamped(frame, [0, 18], [-28, 0]);
      const outStart = Math.max(0, totalFrames - 16);
      const slideOut = interpolateClamped(
        frame,
        [outStart, totalFrames],
        [0, 28]
      );
      return {
        opacity,
        scale: 1,
        slideX: frame >= outStart ? slideOut : slideIn,
        slideY: 0,
        lineProgress,
      };
    }
    case "kinetic-text": {
      const slam = interpolateClamped(frame, [0, 10], [1.35, 1]);
      return {
        opacity,
        scale: slam,
        slideX: 0,
        slideY: interpolateClamped(frame, [0, 12], [12, 0]),
        lineProgress,
      };
    }
    case "geo-map":
    case "location-intro":
    case "pictogram-chart":
    case "chapter-stinger":
    case "listicle-recap":
      return {
        opacity,
        scale: 0.92 + enterScale * 0.08,
        slideX: 0,
        slideY: 0,
        lineProgress,
      };
    case "listicle-stinger":
      return {
        opacity: 1,
        scale: 1,
        slideX: 0,
        slideY: 0,
        lineProgress,
      };
    case "rank-progress":
      return {
        opacity: interpolateClamped(frame, [0, 10], [0, 1]) * fadeOut,
        scale: enterScale,
        slideX: 0,
        slideY: interpolateClamped(frame, [0, 12], [10, 0]),
        lineProgress,
      };
    case "timeline":
    case "counter":
    case "info-card":
    case "bar-chart":
    default:
      return {
        opacity,
        scale: enterScale,
        slideX: 0,
        slideY: 0,
        lineProgress,
      };
  }
}

export function overlayMotionTransform(
  motion: Pick<OverlayPreviewMotion, "scale" | "slideX" | "slideY">
): string {
  const parts: string[] = [];
  if (motion.slideX || motion.slideY) {
    parts.push(`translate(${motion.slideX}px, ${motion.slideY}px)`);
  }
  if (motion.scale !== 1) {
    parts.push(`scale(${motion.scale})`);
  }
  return parts.length ? parts.join(" ") : "none";
}

export function useOverlayPreviewMotion(
  durationSeconds: number,
  overlayType: string,
  playing = true,
  externalFrame?: number | null
): OverlayPreviewMotion {
  const totalFrames = Math.max(
    PREVIEW_FPS * 2,
    Math.round(Math.max(2, durationSeconds) * PREVIEW_FPS)
  );
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (externalFrame != null) {
      const next = Math.max(
        0,
        Math.min(totalFrames - 1, Math.round(externalFrame))
      );
      setFrame((prev) => (prev === next ? prev : next));
      return undefined;
    }
    if (!playing) return undefined;
    const loopMs = (totalFrames / PREVIEW_FPS) * 1000;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - started) % loopMs;
      setFrame(Math.floor((elapsed / 1000) * PREVIEW_FPS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalFrames, externalFrame]);

  const derived = computeOverlayPreviewMotion(frame, totalFrames, overlayType);

  return {
    frame,
    totalFrames,
    fps: PREVIEW_FPS,
    playing,
    ...derived,
  };
}
