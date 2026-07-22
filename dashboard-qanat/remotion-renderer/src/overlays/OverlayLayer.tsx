import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Lottie } from "@remotion/lottie";

import { LowerThird, LowerThirdProps } from "./LowerThird";
import { InfoCounter, InfoCounterProps } from "./InfoCounter";
import { InfoBar, InfoBarProps } from "./InfoBar";
import { InfoTimeline, InfoTimelineProps } from "./InfoTimeline";
import { KineticText, KineticTextProps } from "./KineticText";
import { InfoCard, InfoCardProps } from "./InfoCard";
import { ListicleStinger, ListicleStingerProps } from "./ListicleStinger";
import { ListicleRecap, ListicleRecapProps } from "./ListicleRecap";
import { RankProgress, RankProgressProps } from "./RankProgress";
import { ChapterStinger, ChapterStingerProps } from "./ChapterStinger";
import { SourceCard, SourceCardProps } from "./SourceCard";
import { SocialPostCard, SocialPostCardProps } from "./SocialPostCard";
import { GeoMapOverlay, GeoMapOverlayProps } from "./GeoMapOverlay";
import { PictogramChart, PictogramChartProps } from "./PictogramChart";
import { LocationIntro, LocationIntroProps } from "./LocationIntro";
import { StudioTemplateOverlay } from "./StudioTemplateOverlay";
import { safeCustomStyle } from "./overlayStyleUtils";
import { repairOverlayPropsEncoding } from "../textEncoding";
import { ShotcraftLayer, type MotionShot } from "./ShotcraftLayer";

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
  | "rank-progress"
  | "chapter-stinger"
  | "source-card"
  | "social-post"
  | "geo-map"
  | "pictogram-chart"
  | "location-intro"
  | "shotcraft"
  | "lottie-overlay"
  | "effect-overlay";

export interface OverlayBase {
  /** Unique identifier */
  id: string;
  /** Overlay type determines which component to render */
  type: OverlayType;
  /** Start time in seconds (relative to video start) */
  start: number;
  /** Duration in seconds */
  duration: number;
  studio_z_index?: string;
  studio_role?: string;
  studio_opacity?: number;
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

export interface ChapterStingerOverlay extends OverlayBase {
  type: "chapter-stinger";
  props: ChapterStingerProps;
}

export interface SourceCardOverlay extends OverlayBase {
  type: "source-card";
  props: SourceCardProps;
}

export interface SocialPostOverlay extends OverlayBase {
  type: "social-post";
  props: SocialPostCardProps;
}

export interface GeoMapOverlayItem extends OverlayBase {
  type: "geo-map";
  props: GeoMapOverlayProps;
}

export interface PictogramChartOverlay extends OverlayBase {
  type: "pictogram-chart";
  props: PictogramChartProps;
}

export interface LocationIntroOverlay extends OverlayBase {
  type: "location-intro";
  props: LocationIntroProps;
}

export interface LumieraGenericOverlay extends OverlayBase {
  type: "shotcraft" | "lottie-overlay" | "effect-overlay";
  props: Record<string, unknown>;
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
  | RankProgressOverlay
  | ChapterStingerOverlay
  | SourceCardOverlay
  | SocialPostOverlay
  | GeoMapOverlayItem
  | PictogramChartOverlay
  | LocationIntroOverlay
  | LumieraGenericOverlay;

interface OverlayLayerProps {
  overlays: Overlay[];
}

const LottieTimelineOverlay: React.FC<{
  source: string;
  positionX?: number;
  positionY?: number;
  scale?: number;
  opacity?: number;
}> = ({ source, positionX = 0.5, positionY = 0.5, scale = 1, opacity = 1 }) => {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const handle = useMemo(() => delayRender(`Lottie timeline: ${source}`), [source]);
  useEffect(() => {
    let active = true;
    const url = /^(https?:|data:|\/)/i.test(source) ? source : staticFile(source);
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Lottie HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => { if (active) setAnimationData(data); })
      .catch(() => { if (active) setAnimationData({}); })
      .finally(() => continueRender(handle));
    return () => { active = false; };
  }, [handle, source]);
  if (!animationData || !Object.keys(animationData).length) return null;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: Math.max(0, Math.min(1, Number(opacity) || 0)),
        transform: `translate(${(Math.max(0, Math.min(1, Number(positionX))) - 0.5) * 100}%, ${(Math.max(0, Math.min(1, Number(positionY))) - 0.5) * 100}%) scale(${Math.max(0.25, Math.min(3, Number(scale) || 1))})`,
        transformOrigin: "center center",
      }}
    >
      <div style={{ width: "72%", height: "72%" }}>
        <Lottie animationData={animationData} />
      </div>
    </AbsoluteFill>
  );
};

