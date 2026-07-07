/**
 * Tiles de satélite para location-intro — geocoding + download local.
 * Mapbox Static (se token) ou Esri World Imagery (fallback gratuito).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fitZoomForBoundary } from "../shared/locationIntroFly.js";
import { buildVirtualZoomKeyframes } from "../shared/cesiumFly.js";
import { HISTORIC_DESTROYED_RE } from "../shared/motionSceneCatalog.js";
import {
  isBlenderAvailable,
  renderLocationIntroFlyover,
} from "./blenderMapService.js";

const NOMINATIM_UA = "LumieraVideoStudio/1.0 (motion-scenes-satellite)";

/** POI específico → descida estilo Google Earth; cidade → contorno administrativo. */
const POI_KEYWORDS =
  /\b(forte|fortaleza|castelo|ponte|monumento|edif[ií]cio|pr[eé]dio|torre|templo|pir[aâ]mide|est[aá]tua|museu|pal[aá]cio|bas[ií]lica|catedral|memorial|ru[ií]na|aqueduto|viaduto|est[aá]dio|arena|obelisco|farol|porto|aeroporto)\b/i;
const CITY_KEYWORDS =
  /\b(cidade|munic[ií]pio|capital|regi[aã]o|estado|prov[ií]ncia|pa[ií]s|continente|metr[oó]pole|distrito|comuna|vilarejo|vila)\b/i;

export const EARTH_DESCENT_ZOOMS = [3, 4, 6, 8, 10, 12, 14, 17];
/** Cidade: descida longa; frame final mais aberto para contorno OSM completo no PIP. */
export const CITY_DESCENT_ZOOMS = [3, 4, 6, 7, 8, 9, 10];
/** @deprecated legado — novos projetos usam earth_descent + place_type city */
export const CITY_OUTLINE_ZOOMS = [9, 12];

/**
 * Nomes em PT-BR (roteiro/narração) → consulta canônica para Nominatim/OSM.
 * Evita geocode_failed em cidades como Bangcoc/Banguecoque.
 */
export const LOCATION_GEOCODE_ALIASES = {
  bangcoc: "Bangkok, Thailand",
  bangoc: "Bangkok, Thailand",
  banguecoque: "Bangkok, Thailand",
  bancoc: "Bangkok, Thailand",
  "grande bangcoc": "Bangkok, Thailand",
  "bacia de argila de bangcoc": "Bangkok, Thailand",
  mianmar: "Myanmar",
  birmania: "Myanmar",
  "são paulo": "São Paulo, Brazil",
  "rio de janeiro": "Rio de Janeiro, Brazil",
  lisboa: "Lisbon, Portugal",
  londres: "London, United Kingdom",
  paris: "Paris, France",
  berlim: "Berlin, Germany",
  "nova york": "New York City, United States",
  "nova iorque": "New York City, United States",
  toquio: "Tokyo, Japan",
  tóquio: "Tokyo, Japan",
  pequim: "Beijing, China",
  "cidade do mexico": "Mexico City, Mexico",
  "cidade do méxico": "Mexico City, Mexico",
  "new york": "New York City, United States",
  laufenburg: "Laufenburg, Switzerland",
  "ponte de laufenburg": "Laufenburg bridge, Switzerland",
  "fronteira laufenburg": "Laufenburg, Switzerland",
};

const COUNTRY_PT_TO_EN = {
  alemanha: "Germany",
  suica: "Switzerland",
  suíça: "Switzerland",
  franca: "France",
  frança: "France",
  italia: "Italy",
  itália: "Italy",
  austria: "Austria",
  áustria: "Austria",
  holanda: "Netherlands",
  "paises baixos": "Netherlands",
  "países baixos": "Netherlands",
  espanha: "Spain",
  portugal: "Portugal",
  brasil: "Brazil",
  tailandia: "Thailand",
  tailândia: "Thailand",
  eua: "United States",
  "estados unidos": "United States",
};

