import { Composition, CalculateMetadataFunction } from "remotion";
import {
  LumieraTimeline,
  LumieraTimelineProps,
  defaultLumieraProps,
} from "./LumieraTimeline";
import type { Overlay } from "./overlays/OverlayLayer";

const FPS = 30;

function resolveCompositionSize(
  format: "16:9" | "9:16",
  resolution: "1080p" | "2k" = "1080p"
) {
  const isVertical = format === "9:16";
  const is2k = resolution === "2k";
  if (isVertical) {
    return { width: is2k ? 1440 : 1080, height: is2k ? 2560 : 1920 };
  }
  return { width: is2k ? 2560 : 1920, height: is2k ? 1440 : 1080 };
}

const calculateMetadata: CalculateMetadataFunction<
  LumieraTimelineProps
> = async ({ props }) => {
  const duration = Math.max(
    1,
    props.totalDuration || defaultLumieraProps.totalDuration
  );
  const format = props.format === "16:9" ? "16:9" : "9:16";
  const resolution = props.resolution === "2k" ? "2k" : "1080p";
  const { width, height } = resolveCompositionSize(format, resolution);
  const targetFps = props.fps === 60 ? 60 : 30;

  return {
    durationInFrames: Math.ceil(duration * targetFps),
    fps: targetFps,
    width,
    height,
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
