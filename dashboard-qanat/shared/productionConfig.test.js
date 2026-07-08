import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  freezeStoryboardNarration,
  isAiOverlaysEnabled,
  resolveProductionConfig,
  restoreStoryboardNarration,
  stripAiOverlaysFromStoryboard,
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

  it("ai_overlays_enabled false por padrão", () => {
    assert.equal(isAiOverlaysEnabled({}), false);
    assert.equal(
      isAiOverlaysEnabled({
        production_pipeline: { ai_overlays_enabled: true },
      }),
      true
    );
  });

  it("stripAiOverlaysFromStoryboard limpa overlays IA", () => {
    const next = stripAiOverlaysFromStoryboard({
      overlays_ai: [{ id: "ov-1", type: "counter" }],
      overlays: [
        { id: "sys-hud", type: "hud" },
        { id: "ov-2", type: "lower-third" },
      ],
      overlays_planned_at: "2026-01-01",
      overlays_plan_token: "tok",
    });
    assert.deepEqual(next.overlays_ai, []);
    assert.equal(next.overlays.length, 1);
    assert.equal(next.overlays[0].id, "sys-hud");
    assert.equal(next.overlays_planned_at, undefined);
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
