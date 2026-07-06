import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bboxFromCenter,
  resolveKnownCoordinates,
  buildMapboxStaticUrl,
  buildEsriExportUrl,
} from "../backend/satelliteMapService.js";

describe("satelliteMapService", () => {
  it("resolve Palmanova por texto", () => {
    const c = resolveKnownCoordinates("fortaleza estelar em Palmanova");
    assert.ok(c);
    assert.ok(Math.abs(c.lat - 45.9054) < 0.01);
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
});
