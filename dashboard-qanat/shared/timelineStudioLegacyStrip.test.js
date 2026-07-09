import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLegacyStudioOverlayClip,
  isStudioTemplateClip,
  stripLegacyStudioOverlayClips,
} from "./timelineStudioLegacyStrip.js";

const SAMPLE_TSX = `export default function T() {
  const frame = useCurrentFrame();
  return null;
}`;

describe("timelineStudioLegacyStrip", () => {
  it("remove clip legado na trilha overlays", () => {
    const clip = {
      id: "ov-1",
      trackId: "overlays",
      templateId: "bar-chart",
      start: 0,
      duration: 4,
      props: { title: "COMPARAÇÃO" },
    };
    assert.equal(isLegacyStudioOverlayClip(clip), true);
    assert.equal(isStudioTemplateClip(clip), false);
  });

  it("mantem location-intro sem studio_source_code", () => {
    const clip = {
      id: "m-geo",
      trackId: "motion",
      templateId: "location-intro",
      start: 0,
      duration: 8,
      props: { location: "Bangkok", motion_scene: true },
    };
    assert.equal(isLegacyStudioOverlayClip(clip), false);
  });

  it("remove bar-chart motion sem studio_source_code", () => {
    const clip = {
      id: "m-bar",
      trackId: "motion",
      templateId: "bar-chart",
      start: 0,
      duration: 4,
      props: { title: "COMPARAÇÃO", motion_scene: true },
    };
    assert.equal(isLegacyStudioOverlayClip(clip), true);
  });

  it("mantem clip motion com studio_source_code", () => {
    const clip = {
      id: "m-1",
      trackId: "motion",
      templateId: "bar-chart",
      start: 0,
      duration: 4,
      props: { studio_source_code: SAMPLE_TSX, motion_scene: true },
    };
    assert.equal(isStudioTemplateClip(clip), true);
    assert.equal(isLegacyStudioOverlayClip(clip), false);
  });

  it("stripLegacyStudioOverlayClips remove legado e preserva studio", () => {
    const legacy = {
      id: "ov-1",
      trackId: "overlays",
      templateId: "bar-chart",
      start: 0,
      duration: 4,
      props: {},
    };
    const studio = {
      id: "m-1",
      trackId: "motion",
      templateId: "bar-chart",
      start: 1,
      duration: 4,
      props: { studio_source_code: SAMPLE_TSX },
    };
    const video = {
      id: "v-1",
      trackId: "video",
      start: 0,
      duration: 10,
      props: {},
    };
    const result = stripLegacyStudioOverlayClips([legacy, studio, video]);
    assert.equal(result.removed, 1);
    assert.equal(result.clips.length, 2);
    assert.equal(
      result.clips.some((c) => c.id === "m-1"),
      true
    );
  });
});
