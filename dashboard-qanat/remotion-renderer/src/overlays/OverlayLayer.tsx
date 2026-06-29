import React from "react";
import { Sequence, useVideoConfig } from "remotion";

import { LowerThird, LowerThirdProps } from "./LowerThird";
import { InfoCounter, InfoCounterProps } from "./InfoCounter";
import { InfoBar, InfoBarProps } from "./InfoBar";
import { InfoTimeline, InfoTimelineProps } from "./InfoTimeline";
import { KineticText, KineticTextProps } from "./KineticText";
import { InfoCard, InfoCardProps } from "./InfoCard";
import { ListicleStinger, ListicleStingerProps } from "./ListicleStinger";
import { ListicleRecap, ListicleRecapProps } from "./ListicleRecap";
import { RankProgress, RankProgressProps } from "./RankProgress";
import { safeCustomStyle } from "./overlayStyleUtils";

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
  | "listicle-recap"
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

export interface ListicleRecapOverlay extends OverlayBase {
  type: "listicle-recap";
  props: ListicleRecapProps;
}

export type Overlay =
  | LowerThirdOverlay
  | CounterOverlay
  | BarChartOverlay
  | TimelineOverlay
  | KineticTextOverlay
  | InfoCardOverlay
  | ListicleStingerOverlay
  | ListicleRecapOverlay
  | RankProgressOverlay;

interface OverlayLayerProps {
  overlays: Overlay[];
}

function sanitizeOverlayProps<T extends Overlay["props"]>(raw: T): T {
  const props = { ...(raw || {}) } as T & { customStyle?: unknown; style?: unknown };
  if ("customStyle" in props) {
    const safe = safeCustomStyle(props.customStyle);
    if (safe) props.customStyle = safe as T extends { customStyle?: infer C } ? C : never;
    else delete props.customStyle;
  }
  return props;
}

const OverlayComponent: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  const props = sanitizeOverlayProps(overlay.props || ({} as Overlay["props"]));
  switch (overlay.type) {
    case "lower-third":
      return <LowerThird {...props} />;
    case "counter":
      return <InfoCounter {...props} />;
    case "bar-chart":
      if (!Array.isArray((props as { items?: unknown[] }).items) || !(props as { items?: unknown[] }).items?.length) {
        return null;
      }
      return <InfoBar {...props} />;
    case "timeline":
      if (!Array.isArray((props as { events?: unknown[] }).events) || !(props as { events?: unknown[] }).events?.length) {
        return null;
      }
      return <InfoTimeline {...props} />;
    case "kinetic-text": {
      const kt = props as KineticTextProps & { style?: unknown };
      const text = String(kt.text || "").trim();
      if (!text) return null;
      const animStyle = typeof kt.style === "string" ? kt.style : "slam";
      return <KineticText {...kt} text={text} style={animStyle as KineticTextProps["style"]} />;
    }
    case "info-card":
      return <InfoCard {...overlay.props} />;
    case "listicle-stinger":
      return <ListicleStinger {...overlay.props} />;
    case "listicle-recap":
      return <ListicleRecap {...overlay.props} />;
    case "rank-progress":
      return <RankProgress {...overlay.props} />;
    default:
      return null;
  }
};

const overlayRenderPriority = (overlay: Overlay) => {
  if (overlay.type === "rank-progress") return 100;
  if (overlay.type === "listicle-stinger") return 90;
  if (overlay.id?.startsWith("listicle-rank") || overlay.id === "listicle-intro-topn") return 80;
  return 0;
};

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ overlays }) => {
  const { fps } = useVideoConfig();

  if (!overlays || overlays.length === 0) return null;

  const sortedOverlays = [...overlays].sort(
    (a, b) => overlayRenderPriority(a) - overlayRenderPriority(b),
  );

  return (
    <>
      {sortedOverlays.map((overlay) => {
        const startSec = Number(overlay.start);
        const durationSec = Number(overlay.duration);
        if (!Number.isFinite(startSec) || !Number.isFinite(durationSec)) return null;
        const fromFrame = Math.max(0, Math.round(startSec * fps));
        const durationInFrames = Math.max(1, Math.round(durationSec * fps));

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
