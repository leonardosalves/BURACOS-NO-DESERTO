import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reconcileTimelineAssetsToStoryboard } from "./projectConfigBootstrap.js";

describe("reconcileTimelineAssetsToStoryboard", () => {
  it("corrige regressão: 7 cenas e 14 slots viram 7 sem alterar assets ou timings", () => {
    const visualPrompts = [1, 1, 2, 3, 4, 5, 5].map((block, index) => ({
      block,
      scene: `${block}.${index + 1}`,
    }));
    const timelineAssets = {
      1: [
        { asset: "a.jpg", start: 0, fixed: 2.8 },
        { asset: "b.jpg", start: 2.8, fixed: 3.6 },
        {},
        {},
      ],
      2: [{ asset: "c.mp4", start: 6.4, fixed: 6.4 }, {}],
      3: [{ asset: "d.jpg", start: 12.8, fixed: 9.2 }, {}],
      4: [{ asset: "e.jpg", start: 22, fixed: 8.5 }, {}],
      5: [
        { asset: "f.mp4", start: 30.5, fixed: 2.8 },
        { asset: "g.jpg", start: 33.3, fixed: 2.8 },
        {},
        {},
      ],
    };

    const beforeReal = Object.values(timelineAssets)
      .flat()
      .filter((slot) => slot.asset)
      .map((slot) => ({ ...slot }));
    const result = reconcileTimelineAssetsToStoryboard(
      timelineAssets,
      visualPrompts
    );
    const afterReal = Object.values(result.timeline)
      .flat()
      .filter((slot) => slot.asset);

    assert.equal(result.removed, 7);
    assert.equal(Object.values(result.timeline).flat().length, 7);
    assert.deepEqual(afterReal, beforeReal);
  });

  it("preserva mídia, slot manual e motion adicionados além das cenas", () => {
    const result = reconcileTimelineAssetsToStoryboard(
      {
        1: [
          { asset: "scene.jpg", start: 0, fixed: 4 },
          { asset: "extra.mp4", user_locked: true },
          { asset: "", manual_asset: true },
          { asset: "", motion_template_id: "title" },
          {},
        ],
      },
      [{ block: 1 }]
    );

    assert.equal(result.removed, 1);
    assert.equal(result.timeline["1"].length, 4);
    assert.equal(result.timeline["1"][0].fixed, 4);
    assert.equal(result.timeline["1"][1].asset, "extra.mp4");
  });
});
