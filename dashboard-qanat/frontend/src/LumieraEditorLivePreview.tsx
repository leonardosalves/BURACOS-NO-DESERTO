import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { ConfigData } from "./appTypes";
import { LumieraCaptionPreview } from "./LumieraCaptionPreview";
import { ShotcraftLivePreview } from "./ShotcraftLivePreview";
import {
  findLumieraClip,
  framesToSeconds,
  resolveAssetSource,
  type LumieraEditorProject,
} from "./lumieraEditorCore";

function SyncedMedia({
  kind,
  source,
  playing,
  time,
  onVideoMetadata,
}: {
  kind: "video" | "audio";
  source: string;
  playing: boolean;
  time: number;
  onVideoMetadata?: (width: number, height: number) => void;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    const media = ref.current;
    if (!media) return;
    if (playing) {
      void media.play().catch(() => undefined);
    } else {
      media.pause();
    }
  }, [playing]);

  useEffect(() => {
    const media = ref.current;
    if (!media) return;
    const current = media.currentTime || 0;
    if (!playing) {
      if (Math.abs(current - time) > 0.05) {
        media.currentTime = Math.max(0, time);
      }
    } else {
      if (Math.abs(current - time) > 0.6) {
        media.currentTime = Math.max(0, time);
      }
    }
  }, [time, playing]);

  return kind === "video" ? (
    <video
      ref={ref as React.RefObject<HTMLVideoElement>}
      src={source}
      className="absolute inset-0 z-0 h-full w-full object-cover"
      muted
      playsInline
      preload="auto"
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (video.videoWidth > 0 && video.videoHeight > 0)
          onVideoMetadata?.(video.videoWidth, video.videoHeight);
        if (Math.abs((video.currentTime || 0) - time) > 0.05) {
          video.currentTime = Math.max(0, time);
        }
      }}
    />
  ) : (
    <audio
      ref={ref as React.RefObject<HTMLAudioElement>}
      src={source}
      preload="auto"
    />
  );
}

function LottieLayer({ source }: { source: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let animation: { destroy: () => void } | undefined;
    let cancelled = false;
    void (async () => {
      if (!containerRef.current || !source) return;
      try {
        const [{ default: lottie }, response] = await Promise.all([
          import("lottie-web"),
          fetch(source),
        ]);
        const animationData = await response.json();
        if (cancelled || !containerRef.current) return;
        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
        });
      } catch {
        /* invalid animation: leave layer empty */
      }
    })();
    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [source]);
  return <div ref={containerRef} className="h-full w-full" />;
}

type VisualTransform = { positionX: number; positionY: number; scale: number };