/** Coordenadas conhecidas — evita geocoding em projetos de engenharia/mapa. */
export const KNOWN_COORDINATES = [
  {
    pattern: /bangcoc|bangoc|banguecoque|bangkok/i,
    location: "Bangkok",
    region: "Bangkok",
    country: "Tailândia",
    lat: 13.7563,
    lng: 100.5018,
  },
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
  {
    pattern: /laufenburg|hochrheinbr[uü]cke|ponte de laufenburg/i,
    location: "Laufenburg",
    region: "Fronteira Alemanha-Suíça",
    country: "Alemanha & Suíça",
    lat: 47.5519,
    lng: 8.0389,
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
  const isPoi =
    POI_KEYWORDS.test(t) ||
    /\b(fort|castel|ponte|torre|pirâmide|piramide)\b/i.test(loc) ||
    /\b(fort|castel|bridge|tower)\b/i.test(loc);

  if (HISTORIC_DESTROYED_RE.test(t) && isPoi) {
    return {
      place_type: "historic_site",
      fly_mode: "earth_descent",
      structure_exists: false,
    };
  }
  if (isPoi) {
    return {
      place_type: "poi",
      fly_mode: "earth_descent",
      structure_exists: true,
    };
  }
  if (CITY_KEYWORDS.test(t)) {
    return {
      place_type: "city",
      fly_mode: "earth_descent",
      structure_exists: true,
    };
  }
  return {
    place_type: "city",
    fly_mode: "earth_descent",
    structure_exists: true,
  };
}

export function resolveRenderDimensions(aspectRatio = "16:9") {
  const ar = String(aspectRatio || "16:9").trim();
  if (ar === "9:16") {
    return { width: 1080, height: 1920, aspect_ratio: ar };
  }
  return { width: 1920, height: 1080, aspect_ratio: "16:9" };
}

export function buildZoomSequence(flyMode, zoomFrom, zoomTo, placeType) {
  if (flyMode === "earth_descent") {
    if (placeType === "city" || placeType === "historic_site") {
      return [...CITY_DESCENT_ZOOMS];
    }
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

function normalizeAliasKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveGeocodeAlias(location = "", region = "", country = "") {
  const candidates = [
    normalizeAliasKey(location),
    normalizeAliasKey(`${location} ${region}`.trim()),
    normalizeAliasKey(`${location} ${country}`.trim()),
    normalizeAliasKey(`${location} ${region} ${country}`.trim()),
  ].filter((c) => c.length >= 2);

  for (const key of candidates) {
    const hit = LOCATION_GEOCODE_ALIASES[key];
    if (hit) return hit;
    for (const [alias, query] of Object.entries(LOCATION_GEOCODE_ALIASES)) {
      if (key.includes(alias)) return query;
    }
  }
  return null;
}

function expandCountryVariants(country = "") {
  const raw = String(country || "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s*(?:&|\/|\+|,|;|\be\b)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  const out = new Set(parts.length ? parts : [raw]);
  for (const part of [...out]) {
    const key = normalizeAliasKey(part);
    const en = COUNTRY_PT_TO_EN[key];
    if (en) out.add(en);
  }
  return [...out];
}

function locationNameVariants(location = "") {
  const loc = String(location || "").trim();
  if (!loc) return [];
  const variants = [loc];
  const stripped = loc
    .replace(
      /^(ponte|ponte de|bridge|rio|rio de|forte|fortaleza)\s+(de\s+)?/i,
      ""
    )
    .trim();
  if (stripped && stripped !== loc) variants.push(stripped);
  return [...new Set(variants.filter((v) => v.length >= 2))];
}

export function buildGeocodeQueries(location = "", region = "", country = "") {
  const loc = String(location || "").trim();
  const reg = String(region || "").trim();
  const cty = String(country || "").trim();
  const alias = resolveGeocodeAlias(loc, reg, cty);
  const queries = [];
  if (alias) queries.push(alias);

  const locs = locationNameVariants(loc);
  const countries = expandCountryVariants(cty);

  for (const name of locs) {
    if (countries.length) {
      for (const c of countries) {
        queries.push(`${name}, ${c}`);
        if (reg) queries.push(`${name}, ${reg}, ${c}`);
      }
    } else if (cty) {
      queries.push(`${name}, ${cty}`);
      if (reg) queries.push(`${name}, ${reg}, ${cty}`);
    }
    if (reg) queries.push(`${name}, ${reg}`);
    queries.push(name);
  }

  return [...new Set(queries.filter((q) => q.length >= 2))];
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
    if (
      entry.pattern.test(name) ||
      entry.location.toLowerCase() === name.toLowerCase()
    ) {
      return {
        lat: entry.lat,
        lng: entry.lng,
        label: entry.location,
        source: "known",
      };
    }
  }
  const alias = resolveGeocodeAlias(
    place.location || place.label || "",
    place.region || "",
    place.country || ""
  );
  if (alias) {
    for (const entry of KNOWN_COORDINATES) {
      if (entry.pattern.test(alias)) {
        return {
          lat: entry.lat,
          lng: entry.lng,
          label: entry.location,
          source: "known",
        };
      }
    }
  }
  return null;
}

async function nominatimSearch(query = "") {
  const q = String(query || "").trim();
  if (!q || q.length < 2) return null;
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
    query: q,
  };
}

export async function geocodeLocation(query = "", place = {}) {
  const q = String(query || "").trim();
  if (!q || q.length < 2) return null;

  const known = resolveKnownCoordinates(q, place);
  if (known) return known;

  const parts = q.split(",").map((p) => p.trim());
  const loc = parts[0] || "";
  const region = parts[1] || String(place.region || "");
  const country = parts[2] || String(place.country || "");
  const queries = buildGeocodeQueries(loc, region, country);
  if (!queries.includes(q)) queries.unshift(q);

  for (const candidate of queries) {
    const hit = await nominatimSearch(candidate);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 1100));
  }
  return null;
}

