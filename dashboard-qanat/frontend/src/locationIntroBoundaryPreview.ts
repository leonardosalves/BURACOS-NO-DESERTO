type BoundaryGeoJson = {
  type?: string;
  coordinates?: number[][][] | number[][][][];
};

function bboxFromCenter(
  lat: number,
  lng: number,
  zoom: number,
  widthPx = 1280,
  heightPx = 720
) {
  const z = Math.max(1, Math.min(18, Number(zoom) || 10));
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z);
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

function ringsFromGeoJson(geo: BoundaryGeoJson | null): number[][][] {
  if (!geo?.coordinates) return [];
  if (geo.type === "Polygon") {
    const ring = geo.coordinates as number[][][];
    return ring?.[0]?.length ? [ring[0]] : [];
  }
  if (geo.type === "MultiPolygon") {
    return (geo.coordinates as number[][][][])
      .map((poly) => poly?.[0])
      .filter(
        (ring): ring is number[][] => Array.isArray(ring) && ring.length >= 3
      );
  }
  return [];
}

export function boundaryToViewBoxPaths(
  geo: BoundaryGeoJson | null,
  lat: number,
  lng: number,
  zoom: number,
  width = 100,
  height = 100
): string[] {
  const rings = ringsFromGeoJson(geo);
  if (!rings.length) return [];
  const bbox = bboxFromCenter(lat, lng, zoom, 1280, 720);
  return rings.map((ring) => {
    const pts = ring.map(([lngPt, latPt]) => {
      const x =
        ((lngPt - bbox.minLng) / Math.max(bbox.maxLng - bbox.minLng, 1e-9)) *
        width;
      const y =
        ((bbox.maxLat - latPt) / Math.max(bbox.maxLat - bbox.minLat, 1e-9)) *
        height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M ${pts.join(" L ")} Z`;
  });
}
