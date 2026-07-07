/**
 * Tiles de satélite para location-intro — geocoding + download local.
 * Mapbox Static (se token) ou Esri World Imagery (fallback gratuito).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const NOMINATIM_UA = "LumieraVideoStudio/1.0 (motion-scenes-satellite)";

/** POI específico → descida estilo Google Earth; cidade → contorno administrativo. */
const POI_KEYWORDS =
  /\b(forte|fortaleza|castelo|ponte|monumento|edif[ií]cio|torre|templo|pir[aâ]mide|est[aá]tua|museu|pal[aá]cio|bas[ií]lica|catedral|memorial|ru[ií]na|aqueduto|viaduto|est[aá]dio|arena|obelisco|farol|porto|aeroporto)\b/i;
const CITY_KEYWORDS =
  /\b(cidade|munic[ií]pio|capital|regi[aã]o|estado|prov[ií]ncia|pa[ií]s|continente|metr[oó]pole|distrito|comuna|vilarejo|vila)\b/i;

export const EARTH_DESCENT_ZOOMS = [3, 5, 8, 11, 14, 17];
/** Cidade: mesma descida do espaço, para em zoom regional + contorno OSM. */
export const CITY_DESCENT_ZOOMS = [3, 5, 8, 9, 11, 12];
/** @deprecated legado — novos projetos usam earth_descent + place_type city */
export const CITY_OUTLINE_ZOOMS = [9, 12];

/** Coordenadas conhecidas — evita geocoding em projetos de engenharia/mapa. */
export const KNOWN_COORDINATES = [
  {
    pattern: /palmanova|forte estelar|fortaleza estelar/i,
    location: "Palmanova",
    region: "Vêneto",
    country: "Itália",
    lat: 45.9054,
    lng: 13.3103,
  },
  {
    pattern: /bourtange/i,
    location: "Fort Bourtange",
    region: "Groningen",
    country: "Países Baixos",
    lat: 53.0066,
    lng: 7.145,
  },
  {
    pattern: /amaz[oô]nia/i,
    location: "Amazônia",
    region: "Norte",
    country: "Brasil",
    lat: -3.4653,
    lng: -62.2159,
  },
  {
    pattern: /brasil/i,
    location: "Brasil",
    region: "",
    country: "Brasil",
    lat: -14.235,
    lng: -51.9253,
  },
  {
    pattern: /egito|pir[aâ]mide|giz[eé]/i,
    location: "Egito",
    region: "",
    country: "Egito",
    lat: 29.9773,
    lng: 31.1325,
  },
  {
    pattern: /roma|romanos?/i,
    location: "Roma",
    region: "Lácio",
    country: "Itália",
    lat: 41.9028,
    lng: 12.4964,
  },
];

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

export function classifyPlaceType(text = "", place = {}) {
  const t = String(text || "");
  const loc = String(place.location || place.label || "").toLowerCase();

  if (
    POI_KEYWORDS.test(t) ||
    /\b(fort|castel|ponte|torre|pirâmide|piramide)\b/i.test(loc)
  ) {
    return { place_type: "poi", fly_mode: "earth_descent" };
  }
  if (CITY_KEYWORDS.test(t)) {
    return { place_type: "city", fly_mode: "earth_descent" };
  }
  if (/\b(fort|castel|bridge|tower)\b/i.test(loc)) {
    return { place_type: "poi", fly_mode: "earth_descent" };
  }
  return { place_type: "city", fly_mode: "earth_descent" };
}

export function buildZoomSequence(flyMode, zoomFrom, zoomTo, placeType) {
  if (flyMode === "earth_descent") {
    if (placeType === "city") return [...CITY_DESCENT_ZOOMS];
    return [...EARTH_DESCENT_ZOOMS];
  }
  if (flyMode === "city_outline") {
    return [...CITY_OUTLINE_ZOOMS];
  }
  return [Number(zoomFrom) || 8, Number(zoomTo) || 14];
}

