import React, { useEffect, useState } from "react";
import { boundaryToViewBoxPaths } from "./locationIntroBoundaryPreview";
import { Pause, Play } from "lucide-react";
import { OverlayAnimatedIcon } from "./OverlayAnimatedIcon";
import { iconLabel, resolveIconStyle } from "./overlayIconCatalog";
import { overlayPreviewFlexStyle } from "./overlayFlexPosition";
import {
  getOverlayPreviewMetrics,
  overlayPreviewFrameClass,
} from "./overlayPreviewScale";
import {
  interpolateClamped,
  previewSpring,
  useOverlayPreviewMotion,
} from "./overlayPreviewMotion";
import { OverlayPreviewMotionShell } from "./OverlayPreviewMotionShell";
import {
  renderChapterStingerPreview,
  renderListicleRecapPreview,
  renderListicleStingerPreview,
  renderRankProgressPreview,
} from "./overlaySystemPreviews";
import {
  barChartPreviewShell,
  infoCardVariantStyle,
  infoTimelineTitleStyle,
  kineticStyleProps,
  lowerThirdVariantShell,
  normalizeBarChartItems,
  normalizeTimelineEvents,
  themePanelBg,
} from "./overlayPreviewStyles";
import {
  OVERLAY_POSITION_GRID,
  OVERLAY_POSITIONS,
  OVERLAY_TYPE_LABELS,
  overlaySummary,
  overlaySupportsTheme,
  type OverlayDraft,
} from "./overlayEditorConfig";
import {
  interpolateFlyScale,
  resolveEarthDescentFrame,
  sortZoomKeyframes,
} from "./locationIntroFly";
import { CesiumLocationIntro } from "./CesiumLocationIntro";
import { BlenderFlyoverPreview } from "./BlenderFlyoverPreview";

type Props = {
  overlay: OverlayDraft;
  aspectRatio?: "16:9" | "9:16" | string;
  accentColor?: string;
  sceneLabel?: string;
  sceneNarration?: string;
  compact?: boolean;
  className?: string;
  /** Duração do overlay no vídeo — alimenta animação de entrada/saída. */
  durationSeconds?: number;
  /** Segundos dentro do overlay (scrub da timeline) — congela animação nesse frame. */
  scrubSeconds?: number;
  /** Controle externo de play da animação do overlay (timeline studio). */
  timelinePlaying?: boolean;
  /** Oculta chrome do preview (botões, meta) — uso embutido na timeline. */
  embedded?: boolean;
  /** PIP = cartão no canto; fill = cobre o frame (fullscreen). */
  embeddedLayout?: "pip" | "fill";
  /** Clique no preview para escolher posição (grade 3×3). */
  onPositionSelect?: (positionId: string) => void;
};

function IconSlot({
  props,
  accent,
  sizeCss,
}: {
  props: Record<string, unknown>;
  accent: string;
  sizeCss: string;
}) {
  const iconId = props.iconType ? String(props.iconType) : undefined;
  if (!iconId) return null;
  return (
    <div className="shrink-0" style={{ width: sizeCss, height: sizeCss }}>
      <OverlayAnimatedIcon
        iconId={iconId}
        iconStyle={resolveIconStyle(props)}
        fill
        color={accent}
      />
    </div>
  );
}

