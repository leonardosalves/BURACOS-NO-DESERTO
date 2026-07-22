/**
 * ShotcraftDemoOverlay — renders the REAL video-shotcraft demo animation
 * as a transparent overlay on top of the scene asset.
 *
 * The demos are 1920×1080 full-screen compositions. This wrapper:
 * 1. Loads the correct demo component via template_id
 * 2. Overrides background to transparent
 * 3. Scales to fit as a centered overlay (~55% of frame)
 * 4. Applies fade-in/out based on duration_seconds
 */
import React, { Suspense } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { SHOTCRAFT_DEMO_COMPONENTS } from "./shotcraftDemoImports";

interface ShotcraftDemoOverlayProps {
  templateId: string;
  durationSeconds: number;
  delayFrames?: number;
}

/** Scale factor: demo is 1920×1080, we render it at ~55% as overlay */
const OVERLAY_SCALE = 0.55;

const ShotcraftDemoOverlay: React.FC<ShotcraftDemoOverlayProps> = ({
  templateId,
  durationSeconds,
  delayFrames = 36,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const DemoComponent = SHOTCRAFT_DEMO_COMPONENTS[templateId];
  if (!DemoComponent) return null;

  const totalFrames = Math.round(durationSeconds * fps);
  const localFrame = frame - delayFrames;
  if (localFrame < 0 || localFrame > totalFrames) return null;

  // Fade in (12f) and fade out (12f)
  const fadeIn = interpolate(localFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeOut = interpolate(
    localFrame,
    [totalFrames - 12, totalFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Scale demo (1920×1080) to fit as overlay
  const scaleX = (width * OVERLAY_SCALE) / 1920;
  const scaleY = (height * OVERLAY_SCALE) / 1080;
  const scale = Math.min(scaleX, scaleY);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          // Override demo background to transparent
          background: "transparent",
          borderRadius: 24,
          overflow: "hidden",
          // Semi-transparent dark backdrop for readability over asset
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* CSS override: make demo backgrounds transparent */}
        <style>{`
          .shotcraft-demo-transparent > div {
            background: rgba(12, 12, 20, 0.75) !important;
          }
        `}</style>
        <div
          className="shotcraft-demo-transparent"
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <DemoComponent />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ShotcraftDemoOverlay;
