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



type SfxTrack = {

  file: string;

  start: number;

  duration: number;

  volume: number;

};



export type LumieraTimelineProps = {

  projectName: string;

  format: "16:9" | "9:16";

  totalDuration: number;

  scenes: TimelineScene[];

  captions: Caption[];

  narration?: string | null;

  narrationDuration?: number;

  bgmTracks: BgmTrack[];

  sfxTracks?: SfxTrack[];

  editingMap?: string;

  musicVolume?: number;

};



export const defaultLumieraProps: LumieraTimelineProps = {

  projectName: "Lumiera",

  format: "9:16",

  totalDuration: 30,

  scenes: [],

  captions: [],

  narration: null,

  narrationDuration: 0,

  bgmTracks: [],

  sfxTracks: [],

};



const assetUrl = (file: string) => staticFile(file.replace(/\\/g, "/"));



const SceneMedia: React.FC<{

  scene: TimelineScene;

  isFirst: boolean;

  index: number;

}> = ({ scene, isFirst, index }) => {

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const durationFrames = Math.max(1, Math.round(scene.duration * fps));

  const isLogo = scene.asset.toLowerCase().includes("logo.png");



  // Overlap transitions duration: 12 frames (0.4s)

  const transFrames = 12;



  // 1. Zoom effect (always active)

  // Logo has a steady framing, standard scenes have gentle zooms

  const startScale = isLogo ? 1.0 : 1.04;

  const endScale = isLogo ? 1.15 : 1.14;

  const zoomScale = interpolate(frame, [0, durationFrames], [startScale, endScale], {

    extrapolateLeft: "clamp",

    extrapolateRight: "clamp",

  });



  // 2. Opacity transitions (fade-in)

  let opacity = 1;

  if (isFirst) {

    opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  } else if (frame < transFrames) {

    opacity = interpolate(frame, [0, transFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  }



  // Fade out at the very end of the video (logo outro)

  const isLastScene = isLogo;

  if (isLastScene) {

    const fadeOutStart = durationFrames - 10;

    if (frame > fadeOutStart) {

      const fadeOutOpacity = interpolate(frame, [fadeOutStart, durationFrames], [1, 0], {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

      });

      opacity = Math.min(opacity, fadeOutOpacity);

    }

  }



  // 3. Custom Transitions (alternate based on index)

  let clipPath = "none";

  let transitionScale = 1;



  if (!isFirst && !isLogo && frame < transFrames) {

    const transitionType = index % 3;

    if (transitionType === 1) {

      // Dreamy Zoom transition

      transitionScale = interpolate(frame, [0, transFrames], [1.15, 1.0], {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

      });

    } else if (transitionType === 2) {

      // Smooth crop wipe from left to right

      const wipePercent = interpolate(frame, [0, transFrames], [100, 0], {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

      });

      clipPath = `inset(0 0 0 ${wipePercent}%)`;

    }

  }



  // 4. Video Manipulation & Cinematic Color Grading

  let filter = "";

  if (!isLogo) {

    const effectType = index % 4;

    if (effectType === 0) {

      // Warm grading for sand/desert/architecture

      filter = "sepia(0.12) contrast(1.06) brightness(1.02) saturate(1.08)";

    } else if (effectType === 1) {

      // High contrast drama

      filter = "contrast(1.1) brightness(0.98) saturate(1.05)";

    } else if (effectType === 2) {

      // Cinematic cool grading

      filter = "hue-rotate(-5deg) contrast(1.05) saturate(1.02)";

    } else {

      filter = "contrast(1.0) brightness(1.0)";

    }

  } else {

    filter = "none";

  }



  // 5. Professional Depth-of-Field Blur Entry (Focus Effect)

  if (!isLogo && frame < 15) {

    const entryBlur = interpolate(frame, [0, 15], [10, 0], {

      extrapolateLeft: "clamp",

      extrapolateRight: "clamp",

    });

    if (filter !== "none") {

      filter += ` blur(${entryBlur}px)`;

    } else {

      filter = `blur(${entryBlur}px)`;

    }

  }



  const commonStyle: React.CSSProperties = {

    width: "100%",

    height: "100%",

    objectFit: isLogo ? "contain" : "cover",

    opacity,

    transform: `scale(${zoomScale * transitionScale})`,

    backgroundColor: isLogo ? "#050506" : "transparent",

    padding: isLogo ? "10%" : "0",

    boxSizing: "border-box",

    clipPath,

    filter,

  };



  if (scene.type === "video") {

    return (

      <AbsoluteFill style={{ overflow: "hidden" }}>

        <Video

          src={assetUrl(scene.asset)}

          muted

          loop={false}

          volume={0}

          style={commonStyle}

        />

        {!isLogo && (

          <div

            style={{

              position: "absolute",

              inset: 0,

              pointerEvents: "none",

              background: "radial-gradient(circle, transparent 35%, rgba(0,0,0,0.7) 100%)",

              mixBlendMode: "multiply",

              opacity: 0.85,

            }}

          />

        )}

      </AbsoluteFill>

    );

  }



  return (

    <AbsoluteFill style={{ overflow: "hidden" }}>

      <Img src={assetUrl(scene.asset)} style={commonStyle} />

      {!isLogo && (

        <div

          style={{

            position: "absolute",

            inset: 0,

            pointerEvents: "none",

            background: "radial-gradient(circle, transparent 35%, rgba(0,0,0,0.7) 100%)",

            mixBlendMode: "multiply",

            opacity: 0.85,

          }}

        />

      )}

    </AbsoluteFill>

  );

};



interface WordChunk {

  words: Caption[];

  startMs: number;

  endMs: number;

}



const CaptionLayer: React.FC<{ captions: Caption[] }> = ({ captions }) => {

  const frame = useCurrentFrame();

  const { fps, width, height } = useVideoConfig();

  const currentMs = (frame / fps) * 1000;



  // Dynamically group single words into static chunks of at most 2 words

  // with a pause threshold of 600ms

  const chunks: WordChunk[] = React.useMemo(() => {

    const list: WordChunk[] = [];

    let currentChunk: Caption[] = [];

    const safeCaptions = captions

      .filter((caption) => caption.text.trim() && Number.isFinite(caption.startMs) && Number.isFinite(caption.endMs))

      .map((caption) => ({

        ...caption,

        endMs: Math.min(caption.endMs, caption.startMs + 900),

      }))

      .sort((a, b) => a.startMs - b.startMs);



    for (let j = 0; j < safeCaptions.length; j++) {

      const cap = safeCaptions[j];

      const lastCap = currentChunk[currentChunk.length - 1];



      if (

        currentChunk.length === 2 ||

        (lastCap && cap.startMs - lastCap.endMs > 600) ||

        (currentChunk.length > 0 && cap.endMs - currentChunk[0].startMs > 2200)

      ) {

        if (currentChunk.length > 0) {

          list.push({

            words: currentChunk,

            startMs: currentChunk[0].startMs,

            endMs: Math.min(currentChunk[currentChunk.length - 1].endMs, currentChunk[0].startMs + 2400),

          });

        }

        currentChunk = [cap];

      } else {

        currentChunk.push(cap);

      }

    }

    if (currentChunk.length > 0) {

      list.push({

        words: currentChunk,

        startMs: currentChunk[0].startMs,

        endMs: Math.min(currentChunk[currentChunk.length - 1].endMs, currentChunk[0].startMs + 2400),

      });

    }

    return list;

  }, [captions]);



  // Find the currently active static chunk

  const activeChunk = chunks.find(

    (chunk) => currentMs >= chunk.startMs && currentMs <= chunk.endMs

  );



  if (!activeChunk) return null;



  const isVertical = height > width;



  return (

    <AbsoluteFill

      style={{

        justifyContent: "flex-end",

        alignItems: "center",

        padding: isVertical ? "0 72px 280px" : "0 180px 110px",

        pointerEvents: "none",

      }}

    >

      <div

        style={{

          display: "flex",

          flexWrap: "wrap",

          justifyContent: "center",

          columnGap: isVertical ? 22 : 18,

          rowGap: isVertical ? 14 : 10,

          maxWidth: isVertical ? 900 : 1280,

          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.72))",

        }}

      >

        {activeChunk.words.map((word, index) => {

          const active = currentMs >= word.startMs && currentMs <= word.endMs;

          return (

            <span

              key={`${word.startMs}-${index}`}

              style={{

                color: active ? "#F8FAFC" : "rgba(248,250,252,0.84)",

                fontFamily: "'Montserrat', 'Inter', Arial, sans-serif",

                fontSize: isVertical ? 72 : 54,

                fontWeight: 850,

                lineHeight: 1.16,

                letterSpacing: "0.035em",

                WebkitTextStroke: isVertical ? "2px rgba(2,6,23,0.92)" : "1.6px rgba(2,6,23,0.92)",

                textTransform: "uppercase",

                whiteSpace: "pre",

                textShadow: active

                  ? "0 0 22px rgba(250,204,21,0.38), 0 3px 10px rgba(0,0,0,0.8)"

                  : "0 3px 10px rgba(0,0,0,0.72)",

                transform: active ? "translateY(-2px) scale(1.045)" : "scale(1.0)",

                transition: "transform 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out",

                opacity: active ? 1 : 0.86,

              }}

            >

              {word.text}

            </span>

          );

        })}

      </div>

    </AbsoluteFill>

  );

};



