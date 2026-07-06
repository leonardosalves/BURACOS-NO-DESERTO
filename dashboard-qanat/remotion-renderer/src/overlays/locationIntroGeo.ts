export interface MapBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ZoomKeyframe {
  zoom: number;
  image: string;
}

export interface BoundaryGeoJson {
  type?: string;
  coordinates?: number[][][] | number[][][][];
  center?: { lat: number; lng: number };
}

export function bboxFromCenter(
  lat: number,
  lng: number,
  zoom: number,
  widthPx = 1280,
  heightPx = 720
): MapBbox {
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

function projectPoint(
  lng: number,
  lat: number,
  bbox: MapBbox,
  width: number,
  height: number
): { x: number; y: number } {
  const x =
    ((lng - bbox.minLng) / Math.max(bbox.maxLng - bbox.minLng, 1e-9)) * width;
  const y =
    ((bbox.maxLat - lat) / Math.max(bbox.maxLat - bbox.minLat, 1e-9)) * height;
  return { x, y };
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

export function boundaryToSvgPaths(
  geo: BoundaryGeoJson | null,
  lat: number,
  lng: number,
  zoom: number,
  width: number,
  height: number
): string[] {
  const rings = ringsFromGeoJson(geo);
  if (!rings.length) return [];
  const bbox = bboxFromCenter(lat, lng, zoom, width, height);
  return rings
    .map((ring) => {
      const pts = ring.map(([ringLng, ringLat]) =>
        projectPoint(ringLng, ringLat, bbox, width, height)
      );
      if (pts.length < 2) return "";
      return pts
        .map(
          (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
        )
        .join(" ")
        .concat(" Z");
    })
    .filter(Boolean);
}

export function estimatePathLength(pathD: string): number {
  const nums = pathD.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  let len = 0;
  for (let i = 2; i < nums.length; i += 2) {
    const dx = nums[i] - nums[i - 2];
    const dy = nums[i + 1] - nums[i - 1];
    len += Math.hypot(dx, dy);
  }
  return Math.max(len, 200);
}
