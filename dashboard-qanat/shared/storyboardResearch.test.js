import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectStoryboardResearch,
  buildMotionResearchContext,
  filterFactsForBlock,
  isResearchCandidateRelevant,
} from "./storyboardResearch.js";

describe("storyboardResearch", () => {
  it("prioriza snippets sobre titulos como fatos", () => {
    const bundle = collectStoryboardResearch({
      research_sources: [
        {
          title: "Palácio II — Wikipedia",
          url: "https://example.com/wiki",
          snippet:
            "O Palácio II desabou em 1998 com 8 vítimas fatais após falha estrutural no parque aquático.",
        },
        {
          title: "Genérico sobre parques aquáticos",
          url: "https://example.com/generic",
          snippet:
            "Parques aquáticos são comuns no Brasil e atraem milhões de visitantes todos os anos.",
        },
      ],
    });

    assert.ok(bundle.facts.length >= 1);
    assert.ok(
      bundle.facts.some((fact) =>
        /pal[aá]cio\s*ii|1998|8\s+v[ií]timas/i.test(fact)
      )
    );
  });

  it("filtra fatos contraditórios de outro objeto", () => {
    const facts = [
      "A fortaleza estelar de Palmanova tem formato octogonal.",
      "O Palácio II em São Paulo desabou em 1998.",
    ];
    const filtered = filterFactsForBlock(
      facts,
      {
        primaryTopic: "Palácio II",
        narration: "O Palácio II desabou em São Paulo.",
      },
      "Colapso do Palácio II"
    );
    assert.ok(filtered.some((f) => /pal[aá]cio\s*ii/i.test(f)));
    assert.equal(
      filtered.some((f) => /palmanova/i.test(f)),
      false
    );
  });

  it("buildMotionResearchContext agrupa por cena", () => {
    const ctx = buildMotionResearchContext(
      {
        title: "Colapso do Palácio II",
        research_sources: [
          {
            title: "IBCCRIM",
            snippet: "Laudo apontou falha estrutural no Palácio II em 1998.",
          },
        ],
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            narration_text: "O Palácio II desabou em 1998.",
          },
        ],
      },
      { video_title: "Colapso do Palácio II" }
    );

    assert.equal(ctx.videoTopic, "Colapso do Palácio II");
    assert.ok(ctx.globalFacts.length >= 1);
    const block = ctx.bySceneRef.get("1.1");
    assert.ok(block?.facts?.length >= 1);
  });

  it("rejeita candidato com objeto narrativo diferente", () => {
    const ok = isResearchCandidateRelevant(
      "A fortaleza de Palmanova na Itália",
      "Colapso do Palácio II em São Paulo"
    );
    assert.equal(ok, false);
  });
});
