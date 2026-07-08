import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import {
  assessLocationIntroScene,
  assessMotionScenesPlan,
  normalizeMotionSceneMetadata,
} from "./motionSceneQuality.js";

describe("motionSceneQuality", () => {
  it("aprova location-intro com prompt IA geo", () => {
    const r = assessLocationIntroScene(
      {
        id: "ms-1",
        duration_seconds: 10,
        template_id: "location-intro",
        props: {
          map_provider: "ai_t2v",
          geo_generation: "ai_prompt",
          location: "Bangkok",
          ai_video_prompt: "x".repeat(120),
        },
      },
      { projDir: "" }
    );
    assert.equal(r.ok, true);
    assert.equal(r.provider, "ai_t2v");
  });

  it("reprova location-intro com zoom final apertado e poucos keyframes", () => {
    const r = assessLocationIntroScene({
      id: "ms-1.1",
      template_id: "location-intro",
      duration_seconds: 8,
      props: {
        lat: 13.75,
        lng: 100.5,
        place_type: "city",
        zoom_to: 12,
        zoom_keyframes: [{ zoom: 3, image: "a.jpg" }],
        fly_mode: "earth_descent",
      },
    });
    assert.equal(r.ok, false);
    assert.ok(r.issues.some((i) => i.code === "zoom_too_tight"));
    assert.ok(r.issues.some((i) => i.code === "insufficient_keyframes"));
    assert.equal(r.auto_fixable, true);
  });

  it("aprova location-intro com tiles e boundary no disco", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-qc-"));
    const tile = path.join(tmp, "ASSETS", "satellite", "z3.jpg");
    const boundary = path.join(tmp, "ASSETS", "satellite", "b.json");
    fs.mkdirSync(path.dirname(tile), { recursive: true });
    fs.writeFileSync(tile, "fake");
    fs.writeFileSync(boundary, "{}");

    const keyframes = [3, 4, 6, 7, 8, 9, 10].map((z) => ({
      zoom: z,
      image: `ASSETS/satellite/z${z}.jpg`,
    }));
    for (const kf of keyframes) {
      const p = path.join(tmp, kf.image);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "x");
    }

    const r = assessLocationIntroScene(
      {
        id: "ms-1.1",
        duration_seconds: 8,
        props: {
          lat: 13.75,
          lng: 100.5,
          place_type: "city",
          zoom_to: 10,
          zoom_keyframes: keyframes,
          boundaryGeoJson: "ASSETS/satellite/b.json",
          fly_mode: "earth_descent",
        },
      },
      { projDir: tmp }
    );
    assert.equal(r.ok, true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("normalizeMotionSceneMetadata corrige kinetic-text pip → fullscreen", () => {
    const n = normalizeMotionSceneMetadata({
      template_id: "kinetic-text",
      layout: "pip",
      props: { layout: "pip", presentation: "pip", text: "TEXTO" },
    });
    assert.equal(n.layout, "fullscreen");
    assert.equal(n.props.layout, "fullscreen");
    assert.equal(n.props.presentation, "fullscreen");
  });

  it("assessMotionScenesPlan agrega score", () => {
    const plan = assessMotionScenesPlan([
      {
        id: "a",
        template_id: "counter",
        props: { value: 1 },
      },
      {
        id: "b",
        template_id: "location-intro",
        duration_seconds: 8,
        props: { lat: 1, lng: 2, zoom_to: 12, zoom_keyframes: [] },
      },
    ]);
    assert.equal(plan.ok, false);
    assert.equal(plan.failed_count, 1);
    assert.ok(plan.score < 100);
  });
});
