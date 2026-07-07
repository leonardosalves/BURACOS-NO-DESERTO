import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderBarChartProps,
  isPlaceholderCounterProps,
  motionSceneFromStudioClip,
  motionSceneNeedsAssetEnrichment,
  resolveMotionScenesForEnrichment,
  studioNeedsMotionOrchestration,
} from "./motionSceneAssetEnrichment.js";

describe("motionSceneAssetEnrichment", () => {
  it("detecta counter placeholder", () => {
    assert.equal(
      isPlaceholderCounterProps({ value: 100, label: "DADO" }),
      true
    );
    assert.equal(
      isPlaceholderCounterProps({ value: 62, label: "BRASIL" }),
      false
    );
  });

  it("detecta bar-chart placeholder", () => {
    assert.equal(
      isPlaceholderBarChartProps({
        items: [
          { label: "A", value: 72 },
          { label: "B", value: 54 },
          { label: "C", value: 38 },
        ],
      }),
      true
    );
  });

  it("location-intro sem assets precisa enriquecimento", () => {
    const scene = {
      id: "ms-2.1",
      template_id: "location-intro",
      props: { location: "Laufenburg", country: "Suíça" },
    };
    assert.equal(motionSceneNeedsAssetEnrichment(scene), true);
  });

  it("counter com dados reais não precisa fetch externo", () => {
    const scene = {
      id: "ms-1",
      template_id: "counter",
      props: { value: 47, label: "METROS", suffix: "m" },
    };
    assert.equal(motionSceneNeedsAssetEnrichment(scene), false);
  });

  it("resolve motion scenes da timeline quando storyboard vazio", () => {
    const studio = {
      clips: [
        {
          id: "ms-2.1",
          trackId: "motion",
          templateId: "location-intro",
          start: 5,
          duration: 8,
          label: "Laufenburg",
          motionScene: true,
          props: {
            location: "Laufenburg",
            narration_text: "Na ponte de Laufenburg",
          },
        },
      ],
    };
    const resolved = resolveMotionScenesForEnrichment({}, studio);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].id, "ms-2.1");
    assert.equal(resolved[0].template_id, "location-intro");
  });

  it("studioNeedsMotionOrchestration com clips pendentes", () => {
    const clips = [
      {
        id: "ms-1",
        trackId: "motion",
        templateId: "counter",
        motionScene: true,
        props: { value: 100, label: "DADO" },
      },
    ];
    assert.equal(studioNeedsMotionOrchestration(clips, {}), true);
  });

  it("studioNeedsMotionOrchestration ignora cenas suprimidas no storyboard", () => {
    const storyboard = {
      motion_scenes: [{ id: "ms-1.1" }, { id: "ms-3.1" }],
      visual_prompts: [{ block: 1 }],
    };
    const studio = {
      suppressedMotionSceneIds: ["ms-1.1", "ms-3.1"],
      clips: [],
    };
    assert.equal(studioNeedsMotionOrchestration([], storyboard, studio), false);
  });

  it("motionSceneFromStudioClip extrai template e narração", () => {
    const scene = motionSceneFromStudioClip({
      id: "ms-3",
      trackId: "motion",
      templateId: "kinetic-text",
      motionScene: true,
      label: "REVELAÇÃO",
      props: { trigger: "curiosity_punch" },
    });
    assert.equal(scene?.template_id, "kinetic-text");
    assert.equal(scene?.narration_text, "REVELAÇÃO");
  });

  it("clip location-intro vira motion scene enrichível", () => {
    const clip = {
      id: "ms-1",
      trackId: "motion",
      templateId: "location-intro",
      motionScene: true,
      props: { location: "Roma" },
    };
    const scene = motionSceneFromStudioClip(clip);
    assert.equal(motionSceneNeedsAssetEnrichment(scene), true);
  });
});