const BgmAudio: React.FC<{

  track: BgmTrack;

  captions: Caption[];

  narrationDuration?: number;

  musicVolume?: number;

}> = ({ track, captions, narrationDuration = 0, musicVolume = 0.15 }) => {

  const { fps, durationInFrames } = useVideoConfig();

  const totalDurationMs = (durationInFrames / fps) * 1000;

  const startFrame = Math.round(track.start * fps);

  const trackDurationMs = Math.max(500, track.duration * 1000);

  const narrationDurationMs = Math.max(0, narrationDuration * 1000);



  return (

    <Audio

      src={assetUrl(track.file)}

      loop

      volume={(localFrame) => {

        const volScale = musicVolume / 0.15;

        const absoluteFrame = startFrame + localFrame;

        const currentMs = (absoluteFrame / fps) * 1000;

        const localMs = (localFrame / fps) * 1000;



        const fadeIn = interpolate(localMs, [0, 1800], [0, 1], {

          extrapolateLeft: "clamp",

          extrapolateRight: "clamp",

        });

        const fadeOut = interpolate(trackDurationMs - localMs, [0, 2200], [0, 1], {

          extrapolateLeft: "clamp",

          extrapolateRight: "clamp",

        });

        const envelope = Math.min(fadeIn, fadeOut);



        const getBaseVolume = () => {

          // 1. Logo Outro Crescendo (last 3 seconds)

          const logoStartMs = totalDurationMs - 3000;

          if (currentMs >= logoStartMs) {

            const progress = (currentMs - logoStartMs) / 3000;

            return interpolate(progress, [0, 1], [0.024, 0.065], {

              extrapolateLeft: "clamp",

              extrapolateRight: "clamp",

            }) * envelope;

          }



          // 2. Check distance to narrator speaking interval

          let minDistance = Infinity;

          let isSpeaking = narrationDurationMs > 0 && currentMs <= narrationDurationMs - 250;



          if (!isSpeaking) {

            for (const cap of captions) {

              if (currentMs >= cap.startMs && currentMs <= cap.endMs) {

                isSpeaking = true;

                break;

              }

              const distToStart = Math.abs(currentMs - cap.startMs);

              const distToEnd = Math.abs(currentMs - cap.endMs);

              const dist = Math.min(distToStart, distToEnd);

              if (dist < minDistance) {

                minDistance = dist;

              }

            }

          }



          if (isSpeaking) {

            const breath = (Math.sin((currentMs / 1000) * Math.PI * 0.42) + 1) / 2;

            return interpolate(breath, [0, 1], [0.008, 0.018]) * envelope;

          }



          // Smooth transition over 600ms before/after narration starts/stops

          if (minDistance < 900) {

            return interpolate(minDistance, [0, 900], [0.016, 0.042]) * envelope;

          }



          return 0.045 * envelope;

        };



        return getBaseVolume() * volScale;

      }}

    />

  );

};



