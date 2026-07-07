import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fitZoomForBoundary,
  resolveEarthDescentFrame,
  sortZoomKeyframes,
} from "./locationIntroFly.js";

describe("locationIntroFly", () => {
  it("sortZoomKeyframes ordena por zoom", () => {
    const sorted = sortZoomKeyframes([
      { zoom: 10, image: "a.jpg" },
      { zoom: 3, image: "b.jpg" },
      { zoom: 7, image: "c.jpg" },
    ]);
    assert.deepEqual(
      sorted.map((k) => k.zoom),
      [3, 7, 10]
    );
  });

  it("resolveEarthDescentFrame interpola suavemente no meio", () => {
    const sorted = [
      { zoom: 3, image: "a" },
      { zoom: 7, image: "b" },
      { zoom: 10, image: "c" },
    ];
    const mid = resolveEarthDescentFrame(sorted, 0.55);
    assert.ok(mid.activeIndex >= 0 && mid.activeIndex < sorted.length - 1);
    assert.ok(mid.blendT >= 0 && mid.blendT <= 1);
    assert.ok(mid.easedProgress > 0.4 && mid.easedProgress < 0.7);
  });

  it("fitZoomForBoundary escolhe zoom mais aberto para cidade grande", () => {
    const geo = {
      type: "Polygon",
      coordinates: [
        [
          [100.3, 13.5],
          [100.9, 13.5],
          [100.9, 14.0],
          [100.3, 14.0],
          [100.3, 13.5],
        ],
      ],
    };
    const z = fitZoomForBoundary(geo, 13.7563, 100.5018);
    assert.ok(z <= 10);
    assert.ok(z >= 7);
  });
});
