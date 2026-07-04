import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAssetNarrationText,
  getBlockNarrationText,
  getBlockNarrationAnchor,
} from "./timelineNarration.js";

const flatWords = [
  { word: "olá", start: 10, end: 10.3 },
  { word: "mundo", start: 10.35, end: 10.7 },
  { word: "segundo", start: 25, end: 25.4 },
  { word: "bloco", start: 25.45, end: 25.8 },
];

describe("timelineNarration", () => {
  it("getBlockNarrationText prioriza visual_prompts", () => {
    const text = getBlockNarrationText(1, {
      visualPrompts: [{ block: 1, narration_text: "Olá mundo" }],
      blockPhrases: [{ block: 1, phrase: "fallback" }],
    });
    assert.equal(text, "Olá mundo");
  });

  it("getAssetNarrationText usa narration_segment", () => {
    const text = getAssetNarrationText(1, 0, {
      timelineAssets: { "1": [{ narration_segment: "trecho A" }, { narration_segment: "trecho B" }] },
    });
    assert.equal(text, "trecho A");
  });

  it("getBlockNarrationAnchor casa texto do bloco dentro dos bounds", () => {
    const anchor = getBlockNarrationAnchor(1, [], flatWords, {
      visualPrompts: [{ block: 1, narration_text: "Olá mundo" }],
      blockStart: 9,
      blockEnd: 20,
    });
    assert.equal(anchor, 10);
  });

  it("getBlockNarrationAnchor usa menor start entre assets", () => {
    const anchor = getBlockNarrationAnchor(
      2,
      [{}, {}],
      flatWords,
      {
        timelineAssets: {
          "2": [
            { narration_segment: "segundo bloco" },
            { narration_segment: "ignorado" },
          ],
        },
        blockStart: 24,
        blockEnd: 30,
      },
    );
    assert.equal(anchor, 25);
  });

  it("getBlockNarrationAnchor retorna null sem match", () => {
    const anchor = getBlockNarrationAnchor(3, [], flatWords, {
      blockPhrases: [{ block: 3, phrase: "texto inexistente no whisper" }],
      blockStart: 0,
      blockEnd: 5,
    });
    assert.equal(anchor, null);
  });
});