const TimelineEffectOverlay: React.FC<{ effect?: unknown; durationInFrames: number }> = ({ effect, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kind = String(effect || "fade");
  const fadeOpacity = kind === "fade" ? Math.sin(progress * Math.PI) * 0.72 : 0;
  const edgeOpacity = kind === "zoom-in" || kind === "zoom-out" ? 0.2 + Math.sin(progress * Math.PI) * 0.18 : 0;
  const shakeX = kind === "shake" ? Math.sin(frame * 2.7) * 7 : 0;
  const shakeY = kind === "shake" ? Math.cos(frame * 2.1) * 5 : 0;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: fadeOpacity > 0 ? `rgba(0,0,0,${fadeOpacity})` : `radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,${edgeOpacity}) 100%)`,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
        backdropFilter: kind === "shake" ? "blur(0.7px)" : undefined,
      }}
    />
  );
};

function sanitizeOverlayProps<T extends Overlay["props"]>(raw: T): T {
  const props = repairOverlayPropsEncoding({ ...(raw || {}) } as Record<
    string,
    unknown
  >) as T & {
    customStyle?: unknown;
    style?: unknown;
  };
  if ("customStyle" in props) {
    const safe = safeCustomStyle(props.customStyle);
    if (safe)
      props.customStyle = safe as T extends { customStyle?: infer C }
        ? C
        : never;
    else delete props.customStyle;
  }
  return props;
}

export const MotionSceneFill: React.FC<{
  type: OverlayType;
  props: Overlay["props"];
  durationInFrames: number;
}> = ({ type, props, durationInFrames }) => (
  <OverlayComponent
    overlay={{
      id: "motion-scene-fill",
      type,
      start: 0,
      duration: 1,
      props,
    }}
    durationInFrames={durationInFrames}
  />
);

