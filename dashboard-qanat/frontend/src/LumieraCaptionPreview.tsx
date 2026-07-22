import React, { useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import {
  CaptionLayer,
  type Caption,
} from "../../remotion-renderer/src/LumieraTimeline";
import type { ConfigData } from "./appTypes";
import {
  resolveCaptionChunkStyle,
  resolveCaptionGrouping,
  resolveLongCaptionMode,
  resolveShortCaptionBgmPulse,
  resolveShortCaptionMode,
  type CaptionModeId,
} from "./captionConfig";
import {
  framesToSeconds,
  type LumieraEditorProject,
} from "./lumieraEditorCore";

type CaptionPreviewCompositionProps = {
  captions: Caption[];
  captionMode: CaptionModeId;
  captionStyle: "shorts-viral" | "documentary";
  captionEffect?: string;
  captionBgmPulse: boolean;
  accentColor: string;
  maxWordsPerChunk: number;
  maxLines: 1 | 2;
  respectSentences: boolean;
};

// The renderer owns a separate React type installation; runtime React is shared by Vite.
const RenderCaptionLayer = CaptionLayer as unknown as React.ComponentType<any>;

const CaptionPreviewComposition: React.FC<CaptionPreviewCompositionProps> = (
  props
) => (
  <AbsoluteFill style={{ background: "transparent" }}>
    <RenderCaptionLayer
      captions={props.captions}
      captionMode={props.captionMode}
      captionStyle={props.captionStyle}
      captionEffect={props.captionEffect}
      captionBgmPulse={props.captionBgmPulse}
      accentColor={props.accentColor}
      captionMaxWordsPerChunk={props.maxWordsPerChunk}
      captionMaxLines={props.maxLines}
      captionRespectSentences={props.respectSentences}
    />
  </AbsoluteFill>
);

export function LumieraCaptionPreview({
  project,
  config,
  playheadFrame,
  playing,
}: {
  project: LumieraEditorProject;
  config?: ConfigData | null;
  playheadFrame: number;
  playing: boolean;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const vertical = project.height > project.width;
  const safeConfig = config || {};
  const captions = useMemo<Caption[]>(
    () =>
      project.tracks.flatMap((track) =>
        track.clips
          .filter((clip) => clip.type === "caption")
          .map((clip) => {
            const startMs = framesToSeconds(clip.startFrame, project.fps) * 1000;
            const endMs =
              framesToSeconds(
                clip.startFrame + clip.durationInFrames,
                project.fps
              ) * 1000;
            return {
              text: String(clip.props?.text || clip.label || ""),
              startMs,
              endMs,
              timestampMs: startMs,
              confidence: null,
            };
          })
          .filter((caption) => caption.text.trim())
      ),
    [project.fps, project.tracks]
  );
  const mode = vertical
    ? resolveShortCaptionMode(safeConfig)
    : resolveLongCaptionMode(safeConfig);
  const grouping = resolveCaptionGrouping(
    safeConfig,
    vertical ? "short" : "long"
  );
  const inputProps = useMemo<CaptionPreviewCompositionProps>(
    () => ({
      captions,
      captionMode: mode,
      captionStyle: resolveCaptionChunkStyle(mode),
      captionEffect: vertical
        ? safeConfig.caption_effect_short
        : safeConfig.caption_effect_long,
      captionBgmPulse: vertical
        ? resolveShortCaptionBgmPulse(mode, safeConfig)
        : false,
      accentColor: safeConfig.accent_color || "#D4AF37",
      maxWordsPerChunk: grouping.maxWordsPerChunk,
      maxLines: grouping.maxLines,
      respectSentences: grouping.respectSentences,
    }),
    [captions, grouping.maxLines, grouping.maxWordsPerChunk, grouping.respectSentences, mode, safeConfig, vertical]
  );

  useEffect(() => {
    playerRef.current?.seekTo(Math.max(0, playheadFrame));
    if (playing) playerRef.current?.play();
    else playerRef.current?.pause();
  }, [playheadFrame, playing]);

  if (!captions.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <Player
        ref={playerRef}
        component={CaptionPreviewComposition}
        inputProps={inputProps}
        durationInFrames={Math.max(1, project.durationInFrames)}
        compositionWidth={project.width}
        compositionHeight={project.height}
        fps={project.fps}
        controls={false}
        autoPlay={false}
        loop={false}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      />
    </div>
  );
}
