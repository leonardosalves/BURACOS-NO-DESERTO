import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  delayRender,
  continueRender,
} from "remotion";
import {
  boundaryToSvgPaths,
  estimatePathLength,
  type BoundaryGeoJson,
  type ZoomKeyframe,
} from "./locationIntroGeo";

function resolveMapImageSrc(src?: string): string {
  const s = String(src || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/api/")) return s;
  if (s.startsWith("projects/")) return staticFile(s.replace(/\\/g, "/"));
  return staticFile(s.replace(/\\/g, "/"));
}

export interface LocationIntroProps {
  location: string;
  region?: string;
  country?: string;
  accentColor?: string;
  backgroundImage?: string;
  /** Imagem mais aberta (zoom out) — crossfade durante a descida */
  backgroundImageWide?: string;
  variant?: "satellite" | "map" | "minimal";
  zoom_from?: number;
  zoom_to?: number;
  map_style?: string;
  lat?: number;
  lng?: number;
  fly_mode?: "earth_descent" | "city_outline" | "simple";
  place_type?: "city" | "poi";
  boundaryGeoJson?: string;
  zoom_keyframes?: ZoomKeyframe[];
  /** pip = cartão sobre o B-roll; fullscreen = takeover (estilo Earth Studio) */
  presentation?: "pip" | "fullscreen";
}

const SatelliteTerrain: React.FC = () => (
  <AbsoluteFill>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(160deg, #2d5a27 0%, #3d7a35 25%, #4a8f40 45%, #2e6b2a 70%, #1f4d1c 100%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "8%",
        bottom: "12%",
        width: "42%",
        height: "28%",
        borderRadius: "40% 60% 50% 45%",
        background:
          "linear-gradient(135deg, #1a5f7a 0%, #0d3d56 50%, #082a3d 100%)",
        opacity: 0.92,
        filter: "blur(1px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "18%",
        top: "22%",
        width: "38%",
        height: "42%",
        borderRadius: "12px",
        background:
          "radial-gradient(ellipse at 40% 50%, #8a9098 0%, #6b7078 30%, #4a4f55 60%, transparent 80%)",
        opacity: 0.75,
        transform: "rotate(-8deg)",
      }}
    />
    <div
      style={{
        position: "absolute",
        right: "5%",
        top: "8%",
        width: "55%",
        height: "75%",
        background:
          "radial-gradient(ellipse at 30% 40%, #3a6b32 0%, #2d5528 40%, #1e3d1a 80%)",
        opacity: 0.6,
      }}
    />
    <svg
      viewBox="0 0 1920 1080"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.25,
      }}
    >
      <path
        d="M200,600 Q400,500 600,550 T1000,520 T1400,580 T1800,540"
        fill="none"
        stroke="#f0e6c8"
        strokeWidth="3"
      />
      <path
        d="M300,400 Q500,350 700,380 T1100,360"
        fill="none"
        stroke="#e8dcc0"
        strokeWidth="2"
      />
    </svg>
  </AbsoluteFill>
);

