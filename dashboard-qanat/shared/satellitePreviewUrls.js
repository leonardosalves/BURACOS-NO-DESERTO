/** URLs de preview satélite (Esri) — usado no dashboard quando WebGL/Cesium falha. */

export function bboxFromCenter(lat, lng, zoom, widthPx = 1280, heightPx = 720) {
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

export function buildEsriExportUrl(lat, lng, zoom, width = 1280, height = 720) {
  const { minLng, minLat, maxLng, maxLat } = bboxFromCenter(
    lat,
    lng,
    zoom,
    width,
    height
  );
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=jpg&f=image`
  );
}
