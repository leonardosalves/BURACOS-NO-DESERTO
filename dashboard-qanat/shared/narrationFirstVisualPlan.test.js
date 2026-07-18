import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyNarrationFirstVisualPlan,
  buildNarrationFirstScenePlan,
  TEMPORAL_MARKER,
} from "./narrationFirstVisualPlan.js";

describe("Diretor Temporal narracao-first", () => {
  const chunkPlan = {
    timing_source: "whisper",
    chunks: [
      {
        id: "chunk-01",
        scene_ref: "1.1",
        observed_pause_after_ms: 500,
      },
    ],
  };

  it("usa fala real + pausa e divide cena longa sem cortar acao", () => {
    const plan = buildNarrationFirstScenePlan(
      {
        scene: "1.1",
        type: "video IA",
        speech_start: 2,
        speech_end: 14.5,
      },
      { chunkPlan, maxClipSeconds: 8 }
    );
    assert.equal(plan.target_duration_seconds, 13);
    assert.equal(plan.clip_count_required, 2);
    assert.equal(plan.clips.at(-1).end_s, 13);
    assert.ok(plan.critical_action_deadline_seconds <= 12.5);
  });

  it("enriquece prompt uma unica vez e sincroniza o slot", () => {
    const input = {
      storyboard: {
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            type: "video IA",
            prompt: "A real highway, cinematic tracking shot.",
            speech_start: 0,
            speech_end: 12.5,
            duration_seconds: 12.5,
          },
        ],
      },
      timelineAssets: { 1: [{ type: "video", fixed: 8 }] },
      chunkPlan,
    };
    const first = applyNarrationFirstVisualPlan(input);
    const second = applyNarrationFirstVisualPlan({
      storyboard: first.storyboard,
      timelineAssets: first.timelineAssets,
      chunkPlan,
    });
    assert.equal(first.timelineAssets[1][0].fixed, 13);
    assert.equal(
      first.storyboard.visual_prompts[0].video_prompt_variants.length,
      2
    );
    assert.equal(
      second.storyboard.visual_prompts[0].prompt.split(TEMPORAL_MARKER).length,
      2
    );
  });

  it("nao planeja antes do Whisper", () => {
    const result = applyNarrationFirstVisualPlan({
      storyboard: { visual_prompts: [] },
      chunkPlan: { timing_source: "chunk-plan-fallback", chunks: [] },
    });
    assert.equal(result.applied, false);
  });
});