const SfxAudio: React.FC<{ track: SfxTrack }> = ({ track }) => {

  const { fps } = useVideoConfig();

  const durationMs = Math.max(300, track.duration * 1000);

  const baseVolume = Math.min(0.07, Math.max(0.012, track.volume || 0.035));



  return (

    <Audio

      src={assetUrl(track.file)}

      volume={(localFrame) => {

        const localMs = (localFrame / fps) * 1000;

        const fadeIn = interpolate(localMs, [0, 120], [0, 1], {

          extrapolateLeft: "clamp",

          extrapolateRight: "clamp",

        });

        const fadeOut = interpolate(durationMs - localMs, [0, 300], [0, 1], {

          extrapolateLeft: "clamp",

          extrapolateRight: "clamp",

        });

        return baseVolume * Math.min(fadeIn, fadeOut);

      }}

    />

  );

};



export const LumieraTimeline: React.FC<LumieraTimelineProps> = ({

  scenes,

  captions,

  narration,

  narrationDuration = 0,

  bgmTracks,

  sfxTracks = [],
  musicVolume = 0.15,

}) => {

  const { fps } = useVideoConfig();

  const transitionFrames = 12; // 0.4 seconds overlap transition



  return (

    <AbsoluteFill style={{ backgroundColor: "#050506" }}>

      {scenes.map((scene, index) => {

        const isLast = index === scenes.length - 1;

        const isLogo = scene.asset.toLowerCase().includes("logo.png");

        const overlap = (!isLast && !isLogo) ? transitionFrames : 0;

        const durationInFrames = Math.max(1, Math.round(scene.duration * fps)) + overlap;



        return (

          <Sequence

            key={`${scene.block}-${scene.asset}-${index}`}

            from={Math.round(scene.start * fps)}

            durationInFrames={durationInFrames}

            premountFor={fps}

          >

            <SceneMedia scene={scene} isFirst={index === 0} index={index} />

          </Sequence>

        );

      })}



      {bgmTracks.map((track, index) => (

        <Sequence

          key={`${track.block}-${track.file}-${index}`}

          from={Math.round(track.start * fps)}

          durationInFrames={Math.max(1, Math.round(track.duration * fps))}

          premountFor={fps}

        >

          <BgmAudio track={track} captions={captions} narrationDuration={narrationDuration} musicVolume={musicVolume} />

        </Sequence>

      ))}



      {sfxTracks.map((track, index) => (

        <Sequence

          key={`${track.file}-${index}`}

          from={Math.max(0, Math.round(track.start * fps))}

          durationInFrames={Math.max(1, Math.round(track.duration * fps))}

          premountFor={fps}

        >

          <SfxAudio track={track} />

        </Sequence>

      ))}



      {narration ? (

        <Audio src={assetUrl(narration)} volume={1} />

      ) : null}



      <CaptionLayer captions={captions} />

    </AbsoluteFill>

  );

};

