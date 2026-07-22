import React, { useMemo, useState } from "react";
import { GripVertical, Lock, Minus, Plus, Scissors } from "lucide-react";
import {
  framesToSeconds,
  type LumieraEditCommand,
  type LumieraClip,
  type LumieraEditorProject,
} from "./lumieraEditorCore";

type ResizeGesture = {
  clipId: string;
  edge: "start" | "end";
  originX: number;
  initialStart: number;
  initialDuration: number;
  initialSourceStart: number;
  startFrame: number;
  durationInFrames: number;
  sourceStartFrame: number;
  sourceEndFrame: number;
};

export function LumieraEditorTimeline({
  project,
  playheadFrame,
  selectedClipId,
  onPlayheadChange,
  onSelectClip,
  onCommand,
  onAddMotionTemplate,
}: {
  project: LumieraEditorProject;
  playheadFrame: number;
  selectedClipId: string | null;
  onPlayheadChange: (frame: number) => void;
  onSelectClip: (clipId: string) => void;
  onCommand: (command: LumieraEditCommand, summary?: string) => void;
  onAddMotionTemplate?: (templateId: string, startFrame: number) => void;
}) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(96);
  const [dragPreviewFrame, setDragPreviewFrame] = useState<number | null>(null);
  const [resizeGesture, setResizeGesture] = useState<ResizeGesture | null>(null);
  const duration = Math.max(project.fps * 10, project.durationInFrames);
  const seconds = Math.ceil(duration / project.fps);
  const timelineWidth = Math.max(900, Math.ceil(seconds * pixelsPerSecond));
  const rowWidth = 144 + timelineWidth;
  const ruler = useMemo(
    () => Array.from({ length: seconds + 1 }, (_, index) => index),
    [seconds]
  );
  const visualForClip = (assetId?: string) => {
    const asset = assetId ? project.assets.find((item) => item.id === assetId) : undefined;
    return asset?.waveformSource || asset?.thumbnailSources?.[0] || "";
  };

  const displayClip = (clip: LumieraClip) =>
    resizeGesture?.clipId === clip.id
      ? {
          ...clip,
          startFrame: resizeGesture.startFrame,
          durationInFrames: resizeGesture.durationInFrames,
        }
      : clip;

  const resizeClip = (
    event: React.PointerEvent<HTMLSpanElement>,
    clip: LumieraClip
  ) => {
    if (!resizeGesture || resizeGesture.clipId !== clip.id) return;
    const delta = Math.round(
      ((event.clientX - resizeGesture.originX) / timelineWidth) * duration
    );
    const asset = clip.assetId
      ? project.assets.find((item) => item.id === clip.assetId)
      : undefined;
    const trimsSource = clip.type === "video" || clip.type === "audio";
    if (resizeGesture.edge === "start") {
      const minimumDelta = trimsSource
        ? Math.max(-resizeGesture.initialSourceStart, -resizeGesture.initialStart)
        : -resizeGesture.initialStart;
      const appliedDelta = Math.max(
        minimumDelta,
        Math.min(resizeGesture.initialDuration - 1, delta)
      );
      const startFrame = Math.max(0, resizeGesture.initialStart + appliedDelta);
      const durationInFrames = Math.max(
        1,
        resizeGesture.initialDuration - appliedDelta
      );
      const sourceStartFrame = trimsSource
        ? Math.max(0, resizeGesture.initialSourceStart + appliedDelta)
        : 0;
      setResizeGesture((current) =>
        current
          ? {
              ...current,
              startFrame,
              durationInFrames,
              sourceStartFrame,
              sourceEndFrame: sourceStartFrame + durationInFrames,
            }
          : current
      );
      return;
    }
    const sourceAvailable = trimsSource && asset?.durationInFrames
      ? Math.max(1, asset.durationInFrames - resizeGesture.initialSourceStart)
      : Number.POSITIVE_INFINITY;
    const durationInFrames = Math.max(
      1,
      Math.min(sourceAvailable, resizeGesture.initialDuration + delta)
    );
    setResizeGesture((current) =>
      current
        ? {
            ...current,
            durationInFrames,
            sourceEndFrame: current.sourceStartFrame + durationInFrames,
          }
        : current
    );
  };

  const finishResize = (clip: LumieraClip) => {
    if (!resizeGesture || resizeGesture.clipId !== clip.id) return;
    onCommand(
      {
        type: "TRIM_CLIP",
        clipId: clip.id,
        startFrame: resizeGesture.startFrame,
        durationInFrames: resizeGesture.durationInFrames,
        sourceStartFrame: resizeGesture.sourceStartFrame,
        sourceEndFrame: resizeGesture.sourceEndFrame,
      },
      resizeGesture.edge === "start" ? "Aparar início do clip" : "Aparar final do clip"
    );
    setResizeGesture(null);
  };

  const frameFromPointer = (
    event: React.MouseEvent<HTMLDivElement> | React.DragEvent<HTMLDivElement>
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(
        duration,
        Math.round(((event.clientX - bounds.left) / bounds.width) * duration)
      )
    );
  };

  const dropFrame = (
    event: React.DragEvent<HTMLDivElement>,
    trackId: string,
    clipId: string
  ) => {
    const offset = Number(
      event.dataTransfer.getData("application/x-lumiera-offset-frames") || 0
    );
    const candidate = Math.max(0, frameFromPointer(event) - offset);
    if (event.altKey) return candidate;
    const track = project.tracks.find((item) => item.id === trackId);
    const candidates = [0, playheadFrame];
    for (const clip of track?.clips || []) {
      if (clip.id === clipId) continue;
      candidates.push(clip.startFrame, clip.startFrame + clip.durationInFrames);
    }
    const nearestSecond = Math.round(candidate / project.fps) * project.fps;
    candidates.push(nearestSecond);
    const threshold = Math.max(
      1,
      Math.round((6 / timelineWidth) * duration)
    );
    const nearest = candidates.reduce((best, value) =>
      Math.abs(value - candidate) < Math.abs(best - candidate) ? value : best
    , candidates[0] ?? candidate);
    return Math.abs(nearest - candidate) <= threshold ? Math.max(0, nearest) : candidate;
  };

  return (
    <div className="flex h-full flex-col bg-[#090911] text-zinc-300">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 px-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
          Timeline multitrilha
          <span className="font-mono font-normal text-zinc-600">
            {project.fps} fps · {framesToSeconds(duration, project.fps).toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 font-mono text-[9px] text-zinc-600">
            {pixelsPerSecond}px/s · Alt sem snap
          </span>
          <button
            type="button"
            onClick={() => setPixelsPerSecond((value) => Math.max(48, value - 24))}
            className="rounded border border-white/10 p-1 hover:bg-white/5"
            title="Diminuir zoom da timeline"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setPixelsPerSecond((value) => Math.min(240, value + 24))}
            className="rounded border border-white/10 p-1 hover:bg-white/5"
            title="Aumentar zoom da timeline"
          >
            <Plus className="h-3 w-3" />
          </button>
        <button
          type="button"
          disabled={!selectedClipId}
          onClick={() =>
            selectedClipId &&
            onCommand(
              { type: "SPLIT_CLIP", clipId: selectedClipId, frame: playheadFrame },
              "Dividir clip no playhead"
            )
          }
          className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] disabled:opacity-30"
        >
          <Scissors className="h-3 w-3" /> Dividir
        </button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="sticky top-0 z-20 flex h-7 border-b border-white/5 bg-[#0d0d17]"
          style={{ width: rowWidth }}
        >
          <div className="sticky left-0 z-30 w-36 shrink-0 border-r border-white/5 bg-[#0d0d17]" />
          <div
            className="relative shrink-0 cursor-crosshair"
            style={{ width: timelineWidth }}
            onClick={(event) => onPlayheadChange(frameFromPointer(event))}
          >
            {ruler.map((second) => (
              <span
                key={second}
                className="absolute top-1 text-[8px] text-zinc-600"
                style={{ left: `${(second * project.fps * 100) / duration}%` }}
              >
                {second}s
              </span>
            ))}
            <div
              className="absolute inset-y-0 w-px bg-rose-500"
              style={{ left: `${(playheadFrame * 100) / duration}%` }}
            />
          </div>
        </div>
        {project.tracks.map((track) => (
          <div
            key={track.id}
            className="flex h-12 border-b border-white/[0.04]"
            style={{ width: rowWidth }}
          >
            <div className="sticky left-0 z-10 flex w-36 shrink-0 items-center gap-2 border-r border-white/5 bg-[#0c0c16] px-2 text-[10px]">
              <GripVertical className="h-3 w-3 text-zinc-700" />
              <span className="truncate font-semibold">{track.label}</span>
              {track.locked ? <Lock className="ml-auto h-3 w-3" /> : null}
            </div>
            <div
              className="relative shrink-0 bg-[linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px)]"
              style={{
                width: timelineWidth,
                backgroundSize: `${pixelsPerSecond}px 100%`,
              }}
              onClick={(event) => onPlayheadChange(frameFromPointer(event))}
              onDragOver={(event) => {
                event.preventDefault();
                const clipId = event.dataTransfer.getData("application/x-lumiera-clip");
                const hasTemplate = event.dataTransfer.types.includes(
                  "application/x-lumiera-template"
                );
                if (hasTemplate && track.id === "motion") {
                  event.dataTransfer.dropEffect = "copy";
                  setDragPreviewFrame(dropFrame(event, track.id, "new-motion-template"));
                } else if (clipId) {
                  event.dataTransfer.dropEffect = "move";
                  setDragPreviewFrame(dropFrame(event, track.id, clipId));
                } else {
                  event.dataTransfer.dropEffect = "none";
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragPreviewFrame(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const templateId = event.dataTransfer.getData(
                  "application/x-lumiera-template"
                );
                if (templateId && track.id === "motion") {
                  const startFrame = dropFrame(
                    event,
                    track.id,
                    "new-motion-template"
                  );
                  setDragPreviewFrame(null);
                  onAddMotionTemplate?.(templateId, startFrame);
                  return;
                }
                const clipId = event.dataTransfer.getData("application/x-lumiera-clip");
                if (!clipId) return;
                const startFrame = dropFrame(event, track.id, clipId);
                setDragPreviewFrame(null);
                onCommand(
                  { type: "MOVE_CLIP", clipId, startFrame },
                  "Mover clip"
                );
              }}
            >
              {track.clips.map((clip) => {
                const shown = displayClip(clip);
                return (
                <button
                  key={clip.id}
                  type="button"
                  draggable={!clip.locked}
                  onDragStart={(event) => {
                    if (resizeGesture?.clipId === clip.id) {
                      event.preventDefault();
                      return;
                    }
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(
                      0,
                      Math.min(1, (event.clientX - bounds.left) / bounds.width)
                    );
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("application/x-lumiera-clip", clip.id);
                    event.dataTransfer.setData(
                      "application/x-lumiera-offset-frames",
                      String(Math.round(ratio * clip.durationInFrames))
                    );
                  }}
                  onDragEnd={() => setDragPreviewFrame(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                  className={`absolute top-1 h-10 overflow-hidden rounded-md border px-2 text-left text-[9px] shadow-sm ${
                    selectedClipId === clip.id
                      ? "border-white/70 ring-1 ring-white/40"
                      : "border-white/10"
                  }`}
                  style={{
                    left: `${(shown.startFrame * 100) / duration}%`,
                    width: `${Math.max(0.8, (shown.durationInFrames * 100) / duration)}%`,
                    backgroundColor: `${track.color}bb`,
                    backgroundImage: visualForClip(clip.assetId)
                      ? `linear-gradient(${track.color}66,${track.color}99),url("${visualForClip(clip.assetId)}")`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  title={`${clip.label || clip.templateId || clip.type} · ${framesToSeconds(shown.durationInFrames, project.fps)}s — arraste as bordas para aparar`}
                >
                  {!clip.locked ? (
                    <span
                      className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize border-l-2 border-white/70 bg-white/10 opacity-40 transition hover:opacity-100"
                      title="Aparar início"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setResizeGesture({
                          clipId: clip.id,
                          edge: "start",
                          originX: event.clientX,
                          initialStart: clip.startFrame,
                          initialDuration: clip.durationInFrames,
                          initialSourceStart: clip.sourceStartFrame || 0,
                          startFrame: clip.startFrame,
                          durationInFrames: clip.durationInFrames,
                          sourceStartFrame: clip.sourceStartFrame || 0,
                          sourceEndFrame: clip.sourceEndFrame || (clip.sourceStartFrame || 0) + clip.durationInFrames,
                        });
                        onSelectClip(clip.id);
                      }}
                      onPointerMove={(event) => resizeClip(event, clip)}
                      onPointerUp={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        finishResize(clip);
                      }}
                      onPointerCancel={() => setResizeGesture(null)}
                    />
                  ) : null}
                  <span className="block truncate font-semibold text-white">
                    {clip.label || clip.templateId || clip.type}
                  </span>
                  <span className="font-mono text-white/60">
                    {framesToSeconds(shown.durationInFrames, project.fps).toFixed(2)}s
                  </span>
                  {!clip.locked ? (
                    <span
                      className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize border-r-2 border-white/70 bg-white/10 opacity-40 transition hover:opacity-100"
                      title="Aparar final"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setResizeGesture({
                          clipId: clip.id,
                          edge: "end",
                          originX: event.clientX,
                          initialStart: clip.startFrame,
                          initialDuration: clip.durationInFrames,
                          initialSourceStart: clip.sourceStartFrame || 0,
                          startFrame: clip.startFrame,
                          durationInFrames: clip.durationInFrames,
                          sourceStartFrame: clip.sourceStartFrame || 0,
                          sourceEndFrame: clip.sourceEndFrame || (clip.sourceStartFrame || 0) + clip.durationInFrames,
                        });
                        onSelectClip(clip.id);
                      }}
                      onPointerMove={(event) => resizeClip(event, clip)}
                      onPointerUp={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        finishResize(clip);
                      }}
                      onPointerCancel={() => setResizeGesture(null)}
                    />
                  ) : null}
                </button>
                );
              })}
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rose-500"
                style={{ left: `${(playheadFrame * 100) / duration}%` }}
              />
              {dragPreviewFrame !== null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px bg-cyan-300"
                  style={{ left: `${(dragPreviewFrame * 100) / duration}%` }}
                >
                  <span className="absolute left-1 top-0 whitespace-nowrap rounded bg-cyan-950 px-1 py-0.5 font-mono text-[8px] text-cyan-200">
                    {framesToSeconds(dragPreviewFrame, project.fps).toFixed(2)}s
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