function LocationIntroMapCard({
  props,
  accentColor,
  isPip,
  embedded,
  embeddedLayout,
  scrubSeconds,
  durationSeconds,
  timelinePlaying = false,
  metrics,
  motion,
  legibilityShadow,
  isShort,
}: {
  props: Record<string, unknown>;
  accentColor: string;
  isPip: boolean;
  embedded: boolean;
  embeddedLayout: "pip" | "fill";
  scrubSeconds?: number;
  durationSeconds: number;
  timelinePlaying?: boolean;
  metrics: Record<string, number>;
  motion: { opacity: number };
  legibilityShadow: string;
  isShort: boolean;
}) {
  const [boundaryPaths, setBoundaryPaths] = useState<string[]>([]);
  const [cesiumCfg, setCesiumCfg] = useState({
    ionAccessToken: String(props.cesium_ion_token || ""),
    googleMapsApiKey: String(props.google_maps_api_key || ""),
  });
  const bgWide = String(props.backgroundImageWide || "");
  const bgTight = String(props.backgroundImage || "");
  const flyMode = String(props.fly_mode || "earth_descent");
  const placeType = String(
    props.place_type || (flyMode === "city_outline" ? "city" : "poi")
  );
  const allKeyframes = Array.isArray(props.zoom_keyframes)
    ? props.zoom_keyframes
    : [];
  const keyframes = allKeyframes.filter((k: { image?: string }) =>
    Boolean(String(k?.image || "").trim())
  );
  const subtitle = [props.region, props.country].filter(Boolean).join(" · ");
  const lat = Number(props.lat) || 0;
  const lng = Number(props.lng) || 0;
  const zoomTo = Number(props.zoom_to) || 12;
  const boundarySrc = String(props.boundaryGeoJson || "").trim();
  const mapProvider = String(props.map_provider || "");
  const flyoverSrc = String(props.flyover_video || "").trim();
  const useBlenderMap =
    Boolean(flyoverSrc) &&
    (mapProvider === "blender" ||
      mapProvider === "" ||
      /flyover\.mp4/i.test(flyoverSrc));
  const useCesiumMap = mapProvider === "cesium" && lat && lng && !embedded;

  useEffect(() => {
    if (!useCesiumMap || embedded) return;
    if (props.cesium_ion_token || props.google_maps_api_key) {
      setCesiumCfg({
        ionAccessToken: String(props.cesium_ion_token || ""),
        googleMapsApiKey: String(props.google_maps_api_key || ""),
      });
      return;
    }
    let cancelled = false;
    fetch("/api/cesium/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCesiumCfg({
          ionAccessToken: String(data.ionAccessToken || ""),
          googleMapsApiKey: String(data.googleMapsApiKey || ""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    useCesiumMap,
    embedded,
    props.cesium_ion_token,
    props.google_maps_api_key,
  ]);

  useEffect(() => {
    if (!boundarySrc || placeType !== "city") {
      setBoundaryPaths([]);
      return;
    }
    let cancelled = false;
    fetch(boundarySrc)
      .then((r) => (r.ok ? r.json() : null))
      .then((geo) => {
        if (cancelled || !geo || !lat || !lng) return;
        setBoundaryPaths(boundaryToViewBoxPaths(geo, lat, lng, zoomTo));
      })
      .catch(() => {
        if (!cancelled) setBoundaryPaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [boundarySrc, lat, lng, placeType, zoomTo]);

  if (
    embedded &&
    (useBlenderMap || useCesiumMap || keyframes.length > 0 || bgWide || bgTight)
  ) {
    const progress =
      scrubSeconds != null
        ? Math.min(
            1,
            Math.max(0, scrubSeconds / Math.max(durationSeconds, 0.1))
          )
        : 0.45;

    if (useBlenderMap) {
      const fallbackFrames = [
        bgWide ? { zoom: Number(props.zoom_from) || 3, image: bgWide } : null,
        bgTight ? { zoom: Number(props.zoom_to) || 10, image: bgTight } : null,
      ].filter(Boolean) as Array<{ zoom?: number; image?: string }>;
      const frames = sortZoomKeyframes(
        keyframes.length > 0 ? keyframes : fallbackFrames
      );
      const {
        activeIndex: idx,
        blendT: localT,
        easedProgress,
      } = resolveEarthDescentFrame(frames, progress);
      const zoom = interpolateFlyScale(frames, progress, flyMode);
      const drawProgress = Math.min(
        1,
        Math.max(0, (easedProgress - 0.42) * 1.65)
      );
      const poster = bgTight || bgWide || "";
      const showFlyoverVideo = !embedded;

      return (
        <div
          className={`relative overflow-hidden bg-[#050506] ${
            isPip ? "w-full h-full" : "absolute inset-0"
          }`}
        >
          {poster && frames.length === 0 ? (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />
          ) : null}
          {frames.length > 0 ? (
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                zIndex: 0,
              }}
            >
              {frames.map((kf, i) => {
                const src = String((kf as { image?: string })?.image || "");
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
                  />
                );
              })}
            </div>
          ) : null}
          {showFlyoverVideo ? (
            <BlenderFlyoverPreview
              src={flyoverSrc}
              scrubSeconds={scrubSeconds}
              playing={timelinePlaying}
              poster={poster || undefined}
              className="absolute inset-0"
            />
          ) : frames.length === 0 && flyoverSrc ? (
            <BlenderFlyoverPreview
              src={flyoverSrc}
              scrubSeconds={scrubSeconds}
              playing={timelinePlaying}
              poster={poster || undefined}
              className="absolute inset-0"
              style={{ mixBlendMode: "lighten", opacity: 0.92 }}
            />
          ) : null}
          {placeType === "city" && boundaryPaths.length > 0 ? (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ zIndex: 2 }}
            >
              {boundaryPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={0.35}
                  strokeDasharray="1.2 0.8"
                  strokeDashoffset={drawProgress > 0 ? 0 : 100}
                  opacity={drawProgress}
                />
              ))}
            </svg>
          ) : null}
        </div>
      );
    }

    if (useCesiumMap) {
      const virtualFrames =
        allKeyframes.length > 0
          ? allKeyframes
          : [
              { zoom: props.zoom_from || 3, image: "" },
              { zoom: props.zoom_to || 12, image: "" },
            ];
      return (
        <div
          className={`relative overflow-hidden bg-[#050506] ${
            isPip ? "w-full h-full" : "absolute inset-0"
          }`}
        >
          <CesiumLocationIntro
            lat={lat}
            lng={lng}
            zoom_from={Number(props.zoom_from) || 3}
            zoom_to={Number(props.zoom_to) || 12}
            fly_mode={flyMode}
            zoom_keyframes={virtualFrames}
            boundaryGeoJson={boundarySrc}
            accentColor={accentColor}
            place_type={placeType}
            progress={progress}
            ionAccessToken={cesiumCfg.ionAccessToken}
            googleMapsApiKey={cesiumCfg.googleMapsApiKey}
            staticOnly={embedded}
          />
        </div>
      );
    }

    const frames = sortZoomKeyframes(
      keyframes.length > 0
        ? keyframes
        : [
            bgWide ? { zoom: props.zoom_from || 8, image: bgWide } : null,
            bgTight ? { zoom: props.zoom_to || 14, image: bgTight } : null,
          ].filter(Boolean)
    );
    const {
      activeIndex: idx,
      blendT: localT,
      easedProgress,
    } = resolveEarthDescentFrame(frames, progress);
    const zoom = interpolateFlyScale(frames, progress, flyMode);
    const drawProgress = Math.min(
      1,
      Math.max(0, (easedProgress - 0.42) * 1.65)
    );

    return (
      <div
        className={`relative overflow-hidden bg-[#050506] ${
          isPip ? "w-full h-full" : "absolute inset-0"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {frames.map((kf, i) => {
            const src = String((kf as { image?: string })?.image || "");
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
              />
            );
          })}
        </div>
        {placeType === "city" && boundaryPaths.length > 0 ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ opacity: drawProgress }}
          >
            {boundaryPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.1"
                strokeDasharray="240"
                strokeDashoffset={240 * (1 - drawProgress)}
              />
            ))}
          </svg>
        ) : placeType === "city" ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              opacity: Math.min(1, Math.max(0, (progress - 0.4) * 1.8)),
            }}
          >
            <path
              d="M18,42 L42,28 L72,34 L82,58 L64,78 L36,74 Z"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.2"
              strokeDasharray="220"
              strokeDashoffset={220 * (1 - Math.min(1, progress * 1.1))}
            />
          </svg>
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: isPip
              ? "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)"
              : "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        <div
          className={`absolute px-3 pb-2 ${
            isPip
              ? "left-0 right-0 bottom-0 text-left"
              : "inset-x-0 bottom-[12%] text-center px-4"
          }`}
          style={{ opacity: motion.opacity }}
        >
          <p
            className="font-black text-white leading-tight"
            style={{
              fontSize: isPip
                ? metrics.fontSizeTitle * 0.42
                : metrics.fontSizeTitle,
              textShadow: legibilityShadow,
            }}
          >
            {String(props.location || "Local")}
          </p>
          {subtitle ? (
            <p
              className="text-zinc-300 uppercase tracking-widest mt-0.5"
              style={{
                fontSize: isPip
                  ? metrics.fontSizeSubtitle * 0.75
                  : metrics.fontSizeSubtitle,
                textShadow: legibilityShadow,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

export function OverlayPreview({
  overlay,
  aspectRatio = "16:9",
  accentColor = "#D4AF37",
  sceneLabel,
  sceneNarration,
  compact = false,
  className = "",
  durationSeconds = 6,
  scrubSeconds,
  timelinePlaying,
  embedded = false,
  embeddedLayout = "fill",
  onPositionSelect,
}: Props) {
  const [playing, setPlaying] = useState(true);
  const animPlaying =
    timelinePlaying != null ? timelinePlaying : scrubSeconds == null && playing;
  const scrubFrame =
    scrubSeconds != null
      ? Math.round(Math.max(0, Math.min(durationSeconds, scrubSeconds)) * 30)
      : null;
  const isShort = aspectRatio === "9:16";
  const format = isShort ? "short" : "long";
  const metrics = getOverlayPreviewMetrics(format) as ReturnType<
    typeof getOverlayPreviewMetrics
  > &
    Record<string, number>;
  const props = overlay.props || {};
  const position = String(props.position || "bottom-left");
  const variant = String(props.variant || "glass");
  const theme = String(props.theme || "classic");
  const iconKey = props.iconType ? String(props.iconType) : "";
  const iconStyle = resolveIconStyle(props);
  const motion = useOverlayPreviewMotion(
    durationSeconds,
    overlay.type,
    animPlaying,
    scrubFrame
  );
  const legibilityShadow =
    "0 1px 3px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.65)";

  const previewCtx = {
    props,
    accentColor,
    metrics,
    motion,
    isShort,
    position,
  };

  const motionShell = (
    children: React.ReactNode,
    shellPosition = position,
    contentStyle?: React.CSSProperties
  ) => (
    <OverlayPreviewMotionShell
      position={shellPosition}
      pad={metrics.positionPad}
      motion={motion}
      contentStyle={contentStyle}
    >
      {children}
    </OverlayPreviewMotionShell>
  );

  const previewMetaLabel = (() => {
    if (overlay.type === "timeline") {
      const orient = String(props.orientation || props.variant || "horizontal");
      return `${metrics.refLabel} · ${theme} · ${orient === "vertical" ? "vertical" : "horizontal"}`;
    }
    if (overlay.type === "rank-progress") {
      return `${metrics.refLabel} · HUD · ${String(props.hudTheme || "ancient")}`;
    }
    if (overlay.type === "listicle-stinger") {
      return `${metrics.refLabel} · stinger flash`;
    }
    if (overlay.type === "chapter-stinger") {
      return `${metrics.refLabel} · capítulo`;
    }
    if (overlay.type === "listicle-recap") {
      return `${metrics.refLabel} · recap`;
    }
    if (overlaySupportsTheme(overlay.type)) {
      return `${metrics.refLabel} · ${theme}${variant && overlay.type !== "timeline" ? ` · ${variant}` : ""}`;
    }
    return `${metrics.refLabel} · ${variant}`;
  })();

  const counterDisplayValue = () => {
    const raw = props.value;
    const target =
      typeof raw === "number"
        ? raw
        : Number(String(raw ?? "0").replace(/[^\d.-]/g, ""));
    const safeTarget = Number.isFinite(target) ? target : 0;
    const progress = interpolateClamped(motion.frame, [8, 36], [0, 1]);
    if (!Number.isFinite(safeTarget) || String(raw).includes("%")) {
      return String(raw ?? "0");
    }
    return String(Math.round(safeTarget * progress));
  };

  const renderTimeline = () => {
    const events = normalizeTimelineEvents(props);
    const orientation = String(
      props.orientation || props.variant || "horizontal"
    );
    const isHorizontal = orientation !== "vertical";
    const titleStyle = infoTimelineTitleStyle(theme, accentColor, isShort);
    const flexPos = overlayPreviewFlexStyle(position, metrics, "bottom-right");

    return (
      <OverlayPreviewMotionShell
        mode="flex"
        motion={motion}
        flexStyle={flexPos}
        contentStyle={{
          display: "flex",
          flexDirection: "column",
          alignItems: isHorizontal ? "center" : "flex-end",
          gap: isHorizontal ? "1.1em" : "0.8em",
          maxWidth: isHorizontal ? "92%" : isShort ? "78%" : "72%",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "0.55em",
            alignSelf: isHorizontal ? "center" : "flex-end",
            ...titleStyle,
          }}
        >
          <div
            style={{
              width: "0.22em",
              height: isShort ? "1.2em" : "0.95em",
              backgroundColor: accentColor,
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "#F8FAFC",
              textTransform: "uppercase",
              textShadow: legibilityShadow,
              fontSize: metrics.fontSizeSubtitle,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {String(props.title || "CRONOLOGIA")}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isHorizontal ? "row" : "column",
            alignItems: isHorizontal ? "center" : "flex-end",
            gap: 0,
            padding: isHorizontal ? "0.55em 0.75em" : "0.65em 0.85em",
            background: isHorizontal
              ? "linear-gradient(145deg, rgba(6,6,10,0.82) 0%, rgba(14,14,22,0.78) 100%)"
              : "linear-gradient(135deg, rgba(6,6,10,0.88) 0%, rgba(12,12,18,0.84) 100%)",
            backdropFilter: "blur(10px)",
            borderRadius: isHorizontal ? 12 : 14,
            border: `1px solid ${accentColor}44`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          {events.map((event, index) => {
            const progress =
              events.length > 1 ? (index / (events.length - 1)) * 100 : 0;
            const isRevealed = motion.lineProgress >= progress;
            const dotDelay = 8 + index * 8;
            const dotScale = previewSpring(
              Math.max(0, motion.frame - dotDelay),
              12
            );
            const textOpacity = Math.min(
              1,
              Math.max(0, (motion.frame - (dotDelay + 4)) / 10)
            );
            const isHighlight = event.highlight || index === events.length - 1;

            return (
              <React.Fragment key={`${event.year}-${index}`}>
                {index > 0 && (
                  <div
                    style={{
                      [isHorizontal ? "width" : "height"]: isHorizontal
                        ? "2.8em"
                        : "1.4em",
                      [isHorizontal ? "height" : "width"]: 2,
                      background: `linear-gradient(${isHorizontal ? "to right" : "to bottom"}, ${accentColor}70, ${accentColor}25)`,
                      opacity: isRevealed ? 1 : 0.2,
                      alignSelf: isHorizontal ? "auto" : "flex-end",
                      marginRight: isHorizontal ? 0 : "0.9em",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isHorizontal ? "center" : "flex-end",
                    gap: isShort ? "0.35em" : "0.28em",
                    minWidth: isHorizontal ? "4.5em" : undefined,
                    width: isHorizontal ? undefined : "100%",
                    opacity: textOpacity,
                    textAlign: isHorizontal ? "center" : "right",
                  }}
                >
                  <span
                    style={{
                      color: isHighlight ? accentColor : "#F8FAFC",
                      textShadow: legibilityShadow,
                      fontSize: metrics.fontSizeDesc,
                      fontWeight: 700,
                    }}
                  >
                    {event.year}
                  </span>
                  <div
                    style={{
                      width: isHighlight
                        ? isShort
                          ? 12
                          : 10
                        : isShort
                          ? 10
                          : 8,
                      height: isHighlight
                        ? isShort
                          ? 12
                          : 10
                        : isShort
                          ? 10
                          : 8,
                      borderRadius: "50%",
                      backgroundColor: isHighlight
                        ? accentColor
                        : "rgba(248,250,252,0.5)",
                      transform: `scale(${dotScale})`,
                      boxShadow: isHighlight
                        ? `0 0 12px ${accentColor}80`
                        : "none",
                      border: isHighlight
                        ? `2px solid ${accentColor}`
                        : "1px solid rgba(248,250,252,0.3)",
                      alignSelf: isHorizontal ? "center" : "flex-end",
                      marginRight: isHorizontal ? 0 : "0.75em",
                    }}
                  />
                  <span
                    style={{
                      color: "rgba(248,250,252,0.92)",
                      maxWidth: isHorizontal ? "7em" : "12em",
                      lineHeight: 1.4,
                      textShadow: legibilityShadow,
                      fontSize: metrics.fontSizeDesc,
                    }}
                  >
                    {event.description}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </OverlayPreviewMotionShell>
    );
  };

  const renderLowerThird = () => {
    const shell = lowerThirdVariantShell(variant, accentColor, theme);

    if (variant === "bild") {
      return motionShell(
        <>
          <div
            style={{
              ...shell.container,
              gap: metrics.cardGap,
              padding: metrics.cardPadding,
            }}
          >
            <IconSlot
              props={props}
              accent={accentColor}
              sizeCss={metrics.iconSize}
            />
            <span
              style={{
                ...shell.title,
                fontSize: metrics.fontSizeTitle,
                whiteSpace: "nowrap",
              }}
            >
              {String(props.title || "Título")}
            </span>
          </div>
          {props.subtitle && (
            <div style={shell.subtitle}>
              <span style={{ fontSize: metrics.fontSizeSubtitle }}>
                {String(props.subtitle)}
              </span>
            </div>
          )}
        </>,
        position,
        { maxWidth: metrics.maxWidth }
      );
    }

    if (variant === "bold-block") {
      return motionShell(
        <>
          <div
            style={{
              ...shell.title,
              fontSize: metrics.fontSizeTitle,
              padding: metrics.cardPadding,
              display: "flex",
              alignItems: "center",
              gap: metrics.cardGap,
            }}
          >
            <IconSlot
              props={props}
              accent={accentColor}
              sizeCss={metrics.iconSize}
            />
            <span style={{ whiteSpace: "nowrap" }}>
              {String(props.title || "Título")}
            </span>
          </div>
          {props.subtitle && (
            <div
              style={{
                ...shell.subtitle,
                fontSize: metrics.fontSizeSubtitle,
                padding: metrics.cardPadding,
              }}
            >
              {String(props.subtitle)}
            </div>
          )}
        </>,
        position,
        { ...shell.container, maxWidth: metrics.maxWidth }
      );
    }

    return motionShell(
      <>
        <IconSlot
          props={props}
          accent={accentColor}
          sizeCss={metrics.iconSize}
        />
        <div className="min-w-0">
          <p
            style={{
              ...shell.title,
              fontSize: metrics.fontSizeTitle,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {String(props.title || "Título")}
          </p>
          {props.subtitle && (
            <p
              style={{
                ...shell.subtitle,
                fontSize: metrics.fontSizeSubtitle,
                margin: `${metrics.cardGap} 0 0`,
              }}
            >
              {String(props.subtitle)}
            </p>
          )}
        </div>
      </>,
      position,
      {
        ...shell.container,
        maxWidth: metrics.maxWidth,
        padding: metrics.cardPadding,
        gap: metrics.cardGap,
        display: "flex",
        flexDirection: variant === "clean-bar" ? "row" : "column",
        alignItems: variant === "soft-pill" ? "center" : "flex-start",
      }
    );
  };

  const renderOverlayContent = () => {
    switch (overlay.type) {
      case "lower-third":
        return renderLowerThird();

      case "timeline":
        return renderTimeline();

      case "info-card":
        return motionShell(
          <>
            <IconSlot
              props={props}
              accent={accentColor}
              sizeCss={metrics.iconSize}
            />
            <div className="min-w-0">
              <p
                className="font-bold text-white"
                style={{ fontSize: metrics.fontSizeTitle }}
              >
                {String(props.title || "Info")}
              </p>
              <p
                className="text-zinc-300 leading-snug line-clamp-3"
                style={{ fontSize: metrics.fontSizeDesc }}
              >
                {String(props.description || "Descrição")}
              </p>
            </div>
          </>,
          position,
          {
            display: "flex",
            alignItems: "flex-start",
            ...infoCardVariantStyle(variant, accentColor, theme),
            padding: metrics.cardPadding,
            gap: metrics.cardGap,
            maxWidth: metrics.maxWidth,
          }
        );

      case "source-card":
        return motionShell(
          <>
            <p
              style={{ fontSize: metrics.fontSizeDesc }}
              className="uppercase tracking-wider text-zinc-500"
            >
              Fonte
            </p>
            <p
              className="font-semibold text-white truncate"
              style={{ fontSize: metrics.fontSizeTitle }}
            >
              {String(props.source || "Referência")}
            </p>
            {props.detail && (
              <p
                className="text-zinc-400 truncate"
                style={{ fontSize: metrics.fontSizeSubtitle }}
              >
                {String(props.detail)}
              </p>
            )}
          </>,
          position,
          {
            maxWidth: metrics.maxWidth,
            borderLeft: `3px solid ${accentColor}`,
            background: themePanelBg(theme, accentColor),
            padding: metrics.cardPadding,
          }
        );

      case "social-post": {
        const platform = String(props.platform || "reddit");
        const platformColor = platform === "x" ? "#1DA1F2" : "#FF4500";
        return motionShell(
          <>
            <p
              className="font-bold"
              style={{
                fontSize: metrics.fontSizeSubtitle,
                color: platformColor,
              }}
            >
              {platform === "x" ? "𝕏" : "reddit"} · @
              {String(props.username || "usuario")}
            </p>
            <p
              className="text-zinc-200 line-clamp-2"
              style={{ fontSize: metrics.fontSizeTitle }}
            >
              {String(props.text || "Texto")}
            </p>
          </>,
          position,
          {
            maxWidth: metrics.maxWidth,
            background: "rgba(10,10,14,0.92)",
            border: `1px solid ${platformColor}55`,
            padding: metrics.cardPadding,
            borderRadius: metrics.cardGap,
          }
        );
      }

      case "geo-map":
        return motionShell(
          <>
            <div
              className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/40 flex items-center justify-center"
              style={{ height: metrics.fontSizeCounter }}
            >
              🗺️
            </div>
            <div style={{ padding: metrics.cardPadding }}>
              <p
                className="font-bold text-white"
                style={{ fontSize: metrics.fontSizeTitle }}
              >
                {String(props.location || "Local")}
              </p>
            </div>
          </>,
          position,
          {
            maxWidth: metrics.maxWidth,
            background: "rgba(8,14,22,0.9)",
            border: `1px solid ${accentColor}44`,
            borderRadius: metrics.cardGap,
            overflow: "hidden",
          }
        );

      case "location-intro": {
        const isPip = false;
        const lat = Number(props.lat) || 0;
        const lng = Number(props.lng) || 0;
        const mapProvider = String(props.map_provider || "");
        const flyoverSrc = String(props.flyover_video || "").trim();
        const useBlenderMap =
          Boolean(flyoverSrc) &&
          (mapProvider === "blender" ||
            mapProvider === "" ||
            /flyover\.mp4/i.test(flyoverSrc));
        const useCesiumMap = mapProvider === "cesium" && lat && lng;
        const hasTiles = Boolean(
          useBlenderMap ||
          useCesiumMap ||
          String(props.backgroundImage || "").trim() ||
          String(props.backgroundImageWide || "").trim() ||
          (Array.isArray(props.zoom_keyframes) &&
            props.zoom_keyframes.some((k: { image?: string }) =>
              Boolean(String(k?.image || "").trim())
            ))
        );
        if (embedded && hasTiles) {
          return (
            <LocationIntroMapCard
              props={props}
              accentColor={accentColor}
              isPip={isPip}
              embedded={embedded}
              embeddedLayout="fill"
              scrubSeconds={scrubSeconds}
              durationSeconds={durationSeconds}
              timelinePlaying={Boolean(timelinePlaying)}
              metrics={metrics}
              motion={motion}
              legibilityShadow={legibilityShadow}
              isShort={isShort}
            />
          );
        }
        if (embedded) {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0d2137] via-[#1a5f7a] to-[#2d5a27] px-4 text-center">
              <p
                className="font-black text-white"
                style={{ fontSize: metrics.fontSizeTitle }}
              >
                {String(props.location || "Local")}
              </p>
              <p
                className="text-zinc-300 uppercase mt-1"
                style={{ fontSize: metrics.fontSizeSubtitle }}
              >
                {String(props.country || props.region || "")}
              </p>
              <p className="text-amber-300/90 text-[10px] mt-3 font-semibold">
                Mapa satélite pendente — baixando em segundo plano…
              </p>
            </div>
          );
        }
        return motionShell(
          <>
            <div
              className="rounded-md mb-1"
              style={{
                height: Number(metrics.fontSizeCounter) * 1.4,
                background:
                  "linear-gradient(135deg, #2d5a27, #1a5f7a 55%, #4a4f55)",
              }}
            />
            <p
              className="font-black text-white"
              style={{ fontSize: metrics.fontSizeTitle }}
            >
              {String(props.location || "Bangkok")}
            </p>
            <p
              className="text-zinc-400 uppercase"
              style={{ fontSize: metrics.fontSizeSubtitle }}
            >
              {String(props.country || props.region || "Tailândia")}
            </p>
          </>,
          "center",
          {
            maxWidth: Number(metrics.maxWidth) * 1.2,
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${accentColor}33`,
            borderRadius: metrics.cardGap,
            padding: metrics.cardPadding,
            textAlign: "center" as const,
          }
        );
      }

      case "pictogram-chart":
        return motionShell(
          <>
            <p
              className="font-bold text-zinc-900 leading-tight"
              style={{ fontSize: metrics.fontSizeSubtitle }}
            >
              {String(props.title || "Título do infográfico")}
            </p>
            <div className="flex flex-wrap gap-0.5 mt-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background:
                      i < 2 ? "#E91E8C" : i < 5 ? "#1565C0" : "#90A4AE",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
          </>,
          "center",
          {
            maxWidth: Number(metrics.maxWidth) * 1.1,
            background: "#F4F4F2",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: metrics.cardGap,
            padding: metrics.cardPadding,
          }
        );

      case "counter":
        return motionShell(
          <>
            <p
              className="font-black leading-none"
              style={{ fontSize: metrics.fontSizeCounter, color: accentColor }}
            >
              {counterDisplayValue()}
              {props.suffix ? String(props.suffix) : ""}
            </p>
            <p
              className="text-zinc-300 uppercase"
              style={{ fontSize: metrics.fontSizeSubtitle }}
            >
              {String(props.label || "Métrica")}
            </p>
          </>,
          position,
          { textAlign: "center" as const }
        );

      case "kinetic-text":
        return motionShell(
          <span className="font-black uppercase text-center max-w-full block">
            {String(props.text || "TEXTO")}
          </span>,
          position,
          {
            fontSize: metrics.fontSizeKinetic,
            paddingLeft: metrics.positionPad.left,
            paddingRight: metrics.positionPad.right,
            ...kineticStyleProps(String(props.style || "slam"), accentColor),
          }
        );

      case "bar-chart": {
        const chartTheme = String(props.theme || "classic");
        const shell = barChartPreviewShell(chartTheme, accentColor);
        const items = normalizeBarChartItems(props.items, accentColor);
        const maxValue = Math.max(
          ...items.map((it) => Number(it.value) || 0),
          1
        );
        return motionShell(
          <>
            <div className="flex items-center gap-1 mb-1.5">
              <div style={shell.accentStripe} />
              <p
                style={{
                  ...shell.title,
                  fontSize: metrics.fontSizeSubtitle,
                  margin: 0,
                }}
              >
                {String(props.title || "COMPARAÇÃO")}
              </p>
            </div>
            <div className="space-y-1">
              {items.map((item, index) => {
                const barColor =
                  item.color || (index === 0 ? accentColor : "#4ECDC4");
                const targetPct = Math.max(
                  8,
                  ((Number(item.value) || 0) / maxValue) * 100
                );
                const barDelay = 10 + index * 6;
                const reveal = interpolateClamped(
                  motion.frame,
                  [barDelay, barDelay + 16],
                  [0, 1]
                );
                const widthPct = targetPct * reveal;
                return (
                  <div key={`${item.label}-${index}`}>
                    <div className="flex justify-between items-baseline gap-1 mb-0.5">
                      <span
                        style={{
                          ...shell.label,
                          fontSize: metrics.fontSizeDesc,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          color: barColor,
                          fontSize: metrics.fontSizeDesc,
                          fontWeight: 700,
                        }}
                      >
                        {item.displayValue || item.value}
                      </span>
                    </div>
                    <div style={shell.track}>
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                          borderRadius: "inherit",
                          boxShadow:
                            chartTheme === "neon"
                              ? `0 0 0.35em ${barColor}`
                              : undefined,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>,
          position,
          { maxWidth: metrics.maxWidth, ...shell.container }
        );
      }

      case "listicle-stinger":
        return renderListicleStingerPreview(previewCtx);

      case "chapter-stinger":
        return renderChapterStingerPreview(previewCtx);

      case "listicle-recap":
        return renderListicleRecapPreview(previewCtx);

      case "rank-progress":
        return renderRankProgressPreview(previewCtx);

      default:
        return motionShell(
          <span>{OVERLAY_TYPE_LABELS[overlay.type] || overlay.type}</span>,
          "bottom-left",
          {
            background: "rgba(0,0,0,0.75)",
            fontSize: metrics.fontSizeTitle,
            color: "#fff",
            padding: metrics.cardPadding,
            borderRadius: metrics.cardGap,
          }
        );
    }
  };

  const posLabel =
    OVERLAY_POSITIONS[overlay.type]?.find((p) => p.id === position)?.label ||
    position;
  const metaParts = [
    sceneLabel,
    posLabel,
    iconKey
      ? `${iconStyle === "svg" ? "SVG" : "Lottie"} · ${iconLabel(iconKey, iconStyle)}`
      : null,
  ].filter(Boolean);

  if (embedded) {
    const pipCard = embeddedLayout === "pip";
    return (
      <div
        className={`tss-embedded-overlay ${
          pipCard ? "tss-pip-card relative shrink-0" : "w-full h-full"
        } ${className}`.trim()}
        style={
          pipCard
            ? {
                width: isShort ? "88%" : "44%",
                maxWidth: isShort ? 280 : 340,
                aspectRatio: isShort ? "3 / 1" : "16 / 10",
                border: `2px solid ${accentColor}44`,
                borderRadius: 16,
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }
            : undefined
        }
      >
        <div
          className="overlay-preview-frame relative overflow-hidden w-full h-full"
          style={
            pipCard || embeddedLayout === "fill"
              ? undefined
              : { aspectRatio: isShort ? "9 / 16" : "16 / 9" }
          }
        >
          <div className="absolute inset-0 z-10 pointer-events-none w-full h-full">
            {renderOverlayContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-1.5 min-w-0 ${overlayPreviewFrameClass(format)} ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider min-w-0 truncate">
          Preview em escala real · {previewMetaLabel}
        </p>
        {timelinePlaying == null ? (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="dash-btn-ghost text-[8px] px-2 py-0.5 flex items-center gap-1 shrink-0"
            title="Reproduz animação de entrada e saída"
          >
            {playing ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {playing ? "Pausar" : "Animar"}
          </button>
        ) : null}
      </div>
      <div
        className="overlay-preview-frame relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950 w-full"
        style={{ aspectRatio: isShort ? "9 / 16" : "16 / 9" }}
      >
        <div
          className="absolute inset-0 z-0 opacity-90"
          style={{
            background: isShort
              ? "linear-gradient(160deg, #1a1a2e, #0f0f14 50%, #2d1f3d)"
              : "linear-gradient(180deg, #1c1917, #0c0a09 55%, #1e293b)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />
        {isShort && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none z-[1]"
            style={{ bottom: "22%" }}
          />
        )}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {renderOverlayContent()}
        </div>
        {onPositionSelect && (
          <div className="absolute inset-0 z-20 grid grid-cols-3 grid-rows-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {OVERLAY_POSITION_GRID.map((cell) => {
              const allowed = new Set(
                (OVERLAY_POSITIONS[overlay.type] || []).map((p) => p.id)
              );
              if (!allowed.has(cell.id)) return null;
              const isActive =
                position === cell.id ||
                (position === "right" && cell.id === "bottom-right");
              return (
                <button
                  key={cell.id}
                  type="button"
                  title={
                    OVERLAY_POSITIONS[overlay.type]?.find(
                      (p) => p.id === cell.id
                    )?.label || cell.id
                  }
                  onClick={() => onPositionSelect(cell.id)}
                  className={`border border-dashed transition ${
                    isActive
                      ? "border-violet-400/80 bg-violet-500/20"
                      : "border-white/10 bg-black/20 hover:border-violet-400/50 hover:bg-violet-500/10"
                  }`}
                  style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
                />
              );
            })}
          </div>
        )}
        <div className="absolute top-[0.6em] right-[0.6em] z-[1] text-[max(7px,1.1cqw)] font-bold uppercase tracking-widest text-zinc-500 bg-black/40 px-[0.5em] py-[0.25em] rounded pointer-events-none">
          {isShort ? "9:16" : "16:9"}
        </div>
        <div className="absolute bottom-[0.45em] left-[0.55em] right-[0.55em] z-[1] pointer-events-none">
          <div className="h-[2px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-400/80 transition-none"
              style={{
                width: `${(motion.frame / Math.max(1, motion.totalFrames - 1)) * 100}%`,
              }}
            />
          </div>
          <p className="text-[max(6px,0.95cqw)] text-zinc-500 mt-0.5 uppercase tracking-wider">
            Entrada · saída · {durationSeconds.toFixed(1)}s
          </p>
        </div>
      </div>
      {metaParts.length > 0 && (
        <p
          className="text-[8px] text-zinc-500 truncate leading-tight"
          title={metaParts.join(" · ")}
        >
          {sceneLabel && (
            <span className="text-[var(--dash-primary-light)] font-semibold">
              {sceneLabel}
            </span>
          )}
          {sceneLabel && metaParts.length > 1 && (
            <span className="text-zinc-600"> · </span>
          )}
          {metaParts.filter((p) => p !== sceneLabel).join(" · ")}
        </p>
      )}
      {compact && sceneNarration && (
        <p
          className="text-[8px] text-zinc-600 line-clamp-2 leading-snug"
          title={sceneNarration}
        >
          {sceneNarration}
        </p>
      )}
      {!compact && (
        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2 py-1.5">
          <p className="text-[9px] font-semibold text-zinc-200 truncate">
            {overlaySummary(overlay)}
          </p>
          {sceneNarration && (
            <p className="text-[8px] text-[var(--dash-muted)] line-clamp-2 mt-0.5">
              {sceneNarration}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
