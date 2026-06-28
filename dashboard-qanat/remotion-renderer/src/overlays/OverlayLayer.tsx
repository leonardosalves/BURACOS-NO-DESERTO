import React from "react";
import { Sequence, useVideoConfig } from "remotion";

import { LowerThird, LowerThirdProps } from "./LowerThird";
import { InfoCounter, InfoCounterProps } from "./InfoCounter";
import { InfoBar, InfoBarProps } from "./InfoBar";
import { InfoTimeline, InfoTimelineProps } from "./InfoTimeline";
import { KineticText, KineticTextProps } from "./KineticText";
import { InfoCard, InfoCardProps } from "./InfoCard";
import { ListicleStinger, ListicleStingerProps } from "./ListicleStinger";
import { RankProgress, RankProgressProps } from "./RankProgress";

// ─────────────────────────────────────────────────────────────────────
// OverlayLayer — Manages rendering of all overlay elements
// Takes an array of Overlay objects and renders each one as a
// Sequence at the correct start time and duration.
// ─────────────────────────────────────────────────────────────────────

export type OverlayType =
  | "lower-third"
  | "counter"
  | "bar-chart"
  | "timeline"
  | "kinetic-text"
  | "info-card"
  | "listicle-stinger"
  | "rank-progress";

export interface OverlayBase {
  /** Unique identifier */
  id: string;
  /** Overlay type determines which component to render */
  type: OverlayType;
  /** Start time in seconds (relative to video start) */
  start: number;
  /** Duration in seconds */
  duration: number;
}

export interface LowerThirdOverlay extends OverlayBase {
  type: "lower-third";
  props: LowerThirdProps;
}

export interface CounterOverlay extends OverlayBase {
  type: "counter";
  props: InfoCounterProps;
}

export interface BarChartOverlay extends OverlayBase {
  type: "bar-chart";
  props: InfoBarProps;
}

export interface TimelineOverlay extends OverlayBase {
  type: "timeline";
  props: InfoTimelineProps;
}

export interface KineticTextOverlay extends OverlayBase {
  type: "kinetic-text";
  props: KineticTextProps;
}

export interface InfoCardOverlay extends OverlayBase {
  type: "info-card";
  props: InfoCardProps;
}

export interface ListicleStingerOverlay extends OverlayBase {
  type: "listicle-stinger";
  props: ListicleStingerProps;
}

export interface RankProgressOverlay extends OverlayBase {
  type: "rank-progress";
  props: RankProgressProps;
}

export type Overlay =
  | LowerThirdOverlay
  | CounterOverlay
  | BarChartOverlay
  | TimelineOverlay
  | KineticTextOverlay
  | InfoCardOverlay
  | ListicleStingerOverlay
  | RankProgressOverlay;

interface OverlayLayerProps {
  overlays: Overlay[];
}

const OverlayComponent: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  switch (overlay.type) {
    case "lower-third":
      return <LowerThird {...overlay.props} />;
    case "counter":
      return <InfoCounter {...overlay.props} />;
    case "bar-chart":
      return <InfoBar {...overlay.props} />;
    case "timeline":
      return <InfoTimeline {...overlay.props} />;
    case "kinetic-text":
      return <KineticText {...overlay.props} />;
    case "info-card":
      return <InfoCard {...overlay.props} />;
    case "listicle-stinger":
      return <ListicleStinger {...overlay.props} />;
    case "rank-progress":
      return <RankProgress {...overlay.props} />;
    default:
      return null;
  }
};

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ overlays }) => {
  const { fps } = useVideoConfig();

  if (!overlays || overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => {
        const fromFrame = Math.max(0, Math.round(overlay.start * fps));
        const durationInFrames = Math.max(1, Math.round(overlay.duration * fps));

        return (
          <Sequence
            key={overlay.id}
            from={fromFrame}
            durationInFrames={durationInFrames}
            premountFor={fps * 0.5}
          >
            <OverlayComponent overlay={overlay} />
          </Sequence>
        );
      })}
    </>
  );
};

// Re-export all overlay types and components
export { LowerThird } from "./LowerThird";
export { InfoCounter } from "./InfoCounter";
export { InfoBar } from "./InfoBar";
export { InfoTimeline } from "./InfoTimeline";
export { KineticText } from "./KineticText";
export { InfoCard } from "./InfoCard";

export type { LowerThirdProps } from "./LowerThird";
export type { InfoCounterProps } from "./InfoCounter";
export type { InfoBarProps, InfoBarItem } from "./InfoBar";
export type { InfoTimelineProps, TimelineEvent } from "./InfoTimeline";
export type { KineticTextProps } from "./KineticText";
export type { InfoCardProps } from "./InfoCard";
