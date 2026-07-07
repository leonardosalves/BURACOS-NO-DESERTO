/**
 * Câmera Cesium para descida estilo Google Earth / Earth Studio.
 * Altitudes aproximadas alinhadas aos zooms do pipeline location-intro.
 */

import {
  easeInOutCubic,
  resolveEarthDescentFrame,
  sortZoomKeyframes,
} from "./locationIntroFly.js";

/** Altitude (m) acima do elipsoide por nível de zoom web-maps. */
export const ZOOM_HEIGHT_METERS = {
  3: 12_000_000,
  4: 6_000_000,
  5: 3_000_000,
  6: 1_500_000,
  7: 750_000,
  8: 400_000,
  9: 200_000,
  10: 100_000,
  11: 50_000,
  12: 25_000,
  13: 12_000,
  14: 6_000,
  15: 3_000,
  17: 800,
};

export function zoomToHeightMeters(zoom) {
  const z = Math.round(Number(zoom) || 10);
  if (ZOOM_HEIGHT_METERS[z]) return ZOOM_HEIGHT_METERS[z];
  const clamped = Math.max(1, Math.min(20, Number(zoom) || 10));
  return 40_075_000 / 2 ** clamped;
}

export function interpolateZoomHeight(
  sortedKeyframes,
  progress,
  flyMode = "earth_descent"
) {
  const { activeIndex, blendT, sorted } = resolveEarthDescentFrame(
    sortedKeyframes,
    progress
  );
  if (!sorted.length) return zoomToHeightMeters(10);
  if (sorted.length === 1) return zoomToHeightMeters(sorted[0].zoom);
  const hA = zoomToHeightMeters(sorted[activeIndex].zoom);
  const hB = zoomToHeightMeters(sorted[activeIndex + 1].zoom);
  return hA + (hB - hA) * blendT;
}

/** Pitch em radianos: mais oblíquo no espaço, mais vertical perto do alvo. */
export function earthDescentPitchRadians(progress, flyMode = "earth_descent") {
  const t = easeInOutCubic(Math.min(1, Math.max(0, progress)));
  if (flyMode === "simple") return -Math.PI / 2;
  const startPitch = flyMode === "earth_descent" ? -1.05 : -0.95;
  const endPitch = -1.42;
  return startPitch + (endPitch - startPitch) * t;
}

/**
 * Resolve câmera Cesium para um instante da descida (progress 0..1).
 */
export function resolveEarthDescentCamera({
  lat,
  lng,
  zoom_from = 3,
  zoom_to = 12,
  fly_mode = "earth_descent",
  progress = 0,
  zoom_keyframes = [],
} = {}) {
  const sorted = sortZoomKeyframes(
    zoom_keyframes.length >= 2
      ? zoom_keyframes
      : [
          { zoom: zoom_from, image: "wide" },
          { zoom: zoom_to, image: "tight" },
        ]
  );

  const height = interpolateZoomHeight(sorted, progress, fly_mode);
  const pitch = earthDescentPitchRadians(progress, fly_mode);

  return {
    lat: Number(lat) || 0,
    lng: Number(lng) || 0,
    height,
    pitch,
    heading: 0,
    roll: 0,
  };
}

export function buildVirtualZoomKeyframes(zoomLevels = []) {
  return (zoomLevels || []).map((zoom) => ({
    zoom: Number(zoom),
    image: "",
  }));
}
