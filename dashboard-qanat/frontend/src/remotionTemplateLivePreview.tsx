import React, { Component, useEffect, useMemo, useRef, useState } from "react";
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
        ? { width: 360, height: 640, className: "w-[220px] sm:w-[270px]" }
        : {
            width: 640,
            height: 360,
            className: "w-[280px] sm:w-[430px] lg:w-[520px]",
          }
      : vertical
        ? { width: 180, height: 320, className: "w-[92px]" }
        : { width: 320, height: 180, className: "w-[190px]" };

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

  const scrubSecondsDefault = size === "detail" ? 0.8 : 0.55;
  const scrubFrame = Math.min(
    Math.max(sceneDurationFrames - 1, 0),
    Math.max(
      0,
      Math.round(
        (scrubSeconds != null
          ? scrubSeconds
          : fullBleed
            ? 0
            : scrubSecondsDefault) * fps
      )
    )
  );

  const lastSeekFrameRef = useRef<number | null>(null);

  const mergedInputProps = useMemo(() => {
    if (!compiled.ok) return {};
    const { inputProps: exampleProps } = compiled.preview;
    return mergeStudioRenderProps({
      inputProps,
      exampleProps,
      durationInFrames: sceneDurationFrames,
      fps,
    });
  }, [compiled, inputProps, sceneDurationFrames, fps]);

  useEffect(() => {
    lastSeekFrameRef.current = null;
  }, [sourceCode, sceneDurationFrames]);

  /** Em play: drift + player.play() — MP4 no PIP usa acceptableTimeShiftInSeconds. Pausado: seek exato. */
  const timelinePlaying = timelineSynced && autoPlay;
  const driftFrames = Math.max(3, Math.round(fps * 0.35));
  const studioAutoPlay = autoPlay && !timelineSynced;

  useEffect(() => {
    if (!previewMeta) return;
    const player = playerRef.current;
    if (!player) return;

    if (timelinePlaying) {
      const current = player.getCurrentFrame();
      if (Math.abs(current - scrubFrame) > driftFrames) {
        player.seekTo(scrubFrame);
      }
      if (!player.isPlaying()) {
        player.play();
      }
      return;
    }

    if (studioAutoPlay) {
      return;
    }

    if (lastSeekFrameRef.current === scrubFrame) return;
    lastSeekFrameRef.current = scrubFrame;
    player.pause();
    player.seekTo(scrubFrame);
  }, [previewMeta, scrubFrame, timelinePlaying, driftFrames, studioAutoPlay]);

  /**
   * Remotion autoPlay é one-shot (useState) e falha se o Player ainda não montou
   * (lazy IntersectionObserver + compile). Forçamos play() com retry.
   */
  useEffect(() => {
    if (!previewMeta || !studioAutoPlay) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 48;

    const ensurePlaying = () => {
      if (cancelled || attempts >= maxAttempts) return;
      attempts += 1;

      const player = playerRef.current;
      if (!player) {
        requestAnimationFrame(ensurePlaying);
        return;
      }

      if (!player.isPlaying()) {
        player.play();
      }

      if (!cancelled && !player.isPlaying() && attempts < maxAttempts) {
        window.setTimeout(ensurePlaying, 100);
      }
    };

    ensurePlaying();
    return () => {
      cancelled = true;
    };
  }, [previewMeta, studioAutoPlay, sourceCode]);

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

  const { Component } = compiled.preview;

  const geoPipOverlay =
    overlayOnly || (fullBleed && isGeoPipCompositeProps(inputProps));

  const previewStartFrame = !fullBleed
    ? autoPlay
      ? 0
      : Math.min(
          Math.round(fps * (size === "detail" ? 0.8 : 0.55)),
          sceneDurationFrames - 1
        )
    : 0;

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
          autoPlay={studioAutoPlay}
          loop={studioAutoPlay || !timelineSynced}
          clickToPlay={size === "detail"}
          noSuspense
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

export function TemplatePreviewSkeleton({
  format,
  size = "card",
}: {
  format: "9:16" | "16:9";
  size?: "card" | "detail";
}) {
  const vertical = format === "9:16";
  const className =
    size === "detail"
      ? vertical
        ? "w-[154px] sm:w-[190px]"
        : "w-[280px] sm:w-[430px] lg:w-[520px]"
      : vertical
        ? "w-[92px]"
        : "w-[190px]";
  return (
    <div
      className={`animate-pulse rounded-[6px] border border-cyan-300/15 bg-[#0b111b] ${className}`}
      style={{ aspectRatio: vertical ? "9 / 16" : "16 / 9" }}
      aria-hidden
    />
  );
}

type LazySavedTemplatePreviewFrameProps = SavedTemplatePreviewFrameProps & {
  placeholder?: React.ReactNode;
};

/** Monta Player só quando o card entra na viewport (evita crash com dezenas de templates). */
export function LazySavedTemplatePreviewFrame({
  placeholder,
  format = "9:16",
  size = "card",
  ...props
}: LazySavedTemplatePreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const waiting = placeholder ?? (
    <TemplatePreviewSkeleton format={format} size={size} />
  );

  useEffect(() => {
    const node = hostRef.current;
    if (!node || shouldRender) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
        }
      },
      { rootMargin: "320px 0px", threshold: 0.02 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={hostRef} className="min-h-0 min-w-0">
      {shouldRender ? (
        <SavedTemplatePreviewFrame
          format={format}
          size={size}
          fallback={null}
          {...props}
        />
      ) : (
        waiting
      )}
    </div>
  );
}