const MultiKeyframeSatellite: React.FC<{
  keyframes: ZoomKeyframe[];
  frame: number;
  durationInFrames: number;
  panX: number;
  panY: number;
}> = ({ keyframes, frame, durationInFrames, panX, panY }) => {
  const sorted = useMemo(
    () =>
      [...keyframes]
        .filter((k) => k?.image)
        .sort((a, b) => Number(a.zoom) - Number(b.zoom)),
    [keyframes]
  );

  if (sorted.length === 0) return null;
  if (sorted.length === 1) {
    const src = resolveMapImageSrc(sorted[0].image);
    if (!src) return null;
    return (
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }

  const segment = durationInFrames / (sorted.length - 1);
  const idx = Math.min(
    sorted.length - 2,
    Math.max(0, Math.floor(frame / Math.max(segment, 1)))
  );
  const localT = interpolate(
    frame,
    [idx * segment, (idx + 1) * segment],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const zoomA = Number(sorted[idx].zoom) || 8;
  const zoomB = Number(sorted[idx + 1].zoom) || 14;
  const scaleA = 1 + zoomA / 26;
  const scaleB = 1 + zoomB / 22;
  const scale = interpolate(localT, [0, 1], [scaleA, scaleB], {
    easing: Easing.bezier(0.22, 0.1, 0.25, 1),
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
      }}
    >
      {sorted.map((kf, i) => {
        const src = resolveMapImageSrc(kf.image);
        if (!src) return null;
        let opacity = 0;
        if (i === idx) opacity = 1 - localT;
        else if (i === idx + 1) opacity = localT;
        else if (i < idx) opacity = 0;
        else opacity = 0;
        if (opacity <= 0.01) return null;
        return (
          <Img
            key={`${kf.zoom}-${kf.image}`}
            src={src}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const CityBoundaryOverlay: React.FC<{
  boundary: BoundaryGeoJson | null;
  lat: number;
  lng: number;
  zoom: number;
  accentColor: string;
  drawProgress: number;
  width: number;
  height: number;
}> = ({
  boundary,
  lat,
  lng,
  zoom,
  accentColor,
  drawProgress,
  width,
  height,
}) => {
  const paths = useMemo(
    () => boundaryToSvgPaths(boundary, lat, lng, zoom, width, height),
    [boundary, lat, lng, zoom, width, height]
  );

  if (!paths.length) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {paths.map((d, i) => {
        const len = estimatePathLength(d);
        const offset = len * (1 - drawProgress);
        return (
          <g key={i}>
            <path
              d={d}
              fill={`${accentColor}18`}
              stroke="none"
              style={{ opacity: drawProgress * 0.85 }}
            />
            <path
              d={d}
              fill="none"
              stroke={accentColor}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeDasharray={len}
              strokeDashoffset={offset}
              style={{
                filter: `drop-shadow(0 0 8px ${accentColor}88)`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export const LocationIntro: React.FC<LocationIntroProps> = ({
  location,
  region = "",
  country = "",
  accentColor = "#FFFFFF",
  backgroundImage = "",
  backgroundImageWide = "",
  variant = "satellite",
  zoom_from = 8,
  zoom_to = 14,
  lat = 0,
  lng = 0,
  fly_mode = "simple",
  boundaryGeoJson = "",
  zoom_keyframes = [],
  presentation = "pip",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const isVertical = height > width;
  const isPip = presentation === "pip";

  const [boundaryData, setBoundaryData] = useState<BoundaryGeoJson | null>(
    null
  );

  useEffect(() => {
    const path = String(boundaryGeoJson || "").trim();
    if (!path || fly_mode !== "city_outline") return;
    const handle = delayRender("location-intro-boundary");
    fetch(resolveMapImageSrc(path))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBoundaryData(data))
      .catch(() => setBoundaryData(null))
      .finally(() => continueRender(handle));
  }, [boundaryGeoJson, fly_mode]);

  const keyframes =
    Array.isArray(zoom_keyframes) && zoom_keyframes.length > 0
      ? zoom_keyframes
      : backgroundImageWide && backgroundImage
        ? [
            { zoom: zoom_from, image: backgroundImageWide },
            { zoom: zoom_to, image: backgroundImage },
          ]
        : backgroundImage
          ? [{ zoom: zoom_to, image: backgroundImage }]
          : [];

  const hasMultiKeyframe = keyframes.length >= 2;
  const hasDualSatellite =
    !hasMultiKeyframe && Boolean(backgroundImageWide && backgroundImage);
  const useEarthFly = fly_mode === "earth_descent" && hasMultiKeyframe;
  const useCityOutline = fly_mode === "city_outline";

  const enterOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const mapImageWide = resolveMapImageSrc(backgroundImageWide);
  const mapImageTight = resolveMapImageSrc(backgroundImage);

  const zoomStart = hasDualSatellite
    ? 1.02
    : 1 + Math.min(0.35, Number(zoom_from) / 28);
  const zoomEnd = hasDualSatellite
    ? 1.12
    : 1 + Math.min(0.55, Number(zoom_to) / 22);
  const legacyZoom = interpolate(
    frame,
    [0, durationInFrames],
    [zoomStart, zoomEnd],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }
  );

  const wideOpacity = hasDualSatellite
    ? interpolate(frame, [0, durationInFrames * 0.72], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const tightOpacity = hasDualSatellite
    ? interpolate(
        frame,
        [durationInFrames * 0.22, durationInFrames * 0.82],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      )
    : 1;

  const panX = interpolate(frame, [0, durationInFrames], [3, -1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panY = interpolate(frame, [0, durationInFrames], [2, -0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const boundaryDrawProgress = interpolate(
    frame,
    [fps * 0.4, durationInFrames * 0.88],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  const outlineZoom = useCityOutline
    ? interpolate(
        frame,
        [0, durationInFrames],
        [Number(zoom_from) || 9, Number(zoom_to) || 12],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : Number(zoom_from) || 9;

  const labelY = interpolate(frame, [fps * 0.3, fps * 0.8], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const labelOpacity = interpolate(frame, [fps * 0.25, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pinPulse = 1 + 0.12 * Math.sin((frame / fps) * Math.PI * 2);
  const subtitle = [region, country].filter(Boolean).join(" · ");
  const locationFontSize = isVertical ? 52 : 64;
  const subtitleFontSize = isVertical ? 20 : 24;
  const hasCoords = Boolean(lat && lng);

  const mapContent = () => {
    if (variant === "minimal") {
      return (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, #0a1628 0%, #142238 50%, #0d1a2d 100%)",
          }}
        />
      );
    }

    if (useEarthFly) {
      return (
        <MultiKeyframeSatellite
          keyframes={keyframes}
          frame={frame}
          durationInFrames={durationInFrames}
          panX={panX}
          panY={panY}
        />
      );
    }

    if (useCityOutline && hasMultiKeyframe) {
      const wideKf = keyframes[0];
      const tightKf = keyframes[keyframes.length - 1];
      const wideSrc = resolveMapImageSrc(wideKf.image);
      const tightSrc = resolveMapImageSrc(tightKf.image);
      const cityWideOpacity = interpolate(
        frame,
        [0, durationInFrames * 0.75],
        [1, 0.35],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      const cityTightOpacity = interpolate(
        frame,
        [durationInFrames * 0.35, durationInFrames * 0.9],
        [0, 0.65],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      const cityScale = interpolate(frame, [0, durationInFrames], [1.02, 1.1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

      return (
        <AbsoluteFill
          style={{
            transform: `scale(${cityScale}) translate(${panX * 0.5}%, ${panY * 0.5}%)`,
          }}
        >
          {wideSrc ? (
            <Img
              src={wideSrc}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: cityWideOpacity,
              }}
            />
          ) : null}
          {tightSrc && tightSrc !== wideSrc ? (
            <Img
              src={tightSrc}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: cityTightOpacity,
              }}
            />
          ) : null}
          {hasCoords && boundaryData ? (
            <CityBoundaryOverlay
              boundary={boundaryData}
              lat={lat}
              lng={lng}
              zoom={outlineZoom}
              accentColor={accentColor}
              drawProgress={boundaryDrawProgress}
              width={width}
              height={height}
            />
          ) : null}
        </AbsoluteFill>
      );
    }

    if (hasDualSatellite) {
      return (
        <>
          <Img
            src={mapImageWide}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: wideOpacity,
            }}
          />
          <Img
            src={mapImageTight}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: tightOpacity,
            }}
          />
        </>
      );
    }

    if (mapImageTight) {
      return (
        <Img
          src={mapImageTight}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      );
    }

    return <SatelliteTerrain />;
  };

  const wrapTransform =
    useEarthFly || useCityOutline
      ? undefined
      : `scale(${legacyZoom}) translate(${panX}%, ${panY}%)`;

  const mapPanel = (
    <>
      <AbsoluteFill
        style={wrapTransform ? { transform: wrapTransform } : undefined}
      >
        {mapContent()}
      </AbsoluteFill>

      {!isPip ? (
        <>
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)",
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)",
            }}
          />
        </>
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      )}

      {variant !== "minimal" ? (
        <AbsoluteFill
          style={{
            justifyContent: isPip ? "flex-start" : "center",
            alignItems: isPip ? "flex-start" : "center",
            padding: isPip ? "14% 12%" : 0,
          }}
        >
          <div
            style={{
              width: (isPip ? 10 : 16) * pinPulse,
              height: (isPip ? 10 : 16) * pinPulse,
              borderRadius: "50%",
              background: accentColor,
              boxShadow: `0 0 16px ${accentColor}88`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: isPip ? "flex-start" : "center",
          padding: isPip ? "10px 14px 12px" : undefined,
          paddingBottom: isPip ? 12 : isVertical ? 280 : 80,
        }}
      >
        <div
          style={{
            textAlign: isPip ? "left" : "center",
            opacity: labelOpacity,
            transform: isPip ? undefined : `translateY(${labelY}px)`,
            padding: isPip ? 0 : "0 48px",
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: isPip ? locationFontSize * 0.42 : locationFontSize,
              fontWeight: 800,
              color: accentColor,
              letterSpacing: "-0.02em",
              textShadow: "0 4px 24px rgba(0,0,0,0.8)",
              lineHeight: 1.1,
            }}
          >
            {location}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: isPip ? 4 : 12,
                fontFamily: "'Inter', sans-serif",
                fontSize: isPip ? subtitleFontSize * 0.75 : subtitleFontSize,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </>
  );

  const cardStyle: React.CSSProperties = isPip
    ? {
        position: "relative",
        width: isVertical ? "88%" : "44%",
        height: isVertical ? "30%" : "36%",
        borderRadius: 16,
        overflow: "hidden",
        border: `2px solid ${accentColor}44`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        background: "#050506",
      }
    : {
        position: "relative",
        width: "100%",
        height: "100%",
      };

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 55,
        opacity: Math.min(enterOpacity, exitOpacity),
        overflow: "hidden",
        justifyContent: isPip ? "flex-end" : "center",
        alignItems: isPip ? "flex-end" : "center",
        padding: isPip ? (isVertical ? "18% 6% 22%" : "8% 5% 10%") : 0,
      }}
    >
      <div style={cardStyle}>{mapPanel}</div>
    </AbsoluteFill>
  );
};
