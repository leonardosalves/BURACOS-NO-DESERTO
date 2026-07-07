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
  activeMotionAt,
  activeVideoAt,
  previewVideoAt,
  clipsOnTrack,
  formatStudioTime,
  type StudioClip,
  type TimelineStudioState,
} from "./timelineStudioTypes";
import {
  enrichSatelliteMotionClip,
  preloadStudioMediaAtPlayhead,
  resolveMediaUrl,
  resolveMotionSceneProps,
} from "./timelineStudioMedia";
import { SatelliteMapPreview } from "./SatelliteMapPreview";
import {
  isFullscreenMotionClip,
  SHORTS_CAPTION_SAFE_BOTTOM_PCT,
} from "./timelineStudioMotionLayout";

type Props = {
  studio: TimelineStudioState;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl?: (fileName: string) => string;
  aspectRatio: string;
  musicVolume?: number;
  onPlayheadChange: (sec: number, opts?: { playing?: boolean }) => void;
};

const FULLSCREEN_OVERLAYS = new Set(["pictogram-chart"]);

const UI_PUBLISH_MS = 250;
const MOTION_SCRUB_MS = 80;

function clipToOverlayDraft(
  clip: StudioClip,
  getAssetUrl: (fileName: string) => string,
  getMusicUrl?: (fileName: string) => string
): OverlayDraft {
  const enriched = enrichSatelliteMotionClip(clip);
  const type = String(
    enriched.templateId || enriched.props?.overlayType || "lower-third"
  );
  const props = resolveMotionSceneProps(
    (enriched.props || {}) as Record<string, unknown>,
    getAssetUrl,
    getMusicUrl
  );
  return {
    id: enriched.id,
    type,
    start: enriched.start,
    duration: enriched.duration,
    props,
  };
}

function isVideoClip(clip: StudioClip | null | undefined): boolean {
  if (!clip) return false;
  return (
    clip.props?.type === "video" ||
    /\.(mp4|webm|mov|m4v)$/i.test(String(clip.source || ""))
  );
}

