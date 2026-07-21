/**
 * ShotcraftLayer.tsx
 * Renderiza motion shots do video-shotcraft sobre a cena.
 *
 * Os demos do vendor são composições de showcase (sem props). Aqui usamos
 * overlays data-driven alimentados pelo motionDirector (props + palette).
 * Quando um demo real for plugado no registry, ele tem prioridade.
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type MotionShot = {
  templateId: string;
  style?: string;
  props?: Record<string, unknown>;
  palette?: {
    primary?: string;
    bg?: string;
    accent?: string;
    text?: string;
  };
};

type Palette = {
  primary: string;
  bg: string;
  accent: string;
  text: string;
};

function resolvePalette(shot: MotionShot): Palette {
  const p = shot.palette || {};
  return {
    primary: String(p.primary || "#F5A623"),
    bg: String(p.bg || "rgba(12,12,20,0.72)"),
    accent: String(p.accent || "#4A9EFF"),
    text: String(p.text || "#FFFFFF"),
  };
}

function useEntrance() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const fadeOutStart = Math.max(1, durationInFrames - Math.round(0.35 * fps));
  const opacity = interpolate(
    frame,
    [0, Math.round(0.15 * fps), fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return { enter, opacity, frame, fps };
}

const Shell: React.FC<{
  palette: Palette;
  children: React.ReactNode;
  bottom?: number;
}> = ({ palette, children, bottom = 110 }) => {
  const { enter, opacity } = useEntrance();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 40 }}>
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom,
          opacity,
          transform: `translateY(${(1 - enter) * 28}px) scale(${0.96 + enter * 0.04})`,
          background: palette.bg,
          border: `1px solid ${palette.primary}55`,
          borderRadius: 18,
          padding: "22px 28px",
          backdropFilter: "blur(10px)",
          boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${palette.accent}22`,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const OdometerShot: React.FC<{ shot: MotionShot }> = ({ shot }) => {
  const palette = resolvePalette(shot);
  const { enter } = useEntrance();
  const target = Number(shot.props?.value || 0);
  const value = Math.round(target * enter);
  const unit = String(shot.props?.unit || "");
  const label = String(shot.props?.label || "");
  return (
    <Shell palette={palette}>
      <div
        style={{
          color: palette.primary,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        odometer
      </div>
      <div
        style={{
          color: palette.text,
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {unit ? (
          <span style={{ fontSize: 28, marginLeft: 10, opacity: 0.85 }}>
            {unit}
          </span>
        ) : null}
      </div>
      {label ? (
        <div
          style={{
            color: palette.text,
            fontSize: 20,
            fontWeight: 600,
            marginTop: 10,
            opacity: 0.9,
          }}
        >
          {label}
        </div>
      ) : null}
    </Shell>
  );
};

const TimelineShot: React.FC<{ shot: MotionShot }> = ({ shot }) => {
  const palette = resolvePalette(shot);
  const milestones = Array.isArray(shot.props?.milestones)
    ? (shot.props?.milestones as Array<{ year?: string; label?: string }>)
    : [];
  return (
    <Shell palette={palette} bottom={90}>
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {milestones.slice(0, 4).map((m, i) => (
          <div key={`${m.year}-${i}`} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                height: 4,
                background: palette.primary,
                borderRadius: 2,
                marginBottom: 10,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                color: palette.primary,
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              {m.year || "—"}
            </div>
            <div
              style={{
                color: palette.text,
                fontSize: 14,
                marginTop: 4,
                opacity: 0.88,
              }}
            >
              {m.label || ""}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
};

const ListShot: React.FC<{ shot: MotionShot }> = ({ shot }) => {
  const palette = resolvePalette(shot);
  const items = Array.isArray(shot.props?.items)
    ? (shot.props?.items as Array<{
        rank?: number;
        title?: string;
        value?: string;
      }>)
    : [];
  return (
    <Shell palette={palette}>
      {items.slice(0, 5).map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: i === items.length - 1 ? 0 : 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: palette.primary,
              color: "#111",
              fontWeight: 900,
              display: "grid",
              placeItems: "center",
              fontSize: 16,
            }}
          >
            {item.rank ?? i + 1}
          </div>
          <div style={{ flex: 1, color: palette.text, fontWeight: 700 }}>
            {item.title || ""}
          </div>
          <div style={{ color: palette.accent, fontWeight: 800 }}>
            {item.value || ""}
          </div>
        </div>
      ))}
    </Shell>
  );
};

const WordsShot: React.FC<{ shot: MotionShot }> = ({ shot }) => {
  const palette = resolvePalette(shot);
  const { frame, fps, enter } = useEntrance();
  const words = Array.isArray(shot.props?.words)
    ? (shot.props?.words as string[])
    : [String(shot.props?.text || shot.templateId)];
  const idx = Math.min(
    words.length - 1,
    Math.floor((frame / Math.max(1, fps * 0.45)) % words.length)
  );
  const word = words[Math.max(0, idx)] || "";
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        opacity: enter,
      }}
    >
      <div
        style={{
          color: palette.primary,
          fontSize: 72,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 2,
          textShadow: `0 0 24px ${palette.accent}88`,
          fontFamily: "Montserrat, Inter, system-ui, sans-serif",
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

const HeroShot: React.FC<{ shot: MotionShot }> = ({ shot }) => {
  const palette = resolvePalette(shot);
  const card = (shot.props?.card || {}) as {
    title?: string;
    subtitle?: string;
  };
  const title =
    card.title ||
    String(shot.props?.text || shot.props?.label || shot.templateId);
  const subtitle =
    card.subtitle ||
    String(shot.props?.value != null ? shot.props.value : "");
  return (
    <Shell palette={palette}>
      <div
        style={{
          color: palette.primary,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {shot.templateId}
      </div>
      <div
        style={{
          color: palette.text,
          fontSize: 36,
          fontWeight: 900,
          marginTop: 8,
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            color: palette.accent,
            fontSize: 22,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </Shell>
  );
};

/** Registry de renderers data-driven (não os demos TSX brutos). */
export const SHOTCRAFT_DATA_RENDERERS: Record<
  string,
  React.ComponentType<{ shot: MotionShot }>
> = {
  "odometer-digit-roll": OdometerShot,
  "timeline-travel": TimelineShot,
  "list-stack-press": ListShot,
  "cel-flash-stomp": WordsShot,
  "gradient-word-sweep": WordsShot,
  "trailer-grammar-moves": WordsShot,
  "impact-feedback": OdometerShot,
  "gauge-readout-moves": OdometerShot,
  "crane-rise-reveal": HeroShot,
  "spotlight-hero-card": HeroShot,
  "card-flip-reveal": HeroShot,
  "brand-ink-open": HeroShot,
  "outro-group-photo-launch": HeroShot,
  "particle-sand-fill": HeroShot,
  "chart-live-moves": HeroShot,
  "wall-reveal-moves": ListShot,
  "text-as-mask": WordsShot,
  "space-camera-moves": HeroShot,
  "before-after-slider-scrub": HeroShot,
  "beat-cut-moves": WordsShot,
};

export function ShotcraftPlaceholder({ shot }: { shot: MotionShot }) {
  return <HeroShot shot={shot} />;
}

export function ShotcraftLayer({
  shot,
}: {
  shot: MotionShot | null | undefined;
}) {
  if (!shot?.templateId) return null;
  const Comp =
    SHOTCRAFT_DATA_RENDERERS[shot.templateId] || ShotcraftPlaceholder;
  return <Comp shot={shot} />;
}

export const SHOTCRAFT_REGISTRY_IDS = Object.keys(SHOTCRAFT_DATA_RENDERERS);
