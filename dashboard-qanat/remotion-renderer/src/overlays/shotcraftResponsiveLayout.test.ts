import assert from "node:assert/strict";
import test from "node:test";
import {
  getShotcraftStageLayout,
  SHOTCRAFT_DESIGN_HEIGHT,
  SHOTCRAFT_DESIGN_WIDTH,
} from "./shotcraftResponsiveLayout.ts";

test("mantem o palco original em 16:9", () => {
  const layout = getShotcraftStageLayout({
    width: 1920,
    height: 1080,
    profile: "focus",
  });
  assert.equal(layout.fit, "native");
  assert.equal(layout.scale, 1);
});

test("enquadra integralmente texto e interfaces em 9:16", () => {
  for (const profile of ["focus", "interface"] as const) {
    const layout = getShotcraftStageLayout({ width: 1080, height: 1920, profile });
    assert.equal(layout.fit, "contain");
    assert.ok(layout.renderedWidth <= 1080);
    assert.ok(layout.renderedHeight <= 1920);
    assert.equal(layout.renderedWidth, SHOTCRAFT_DESIGN_WIDTH * layout.scale);
    assert.equal(layout.renderedHeight, SHOTCRAFT_DESIGN_HEIGHT * layout.scale);
  }
});

test("permite cover somente para efeitos full-bleed", () => {
  const layout = getShotcraftStageLayout({
    width: 1080,
    height: 1920,
    profile: "full-bleed",
  });
  assert.equal(layout.fit, "cover");
  assert.ok(layout.renderedWidth >= 1080);
  assert.ok(layout.renderedHeight >= 1920);
});
