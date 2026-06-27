import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SafeLottie } from "./SafeLottie";

import sparklesLottie from "./lottie_assets/sparkles.json";
import flameLottie from "./lottie_assets/flame.json";
import globeLottie from "./lottie_assets/globe.json";
import infoLottie from "./lottie_assets/info.json";
import gearLottie from "./lottie_assets/lottie_ui_gear_1.json";
import lockLottie from "./lottie_assets/lottie_ui_lock_3.json";
import crownLottie from "./lottie_assets/lottie_biz_crown_1.json";
import apiLottie from "./lottie_assets/lottie_tech_api_1.json";
import timeLottie from "./lottie_assets/lottie_ui_time_1.json";
import windLottie from "./lottie_assets/weather_wind.json";
import moneyLottie from "./lottie_assets/lottie_biz_money_1.json";
import warningLottie from "./lottie_assets/lottie_ui_warning_1.json";
import locationLottie from "./lottie_assets/lottie_life_location_1.json";
import docLottie from "./lottie_assets/lottie_tech_document_1.json";
import heartLottie from "./lottie_assets/lottie_interact_heart_1.json";
import ideaLottie from "./lottie_assets/lottie_life_idea_1.json";

const lottieMap: Record<string, any> = {
  sparkles: sparklesLottie,
  flame: flameLottie,
  earth: globeLottie,
  building: globeLottie,
  info: infoLottie,
  gear: gearLottie,
  shield: lockLottie,
  crown: crownLottie,
  science: apiLottie,
  history: timeLottie,
  nature: windLottie,
  money: moneyLottie,
  warning: warningLottie,
  compass: locationLottie,
  book: docLottie,
  heart: heartLottie,
  lightbulb: ideaLottie,
};

export interface InfoCardProps {
  title: string;
  description: string;
  iconType?: 
    | "sparkles" 
    | "gear" 
    | "shield" 
    | "flame" 
    | "info" 
    | "earth" 
    | "building" 
    | "crown"
    | "science"
    | "history"
    | "nature"
    | "money"
    | "warning"
    | "compass"
    | "book"
    | "heart"
    | "swords"
    | "lightbulb";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  accentColor?: string;
  variant?: "glass" | "minimal" | "accent" | "floating";
  theme?: "ancient" | "tech" | "nature" | "industrial" | "mysterious" | "classic";
  customStyle?: {
    background?: string;
    border?: string;
    borderLeft?: string;
    borderRadius?: string;
    boxShadow?: string;
    padding?: string;
    fontFamilyTitle?: string;
    fontFamilyDesc?: string;
    letterSpacingTitle?: string;
    textTransformTitle?: "uppercase" | "none" | "capitalize";
    fontSizeTitle?: number;
    fontSizeDesc?: number;
    colorTitle?: string;
    colorDesc?: string;
  };
}

const ANIM_IN_FRAMES = 15;
const ANIM_OUT_FRAMES = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Premium Animated SVG Vector Drawings (Expanded Arsenal)
// ─────────────────────────────────────────────────────────────────────────────

const SparklesSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>
      {`
        @keyframes shine {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .star1 { animation: shine 1.8s infinite ease-in-out; transform-origin: 12px 12px; }
        .star2 { animation: shine 1.8s infinite ease-in-out; animation-delay: 0.6s; transform-origin: 5px 6px; }
        .star3 { animation: shine 1.8s infinite ease-in-out; animation-delay: 1.2s; transform-origin: 18px 17px; }
      `}
    </style>
    <path className="star1" d="M12 2L14.3 8.3L21 9L15.8 13.5L17.5 20L12 16.5L6.5 20L8.2 13.5L3 9L9.7 8.3L12 2Z" fill={color} />
    <path className="star2" d="M5 2L5.8 4.2L8 4.5L6.2 6L6.8 8.2L5 7L3.2 8.2L3.8 6L2 4.5L4.2 4.2L5 2Z" fill={color} opacity="0.8" />
    <path className="star3" d="M18 13L18.6 14.6L20.2 14.8L19 16L19.4 17.6L18 16.7L16.6 17.6L17 16L15.8 14.8L17.4 14.6L18 13Z" fill={color} opacity="0.8" />
  </svg>
);

const FlameSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>
      {`
        @keyframes flicker {
          0%, 100% { transform: scale(0.9) translateY(0); opacity: 0.95; }
          50% { transform: scale(1.05) translateY(-1px); opacity: 1; }
        }
        .flame-body { animation: flicker 1.2s infinite ease-in-out; transform-origin: 12px 20px; }
      `}
    </style>
    <path
      className="flame-body"
      d="M12 2C12 2 17 6.5 17 11.5C17 14.5 14.8 17 12 17C9.2 17 7 14.5 7 11.5C7 6.5 12 2 12 2Z"
      fill="url(#flame-grad)"
    />
    <path
      className="flame-body"
      style={{ animationDelay: "0.3s" }}
      d="M12 7C12 7 15 10 15 13.5C15 15.5 13.5 17 12 17C10.5 17 9 15.5 9 13.5C9 10 12 7 12 7Z"
      fill="#FFF"
      opacity="0.8"
    />
    <defs>
      <linearGradient id="flame-grad" x1="12" y1="2" x2="12" y2="17" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF" />
        <stop offset="35%" stopColor={color} />
        <stop offset="100%" stopColor="#FF4500" />
      </linearGradient>
    </defs>
  </svg>
);

const EarthSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes spin-globe {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .globe-spin { animation: spin-globe 10s infinite linear; transform-origin: 12px 12px; }
      `}
    </style>
    <g className="globe-spin">
      <circle cx="12" cy="12" r="10" stroke={color} fill="none" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </g>
  </svg>
);

const GearSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes spin-gear {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .gear-spin { animation: spin-gear 6s infinite linear; transform-origin: 12px 12px; }
      `}
    </style>
    <path
      className="gear-spin"
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ShieldSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes shine-shield {
          0% { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: -60; }
        }
        .shield-shine { stroke-dasharray: 20 40; animation: shine-shield 3s infinite linear; }
      `}
    </style>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" />
    <path className="shield-shine" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#FFF" />
  </svg>
);

const CrownSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes pulse-crown {
          0%, 100% { transform: scale(0.95); }
          50% { transform: scale(1.05); }
        }
        .crown-pulse { animation: pulse-crown 2s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <path className="crown-pulse" d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill={color} opacity="0.3" />
    <path className="crown-pulse" d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path className="crown-pulse" d="M3 20h18" />
  </svg>
);

const InfoSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes pulse-info {
          0%, 100% { transform: scale(0.95); opacity: 0.95; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .info-pulse { animation: pulse-info 2.5s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <circle className="info-pulse" cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const AtomSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <style>
      {`
        @keyframes orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .orbit1 { animation: orbit 4s infinite linear; transform-origin: 12px 12px; }
        .orbit2 { animation: orbit 6s infinite linear; transform-origin: 12px 12px; }
      `}
    </style>
    <circle cx="12" cy="12" r="2" fill={color} />
    <ellipse className="orbit1" cx="12" cy="12" rx="10" ry="3" />
    <ellipse className="orbit2" style={{ transform: "rotate(60deg)", transformOrigin: "12px 12px" }} cx="12" cy="12" rx="10" ry="3" />
    <ellipse className="orbit1" style={{ transform: "rotate(120deg)", transformOrigin: "12px 12px" }} cx="12" cy="12" rx="10" ry="3" />
  </svg>
);

const HourglassSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes flip { 0%, 90% { transform: rotate(0deg); } 100% { transform: rotate(180deg); } }
        .hourglass-flip { animation: flip 4s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <g className="hourglass-flip">
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" />
      <circle cx="12" cy="5" r="1" fill={color} />
      <circle cx="12" cy="19" r="2" fill={color} />
    </g>
  </svg>
);

const LeafSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>
      {`
        @keyframes sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(10deg); } }
        .leaf-sway { animation: sway 3s infinite ease-in-out; transform-origin: 2px 22px; }
      `}
    </style>
    <path className="leaf-sway" d="M2 22C2 22 6 18 8 16M11 2C4 2 2 9 2 9C2 9 9 11 16 4C16 4 19 8 17 13C15 18 10 20 10 20C10 20 12 14 11 11" />
  </svg>
);

const CoinSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>
      {`
        @keyframes coin-spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        .coin-spin { animation: coin-spin 3s infinite linear; transform-origin: 12px 12px; }
      `}
    </style>
    <circle className="coin-spin" cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <path className="coin-spin" d="M12 6v12M14.5 9H11a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AlertSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes blink-alert { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .alert-blink { animation: blink-alert 1.2s infinite ease-in-out; }
      `}
    </style>
    <path className="alert-blink" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={`${color}15`} />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CompassSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes wiggle { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
        .compass-wiggle { animation: wiggle 2.5s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <circle cx="12" cy="12" r="10" />
    <polygon className="compass-wiggle" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={`${color}25`} />
  </svg>
);

const BookSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes page-turn { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.7); } }
        .page-turn { animation: page-turn 3s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path className="page-turn" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={`${color}10`} />
  </svg>
);

const HeartSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>
      {`
        @keyframes heartbeat { 0%, 100% { transform: scale(0.9); } 25%, 60% { transform: scale(1.1); } }
        .heartbeat { animation: heartbeat 1.5s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <path className="heartbeat" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
  </svg>
);

const SwordsSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes clash {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(1px, -1px) rotate(5deg); }
        }
        .swords-clash { animation: clash 1s infinite ease-in-out; transform-origin: 12px 12px; }
      `}
    </style>
    <g className="swords-clash">
      <line x1="2" y1="22" x2="22" y2="2" />
      <line x1="22" y1="22" x2="2" y2="2" />
      <path d="M5 15l4 4M19 15l-4 4" />
    </g>
  </svg>
);

const LightbulbSVG: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <style>
      {`
        @keyframes glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .bulb-glow { animation: glow 2s infinite ease-in-out; }
      `}
    </style>
    <path className="bulb-glow" d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5" fill={`${color}15`} />
    <path d="M9 18h6M10 22h4" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Corner Ornaments Components for Themes
// ─────────────────────────────────────────────────────────────────────────────

const TechCorners: React.FC<{ color: string }> = () => null;

const AncientCorners: React.FC<{ color: string }> = () => null;

const IndustrialRivets: React.FC = () => null;

const MysteriousStars: React.FC<{ color: string }> = () => null;

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  iconType = "info",
  position = "top-left",
  accentColor = "#D4AF37",
  variant = "glass",
  theme = "classic",
  customStyle,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isVertical = height > width;

  // Slide & Fade animation
  const slideIn = interpolate(frame, [0, ANIM_IN_FRAMES], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, ANIM_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const { durationInFrames } = useVideoConfig();
  const outStart = durationInFrames - ANIM_OUT_FRAMES;
  const slideOut = interpolate(frame, [outStart, durationInFrames], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(fadeIn, fadeOut);

  // Position coordinates
  const positionStyle: React.CSSProperties = {};
  
  if (position.includes("top")) {
    positionStyle.top = isVertical ? 180 : 80;
  } else {
    positionStyle.bottom = isVertical ? 640 : 210;
  }

  if (position.includes("left")) {
    positionStyle.left = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideIn - slideOut}px)`;
  } else {
    positionStyle.right = isVertical ? 48 : 64;
    positionStyle.transform = `translateX(${slideOut - slideIn}px)`;
  }

  const size = isVertical ? 42 : 32;

  const renderIcon = () => {
    const lottieData = lottieMap[iconType];
    if (lottieData) {
      return <SafeLottie animationData={lottieData} style={{ width: size, height: size }} />;
    }
    switch (iconType) {
      case "sparkles":
        return <SparklesSVG size={size} color={accentColor} />;
      case "flame":
        return <FlameSVG size={size} color={accentColor} />;
      case "earth":
      case "building":
        return <EarthSVG size={size} color={accentColor} />;
      case "gear":
        return <GearSVG size={size} color={accentColor} />;
      case "shield":
        return <ShieldSVG size={size} color={accentColor} />;
      case "crown":
        return <CrownSVG size={size} color={accentColor} />;
      case "science":
        return <AtomSVG size={size} color={accentColor} />;
      case "history":
        return <HourglassSVG size={size} color={accentColor} />;
      case "nature":
        return <LeafSVG size={size} color={accentColor} />;
      case "money":
        return <CoinSVG size={size} color={accentColor} />;
      case "warning":
        return <AlertSVG size={size} color={accentColor} />;
      case "compass":
        return <CompassSVG size={size} color={accentColor} />;
      case "book":
        return <BookSVG size={size} color={accentColor} />;
      case "heart":
        return <HeartSVG size={size} color={accentColor} />;
      case "swords":
        return <SwordsSVG size={size} color={accentColor} />;
      case "lightbulb":
        return <LightbulbSVG size={size} color={accentColor} />;
      case "info":
      default:
        return <InfoSVG size={size} color={accentColor} />;
    }
  };

  // Layout variants mapping (classic style)
  const variantStyles: Record<string, React.CSSProperties> = {
    glass: {
      background: "linear-gradient(135deg, rgba(6,6,10,0.95) 0%, rgba(14,14,20,0.92) 100%)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "8px",
    },
    minimal: {
      background: "rgba(5, 5, 8, 0.65)",
      backdropFilter: "blur(20px)",
      border: "none",
      borderLeft: `2.5px dashed ${accentColor}`,
      borderRadius: "4px",
    },
    accent: {
      background: `linear-gradient(135deg, rgba(6,6,10,0.95) 0%, ${accentColor}12 100%)`,
      backdropFilter: "blur(14px)",
      border: `1px solid ${accentColor}40`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: "6px",
    },
    floating: {
      background: "rgba(10,10,15,0.98)",
      backdropFilter: "blur(16px)",
      border: `2px solid ${accentColor}`,
      borderRadius: "16px",
    }
  };

  // Theme custom styling mapper
  const getThemeStyle = (): React.CSSProperties => {
    let base: React.CSSProperties = {};
    switch (theme) {
      case "ancient":
        base = {
          background: "linear-gradient(135deg, rgba(22, 16, 12, 0.88) 0%, rgba(36, 26, 20, 0.82) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "tech":
        base = {
          background: "linear-gradient(135deg, rgba(8, 12, 16, 0.85) 0%, rgba(14, 20, 28, 0.8) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}25`,
        };
        break;
      case "nature":
        base = {
          background: "linear-gradient(135deg, rgba(8, 14, 10, 0.85) 0%, rgba(14, 24, 18, 0.8) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "industrial":
        base = {
          background: "linear-gradient(135deg, rgba(16, 16, 18, 0.9) 0%, rgba(26, 26, 30, 0.85) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}20`,
        };
        break;
      case "mysterious":
        base = {
          background: "linear-gradient(135deg, rgba(12, 8, 16, 0.88) 0%, rgba(22, 14, 30, 0.82) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.08)",
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: "16px",
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px ${accentColor}25`,
        };
        break;
      case "classic":
      default:
        base = {
          ...variantStyles[variant],
          borderRadius: "16px", // Ensure standard variants have rounded corners too
        };
        break;
    }

    if (customStyle) {
      base = {
        ...base,
        ...customStyle,
      };
    }
    return base;
  };

  const getThemeFont = (type: "title" | "desc") => {
    let fontStyle: React.CSSProperties = {};
    if (type === "title") {
      switch (theme) {
        case "ancient":
        case "mysterious":
        case "industrial":
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 800, letterSpacing: "0.03em" };
          break;
        case "tech":
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 900, letterSpacing: "0.04em" };
          break;
        case "nature":
        default:
          fontStyle = { fontFamily: "'Montserrat', sans-serif", fontWeight: 900 };
          break;
      }
      if (customStyle?.fontFamilyTitle) fontStyle.fontFamily = customStyle.fontFamilyTitle;
      if (customStyle?.letterSpacingTitle) fontStyle.letterSpacing = customStyle.letterSpacingTitle;
      if (customStyle?.textTransformTitle) fontStyle.textTransform = customStyle.textTransformTitle;
      if (customStyle?.fontSizeTitle) fontStyle.fontSize = isVertical ? customStyle.fontSizeTitle * 1.4 : customStyle.fontSizeTitle;
      if (customStyle?.colorTitle) fontStyle.color = customStyle.colorTitle;
    } else {
      switch (theme) {
        case "tech":
        default:
          fontStyle = { fontFamily: "'Inter', sans-serif" };
          break;
      }
      if (customStyle?.fontFamilyDesc) fontStyle.fontFamily = customStyle.fontFamilyDesc;
      if (customStyle?.fontSizeDesc) fontStyle.fontSize = isVertical ? customStyle.fontSizeDesc * 1.4 : customStyle.fontSizeDesc;
      if (customStyle?.colorDesc) fontStyle.color = customStyle.colorDesc;
    }
    return fontStyle;
  };

  return (
    <AbsoluteFill
      style={{
        position: "absolute",
        ...positionStyle,
        opacity,
        pointerEvents: "none",
        width: isVertical ? 680 : 400,
        height: "auto",
        zIndex: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          padding: variant === "floating" || theme === "ancient" || theme === "mysterious"
            ? (isVertical ? "20px 24px" : "12px 18px")
            : (isVertical ? "16px 20px" : "10px 14px"),
          gap: isVertical ? 16 : 10,
          position: "relative",
          overflow: "hidden",
          ...getThemeStyle(),
        }}
      >
        {/* Render Corner Decorator components based on theme */}
        {theme === "tech" && <TechCorners color={accentColor} />}
        {theme === "ancient" && <AncientCorners color={accentColor} />}
        {theme === "industrial" && <IndustrialRivets />}
        {theme === "mysterious" && <MysteriousStars color={accentColor} />}

        {/* Animated Vector SVG Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            flexShrink: 0,
          }}
        >
          {renderIcon()}
        </div>

        {/* Content panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span
            style={{
              color: accentColor,
              fontSize: isVertical ? 20 : 13,
              textTransform: customStyle?.textTransformTitle || "none",
              lineHeight: 1.2,
              ...getThemeFont("title")
            }}
          >
            {title}
          </span>
          <div
            style={{
              color: "rgba(248,250,252,0.9)",
              fontSize: isVertical ? 16 : 10.5,
              fontWeight: 400,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              ...getThemeFont("desc")
            }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