const OverlayComponent: React.FC<{
  overlay: Overlay;
  durationInFrames: number;
}> = ({ overlay, durationInFrames }) => {
  const props = sanitizeOverlayProps(overlay.props || ({} as Overlay["props"]));
  const studioSource = String(
    (props as { studio_source_code?: string }).studio_source_code || ""
  ).trim();
  const isMotionScene = Boolean(
    (props as { motion_scene?: boolean }).motion_scene
  );
  const motionShot = (props as { motion_shot?: MotionShot }).motion_shot;
  if (overlay.type === "shotcraft" && motionShot) {
    return <ShotcraftLayer shot={motionShot} durationInFrames={durationInFrames} />;
  }
  if (overlay.type === "lottie-overlay") {
    const source = String((props as { source?: unknown }).source || "");
    return source ? (
      <LottieTimelineOverlay
        source={source}
        positionX={Number((props as Record<string, unknown>).positionX ?? 0.5)}
        positionY={Number((props as Record<string, unknown>).positionY ?? 0.5)}
        scale={Number((props as Record<string, unknown>).scale ?? 1)}
        opacity={Number((props as Record<string, unknown>).opacity ?? 1)}
      />
    ) : null;
  }
  if (overlay.type === "effect-overlay") {
    return <TimelineEffectOverlay effect={(props as { effect?: unknown }).effect} durationInFrames={durationInFrames} />;
  }
  if (studioSource) {
    return (
      <StudioTemplateOverlay
        sourceCode={studioSource}
        inputProps={props as Record<string, unknown>}
        durationInFrames={durationInFrames}
      />
    );
  }
  if (isMotionScene) {
    return null;
  }
  switch (overlay.type) {
    case "lower-third":
      return <LowerThird {...props} />;
    case "counter":
      return <InfoCounter {...props} />;
    case "bar-chart":
      if (
        !Array.isArray((props as { items?: unknown[] }).items) ||
        !(props as { items?: unknown[] }).items?.length
      ) {
        return null;
      }
      return <InfoBar {...props} durationInFrames={durationInFrames} />;
    case "timeline":
      if (
        !Array.isArray((props as { events?: unknown[] }).events) ||
        !(props as { events?: unknown[] }).events?.length
      ) {
        return null;
      }
      return <InfoTimeline {...props} />;
    case "kinetic-text": {
      const kt = props as KineticTextProps & { style?: unknown };
      const text = String(kt.text || "").trim();
      if (!text) return null;
      const animStyle = typeof kt.style === "string" ? kt.style : "slam";
      return (
        <KineticText
          {...kt}
          text={text}
          style={animStyle as KineticTextProps["style"]}
        />
      );
    }
    case "info-card":
      return <InfoCard {...overlay.props} />;
    case "listicle-stinger":
      return <ListicleStinger {...overlay.props} />;
    case "listicle-recap":
      return <ListicleRecap {...overlay.props} />;
    case "rank-progress":
      return <RankProgress {...overlay.props} />;
    case "chapter-stinger": {
      const cs = props as ChapterStingerProps;
      if (!String(cs.title || "").trim()) return null;
      return <ChapterStinger {...cs} />;
    }
    case "source-card": {
      const sc = props as SourceCardProps;
      if (!String(sc.source || "").trim()) return null;
      return <SourceCard {...sc} />;
    }
    case "social-post": {
      const sp = props as SocialPostCardProps;
      if (!String(sp.text || "").trim()) return null;
      return <SocialPostCard {...sp} />;
    }
    case "geo-map": {
      const gm = props as GeoMapOverlayProps;
      if (!String(gm.location || "").trim()) return null;
      return <GeoMapOverlay {...gm} />;
    }
    case "pictogram-chart": {
      const pc = props as PictogramChartProps;
      if (!String(pc.title || "").trim()) return null;
      if (!Array.isArray(pc.segments) || pc.segments.length < 2) return null;
      return <PictogramChart {...pc} />;
    }
    case "location-intro": {
      const li = props as LocationIntroProps;
      if (!String(li.location || "").trim()) return null;
      return <LocationIntro {...li} />;
    }
    default:
      return null;
  }
};

const overlayRenderPriority = (overlay: Overlay) => {
  const role = String(
    overlay.studio_role ||
      (overlay.props as { studio_role?: string })?.studio_role ||
      ""
  ).toLowerCase();
  if (role === "transition") return 130;
  if (role === "logo_bug") return 125;
  if (overlay.type === "location-intro" || overlay.type === "pictogram-chart")
    return 110;
  if (overlay.type === "rank-progress") return 100;
  if (overlay.type === "chapter-stinger") return 95;
  if (overlay.type === "listicle-stinger") return 90;
  if (
    overlay.id?.startsWith("listicle-rank") ||
    overlay.id === "listicle-intro-topn"
  )
    return 80;
  return 0;
};

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ overlays }) => {
  const { fps } = useVideoConfig();

  if (!overlays || overlays.length === 0) return null;

  const sortedOverlays = [...overlays].sort(
    (a, b) => overlayRenderPriority(a) - overlayRenderPriority(b)
  );

  return (
    <>
      {sortedOverlays.map((overlay) => {
        const startSec = Number(overlay.start);
        const durationSec = Number(overlay.duration);
        if (!Number.isFinite(startSec) || !Number.isFinite(durationSec))
          return null;
        const fromFrame = Math.max(0, Math.round(startSec * fps));
        const durationInFrames = Math.max(1, Math.round(durationSec * fps));

        return (
          <Sequence
            key={overlay.id}
            from={fromFrame}
            durationInFrames={durationInFrames}
            premountFor={fps * 0.5}
          >
            <OverlayComponent
              overlay={overlay}
              durationInFrames={durationInFrames}
            />
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
