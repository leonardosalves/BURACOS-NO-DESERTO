import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyNarrationSegment,
  planMotionScenesFromStoryboard,
} from "../backend/motionScenePlanner.js";

describe("motionScenePlanner", () => {
  it("detecta estatística com porcentagem", () => {
    const r = classifyNarrationSegment(
      "No Brasil, 62% dos usuários não protegem seus dados."
    );
    assert.equal(r?.trigger, "stat_number");
    assert.ok(r.confidence >= 0.65);
  });

  it("detecta menção a mapa / local", () => {
    const r = classifyNarrationSegment(
      "O Google Maps esconde uma fortaleza estelar com precisão absurda."
    );
    assert.equal(r?.trigger, "location");
  });

  it("detecta curiosidade curta", () => {
    const r = classifyNarrationSegment("Um segredo incrível foi revelado.");
    assert.equal(r?.trigger, "curiosity_punch");
  });

  it("planeja motion_scenes a partir de visual_prompts", () => {
    const storyboard = {
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          narration_text: "No Brasil, 62% não protegem dados.",
          speech_start: 0,
          duration_seconds: 4,
        },
        {
          scene: "1.2",
          block: 1,
          narration_text:
            "O Google Maps revela uma fortaleza estelar em Palmanova.",
          speech_start: 4,
          duration_seconds: 6,
        },
      ],
    };
    const plan = planMotionScenesFromStoryboard(storyboard, {
      niche: "Engenharia",
      accent_color: "#D4AF37",
    });
    assert.ok(plan.motion_scenes.length >= 2);
    const templates = plan.motion_scenes.map((s) => s.template_id);
    assert.ok(templates.includes("counter") || templates.includes("bar-chart"));
    assert.ok(templates.includes("location-intro"));
  });
});
