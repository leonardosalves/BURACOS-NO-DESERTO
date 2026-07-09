import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveStudioOverlayLayer,
  resolveStudioOverlayOpacity,
  splitOverlaysByStudioLayer,
} from "./studioOverlayLayers.js";

describe("studioOverlayLayers", () => {
  it("resolveStudioOverlayLayer detecta background", () => {
    assert.equal(
      resolveStudioOverlayLayer({
        props: { studio_z_index: "under", studio_role: "background_frame" },
      }),
      "under"
    );
    assert.equal(
      resolveStudioOverlayLayer({ props: { studio_role: "transition" } }),
      "over"
    );
  });

  it("splitOverlaysByStudioLayer separa under e over", () => {
    const { underlays, overlays } = splitOverlaysByStudioLayer([
      { id: "bg", props: { studio_z_index: "under" } },
      { id: "c1", props: { studio_role: "overlay" } },
      { id: "tr", props: { studio_role: "transition" } },
    ]);
    assert.equal(underlays.length, 1);
    assert.equal(underlays[0].id, "bg");
    assert.equal(overlays.length, 2);
  });

  it("resolveStudioOverlayOpacity default logo_bug", () => {
    assert.equal(
      resolveStudioOverlayOpacity({ props: { studio_role: "logo_bug" } }),
      0.35
    );
    assert.equal(
      resolveStudioOverlayOpacity({ props: { studio_opacity: 0.5 } }),
      0.5
    );
  });
});
