import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bboxFromCenter,
  resolveKnownCoordinates,
  resolveGeocodeAlias,
  buildGeocodeQueries,
  buildMapboxStaticUrl,
  buildEsriExportUrl,
  classifyPlaceType,
  resolveRenderDimensions,
  buildZoomSequence,
  EARTH_DESCENT_ZOOMS,
  CITY_DESCENT_ZOOMS,
  CITY_OUTLINE_ZOOMS,
} from "../backend/satelliteMapService.js";

describe("satelliteMapService", () => {
  it("resolve Palmanova por texto", () => {
    const c = resolveKnownCoordinates("fortaleza estelar em Palmanova");
    assert.ok(c);
    assert.ok(Math.abs(c.lat - 45.9054) < 0.01);
  });

  it("resolve Bangcoc (PT-BR) para coordenadas de Bangkok", () => {
    const c = resolveKnownCoordinates("", {
      location: "Bangcoc",
      country: "Tailândia",
    });
    assert.ok(c);
    assert.ok(Math.abs(c.lat - 13.7563) < 0.05);
    assert.ok(Math.abs(c.lng - 100.5018) < 0.05);
  });

  it("resolveGeocodeAlias traduz Bangcoc para Bangkok", () => {
    const q = resolveGeocodeAlias("Bangcoc", "Grande Bangcoc", "Tailândia");
    assert.equal(q, "Bangkok, Thailand");
  });

  it("buildGeocodeQueries inclui alias canônico primeiro", () => {
    const queries = buildGeocodeQueries(
      "Bangcoc",
      "Grande Bangcoc",
      "Tailândia"
    );
    assert.equal(queries[0], "Bangkok, Thailand");
  });

  it("resolve Laufenburg (ponte Alemanha & Suíça)", () => {
    const c = resolveKnownCoordinates("", {
      location: "Ponte de Laufenburg",
      region: "Fronteira Laufenburg",
      country: "Alemanha & Suíça",
    });
    assert.ok(c);
    assert.ok(Math.abs(c.lat - 47.5519) < 0.05);
    assert.ok(Math.abs(c.lng - 8.0389) < 0.05);
  });

  it("buildGeocodeQueries expande país composto Alemanha & Suíça", () => {
    const queries = buildGeocodeQueries(
      "Ponte de Laufenburg",
      "Fronteira Laufenburg",
      "Alemanha & Suíça"
    );
    assert.ok(queries.includes("Laufenburg, Switzerland"));
    assert.ok(queries.includes("Laufenburg, Germany"));
    assert.ok(queries.some((q) => q.includes("Laufenburg bridge")));
  });

  it("bboxFromCenter retorna limites válidos", () => {
    const b = bboxFromCenter(45.9, 13.31, 10);
    assert.ok(b.minLat < b.maxLat);
    assert.ok(b.minLng < b.maxLng);
  });

  it("buildMapboxStaticUrl inclui coordenadas", () => {
    const url = buildMapboxStaticUrl(13.31, 45.9, 12, "pk.test");
    assert.match(url, /mapbox\.com/);
    assert.match(url, /13\.31,45\.9,12/);
  });

  it("buildEsriExportUrl usa World_Imagery", () => {
    const url = buildEsriExportUrl(45.9, 13.31, 10);
    assert.match(url, /World_Imagery/);
    assert.match(url, /format=jpg/);
  });

  it("classifyPlaceType detecta POI por fortaleza", () => {
    const c = classifyPlaceType("a fortaleza estelar de Palmanova", {
      location: "Palmanova",
    });
    assert.equal(c.place_type, "poi");
    assert.equal(c.fly_mode, "earth_descent");
  });

  it("classifyPlaceType detecta cidade com descida padrão", () => {
    const c = classifyPlaceType("na cidade de Roma", { location: "Roma" });
    assert.equal(c.place_type, "city");
    assert.equal(c.fly_mode, "earth_descent");
    assert.equal(c.structure_exists, true);
  });

  it("classifyPlaceType detecta historic_site quando estrutura caiu", () => {
    const c = classifyPlaceType(
      "O único prédio da cidade caiu e não existe mais no local.",
      { location: "Bangcoc" }
    );
    assert.equal(c.place_type, "historic_site");
    assert.equal(c.structure_exists, false);
  });

  it("resolveRenderDimensions 9:16 e 16:9", () => {
    assert.deepEqual(resolveRenderDimensions("9:16"), {
      width: 1080,
      height: 1920,
      aspect_ratio: "9:16",
    });
    assert.deepEqual(resolveRenderDimensions("16:9"), {
      width: 1920,
      height: 1080,
      aspect_ratio: "16:9",
    });
  });

  it("buildZoomSequence retorna keyframes corretos", () => {
    assert.deepEqual(
      buildZoomSequence("earth_descent", 8, 14, "poi"),
      EARTH_DESCENT_ZOOMS
    );
    assert.deepEqual(
      buildZoomSequence("earth_descent", 8, 14, "city"),
      CITY_DESCENT_ZOOMS
    );
    assert.deepEqual(
      buildZoomSequence("earth_descent", 8, 14, "historic_site"),
      CITY_DESCENT_ZOOMS
    );
    assert.deepEqual(
      buildZoomSequence("city_outline", 8, 14),
      CITY_OUTLINE_ZOOMS
    );
    assert.deepEqual(buildZoomSequence("simple", 8, 14), [8, 14]);
  });
});
