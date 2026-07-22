/**
 * ShotcraftLivePreview — Remotion Player preview for shotcraft templates.
 * Full-frame demos (not the scaled render overlay) + niche palette CSS vars.
 */
import React, { Component, Suspense, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import { SHOTCRAFT_DEMO_COMPONENTS } from "@lumiera/overlays/shotcraftDemoImports.tsx";
import {
  getParameterizedComponent,
  hasParameterizedVersion,
} from "@lumiera/overlays/ParameterizedDataTemplates.tsx";

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
};

const ShotcraftPreviewComposition: React.FC<CompositionProps> = ({
  templateId,
  palette,
  templateProps,
  useParameterized,
}) => {
  const p = palette || {};
  const scPrimary = p.primary || "#F5A623";
  const scAccent = p.accent || "#4A9EFF";
  const scBg = p.bg || "rgba(10, 10, 18, 0.92)";
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
    <AbsoluteFill style={{ background: "#05050a" }}>
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
      <div
        className="shotcraft-preview-root"
        style={{ width: "100%", height: "100%" }}
      >
        {Param ? (
          <Demo {...templateProps} />
        ) : (
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
        )}
      </div>
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
};

export function ShotcraftLivePreview({
  templateId,
  palette,
  props = {},
  durationSeconds = 4,
  className = "",
  autoPlay = true,
  loop = true,
}: ShotcraftLivePreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const fps = 30;
  const durationInFrames = Math.max(
    Math.round((durationSeconds || 4) * fps),
    fps
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
    hasRealDataProps(cleanProps);

  const inputProps = useMemo(
    () => ({
      templateId: templateId || "",
      palette: palette || {},
      templateProps: cleanProps,
      useParameterized,
    }),
    [templateId, palette, cleanProps, useParameterized]
  );

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
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}
    >
      <PreviewErrorBoundary>
        <Player
          ref={playerRef}
          component={ShotcraftPreviewComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          style={{ width: "100%", height: "100%" }}
          controls
          autoPlay={autoPlay}
          loop={loop}
          clickToPlay
          acknowledgeRemotionLicense
        />
      </PreviewErrorBoundary>
    </div>
  );
}