function simplifyRing(ring, maxPoints = 120) {
  if (!Array.isArray(ring) || ring.length < 3) return [];
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  if (out[0] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
  return out;
}

function extractBoundaryRings(geojson) {
  if (!geojson?.type) return [];
  if (geojson.type === "Polygon") {
    const ring = simplifyRing(geojson.coordinates?.[0]);
    return ring.length >= 3 ? [ring] : [];
  }
  if (geojson.type === "MultiPolygon") {
    return (geojson.coordinates || [])
      .map((poly) => simplifyRing(poly?.[0]))
      .filter((ring) => ring.length >= 3);
  }
  return [];
}

export async function fetchPlaceBoundary(query = "", { lat, lng } = {}) {
  const q = String(query || "").trim();
  if (!q || q.length < 2) return null;

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
    `&polygon_geojson=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  const rings = extractBoundaryRings(hit?.geojson);
  if (!rings.length) return null;

  return {
    type: rings.length === 1 ? "Polygon" : "MultiPolygon",
    coordinates: rings.length === 1 ? [rings[0]] : rings.map((ring) => [ring]),
    center: {
      lat: Number(hit?.lat) || lat,
      lng: Number(hit?.lon) || lng,
    },
    label: String(hit?.display_name || q).split(",")[0],
    source: "nominatim",
  };
}

export function resolveKnownCoordinates(text = "", place = {}) {
  const t = String(text || "");
  for (const entry of KNOWN_COORDINATES) {
    if (entry.pattern.test(t)) {
      return {
        lat: entry.lat,
        lng: entry.lng,
        label: entry.location,
        source: "known",
      };
    }
  }
  const name = String(place.location || place.label || "").trim();
  for (const entry of KNOWN_COORDINATES) {
    if (entry.location.toLowerCase() === name.toLowerCase()) {
      return {
        lat: entry.lat,
        lng: entry.lng,
        label: entry.location,
        source: "known",
      };
    }
  }
  return null;
}

export async function geocodeLocation(query = "") {
  const q = String(query || "").trim();
  if (!q || q.length < 2) return null;

  const known = resolveKnownCoordinates(q);
  if (known) return known;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  if (!hit?.lat || !hit?.lon) return null;
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: String(hit.display_name || q).split(",")[0],
    source: "nominatim",
  };
}

function resolveMapboxToken(config = {}, workspaceConfig = {}) {
  return (
    String(config.mapbox_access_token || "").trim() ||
    String(workspaceConfig.mapbox_access_token || "").trim() ||
    String(process.env.MAPBOX_ACCESS_TOKEN || "").trim() ||
    ""
  );
}

export function buildMapboxStaticUrl(lng, lat, zoom, token, size = "1280x720") {
  const z = Math.max(1, Math.min(20, Math.round(Number(zoom) || 10)));
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${z},0,0/${size}@2x?access_token=${encodeURIComponent(token)}`;
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

function isValidJpegBuffer(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 500 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  );
}

async function downloadImageToFile(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_UA },
  });
  if (!res.ok) {
    throw new Error(
      `Falha ao baixar tile (${res.status}): ${url.slice(0, 120)}`
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.slice(0, 32).toString("utf8").toLowerCase();
  if (head.includes("<html") || head.includes('"error"')) {
    throw new Error("Resposta do provedor de mapa não é imagem JPEG");
  }
  if (!isValidJpegBuffer(buf)) {
    throw new Error("Imagem de mapa inválida ou corrompida");
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return destPath;
}

function assetRelPath(fileName) {
  return `ASSETS/satellite/${fileName}`;
}

function buildTileUrl(token, lat, lng, zoom) {
  return token
    ? buildMapboxStaticUrl(lng, lat, zoom, token)
    : buildEsriExportUrl(lat, lng, zoom);
}

/**
 * Baixa tiles satélite (multi-zoom Earth fly ou contorno de cidade) e retorna paths.
 */
export async function fetchSatelliteAssetsForScene(
  projDir,
  scene,
  { config = {}, workspaceConfig = {} } = {}
) {
  const props = scene?.props || {};
  const zoomFrom = Number(props.zoom_from) || 8;
  const zoomTo = Number(props.zoom_to) || 14;
  const query = [props.location, props.region, props.country]
    .filter(Boolean)
    .join(", ");

  const classification =
    props.fly_mode && props.place_type
      ? { fly_mode: props.fly_mode, place_type: props.place_type }
      : classifyPlaceType(scene?.narration_text || "", props);

  const narration = String(scene?.narration_text || "");
  let coords = resolveKnownCoordinates(narration, props);
  const genericLocation = /^(local|local no mapa)$/i.test(
    String(props.location || "").trim()
  );
  if (!coords && (genericLocation || POI_KEYWORDS.test(narration))) {
    coords = resolveKnownCoordinates(
      `${narration} ${props.region || ""} ${props.country || ""}`.trim(),
      props
    );
  }
  if (!coords && genericLocation && POI_KEYWORDS.test(narration)) {
    coords = resolveKnownCoordinates("Palmanova fortaleza estelar", props);
  }
  if (!coords) {
    coords = await geocodeLocation(query);
  }
  if (!coords?.lat || !coords?.lng) {
    return { ok: false, reason: "geocode_failed", query };
  }

  const token = resolveMapboxToken(config, workspaceConfig);
  const sceneKey =
    String(scene.id || "scene")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40) || crypto.randomBytes(4).toString("hex");

  const zoomLevels = buildZoomSequence(
    classification.fly_mode,
    zoomFrom,
    zoomTo,
    classification.place_type
  );

  const zoomKeyframes = [];
  for (const zoom of zoomLevels) {
    const fileName = `${sceneKey}-z${zoom}.jpg`;
    const destPath = path.join(projDir, assetRelPath(fileName));
    const url = buildTileUrl(token, coords.lat, coords.lng, zoom);
    await downloadImageToFile(url, destPath);
    zoomKeyframes.push({
      zoom,
      image: assetRelPath(fileName),
    });
    if (zoomLevels.length > 2) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  const wideFrame = zoomKeyframes[0];
  const tightFrame = zoomKeyframes[zoomKeyframes.length - 1];

  let boundaryGeoJson = null;
  let boundaryPath = null;
  if (
    classification.place_type === "city" ||
    classification.fly_mode === "city_outline"
  ) {
    try {
      boundaryGeoJson = await fetchPlaceBoundary(query, {
        lat: coords.lat,
        lng: coords.lng,
      });
      if (boundaryGeoJson) {
        const boundaryName = `${sceneKey}-boundary.json`;
        boundaryPath = path.join(projDir, assetRelPath(boundaryName));
        fs.mkdirSync(path.dirname(boundaryPath), { recursive: true });
        fs.writeFileSync(
          boundaryPath,
          JSON.stringify(boundaryGeoJson, null, 2),
          "utf8"
        );
        await new Promise((r) => setTimeout(r, 1100));
      }
    } catch {
      /* boundary opcional */
    }
  }

  return {
    ok: true,
    lat: coords.lat,
    lng: coords.lng,
    geocode_source: coords.source,
    map_provider: token ? "mapbox" : "esri",
    place_type: classification.place_type,
    fly_mode: classification.fly_mode,
    zoom_keyframes: zoomKeyframes,
    boundaryGeoJson: boundaryPath
      ? assetRelPath(`${sceneKey}-boundary.json`)
      : "",
    backgroundImage: tightFrame?.image || "",
    backgroundImageWide: wideFrame?.image || "",
    zoom_from: wideFrame?.zoom ?? zoomFrom,
    zoom_to: tightFrame?.zoom ?? zoomTo,
    widePath: wideFrame ? path.join(projDir, wideFrame.image) : null,
    tightPath: tightFrame ? path.join(projDir, tightFrame.image) : null,
  };
}

export async function enrichMotionScenesWithSatellite(
  projDir,
  motionScenes = [],
  { config = {}, workspaceConfig = {}, maxScenes = 6 } = {}
) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const locationScenes = scenes
    .filter((s) => s.template_id === "location-intro")
    .slice(0, maxScenes);

  const results = [];
  let enriched = 0;

  for (const scene of locationScenes) {
    try {
      const fetched = await fetchSatelliteAssetsForScene(projDir, scene, {
        config,
        workspaceConfig,
      });
      if (!fetched.ok) {
        results.push({ id: scene.id, ok: false, reason: fetched.reason });
        continue;
      }
      scene.props = {
        ...(scene.props || {}),
        lat: fetched.lat,
        lng: fetched.lng,
        backgroundImage: fetched.backgroundImage,
        backgroundImageWide: fetched.backgroundImageWide,
        zoom_keyframes: fetched.zoom_keyframes,
        zoom_from: fetched.zoom_from,
        zoom_to: fetched.zoom_to,
        fly_mode: fetched.fly_mode,
        place_type: fetched.place_type,
        boundaryGeoJson: fetched.boundaryGeoJson || "",
        map_provider: fetched.map_provider,
        geocode_source: fetched.geocode_source,
      };
      enriched += 1;
      results.push({ id: scene.id, ok: true, ...fetched });
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      results.push({
        id: scene.id,
        ok: false,
        reason: err.message,
      });
    }
  }

  return { motion_scenes: scenes, enriched, results };
}
