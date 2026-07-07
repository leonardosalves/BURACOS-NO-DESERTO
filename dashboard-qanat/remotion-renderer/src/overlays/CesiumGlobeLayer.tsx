import "../cesiumBootstrap";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { resolveEarthDescentCamera } from "@lumiera/shared/cesiumFly.js";
import type { BoundaryGeoJson } from "./locationIntroGeo";

type CesiumModule = typeof import("cesium");

export interface CesiumGlobeLayerProps {
  lat: number;
  lng: number;
  zoom_from?: number;
  zoom_to?: number;
  fly_mode?: string;
  zoom_keyframes?: Array<{ zoom?: number; image?: string }>;
  boundaryGeoJson?: BoundaryGeoJson | null;
  accentColor?: string;
  place_type?: string;
  ionAccessToken?: string;
  googleMapsApiKey?: string;
}

function ringToDegreesArray(ring: number[][]): number[] {
  const flat: number[] = [];
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    flat.push(Number(pt[0]), Number(pt[1]));
  }
  return flat;
}

function boundaryRings(geo: BoundaryGeoJson | null): number[][][] {
  if (!geo?.coordinates) return [];
  if (geo.type === "Polygon") {
    const ring = geo.coordinates?.[0];
    return Array.isArray(ring) && ring.length >= 3 ? [ring] : [];
  }
  if (geo.type === "MultiPolygon") {
    return (geo.coordinates || [])
      .map((poly) => poly?.[0])
      .filter((ring) => Array.isArray(ring) && ring.length >= 3);
  }
  return [];
}

export const CesiumGlobeLayer: React.FC<CesiumGlobeLayerProps> = ({
  lat,
  lng,
  zoom_from = 3,
  zoom_to = 12,
  fly_mode = "earth_descent",
  zoom_keyframes = [],
  boundaryGeoJson = null,
  accentColor = "#C5A889",
  place_type = "city",
  ionAccessToken = "",
  googleMapsApiKey = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<CesiumModule["Viewer"]> | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const boundaryAddedRef = useRef(false);
  const initGenRef = useRef(0);
  const [ready, setReady] = useState(false);

  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  useEffect(() => {
    const handle = delayRender("cesium-globe-init");
    let viewer: InstanceType<CesiumModule["Viewer"]> | null = null;
    const initGen = ++initGenRef.current;

    (async () => {
      try {
        const container = containerRef.current;
        if (!container) return;

        if (container.clientWidth === 0 || container.clientHeight === 0) {
          await new Promise<void>((resolve) => {
            const ro = new ResizeObserver(() => {
              if (container.clientWidth > 0 && container.clientHeight > 0) {
                ro.disconnect();
                resolve();
              }
            });
            ro.observe(container);
          });
        }

        container.replaceChildren();
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
          maximumRenderTimeChange: Infinity,
          showRenderLoopErrors: false,
          contextOptions: {
            webgl: {
              failIfMajorPerformanceCaveat: false,
            },
          },
        });
        viewerRef.current = viewer;

        viewer.imageryLayers.removeAll();
        const imagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        );
        viewer.imageryLayers.addImageryProvider(imagery);

        if (initGen === initGenRef.current) setReady(true);
      } finally {
        continueRender(handle);
      }
    })();

    return () => {
      initGenRef.current += 1;
      boundaryAddedRef.current = false;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      if (containerRef.current) containerRef.current.replaceChildren();
      viewerRef.current = null;
      cesiumRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || viewer.isDestroyed()) return;

    const ion = String(ionAccessToken || "").trim();
    const googleKey = String(googleMapsApiKey || "").trim();

    (async () => {
      try {
        if (ion) Cesium.Ion.defaultAccessToken = ion;

        if (googleKey && Cesium.createGooglePhotorealistic3DTileset) {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset({
            key: googleKey,
          });
          if (viewer.isDestroyed()) return;
          viewer.scene.primitives.add(tileset);
          viewer.scene.requestRender();
        } else if (ion) {
          const terrain = await Cesium.createWorldTerrainAsync();
          if (viewer.isDestroyed()) return;
          viewer.terrainProvider = terrain;
          viewer.scene.requestRender();
        }
      } catch {
        /* terrain / 3D tiles opcionais */
      }
    })();
  }, [ready, ionAccessToken, googleMapsApiKey]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || boundaryAddedRef.current) return;
    if (place_type !== "city" || !boundaryGeoJson) return;

    const rings = boundaryRings(boundaryGeoJson);
    if (!rings.length) return;

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
          height: 0,
        },
      });
    }
    boundaryAddedRef.current = true;
    viewer.scene.requestRender();
  }, [ready, boundaryGeoJson, accentColor, place_type]);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || !lat || !lng) return;

    const progress = frame / Math.max(durationInFrames - 1, 1);
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
    viewer.render();
  }, [
    frame,
    ready,
    lat,
    lng,
    zoom_from,
    zoom_to,
    fly_mode,
    zoom_keyframes,
    durationInFrames,
    width,
    height,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    />
  );
};
