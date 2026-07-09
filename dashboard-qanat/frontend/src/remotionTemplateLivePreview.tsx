import React, { Component, useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import * as Remotion from "remotion";
import {
  compileSavedTemplateSource,
  isGeoPipCompositeProps,
  mergeStudioRenderProps,
} from "@lumiera/shared/remotionTemplateCompile.js";

export { compileSavedTemplateSource };

class LivePreviewErrorBoundary extends Component<
  {
    fallback: React.ReactNode;
    children: React.ReactNode;
    dimensionsClassName?: string;
    aspectRatio?: string;
  },
  { error: Error | null }
> {
  state = { error: null };

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
      if (this.props.fallback) return this.props.fallback;
      const fullBleed = !this.props.dimensionsClassName;
      return (
        <div
          className={
            fullBleed
              ? "absolute inset-0 z-50 grid place-items-center bg-red-950/40 p-3 text-center pointer-events-none"
              : `grid place-items-center rounded-[6px] border border-red-400/30 bg-red-500/10 p-3 text-center ${this.props.dimensionsClassName || ""}`
          }
          style={
            fullBleed ? undefined : { aspectRatio: this.props.aspectRatio }
          }
        >
          <p className="text-[10px] font-bold leading-relaxed text-red-200">
            Preview falhou durante a renderizacao
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-red-200/80">
            {this.state.error.message || "Erro desconhecido no template."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export type CompiledTemplatePreview = {
  Component: React.ComponentType<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
};

export type CompileTemplateResult =
  { ok: true; preview: CompiledTemplatePreview } | { ok: false; error: string };

type SavedTemplatePreviewFrameProps = {
  sourceCode: string;
  format: "9:16" | "16:9";
  size?: "card" | "detail";
  autoPlay?: boolean;
  fallback?: React.ReactNode;
  inputProps?: Record<string, unknown>;
  /** Duração da cena em segundos — animação usa exatamente esse tempo. */
  durationSeconds?: number;
  /** Segundos dentro da cena (scrub da timeline) quando pausado. */
  scrubSeconds?: number;
  /** Ocupa 100% do container (Timeline Studio), sem caixa reduzida. */
  fullBleed?: boolean;
  /** PIP geo: só chrome do template; mapa renderizado em camada separada. */
  overlayOnly?: boolean;
};

export function SavedTemplatePreviewFrame({
  sourceCode,
  format,
  size = "card",
  autoPlay = false,
  fallback = null,
  inputProps = {},
  durationSeconds,
  scrubSeconds,
  fullBleed = false,
  overlayOnly = false,
}: SavedTemplatePreviewFrameProps) {
  const playerRef = useRef<PlayerRef>(null);
  const vertical = format === "9:16";
  const dimensions =
    size === "detail"
      ? vertical
        ? { width: 1080, height: 1920, className: "w-[220px] sm:w-[270px]" }
        : {
            width: 1920,
            height: 1080,
            className: "w-[280px] sm:w-[430px] lg:w-[520px]",
          }
      : vertical
        ? { width: 1080, height: 1920, className: "w-[92px]" }
        : { width: 1920, height: 1080, className: "w-[190px]" };

  const compiled = useMemo(
    () => compileSavedTemplateSource(sourceCode, { React, Remotion }),
    [sourceCode]
  );

  const previewMeta = compiled.ok ? compiled.preview : null;
  const fps = previewMeta?.fps ?? 30;
  const sceneDurationFrames =
    Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
      ? Math.max(1, Math.round(Number(durationSeconds) * fps))
      : (previewMeta?.durationInFrames ?? 90);

  const timelineSynced = scrubSeconds != null;

  const scrubFrame = Math.min(
    Math.max(sceneDurationFrames - 1, 0),
    Math.max(
      0,
      Math.round(
        (scrubSeconds != null ? scrubSeconds : fullBleed ? 0 : fps * 0.8) * fps
      )
    )
  );

  useEffect(() => {
    if (!previewMeta) return;
    playerRef.current?.seekTo(scrubFrame);
  }, [previewMeta, scrubFrame]);

  if (compiled.ok === false) {
    if (fallback) {
      return (
        <div className="space-y-2">
          {fallback}
          <p className="text-center text-[10px] font-bold leading-relaxed text-amber-200">
            Preview ao vivo falhou — mostrando mock. {compiled.error}
          </p>
        </div>
      );
    }
    return (
      <div
        className={
          fullBleed
            ? "absolute inset-0 z-50 grid place-items-center bg-red-950/40 p-3 text-center pointer-events-none"
            : `grid place-items-center rounded-[6px] border border-red-400/30 bg-red-500/10 p-3 text-center ${dimensions.className}`
        }
        style={
          fullBleed
            ? undefined
            : { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
        }
      >
        <p className="text-[10px] font-bold leading-relaxed text-red-200">
          Preview ao vivo indisponivel
        </p>
        <p className="mt-1 text-[9px] leading-relaxed text-red-200/80">
          {compiled.error}
        </p>
      </div>
    );
  }

  const { Component, inputProps: exampleProps } = compiled.preview;

  const mergedInputProps = mergeStudioRenderProps({
    inputProps,
    exampleProps,
    durationInFrames: sceneDurationFrames,
    fps,
  });

  const geoPipOverlay =
    overlayOnly || (fullBleed && isGeoPipCompositeProps(inputProps));

  const previewStartFrame =
    size === "detail" && !fullBleed
      ? Math.min(Math.round(fps * 0.8), sceneDurationFrames - 1)
      : scrubFrame;

  const player = (
    <LivePreviewErrorBoundary
      fallback={fallback}
      dimensionsClassName={fullBleed ? undefined : dimensions.className}
      aspectRatio={`${dimensions.width} / ${dimensions.height}`}
    >
      <div
        className={
          fullBleed
            ? "absolute inset-0 z-40 overflow-hidden pointer-events-none"
            : `overflow-hidden rounded-[6px] border border-white/10 bg-[#0b111b] shadow-lg shadow-black/30 ${dimensions.className}`
        }
        style={
          fullBleed
            ? undefined
            : { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
        }
      >
        <Player
          ref={playerRef}
          component={Component}
          inputProps={mergedInputProps}
          durationInFrames={sceneDurationFrames}
          fps={fps}
          compositionWidth={dimensions.width}
          compositionHeight={dimensions.height}
          initialFrame={previewStartFrame}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: geoPipOverlay ? "transparent" : undefined,
          }}
          controls={size === "detail" && !fullBleed}
          autoPlay={timelineSynced ? false : autoPlay}
          loop={!timelineSynced}
          acknowledgeRemotionLicense
          errorFallback={({ error }) => (
            <div className="grid h-full w-full place-items-center bg-red-950/20 p-3 text-center">
              <div>
                <p className="text-[10px] font-bold leading-relaxed text-red-200">
                  Preview falhou no Remotion Player
                </p>
                <p className="mt-1 text-[9px] leading-relaxed text-red-200/80">
                  {error.message || "Erro desconhecido no template."}
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </LivePreviewErrorBoundary>
  );

  return player;
}
