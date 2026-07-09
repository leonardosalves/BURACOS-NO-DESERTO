import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectStoryboardResearch } from "./storyboardResearch.js";

describe("storyboardResearchEnsure (integração leve)", () => {
  it("collectStoryboardResearch usa research_facts persistidos", () => {
    const bundle = collectStoryboardResearch({
      research_sources: [
        {
          title: "Caltrans Golden Gate",
          url: "https://example.com/gg",
          snippet:
            "A ponte Golden Gate suporta 40 mil veículos por dia desde 1937.",
        },
      ],
      research_facts: [
        "A ponte Golden Gate suporta 40 mil veículos por dia desde 1937.",
        "O vão principal mede 1.280 metros entre as torres principais.",
      ],
    });
    assert.ok(bundle.facts.length >= 2);
    assert.ok(bundle.sources.length >= 1);
  });
});
