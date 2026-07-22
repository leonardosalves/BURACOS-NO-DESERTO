/**
 * ShotcraftLayer.tsx
 * Renderiza motion shots do video-shotcraft sobre a cena.
 *
 * USA OS DEMOS REAIS do video-shotcraft (demos TSX com animações completas).
 * Cada template_id é mapeado para o componente real via shotcraftDemoImports.
 * O demo é renderizado como overlay semi-transparente escalado sobre o asset.
 */
import React, { Suspense } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { SHOTCRAFT_DEMO_COMPONENTS } from "./shotcraftDemoImports";
import {
  getParameterizedComponent,
  hasParameterizedVersion,
  isAlwaysParameterized,
} from "./ParameterizedDataTemplates";

export type MotionShot = {
  templateId: string;
  style?: string;
  props?: Record<string, unknown>;
  /** Duração da animação do template em segundos (overlay temporário). */
  duration_seconds?: number;
  /** Timestamp em segundos onde o overlay deve entrar (sync com narração). */
  start_seconds?: number;
  palette?: {
    primary?: string;
    bg?: string;
    accent?: string;
    text?: string;
    bar?: string;
    line?: string;
  };
};

/** Scale: demo é 1920×1080, renderizamos como overlay centralizado */
const OVERLAY_SCALE = 0.58;
const FADE_FRAMES = 10;

/** Check if shot has meaningful data props worth rendering with parameterized template */
function hasRealDataProps(shot: MotionShot): boolean {
  const p = shot.props || {};
  const value = p.value ?? p.valor;
  if (value != null && value !== "" && Number(value) !== 0) return true;
  if (Array.isArray(p.items) && p.items.length > 0) return true;
  if (Array.isArray(p.dataPoints) && p.dataPoints.length > 0) return true;
  if (Array.isArray(p.columns) && p.columns.length > 0) return true;
  return false;
}

/** Align PT / legacy keys with parameterized template props */
function normalizeShotProps(
  props: Record<string, unknown> | undefined
): Record<string, unknown> {
  const p = { ...(props || {}) };
  if ((p.value == null || p.value === "") && p.valor != null) {
    const n = Number(String(p.valor).replace(/\./g, "").replace(",", "."));
    p.value = Number.isFinite(n) && String(p.valor).trim() !== "" ? n : p.valor;
  }
  if (!p.unit && p.unidade) p.unit = p.unidade;
  if (!p.title && p.label) p.title = p.label;
  if (
    (!Array.isArray(p.items) || !p.items.length) &&
    Array.isArray(p.dataPoints)
  ) {
    p.items = p.dataPoints.map((v: any, i: number) =>
      v && typeof v === "object"
        ? {
            label: v.label || String(i + 1),
            value: Number(v.value ?? v.valor) || 0,
          }
        : { label: String(i + 1), value: Number(v) || 0 }
    );
  }
  if (
    (!Array.isArray(p.items) || !p.items.length) &&
    Array.isArray(p.columns)
  ) {
    p.items = p.columns.map((c: any, i: number) => ({
      label: c?.label || String(i + 1),
      value: Number(c?.value ?? c?.valor) || 0,
    }));
  }
  return p;
}

/**
 * ShotcraftLayer — renderiza o demo REAL do video-shotcraft como overlay.
 * O asset (vídeo/imagem) roda atrás, o template aparece por cima temporariamente.
 * Cores são injetadas via CSS variables a partir da paleta do nicho.
 * Se o shot tem dados reais (props) e existe versão parameterizada, usa ela.
 */
export function ShotcraftLayer({
  shot,
  durationInFrames,
}: {
  shot: MotionShot | null | undefined;
  durationInFrames?: number;
}) {
  if (!shot?.templateId) return null;

  const normalizedProps = normalizeShotProps(shot.props);
  const shotWithProps = { ...shot, props: normalizedProps };

  // Parameterized: real data props, or always-param templates (Phase 5 RVE-inspired)
  const ParamComponent =
    hasParameterizedVersion(shot.templateId) &&
    (hasRealDataProps(shotWithProps) || isAlwaysParameterized(shot.templateId))
      ? getParameterizedComponent(shot.templateId)
      : null;

  if (ParamComponent) {
    return (
      <ShotcraftDemoRenderer
        DemoComponent={ParamComponent as React.ComponentType}
        durationInFrames={durationInFrames}
        palette={shot.palette}
        templateProps={normalizedProps}
        isParameterized
      />
    );
  }

  // Otherwise use the original demo animation
  const DemoComponent = SHOTCRAFT_DEMO_COMPONENTS[shot.templateId];
  if (!DemoComponent) return null;

  return (
    <ShotcraftDemoRenderer
      DemoComponent={DemoComponent}
      durationInFrames={durationInFrames}
      palette={shot.palette}
    />
  );
}

/** Internal: wraps the real demo with timing, scaling, transparency, and palette */
const ShotcraftDemoRenderer: React.FC<{
  DemoComponent: React.ComponentType<any>;
  durationInFrames?: number;
  palette?: MotionShot["palette"];
  templateProps?: Record<string, unknown>;
  isParameterized?: boolean;
}> = ({
  DemoComponent,
  durationInFrames,
  palette,
  templateProps,
  isParameterized,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Duration: use provided or default 4s
  const totalFrames = durationInFrames || Math.round(4 * fps);

  // Don't render outside the overlay window
  if (frame > totalFrames) return null;

  // Fade in / fade out
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeOut = interpolate(
    frame,
    [totalFrames - FADE_FRAMES, totalFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Scale demo (1920×1080) to overlay size
  const scaleX = (width * OVERLAY_SCALE) / 1920;
  const scaleY = (height * OVERLAY_SCALE) / 1080;
  const scale = Math.min(scaleX, scaleY);

  // Resolve palette colors (niche-based or default)
  const p = palette || {};
  const scPrimary = p.primary || "#F5A623";
  const scAccent = p.accent || "#4A9EFF";
  const scBg = p.bg || "rgba(10, 10, 18, 0.82)";
  const scText = p.text || "#FFFFFF";
  const scBar = p.bar || scPrimary;
  const scLine = p.line || "rgba(255,255,255,0.15)";

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 12px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Override demo colors with niche palette via CSS variables */}
        <style>{`
          .shotcraft-overlay-root > div {
            background: ${scBg} !important;
            color: ${scText} !important;
          }
          .shotcraft-overlay-root * {
            --sc-primary: ${scPrimary};
            --sc-accent: ${scAccent};
            --sc-bg: ${scBg};
            --sc-text: ${scText};
            --sc-bar: ${scBar};
            --sc-line: ${scLine};
            --sc-ink: ${scText};
          }
        `}</style>
        <div
          className="shotcraft-overlay-root"
          style={{ width: "100%", height: "100%" }}
        >
          {isParameterized ? (
            <DemoComponent {...(templateProps || {})} />
          ) : (
            <Suspense fallback={null}>
              <DemoComponent />
            </Suspense>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Placeholder export for backward compat — now uses real demos */
export function ShotcraftPlaceholder({ shot }: { shot: MotionShot }) {
  return <ShotcraftLayer shot={shot} />;
}

/** All registered template IDs from the real shotcraft demos */
export const SHOTCRAFT_REGISTRY_IDS = Object.keys(SHOTCRAFT_DEMO_COMPONENTS);