export function TimelineStudioPreview({
  studio,
  getAssetUrl,
  getMusicUrl,
  aspectRatio,
  musicVolume = 0.15,
  onPlayheadChange,
}: Props) {
  const isVertical = aspectRatio === "9:16";
  const [playing, setPlaying] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [livePlayhead, setLivePlayhead] = useState(studio.playhead);
  /** Playhead em tempo real para motion/PIP — sem throttle de 100ms. */
  const [motionPlayhead, setMotionPlayhead] = useState(studio.playhead);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const playheadRef = useRef(studio.playhead);
  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const lastPublishRef = useRef(0);
  const lastMotionPublishRef = useRef(0);
  const motionPlayheadRef = useRef(studio.playhead);
  const lastVideoClipIdRef = useRef<string | null>(null);
  const onPlayheadChangeRef = useRef(onPlayheadChange);
  const clipsRef = useRef(studio.clips);
  const totalDurRef = useRef(studio.totalDuration || 120);

  onPlayheadChangeRef.current = onPlayheadChange;
  clipsRef.current = studio.clips;
  totalDurRef.current = studio.totalDuration || 120;

  const totalDur = studio.totalDuration || 120;
  const displayPlayhead = playing ? livePlayhead : studio.playhead;

  const voiceClip = clipsOnTrack(studio.clips, "voice")[0];
  const musicClip = clipsOnTrack(studio.clips, "music")[0];
  const voiceSrc = voiceClip?.source
    ? resolveMediaUrl(voiceClip.source, getAssetUrl, getMusicUrl)
    : null;
  const musicSrc = musicClip?.source
    ? resolveMediaUrl(musicClip.source, getAssetUrl, getMusicUrl)
    : null;
  const bgmVol = Math.min(
    1,
    Math.max(
      0,
      Number(musicClip?.props?.volume) > 0
        ? Number(musicClip?.props?.volume)
        : musicVolume
    )
  );

  useEffect(() => {
    if (!playing) {
      playheadRef.current = studio.playhead;
      setLivePlayhead(studio.playhead);
      setMotionPlayhead(studio.playhead);
    }
  }, [studio.playhead, playing]);

  const videoClip = playing
    ? activeVideoAt(studio.clips, displayPlayhead)
    : previewVideoAt(studio.clips, displayPlayhead);
  const motionClips = useMemo(
    () => activeMotionAt(studio.clips, motionPlayhead),
    [studio.clips, motionPlayhead]
  );
  const caption = activeCaptionAt(studio.clips, displayPlayhead);

  const activeOverlays = useMemo(
    () =>
      studio.clips
        .filter(
          (c) =>
            c.trackId === "overlays" &&
            displayPlayhead >= c.start &&
            displayPlayhead < c.start + c.duration
        )
        .sort((a, b) => {
          const pri = (id: string) => (FULLSCREEN_OVERLAYS.has(id) ? 1 : 0);
          return pri(String(a.templateId)) - pri(String(b.templateId));
        }),
    [studio.clips, displayPlayhead]
  );

  const assetSrc = videoClip?.source
    ? resolveMediaUrl(videoClip.source, getAssetUrl, getMusicUrl)
    : null;
  const isVideo = isVideoClip(videoClip);
  const showBaseVideo = Boolean(assetSrc) && !(isVideo && videoLoadFailed);

  useEffect(() => {
    setVideoLoadFailed(false);
  }, [assetSrc]);

  const publishMotionPlayhead = useCallback((t: number, force = false) => {
    const prev = motionPlayheadRef.current;
    motionPlayheadRef.current = t;
    const now = performance.now();
    if (
      force ||
      now - lastMotionPublishRef.current >= MOTION_SCRUB_MS ||
      Math.abs(t - prev) > 0.35
    ) {
      lastMotionPublishRef.current = now;
      setMotionPlayhead(t);
    }
  }, []);

  const publishPlayhead = useCallback(
    (t: number, force = false) => {
      const total = totalDurRef.current;
      const next = Math.min(total, Math.max(0, t));
      if (!force && next < playheadRef.current - 0.02) return next;
      playheadRef.current = next;

      const now = performance.now();
      const isPlaying = playingRef.current;
      if (isPlaying) {
        setLivePlayhead(next);
        onPlayheadChangeRef.current(next, { playing: true });
      } else {
        const uiInterval = UI_PUBLISH_MS;
        if (force || now - lastPublishRef.current >= uiInterval) {
          lastPublishRef.current = now;
          setLivePlayhead(next);
          onPlayheadChangeRef.current(next);
        }
      }
      publishMotionPlayhead(next, force);
      return next;
    },
    [publishMotionPlayhead]
  );

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
    audioRef.current?.pause();
    bgmRef.current?.pause();
    publishPlayhead(playheadRef.current, true);
  }, [publishPlayhead]);

  const syncBgmToPlayhead = useCallback(
    (globalSec: number, shouldPlay: boolean) => {
      const b = bgmRef.current;
      if (!b || !musicClip?.source) return;
      const local = Math.max(0, globalSec - musicClip.start);
      const inRange =
        globalSec >= musicClip.start &&
        globalSec < musicClip.start + musicClip.duration;
      b.volume = bgmVol;
      if (!inRange) {
        b.pause();
        return;
      }
      if (Math.abs(b.currentTime - local) > 0.25) {
        try {
          b.currentTime = local;
        } catch {
          /* ignore */
        }
      }
      if (shouldPlay) {
        void b.play().catch(() => {});
      } else {
        b.pause();
      }
    },
    [bgmVol, musicClip]
  );

  const resolveVideoClipAt = useCallback(
    (globalSec: number) =>
      playingRef.current
        ? activeVideoAt(clipsRef.current, globalSec)
        : previewVideoAt(clipsRef.current, globalSec),
    []
  );

  const syncVideoToTime = useCallback(
    (globalSec: number, forceSeek = false) => {
      const v = videoRef.current;
      if (!v) return;
      const clip = resolveVideoClipAt(globalSec);
      if (!clip || !isVideoClip(clip)) return;
      const clipChanged = clip.id !== lastVideoClipIdRef.current;
      if (clipChanged) lastVideoClipIdRef.current = clip.id;
      const local = Math.max(
        0,
        Math.min(
          Math.max(0, clip.duration - 0.04),
          globalSec < clip.start
            ? 0
            : globalSec >= clip.start + clip.duration
              ? Math.max(0, clip.duration - 0.04)
              : globalSec - clip.start
        )
      );
      const applySeek = () => {
        const drift = Math.abs(v.currentTime - local);
        const shouldSeek =
          forceSeek || clipChanged || !playingRef.current || drift > 0.28;
        if (shouldSeek && drift > 0.02) {
          try {
            v.currentTime = local;
          } catch {
            /* ignore seek errors */
          }
        }
        if (playingRef.current) {
          void v.play().catch(() => {});
        }
      };

      if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        applySeek();
        return;
      }

      const onReady = () => {
        v.removeEventListener("loadeddata", onReady);
        v.removeEventListener("loadedmetadata", onReady);
        applySeek();
      };
      v.addEventListener("loadeddata", onReady);
      v.addEventListener("loadedmetadata", onReady);
    },
    [resolveVideoClipAt]
  );

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      stopPlayback();
      return;
    }
    if (studio.playhead >= totalDur - 0.05) {
      playheadRef.current = 0;
      setLivePlayhead(0);
      onPlayheadChangeRef.current(0);
    } else {
      playheadRef.current = studio.playhead;
      setLivePlayhead(studio.playhead);
    }
    playingRef.current = true;
    setPlaying(true);
  }, [stopPlayback, studio.playhead, totalDur]);

  // Motor de playback — depende só de playing + voiceSrc para não reiniciar a cada frame
  useEffect(() => {
    if (!playing) return undefined;

    const narration = audioRef.current;
    const hasVoice = Boolean(voiceSrc && narration);

    if (hasVoice && narration) {
      narration.currentTime = playheadRef.current;
      void narration.play().catch(() => {});
    }
    syncBgmToPlayhead(playheadRef.current, true);

    let last = performance.now();

    const tick = (now: number) => {
      if (!playingRef.current) return;

      const total = totalDurRef.current;
      let t = playheadRef.current;

      if (hasVoice && narration && !narration.paused) {
        t = narration.currentTime;
      } else {
        const dt = Math.max(0, (now - last) / 1000);
        last = now;
        t = playheadRef.current + dt;
      }

      publishPlayhead(t);
      syncVideoToTime(playheadRef.current);
      syncBgmToPlayhead(playheadRef.current, true);

      if (playheadRef.current >= total - 0.02) {
        stopPlayback();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    playing,
    voiceSrc,
    publishPlayhead,
    stopPlayback,
    syncVideoToTime,
    syncBgmToPlayhead,
  ]);

  // Troca de clip de vídeo durante play
  useEffect(() => {
    if (!playing || !isVideo) return;
    syncVideoToTime(playheadRef.current);
  }, [assetSrc, playing, isVideo, syncVideoToTime]);

  // Pausado: garante frame visível após metadata (evita preview preto no 1º mount)
  useEffect(() => {
    if (playing || !isVideo || !assetSrc) return;
    syncVideoToTime(studio.playhead);
  }, [assetSrc, isVideo, playing, studio.playhead, syncVideoToTime]);

  useEffect(() => {
    const delayMs = playing ? 420 : 200;
    const timer = window.setTimeout(() => {
      preloadStudioMediaAtPlayhead(
        studio.clips,
        studio.playhead,
        getAssetUrl,
        getMusicUrl
      );
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [studio.clips, studio.playhead, playing, getAssetUrl, getMusicUrl]);

  // Pausado: alinha mídia ao scrub manual
  useEffect(() => {
    if (playing) return;
    const a = audioRef.current;
    if (a && voiceSrc && Math.abs(a.currentTime - studio.playhead) > 0.1) {
      try {
        a.currentTime = studio.playhead;
      } catch {
        /* ignore */
      }
    }
    a?.pause();
    publishMotionPlayhead(studio.playhead, true);
    syncVideoToTime(studio.playhead, true);
    syncBgmToPlayhead(studio.playhead, false);
    videoRef.current?.pause();
  }, [
    studio.playhead,
    playing,
    voiceSrc,
    syncVideoToTime,
    syncBgmToPlayhead,
    publishMotionPlayhead,
  ]);

  const frameStyle: React.CSSProperties = isVertical
    ? {
        aspectRatio: "9 / 16",
        height: "100%",
        width: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
      }
    : {
        aspectRatio: "16 / 9",
        width: "100%",
        height: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
      };

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
          {formatStudioTime(displayPlayhead)}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-1 bg-zinc-950">
        <div
          className="relative overflow-hidden rounded-lg border border-zinc-800 bg-black shadow-lg shadow-black/40"
          style={{ ...frameStyle, containerType: "size" }}
        >
          {showBaseVideo ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={assetSrc}
                src={assetSrc}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "translateZ(0)", willChange: "auto" }}
                muted
                playsInline
                preload={playing ? "auto" : "metadata"}
                onLoadedData={() => syncVideoToTime(displayPlayhead)}
                onLoadedMetadata={() => syncVideoToTime(displayPlayhead)}
                onCanPlay={() => syncVideoToTime(displayPlayhead)}
                onError={() => setVideoLoadFailed(true)}
              />
            ) : (
              <img
                key={assetSrc}
                src={assetSrc}
                alt={videoClip?.label || "B-roll"}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setVideoLoadFailed(true)}
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center px-6">
                <p className="text-sm text-zinc-500">
                  {videoLoadFailed
                    ? "Falha ao carregar mídia"
                    : "Sem mídia neste momento"}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {videoLoadFailed
                    ? videoClip?.label || "Verifique ASSETS/ no projeto"
                    : "Adicione stock ou posicione o playhead num clip de vídeo"}
                </p>
              </div>
            </div>
          )}

          {voiceSrc ? (
            <audio
              ref={audioRef}
              key={voiceSrc}
              src={voiceSrc}
              preload={playing ? "auto" : "metadata"}
              className="hidden"
            />
          ) : null}

          {musicSrc ? (
            <audio
              ref={bgmRef}
              key={musicSrc}
              src={musicSrc}
              preload={playing ? "auto" : "metadata"}
              className="hidden"
            />
          ) : null}

          {motionClips.map((clip) => {
            const localSec = motionPlayhead - clip.start;
            const tpl = String(clip.templateId || "");
            const isMapScene = tpl === "location-intro" || tpl === "geo-map";
            if (isMapScene) {
              return (
                <SatelliteMapPreview
                  key={clip.id}
                  clip={clip}
                  localSec={Math.max(0, localSec)}
                  getAssetUrl={getAssetUrl}
                  getMusicUrl={getMusicUrl}
                />
              );
            }
            const draft = clipToOverlayDraft(clip, getAssetUrl, getMusicUrl);
            const isFullscreen = isFullscreenMotionClip(clip);
            const isPip = !isFullscreen;
            return (
              <div
                key={clip.id}
                className={`absolute pointer-events-none ${
                  isPip
                    ? "inset-0 flex items-start justify-end z-30 pt-[8%] pr-[5%] pl-[5%]"
                    : `inset-0 ${isFullscreen ? "z-40" : "z-30"}`
                }`}
                style={
                  isPip && isVertical
                    ? {
                        paddingBottom: `${SHORTS_CAPTION_SAFE_BOTTOM_PCT}%`,
                      }
                    : isPip
                      ? { padding: "5%" }
                      : undefined
                }
              >
                <OverlayPreview
                  overlay={draft}
                  aspectRatio={aspectRatio}
                  accentColor={String(draft.props?.accentColor || "#D4AF37")}
                  durationSeconds={clip.duration}
                  scrubSeconds={Math.max(0, localSec)}
                  timelinePlaying={playing}
                  embedded
                  embeddedLayout={isPip ? "pip" : "fill"}
                />
              </div>
            );
          })}

          {activeOverlays.map((clip) => {
            const draft = clipToOverlayDraft(clip, getAssetUrl, getMusicUrl);
            const localSec = motionPlayhead - clip.start;
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
                  timelinePlaying={playing}
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
            playheadRef.current = sec;
            setLivePlayhead(sec);
            onPlayheadChange(sec);
            if (playingRef.current) stopPlayback();
          }}
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gold-500"
            style={{ width: `${(displayPlayhead / totalDur) * 100}%` }}
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
              {formatStudioTime(displayPlayhead)}
            </span>
            <span className="text-zinc-600 mx-1">/</span>
            {formatStudioTime(totalDur)}
          </span>

          {videoClip ? (
            <span className="text-[9px] text-zinc-600 truncate max-w-[40%] text-right">
              {videoClip.label}
            </span>
          ) : musicClip ? (
            <span className="text-[9px] text-indigo-400/80 truncate max-w-[40%] text-right">
              ♪ {musicClip.label}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-700">—</span>
          )}
        </div>
      </div>

      <style>{`
        .tss-embedded-overlay:not(.tss-pip-card),
        .tss-embedded-overlay:not(.tss-pip-card) > div,
        .tss-embedded-overlay:not(.tss-pip-card) .overlay-preview-frame,
        .tss-embedded-overlay:not(.tss-pip-card) .overlay-preview-frame > div {
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
        .tss-embedded-overlay:not(.tss-pip-card) img,
        .tss-embedded-overlay:not(.tss-pip-card) video {
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
