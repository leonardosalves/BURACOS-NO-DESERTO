import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  zoomToHeightMeters,
  resolveEarthDescentCamera,
  buildVirtualZoomKeyframes,
} from "./cesiumFly.js";

describe("cesiumFly", () => {
  it("zoom alto = altitude maior", () => {
    assert.ok(zoomToHeightMeters(3) > zoomToHeightMeters(12));
  });

  it("resolveEarthDescentCamera desce ao longo do progress", () => {
    const start = resolveEarthDescentCamera({
      lat: 13.7563,
      lng: 100.5018,
      zoom_from: 3,
      zoom_to: 10,
      progress: 0,
    });
    const end = resolveEarthDescentCamera({
      lat: 13.7563,
      lng: 100.5018,
      zoom_from: 3,
      zoom_to: 10,
      progress: 1,
    });
    assert.ok(start.height > end.height);
    assert.ok(end.pitch < start.pitch);
  });

  it("buildVirtualZoomKeyframes para modo Cesium", () => {
    const kf = buildVirtualZoomKeyframes([3, 6, 10]);
    assert.equal(kf.length, 3);
    assert.equal(kf[0].image, "");
  });
});
