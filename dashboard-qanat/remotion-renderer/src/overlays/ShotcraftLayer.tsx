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
  Freeze,
} from "remotion";
import { SHOTCRAFT_DEMO_COMPONENTS } from "./shotcraftDemoImports";
import {
  getParameterizedComponent,
  hasParameterizedVersion,
  isAlwaysParameterized,
} from "./ParameterizedDataTemplates";
import { ShotcraftResponsiveStage } from "./ShotcraftResponsiveStage";

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
  if (!p.title && p.text) p.title = p.text;
  if (!p.text && p.title) p.text = p.title;
  if (!p.label && p.title) p.label = p.title;
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
        templateId={shot.templateId}
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
      templateId={shot.templateId}
      DemoComponent={DemoComponent}
      durationInFrames={durationInFrames}
      palette={shot.palette}
      templateProps={normalizedProps}
    />
  );
}

/** Internal: wraps the real demo with timing, scaling, transparency, and palette */
const ShotcraftDemoRenderer: React.FC<{
  templateId: string;
  DemoComponent: React.ComponentType<any>;
  durationInFrames?: number;
  palette?: MotionShot["palette"];
  templateProps?: Record<string, unknown>;
  isParameterized?: boolean;
}> = ({
  templateId,
  DemoComponent,
  durationInFrames,
  palette,
  templateProps,
  isParameterized,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Duration: use provided or default 4s
  const totalFrames = durationInFrames || Math.round(4 * fps);
  const naturalFrames = Math.round(4 * fps);
  const virtualFrame = Math.min(
    naturalFrames - 1,
    Math.max(0, Math.round((frame / Math.max(1, totalFrames - 1)) * (naturalFrames - 1)))
  );

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
  const requestedOpacity = Number(
    templateProps?.opacity ?? templateProps?.strength ?? 1
  );
  const motionOpacity = Math.max(
    0,
    Math.min(1, Number.isFinite(requestedOpacity) ? requestedOpacity : 1)
  );
  const opacity = Math.min(fadeIn, fadeOut) * motionOpacity;

  // Scale demo (1920×1080) to overlay size

  // Resolve palette colors (niche-based or default)
  const p = palette || {};
  const scPrimary = p.primary || "#F5A623";
  const scAccent = p.accent || "#4A9EFF";
  const scBg = p.bg || "transparent";
  const scText = p.text || "#FFFFFF";
  const scBar = p.bar || scPrimary;
  const scLine = p.line || "rgba(255,255,255,0.15)";
  const normalizedPositionX = Number(templateProps?.positionX ?? 0.5);
  const normalizedPositionY = Number(templateProps?.positionY ?? 0.5);
  const normalizedScale = Number(templateProps?.scale ?? 1);
  const positionX = Math.max(
    0,
    Math.min(1, Number.isFinite(normalizedPositionX) ? normalizedPositionX : 0.5)
  );
  const positionY = Math.max(
    0,
    Math.min(1, Number.isFinite(normalizedPositionY) ? normalizedPositionY : 0.5)
  );
  const userScale = Math.max(
    0.25,
    Math.min(3, Number.isFinite(normalizedScale) ? normalizedScale : 1)
  );

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 40,
        opacity,
        transform: `translate(${(positionX - 0.5) * 100}%, ${(positionY - 0.5) * 100}%) scale(${userScale})`,
        transformOrigin: "center center",
      }}
    >
      <style>{`
        .shotcraft-overlay-root > div {
          background: transparent !important;
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
      <ShotcraftResponsiveStage
        templateId={templateId}
        nativeResponsive={Boolean(isParameterized)}
        background={scBg}
        transparent
        className="shotcraft-overlay-root"
      >
        {isParameterized ? (
          <DemoComponent {...(templateProps || {})} />
        ) : (
          <Freeze frame={virtualFrame}>
            <Suspense fallback={null}>
              <DemoComponent {...(templateProps || {})} />
            </Suspense>
          </Freeze>
        )}
      </ShotcraftResponsiveStage>
    </AbsoluteFill>
  );
};

/** Placeholder export for backward compat — now uses real demos */
export function ShotcraftPlaceholder({ shot }: { shot: MotionShot }) {
  return <ShotcraftLayer shot={shot} />;
}

/** All registered template IDs from the real shotcraft demos */
export const SHOTCRAFT_REGISTRY_IDS = Object.keys(SHOTCRAFT_DEMO_COMPONENTS);
