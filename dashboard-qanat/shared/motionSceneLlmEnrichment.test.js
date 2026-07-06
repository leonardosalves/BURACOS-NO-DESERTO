import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyLlmEnrichmentToPlan,
  dedupeMotionScenesAgainstOverlays,
  parseMotionSceneLlmPayload,
  buildMotionSceneEnrichmentPrompt,
} from "../backend/motionSceneLlmEnrichment.js";

describe("motionSceneLlmEnrichment", () => {
  it("dedupe remove motion scene duplicada em overlays_ai", () => {
    const motionScenes = [
      {
        id: "ms-3.2",
        scene_ref: "3.2",
        block: 3,
        template_id: "location-intro",
        start_hint: 35,
      },
      {
        id: "ms-4.2",
        scene_ref: "4.2",
        block: 4,
        template_id: "counter",
        start_hint: 54,
      },
    ];
    const overlaysAi = [
      {
        id: "loc-1",
        type: "location-intro",
        start: "3.2",
        duration: 5,
        props: { location: "Palmanova" },
      },
    ];
    const { scenes, removed } = dedupeMotionScenesAgainstOverlays(
      motionScenes,
      overlaysAi
    );
    assert.equal(scenes.length, 1);
    assert.equal(scenes[0].template_id, "counter");
    assert.equal(removed.length, 1);
    assert.equal(removed[0].id, "ms-3.2");
  });

  it("parseMotionSceneLlmPayload extrai motion_scenes", () => {
    const raw =
      '```json\n{"motion_scenes":[{"id":"ms-1","template_id":"counter","props":{"value":62}}],"notes":"ok"}\n```';
    const parsed = parseMotionSceneLlmPayload(raw);
    assert.ok(Array.isArray(parsed.motion_scenes));
    assert.equal(parsed.motion_scenes[0].template_id, "counter");
  });

  it("applyLlmEnrichmentToPlan mescla props do LLM", () => {
    const heuristic = {
      motion_scenes: [
        {
          id: "ms-1.1",
          scene_ref: "1.1",
          block: 1,
          template_id: "counter",
          trigger: "stat_number",
          start_hint: 0,
          narration_text: "No Brasil, 62% não protegem dados.",
          props: { value: 62, label: "DADO" },
        },
      ],
      source: "heuristic",
      niche_pack: "data-journalist",
    };
    const llm = {
      motion_scenes: [
        {
          id: "ms-1.1",
          template_id: "counter",
          props: { value: 62, label: "BRASIL", suffix: "%" },
        },
      ],
      notes: "refinado",
    };
    const plan = applyLlmEnrichmentToPlan(heuristic, llm, {
      config: { accent_color: "#D4AF37" },
    });
    assert.equal(plan.source, "heuristic+llm");
    assert.equal(plan.motion_scenes[0].props.label, "BRASIL");
    assert.equal(plan.motion_scenes[0].props.suffix, "%");
  });

  it("applyLlmEnrichmentToPlan ignora cenas extras do LLM", () => {
    const heuristic = {
      motion_scenes: [
        {
          id: "ms-3.2",
          scene_ref: "3.2",
          template_id: "location-intro",
          start_hint: 35.7,
          props: { location: "Palmanova" },
        },
      ],
      source: "heuristic",
    };
    const llm = {
      motion_scenes: [
        {
          id: "ms-3.2",
          template_id: "location-intro",
          start_hint: 35.7,
          props: { location: "Palmanova", fly_mode: "earth_descent" },
        },
        {
          id: "ms-extra",
          template_id: "kinetic-text",
          start_hint: 0,
          props: { text: "CHOCANTE" },
        },
      ],
    };
    const plan = applyLlmEnrichmentToPlan(heuristic, llm, { config: {} });
    assert.equal(plan.motion_scenes.length, 1);
    assert.equal(plan.motion_scenes[0].id, "ms-3.2");
    assert.equal(plan.motion_scenes[0].props.fly_mode, "earth_descent");
  });

  it("buildMotionSceneEnrichmentPrompt inclui overlays_ai", () => {
    const prompt = buildMotionSceneEnrichmentPrompt({
      heuristicPlan: {
        motion_scenes: [
          { id: "ms-1", template_id: "counter", scene_ref: "1.1" },
        ],
        niche_pack: "industrial-impact",
      },
      storyboard: {
        visual_prompts: [{ scene: "1.1", narration_text: "teste" }],
      },
      config: { niche: "Engenharia" },
      overlaysAi: [
        { type: "lower-third", start: "2.1", props: { title: "Fato" } },
      ],
    });
    assert.match(prompt, /OVERLAYS_AI/);
    assert.match(prompt, /lower-third/);
  });
});