export function LumieraEditorLivePreview({
  project,
  playheadFrame,
  playing,
  selectedClipId,
  palette,
  onPlayingChange,
  onPlayheadChange,
  onVideoMetadata,
  onVisualTransformChange,
  captionConfig,
  previewMotion,
}: {
  project: LumieraEditorProject;
  playheadFrame: number;
  playing: boolean;
  selectedClipId: string | null;
  palette: Record<string, string>;
  onPlayingChange: (playing: boolean) => void;
  onPlayheadChange: (frame: number) => void;
  onVideoMetadata?: (assetId: string, width: number, height: number) => void;
  onVisualTransformChange?: (
    clipId: string,
    transform: VisualTransform
  ) => void;
  captionConfig?: ConfigData | null;
  previewMotion?: {
    templateId: string;
    palette: Record<string, string>;
    props: Record<string, unknown>;
    durationInFrames: number;
    previewFrame: number;
    label?: string;
  } | null;
}) {
  const activeClips = useMemo(
    () =>
      project.tracks.flatMap((track) =>
        track.clips.filter(
          (clip) =>
            playheadFrame >= clip.startFrame &&
            playheadFrame < clip.startFrame + clip.durationInFrames
        )
      ),
    [playheadFrame, project.tracks]
  );
  const selected = selectedClipId
    ? findLumieraClip(project, selectedClipId)?.clip
    : null;
  const selectedEffect = activeClips.find((clip) => clip.type === "effect");
  const effectKind = String(selectedEffect?.props?.effect || "");
  const effectProgress = selectedEffect
    ? Math.max(
        0,
        Math.min(
          1,
          (playheadFrame - selectedEffect.startFrame) /
            Math.max(1, selectedEffect.durationInFrames - 1)
        )
      )
    : 0;
  const effectScale =
    effectKind === "zoom-in"
      ? 1 + effectProgress * 0.12
      : effectKind === "zoom-out"
        ? 1.12 - effectProgress * 0.12
        : 1;
  const shakeX = effectKind === "shake" ? Math.sin(playheadFrame * 2.7) * 6 : 0;
  const shakeY = effectKind === "shake" ? Math.cos(playheadFrame * 2.1) * 4 : 0;
  const transform = `translate(${shakeX}px, ${shakeY}px) scale(${effectScale})`;
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const transformGestureRef = useRef<{
    clipId: string;
    mode: "move" | "resize";
    originClientX: number;
    originClientY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    originDistance: number;
    positionX: number;
    positionY: number;
    scale: number;
  } | null>(null);
  const [transformGesture, setTransformGesture] = useState(
    transformGestureRef.current
  );
  const [canvasArea, setCanvasArea] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = canvasAreaRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setCanvasArea({ width: bounds.width, height: bounds.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const canvasScale = Math.max(
    0.01,
    Math.min(
      canvasArea.width / Math.max(1, project.width),
      canvasArea.height / Math.max(1, project.height)
    )
  );
  const displayWidth = Math.max(1, Math.floor(project.width * canvasScale));
  const displayHeight = Math.max(1, Math.floor(project.height * canvasScale));
  const formatLabel = project.height > project.width ? "9:16" : "16:9";

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center gap-2 bg-[#080810] p-2">
      <div
        ref={canvasAreaRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      >
        <div
          className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-transform"
          style={{
            width: displayWidth,
            height: displayHeight,
            background: project.background,
            transform,
          }}
        >
          {activeClips.map((clip) => {
            const asset = clip.assetId
              ? project.assets.find((item) => item.id === clip.assetId)
              : undefined;
            const source =
              resolveAssetSource(asset, "preview") || clip.source || "";
            const clipTime = framesToSeconds(
              playheadFrame - clip.startFrame + (clip.sourceStartFrame || 0),
              project.fps
            );
            if (clip.type === "video" && source)
              return (
                <SyncedMedia
                  key={clip.id}
                  kind="video"
                  source={source}
                  playing={playing}
                  time={clipTime}
                  onVideoMetadata={(width, height) =>
                    onVideoMetadata?.(clip.assetId || clip.id, width, height)
                  }
                />
              );
            if (clip.type === "audio" && source)
              return (
                <SyncedMedia
                  key={clip.id}
                  kind="audio"
                  source={source}
                  playing={playing}
                  time={clipTime}
                />
              );
            if (clip.type === "image" && source)
              return (
                <img
                  key={clip.id}
                  src={source}
                  alt={clip.label || "Imagem"}
                  className="absolute inset-0 z-[1] h-full w-full object-cover"
                />
              );
            if (clip.type === "motion-template" && clip.templateId) {
              const activeDrag =
                transformGesture?.clipId === clip.id ? transformGesture : null;
              const positionX =
                activeDrag?.positionX ?? Number(clip.props?.positionX ?? 0.5);
              const positionY =
                activeDrag?.positionY ?? Number(clip.props?.positionY ?? 0.5);
              const scale = activeDrag?.scale ?? Number(clip.props?.scale ?? 1);
              return (
                <React.Fragment key={clip.id}>
                  <ShotcraftLivePreview
                    templateId={clip.templateId}
                    palette={
                      (clip.props?.palette as Record<string, string>) || palette
                    }
                    props={{ ...clip.props, positionX, positionY, scale }}
                    durationSeconds={framesToSeconds(
                      clip.durationInFrames,
                      project.fps
                    )}
                    className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                    autoPlay={false}
                    loop={false}
                    transparent
                    controls={false}
                    compositionWidth={project.width}
                    compositionHeight={project.height}
                    currentFrame={Math.max(0, playheadFrame - clip.startFrame)}
                  />
                  {selectedClipId === clip.id ? (
                    <div
                      className="absolute z-30 cursor-move touch-none rounded-lg border border-indigo-300/80 bg-indigo-400/[0.03] shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
                      style={{
                        width: `${Math.max(12, Math.min(90, 42 * scale))}%`,
                        aspectRatio: "1 / 1",
                        left: `${positionX * 100}%`,
                        top: `${positionY * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      title="Arraste para posicionar; use a alça para redimensionar"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const drag = {
                          clipId: clip.id,
                          mode: "move" as const,
                          originClientX: event.clientX,
                          originClientY: event.clientY,
                          initialX: Math.max(0, Math.min(1, positionX)),
                          initialY: Math.max(0, Math.min(1, positionY)),
                          initialScale: scale,
                          originDistance: 1,
                          positionX: Math.max(0, Math.min(1, positionX)),
                          positionY: Math.max(0, Math.min(1, positionY)),
                          scale,
                        };
                        transformGestureRef.current = drag;
                        setTransformGesture(drag);
                      }}
                      onPointerMove={(event) => {
                        const drag = transformGestureRef.current;
                        if (!drag || drag.clipId !== clip.id) return;
                        const bounds =
                          canvasAreaRef.current?.getBoundingClientRect();
                        if (!bounds) return;
                        const next = {
                          ...drag,
                          positionX:
                            drag.mode === "move"
                              ? Math.max(
                                  0,
                                  Math.min(
                                    1,
                                    drag.initialX +
                                      (event.clientX - drag.originClientX) /
                                        Math.max(1, bounds.width)
                                  )
                                )
                              : drag.positionX,
                          positionY:
                            drag.mode === "move"
                              ? Math.max(
                                  0,
                                  Math.min(
                                    1,
                                    drag.initialY +
                                      (event.clientY - drag.originClientY) /
                                        Math.max(1, bounds.height)
                                  )
                                )
                              : drag.positionY,
                          scale:
                            drag.mode === "resize"
                              ? Math.max(
                                  0.25,
                                  Math.min(
                                    3,
                                    drag.initialScale *
                                      (Math.hypot(
                                        event.clientX -
                                          (bounds.left +
                                            drag.initialX * bounds.width),
                                        event.clientY -
                                          (bounds.top +
                                            drag.initialY * bounds.height)
                                      ) /
                                        Math.max(1, drag.originDistance))
                                  )
                                )
                              : drag.scale,
                        };
                        transformGestureRef.current = next;
                        setTransformGesture(next);
                      }}
                      onPointerUp={(event) => {
                        const drag = transformGestureRef.current;
                        if (drag?.clipId === clip.id) {
                          onVisualTransformChange?.(clip.id, {
                            positionX: drag.positionX,
                            positionY: drag.positionY,
                            scale: drag.scale,
                          });
                        }
                        transformGestureRef.current = null;
                        setTransformGesture(null);
                        event.currentTarget.releasePointerCapture(
                          event.pointerId
                        );
                      }}
                    >
                      <span
                        className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500/80 shadow-lg"
                        style={{
                          left: `${positionX * 100}%`,
                          top: `${positionY * 100}%`,
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Redimensionar Motion Template"
                        className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-sm border-2 border-white bg-indigo-500 shadow-lg"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const bounds =
                            canvasAreaRef.current?.getBoundingClientRect();
                          if (!bounds) return;
                          event.currentTarget.setPointerCapture(
                            event.pointerId
                          );
                          const centerX =
                            bounds.left + positionX * bounds.width;
                          const centerY =
                            bounds.top + positionY * bounds.height;
                          const gesture = {
                            clipId: clip.id,
                            mode: "resize" as const,
                            originClientX: event.clientX,
                            originClientY: event.clientY,
                            initialX: positionX,
                            initialY: positionY,
                            initialScale: scale,
                            originDistance: Math.max(
                              1,
                              Math.hypot(
                                event.clientX - centerX,
                                event.clientY - centerY
                              )
                            ),
                            positionX,
                            positionY,
                            scale,
                          };
                          transformGestureRef.current = gesture;
                          setTransformGesture(gesture);
                        }}
                        onPointerMove={(event) => {
                          const gesture = transformGestureRef.current;
                          const bounds =
                            canvasAreaRef.current?.getBoundingClientRect();
                          if (
                            !gesture ||
                            gesture.clipId !== clip.id ||
                            gesture.mode !== "resize" ||
                            !bounds
                          )
                            return;
                          const centerX =
                            bounds.left + gesture.initialX * bounds.width;
                          const centerY =
                            bounds.top + gesture.initialY * bounds.height;
                          const next = {
                            ...gesture,
                            scale: Math.max(
                              0.25,
                              Math.min(
                                3,
                                (gesture.initialScale *
                                  Math.hypot(
                                    event.clientX - centerX,
                                    event.clientY - centerY
                                  )) /
                                  gesture.originDistance
                              )
                            ),
                          };
                          transformGestureRef.current = next;
                          setTransformGesture(next);
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          const gesture = transformGestureRef.current;
                          if (gesture?.clipId === clip.id)
                            onVisualTransformChange?.(clip.id, {
                              positionX: gesture.positionX,
                              positionY: gesture.positionY,
                              scale: gesture.scale,
                            });
                          transformGestureRef.current = null;
                          setTransformGesture(null);
                          event.currentTarget.releasePointerCapture(
                            event.pointerId
                          );
                        }}
                      />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            }
            if (clip.type === "caption") return null;
            if (clip.type === "text")
              return (
                <div
                  key={clip.id}
                  className="absolute left-1/2 top-[16%] z-20 max-w-[82%] -translate-x-1/2 text-center text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.9)]"
                  style={{
                    color: String(clip.props?.color || palette.text || "#fff"),
                  }}
                >
                  {String(clip.props?.text || clip.label || "Texto")}
                </div>
              );
            if (clip.type === "lottie" && source) {
              const activeTransform =
                transformGesture?.clipId === clip.id ? transformGesture : null;
              const positionX =
                activeTransform?.positionX ??
                Number(clip.props?.positionX ?? 0.5);
              const positionY =
                activeTransform?.positionY ??
                Number(clip.props?.positionY ?? 0.5);
              const scale =
                activeTransform?.scale ?? Number(clip.props?.scale ?? 1);
              return (
                <React.Fragment key={clip.id}>
                  <div
                    className="pointer-events-none absolute inset-[14%] z-10"
                    style={{
                      transform: `translate(${(positionX - 0.5) * 100}%, ${(positionY - 0.5) * 100}%) scale(${scale})`,
                      transformOrigin: "center",
                    }}
                  >
                    <LottieLayer source={source} />
                  </div>
                  {selectedClipId === clip.id ? (
                    <div
                      className="absolute z-30 cursor-move touch-none rounded-lg border border-cyan-300/80 bg-cyan-400/[0.03]"
                      style={{
                        width: `${Math.max(12, Math.min(90, 42 * scale))}%`,
                        aspectRatio: "1 / 1",
                        left: `${positionX * 100}%`,
                        top: `${positionY * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const gesture = {
                          clipId: clip.id,
                          mode: "move" as const,
                          originClientX: event.clientX,
                          originClientY: event.clientY,
                          initialX: positionX,
                          initialY: positionY,
                          initialScale: scale,
                          originDistance: 1,
                          positionX,
                          positionY,
                          scale,
                        };
                        transformGestureRef.current = gesture;
                        setTransformGesture(gesture);
                      }}
                      onPointerMove={(event) => {
                        const gesture = transformGestureRef.current;
                        const bounds =
                          canvasAreaRef.current?.getBoundingClientRect();
                        if (
                          !gesture ||
                          gesture.clipId !== clip.id ||
                          gesture.mode !== "move" ||
                          !bounds
                        )
                          return;
                        const next = {
                          ...gesture,
                          positionX: Math.max(
                            0,
                            Math.min(
                              1,
                              gesture.initialX +
                                (event.clientX - gesture.originClientX) /
                                  bounds.width
                            )
                          ),
                          positionY: Math.max(
                            0,
                            Math.min(
                              1,
                              gesture.initialY +
                                (event.clientY - gesture.originClientY) /
                                  bounds.height
                            )
                          ),
                        };
                        transformGestureRef.current = next;
                        setTransformGesture(next);
                      }}
                      onPointerUp={(event) => {
                        const gesture = transformGestureRef.current;
                        if (gesture?.clipId === clip.id)
                          onVisualTransformChange?.(clip.id, {
                            positionX: gesture.positionX,
                            positionY: gesture.positionY,
                            scale: gesture.scale,
                          });
                        transformGestureRef.current = null;
                        setTransformGesture(null);
                        event.currentTarget.releasePointerCapture(
                          event.pointerId
                        );
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Redimensionar Lottie"
                        className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-sm border-2 border-white bg-cyan-500 shadow-lg"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const bounds =
                            canvasAreaRef.current?.getBoundingClientRect();
                          if (!bounds) return;
                          event.currentTarget.setPointerCapture(
                            event.pointerId
                          );
                          const centerX =
                            bounds.left + positionX * bounds.width;
                          const centerY =
                            bounds.top + positionY * bounds.height;
                          const gesture = {
                            clipId: clip.id,
                            mode: "resize" as const,
                            originClientX: event.clientX,
                            originClientY: event.clientY,
                            initialX: positionX,
                            initialY: positionY,
                            initialScale: scale,
                            originDistance: Math.max(
                              1,
                              Math.hypot(
                                event.clientX - centerX,
                                event.clientY - centerY
                              )
                            ),
                            positionX,
                            positionY,
                            scale,
                          };
                          transformGestureRef.current = gesture;
                          setTransformGesture(gesture);
                        }}
                        onPointerMove={(event) => {
                          const gesture = transformGestureRef.current;
                          const bounds =
                            canvasAreaRef.current?.getBoundingClientRect();
                          if (
                            !gesture ||
                            gesture.clipId !== clip.id ||
                            gesture.mode !== "resize" ||
                            !bounds
                          )
                            return;
                          const distance = Math.hypot(
                            event.clientX -
                              (bounds.left + gesture.initialX * bounds.width),
                            event.clientY -
                              (bounds.top + gesture.initialY * bounds.height)
                          );
                          const next = {
                            ...gesture,
                            scale: Math.max(
                              0.25,
                              Math.min(
                                3,
                                (gesture.initialScale * distance) /
                                  gesture.originDistance
                              )
                            ),
                          };
                          transformGestureRef.current = next;
                          setTransformGesture(next);
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          const gesture = transformGestureRef.current;
                          if (gesture?.clipId === clip.id)
                            onVisualTransformChange?.(clip.id, {
                              positionX: gesture.positionX,
                              positionY: gesture.positionY,
                              scale: gesture.scale,
                            });
                          transformGestureRef.current = null;
                          setTransformGesture(null);
                          event.currentTarget.releasePointerCapture(
                            event.pointerId
                          );
                        }}
                      />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            }
            if (clip.type === "effect") {
              const opacity =
                clip.props?.effect === "fade"
                  ? Math.sin(effectProgress * Math.PI) * 0.72
                  : 0;
              return (
                <div
                  key={clip.id}
                  className="pointer-events-none absolute inset-0 z-40 bg-black"
                  style={{ opacity }}
                />
              );
            }
            return null;
          })}
          {previewMotion ? (
            <>
              <ShotcraftLivePreview
                key={`library-preview-${previewMotion.templateId}`}
                templateId={previewMotion.templateId}
                palette={previewMotion.palette}
                props={{
                  ...previewMotion.props,
                  forceTransparent: true,
                }}
                durationSeconds={framesToSeconds(
                  previewMotion.durationInFrames,
                  project.fps
                )}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                autoPlay
                loop
                transparent
                controls={false}
                compositionWidth={project.width}
                compositionHeight={project.height}
                currentFrame={previewMotion.previewFrame}
              />
              <div className="pointer-events-none absolute right-3 top-3 z-40 rounded-md border border-indigo-300/20 bg-black/65 px-2 py-1 text-[9px] font-semibold text-indigo-100">
                PrÃ©via: {previewMotion.label || previewMotion.templateId} Â·
                transparente
              </div>
            </>
          ) : null}
          <LumieraCaptionPreview
            project={project}
            config={captionConfig}
            playheadFrame={playheadFrame}
            playing={playing}
          />
          {!activeClips.length ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-600">
              Posicione o playhead sobre um clip
            </div>
          ) : null}
          {selected ? (
            <div className="pointer-events-none absolute inset-2 z-40 rounded-lg border border-indigo-400/60" />
          ) : null}
          <div className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-black/60 px-2 py-1 font-mono text-[9px] text-white/70">
            {project.width}×{project.height} · {formatLabel} ·{" "}
            {Math.round(canvasScale * 100)}%
          </div>
        </div>
      </div>
      <div className="flex w-full max-w-5xl shrink-0 items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
        <button
          type="button"
          onClick={() => onPlayingChange(!playing)}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <span className="w-20 text-center font-mono text-[10px] text-zinc-400">
          {framesToSeconds(playheadFrame, project.fps).toFixed(2)}s
        </span>
        <input
          type="range"
          min={0}
          max={project.durationInFrames}
          value={Math.min(playheadFrame, project.durationInFrames)}
          onChange={(event) => onPlayheadChange(Number(event.target.value))}
          className="flex-1 accent-indigo-500"
        />
      </div>
    </div>
  );
}
