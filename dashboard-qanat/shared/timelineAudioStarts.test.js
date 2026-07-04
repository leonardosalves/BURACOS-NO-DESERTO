import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAssetDuration,
  recalculateBlockSequentialAudioStarts,
} from "./timelineAudioStarts.js";
import { flattenWordTranscripts } from "./wordTranscripts.js";

describe("timelineAudioStarts", () => {
  it("computeAssetDuration respeita fixed e distribui flex", () => {
    const assets = [{ fixed: 3 }, {}, {}];
    assert.equal(computeAssetDuration(assets[0], assets, 12), 3);
    assert.equal(computeAssetDuration(assets[1], assets, 12), 4.5);
  });

  it("recalculateBlockSequentialAudioStarts ancora e avança cursor", () => {
    const out = recalculateBlockSequentialAudioStarts({
      assets: [{}, { fixed: 2 }],
      blockDuration: 10,
      anchorStart: 5,
    });
    assert.equal(out[0].audio_start, 5);
    assert.equal(out[1].audio_start, 13);
  });

  it("preserveUntilIndex mantém slots anteriores", () => {
    const out = recalculateBlockSequentialAudioStarts({
      assets: [{ audio_start: 1.5 }, {}, {}],
      blockDuration: 9,
      anchorStart: 0,
      preserveUntilIndex: 0,
    });
    assert.equal(out[0].audio_start, 1.5);
    assert.ok(out[1].audio_start > 1.5);
  });

  it("clearSpeechSync remove flags de sincronização", () => {
    const out = recalculateBlockSequentialAudioStarts({
      assets: [{ synced_to_speech: true, speech_end: 2, fixed: 1 }],
      blockDuration: 5,
      anchorStart: 0,
      clearSpeechSync: true,
    });
    assert.equal(out[0].synced_to_speech, undefined);
    assert.equal(out[0].speech_end, undefined);
  });
});

describe("wordTranscripts", () => {
  it("flattenWordTranscripts absolutiza timestamps relativos", () => {
    const flat = flattenWordTranscripts([
      {
        start_time: 10,
        duration: 2,
        words: [{ word: " olá", start: 0, end: 0.5 }, { word: " mundo", start: 0.5, end: 1 }],
      },
    ]);
    assert.equal(flat.length, 2);
    assert.equal(flat[0].start, 10);
    assert.equal(flat[1].start, 10.5);
    assert.equal(flat[0].clean, "ola");
  });

  it("synthesizeFromText quando não há words[]", () => {
    const flat = flattenWordTranscripts(
      [{ start_time: 0, duration: 2, text: " um dois" }],
      { synthesizeFromText: true },
    );
    assert.equal(flat.length, 2);
    assert.ok(flat[1].start > flat[0].start);
  });
});