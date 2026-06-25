import { Composition, CalculateMetadataFunction } from "remotion";
import { LumieraTimeline, LumieraTimelineProps, defaultLumieraProps } from "./LumieraTimeline";
import type { Overlay } from "./overlays/OverlayLayer";

const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<LumieraTimelineProps> = async ({ props }) => {
  const duration = Math.max(1, props.totalDuration || defaultLumieraProps.totalDuration);
  const isVertical = props.format === "9:16";

  return {
    durationInFrames: Math.ceil(duration * FPS),
    fps: FPS,
    width: isVertical ? 1080 : 1920,
    height: isVertical ? 1920 : 1080,
    props: {
      ...defaultLumieraProps,
      ...props,
    },
  };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="LumieraTimeline"
      component={LumieraTimeline}
      durationInFrames={FPS * defaultLumieraProps.totalDuration}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaultLumieraProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
