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
import { BlockProgressBar, type BlockProgressBarProps } from "./overlays/BlockProgressBar";
import { ShortsVisualFx } from "./overlays/ShortsVisualFx";







type TimelineScene = {



  block: number;



  asset: string;



  type: "image" | "video";



  start: number;



  duration: number;



  narrationText?: string;



  editorNotes?: string;

  volume?: number;

  playback_rate?: number;



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
  segmentId?: string;
  duckStrength?: "light" | "normal" | "strong";
  mood?: string;
  climaxMode?: string;
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
  /** HyperFrames caption mode (catálogo completo 17/17) */
  captionMode?: "caption-highlight" | "caption-kinetic-slam" | "caption-pill-karaoke" | "caption-neon-glow" | "caption-weight-shift" | "caption-gradient-fill" | "caption-glitch-rgb" | "caption-matrix-decode" | "caption-clip-wipe" | "caption-particle-burst" | "caption-neon-accent" | "caption-emoji-pop" | "caption-editorial-emphasis" | "caption-parallax-layers" | "caption-texture" | "caption-blend-difference" | "morph-text";
  captionEffect?: "viral-pop" | "viral-pulse" | "viral-static" | "doc-pill" | "doc-glow" | "doc-minimal" | string;
  designPreset?: string | null;
  grainOverlay?: boolean;
  vignette?: boolean;
  bgmDuckPoints?: number[];
  previewMode?: boolean;
  showProgressBar?: boolean;
  blockProgressBar?: BlockProgressBarProps | null;
  accentColor?: string;
  shortsZoomIntensity?: "normal" | "aggressive" | "cinematic";
  longZoomIntensity?: "normal" | "aggressive" | "cinematic";
  bgmDuckStrength?: "light" | "normal" | "strong";
  shortsHookFlash?: boolean;
  shortsEdgeGlow?: boolean;
  shortsCaptionBgmPulse?: boolean;
  shortsPortalTransition?: boolean;
  shortsPortalEvery?: number;
  canvasBackground?: string;
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

  captionMode: "caption-highlight",

  captionEffect: "caption-highlight",

  designPreset: null,

  grainOverlay: false,

  vignette: false,

  showProgressBar: false,

  blockProgressBar: null,

  accentColor: "#C5A880",

  shortsZoomIntensity: "normal",

  longZoomIntensity: "normal",

  bgmDuckStrength: "normal",

  shortsHookFlash: true,

  shortsEdgeGlow: false,

  shortsCaptionBgmPulse: true,

  shortsPortalTransition: true,

  shortsPortalEvery: 4,

  canvasBackground: "#050506",

};







const assetUrl = (file: string) => staticFile(file.replace(/\\/g, "/"));

