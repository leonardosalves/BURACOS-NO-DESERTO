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
  const [ready, setReady] = useState(false);

  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  useEffect(() => {
    const handle = delayRender("cesium-globe-init");
    let cancelled = false;
    let viewer: InstanceType<CesiumModule["Viewer"]> | null = null;

    (async () => {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        if (cancelled || !containerRef.current) return;

        cesiumRef.current = Cesium;
        if (ionAccessToken) {
          Cesium.Ion.defaultAccessToken = ionAccessToken;
        }

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
        });
        viewerRef.current = viewer;

        viewer.imageryLayers.removeAll();
        const imagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        );
        viewer.imageryLayers.addImageryProvider(imagery);

        if (googleMapsApiKey && Cesium.createGooglePhotorealistic3DTileset) {
          try {
            const tileset = await Cesium.createGooglePhotorealistic3DTileset({
              key: googleMapsApiKey,
            });
            viewer.scene.primitives.add(tileset);
          } catch {
            /* 3D Tiles Google opcional */
          }
        } else if (ionAccessToken) {
          try {
            const terrain = await Cesium.createWorldTerrainAsync();
            viewer.terrainProvider = terrain;
          } catch {
            /* terrain opcional */
          }
        }

        if (!cancelled) setReady(true);
      } finally {
        continueRender(handle);
      }
    })();

    return () => {
      cancelled = true;
      boundaryAddedRef.current = false;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
    };
  }, [ionAccessToken, googleMapsApiKey]);

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
