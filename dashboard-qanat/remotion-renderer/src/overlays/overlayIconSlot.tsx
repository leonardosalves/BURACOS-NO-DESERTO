import React from "react";
import { SafeLottie } from "./SafeLottie";
import { pickLottieData, resolveOverlayIconStyle } from "./overlayIconRegistry";

type SvgProps = { size: number; color: string };

const SparklesSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>{`@keyframes shine{0%,100%{transform:scale(0.6);opacity:.4}50%{transform:scale(1.1);opacity:1}}.s1{animation:shine 1.8s infinite ease-in-out;transform-origin:12px 12px}.s2{animation:shine 1.8s infinite ease-in-out .6s;transform-origin:5px 6px}`}</style>
    <path className="s1" d="M12 2L14.3 8.3L21 9L15.8 13.5L17.5 20L12 16.5L6.5 20L8.2 13.5L3 9L9.7 8.3L12 2Z" fill={color} />
    <path className="s2" d="M5 2L5.8 4.2L8 4.5L6.2 6L6.8 8.2L5 7L3.2 8.2L3.8 6L2 4.5L4.2 4.2L5 2Z" fill={color} opacity="0.8" />
  </svg>
);

const FlameSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>{`@keyframes flicker{0%,100%{transform:scale(.9) translateY(0)}50%{transform:scale(1.05) translateY(-1px)}}.f{animation:flicker 1.2s infinite ease-in-out;transform-origin:12px 20px}`}</style>
    <path className="f" d="M12 2C12 2 17 6.5 17 11.5C17 14.5 14.8 17 12 17C9.2 17 7 14.5 7 11.5C7 6.5 12 2 12 2Z" fill={color} />
    <path className="f" style={{ animationDelay: "0.3s" }} d="M12 7C12 7 15 10 15 13.5C15 15.5 13.5 17 12 17C10.5 17 9 15.5 9 13.5C9 10 12 7 12 7Z" fill="#FFF" opacity="0.8" />
  </svg>
);

const EarthSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.g{animation:spin 10s infinite linear;transform-origin:12px 12px}`}</style>
    <g className="g"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></g>
  </svg>
);

const GearSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.g{animation:spin 6s infinite linear;transform-origin:12px 12px}`}</style>
    <path className="g" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CrownSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes pulse{0%,100%{transform:scale(.95)}50%{transform:scale(1.05)}}.p{animation:pulse 2s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <path className="p" d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill={color} opacity="0.3" />
    <path className="p" d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path className="p" d="M3 20h18" />
  </svg>
);

const InfoSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes pulse{0%,100%{transform:scale(.95);opacity:.95}50%{transform:scale(1.05);opacity:1}}.p{animation:pulse 2.5s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <circle className="p" cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const AtomSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <style>{`@keyframes orbit{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.o{animation:orbit 4s infinite linear;transform-origin:12px 12px}`}</style>
    <circle cx="12" cy="12" r="2" fill={color} />
    <ellipse className="o" cx="12" cy="12" rx="10" ry="3" />
    <ellipse className="o" style={{ transform: "rotate(60deg)", transformOrigin: "12px 12px" }} cx="12" cy="12" rx="10" ry="3" />
    <ellipse className="o" style={{ transform: "rotate(120deg)", transformOrigin: "12px 12px" }} cx="12" cy="12" rx="10" ry="3" />
  </svg>
);

const HourglassSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes flip{0%,90%{transform:rotate(0)}100%{transform:rotate(180deg)}}.h{animation:flip 4s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <g className="h"><path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" /><circle cx="12" cy="5" r="1" fill={color} /><circle cx="12" cy="19" r="2" fill={color} /></g>
  </svg>
);

const LeafSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(10deg)}}.l{animation:sway 3s infinite ease-in-out;transform-origin:2px 22px}`}</style>
    <path className="l" d="M2 22C2 22 6 18 8 16M11 2C4 2 2 9 2 9C2 9 9 11 16 4C16 4 19 8 17 13C15 18 10 20 10 20C10 20 12 14 11 11" />
  </svg>
);

const CoinSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>{`@keyframes coin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}.c{animation:coin 3s infinite linear;transform-origin:12px 12px}`}</style>
    <circle className="c" cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <path className="c" d="M12 6v12M14.5 9H11a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AlertSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}.b{animation:blink 1.2s infinite ease-in-out}`}</style>
    <path className="b" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={`${color}15`} />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CompassSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes wiggle{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(15deg)}}.w{animation:wiggle 2.5s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <circle cx="12" cy="12" r="10" />
    <polygon className="w" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={`${color}25`} />
  </svg>
);

const BookSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes page{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.7)}}.pg{animation:page 3s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path className="pg" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={`${color}10`} />
  </svg>
);

const HeartSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>{`@keyframes hb{0%,100%{transform:scale(.9)}25%,60%{transform:scale(1.1)}}.h{animation:hb 1.5s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <path className="h" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
  </svg>
);

const SwordsSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes clash{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(1px,-1px) rotate(5deg)}}.s{animation:clash 1s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <g className="s"><line x1="2" y1="22" x2="22" y2="2" /><line x1="22" y1="22" x2="2" y2="2" /><path d="M5 15l4 4M19 15l-4 4" /></g>
  </svg>
);

const LightbulbSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}.g{animation:glow 2s infinite ease-in-out}`}</style>
    <path className="g" d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5" fill={`${color}15`} />
    <path d="M9 18h6M10 22h4" />
  </svg>
);

const StarSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <style>{`@keyframes pulse{0%,100%{transform:scale(.95)}50%{transform:scale(1.05)}}.p{animation:pulse 2s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <polygon className="p" points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={`${color}55`} />
  </svg>
);

const BoltSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <style>{`@keyframes blink{0%,100%{opacity:.5}50%{opacity:1}}.b{animation:blink 1.2s infinite ease-in-out}`}</style>
    <path className="b" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill={color} />
  </svg>
);

const RocketSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}.r{animation:float 2s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <g className="r">
      <path d="M12 2c2 4 2 8 0 12-2-1-4-3-4-6s2-5 4-6z" fill={`${color}33`} />
      <path d="M8 14l-2 4 4-1M16 14l2 4-4-1" />
      <circle cx="12" cy="8" r="1.5" fill={color} />
    </g>
  </svg>
);

const ChartSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="12" width="4" height="8" fill={`${color}44`} />
    <rect x="10" y="8" width="4" height="12" fill={`${color}66`} />
    <rect x="17" y="4" width="4" height="16" fill={color} />
  </svg>
);

const UsersSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" />
    <path d="M2 20c0-3 3-5 7-5s7 2 7 5M14 20c0-2 2-3.5 5-3.5" />
  </svg>
);

const BookmarkSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes pulse{0%,100%{transform:scale(.95)}50%{transform:scale(1.05)}}.p{animation:pulse 2s infinite ease-in-out;transform-origin:12px 12px}`}</style>
    <path className="p" d="M6 2h12v20l-6-4-6 4V2z" fill={`${color}22`} />
  </svg>
);

const BellSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes ring{0%,100%{transform:rotate(0)}25%{transform:rotate(8deg)}75%{transform:rotate(-8deg)}}.b{animation:ring 1.5s infinite ease-in-out;transform-origin:12px 4px}`}</style>
    <g className="b">
      <path d="M18 16H6l1.5-2V9a5.5 5.5 0 0 1 11 0v5l1.5 2z" fill={`${color}15`} />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </g>
  </svg>
);

const ShieldSVG: React.FC<SvgProps> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <style>{`@keyframes shine{0%{stroke-dashoffset:60}100%{stroke-dashoffset:-60}}.sh{stroke-dasharray:20 40;animation:shine 3s infinite linear}`}</style>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" />
    <path className="sh" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#FFF" />
  </svg>
);

function renderOverlaySvg(iconType: string, size: number, color: string): React.ReactNode {
  switch (iconType) {
    case "sparkles": return <SparklesSVG size={size} color={color} />;
    case "flame": return <FlameSVG size={size} color={color} />;
    case "earth":
    case "building":
    case "globe": return <EarthSVG size={size} color={color} />;
    case "gear": return <GearSVG size={size} color={color} />;
    case "shield": return <ShieldSVG size={size} color={color} />;
    case "crown": return <CrownSVG size={size} color={color} />;
    case "science": return <AtomSVG size={size} color={color} />;
    case "history":
    case "clock": return <HourglassSVG size={size} color={color} />;
    case "nature": return <LeafSVG size={size} color={color} />;
    case "money":
    case "coin": return <CoinSVG size={size} color={color} />;
    case "warning": return <AlertSVG size={size} color={color} />;
    case "compass": return <CompassSVG size={size} color={color} />;
    case "book": return <BookSVG size={size} color={color} />;
    case "heart": return <HeartSVG size={size} color={color} />;
    case "swords": return <SwordsSVG size={size} color={color} />;
    case "lightbulb": return <LightbulbSVG size={size} color={color} />;
    case "star": return <StarSVG size={size} color={color} />;
    case "bolt":
    case "lightning": return <BoltSVG size={size} color={color} />;
    case "rocket": return <RocketSVG size={size} color={color} />;
    case "chart":
    case "graph": return <ChartSVG size={size} color={color} />;
    case "users": return <UsersSVG size={size} color={color} />;
    case "bookmark": return <BookmarkSVG size={size} color={color} />;
    case "bell": return <BellSVG size={size} color={color} />;
    case "info":
    default: return <InfoSVG size={size} color={color} />;
  }
}

export type OverlayIconSlotProps = {
  iconType?: string;
  iconStyle?: "lottie" | "svg";
  size: number;
  accentColor?: string;
  /** Se o Lottie falhar ou expirar, usa SVG colorido (evita ícone preto/vazio). */
  preferSvgOnLottieFail?: boolean;
};

export function OverlayIconSlot({
  iconType,
  iconStyle,
  size,
  accentColor = "#D4AF37",
  preferSvgOnLottieFail = false,
}: OverlayIconSlotProps): React.ReactNode {
  const [lottieFailed, setLottieFailed] = React.useState(false);
  if (!iconType) return null;
  const resolved = resolveOverlayIconStyle({ iconStyle });
  const lottieData = pickLottieData(iconType, resolved);
  if (lottieData && !(preferSvgOnLottieFail && lottieFailed)) {
    return (
      <SafeLottie
        animationData={lottieData}
        style={{ width: size, height: size }}
        onFailed={preferSvgOnLottieFail ? () => setLottieFailed(true) : undefined}
      />
    );
  }
  return renderOverlaySvg(iconType, size, accentColor);
}