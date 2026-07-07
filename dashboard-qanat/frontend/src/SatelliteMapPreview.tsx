import React, { useMemo } from "react";
import {
  interpolateFlyScale,
  resolveEarthDescentFrame,
  sortZoomKeyframes,
} from "./locationIntroFly";
import type { StudioClip } from "./timelineStudioTypes";
import { enrichSatelliteMotionClip } from "./timelineStudioMedia";
import { resolveMotionSceneProps } from "./timelineStudioMedia";

type Props = {
  clip: StudioClip;
  localSec: number;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl?: (fileName: string) => string;
};

/** Preview satélite direto — sem OverlayPreview/motionShell (evita caixa cinza). */
export function SatelliteMapPreview({
  clip,
  localSec,
  getAssetUrl,
  getMusicUrl,
}: Props) {
  const enriched = enrichSatelliteMotionClip(clip);
  const props = resolveMotionSceneProps(
    (enriched.props || {}) as Record<string, unknown>,
    getAssetUrl,
    getMusicUrl
  );
  const duration = Math.max(0.5, Number(enriched.duration) || 12);
  const progress = Math.min(1, Math.max(0, localSec / duration));

  const frames = useMemo(() => {
    const bgWide = String(props.backgroundImageWide || "");
    const bgTight = String(props.backgroundImage || "");
    const fromKeyframes = (
      Array.isArray(props.zoom_keyframes) ? props.zoom_keyframes : []
    ).filter((k: { image?: string }) => Boolean(String(k?.image || "").trim()));
    const fallback = [
      bgWide ? { zoom: Number(props.zoom_from) || 3, image: bgWide } : null,
      bgTight ? { zoom: Number(props.zoom_to) || 10, image: bgTight } : null,
    ].filter(Boolean) as Array<{ zoom?: number; image?: string }>;
    return sortZoomKeyframes(fromKeyframes.length ? fromKeyframes : fallback);
  }, [props]);

  const flyMode = String(props.fly_mode || "earth_descent");
  const isEngineeringPip =
    String(props.aspect_ratio || "") === "9:16" &&
    String(props.presentation || props.layout || "") === "pip" &&
    /engenharia|engineering|industrial/i.test(String(props.niche || ""));
  const { activeIndex: idx, blendT: localT } = resolveEarthDescentFrame(
    frames,
    progress
  );
  const zoom = interpolateFlyScale(frames, progress, flyMode);

  if (!frames.length) {
    return (
      <div className="absolute inset-0 z-40 bg-zinc-900 flex items-center justify-center">
        <span className="text-[10px] text-zinc-500 px-4 text-center">
          Tiles satélite ausentes — rode Cenas Remotion
        </span>
      </div>
    );
  }

  const mapLayers = (
    <div
      className="absolute inset-0"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
      }}
    >
      {frames.map((kf, i) => {
        const src = String(kf.image || "");
        if (!src) return null;
        let opacity = 0;
        if (frames.length === 1) opacity = 1;
        else if (i === idx) opacity = 1 - localT;
        else if (i === idx + 1) opacity = localT;
        if (opacity <= 0.02) return null;
        return (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity }}
            draggable={false}
          />
        );
      })}
    </div>
  );

  if (isEngineeringPip) {
    return (
      <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none">
        <div
          className="absolute overflow-hidden bg-black"
          style={{
            left: "49.54%",
            top: "41.56%",
            width: "41.67%",
            height: "12.76%",
            borderRadius: "1.67%",
          }}
        >
          {mapLayers}
        </div>
        <img
          src="/overlays/overlay_pip_engenharia_9x16_transparente.png"
          alt=""
          className="absolute inset-x-0 w-full h-full object-fill"
          style={{ top: "-22.4%" }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-black pointer-events-none">
      {mapLayers}
    </div>
  );
}
