import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStudioCatalogMotionClip,
  buildShotcraftOverlayClip,
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

  it("buildShotcraftOverlayClip cria motion_shot sem TSX do Studio", () => {
    const clip = buildShotcraftOverlayClip({
      templateId: "odometer-digit-roll",
      playhead: 12,
      duration: 3.5,
      props: {
        shot_props: { value: 300, unit: "m", label: "Altura" },
        palette: { primary: "#F5A623", accent: "#4A9EFF" },
      },
      label: "Odometer",
    });
    assert.ok(clip);
    assert.equal(clip.props.shotcraft, true);
    assert.equal(clip.props.motion_shot.templateId, "odometer-digit-roll");
    assert.equal(clip.props.motion_shot.props.value, 300);
    assert.equal(clip.duration, 3.5);
    assert.equal(clip.start, 12);
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
