import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeOrchestratedTimelineSlots,
  isEmptyOrchestratedSlot,
} from "./timelineAssetDedupe.js";
import { pruneMotionOnlyAssetSlots } from "../backend/productionOrchestrator.js";
import { normalizeTimelineAssetSlots } from "./timelineAssetDedupe.js";

describe("timelineAssetDedupe", () => {
  it("isEmptyOrchestratedSlot detecta placeholder sem arquivo", () => {
    assert.equal(
      isEmptyOrchestratedSlot({
        scene_ref: "3.1",
        orchestrated: true,
        generation_prompt: "x",
      }),
      true
    );
    assert.equal(
      isEmptyOrchestratedSlot({ asset: "a.mp4", user_locked: true }),
      false
    );
  });

  it("remove slot vazio orquestrado quando bloco já tem mp4 user_locked", () => {
    const narr =
      "Como um terremoto em outro país escolheu e derrubou um único prédio de 30 andares em Bangcoc?";
    const { timeline, removed } = dedupeOrchestratedTimelineSlots({
      1: [
        {
          scene_ref: "1.1",
          asset: "",
          orchestrated: true,
          motion_template_id: "location-intro",
          narration_segment: narr,
        },
        {
          asset: "Skyscraper.mp4",
          user_locked: true,
          narration_segment: narr,
          chunk_id: "chunk-01",
        },
      ],
    });
    assert.equal(removed, 0);
    assert.equal(timeline["1"].length, 2);
    assert.equal(timeline["1"][0].motion_template_id, "location-intro");
    assert.equal(timeline["1"][1].asset, "Skyscraper.mp4");
    assert.equal(timeline["1"][1].scene_ref, "1.1");
  });

  it("bloco 3: 2 placeholders + 2 mídias → 2 slots", () => {
    const n1 =
      "O segredo começa no chão de Bangcoc. O solo de argila mole da cidade agiu como uma gelatina gigante.";
    const n2 =
      "Esse terreno macio amplificou as ondas de choque que vinham de longe, empurrando a energia direto para a estrutura.";
    const { timeline, removed } = dedupeOrchestratedTimelineSlots({
      3: [
        {
          scene_ref: "3.1",
          asset: "",
          orchestrated: true,
          narration_segment: n1,
        },
        {
          scene_ref: "3.2",
          asset: "",
          orchestrated: true,
          narration_segment: n2,
        },
        {
          asset: "lab.mp4",
          user_locked: true,
          narration_segment: n1,
          chunk_id: "chunk-04",
        },
        {
          asset: "diagram.jpeg",
          user_locked: true,
          narration_segment: n2,
          chunk_id: "chunk-05",
        },
      ],
    });
    assert.equal(removed, 2);
    assert.equal(timeline["3"].length, 2);
    assert.equal(timeline["3"][0].asset, "lab.mp4");
    assert.equal(timeline["3"][1].asset, "diagram.jpeg");
  });

  it("normalizeTimelineAssetSlots combina dedupe + prune motion", () => {
    const { timeline } = normalizeTimelineAssetSlots(
      {
        1: [
          {
            scene_ref: "1.1",
            asset: "",
            motion_template_id: "location-intro",
            orchestrated: true,
            narration_segment: "Texto",
          },
          { asset: "v.mp4", user_locked: true, narration_segment: "Texto" },
        ],
      },
      { pruneMotionOnly: pruneMotionOnlyAssetSlots }
    );
    assert.equal(timeline["1"].length, 2);
    assert.equal(timeline["1"][0].motion_template_id, "location-intro");
    assert.equal(timeline["1"][1].asset, "v.mp4");
  });
});