function resolveMapboxToken(config = {}, workspaceConfig = {}) {
  return (
    String(config.mapbox_access_token || "").trim() ||
    String(workspaceConfig.mapbox_access_token || "").trim() ||
    String(process.env.MAPBOX_ACCESS_TOKEN || "").trim() ||
    ""
  );
}

export function resolveMapEngine(config = {}, workspaceConfig = {}) {
  return String(
    config.map_engine ||
      workspaceConfig.map_engine ||
      process.env.LUMIERA_MAP_ENGINE ||
      "blender"
  )
    .trim()
    .toLowerCase();
}

function resolveCesiumIonToken(config = {}, workspaceConfig = {}) {
  return (
    String(config.cesium_ion_access_token || "").trim() ||
    String(workspaceConfig.cesium_ion_access_token || "").trim() ||
    String(process.env.CESIUM_ION_ACCESS_TOKEN || "").trim() ||
    ""
  );
}

function resolveGoogleMapsApiKey(config = {}, workspaceConfig = {}) {
  return (
    String(config.google_maps_api_key || "").trim() ||
    String(workspaceConfig.google_maps_api_key || "").trim() ||
    String(process.env.GOOGLE_MAPS_API_KEY || "").trim() ||
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
  const boundaryQuery =
    resolveGeocodeAlias(props.location, props.region, props.country) || query;

  const classified = classifyPlaceType(scene?.narration_text || "", props);
  const classification =
    props.fly_mode && props.place_type
      ? {
          fly_mode: props.fly_mode,
          place_type: props.place_type,
          structure_exists:
            props.structure_exists !== false &&
            props.place_type !== "historic_site",
        }
      : classified;

  const aspectRatio = String(
    props.aspect_ratio || config.aspect_ratio || config.format || "16:9"
  ).trim();
  const renderDims = resolveRenderDimensions(aspectRatio);

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
    coords = await geocodeLocation(query, props);
  }
  if (!coords && scene?.narration_text) {
    coords = await geocodeLocation(scene.narration_text, props);
  }
  if (!coords?.lat || !coords?.lng) {
    return {
      ok: false,
      reason: "geocode_failed",
      query,
      tried: buildGeocodeQueries(props.location, props.region, props.country),
    };
  }

  const token = resolveMapboxToken(config, workspaceConfig);
  const sceneKey =
    String(scene.id || "scene")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40) || crypto.randomBytes(4).toString("hex");

  let zoomLevels = buildZoomSequence(
    classification.fly_mode,
    zoomFrom,
    zoomTo,
    classification.place_type
  );

  let boundaryGeoJson = null;
  let boundaryPath = null;
  if (classification.place_type === "city") {
    try {
      boundaryGeoJson = await fetchPlaceBoundary(boundaryQuery, {
        lat: coords.lat,
        lng: coords.lng,
      });
      if (boundaryGeoJson) {
        const fitZ = fitZoomForBoundary(
          boundaryGeoJson,
          coords.lat,
          coords.lng,
          renderDims.width,
          renderDims.height,
          1.55
        );
        if (classification.place_type === "city") {
          const last = zoomLevels[zoomLevels.length - 1];
          const finalZ = Math.min(Number(last) || 10, fitZ);
          zoomLevels = [...zoomLevels.slice(0, -1), finalZ].filter(
            (z, i, arr) => i === 0 || z !== arr[i - 1]
          );
        }
      }
    } catch {
      /* boundary opcional nesta fase */
    }
  }

  let boundaryAbsPath = null;
  if (
    boundaryGeoJson &&
    (classification.place_type === "city" ||
      classification.fly_mode === "city_outline")
  ) {
    try {
      const boundaryName = `${sceneKey}-boundary.json`;
      boundaryAbsPath = path.join(projDir, assetRelPath(boundaryName));
      fs.mkdirSync(path.dirname(boundaryAbsPath), { recursive: true });
      fs.writeFileSync(
        boundaryAbsPath,
        JSON.stringify(boundaryGeoJson, null, 2),
        "utf8"
      );
      boundaryPath = boundaryAbsPath;
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      boundaryGeoJson = null;
      boundaryAbsPath = null;
      boundaryPath = null;
    }
  }

  const mapEngine = resolveMapEngine(config, workspaceConfig);
  const useBlender = mapEngine === "blender" && isBlenderAvailable();
  let zoomKeyframes = [];
  let flyoverVideo = "";

  if (useBlender) {
    const wideZoom = zoomLevels[0];
    const tightZoom = zoomLevels[zoomLevels.length - 1];
    const wideName = `${sceneKey}-z${wideZoom}.jpg`;
    const tightName = `${sceneKey}-z${tightZoom}.jpg`;
    const widePath = path.join(projDir, assetRelPath(wideName));
    const tightPath = path.join(projDir, assetRelPath(tightName));
    await downloadImageToFile(
      buildTileUrl(token, coords.lat, coords.lng, wideZoom),
      widePath
    );
    await downloadImageToFile(
      buildTileUrl(token, coords.lat, coords.lng, tightZoom),
      tightPath
    );

    const durationSec = Math.max(
      8,
      Number(scene.duration_seconds) || Number(props.duration_seconds) || 8
    );
    const blenderOut = await renderLocationIntroFlyover(projDir, {
      lat: coords.lat,
      lng: coords.lng,
      zoomLevels,
      textureWide: widePath,
      textureTight: tightPath,
      boundaryPath: boundaryAbsPath || "",
      sceneKey,
      durationSec,
      accentColor: String(props.accentColor || "#C5A889"),
      placeType: classification.place_type,
      aspectRatio: renderDims.aspect_ratio,
      width: renderDims.width,
      height: renderDims.height,
      orbitPoi: classification.place_type === "poi",
      structureExists: classification.structure_exists !== false,
      useBlenderGis: config.use_blender_gis !== false,
    });
    zoomKeyframes = blenderOut.zoom_keyframes;
    flyoverVideo = blenderOut.flyover_video;
  } else if (mapEngine === "cesium") {
    zoomKeyframes = buildVirtualZoomKeyframes(zoomLevels);
  } else {
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
  }

  const wideFrame = zoomKeyframes[0];
  const tightFrame = zoomKeyframes[zoomKeyframes.length - 1];

  return {
    ok: true,
    lat: coords.lat,
    lng: coords.lng,
    geocode_source: coords.source,
    map_provider: useBlender
      ? "blender"
      : mapEngine === "cesium"
        ? "cesium"
        : token
          ? "mapbox"
          : "esri",
    place_type: classification.place_type,
    structure_exists: classification.structure_exists !== false,
    fly_mode: classification.fly_mode,
    aspect_ratio: renderDims.aspect_ratio,
    zoom_keyframes: zoomKeyframes,
    flyover_video: flyoverVideo,
    cesium_ion_token:
      mapEngine === "cesium"
        ? resolveCesiumIonToken(config, workspaceConfig)
        : "",
    google_maps_api_key:
      mapEngine === "cesium"
        ? resolveGoogleMapsApiKey(config, workspaceConfig)
        : "",
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

/**
 * Pin regional leve — geocode + tile único (sem flyover Blender).
 */
export async function fetchGeoMapAssetsForScene(
  projDir,
  scene,
  { config = {}, workspaceConfig = {} } = {}
) {
  const props = scene?.props || {};
  const query = [props.location, props.region, props.country]
    .filter(Boolean)
    .join(", ");

  let coords = resolveKnownCoordinates(scene?.narration_text || "", props);
  if (!coords) {
    coords = await geocodeLocation(query, props);
  }
  if (!coords?.lat || !coords?.lng) {
    return {
      ok: false,
      reason: "geocode_failed",
      query,
      kind: "geo-map",
    };
  }

  const token = resolveMapboxToken(config, workspaceConfig);
  const sceneKey =
    String(scene.id || "geo")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40) || crypto.randomBytes(4).toString("hex");
  const zoom = Number(props.zoom_to) || 11;
  const fileName = `${sceneKey}-geo-z${zoom}.jpg`;
  const destPath = path.join(projDir, assetRelPath(fileName));
  await downloadImageToFile(
    buildTileUrl(token, coords.lat, coords.lng, zoom),
    destPath
  );

  return {
    ok: true,
    kind: "geo-map",
    lat: coords.lat,
    lng: coords.lng,
    geocode_source: coords.source,
    map_provider: token ? "mapbox" : "esri",
    backgroundImage: assetRelPath(fileName),
    zoom_from: zoom,
    zoom_to: zoom,
    zoom_keyframes: [{ zoom, image: assetRelPath(fileName) }],
  };
}

export async function enrichMotionScenesWithSatellite(
  projDir,
  motionScenes = [],
  opts = {}
) {
  const { enrichMotionScenesWithAssets } =
    await import("./motionSceneAssetService.js");
  return enrichMotionScenesWithAssets(projDir, motionScenes, opts);
}
