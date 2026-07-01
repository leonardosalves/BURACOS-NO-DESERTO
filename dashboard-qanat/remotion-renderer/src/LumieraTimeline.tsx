import React from "react";



import {



  AbsoluteFill,



  Img,



  interpolate,



  spring,



  Sequence,



  staticFile,



  useCurrentFrame,



  useVideoConfig,



} from "remotion";



import { Audio, Video } from "@remotion/media";

import { OverlayLayer, Overlay } from "./overlays/OverlayLayer";
import { YoutubeSubOverlay, YoutubeChannelInfo } from "./overlays/YoutubeSubOverlay";
import { ProgressBar } from "./overlays/ProgressBar";
import { ShortsVisualFx } from "./overlays/ShortsVisualFx";







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
  startFrom?: number;
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

  /** Output resolution — 2k = 2560×1440 (16:9) or 1440×2560 (9:16) */
  resolution?: "1080p" | "2k";

  totalDuration: number;



  scenes: TimelineScene[];



  captions: Caption[];



  narration?: string | null;



  narrationDuration?: number;



  bgmTracks: BgmTrack[];



  sfxTracks?: SfxTrack[];



  editingMap?: string;



  musicVolume?: number;

  /** Professional overlay elements (infographics, lower thirds, kinetic text) */

  overlays?: Overlay[];
  youtubeChannelInfo?: YoutubeChannelInfo | null;
  transparent?: boolean;
  /** Caption rendering style — shorts-viral for 9:16, documentary for 16:9 */
  captionStyle?: "shorts-viral" | "documentary";
  designPreset?: string | null;
  grainOverlay?: boolean;
  vignette?: boolean;
  bgmDuckPoints?: number[];
  previewMode?: boolean;
  showProgressBar?: boolean;
  accentColor?: string;
  shortsZoomIntensity?: "normal" | "aggressive" | "cinematic";
  longZoomIntensity?: "normal" | "aggressive" | "cinematic";
  bgmDuckStrength?: "light" | "normal" | "strong";
  shortsHookFlash?: boolean;
  shortsEdgeGlow?: boolean;
  shortsCaptionBgmPulse?: boolean;
  shortsPortalTransition?: boolean;
  shortsPortalEvery?: number;
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

  overlays: [],

  youtubeChannelInfo: null,

  transparent: false,

  captionStyle: "shorts-viral",

  designPreset: null,

  grainOverlay: false,

  vignette: false,

  showProgressBar: false,

  accentColor: "#C5A880",

  shortsZoomIntensity: "normal",

  longZoomIntensity: "normal",

  bgmDuckStrength: "normal",

  shortsHookFlash: true,

  shortsEdgeGlow: false,

  shortsCaptionBgmPulse: true,

  shortsPortalTransition: true,

  shortsPortalEvery: 4,

};







const assetUrl = (file: string) => staticFile(file.replace(/\\/g, "/"));







