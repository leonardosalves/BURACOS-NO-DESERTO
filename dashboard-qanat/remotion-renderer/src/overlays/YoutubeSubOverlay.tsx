import { spring, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import React from "react";

export type YoutubeChannelInfo = {
  channelName: string;
  subscriberCount: string;
  avatarUrl: string | null;
};

export const YoutubeSubOverlay: React.FC<{
  channelInfo: YoutubeChannelInfo | null;
}> = ({ channelInfo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const name = channelInfo?.channelName || "AI Construction Stories";
  const subs = channelInfo?.subscriberCount || "242 inscritos";
  
  const getAvatarUrl = () => {
    if (!channelInfo?.avatarUrl) {
      return "https://yt3.googleusercontent.com/n3hcrupQPiDWs6_xADQ9zrdP69p3hAZo2C9re-cTc8fgipdZiOnNAGeakDxnyzd_11L5eYlsAQ=s900-c-k-c0x00ffffff-no-rj";
    }
    if (channelInfo.avatarUrl.startsWith("http://") || channelInfo.avatarUrl.startsWith("https://")) {
      return channelInfo.avatarUrl;
    }
    return staticFile(channelInfo.avatarUrl.replace(/\\/g, "/"));
  };

  const avatar = getAvatarUrl();

  // 1. Slide-in from bottom center (duration: 15 frames)
  const slideProgress = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  }); // Goes from 0 to 1
  const translateY = interpolate(slideProgress, [0, 1], [150, 0]);
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 2. Button press-down animation (starts at frame 35, duration 8 frames)
  const pressStartFrame = 35;
  const pressDuration = 8;
  const releaseFrame = pressStartFrame + pressDuration; // 43
  
  let buttonScale = 1.0;
  let isSubscribed = false;

  if (frame >= pressStartFrame && frame < releaseFrame) {
    // Pressing down: ease-out interpolation
    const pressProgress = (frame - pressStartFrame) / pressDuration;
    const easeOutProgress = 1 - Math.pow(1 - pressProgress, 2);
    buttonScale = interpolate(easeOutProgress, [0, 1], [1.0, 0.88]);
  } else if (frame >= releaseFrame) {
    isSubscribed = true;
    // Spring release animation with a slight bounce!
    const releaseSpring = spring({
      frame: frame - releaseFrame,
      fps,
      config: { damping: 8, mass: 0.4, stiffness: 120 }, // slight bounce
    });
    buttonScale = interpolate(releaseSpring, [0, 1], [0.88, 1.0]);
  }

  // 3. Fade-out of the entire lower third (last 15 frames)
  const { durationInFrames } = useVideoConfig();
  const fadeOutStart = Math.max(0, durationInFrames - 15);
  const exitOpacity = interpolate(frame, [fadeOutStart, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalOpacity = Math.min(cardOpacity, exitOpacity);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "80px",
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity: finalOpacity,
        width: "540px",
        height: "96px",
        backgroundColor: "#ffffff",
        borderRadius: "48px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px 0 16px",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
        zIndex: 100,
      }}
    >
      {/* Left side: Avatar + Channel Info */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            overflow: "hidden",
            marginRight: "16px",
            border: "2px solid #f0f0f0",
            backgroundColor: "#f9f9f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={avatar}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0f0f0f",
              lineHeight: "1.2",
              letterSpacing: "-0.5px",
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#606060",
              marginTop: "4px",
            }}
          >
            {subs}
          </span>
        </div>
      </div>

      {/* Right side: Subscribe Button */}
      <div
        style={{
          width: "136px",
          height: "42px",
          borderRadius: "21px",
          backgroundColor: isSubscribed ? "#f2f2f2" : "#0f0f0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isSubscribed ? "#0f0f0f" : "#ffffff",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          transform: `scale(${buttonScale})`,
          transition: "background-color 0.1s ease, color 0.1s ease",
          boxSizing: "border-box",
        }}
      >
        {isSubscribed ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
            </svg>
            <span>Inscrito</span>
          </div>
        ) : (
          <span>Inscrever-se</span>
        )}
      </div>
    </div>
  );
};
