import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyNarrationSegment,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
  applyMotionScenesToVisualPrompts,
  isPrimaryRemotionMotionScene,
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

  it("fullscreen remotion vira clip de vídeo e remove B-roll sobreposto", () => {
    const motionScenes = [
      {
        id: "ms-3.2",
        scene_ref: "3.2",
        block: 3,
        start_hint: 35,
        duration_seconds: 5,
        layout: "fullscreen",
        template_id: "location-intro",
        media_mode: "remotion",
        props: { location: "Palmanova" },
      },
    ];
    const studio = {
      version: 1,
      clips: [
        {
          id: "video-3-0",
          trackId: "video",
          start: 34,
          duration: 6,
          source: "ASSETS/cena_3.jpg",
          props: { type: "image", blockKey: 3 },
        },
      ],
    };
    const synced = syncMotionScenesToStudio(studio, motionScenes);
    const videoClips = synced.clips.filter((c) => c.trackId === "video");
    assert.equal(videoClips.length, 1);
    assert.equal(videoClips[0].props?.media_mode, "remotion");
    assert.equal(videoClips[0].templateId, "location-intro");
    assert.equal(
      synced.clips.filter((c) => c.trackId === "overlays").length,
      0
    );
  });

  it("marca visual_prompts com media_mode remotion", () => {
    const storyboard = {
      visual_prompts: [
        { scene: "3.2", block: 3, narration_text: "Palmanova" },
        { scene: "4.1", block: 4, narration_text: "Outro trecho" },
      ],
    };
    const motionScenes = [
      {
        id: "ms-3.2",
        scene_ref: "3.2",
        layout: "fullscreen",
        template_id: "location-intro",
        media_mode: "remotion",
      },
    ];
    const next = applyMotionScenesToVisualPrompts(storyboard, motionScenes);
    assert.equal(next.visual_prompts[0].media_mode, "remotion");
    assert.equal(next.visual_prompts[1].media_mode, undefined);
  });

  it("pip layout permanece overlay, não vídeo primário", () => {
    assert.equal(
      isPrimaryRemotionMotionScene({
        media_mode: "remotion",
        layout: "pip",
        template_id: "geo-map",
      }),
      false
    );
    assert.equal(
      isPrimaryRemotionMotionScene({
        media_mode: "remotion",
        layout: "fullscreen",
        template_id: "location-intro",
      }),
      true
    );
  });
});