const MEDIA_DELAY_RENDER_TIMEOUT_MS = 180_000;
const MEDIA_DELAY_RENDER_RETRIES = 2;







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

  let transitionBlur = 0;

  let transitionRotate = 0;

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

    const transitionMod = isShort ? 12 : 9;
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



    } else if (transitionType === 3) {



      const wipeTop = interpolate(frame, [0, transFrames], [100, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `inset(${wipeTop}% 0 0 0)`;



    } else if (transitionType === 4) {



      transitionScale = interpolate(frame, [0, transFrames], [0.88, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (transitionType === 5) {



      const circleSize = interpolate(frame, [0, transFrames], [0, 150], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `circle(${circleSize}% at 50% 50%)`;



    } else if (transitionType === 6) {



      const wipeRight = interpolate(frame, [0, transFrames], [100, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `inset(0 ${wipeRight}% 0 0)`;



    } else if (transitionType === 7) {



      const wipeBottom = interpolate(frame, [0, transFrames], [100, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `inset(0 0 ${wipeBottom}% 0)`;



    } else if (transitionType === 8) {



      transitionRotate = interpolate(frame, [0, transFrames], [isShort ? -4 : -2.5, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      transitionScale = interpolate(frame, [0, transFrames], [0.92, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (transitionType === 9) {



      transitionBlur = interpolate(frame, [0, transFrames], [isShort ? 14 : 10, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (transitionType === 10) {



      const diag = interpolate(frame, [0, transFrames], [0, 100], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



      clipPath = `polygon(0 0, ${diag}% 0, 0 ${diag}%)`;



    } else if (transitionType === 11) {



      const gridStep = Math.floor(interpolate(frame, [0, transFrames], [8, 0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      }));



      const cell = Math.max(0, gridStep) * 12.5;



      clipPath = `inset(${cell}% ${cell}% ${cell}% ${cell}%)`;



      transitionScale = interpolate(frame, [0, transFrames], [1.06, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



    } else if (transitionType === 12) {



      transitionScale = interpolate(frame, [0, transFrames], [isShort ? 1.35 : 1.22, 1.0], {



        extrapolateLeft: "clamp",



        extrapolateRight: "clamp",



      });



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

  if (transitionBlur > 0) {
    filter = filter && filter !== "none" ? `${filter} blur(${transitionBlur}px)` : `blur(${transitionBlur}px)`;
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

    transform: isLogo && youtubeChannelInfo
      ? `scale(${zoomScale * transitionScale}) rotate(${transitionRotate}deg) translateY(-100px)`
      : `scale(${zoomScale * transitionScale}) rotate(${transitionRotate}deg)`,



    backgroundColor: isLogo ? "#050506" : "transparent",



    padding: isLogo ? "10%" : "0",



    boxSizing: "border-box",



    clipPath,



    filter,



  };







  const clipVolume = scene.volume ?? 0;
  const clipRate = scene.playback_rate ?? 1;

  if (scene.type === "video") {



    return (



      <AbsoluteFill style={{ overflow: "hidden" }}>



        <Video
          src={assetUrl(scene.asset)}
          muted={clipVolume <= 0}
          loop={false}
          volume={clipVolume}
          playbackRate={clipRate}
          delayRenderTimeoutInMilliseconds={MEDIA_DELAY_RENDER_TIMEOUT_MS}
          delayRenderRetries={MEDIA_DELAY_RENDER_RETRIES}
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







type CaptionModeId =
  | "caption-highlight"
  | "caption-kinetic-slam"
  | "caption-pill-karaoke"
  | "caption-neon-glow"
  | "caption-weight-shift"
  | "caption-gradient-fill"
  | "caption-glitch-rgb"
  | "caption-matrix-decode"
  | "caption-clip-wipe"
  | "caption-particle-burst"
  | "caption-neon-accent"
  | "caption-emoji-pop"
  | "caption-editorial-emphasis"
  | "caption-parallax-layers"
  | "caption-texture"
  | "caption-blend-difference"
  | "morph-text";

const HF_CAPTION_MODES = new Set<CaptionModeId>([
  "caption-highlight",
  "caption-kinetic-slam",
  "caption-pill-karaoke",
  "caption-neon-glow",
  "caption-weight-shift",
  "caption-gradient-fill",
  "caption-glitch-rgb",
  "caption-matrix-decode",
  "caption-clip-wipe",
  "caption-particle-burst",
  "caption-neon-accent",
  "caption-emoji-pop",
  "caption-editorial-emphasis",
  "caption-parallax-layers",
  "caption-texture",
  "caption-blend-difference",
  "morph-text",
]);

const EMOJI_POP_POOL = ["✨", "🔥", "💡", "⚡", "🎯", "💥"];

const MATRIX_SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

function scrambleCaptionText(text: string, progress: number, seed: number): string {
  if (progress >= 1) return text;
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      const revealAt = (i + 1) / Math.max(text.length, 1);
      if (progress >= revealAt) return ch;
      return MATRIX_SCRAMBLE[(seed + i * 11 + Math.floor(progress * 20)) % MATRIX_SCRAMBLE.length];
    })
    .join("");
}

const BURST_PARTICLES = [
  { x: -22, y: -16, c: "#FF4D6D" },
  { x: 20, y: -12, c: "#22D3EE" },
  { x: -14, y: 18, c: "#FACC15" },
  { x: 24, y: 10, c: "#A78BFA" },
  { x: -28, y: 8, c: "#4ADE80" },
  { x: 10, y: -22, c: "#FB923C" },
  { x: -6, y: 24, c: "#F472B6" },
  { x: 18, y: 20, c: "#38BDF8" },
];

function resolveCaptionMode(
  captionMode?: string,
  captionEffect?: string,
  captionStyle: "shorts-viral" | "documentary" = "documentary",
): CaptionModeId {
  if (captionMode && HF_CAPTION_MODES.has(captionMode as CaptionModeId)) {
    return captionMode as CaptionModeId;
  }
  if (captionEffect && HF_CAPTION_MODES.has(captionEffect as CaptionModeId)) {
    return captionEffect as CaptionModeId;
  }
  const legacyMap: Record<string, CaptionModeId> = {
    "viral-pop": "caption-highlight",
    "viral-pulse": "caption-highlight",
    "viral-static": "caption-highlight",
    "doc-pill": "caption-pill-karaoke",
    "doc-glow": "caption-neon-glow",
    "doc-minimal": "caption-weight-shift",
  };
  if (captionEffect && legacyMap[captionEffect]) return legacyMap[captionEffect];
  return captionStyle === "shorts-viral" ? "caption-highlight" : "caption-pill-karaoke";
}

function isWordByWordCaptionMode(mode: CaptionModeId): boolean {
  return mode !== "caption-pill-karaoke"
    && mode !== "caption-weight-shift"
    && mode !== "caption-editorial-emphasis";
}

const CaptionLayer: React.FC<{
  captions: Caption[];
  captionStyle?: "shorts-viral" | "documentary";
  captionMode?: CaptionModeId;
  captionEffect?: string;
  captionBgmPulse?: boolean;
  accentColor?: string;
}> = ({
  captions,
  captionStyle = "documentary",
  captionMode,
  captionEffect,
  captionBgmPulse = false,
  accentColor = "#D4AF37",
}) => {



  const frame = useCurrentFrame();



  const { fps, width, height } = useVideoConfig();



  const currentMs = (frame / fps) * 1000;
  const mode = resolveCaptionMode(captionMode, captionEffect, captionStyle);
  const isViralShorts = isWordByWordCaptionMode(mode);
  const isSlam = mode === "caption-kinetic-slam";
  const isPill = mode === "caption-pill-karaoke";
  const isNeon = mode === "caption-neon-glow";
  const isWeight = mode === "caption-weight-shift";
  const isGradient = mode === "caption-gradient-fill";
  const isHighlight = mode === "caption-highlight";
  const isGlitch = mode === "caption-glitch-rgb";
  const isMatrix = mode === "caption-matrix-decode";
  const isWipe = mode === "caption-clip-wipe";
  const isBurst = mode === "caption-particle-burst";
  const isNeonAccent = mode === "caption-neon-accent";
  const isEmojiPop = mode === "caption-emoji-pop";
  const isEditorial = mode === "caption-editorial-emphasis";
  const isParallax = mode === "caption-parallax-layers";
  const isTexture = mode === "caption-texture";
  const isBlendDiff = mode === "caption-blend-difference";
  const isMorph = mode === "morph-text";
  const viralStatic = isHighlight && captionEffect === "viral-static";
  const viralPulse = isHighlight && (captionBgmPulse || captionEffect === "viral-pulse") && !viralStatic;
  const viralPop = isHighlight && !viralStatic;
  const maxWordsPerChunk = isWordByWordCaptionMode(mode) ? 1 : 2;
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



  }, [captions, maxWordsPerChunk, pauseThresholdMs, maxChunkDurationMs]);







  // Find the currently active static chunk



  const activeChunk = chunks.find(



    (chunk) => currentMs >= chunk.startMs && currentMs <= chunk.endMs



  );







  if (!activeChunk) return null;







  const isVertical = height > width;







  const wordsToRender = isSlam
    ? activeChunk.words.filter((word) => currentMs >= word.startMs && currentMs <= word.endMs)
    : activeChunk.words;

  if (isSlam && wordsToRender.length === 0) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: isSlam ? "center" : "flex-end",
        alignItems: "center",
        padding: isSlam
          ? (isVertical ? "0 40px" : "0 120px")
          : isVertical
            ? (isViralShorts ? "0 48px 220px" : "0 72px 240px")
            : "0 180px 70px",
        pointerEvents: "none",
        zIndex: 90,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: isViralShorts ? 14 : (isVertical ? 22 : 16),
          rowGap: isViralShorts ? 8 : (isVertical ? 12 : 8),
          maxWidth: isVertical ? (isSlam ? 920 : (isViralShorts ? 900 : 800)) : 1000,
          background: isPill ? "rgba(10, 10, 15, 0.75)" : "transparent",
          backdropFilter: isPill ? "blur(12px)" : "none",
          border: isPill ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
          padding: isPill
            ? (isVertical ? "20px 40px" : "14px 28px")
            : "0",
          borderRadius: isPill ? "99px" : 0,
          boxShadow: isPill ? "0 16px 40px rgba(0, 0, 0, 0.75)" : "none",
        }}
      >
        {isGlitch && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.14) 2px, rgba(0,0,0,0.14) 4px)",
              mixBlendMode: "overlay",
              borderRadius: isPill ? "99px" : 0,
            }}
          />
        )}
        {wordsToRender.map((word, index) => {
          const active = currentMs >= word.startMs && currentMs <= word.endMs;
          const wordFrame = Math.max(0, Math.round(((currentMs - word.startMs) / 1000) * fps));
          const matrixProgress = Math.min(1, wordFrame / 14);
          const wipeProgress = Math.min(1, wordFrame / 12);
          const burstFade = active
            ? interpolate(wordFrame, [0, 18], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;
          const glitchShift = Math.sin((frame + index * 3) / 3) * 3;
          const displayText = isMatrix && active
            ? scrambleCaptionText(word.text, matrixProgress, word.startMs)
            : word.text;
          const popScale = (viralPop || isGradient) && active
            ? spring({ fps, frame: wordFrame, config: { damping: 14, stiffness: 220, mass: 0.5 } })
            : 1;
          const slamScale = isSlam && active
            ? spring({ fps, frame: wordFrame, config: { damping: 12, stiffness: 180, mass: 0.8 } })
            : 1;
          const bgmBeat = viralPulse && active
            ? 1 + 0.1 * Math.sin((frame / fps) * Math.PI * 4)
            : 1;
          const pulseGlow = viralPulse && active
            ? `0 0 20px ${accentColor}66, 0 0 40px ${accentColor}33`
            : undefined;
          const slamDir = index % 2 === 0 ? -48 : 48;
          const slamOffset = isSlam && active
            ? (1 - slamScale) * slamDir
            : 0;
          const morphBlur = isMorph && active
            ? interpolate(wordFrame, [0, 10], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;
          const morphScale = isMorph && active
            ? interpolate(wordFrame, [0, 12], [1.25, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 1;
          const neonAccentHue = (frame * 4 + index * 40) % 360;
          const neonAccentColor = `hsl(${neonAccentHue}, 95%, 62%)`;
          const wiggleX = isNeonAccent && active ? Math.sin((frame + index * 5) / 5) * 4 : 0;
          const wiggleY = isNeonAccent && active ? Math.cos((frame + index * 3) / 6) * 3 : 0;
          const textureShift = (frame * 2) % 100;
          const emojiPopScale = isEmojiPop && active
            ? spring({ fps, frame: wordFrame, config: { damping: 10, stiffness: 200, mass: 0.45 } })
            : 0;
          const emojiGlyph = EMOJI_POP_POOL[index % EMOJI_POP_POOL.length];

          let baseFont = isVertical
            ? (isSlam ? 88 : isViralShorts ? 64 : isWeight ? 52 : 58)
            : (isSlam ? 72 : isViralShorts ? 44 : isWeight ? 34 : 38);
          if (isEditorial && active) baseFont *= 1.35;
          if (isEditorial && !active) baseFont *= 0.82;
          if (isParallax && !active) baseFont *= 0.78;

          let color = "#FFFFFF";
          if (isBlendDiff) color = "#FFFFFF";
          else if (isHighlight && active) color = "#0A0A0A";
          else if (isGlitch && active) color = "#E2E8F0";
          else if (isMatrix && active && matrixProgress < 1) color = "#4ADE80";
          else if (isNeonAccent && active) color = neonAccentColor;
          else if (isNeon && active) color = "#22D3EE";
          else if (active) color = accentColor;

          const gradientText = (isGradient || isTexture) && active
            ? {
                backgroundImage: isTexture
                  ? `linear-gradient(${textureShift}deg, #F97316, #DC2626, #78350F, #FBBF24, #F97316)`
                  : `linear-gradient(135deg, ${accentColor}, #F472B6, #22D3EE)`,
                backgroundSize: isTexture ? "200% 200%" : undefined,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }
            : {};

          const fontFamily = isEditorial && active
            ? "'Cinzel', 'Playfair Display', Georgia, serif"
            : isMatrix && active && matrixProgress < 1
              ? "'Courier New', Courier, monospace"
              : "'Montserrat', 'Inter', Arial, sans-serif";

          return (
            <span
              key={`${word.startMs}-${index}`}
              style={{
                position: "relative",
                display: "inline-flex",
                flexDirection: isEmojiPop ? "column" : "row",
                alignItems: "center",
                color,
                fontFamily,
                fontSize: baseFont,
                fontWeight: isWeight ? (active ? 900 : 300) : isEditorial && !active ? 500 : 900,
                mixBlendMode: isBlendDiff ? "difference" : undefined,
                filter: isMorph && active ? `blur(${morphBlur}px)` : undefined,
                lineHeight: 1.1,
                letterSpacing: isViralShorts || isSlam ? "0.02em" : "0.05em",
                textTransform: "uppercase",
                whiteSpace: "pre",
                background: isHighlight && active
                  ? `linear-gradient(135deg, ${accentColor} 0%, #FDE047 100%)`
                  : "transparent",
                padding: isHighlight && active ? "6px 18px" : "0",
                borderRadius: isHighlight && active ? "12px" : 0,
                clipPath: isWipe && active
                  ? `inset(0 ${Math.round((1 - wipeProgress) * 100)}% 0 0)`
                  : undefined,
                textShadow: isHighlight
                  ? (active
                    ? (pulseGlow || "0 2px 8px rgba(0,0,0,0.35)")
                    : "0 3px 12px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.5)")
                  : isGlitch && active
                    ? `${glitchShift - 3}px 0 #FF4D6D, ${glitchShift + 3}px 0 #22D3EE, 0 0 10px rgba(255,255,255,0.35)`
                    : isNeonAccent && active
                    ? `0 0 14px ${neonAccentColor}, 0 0 26px #F472B6`
                    : isNeon && active
                      ? "0 0 16px #22D3EE, 0 0 28px #F472B6"
                      : isMatrix && active && matrixProgress < 1
                        ? "0 0 12px rgba(74,222,128,0.6)"
                        : active
                          ? `0 0 14px ${accentColor}88, 0 2px 4px rgba(0,0,0,0.5)`
                          : "0 2px 4px rgba(0,0,0,0.5)",
                transform: active
                  ? isSlam
                    ? `translateX(${slamOffset}px) scale(${0.75 + slamScale * 0.35})`
                    : isMorph
                      ? `scale(${morphScale})`
                      : isNeonAccent
                        ? `translate(${wiggleX}px, ${wiggleY}px) scale(1.06)`
                        : isParallax
                          ? "scale(1.06) translateY(-4px)"
                          : `scale(${(isViralShorts || isGradient ? 0.92 + popScale * 0.14 : 1.08) * bgmBeat})`
                  : isParallax
                    ? "scale(0.78) translateY(6px)"
                    : "scale(1.0)",
                transition: isViralShorts || isSlam || isWipe || isMatrix || isMorph || isNeonAccent ? "none" : "transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.12s ease",
                opacity: active ? 1 : (isWeight || isParallax ? 0.6 : isViralShorts ? 0.92 : 0.75),
                zIndex: isParallax && active ? 2 : isParallax ? 1 : undefined,
                ...gradientText,
              }}
            >
              {isEmojiPop && active && (
                <span
                  style={{
                    fontSize: isVertical ? 42 : 32,
                    lineHeight: 1,
                    transform: `scale(${0.6 + emojiPopScale * 0.5})`,
                    marginBottom: isVertical ? 6 : 4,
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
                  }}
                >
                  {emojiGlyph}
                </span>
              )}
              {displayText}
              {isBurst && active && burstFade > 0 && BURST_PARTICLES.map((p, pi) => (
                <span
                  key={pi}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: isVertical ? 8 : 6,
                    height: isVertical ? 8 : 6,
                    marginLeft: p.x * burstFade,
                    marginTop: p.y * burstFade,
                    borderRadius: "50%",
                    background: p.c,
                    opacity: burstFade,
                    boxShadow: `0 0 10px ${p.c}`,
                    pointerEvents: "none",
                  }}
                />
              ))}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );



};







/** Shorts: duck agressivo para punch viral. */
const BGM_DUCK_PROFILES_SHORT = {
  light: { speaking: [0.032, 0.055], near: [0.045, 0.095], idle: 0.105 },
  normal: { speaking: [0.024, 0.045], near: [0.035, 0.08], idle: 0.09 },
  strong: { speaking: [0.014, 0.03], near: [0.022, 0.055], idle: 0.065 },
} as const;

/** Longos: trilha audível sob narração contínua (documentário). */
const BGM_DUCK_PROFILES_LONG = {
  light: { speaking: [0.14, 0.2], near: [0.16, 0.22], idle: 0.28 },
  normal: { speaking: [0.11, 0.17], near: [0.14, 0.2], idle: 0.24 },
  strong: { speaking: [0.08, 0.13], near: [0.11, 0.16], idle: 0.2 },
} as const;

const BgmAudio: React.FC<{
  track: BgmTrack;
  captions: Caption[];
  narrationDuration?: number;
  musicVolume?: number;
  bgmDuckPoints?: number[];
  bgmDuckStrength?: "light" | "normal" | "strong";
  format?: string;
}> = ({
  track,
  captions,
  narrationDuration = 0,
  musicVolume = 0.15,
  bgmDuckPoints = [],
  bgmDuckStrength = "normal",
  format = "9:16",
}) => {
  const isLongForm = format === "16:9";
  const profiles = isLongForm ? BGM_DUCK_PROFILES_LONG : BGM_DUCK_PROFILES_SHORT;
  const duck = profiles[bgmDuckStrength] || profiles.normal;
  const minSpeakingVol = isLongForm ? 0.06 : 0.012;
  const minNearVol = isLongForm ? 0.08 : 0.015;
  const minIdleVol = isLongForm ? 0.1 : 0.02;
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
      delayRenderTimeoutInMilliseconds={MEDIA_DELAY_RENDER_TIMEOUT_MS}
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
            return Math.max(minSpeakingVol, interpolate(breath, [0, 1], duck.speaking) * envelope - duckBoost);
          }

          // Smooth transition over 600ms before/after narration starts/stops
          if (minDistance < 900) {
            return Math.max(minNearVol, interpolate(minDistance, [0, 900], duck.near) * envelope - duckBoost);
          }

          return Math.max(minIdleVol, duck.idle * envelope - duckBoost);
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
      delayRenderTimeoutInMilliseconds={MEDIA_DELAY_RENDER_TIMEOUT_MS}
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
  captionMode,
  captionEffect,
  grainOverlay = false,
  vignette = false,
  bgmDuckPoints = [],
  previewMode = false,
  showProgressBar = false,
  blockProgressBar = null,
  accentColor = "#C5A880",
  shortsZoomIntensity = "normal",
  longZoomIntensity = "normal",
  bgmDuckStrength = "normal",
  shortsHookFlash = true,
  shortsEdgeGlow = false,
  shortsCaptionBgmPulse = true,
  shortsPortalTransition = true,
  shortsPortalEvery = 4,
  canvasBackground = "#050506",
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



    <AbsoluteFill style={{ backgroundColor: transparent ? "transparent" : canvasBackground }}>
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



          <BgmAudio
            track={track}
            captions={captions}
            narrationDuration={narrationDuration}
            musicVolume={musicVolume}
            bgmDuckPoints={bgmDuckPoints}
            bgmDuckStrength={track.duckStrength || bgmDuckStrength}
            format={format}
          />



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



        <Audio
          src={assetUrl(narration)}
          volume={1}
          delayRenderTimeoutInMilliseconds={MEDIA_DELAY_RENDER_TIMEOUT_MS}
        />



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
        captionMode={captionMode}
        captionEffect={captionEffect}
        captionBgmPulse={isShort && shortsCaptionBgmPulse}
        accentColor={accentColor}
      />

      {blockProgressBar?.enabled && blockProgressBar.blocks?.length ? (
        <BlockProgressBar
          totalDuration={blockProgressBar.totalDuration || totalDuration}
          blocks={blockProgressBar.blocks}
          design={blockProgressBar.design}
          iconSize={blockProgressBar.iconSize}
          defaultIconStyle={blockProgressBar.defaultIconStyle}
          showBlockTitles={blockProgressBar.showBlockTitles === true}
          titleFont={blockProgressBar.titleFont}
          titleFontSize={blockProgressBar.titleFontSize}
          titleColor={blockProgressBar.titleColor}
          accentColor={accentColor}
          orientation={isShort ? "vertical" : "horizontal"}
          showChannelLogo={blockProgressBar.showChannelLogo}
          channelLogoSize={blockProgressBar.channelLogoSize}
          channelLogoSrc={blockProgressBar.channelLogoSrc}
        />
      ) : !isShort && showProgressBar ? (
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



