import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTimelineAssetSlotsFromVisualPrompts,
  inferAssetMediaType,
  attachProductionToVisualPrompts,
  pruneMotionOnlyAssetSlots,
} from "../backend/productionOrchestrator.js";

describe("productionOrchestrator", () => {
  it("inferAssetMediaType distingue vídeo e imagem", () => {
    assert.equal(inferAssetMediaType({ type: "vídeo IA" }), "video");
    assert.equal(inferAssetMediaType({ type: "imagem IA 2k" }), "image");
  });

  it("buildTimelineAssetSlotsFromVisualPrompts cria slots pendentes por cena", () => {
    const slots = buildTimelineAssetSlotsFromVisualPrompts(
      [
        {
          scene: "1.1",
          block: 1,
          narration_text: "Você está olhando para os mapas.",
          prompt: "Hands holding tablet with map",
          type: "imagem IA 2k",
        },
        {
          scene: "1.2",
          block: 1,
          narration_text: "O Google Maps esconde uma fortaleza.",
          prompt: "Satellite star fort",
          type: "vídeo IA",
        },
      ],
      {},
      [
        {
          id: "ms-1.2",
          scene_ref: "1.2",
          template_id: "location-intro",
          trigger: "location",
          props: { location: "Palmanova" },
        },
      ]
    );
    assert.equal(slots["1"].length, 2);
    assert.equal(slots["1"][0].scene_ref, "1.1");
    assert.equal(slots["1"][0].asset, "");
    assert.equal(
      slots["1"][0].generation_prompt,
      "Hands holding tablet with map"
    );
    assert.equal(slots["1"][1].motion_template_id, "location-intro");
    assert.equal(slots["1"][1].production.template_props.location, "Palmanova");
  });

  it("pruneMotionOnlyAssetSlots remove slot vazio de motion quando bloco já tem asset", () => {
    const pruned = pruneMotionOnlyAssetSlots({
      1: [
        {
          scene_ref: "1.1",
          asset: "",
          motion_template_id: "location-intro",
          orchestrated: true,
        },
        {
          asset: "video.mp4",
          user_locked: true,
        },
      ],
    });
    assert.equal(pruned["1"].length, 1);
    assert.equal(pruned["1"][0].asset, "video.mp4");
  });

  it("não sobrescreve slot user_locked", () => {
    const existing = {
      1: [
        {
          scene_ref: "1.1",
          asset: "meu_arquivo.jpg",
          user_locked: true,
        },
      ],
    };
    const slots = buildTimelineAssetSlotsFromVisualPrompts(
      [
        {
          scene: "1.1",
          block: 1,
          narration_text: "Trecho",
          prompt: "Novo prompt",
          type: "imagem IA 2k",
        },
      ],
      existing,
      []
    );
    assert.equal(slots["1"][0].asset, "meu_arquivo.jpg");
    assert.equal(slots["1"][0].generation_prompt, "Novo prompt");
  });

  it("attachProductionToVisualPrompts injeta metadados de produção", () => {
    const next = attachProductionToVisualPrompts(
      {
        visual_prompts: [
          { scene: "2.1", block: 2, narration_text: "62% dos dados" },
        ],
      },
      [
        {
          id: "ms-2.1",
          scene_ref: "2.1",
          template_id: "counter",
          trigger: "stat_number",
          props: { value: 62 },
        },
      ]
    );
    assert.equal(
      next.visual_prompts[0].production.motion_template_id,
      "counter"
    );
    assert.equal(next.visual_prompts[0].production.data_type, "stat_number");
  });
});
