if (typeof window !== "undefined") {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL ||
    "/cesium/";
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveEarthDescentCamera } from "@lumiera/shared/cesiumFly.js";

type CesiumModule = typeof import("cesium");

type BoundaryGeo = {
  type?: string;
  coordinates?: unknown;
};

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
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<CesiumModule["Viewer"]> | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const boundaryAddedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [boundaryData, setBoundaryData] = useState<BoundaryGeo | null>(null);

  useEffect(() => {
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
    let cancelled = false;
    let viewer: InstanceType<CesiumModule["Viewer"]> | null = null;

    (async () => {
      const Cesium = await import("cesium");
      await import("cesium/Build/Cesium/Widgets/widgets.css");
      if (cancelled || !containerRef.current) return;

      cesiumRef.current = Cesium;
      if (ionAccessToken) Cesium.Ion.defaultAccessToken = ionAccessToken;

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
          /* opcional */
        }
      } else if (ionAccessToken) {
        try {
          viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
        } catch {
          /* opcional */
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      boundaryAddedRef.current = false;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      cesiumRef.current = null;
      setReady(false);
    };
  }, [ionAccessToken, googleMapsApiKey]);

  useEffect(() => {
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
  }, [ready, boundaryData, accentColor, place_type]);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || !lat || !lng) return;

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
  }, [ready, lat, lng, zoom_from, zoom_to, fly_mode, zoom_keyframes, progress]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
