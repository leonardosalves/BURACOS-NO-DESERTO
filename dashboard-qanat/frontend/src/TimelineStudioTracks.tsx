import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatStudioTime,
  type StudioClip,
  type StudioTrack,
  type TimelineStudioState,
} from "./timelineStudioTypes";
import { isClipEditable, moveClip, resizeClip } from "./timelineStudioClipOps";

type Props = {
  studio: TimelineStudioState;
  selectedClipId: string | null;
  scrollToTrackId?: string | null;
  onScrollToTrackDone?: () => void;
  onSelectClip: (id: string | null) => void;
  onPlayheadChange: (sec: number) => void;
  onZoomChange: (zoom: number) => void;
  onClipsChange: (clips: StudioClip[]) => void;
};

type DragState = {
  clipId: string;
  type: "move" | "resize-left" | "resize-right";
  initialX: number;
  initialStart: number;
  initialDuration: number;
};

const RULER_HEIGHT = 28;
const TRACK_LABEL_WIDTH = 88;
const VIRTUAL_OVERSCAN_PX = 700;
/** Remotion primeiro — evita trilhas roxa/verde ficarem abaixo do fold sem scroll. */
const TRACK_DISPLAY_ORDER = [
  "voice",
  "motion",
  "overlays",
  "video",
  "sfx",
  "music",
  "captions",
];

function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || "#64748b").replace("#", "");
  if (raw.length !== 6) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type VisibleWindow = {
  leftPx: number;
  rightPx: number;
};

