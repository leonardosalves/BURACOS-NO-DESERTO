import {
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import React from "react";

export type YoutubeChannelInfo = {
  channelName: string;
  subscriberCount: string;
  avatarUrl: string | null;
};

const PRESS_START_FRAME = 35;
const PRESS_END_FRAME = 43;
const SUBSCRIBE_SWITCH_FRAME = 47;

function lerpColor(
  t: number,
  from: [number, number, number],
  to: [number, number, number]
) {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export const YoutubeSubOverlay: React.FC<{
  channelInfo: YoutubeChannelInfo | null;
  holdThroughEnd?: boolean;
}> = ({ channelInfo, holdThroughEnd = false }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const name = channelInfo?.channelName || "Canal do YouTube";
  const subs = channelInfo?.subscriberCount || "";

  const getAvatarUrl = () => {
    if (!channelInfo?.avatarUrl) {
      return "https://yt3.googleusercontent.com/n3hcrupQPiDWs6_xADQ9zrdP69p3hAZo2C9re-cTc8fgipdZiOnNAGeakDxnyzd_11L5eYlsAQ=s900-c-k-c0x00ffffff-no-rj";
    }
    if (
      channelInfo.avatarUrl.startsWith("http://") ||
      channelInfo.avatarUrl.startsWith("https://")
    ) {
      return channelInfo.avatarUrl;
    }
    return staticFile(channelInfo.avatarUrl.replace(/\\/g, "/"));
  };

  const avatar = getAvatarUrl();

  const slideProgress = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  });
  const translateY = interpolate(slideProgress, [0, 1], [150, 0]);
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let buttonScale = 1;
  if (frame >= PRESS_START_FRAME && frame < PRESS_END_FRAME) {
    const pressProgress =
      (frame - PRESS_START_FRAME) / (PRESS_END_FRAME - PRESS_START_FRAME);
    const eased = 1 - Math.pow(1 - pressProgress, 2);
    buttonScale = interpolate(eased, [0, 1], [1, 0.9]);
  } else if (frame >= PRESS_END_FRAME && frame < PRESS_END_FRAME + 14) {
    const releaseSpring = spring({
      frame: frame - PRESS_END_FRAME,
      fps,
      config: { damping: 16, mass: 0.35, stiffness: 200 },
    });
    buttonScale = interpolate(releaseSpring, [0, 1], [0.9, 1]);
  }

  const colorProgress = interpolate(
    frame,
    [SUBSCRIBE_SWITCH_FRAME, SUBSCRIBE_SWITCH_FRAME + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const buttonBg = lerpColor(colorProgress, [15, 15, 15], [242, 242, 242]);
  const buttonFg = lerpColor(colorProgress, [255, 255, 255], [15, 15, 15]);

  const subscribeTextOpacity = interpolate(
    frame,
    [SUBSCRIBE_SWITCH_FRAME - 2, SUBSCRIBE_SWITCH_FRAME + 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const subscribedTextOpacity = interpolate(
    frame,
    [SUBSCRIBE_SWITCH_FRAME, SUBSCRIBE_SWITCH_FRAME + 4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOutStart = Math.max(0, durationInFrames - 15);
  const exitOpacity = holdThroughEnd
    ? 1
    : interpolate(frame, [fadeOutStart, durationInFrames - 1], [1, 0], {
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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            overflow: "hidden",
            marginRight: "16px",
            border: "2px solid #f0f0f0",
            backgroundColor: "#f9f9f9",
            flexShrink: 0,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "left",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0f0f0f",
              lineHeight: "1.2",
              letterSpacing: "-0.5px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          {subs ? (
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#606060",
                marginTop: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subs}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          width: "140px",
          height: "42px",
          borderRadius: "21px",
          backgroundColor: buttonBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: buttonFg,
          fontSize: "14px",
          fontWeight: 700,
          transform: `scale(${buttonScale})`,
          boxSizing: "border-box",
          flexShrink: 0,
          marginLeft: "12px",
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            opacity: subscribeTextOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          Inscrever-se
        </span>
        <span
          style={{
            position: "absolute",
            opacity: subscribedTextOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "100%",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
          </svg>
          Inscrito
        </span>
      </div>
    </div>
  );
};
