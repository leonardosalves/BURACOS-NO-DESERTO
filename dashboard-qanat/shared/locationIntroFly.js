/**
 * Interpolação compartilhada da descida satélite (preview + Remotion).
 */

export function easeInOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function sortZoomKeyframes(keyframes = []) {
  return [...keyframes]
    .filter((k) => k?.image)
    .sort((a, b) => Number(a.zoom) - Number(b.zoom));
}

/** progress 0..1 ao longo da duração total da cena */
export function resolveEarthDescentFrame(sorted, progress) {
  const eased = easeInOutCubic(progress);
  if (!sorted.length) {
    return { activeIndex: 0, blendT: 0, easedProgress: eased, sorted: [] };
  }
  if (sorted.length === 1) {
    return { activeIndex: 0, blendT: 0, easedProgress: eased, sorted };
  }
  const n = sorted.length - 1;
  const pos = eased * n;
  const activeIndex = Math.min(n - 1, Math.max(0, Math.floor(pos)));
  const blendT = pos - activeIndex;
  return { activeIndex, blendT, easedProgress: eased, sorted };
}

export function zoomToFlyScale(zoom, flyMode = "earth_descent") {
  const z = Number(zoom) || 10;
  return flyMode === "earth_descent" ? 1 + z / 30 : 1 + z / 34;
}

export function interpolateFlyScale(
  sorted,
  progress,
  flyMode = "earth_descent"
) {
  const {
    activeIndex,
    blendT,
    sorted: frames,
  } = resolveEarthDescentFrame(sorted, progress);
  if (frames.length < 2) return zoomToFlyScale(frames[0]?.zoom, flyMode);
  const a = zoomToFlyScale(frames[activeIndex].zoom, flyMode);
  const b = zoomToFlyScale(frames[activeIndex + 1].zoom, flyMode);
  return a + (b - a) * blendT;
}

export function boundaryLatLngExtents(geo) {
  if (!geo?.coordinates) return null;
  const rings = [];
  if (geo.type === "Polygon") {
    const ring = geo.coordinates?.[0];
    if (Array.isArray(ring) && ring.length >= 3) rings.push(ring);
  } else if (geo.type === "MultiPolygon") {
    for (const poly of geo.coordinates || []) {
      const ring = poly?.[0];
      if (Array.isArray(ring) && ring.length >= 3) rings.push(ring);
    }
  }
  if (!rings.length) return null;

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const ring of rings) {
    for (const pt of ring) {
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  if (minLat > maxLat || minLng > maxLng) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/** Zoom onde o contorno administrativo cabe inteiro no frame (mais afastado). */
export function fitZoomForBoundary(
  geo,
  lat,
  lng,
  widthPx = 1280,
  heightPx = 720,
  padding = 1.5
) {
  const ext = boundaryLatLngExtents(geo);
  if (!ext) return 10;
  const centerLat = Number(lat) || 0;
  const centerLng = Number(lng) || 0;
  const latSpan = Math.max(0.0001, ext.maxLat - ext.minLat);
  const lngSpan = Math.max(0.0001, ext.maxLng - ext.minLng);

  for (let z = 11; z >= 3; z--) {
    const bbox = bboxFromCenter(centerLat, centerLng, z, widthPx, heightPx);
    const bboxLat = bbox.maxLat - bbox.minLat;
    const bboxLng = bbox.maxLng - bbox.minLng;
    if (latSpan * padding <= bboxLat && lngSpan * padding <= bboxLng) {
      return z;
    }
  }
  return 9;
}

export function bboxFromCenter(lat, lng, zoom, widthPx = 1280, heightPx = 720) {
  const z = Math.max(1, Math.min(18, Number(zoom) || 10));
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
  const widthM = metersPerPixel * widthPx;
  const heightM = metersPerPixel * heightPx;
  const latDelta = heightM / 2 / 111320;
  const lngDelta = widthM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLng: lng - lngDelta,
    minLat: lat - latDelta,
    maxLng: lng + lngDelta,
    maxLat: lat + latDelta,
  };
}