export function TimelineStudioTracks({
  studio,
  selectedClipId,
  scrollToTrackId,
  onScrollToTrackDone,
  onSelectClip,
  onPlayheadChange,
  onZoomChange,
  onClipsChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollRafRef = useRef(0);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [visibleWindow, setVisibleWindow] = useState<VisibleWindow>({
    leftPx: 0,
    rightPx: 2200,
  });
  const pps = (studio.pixelsPerSecond || 40) * studio.zoom;
  const totalDur = studio.totalDuration || 120;
  const timelineWidth = Math.max(totalDur * pps + 120, 800);

  const playheadX = studio.playhead * pps;

  const syncVisibleWindow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timelineLeft = Math.max(0, el.scrollLeft - TRACK_LABEL_WIDTH);
    const timelineRight = timelineLeft + el.clientWidth + TRACK_LABEL_WIDTH;
    setVisibleWindow({
      leftPx: Math.max(0, timelineLeft - VIRTUAL_OVERSCAN_PX),
      rightPx: timelineRight + VIRTUAL_OVERSCAN_PX,
    });
  }, []);

  useEffect(() => {
    syncVisibleWindow();
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, [syncVisibleWindow, timelineWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const playheadPx = studio.playhead * pps + TRACK_LABEL_WIDTH;
    const target = Math.max(0, playheadPx - el.clientWidth * 0.35);
    if (Math.abs(el.scrollLeft - target) > 48) {
      el.scrollLeft = target;
      syncVisibleWindow();
    }
  }, [studio.playhead, pps, syncVisibleWindow]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(syncVisibleWindow);
  }, [syncVisibleWindow]);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x =
      e.clientX -
      rect.left +
      (scrollRef.current?.scrollLeft || 0) -
      TRACK_LABEL_WIDTH;
    const sec = Math.max(0, Math.min(totalDur, x / pps));
    onPlayheadChange(sec);
  };

  const ticks = useMemo(() => {
    const step = studio.zoom >= 1.5 ? 5 : studio.zoom >= 0.8 ? 10 : 30;
    const items: number[] = [];
    for (let t = 0; t <= totalDur; t += step) items.push(t);
    return items;
  }, [totalDur, studio.zoom]);

  const displayTracks = useMemo(() => {
    const byId = new Map(studio.tracks.map((t) => [t.id, t]));
    const ordered = TRACK_DISPLAY_ORDER.map((id) => byId.get(id)).filter(
      Boolean
    ) as StudioTrack[];
    const rest = studio.tracks.filter(
      (t) => !TRACK_DISPLAY_ORDER.includes(t.id)
    );
    return [...ordered, ...rest];
  }, [studio.tracks]);

  const clipsByTrack = useMemo(() => {
    const grouped = new Map<string, StudioClip[]>();
    for (const track of studio.tracks) grouped.set(track.id, []);
    for (const clip of studio.clips) {
      const list = grouped.get(clip.trackId);
      if (list) list.push(clip);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.start - b.start);
    }
    return grouped;
  }, [studio.clips, studio.tracks]);

  useEffect(() => {
    if (!scrollToTrackId) return;
    const row = trackRowRefs.current.get(scrollToTrackId);
    const container = scrollRef.current;
    if (!row || !container) return;
    const rowTop = row.offsetTop;
    container.scrollTo({ top: Math.max(0, rowTop - 8), behavior: "smooth" });
    onScrollToTrackDone?.();
  }, [scrollToTrackId, displayTracks, onScrollToTrackDone]);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const deltaX = e.clientX - dragging.initialX;
      const deltaSec = deltaX / pps;

      if (dragging.type === "move") {
        const next = moveClip(
          studio.clips,
          dragging.clipId,
          dragging.initialStart + deltaSec,
          totalDur
        );
        onClipsChange(next);
        return;
      }

      const edge = dragging.type === "resize-left" ? "left" : "right";
      const next = resizeClip(
        studio.clips,
        dragging.clipId,
        edge,
        deltaSec,
        totalDur
      );
      onClipsChange(next);
    },
    [dragging, onClipsChange, pps, studio.clips, totalDur]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e);
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleDragMove]);

  const startDrag = (
    e: React.MouseEvent,
    clip: StudioClip,
    type: DragState["type"]
  ) => {
    if (!isClipEditable(clip)) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.id);
    setDragging({
      clipId: clip.id,
      type,
      initialX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
    });
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Timeline multi-trilha
          </span>
          <span className="text-[9px] text-zinc-600">
            Arraste clips · redimensione pelas bordas · Delete remove
          </span>
        </div>
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

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto max-h-[min(52vh,440px)]"
        onScroll={handleScroll}
      >
        <div
          style={{ width: timelineWidth + TRACK_LABEL_WIDTH, minWidth: "100%" }}
        >
          <div
            className="relative flex border-b border-zinc-800/50 cursor-pointer select-none"
            style={{ height: RULER_HEIGHT, marginLeft: TRACK_LABEL_WIDTH }}
            onClick={handleRulerClick}
          >
            {ticks
              .filter((t) => {
                const x = t * pps;
                return x >= visibleWindow.leftPx && x <= visibleWindow.rightPx;
              })
              .map((t) => (
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

          {displayTracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              clips={clipsByTrack.get(track.id) || []}
              pps={pps}
              timelineWidth={timelineWidth}
              visibleWindow={visibleWindow}
              selectedClipId={selectedClipId}
              playhead={studio.playhead}
              isDragging={dragging !== null}
              rowRef={(el) => {
                if (el) trackRowRefs.current.set(track.id, el);
                else trackRowRefs.current.delete(track.id);
              }}
              onSelectClip={onSelectClip}
              onPlayheadChange={onPlayheadChange}
              onStartDrag={startDrag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const TrackRow = React.memo(function TrackRow({
  track,
  clips,
  pps,
  timelineWidth,
  visibleWindow,
  selectedClipId,
  playhead,
  isDragging,
  rowRef,
  onSelectClip,
  onPlayheadChange,
  onStartDrag,
}: {
  track: StudioTrack;
  clips: StudioClip[];
  pps: number;
  timelineWidth: number;
  visibleWindow: VisibleWindow;
  selectedClipId: string | null;
  playhead: number;
  isDragging: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
  onSelectClip: (id: string | null) => void;
  onPlayheadChange: (sec: number) => void;
  onStartDrag: (
    e: React.MouseEvent,
    clip: StudioClip,
    type: DragState["type"]
  ) => void;
}) {
  const h =
    track.id === "motion" || track.id === "overlays"
      ? Math.max(track.height || 36, 44)
      : track.height || 36;
  const color = track.color || "#64748b";
  const isRemotionRow = track.id === "motion" || track.id === "overlays";
  const visibleClips = useMemo(
    () =>
      isRemotionRow
        ? clips
        : clips.filter((clip) => {
            const left = clip.start * pps;
            const right = left + Math.max(clip.duration * pps, 6);
            const selected = selectedClipId === clip.id;
            const active =
              playhead >= clip.start && playhead < clip.start + clip.duration;
            return (
              selected ||
              active ||
              (right >= visibleWindow.leftPx && left <= visibleWindow.rightPx)
            );
          }),
    [
      clips,
      isRemotionRow,
      playhead,
      pps,
      selectedClipId,
      visibleWindow.leftPx,
      visibleWindow.rightPx,
    ]
  );

  return (
    <div
      ref={rowRef}
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
          {clips.length > 0 ? (
            <span className="ml-1 text-[8px] font-mono text-zinc-500">
              ({clips.length})
            </span>
          ) : null}
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
        {visibleClips.map((clip) => {
          const left = clip.start * pps;
          const width = Math.max(clip.duration * pps, 6);
          const selected = selectedClipId === clip.id;
          const active =
            playhead >= clip.start && playhead < clip.start + clip.duration;
          const editable = isClipEditable(clip);
          const showHandles = editable && (selected || width > 20);
          const isRemotionTrack =
            track.id === "motion" || track.id === "overlays";
          const fillAlpha = isRemotionTrack ? "aa" : "33";
          const borderAlpha = isRemotionTrack ? "ee" : "66";

          return (
            <div
              key={clip.id}
              className={`absolute top-1 bottom-1 rounded-md overflow-hidden border transition group ${
                selected ? "ring-2 ring-gold-400/80 z-10" : ""
              } ${active ? "opacity-100" : "opacity-90 hover:opacity-100"} ${
                isDragging ? "select-none" : ""
              } ${active && isRemotionTrack ? "ring-1 ring-white/30" : ""}`}
              style={{
                left,
                width,
                backgroundColor: `${clip.color || color}${fillAlpha}`,
                borderColor: `${clip.color || color}${borderAlpha}`,
              }}
              title={`${clip.label || clip.id} · ${formatStudioTime(clip.start)}`}
            >
              {showHandles ? (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/20 hover:bg-gold-400/60 cursor-ew-resize z-20"
                  onMouseDown={(e) => onStartDrag(e, clip, "resize-left")}
                />
              ) : null}

              <button
                type="button"
                onMouseDown={(e) => {
                  if (editable) onStartDrag(e, clip, "move");
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectClip(clip.id);
                  onPlayheadChange(clip.start);
                }}
                className={`w-full h-full px-1.5 text-left overflow-hidden ${
                  editable
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-pointer"
                }`}
              >
                <span
                  className="block text-[8px] font-bold truncate pointer-events-none"
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

              {showHandles ? (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/20 hover:bg-gold-400/60 cursor-ew-resize z-20"
                  onMouseDown={(e) => onStartDrag(e, clip, "resize-right")}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});
