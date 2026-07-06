import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pause, Play } from "lucide-react";
import { OverlayPreview } from "./OverlayPreview";
import type { OverlayDraft } from "./overlayEditorConfig";
import {
  activeCaptionAt,
  activeVideoAt,
  clipsOnTrack,
  formatStudioTime,
  type StudioClip,
  type TimelineStudioState,
} from "./timelineStudioTypes";

type Props = {
  studio: TimelineStudioState;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl?: (fileName: string) => string;
  aspectRatio: string;
  onPlayheadChange: (sec: number) => void;
};

const FULLSCREEN_OVERLAYS = new Set(["pictogram-chart", "location-intro"]);

function resolveMediaUrl(
  source: string,
  getAssetUrl: (fileName: string) => string,
  getMusicUrl?: (fileName: string) => string
): string {
  const s = String(source || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const normalized = s.replace(/^ASSETS\//i, "");
  const isProjectRoot = /\.(mp3|wav|m4a|aac)$/i.test(normalized);
  if (isProjectRoot && getMusicUrl) {
    return getMusicUrl(normalized.split("/").pop() || normalized);
  }
  const assetName = normalized.includes("/")
    ? normalized
    : normalized.split("/").pop() || normalized;
  return getAssetUrl(assetName);
}

function clipToOverlayDraft(clip: StudioClip): OverlayDraft {
  const type = String(
    clip.templateId || clip.props?.overlayType || "lower-third"
  );
  return {
    id: clip.id,
    type,
    start: clip.start,
    duration: clip.duration,
    props: { ...(clip.props || {}) },
  };
}

export function TimelineStudioPreview({
  studio,
  getAssetUrl,
  getMusicUrl,
  aspectRatio,
  onPlayheadChange,
}: Props) {
  const isVertical = aspectRatio === "9:16";
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playheadRef = useRef(studio.playhead);
  const rafRef = useRef(0);

  playheadRef.current = studio.playhead;
  const totalDur = studio.totalDuration || 120;

  const videoClip = activeVideoAt(studio.clips, studio.playhead);
  const caption = activeCaptionAt(studio.clips, studio.playhead);
  const voiceClip = clipsOnTrack(studio.clips, "voice")[0];

  const activeOverlays = useMemo(
    () =>
      studio.clips
        .filter(
          (c) =>
            c.trackId === "overlays" &&
            studio.playhead >= c.start &&
            studio.playhead < c.start + c.duration
        )
        .sort((a, b) => {
          const pri = (id: string) => (FULLSCREEN_OVERLAYS.has(id) ? 1 : 0);
          return pri(String(a.templateId)) - pri(String(b.templateId));
        }),
    [studio.clips, studio.playhead]
  );

  const assetSrc = videoClip?.source
    ? resolveMediaUrl(videoClip.source, getAssetUrl, getMusicUrl)
    : null;
  const isVideo =
    videoClip?.props?.type === "video" ||
    /\.(mp4|webm|mov)$/i.test(String(videoClip?.source || ""));

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (studio.playhead >= totalDur - 0.05) {
      onPlayheadChange(0);
      playheadRef.current = 0;
    }
    setPlaying(true);
  }, [onPlayheadChange, playing, stopPlayback, studio.playhead, totalDur]);

  useEffect(() => {
    if (!playing) return undefined;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(totalDur, playheadRef.current + dt);
      playheadRef.current = next;
      onPlayheadChange(next);
      if (next >= totalDur - 0.02) {
        stopPlayback();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onPlayheadChange, playing, stopPlayback, totalDur]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoClip || !isVideo) return;
    const local = Math.max(0, studio.playhead - videoClip.start);
    if (Math.abs(v.currentTime - local) > 0.12) {
      try {
        v.currentTime = local;
      } catch {
        /* ignore seek errors */
      }
    }
    if (playing) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [studio.playhead, playing, videoClip, isVideo]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !voiceClip?.source) return;
    if (Math.abs(a.currentTime - studio.playhead) > 0.12) {
      try {
        a.currentTime = studio.playhead;
      } catch {
        /* ignore */
      }
    }
    if (playing) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [studio.playhead, playing, voiceClip?.source]);

  const voiceSrc = voiceClip?.source
    ? resolveMediaUrl(voiceClip.source, getAssetUrl, getMusicUrl)
    : null;

  const frameClass = isVertical
    ? "h-full w-auto max-w-full"
    : "w-full h-auto max-h-full";

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Preview
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
            {isVertical ? "9:16" : "16:9"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gold-400/90">
          {formatStudioTime(studio.playhead)}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-2 bg-zinc-950">
        <div
          className={`relative overflow-hidden rounded-lg border border-zinc-800 bg-black ${frameClass}`}
          style={{
            aspectRatio: isVertical ? "9 / 16" : "16 / 9",
            containerType: "size",
          }}
        >
          {assetSrc ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={assetSrc}
                src={assetSrc}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <img
                src={assetSrc}
                alt={videoClip?.label || "B-roll"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center px-6">
                <p className="text-sm text-zinc-500">Sem mídia neste momento</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Adicione stock ou posicione o playhead num clip de vídeo
                </p>
              </div>
            </div>
          )}

          {voiceSrc ? (
            <audio
              ref={audioRef}
              src={voiceSrc}
              preload="auto"
              className="hidden"
            />
          ) : null}

          {activeOverlays.map((clip) => {
            const draft = clipToOverlayDraft(clip);
            const localSec = studio.playhead - clip.start;
            const isFullscreen = FULLSCREEN_OVERLAYS.has(
              String(clip.templateId)
            );
            return (
              <div
                key={clip.id}
                className={`absolute inset-0 pointer-events-none ${
                  isFullscreen ? "z-30" : "z-20"
                }`}
              >
                <OverlayPreview
                  overlay={draft}
                  aspectRatio={aspectRatio}
                  accentColor={String(draft.props?.accentColor || "#D4AF37")}
                  durationSeconds={clip.duration}
                  scrubSeconds={Math.max(0, localSec)}
                  embedded
                />
              </div>
            );
          })}

          {caption ? (
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 max-w-[88%] px-3 py-1.5 rounded-lg bg-black/75 border border-white/10 z-40 pointer-events-none">
              <p
                className="text-white font-semibold text-center leading-snug"
                style={{
                  fontSize: isVertical
                    ? "clamp(10px, 3.2cqw, 16px)"
                    : "clamp(9px, 1.8cqw, 14px)",
                }}
              >
                {String(caption.props?.text || caption.label || "")}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-zinc-800/60 bg-zinc-900/40 shrink-0 space-y-2">
        <div
          className="relative h-1.5 bg-zinc-800 rounded-full cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const sec = Math.max(0, Math.min(totalDur, pct * totalDur));
            onPlayheadChange(sec);
            if (playing) stopPlayback();
          }}
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gold-500"
            style={{ width: `${(studio.playhead / totalDur) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`p-2 rounded-full flex items-center justify-center transition cursor-pointer ${
              playing
                ? "bg-gold-500 text-zinc-950 hover:bg-gold-400"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
            title={playing ? "Pausar" : "Reproduzir timeline"}
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          <span className="text-[10px] font-mono text-zinc-400">
            <span className="text-white font-bold">
              {formatStudioTime(studio.playhead)}
            </span>
            <span className="text-zinc-600 mx-1">/</span>
            {formatStudioTime(totalDur)}
          </span>

          {videoClip ? (
            <span className="text-[9px] text-zinc-600 truncate max-w-[40%] text-right">
              {videoClip.label}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-700">—</span>
          )}
        </div>
      </div>

      <style>{`
        .tss-embedded-overlay,
        .tss-embedded-overlay > div,
        .tss-embedded-overlay .overlay-preview-frame {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
