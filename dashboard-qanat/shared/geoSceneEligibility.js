/**
 * Elegibilidade de cenas geográficas (location-intro / geo-map).
 * Só dispara quando o roteiro cita lugar ou objeto construído de forma explícita.
 * Teto: 1 cena geo em shorts, 3 em longos (nunca obrigatório).
 */

export const GEO_MOTION_TEMPLATES = new Set(["location-intro", "geo-map"]);

export const GEO_SCENE_LIMITS = {
  shortMax: 1,
  longMax: 3,
};

const LOCATION_RE =
  /\b(?:em|na|no|de)\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,4})\b/;

const TERRITORY_LABEL_RE =
  /\b(?:cidade|munic[ií]pio|capital|metr[oó]pole|pa[ií]s|na[cç][aã]o|continente|estado|prov[ií]ncia|regi[aã]o|distrito|bairro|vilarejo|vila|comuna|zona|arquip[eé]lago|ilha)\b/i;

const POI_LABEL_RE =
  /\b(ponte|viaduto|barragem|represa|usina|hidrel[eé]trica|edif[ií]cio|pr[eé]dio|torre|templo|pir[aâ]mide|castelo|fortaleza|forte|monumento|est[aá]dio|arena|aqueduto|obelisco|farol|memorial|ru[ií]na|catedral|bas[ií]lica|pal[aá]cio|museu|est[aá]tua|constru[cç][aã]o|estrutura)\b/i;

const GEO_EVENT_RE =
  /\b(localizad[oa]s?|situad[oa]s?|localiza[cç][aã]o|geograf|territ[oó]rio|fronteira|coordenadas?|latitude|longitude|continente|oceano|litoral|costa|vale|deserto|floresta|bacia|s[ií]smico|terremoto|inunda[cç][aã]o|vulc[aã]o)\b/i;

const CITY_OF_RE =
  /\b(?:cidade|munic[ií]pio|capital|metr[oó]pole)\s+(?:de\s+)?([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+(?:de|do|da)\s+)?[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,2})/;

const COUNTRY_OF_RE =
  /\b(?:pa[ií]s|na[cç][aã]o)\s+(?:de\s+)?([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,2})/;

const REGION_OF_RE =
  /\b(?:regi[aã]o|estado|prov[ií]ncia|distrito|bairro|zona)\s+(?:de\s+|do\s+|da\s+)?([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,3})/i;

const POI_NAMED_RE =
  /\b(ponte|viaduto|barragem|represa|usina|edif[ií]cio|pr[eé]dio|torre|templo|pir[aâ]mide|castelo|fortaleza|forte|monumento|est[aá]dio|arena|aqueduto|obelisco|farol|memorial|ru[ií]na|catedral|bas[ií]lica|pal[aá]cio|museu|est[aá]tua)\s+de\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,3})/;

const PLACE_BLOCKLIST = new Set([
  "local",
  "lugar",
  "mundo",
  "terra",
  "aqui",
  "ali",
  "mapa",
  "vídeo",
  "video",
  "segredo",
  "história",
  "historia",
  "época",
  "epoca",
  "tempo",
  "passado",
  "futuro",
  "governo",
  "povo",
  "gente",
  "homem",
  "mulher",
  "criança",
  "crianca",
]);

export function isGeoMotionTemplate(templateId = "") {
  return GEO_MOTION_TEMPLATES.has(String(templateId || "").trim());
}

function isValidPlaceName(name = "") {
  const place = String(name || "").trim();
  if (place.length < 3) return false;
  if (!/^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(place)) return false;
  const lower = place.toLowerCase();
  if (PLACE_BLOCKLIST.has(lower)) return false;
  if (/^\d+$/.test(place)) return false;
  return true;
}

function matchNamedPlace(text, re, geoKind) {
  const m = String(text || "").match(re);
  if (!m?.[1] || !isValidPlaceName(m[1])) return null;
  return {
    trigger: "location",
    confidence: 0.88,
    geo_kind: geoKind,
    place: m[1].trim(),
  };
}

/**
 * Retorna classificação location só com âncora geográfica explícita no texto.
 */
export function classifyGeoNarrationSegment(
  text = "",
  knownPlacePatterns = []
) {
  const t = String(text || "").trim();
  if (!t || t.length < 12) return null;

  for (const row of knownPlacePatterns) {
    if (row?.pattern?.test(t)) {
      return {
        trigger: "location",
        confidence: 0.9,
        geo_kind: "known_place",
        place: row.location || "",
      };
    }
  }

  for (const [re, kind] of [
    [CITY_OF_RE, "city"],
    [COUNTRY_OF_RE, "country"],
    [REGION_OF_RE, "region"],
    [POI_NAMED_RE, "poi_named"],
  ]) {
    const hit = matchNamedPlace(t, re, kind);
    if (hit) return hit;
  }

  if (POI_LABEL_RE.test(t)) {
    const anchored = t.match(LOCATION_RE);
    if (anchored?.[1] && isValidPlaceName(anchored[1])) {
      return {
        trigger: "location",
        confidence: 0.86,
        geo_kind: "poi_anchored",
        place: anchored[1].trim(),
      };
    }
  }

  const locMatch = t.match(LOCATION_RE);
  if (locMatch?.[1] && isValidPlaceName(locMatch[1])) {
    const hasGeoAnchor =
      TERRITORY_LABEL_RE.test(t) ||
      POI_LABEL_RE.test(t) ||
      GEO_EVENT_RE.test(t);
    if (hasGeoAnchor) {
      return {
        trigger: "location",
        confidence: 0.82,
        geo_kind: "anchored",
        place: locMatch[1].trim(),
      };
    }
  }

  return null;
}

/**
 * Mantém no máximo N cenas geo (por formato); demais templates intactos.
 */
export function limitGeoMotionScenes(scenes = [], aspectRatio = "16:9") {
  const list = Array.isArray(scenes) ? scenes : [];
  const max =
    String(aspectRatio || "") === "9:16"
      ? GEO_SCENE_LIMITS.shortMax
      : GEO_SCENE_LIMITS.longMax;

  const geo = [];
  const other = [];
  for (let i = 0; i < list.length; i++) {
    const scene = list[i];
    if (isGeoMotionTemplate(scene?.template_id)) {
      geo.push({ scene, index: i });
    } else {
      other.push({ scene, index: i });
    }
  }

  if (geo.length <= max) return list;

  const keptGeo = geo
    .sort(
      (a, b) =>
        (Number(b.scene.confidence) || 0) - (Number(a.scene.confidence) || 0) ||
        (Number(a.scene.start_hint) || 0) - (Number(b.scene.start_hint) || 0) ||
        a.index - b.index
    )
    .slice(0, max);

  const keptSet = new Set(keptGeo.map((e) => e.index));
  return list.filter((_, i) => {
    const scene = list[i];
    if (!isGeoMotionTemplate(scene?.template_id)) return true;
    return keptSet.has(i);
  });
}
