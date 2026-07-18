import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateCaptionClips } from "../backend/timelineStudioMigration.js";

describe("timeline studio captions", () => {
  it("não soma duas vezes timestamps absolutos e corta no fim da narração", () => {
    const clips = migrateCaptionClips(
      [
        {
          start_time: 40,
          duration: 10,
          text: "hoje extinto",
          words: [
            { word: "hoje", start: 48, end: 49 },
            { word: "extinto", start: 49, end: 50 },
            { word: "repetida", start: 50.1, end: 50.2 },
          ],
        },
      ],
      50
    );
    assert.deepEqual(
      clips.map((clip) => clip.label),
      ["hoje", "extinto"]
    );
    assert.equal(clips[0].start, 48);
    assert.equal(clips[1].start, 49);
    assert.equal(clips[1].start + clips[1].duration, 50);
  });

  it("respeita exclusão persistida de uma legenda", () => {
    const transcript = [
      {
        start_time: 0,
        duration: 1,
        text: "uma frase",
        words: [
          { word: "uma", start: 0, end: 0.5 },
          { word: "frase", start: 0.5, end: 1 },
        ],
      },
    ];
    const first = migrateCaptionClips(transcript, 1);
    const next = migrateCaptionClips(transcript, 1, [first[1].id]);
    assert.deepEqual(
      next.map((clip) => clip.label),
      ["uma"]
    );
  });

  it("mantém exclusão mesmo quando o ID da legenda muda", () => {
    const transcript = [
      {
        start_time: 0,
        duration: 1,
        text: "uma frase",
        words: [
          { word: "uma", start: 0, end: 0.5 },
          { word: "frase", start: 0.5, end: 1 },
        ],
      },
    ];
    const next = migrateCaptionClips(transcript, 1, [], ["0.50|frase"]);
    assert.deepEqual(
      next.map((clip) => clip.label),
      ["uma"]
    );
  });
});
