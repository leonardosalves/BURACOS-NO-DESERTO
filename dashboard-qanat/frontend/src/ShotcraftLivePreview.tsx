/**
 * ShotcraftLivePreview — Remotion Player preview for shotcraft templates.
 * Full-frame demos (not the scaled render overlay) + niche palette CSS vars.
 */
import React, { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";
import { SHOTCRAFT_DEMO_COMPONENTS } from "@lumiera/overlays/shotcraftDemoImports.tsx";
import {
  getParameterizedComponent,
  hasParameterizedVersion,
  isAlwaysParameterized,
} from "@lumiera/overlays/ParameterizedDataTemplates.tsx";
import { ShotcraftResponsiveStage } from "@lumiera/overlays/ShotcraftResponsiveStage.tsx";
import { ShotcraftLayer } from "@lumiera/overlays/ShotcraftLayer.tsx";

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: { children: React.ReactNode }) {
    if (prevProps.children !== this.props.children) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 grid place-items-center bg-red-950/50 p-4 text-center">
          <p className="text-xs font-bold text-red-200">Preview falhou</p>
          <p className="mt-1 text-[10px] text-red-200/80 max-w-sm">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export type ShotcraftPreviewPalette = {
  primary?: string;
  accent?: string;
  bg?: string;
  text?: string;
  bar?: string;
  line?: string;
};

type CompositionProps = {
  templateId: string;
  palette: ShotcraftPreviewPalette;
  templateProps: Record<string, unknown>;
  useParameterized: boolean;
  transparent: boolean;
};

/** Uses the exact render component so editor and final output cannot drift. */
const ShotcraftRenderParityComposition: React.FC<CompositionProps> = ({
  templateId,
  palette,
  templateProps,
  transparent,
}) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : "#05050a" }}>
      <ShotcraftLayer
        shot={{ templateId, palette, props: templateProps }}
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
};

const ShotcraftPreviewComposition: React.FC<CompositionProps> = ({
  templateId,
  palette,
  templateProps,
  useParameterized,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const naturalFrames = Math.round(4 * fps);
  const virtualFrame = Math.min(
    naturalFrames - 1,
    Math.max(
      0,
      Math.round((frame / Math.max(1, durationInFrames - 1)) * (naturalFrames - 1))
    )
  );
  const p = palette || {};
  const scPrimary = p.primary || "#F5A623";
  const scAccent = p.accent || "#4A9EFF";
  const scBg = transparent ? "transparent" : p.bg || "rgba(10, 10, 18, 0.92)";
  const scText = p.text || "#FFFFFF";
  const scBar = p.bar || scPrimary;
  const scLine = p.line || "rgba(255,255,255,0.15)";

  const Param =
    useParameterized && hasParameterizedVersion(templateId)
      ? getParameterizedComponent(templateId)
      : null;
  const Demo = Param || SHOTCRAFT_DEMO_COMPONENTS[templateId] || null;

  if (!Demo) {
    return (
      <AbsoluteFill
        style={{
          background: scBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: scText,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        Template não encontrado: {templateId}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : "#05050a" }}>
      <style>{`
        .shotcraft-preview-root,
        .shotcraft-preview-root * {
          --sc-primary: ${scPrimary};
          --sc-accent: ${scAccent};
          --sc-bg: ${scBg};
          --sc-text: ${scText};
          --sc-bar: ${scBar};
          --sc-line: ${scLine};
          --sc-ink: ${scText};
        }
        .shotcraft-preview-root > div {
          background: ${scBg} !important;
        }
      `}</style>
      <ShotcraftResponsiveStage
        templateId={templateId}
        nativeResponsive={Boolean(Param)}
        background={scBg}
        transparent={transparent}
        className="shotcraft-preview-root"
      >
        {Param ? (
          <Demo {...templateProps} />
        ) : (
          <Freeze frame={virtualFrame}>
          <Suspense
            fallback={
              <AbsoluteFill
                style={{
                  background: scBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: scText,
                  fontSize: 32,
                }}
              >
                Carregando animação…
              </AbsoluteFill>
            }
          >
            <Demo />
          </Suspense>
          </Freeze>
        )}
      </ShotcraftResponsiveStage>
    </AbsoluteFill>
  );
};

function hasRealDataProps(props: Record<string, unknown>): boolean {
  if (props.value != null && props.value !== "" && Number(props.value) !== 0) {
    return true;
  }
  if (Array.isArray(props.items) && props.items.length > 0) return true;
  return false;
}

export type ShotcraftLivePreviewProps = {
  templateId: string | null | undefined;
  palette?: ShotcraftPreviewPalette | null;
  props?: Record<string, unknown>;
  durationSeconds?: number;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  transparent?: boolean;
  controls?: boolean;
  compositionWidth?: number;
  compositionHeight?: number;
  currentFrame?: number;
};

export function ShotcraftLivePreview({
  templateId,
  palette,
  props = {},
  durationSeconds = 4,
  className = "",
  autoPlay = true,
  loop = true,
  transparent = false,
  controls = true,
  compositionWidth = 1920,
  compositionHeight = 1080,
  currentFrame,
}: ShotcraftLivePreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const fps = 30;
  const durationInFrames = Math.max(
    Math.round((durationSeconds || 4) * fps),
    1
  );

  const cleanProps = useMemo(() => {
    const next: Record<string, unknown> = { ...props };
    if (next.value != null && next.value !== "") {
      const n = Number(next.value);
      if (!Number.isNaN(n)) next.value = n;
    }
    // Map PT keys from extracted_data if present
    if (next.value == null && next.valor != null) {
      const n = Number(next.valor);
      next.value = Number.isNaN(n) ? next.valor : n;
    }
    if (!next.unit && next.unidade) next.unit = next.unidade;
    return next;
  }, [props]);

  const useParameterized =
    Boolean(templateId) &&
    hasParameterizedVersion(templateId!) &&
    (hasRealDataProps(cleanProps) || isAlwaysParameterized(templateId!));

  const inputProps = useMemo(
    () => ({
      templateId: templateId || "",
      palette: palette || {},
      templateProps: cleanProps,
      useParameterized,
      transparent,
    }),
    [templateId, palette, cleanProps, useParameterized, transparent]
  );

  useEffect(() => {
    if (currentFrame == null) return;
    playerRef.current?.seekTo(
      Math.max(0, Math.min(durationInFrames - 1, Math.round(currentFrame)))
    );
  }, [currentFrame, durationInFrames, templateId]);

  if (!templateId) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/10 bg-[#0c0c18] text-gray-500 text-sm ${className}`}
      >
        Selecione um template
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${transparent ? "border-0 bg-transparent" : "rounded-xl border border-white/10 bg-black"} ${className}`}
    >
      <PreviewErrorBoundary>
        <Player
          ref={playerRef}
          component={ShotcraftRenderParityComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          fps={fps}
          style={{ width: "100%", height: "100%" }}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          clickToPlay
          acknowledgeRemotionLicense
        />
      </PreviewErrorBoundary>
    </div>
  );
}
