import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyExclusiveIntroEndToMotionScenes,
  applyExclusiveIntroEndToRemotionProps,
} from "./exclusiveIntroEndLayout.js";

describe("exclusiveIntroEndLayout", () => {
  it("motion: intro no 0, conteúdo empurrado, end card após conteúdo", () => {
    const scenes = applyExclusiveIntroEndToMotionScenes([
      {
        id: "ms-policy-intro",
        source: "policy_intro",
        start_hint: 0,
        duration_seconds: 3.5,
        props: { studio_role: "intro" },
      },
      {
        id: "fx",
        start_hint: 2,
        duration_seconds: 4,
        props: { studio_role: "scene_effect" },
      },
      {
        id: "ms-policy-end-card",
        source: "policy_end_card",
        start_hint: 20,
        duration_seconds: 5,
        props: { studio_role: "end_card" },
      },
    ]);

    const intro = scenes.find((s) => s.id === "ms-policy-intro");
    const fx = scenes.find((s) => s.id === "fx");
    const end = scenes.find((s) => s.id === "ms-policy-end-card");

    assert.equal(intro.start_hint, 0);
    assert.equal(intro.props.mute_all_audio, true);
    assert.equal(fx.start_hint, 5.5); // 2 + 3.5
    // content end = 2+4=6 + intro 3.5 = 9.5
    assert.equal(end.start_hint, 9.5);
    assert.equal(end.props.music_only, true);
  });

  it("remotion: silêncio na intro, BGM só depois, end card sem B-roll embaixo", () => {
    const out = applyExclusiveIntroEndToRemotionProps({
      totalDuration: 30,
      narrationDuration: 28,
      scenes: [
        { start: 0, duration: 10, asset: "a.jpg" },
        { start: 10, duration: 18, asset: "b.jpg" },
      ],
      captions: [{ startMs: 0, endMs: 2000, text: "oi" }],
      sfxTracks: [{ start: 1, duration: 0.5, file: "x.mp3" }],
      bgmTracks: [{ start: 0, duration: 30, file: "m.mp3" }],
      overlays: [
        {
          id: "intro",
          start: 0,
          duration: 3.5,
          studio_role: "intro",
          props: { studio_role: "intro" },
        },
        {
          id: "end",
          start: 25,
          duration: 5,
          studio_role: "end_card",
          props: { studio_role: "end_card" },
        },
        {
          id: "fx",
          start: 5,
          duration: 3,
          studio_role: "scene_effect",
          props: { studio_role: "scene_effect" },
        },
      ],
    });

    assert.equal(out.exclusiveLayout.introDur, 3.5);
    assert.equal(out.narrationStart, 3.5);
    // B-roll empurrado
    assert.equal(out.scenes[0].start, 3.5);
    assert.equal(out.scenes[1].start, 13.5);
    // content end 28 + 3.5 = 31.5
    assert.ok(out.exclusiveLayout.endStart >= 31.4);
    const end = out.overlays.find((o) => o.id === "end");
    assert.equal(end.start, out.exclusiveLayout.endStart);
    // BGM não toca na intro
    assert.ok(out.bgmTracks[0].start >= 3.5);
    assert.ok(out.bgmTracks[0].fadeOutS >= 4);
    // total cobre end card
    assert.ok(out.totalDuration >= out.exclusiveLayout.endStart + 5 - 0.01);
    // SFX não na intro
    assert.ok(out.sfxTracks[0].start >= 3.5);
  });

  it("remotion idempotente se cenas já estão após intro", () => {
    const once = applyExclusiveIntroEndToRemotionProps({
      totalDuration: 40,
      narrationDuration: 30,
      scenes: [{ start: 3.5, duration: 20, asset: "a.jpg" }],
      overlays: [
        {
          id: "intro",
          start: 0,
          duration: 3.5,
          studio_role: "intro",
          props: { studio_role: "intro", exclusive_segment: true },
        },
        {
          id: "end",
          start: 33.5,
          duration: 5,
          studio_role: "end_card",
          props: { studio_role: "end_card", exclusive_segment: true },
        },
      ],
      bgmTracks: [{ start: 3.5, duration: 35, file: "m.mp3" }],
    });
    const twice = applyExclusiveIntroEndToRemotionProps(once);
    assert.equal(twice.scenes[0].start, 3.5);
    assert.equal(twice.narrationStart, 3.5);
  });
});
