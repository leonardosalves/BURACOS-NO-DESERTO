/**
 * Tiles de satélite para location-intro — geocoding + download local.
 * Mapbox Static (se token) ou Esri World Imagery (fallback gratuito).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const NOMINATIM_UA = "LumieraVideoStudio/1.0 (motion-scenes-satellite)";

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
  if (buf.length < 500) {
    throw new Error("Imagem de mapa inválida ou vazia");
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return destPath;
}

function assetRelPath(fileName) {
  return `ASSETS/satellite/${fileName}`;
}

/**
 * Baixa imagens wide + tight e retorna paths relativos ao projeto.
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

  let coords = resolveKnownCoordinates(scene?.narration_text || "", props);
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
  const wideName = `${sceneKey}-z${zoomFrom}.jpg`;
  const tightName = `${sceneKey}-z${zoomTo}.jpg`;
  const widePath = path.join(projDir, assetRelPath(wideName));
  const tightPath = path.join(projDir, assetRelPath(tightName));

  const wideUrl = token
    ? buildMapboxStaticUrl(coords.lng, coords.lat, zoomFrom, token)
    : buildEsriExportUrl(coords.lat, coords.lng, zoomFrom);
  const tightUrl = token
    ? buildMapboxStaticUrl(coords.lng, coords.lat, zoomTo, token)
    : buildEsriExportUrl(coords.lat, coords.lng, zoomTo);

  await downloadImageToFile(wideUrl, widePath);
  await downloadImageToFile(tightUrl, tightPath);

  return {
    ok: true,
    lat: coords.lat,
    lng: coords.lng,
    geocode_source: coords.source,
    map_provider: token ? "mapbox" : "esri",
    backgroundImage: assetRelPath(tightName),
    backgroundImageWide: assetRelPath(wideName),
    widePath,
    tightPath,
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
