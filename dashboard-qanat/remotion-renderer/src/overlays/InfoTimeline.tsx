import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────
// InfoTimeline — Animated historical timeline
// Shows chronological events as dots connected by a line that
// draws itself progressively. Great for history-themed videos.
// Example: "3000 a.C." → "500 a.C." → "Presente"
// ─────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  /** Year or period label */
  year: string;
  /** Short description */
  description: string;
  /** Whether this event should be highlighted */
  highlight?: boolean;
}

export interface InfoTimelineProps {
  /** Title for the timeline */
  title: string;
  /** Events to show (2-6 items) */
  events: TimelineEvent[];
  /** Accent color */
  accentColor?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
}

export const InfoTimeline: React.FC<InfoTimelineProps> = ({
  title,
  events,
  accentColor = "#D4AF37",
  orientation = "horizontal",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Overall entrance
  const scaleSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
    durationInFrames: 20,
  });

  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Line drawing progress
  const lineProgress = interpolate(
    frame,
    [8, Math.min(durationInFrames * 0.6, 50)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isHorizontal = orientation === "horizontal";

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scaleSpring})`,
          filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.7))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isVertical ? 28 : 20,
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background:
              "linear-gradient(145deg, rgba(8,8,12,0.90) 0%, rgba(18,18,26,0.87) 100%)",
            backdropFilter: "blur(14px)",
            borderRadius: isVertical ? 16 : 12,
            padding: isVertical ? "16px 32px" : "12px 24px",
            border: `1px solid rgba(212,175,55,0.15)`,
          }}
        >
          <div
            style={{
              width: 4,
              height: isVertical ? 24 : 18,
              backgroundColor: accentColor,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              color: "#F8FAFC",
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
              fontSize: isVertical ? 28 : 22,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>

        {/* Timeline Container */}
        <div
          style={{
            display: "flex",
            flexDirection: isHorizontal ? "row" : "column",
            alignItems: "center",
            gap: 0,
            position: "relative",
            padding: isVertical ? "16px 20px" : "12px 16px",
          }}
        >
          {events.map((event, index) => {
            const progress = (index / (events.length - 1)) * 100;
            const isRevealed = lineProgress >= progress;
            const dotDelay = 8 + index * 8;

            // Dot scale animation
            const dotScale = spring({
              fps,
              frame: Math.max(0, frame - dotDelay),
              config: { damping: 12, stiffness: 200, mass: 0.5 },
              durationInFrames: 12,
            });

            // Text fade in
            const textOpacity = interpolate(
              frame,
              [dotDelay + 4, dotDelay + 14],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const isHighlight = event.highlight || index === events.length - 1;

            return (
              <React.Fragment key={index}>
                {/* Connector line (not before first) */}
                {index > 0 && (
                  <div
                    style={{
                      [isHorizontal ? "width" : "height"]: isVertical ? 80 : 60,
                      [isHorizontal ? "height" : "width"]: 2,
                      background: `linear-gradient(${isHorizontal ? "to right" : "to bottom"}, ${accentColor}60, ${accentColor}30)`,
                      opacity: isRevealed ? 1 : 0.15,
                      transition: "opacity 0.2s",
                    }}
                  />
                )}

                {/* Event dot + labels */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: isVertical ? 8 : 6,
                    minWidth: isVertical ? 120 : 90,
                    opacity: textOpacity,
                  }}
                >
                  {/* Year label */}
                  <span
                    style={{
                      color: isHighlight ? accentColor : "rgba(248,250,252,0.65)",
                      fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                      fontSize: isVertical ? 20 : 15,
                      fontWeight: isHighlight ? 700 : 500,
                      letterSpacing: "0.04em",
                      textAlign: "center",
                    }}
                  >
                    {event.year}
                  </span>

                  {/* Dot */}
                  <div
                    style={{
                      width: isHighlight ? (isVertical ? 18 : 14) : (isVertical ? 12 : 10),
                      height: isHighlight ? (isVertical ? 18 : 14) : (isVertical ? 12 : 10),
                      borderRadius: "50%",
                      backgroundColor: isHighlight ? accentColor : "rgba(248,250,252,0.4)",
                      transform: `scale(${dotScale})`,
                      boxShadow: isHighlight
                        ? `0 0 16px ${accentColor}60, 0 0 4px ${accentColor}`
                        : "none",
                      border: isHighlight
                        ? `2px solid ${accentColor}`
                        : "1px solid rgba(248,250,252,0.2)",
                    }}
                  />

                  {/* Description */}
                  <span
                    style={{
                      color: "rgba(248,250,252,0.72)",
                      fontFamily: "'Inter', 'Montserrat', Arial, sans-serif",
                      fontSize: isVertical ? 16 : 12,
                      fontWeight: 400,
                      textAlign: "center",
                      maxWidth: isVertical ? 140 : 100,
                      lineHeight: 1.3,
                    }}
                  >
                    {event.description}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
