import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enrichMotionSceneProps,
  resolvePlaceWithResearch,
} from "./motionResearchProps.js";
import { buildMotionResearchContext } from "./storyboardResearch.js";

describe("motionResearchProps", () => {
  it("resolve Palácio II com research_sources explícitas", () => {
    const ctx = buildMotionResearchContext(
      {
        title: "Colapso do Palácio II",
        research_sources: [
          {
            title: "Folha",
            snippet: "O Palácio II em São Paulo desabou em 1998.",
          },
        ],
      },
      { video_title: "Colapso do Palácio II" }
    );

    const place = resolvePlaceWithResearch(
      "O desastre aconteceu em São Paulo.",
      ctx
    );
    assert.equal(place?.location, "Palácio II");
    assert.equal(place?.country, "Brasil");
  });

  it("preenche counter com dado numérico da pesquisa", () => {
    const ctx = buildMotionResearchContext(
      {
        research_sources: [
          {
            title: "IBCCRIM",
            snippet: "O colapso deixou 8 vítimas fatais em 1998.",
          },
        ],
        visual_prompts: [
          {
            scene: "2.1",
            block: 2,
            narration_text: "O colapso deixou 8 vítimas fatais em 1998.",
          },
        ],
      },
      { video_title: "Palácio II" }
    );

    const scene = enrichMotionSceneProps(
      {
        template_id: "counter",
        scene_ref: "2.1",
        block: 2,
        narration_text: "O colapso deixou 8 vítimas fatais em 1998.",
        props: {},
      },
      ctx
    );

    assert.equal(scene.props.value, 8);
    assert.equal(scene.props.research_backed, true);
  });
});
