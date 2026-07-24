import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTimestampToSeconds,
  getFfmpegPath,
} from "./frameExtractorService.js";

test("parseTimestampToSeconds lida com diversos formatos de tempo", () => {
  assert.equal(parseTimestampToSeconds(""), null);
  assert.equal(parseTimestampToSeconds(null), null);
  assert.equal(parseTimestampToSeconds(15), 15);
  assert.equal(parseTimestampToSeconds("30"), 30);
  assert.equal(parseTimestampToSeconds("1:30"), 90);
  assert.equal(parseTimestampToSeconds("01:02:03"), 3723);
  assert.equal(parseTimestampToSeconds("0:15"), 15);
});

test("getFfmpegPath retorna executável válido", () => {
  const bin = getFfmpegPath();
  assert.ok(typeof bin === "string" && bin.length > 0);
});