const SceneMedia: React.FC<{
  scene: TimelineScene;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  youtubeChannelInfo?: YoutubeChannelInfo | null;
  isShort?: boolean;
  shortsZoomIntensity?: "normal" | "aggressive" | "cinematic";
  longZoomIntensity?: "normal" | "aggressive" | "cinematic";
  shortsPortalTransition?: boolean;
  shortsPortalEvery?: number;
  accentColor?: string;
}> = ({
  scene,
  isFirst,
  isLast,
  index,
  youtubeChannelInfo,
  isShort = false,
  shortsZoomIntensity = "normal",
  longZoomIntensity = "normal",
  shortsPortalTransition = true,
  shortsPortalEvery = 4,
  accentColor = "#D4AF37",
}) => {



  const frame = useCurrentFrame();



  const { fps } = useVideoConfig();



  const durationFrames = Math.max(1, Math.round(scene.duration * fps));



  const isLogo = scene.asset.toLowerCase().includes("logo_final_") || scene.asset.toLowerCase().includes("logo.") || scene.asset.toLowerCase().includes("/logo");







  // Overlap transitions duration: 12 frames (0.4s)



  const transFrames = 12;







  // 1. Zoom effect (always active)



  // Logo has a steady framing, standard scenes have gentle zooms



  const zoomProfile = isShort
    ? (shortsZoomIntensity === "aggressive"
      ? { start: 1.1, end: 1.28 }
      : shortsZoomIntensity === "cinematic"
        ? { start: 1.04, end: 1.16 }
        : { start: 1.06, end: 1.22 })
    : (longZoomIntensity === "aggressive"
      ? { start: 1.06, end: 1.18 }
      : longZoomIntensity === "cinematic"
        ? { start: 1.03, end: 1.12 }
        : { start: 1.04, end: 1.14 });

  const startScale = isLogo ? 1.0 : zoomProfile.start;

  const endScale = isLogo ? 1.15 : zoomProfile.end;



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







  if (!isLogo && !isLast) {
    const fadeOutStart = Math.max(0, durationFrames - transFrames);
    if (frame >= fadeOutStart) {
      const fadeOutOpacity = interpolate(frame, [fadeOutStart, durationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      opacity = Math.min(opacity, fadeOutOpacity);
    }
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

  let portalFilterBoost = "";







  const usePortalTransition = isShort
    && shortsPortalTransition
    && !isFirst
    && !isLogo
    && index % Math.max(3, shortsPortalEvery) === 0;

  if (!isFirst && !isLogo && frame < transFrames) {

    if (usePortalTransition) {
      const portalSize = interpolate(frame, [0, transFrames], [0, 145], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      clipPath = `circle(${portalSize}% at 50% 50%)`;
      transitionScale = interpolate(frame, [0, transFrames], [0.82, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      portalFilterBoost = ` saturate(1.25) drop-shadow(0 0 18px ${accentColor}88)`;
    } else {

    const transitionMod = isShort ? 6 : 3;
    const transitionType = index % transitionMod;



    if (transitionType === 1) {



      transitionScale = interpolate(frame, [0, transFrames], [isShort ? 1.2 : 1.15, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (transitionType === 2) {



      const wipePercent = interpolate(frame, [0, transFrames], [100, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `inset(0 0 0 ${wipePercent}%)`;



    } else if (isShort && transitionType === 3) {



      const wipeTop = interpolate(frame, [0, transFrames], [100, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `inset(${wipeTop}% 0 0 0)`;



    } else if (isShort && transitionType === 4) {



      transitionScale = interpolate(frame, [0, transFrames], [0.88, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (isShort && transitionType === 5) {



      const circleSize = interpolate(frame, [0, transFrames], [0, 150], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `circle(${circleSize}% at 50% 50%)`;



    }

    }



  }







  // 4. Video Manipulation & Cinematic Color Grading



  let filter = "";



  if (!isLogo) {



    const effectType = index % (isShort ? 6 : 4);



    if (effectType === 0) {



      filter = "sepia(0.12) contrast(1.06) brightness(1.02) saturate(1.08)";



    } else if (effectType === 1) {



      filter = "contrast(1.1) brightness(0.98) saturate(1.05)";



    } else if (effectType === 2) {



      filter = "hue-rotate(-5deg) contrast(1.05) saturate(1.02)";



    } else if (isShort && effectType === 3) {



      filter = "contrast(1.14) brightness(1.04) saturate(1.18) hue-rotate(8deg)";



    } else if (isShort && effectType === 4) {



      filter = "contrast(1.08) brightness(0.95) saturate(0.92) sepia(0.08)";



    } else if (isShort && effectType === 5) {



      filter = "contrast(1.12) brightness(1.0) saturate(1.1)";



    } else {



      filter = "contrast(1.0) brightness(1.0)";



    }



  } else {



    filter = "none";



  }







  if (portalFilterBoost) {
    filter = `${filter}${portalFilterBoost}`;
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

    visibility: opacity < 0.02 ? "hidden" : "visible",

    transform: isLogo && youtubeChannelInfo ? `scale(${zoomScale * transitionScale}) translateY(-100px)` : `scale(${zoomScale * transitionScale})`,



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







const CaptionLayer: React.FC<{
  captions: Caption[];
  captionStyle?: "shorts-viral" | "documentary";
  captionBgmPulse?: boolean;
  accentColor?: string;
}> = ({
  captions,
  captionStyle = "documentary",
  captionBgmPulse = false,
  accentColor = "#D4AF37",
}) => {



  const frame = useCurrentFrame();



  const { fps, width, height } = useVideoConfig();



  const currentMs = (frame / fps) * 1000;
  const isViralShorts = captionStyle === "shorts-viral";
  const maxWordsPerChunk = isViralShorts ? 1 : 2;
  const pauseThresholdMs = isViralShorts ? 400 : 600;
  const maxChunkDurationMs = isViralShorts ? 1800 : 2200;







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



        currentChunk.length >= maxWordsPerChunk ||



        (lastCap && cap.startMs - lastCap.endMs > pauseThresholdMs) ||



        (currentChunk.length > 0 && cap.endMs - currentChunk[0].startMs > maxChunkDurationMs)



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
        padding: isVertical
          ? (isViralShorts ? "0 48px 220px" : "0 72px 240px")
          : "0 180px 70px",
        pointerEvents: "none",
        zIndex: 90,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: isViralShorts ? 14 : (isVertical ? 22 : 16),
          rowGap: isViralShorts ? 8 : (isVertical ? 12 : 8),
          maxWidth: isVertical ? (isViralShorts ? 900 : 800) : 1000,
          background: isViralShorts ? "transparent" : "rgba(10, 10, 15, 0.75)",
          backdropFilter: isViralShorts ? "none" : "blur(12px)",
          border: isViralShorts ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
          padding: isViralShorts
            ? "0"
            : (isVertical ? "20px 40px" : "14px 28px"),
          borderRadius: isViralShorts ? 0 : "99px",
          boxShadow: isViralShorts ? "none" : "0 16px 40px rgba(0, 0, 0, 0.75)",
        }}
      >
        {activeChunk.words.map((word, index) => {
          const active = currentMs >= word.startMs && currentMs <= word.endMs;
          const wordFrame = Math.max(0, Math.round(((currentMs - word.startMs) / 1000) * fps));
          const popScale = isViralShorts && active
            ? spring({ fps, frame: wordFrame, config: { damping: 14, stiffness: 220, mass: 0.5 } })
            : 1;
          const bgmBeat = captionBgmPulse && isViralShorts && active
            ? 1 + 0.1 * Math.sin((frame / fps) * Math.PI * 4)
            : 1;
          const pulseGlow = captionBgmPulse && isViralShorts && active
            ? `0 0 20px ${accentColor}66, 0 0 40px ${accentColor}33`
            : undefined;
          return (
            <span
              key={`${word.startMs}-${index}`}
              style={{
                display: "inline-block",
                color: isViralShorts
                  ? (active ? "#0A0A0A" : "#FFFFFF")
                  : (active ? "#FACC15" : "#FFFFFF"),
                fontFamily: "'Montserrat', 'Inter', Arial, sans-serif",
                fontSize: isVertical
                  ? (isViralShorts ? 64 : 58)
                  : (isViralShorts ? 44 : 38),
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: isViralShorts ? "0.02em" : "0.05em",
                textTransform: "uppercase",
                whiteSpace: "pre",
                background: isViralShorts && active
                  ? "linear-gradient(135deg, #FACC15 0%, #FDE047 100%)"
                  : "transparent",
                padding: isViralShorts && active ? "6px 18px" : "0",
                borderRadius: isViralShorts ? "12px" : 0,
                textShadow: isViralShorts
                  ? (active
                    ? (pulseGlow || "0 2px 8px rgba(0,0,0,0.35)")
                    : "0 3px 12px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.5)")
                  : (active
                    ? "0 0 16px rgba(250,204,21,0.5), 0 2px 4px rgba(0,0,0,0.5)"
                    : "0 2px 4px rgba(0,0,0,0.5)"),
                transform: active
                  ? `scale(${(isViralShorts ? 0.92 + popScale * 0.14 : 1.08) * bgmBeat})`
                  : "scale(1.0)",
                transition: isViralShorts ? "none" : "transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.12s ease",
                opacity: active ? 1 : (isViralShorts ? 0.92 : 0.75),
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







const BGM_DUCK_PROFILES = {
  light: { speaking: [0.032, 0.055], near: [0.045, 0.095], idle: 0.105 },
  normal: { speaking: [0.024, 0.045], near: [0.035, 0.08], idle: 0.09 },
  strong: { speaking: [0.014, 0.03], near: [0.022, 0.055], idle: 0.065 },
} as const;

const BgmAudio: React.FC<{
  track: BgmTrack;
  captions: Caption[];
  narrationDuration?: number;
  musicVolume?: number;
  bgmDuckPoints?: number[];
  bgmDuckStrength?: "light" | "normal" | "strong";
}> = ({
  track,
  captions,
  narrationDuration = 0,
  musicVolume = 0.15,
  bgmDuckPoints = [],
  bgmDuckStrength = "normal",
}) => {
  const duck = BGM_DUCK_PROFILES[bgmDuckStrength] || BGM_DUCK_PROFILES.normal;
  const { fps, durationInFrames } = useVideoConfig();
  const totalDurationMs = (durationInFrames / fps) * 1000;
  const startFrame = Math.round(track.start * fps);
  const trackDurationMs = Math.max(500, track.duration * 1000);
  const narrationDurationMs = Math.max(0, narrationDuration * 1000);

  return (
    <Audio
      src={assetUrl(track.file)}
      trimBefore={track.startFrom ? Math.round(track.startFrom * fps) : 0}
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
            return interpolate(progress, [0, 1], [0.035, 0.08], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }) * envelope;
          }

          // 2. Check distance to narrator speaking interval
          let minDistance = Infinity;
          let isSpeaking = false;

          if (captions && captions.length > 0) {
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
          } else {
            // Fallback when there are no captions: duck volume during the entire narration
            isSpeaking = narrationDurationMs > 0 && currentMs <= narrationDurationMs;
          }

          let duckBoost = 0;
          for (const point of bgmDuckPoints) {
            const duckMs = point * 1000;
            const dist = Math.abs(currentMs - duckMs);
            if (dist < 700) {
              duckBoost = Math.max(duckBoost, interpolate(dist, [0, 700], [0.018, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }));
            }
          }

          if (isSpeaking) {
            const breath = (Math.sin((currentMs / 1000) * Math.PI * 0.42) + 1) / 2;
            return Math.max(0.012, interpolate(breath, [0, 1], duck.speaking) * envelope - duckBoost);
          }

          // Smooth transition over 600ms before/after narration starts/stops
          if (minDistance < 900) {
            return Math.max(0.015, interpolate(minDistance, [0, 900], duck.near) * envelope - duckBoost);
          }

          return Math.max(0.02, duck.idle * envelope - duckBoost);
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

  overlays = [],
  youtubeChannelInfo = null,
  transparent = false,
  format = "9:16",
  totalDuration = 30,
  captionStyle = "shorts-viral",
  grainOverlay = false,
  vignette = false,
  bgmDuckPoints = [],
  previewMode = false,
  showProgressBar = false,
  accentColor = "#C5A880",
  shortsZoomIntensity = "normal",
  longZoomIntensity = "normal",
  bgmDuckStrength = "normal",
  shortsHookFlash = true,
  shortsEdgeGlow = false,
  shortsCaptionBgmPulse = true,
  shortsPortalTransition = true,
  shortsPortalEvery = 4,
}) => {
  const isShort = format === "9:16";
  const showVignette = vignette;
  const showGrain = grainOverlay;



  const { fps } = useVideoConfig();



  const transitionFrames = 12; // 0.4 seconds overlap transition







  const lastScene = scenes[scenes.length - 1];
  const isLastSceneLogo = lastScene && (
    lastScene.asset.toLowerCase().includes("logo_final_") || 
    lastScene.asset.toLowerCase().includes("logo.") || 
    lastScene.asset.toLowerCase().includes("/logo")
  );

  return (



    <AbsoluteFill style={{ backgroundColor: transparent ? "transparent" : "#050506" }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&family=Cinzel:wght@700;900&family=Inter:wght@400;500;700&display=swap');
        `}
      </style>
      {scenes.map((scene, index) => {



        const isLast = index === scenes.length - 1;



        const isLogo = scene.asset.toLowerCase().includes("logo_final_") || scene.asset.toLowerCase().includes("logo.") || scene.asset.toLowerCase().includes("/logo");



        const overlap = (!isLast && !isLogo) ? transitionFrames : 0;



        const durationInFrames = Math.max(1, Math.round(scene.duration * fps)) + overlap;







        return (



          <Sequence



            key={`${scene.block}-${scene.asset}-${index}`}



            from={Math.round(scene.start * fps)}



            durationInFrames={durationInFrames}



            premountFor={fps}



            style={{ zIndex: index + 1 }}



          >



            <SceneMedia
              scene={scene}
              isFirst={index === 0}
              isLast={isLast}
              index={index}
              youtubeChannelInfo={youtubeChannelInfo}
              isShort={isShort}
              shortsZoomIntensity={shortsZoomIntensity}
              longZoomIntensity={longZoomIntensity}
              shortsPortalTransition={shortsPortalTransition}
              shortsPortalEvery={shortsPortalEvery}
              accentColor={accentColor}
            />



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



          <BgmAudio track={track} captions={captions} narrationDuration={narrationDuration} musicVolume={musicVolume} bgmDuckPoints={bgmDuckPoints} bgmDuckStrength={bgmDuckStrength} />



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







      {showVignette && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            zIndex: 5,
            background: isShort
              ? "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)"
              : "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {isShort && (shortsHookFlash || shortsEdgeGlow) && (
        <ShortsVisualFx
          hookFlash={shortsHookFlash}
          edgeGlow={shortsEdgeGlow}
          accentColor={accentColor}
        />
      )}

      {showGrain && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            zIndex: 6,
            opacity: isShort ? 0.06 : 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "180px 180px",
          }}
        />
      )}

      {previewMode && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            zIndex: 50,
            justifyContent: "flex-end",
            alignItems: "flex-end",
            padding: 16,
          }}
        >
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#F59E0B",
              background: "rgba(0,0,0,0.7)",
              padding: "6px 10px",
              borderRadius: 8,
              letterSpacing: "0.06em",
            }}
          >
            PREVIEW 30s
          </span>
        </AbsoluteFill>
      )}

      <CaptionLayer
        captions={captions}
        captionStyle={captionStyle}
        captionBgmPulse={isShort && shortsCaptionBgmPulse}
        accentColor={accentColor}
      />

      {!isShort && showProgressBar ? (
        <ProgressBar totalDuration={totalDuration} accentColor={accentColor} />
      ) : null}

      {/* Professional overlays: infographics, lower thirds, kinetic text */}
      <AbsoluteFill style={{ zIndex: 1000, pointerEvents: "none" }}>
        <OverlayLayer overlays={overlays} />
      </AbsoluteFill>

      {isLastSceneLogo && youtubeChannelInfo && (
        <Sequence
          from={Math.round(lastScene.start * fps)}
          durationInFrames={Math.max(1, Math.round(lastScene.duration * fps))}
          premountFor={fps}
        >
          <YoutubeSubOverlay channelInfo={youtubeChannelInfo} />
        </Sequence>
      )}



    </AbsoluteFill>



  );



};



