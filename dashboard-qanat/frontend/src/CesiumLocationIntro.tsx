if (typeof window !== "undefined") {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL ||
    "/cesium/";
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveEarthDescentCamera } from "@lumiera/shared/cesiumFly.js";
import { buildEsriExportUrl } from "@lumiera/shared/satellitePreviewUrls.js";

type CesiumModule = typeof import("cesium");

type BoundaryGeo = {
  type?: string;
  coordinates?: unknown;
};

const ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function ringToDegreesArray(ring: number[][]): number[] {
  const flat: number[] = [];
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    flat.push(Number(pt[0]), Number(pt[1]));
  }
  return flat;
}

function boundaryRings(geo: BoundaryGeo | null): number[][][] {
  if (!geo?.coordinates) return [];
  if (geo.type === "Polygon") {
    const ring = (geo.coordinates as number[][][])?.[0];
    return Array.isArray(ring) && ring.length >= 3 ? [ring] : [];
  }
  if (geo.type === "MultiPolygon") {
    return ((geo.coordinates as number[][][][]) || [])
      .map((poly) => poly?.[0])
      .filter((ring) => Array.isArray(ring) && ring.length >= 3);
  }
  return [];
}

function waitForContainerSize(
  el: HTMLElement,
  timeoutMs = 8000
): Promise<void> {
  const hasSize = () => {
    const rect = el.getBoundingClientRect();
    return rect.width >= 32 && rect.height >= 32;
  };
  if (hasSize()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      ro.disconnect();
      if (hasSize()) resolve();
      else reject(new Error("cesium_container_zero_size"));
    }, timeoutMs);

    const ro = new ResizeObserver(() => {
      if (hasSize()) {
        window.clearTimeout(timer);
        ro.disconnect();
        resolve();
      }
    });
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
  });
}

