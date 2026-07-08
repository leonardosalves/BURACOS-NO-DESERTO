import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyGeoNarrationSegment,
  limitGeoMotionScenes,
  GEO_SCENE_LIMITS,
} from "./geoSceneEligibility.js";

describe("geoSceneEligibility", () => {
  it("não dispara só por mapa/google maps sem lugar nomeado", () => {
    const r = classifyGeoNarrationSegment(
      "O Google Maps esconde uma fortaleza estelar com precisão absurda."
    );
    assert.equal(r, null);
  });

  it("dispara com cidade nomeada", () => {
    const r = classifyGeoNarrationSegment(
      "Na cidade de Roma, a engenharia antiga impressiona o mundo."
    );
    assert.equal(r?.trigger, "location");
    assert.match(String(r?.place || ""), /Roma/i);
  });

  it("dispara com POI e lugar", () => {
    const r = classifyGeoNarrationSegment(
      "A ponte de Laufenburg liga duas nações na fronteira."
    );
    assert.equal(r?.trigger, "location");
  });

  it("dispara com região nomeada", () => {
    const r = classifyGeoNarrationSegment(
      "Na região do Saara, a seca transforma o território."
    );
    assert.equal(r?.trigger, "location");
  });

  it("limita geo a 1 em shorts e 3 em longos", () => {
    const scenes = [
      {
        id: "g1",
        template_id: "location-intro",
        confidence: 0.9,
        start_hint: 0,
      },
      {
        id: "g2",
        template_id: "location-intro",
        confidence: 0.8,
        start_hint: 10,
      },
      { id: "g3", template_id: "geo-map", confidence: 0.7, start_hint: 20 },
      {
        id: "g4",
        template_id: "location-intro",
        confidence: 0.6,
        start_hint: 30,
      },
      { id: "c1", template_id: "counter", confidence: 0.95, start_hint: 5 },
    ];
    const short = limitGeoMotionScenes(scenes, "9:16");
    const long = limitGeoMotionScenes(scenes, "16:9");
    assert.equal(
      short.filter(
        (s) => s.template_id === "location-intro" || s.template_id === "geo-map"
      ).length,
      GEO_SCENE_LIMITS.shortMax
    );
    assert.equal(
      long.filter(
        (s) => s.template_id === "location-intro" || s.template_id === "geo-map"
      ).length,
      GEO_SCENE_LIMITS.longMax
    );
    assert.ok(short.some((s) => s.template_id === "counter"));
  });
});
