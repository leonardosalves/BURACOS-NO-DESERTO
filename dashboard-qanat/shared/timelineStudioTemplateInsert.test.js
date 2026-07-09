import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStudioCatalogMotionClip,
  studioMotionClipToMotionScene,
} from "../backend/timelineStudioNichePacks.js";

const TSX =
  '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}';

describe("timeline studio template insert", () => {
  it("buildStudioCatalogMotionClip marca insercao manual", () => {
    const clip = buildStudioCatalogMotionClip({
      templateId: "location-intro",
      playhead: 26,
      props: {
        studio_source_code: TSX,
        template_studio_id: "pip-1",
        aspect_ratio: "9:16",
        geo_pip_composite: true,
      },
      label: "Picture in Picture",
    });
    assert.ok(clip);
    assert.equal(clip.props.manual_studio_insert, true);
    assert.equal(clip.props.studio_user_locked, true);
    assert.equal(clip.trackId, "motion");
  });

  it("studioMotionClipToMotionScene preserva props PIP", () => {
    const clip = buildStudioCatalogMotionClip({
      templateId: "location-intro",
      playhead: 26,
      duration: 8,
      props: {
        studio_source_code: TSX,
        presentation: "pip",
        geo_pip_composite: true,
        aspect_ratio: "9:16",
      },
      label: "PIP",
    });
    const scene = studioMotionClipToMotionScene(clip);
    assert.equal(scene.id, clip.id);
    assert.equal(scene.template_id, "location-intro");
    assert.equal(scene.layout, "pip");
    assert.equal(scene.props.geo_pip_composite, true);
    assert.equal(scene.start_hint, 26);
    assert.equal(scene.duration_seconds, 8);
  });
});
