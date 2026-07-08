import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  freezeStoryboardNarration,
  resolveProductionConfig,
  restoreStoryboardNarration,
} from "./productionConfig.js";

describe("productionConfig", () => {
  it("restaura narrative_script após pipeline", () => {
    const frozen = freezeStoryboardNarration({
      narrative_script: "Texto aprovado pelo usuário.",
      narrative_script_tagged: "[calm] Texto aprovado",
    });
    const mutated = {
      narrative_script: "Texto reescrito pela IA",
      narrative_script_tagged: "outro",
      visual_prompts: [{ scene: "1.1", type: "image" }],
    };
    const restored = restoreStoryboardNarration(mutated, frozen);
    assert.equal(restored.narrative_script, "Texto aprovado pelo usuário.");
    assert.equal(restored.narrative_script_tagged, "[calm] Texto aprovado");
  });

  it("auto template pack quando catálogo tem templates prontos", () => {
    const cfg = resolveProductionConfig(
      { niche: "Engenharia" },
      {},
      {
        catalogResolver: () => ({
          niche: "Engenharia",
          orchestration_ready: [{ id: "t1", motion_template_id: "counter" }],
        }),
      }
    );
    assert.equal(cfg.motion_template_pack?.enabled, true);
    assert.equal(cfg.motion_template_pack?.auto, true);
  });

  it("respeita enabled false explícito do usuário", () => {
    const cfg = resolveProductionConfig(
      { motion_template_pack: { enabled: false } },
      {},
      {
        catalogResolver: () => ({
          orchestration_ready: [{ motion_template_id: "counter" }],
        }),
      }
    );
    assert.equal(cfg.motion_template_pack?.enabled, false);
  });
});
