import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGeoMapVideoPrompt,
  buildGeoVideoPromptMeta,
  buildGeoZoomVideoPrompt,
  detectHistoricalEra,
  detectWeatherFromNarration,
  geoPromptBrief,
  resolveGeoAnimationMode,
} from "./geoVideoPromptEngine.js";

describe("geoVideoPromptEngine", () => {
  it("detecta clima de chuva na narração", () => {
    const w = detectWeatherFromNarration(
      "Em 1988, uma chuva torrencial inundou as ruas da cidade."
    );
    assert.equal(w.id, "rain");
  });

  it("detecta era medieval", () => {
    const era = detectHistoricalEra(
      "No século XIV, a fortaleza estelar dominava a região."
    );
    assert.match(era, /Idade Média/i);
  });

  it("POI com ponte pede órbita 360°", () => {
    const anim = resolveGeoAnimationMode({
      place_type: "poi",
      poi_kind: "bridge",
      structure_exists: true,
    });
    assert.equal(anim.needs_orbit_360, true);
    assert.equal(anim.mode, "earth_descent_poi_orbit");
  });

  it("cidade pede destaque territorial sem órbita", () => {
    const anim = resolveGeoAnimationMode({ place_type: "city" });
    assert.equal(anim.needs_territory_highlight, true);
    assert.equal(anim.needs_orbit_360, false);
  });

  it("site histórico destruído usa modo historic", () => {
    const anim = resolveGeoAnimationMode({
      place_type: "historic_site",
      structure_exists: false,
    });
    assert.equal(anim.mode, "earth_descent_historic_orbit");
  });

  it("prompt zoom contém proibição de cortes e destaque territorial", () => {
    const prompt = buildGeoZoomVideoPrompt({
      place: {
        location: "Lisboa",
        region: "Lisboa",
        country: "Portugal",
      },
      classification: { place_type: "city", structure_exists: true },
      narration: "Lisboa cresceu sobre colinas à beira do Tejo.",
      aspectRatio: "16:9",
      durationSeconds: 10,
      coords: { lat: 38.7223, lng: -9.1393 },
    });
    assert.match(prompt, /sem cortes/i);
    assert.match(prompt, /DESTAQUE TERRITORIAL/i);
    assert.match(prompt, /Lisboa/i);
    assert.match(prompt, /português do Brasil/i);
  });

  it("prompt POI contém órbita 360°", () => {
    const prompt = buildGeoZoomVideoPrompt({
      place: { location: "Ponte de Laufenburg", country: "Alemanha & Suíça" },
      classification: {
        place_type: "poi",
        poi_kind: "bridge",
        structure_exists: true,
      },
      narration: "A ponte de Laufenburg liga duas nações.",
      durationSeconds: 12,
    });
    assert.match(prompt, /360/i);
    assert.match(prompt, /ÓRBITA/i);
  });

  it("buildGeoVideoPromptMeta preenche ai_video_prompt", () => {
    const meta = buildGeoVideoPromptMeta({
      place: { location: "Roma", country: "Itália" },
      classification: { place_type: "city" },
      narration: "Roma foi o coração do Império.",
      templateId: "location-intro",
    });
    assert.ok(meta.ai_video_prompt.length > 200);
    assert.equal(meta.geo_prompt_engine, "lumiera-geo-v1");
    assert.equal(meta.geo_prompt_territory_highlight, true);
  });

  it("geo-map gera prompt regional", () => {
    const prompt = buildGeoMapVideoPrompt({
      place: { location: "Amazônia", region: "Norte", country: "Brasil" },
      narration: "A floresta cobre milhões de hectares.",
    });
    assert.match(prompt, /MAPA REGIONAL/i);
    assert.match(prompt, /Amazônia/i);
  });

  it("geoPromptBrief resume flags", () => {
    const brief = geoPromptBrief({
      geo_prompt_orbit_360: true,
      geo_prompt_territory_highlight: false,
      geo_prompt_weather: "rain",
      geo_prompt_era: "século XX",
    });
    assert.match(brief, /360°/);
    assert.match(brief, /rain/);
  });
});
