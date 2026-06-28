import React from "react";
import { SafeLottie } from "./SafeLottie";

export const TitleLottieIcon: React.FC<{
  animationData: object;
  size: number;
}> = ({ animationData, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.94)",
      border: "2px solid rgba(0,0,0,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
      overflow: "hidden",
    }}
  >
    <SafeLottie
      animationData={animationData}
      style={{
        width: Math.round(size * 0.72),
        height: Math.round(size * 0.72),
      }}
    />
  </div>
);