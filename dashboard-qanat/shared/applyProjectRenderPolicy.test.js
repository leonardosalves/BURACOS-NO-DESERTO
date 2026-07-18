import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyProjectRenderPolicyToMotionScenes,
  countInjectedPolicyLayers,
  stripPolicyManagedScenes,
} from "./applyProjectRenderPolicy.js";

describe("applyProjectRenderPolicy", () => {
  it("stripPolicyManagedScenes remove ms-policy-*", () => {
    const kept = stripPolicyManagedScenes([
      { id: "ms-1", source: "heuristic" },
      {
        id: "ms-policy-intro",
        source: "policy_intro",
        policy_injected: "intro",
      },
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, "ms-1");
  });

  it("legacy mode não injeta", () => {
    const result = applyProjectRenderPolicyToMotionScenes({
      motionScenes: [{ id: "a", source: "heuristic" }],
      config: {
        aspect_ratio: "16:9",
        niche: "Engenharia",
        render_template_policy: { mode: "legacy" },
      },
      pickStudioTemplateByCategory: () => null,
    });
    assert.equal(result.motion_scenes.length, 1);
    assert.equal(result.policy.mode, "legacy");
  });

  it("countInjectedPolicyLayers", () => {
    assert.equal(
      countInjectedPolicyLayers({
        intro: {},
        end_card: {},
        chapters: [{}, {}],
        effects: [{}],
      }),
      5
    );
  });
});
