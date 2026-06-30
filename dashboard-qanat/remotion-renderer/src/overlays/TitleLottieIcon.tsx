import React from "react";
import { lottieIconBadgeStyle } from "./listicleHudTheme";
import { SafeLottie } from "./SafeLottie";

export const TitleLottieIcon: React.FC<{
  animationData: object;
  size: number;
  accentColor?: string;
  isClimax?: boolean;
}> = ({ animationData, size, accentColor = "#C5A880", isClimax = false }) => {
  const badge = lottieIconBadgeStyle(size, accentColor, isClimax);

  return (
    <div style={badge.shell}>
      <SafeLottie animationData={animationData} style={badge.lottie} />
    </div>
  );
};