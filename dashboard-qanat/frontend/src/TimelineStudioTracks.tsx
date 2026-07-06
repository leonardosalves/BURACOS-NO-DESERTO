import React, { useMemo, useRef } from "react";
import {
  clipsOnTrack,
  formatStudioTime,
  type StudioClip,
  type StudioTrack,
  type TimelineStudioState,
} from "./timelineStudioTypes";

type Props = {
  studio: TimelineStudioState;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onPlayheadChange: (sec: number) => void;
  onZoomChange: (zoom: number) => void;
};

const RULER_HEIGHT = 28;

export function TimelineStudioTracks({
  studio,
  selectedClipId,
  onSelectClip,
  onPlayheadChange,
  onZoomChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pps = (studio.pixelsPerSecond || 40) * studio.zoom;
  const totalDur = studio.totalDuration || 120;
  const timelineWidth = Math.max(totalDur * pps + 120, 800);

  const playheadX = studio.playhead * pps;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0) - 88;
    const sec = Math.max(0, Math.min(totalDur, x / pps));
    onPlayheadChange(sec);
  };

  const ticks = useMemo(() => {
    const step = studio.zoom >= 1.5 ? 5 : studio.zoom >= 0.8 ? 10 : 30;
    const items: number[] = [];
    for (let t = 0; t <= totalDur; t += step) items.push(t);
    return items;
  }, [totalDur, studio.zoom]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Timeline multi-trilha
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-mono">
            {formatStudioTime(studio.playhead)} / {formatStudioTime(totalDur)}
          </span>
          <input
            type="range"
            min={0.4}
            max={2.5}
            step={0.1}
            value={studio.zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-20 h-1 accent-gold-500"
            title="Zoom"
          />
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: timelineWidth + 88, minWidth: "100%" }}>
          <div
            className="relative flex border-b border-zinc-800/50 cursor-pointer select-none"
            style={{ height: RULER_HEIGHT, marginLeft: 88 }}
            onClick={handleRulerClick}
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-zinc-700/40"
                style={{ left: t * pps }}
              >
                <span className="absolute top-1 left-1 text-[9px] text-zinc-500 font-mono">
                  {formatStudioTime(t)}
                </span>
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gold-400 z-20 pointer-events-none"
              style={{ left: playheadX }}
            >
              <div className="absolute -top-0.5 -left-1.5 w-3 h-3 bg-gold-400 rotate-45" />
            </div>
          </div>

          {studio.tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              clips={clipsOnTrack(studio.clips, track.id)}
              pps={pps}
              timelineWidth={timelineWidth}
              selectedClipId={selectedClipId}
              playhead={studio.playhead}
              onSelectClip={onSelectClip}
              onPlayheadChange={onPlayheadChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  clips,
  pps,
  timelineWidth,
  selectedClipId,
  playhead,
  onSelectClip,
  onPlayheadChange,
}: {
  track: StudioTrack;
  clips: StudioClip[];
  pps: number;
  timelineWidth: number;
  selectedClipId: string | null;
  playhead: number;
  onSelectClip: (id: string | null) => void;
  onPlayheadChange: (sec: number) => void;
}) {
  const h = track.height || 36;
  const color = track.color || "#64748b";

  return (
    <div
      className="flex border-b border-zinc-800/40 hover:bg-zinc-900/20"
      style={{ height: h }}
    >
      <div
        className="shrink-0 w-[88px] px-2 flex items-center gap-1.5 border-r border-zinc-800/50 bg-zinc-900/30"
        title={track.label}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-[9px] font-semibold text-zinc-400 truncate leading-tight">
          {track.label}
        </span>
      </div>
      <div
        className="relative flex-1 cursor-crosshair"
        style={{ width: timelineWidth }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            onPlayheadChange(Math.max(0, x / pps));
            onSelectClip(null);
          }
        }}
      >
        {clips.map((clip) => {
          const left = clip.start * pps;
          const width = Math.max(clip.duration * pps, 6);
          const selected = selectedClipId === clip.id;
          const active =
            playhead >= clip.start && playhead < clip.start + clip.duration;
          return (
            <button
              key={clip.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectClip(clip.id);
                onPlayheadChange(clip.start);
              }}
              className={`absolute top-1 bottom-1 rounded-md px-1.5 text-left overflow-hidden border transition ${
                selected ? "ring-2 ring-gold-400/80 z-10" : ""
              } ${active ? "opacity-100" : "opacity-85 hover:opacity-100"}`}
              style={{
                left,
                width,
                backgroundColor: `${clip.color || color}33`,
                borderColor: `${clip.color || color}66`,
              }}
              title={`${clip.label || clip.id} · ${formatStudioTime(clip.start)}`}
            >
              <span
                className="block text-[8px] font-bold truncate"
                style={{ color: clip.color || color }}
              >
                {track.type === "captions"
                  ? String(clip.props?.text || clip.label || "…").slice(0, 24)
                  : clip.label ||
                    clip.templateId ||
                    clip.source?.split("/").pop() ||
                    "clip"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
