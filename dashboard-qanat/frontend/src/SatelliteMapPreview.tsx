import React, { useMemo } from "react";
import {
  interpolateFlyScale,
  resolveEarthDescentFrame,
  sortZoomKeyframes,
} from "./locationIntroFly";
import type { StudioClip } from "./timelineStudioTypes";
import { enrichSatelliteMotionClip } from "./timelineStudioMedia";
import { resolveMotionSceneProps } from "./timelineStudioMedia";
import { BlenderFlyoverPreview } from "./BlenderFlyoverPreview";
import {
  GEO_PIP_MEDIA_WINDOW_9x16,
  isGeoMediaPipPreview,
  resolveGeoPipWindowRect,
} from "./geoPipPreview";

type Props = {
  clip: StudioClip;
  localSec: number;
  playing?: boolean;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl?: (fileName: string) => string;
  /** PIP com template Studio: fundo transparente para B-roll da cena. */
  pipTransparent?: boolean;
};

/** Preview satélite direto — sem OverlayPreview/motionShell (evita caixa cinza). */
export function SatelliteMapPreview({
  clip,
  localSec,
  playing = false,
  getAssetUrl,
  getMusicUrl,
  pipTransparent = false,
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
  const isGeoMediaPip = isGeoMediaPipPreview(props as Record<string, unknown>);
  const pipWindow =
    (props.geo_pip_window as typeof GEO_PIP_MEDIA_WINDOW_9x16) ||
    GEO_PIP_MEDIA_WINDOW_9x16;
  const referencePoint = String(
    props.referencePoint || props.location || ""
  ).trim();
  const { activeIndex: idx, blendT: localT } = resolveEarthDescentFrame(
    frames,
    progress
  );
  const zoom = interpolateFlyScale(frames, progress, flyMode);
  const flyoverSrc = String(props.flyover_video || "").trim();
  const aiPrompt = String(props.ai_video_prompt || "").trim();
  const isAiT2v =
    String(props.map_provider || "") === "ai_t2v" ||
    props.geo_generation === "ai_prompt";

  if (flyoverSrc) {
    const videoUrl = flyoverSrc.startsWith("http")
      ? flyoverSrc
      : getAssetUrl(flyoverSrc.replace(/^ASSETS\//i, "").replace(/\\/g, "/"));
    const isAiT2vFlyover =
      isAiT2v || String(props.map_provider || "") === "ai_t2v";
    if (isGeoMediaPip) {
      const win = resolveGeoPipWindowRect(100, 100, pipWindow);
      return (
        <div
          className={`absolute inset-0 z-40 overflow-hidden pointer-events-none ${
            pipTransparent
              ? "bg-transparent"
              : "bg-gradient-to-b from-[#04070d] via-[#071018] to-[#04070d]"
          }`}
        >
          <div
            className="absolute overflow-hidden bg-black border border-white/15 shadow-lg shadow-black/50"
            style={{
              left: win.left,
              top: win.top,
              width: win.width,
              height: win.height,
              borderRadius: win.borderRadius,
            }}
          >
            <BlenderFlyoverPreview
              src={videoUrl}
              scrubSeconds={localSec}
              playing={playing}
              blendMode={isAiT2vFlyover ? "normal" : "lighten"}
              objectFit="cover"
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          </div>
          {!pipTransparent && referencePoint ? (
            <div className="absolute left-[5%] right-[5%] bottom-[6%] rounded-xl border border-amber-400/35 bg-[#08121c]/90 px-3 py-2">
              <p className="text-[7px] font-bold uppercase tracking-wider text-amber-300">
                Ponto de referência / PIP
              </p>
              <p className="text-[10px] font-bold text-cyan-300 mt-0.5 truncate">
                {referencePoint}
              </p>
            </div>
          ) : null}
        </div>
      );
    }
    return (
      <div className="absolute inset-0 z-40 overflow-hidden bg-black pointer-events-none">
        <BlenderFlyoverPreview
          src={videoUrl}
          scrubSeconds={localSec}
          playing={playing}
          blendMode={isAiT2vFlyover ? "normal" : "lighten"}
          objectFit="cover"
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    );
  }

  if (!frames.length) {
    return (
      <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0d2137] via-[#1a3a52] to-[#0a1628] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-bold text-white">
          {String(props.location || "Local geográfico")}
        </p>
        <p className="text-[10px] text-sky-300/90 mt-2 font-semibold max-w-md">
          {isAiT2v && aiPrompt.length >= 80
            ? "Prompt IA Geo pronto — gere o vídeo no Grok ou Google Flow e envie o MP4"
            : isAiT2v
              ? "Gerando prompt IA Geo…"
              : "Enriquecimento geográfico pendente — abra o inspector da cena"}
        </p>
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

  if (isGeoMediaPip) {
    const win = resolveGeoPipWindowRect(100, 100, pipWindow);
    return (
      <div className="absolute inset-0 z-40 overflow-hidden bg-gradient-to-b from-[#04070d] via-[#071018] to-[#04070d] pointer-events-none">
        <div
          className="absolute overflow-hidden bg-black border border-white/15"
          style={{
            left: win.left,
            top: win.top,
            width: win.width,
            height: win.height,
            borderRadius: win.borderRadius,
          }}
        >
          {mapLayers}
        </div>
        {referencePoint ? (
          <div className="absolute left-[5%] right-[5%] bottom-[6%] rounded-xl border border-amber-400/35 bg-[#08121c]/90 px-3 py-2">
            <p className="text-[7px] font-bold uppercase tracking-wider text-amber-300">
              Ponto de referência / PIP
            </p>
            <p className="text-[10px] font-bold text-cyan-300 mt-0.5 truncate">
              {referencePoint}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-black pointer-events-none">
      {mapLayers}
    </div>
  );
}
