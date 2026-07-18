import test from "node:test";
import assert from "node:assert/strict";
import { alignExclusiveAudioTimeline } from "./exclusiveAudioTimeline.js";

test("desloca SFX mesmo quando as cenas já chegaram deslocadas", () => {
  const raw = {
    captions: [{ startMs: 1000, endMs: 1500, text: "fala" }],
    sfxTracks: [{ start: 19, duration: 3, file: "fire.wav" }],
    bgmTracks: [{ start: 10, duration: 20, file: "music.mp3" }],
    bgmDuckPoints: [1000, 12],
  };
  const laidOut = {
    ...raw,
    scenes: [{ start: 3.5, duration: 20 }],
    exclusiveLayout: { introDur: 3.5 },
  };
  const result = alignExclusiveAudioTimeline(raw, laidOut);
  assert.equal(result.sfxTracks[0].start, 22.5);
  assert.equal(result.captions[0].startMs, 4500);
  assert.equal(result.bgmTracks[0].start, 13.5);
  assert.deepEqual(result.bgmDuckPoints, [4500, 15.5]);
});