function destroyViewer(
  viewer: InstanceType<CesiumModule["Viewer"]> | null,
  container: HTMLDivElement | null
) {
  if (viewer && !viewer.isDestroyed()) viewer.destroy();
  if (container) container.replaceChildren();
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function previewZoomFromProgress(
  lat: number,
  lng: number,
  zoom_from: number,
  zoom_to: number,
  zoom_keyframes: Array<{ zoom?: number; image?: string }>,
  progress: number,
  fly_mode: string
) {
  const cam = resolveEarthDescentCamera({
    lat,
    lng,
    zoom_from,
    zoom_to,
    fly_mode,
    progress,
    zoom_keyframes:
      zoom_keyframes.length >= 2
        ? zoom_keyframes
        : [
            { zoom: zoom_from, image: "" },
            { zoom: zoom_to, image: "" },
          ],
  });
  const h = cam.height;
  if (h > 5_000_000) return 3;
  if (h > 1_000_000) return 5;
  if (h > 200_000) return 8;
  if (h > 50_000) return 11;
  if (h > 10_000) return 14;
  return zoom_to;
}

export function CesiumLocationIntro({
  lat,
  lng,
  zoom_from = 3,
  zoom_to = 12,
  fly_mode = "earth_descent",
  zoom_keyframes = [],
  boundaryGeoJson = "",
  accentColor = "#C5A889",
  place_type = "city",
  progress = 0,
  className = "",
  ionAccessToken = "",
  googleMapsApiKey = "",
  /** Timeline embutida: tile estático — evita WebGL contínuo no editor. */
  staticOnly = false,
}: {
  lat: number;
  lng: number;
  zoom_from?: number;
  zoom_to?: number;
  fly_mode?: string;
  zoom_keyframes?: Array<{ zoom?: number; image?: string }>;
  boundaryGeoJson?: string;
  accentColor?: string;
  place_type?: string;
  progress?: number;
  className?: string;
  ionAccessToken?: string;
  googleMapsApiKey?: string;
  staticOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<CesiumModule["Viewer"]> | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const boundaryAddedRef = useRef(false);
  const extrasGenRef = useRef(0);
  const initGenRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState("");
  const [boundaryData, setBoundaryData] = useState<BoundaryGeo | null>(null);

  const fallbackTile = zoom_keyframes
    .map((k) => String(k?.image || "").trim())
    .find(Boolean);

  const staticPreviewUrl =
    lat && lng
      ? buildEsriExportUrl(
          lat,
          lng,
          previewZoomFromProgress(
            lat,
            lng,
            zoom_from,
            zoom_to,
            zoom_keyframes,
            progress,
            fly_mode
          ),
          640,
          400
        )
      : "";

  useEffect(() => {
    if (staticOnly) return;
    const path = String(boundaryGeoJson || "").trim();
    if (!path || place_type !== "city") {
      setBoundaryData(null);
      return;
    }
    let cancelled = false;
    fetch(path)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setBoundaryData(data);
      })
      .catch(() => {
        if (!cancelled) setBoundaryData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [boundaryGeoJson, place_type]);

  useEffect(() => {
    const initGen = ++initGenRef.current;
    let viewer: InstanceType<CesiumModule["Viewer"]> | null = null;

    (async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        await waitForContainerSize(container);
      } catch (err) {
        if (initGen === initGenRef.current) {
          setInitError(
            err instanceof Error ? err.message : "cesium_container_zero_size"
          );
        }
        return;
      }

      for (let attempt = 0; attempt < 3; attempt++) {
        if (initGen !== initGenRef.current || !containerRef.current) return;
        if (attempt > 0) await sleep(250 * attempt);

        try {
          containerRef.current.replaceChildren();
          const Cesium = await import("cesium");
          await import("cesium/Build/Cesium/Widgets/widgets.css");
          if (initGen !== initGenRef.current || !containerRef.current) return;

          cesiumRef.current = Cesium;

          viewer = new Cesium.Viewer(containerRef.current, {
            animation: false,
            timeline: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            vrButton: false,
            infoBox: false,
            selectionIndicator: false,
            creditContainer: document.createElement("div"),
            useDefaultRenderLoop: false,
            requestRenderMode: true,
            showRenderLoopErrors: false,
            contextOptions: {
              webgl: {
                failIfMajorPerformanceCaveat: false,
                powerPreference: "high-performance",
              },
            },
          });

          if (initGen !== initGenRef.current) {
            destroyViewer(viewer, containerRef.current);
            return;
          }

          viewerRef.current = viewer;

          try {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.addImageryProvider(
              new Cesium.UrlTemplateImageryProvider({
                url: ESRI_TILE_URL,
                maximumLevel: 19,
              })
            );
          } catch {
            /* mantém camada padrão do Viewer */
          }

          setInitError("");
          setReady(true);
          return;
        } catch (err) {
          destroyViewer(viewer, containerRef.current);
          viewer = null;
          viewerRef.current = null;
          cesiumRef.current = null;
          if (attempt === 2 && initGen === initGenRef.current) {
            setReady(false);
            setInitError(
              err instanceof Error ? err.message : "cesium_init_failed"
            );
          }
        }
      }
    })();

    return () => {
      initGenRef.current += 1;
      boundaryAddedRef.current = false;
      destroyViewer(viewer, containerRef.current);
      viewerRef.current = null;
      cesiumRef.current = null;
      setReady(false);
    };
  }, [staticOnly]);

  useEffect(() => {
    if (staticOnly) return;
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || viewer.isDestroyed()) return;

    const extrasGen = ++extrasGenRef.current;
    const ion = String(ionAccessToken || "").trim();
    const googleKey = String(googleMapsApiKey || "").trim();

    (async () => {
      try {
        if (ion) Cesium.Ion.defaultAccessToken = ion;

        if (googleKey && Cesium.createGooglePhotorealistic3DTileset) {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset({
            key: googleKey,
          });
          if (extrasGen !== extrasGenRef.current || viewer.isDestroyed()) {
            return;
          }
          viewer.scene.primitives.add(tileset);
          viewer.scene.requestRender();
        } else if (ion) {
          const terrain = await Cesium.createWorldTerrainAsync();
          if (extrasGen !== extrasGenRef.current || viewer.isDestroyed()) {
            return;
          }
          viewer.terrainProvider = terrain;
          viewer.scene.requestRender();
        }
      } catch {
        /* terrain / 3D tiles opcionais */
      }
    })();
  }, [ready, ionAccessToken, googleMapsApiKey, staticOnly]);

  useEffect(() => {
    if (staticOnly) return;
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || boundaryAddedRef.current) return;
    if (place_type !== "city" || !boundaryData) return;

    const rings = boundaryRings(boundaryData);
    const color = Cesium.Color.fromCssColorString(accentColor || "#C5A889");
    for (const ring of rings) {
      const positions = ringToDegreesArray(ring);
      if (positions.length < 6) continue;
      viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
          material: color.withAlpha(0.22),
          outline: true,
          outlineColor: color.withAlpha(0.95),
          outlineWidth: 2,
        },
      });
    }
    boundaryAddedRef.current = true;
    viewer.scene.requestRender();
  }, [ready, boundaryData, accentColor, place_type, staticOnly]);

  useLayoutEffect(() => {
    if (staticOnly) return;
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || !lat || !lng || viewer.isDestroyed()) {
      return;
    }

    const cam = resolveEarthDescentCamera({
      lat,
      lng,
      zoom_from,
      zoom_to,
      fly_mode,
      progress,
      zoom_keyframes,
    });

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, cam.height),
      orientation: {
        heading: cam.heading,
        pitch: cam.pitch,
        roll: cam.roll,
      },
    });
    viewer.resize();
    viewer.scene.requestRender();
  }, [
    ready,
    lat,
    lng,
    zoom_from,
    zoom_to,
    fly_mode,
    zoom_keyframes,
    progress,
    staticOnly,
  ]);

  const showStaticFallback = Boolean(
    initError && (fallbackTile || staticPreviewUrl)
  );

  if (staticOnly) {
    const tile = fallbackTile || staticPreviewUrl;
    return (
      <div
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#050506",
        }}
      >
        {tile ? (
          <img
            src={tile}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            decoding="async"
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, #1a2a1a 0%, #0a1628 50%, #1a1a2e 100%)",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#050506",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: showStaticFallback ? 0 : 1,
        }}
      />
      {showStaticFallback ? (
        fallbackTile ? (
          <img
            src={fallbackTile}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : staticPreviewUrl ? (
          <img
            src={staticPreviewUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, #1a2a1a 0%, #0a1628 50%, #1a1a2e 100%)",
            }}
          />
        )
      ) : null}
      {!ready && !showStaticFallback ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-500"
          style={{ pointerEvents: "none" }}
        >
          Carregando globo…
        </div>
      ) : null}
    </div>
  );
}
