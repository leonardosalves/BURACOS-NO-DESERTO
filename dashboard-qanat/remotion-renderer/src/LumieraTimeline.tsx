import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio, Video } from "@remotion/media";

type TimelineScene = {
  block: number;
  asset: string;
  type: "image" | "video";
  start: number;
  duration: number;
  narrationText?: string;
  editorNotes?: string;
};

type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

type BgmTrack = {
  block: number;
  file: string;
  start: number;
  duration: number;
};

export type LumieraTimelineProps = {
  projectName: string;
  format: "16:9" | "9:16";
  totalDuration: number;
  scenes: TimelineScene[];
  captions: Caption[];
  narration?: string | null;
  bgmTracks: BgmTrack[];
  editingMap?: string;
};

export const defaultLumieraProps: LumieraTimelineProps = {
  projectName: "Lumiera",
  format: "9:16",
  totalDuration: 30,
  scenes: [],
  captions: [],
  narration: null,
  bgmTracks: [],
};

const assetUrl = (file: string) => staticFile(file.replace(/\\/g, "/"));

const SceneMedia: React.FC<{ scene: TimelineScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.max(1, Math.round(scene.duration * fps));
  const scale = interpolate(frame, [0, durationFrames], [1.04, 1.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 8, durationFrames - 8, durationFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const commonStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity,
    transform: `scale(${scale})`,
  };

  if (scene.type === "video") {
    return (
      <Video
        src={assetUrl(scene.asset)}
        muted
        loop
        volume={0}
        style={commonStyle}
      />
    );
  }

  return <Img src={assetUrl(scene.asset)} style={commonStyle} />;
};

const CaptionLayer: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const visible = captions.filter((caption) => (
    caption.startMs <= currentMs + 900 && caption.endMs >= currentMs - 80
  )).slice(0, 9);

  if (visible.length === 0) return null;

  const isVertical = height > width;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        padding: isVertical ? "0 72px 180px" : "0 180px 110px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
          maxWidth: isVertical ? 900 : 1280,
          filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.75))",
        }}
      >
        {visible.map((caption, index) => {
          const active = caption.startMs <= currentMs && caption.endMs >= currentMs;
          return (
            <span
              key={`${caption.startMs}-${index}`}
              style={{
                color: active ? "#f6c945" : "#f7f7f7",
                fontFamily: "Inter, Arial, sans-serif",
                fontSize: isVertical ? 62 : 52,
                fontWeight: 900,
                lineHeight: 1.05,
                WebkitTextStroke: "3px rgba(0,0,0,0.88)",
                textTransform: "uppercase",
                whiteSpace: "pre",
                transform: active ? "scale(1.06)" : "scale(1)",
              }}
            >
              {caption.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const LumieraTimeline: React.FC<LumieraTimelineProps> = ({
  scenes,
  captions,
  narration,
  bgmTracks,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#050506" }}>
      {scenes.map((scene, index) => (
        <Sequence
          key={`${scene.block}-${scene.asset}-${index}`}
          from={Math.round(scene.start * fps)}
          durationInFrames={Math.max(1, Math.round(scene.duration * fps))}
          premountFor={fps}
        >
          <SceneMedia scene={scene} />
        </Sequence>
      ))}

      {bgmTracks.map((track, index) => (
        <Sequence
          key={`${track.block}-${track.file}-${index}`}
          from={Math.round(track.start * fps)}
          durationInFrames={Math.max(1, Math.round(track.duration * fps))}
          premountFor={fps}
        >
          <Audio
            src={assetUrl(track.file)}
            loop
            volume={0.16}
          />
        </Sequence>
      ))}

      {narration ? (
        <Audio src={assetUrl(narration)} volume={1} />
      ) : null}

      <CaptionLayer captions={captions} />
    </AbsoluteFill>
  );
};
