import React from "react";
import { SafeLottie } from "./SafeLottie";
import { resolveLottieData } from "./lottieRegistry";

interface LottieIconProps {
  iconType?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const LottieIcon: React.FC<LottieIconProps> = ({ iconType, size = 32, style }) => {
  const data = resolveLottieData(iconType);
  if (!data) return null;

  return (
    <SafeLottie
      animationData={data}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    />
  );
};