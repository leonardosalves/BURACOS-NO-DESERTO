import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGeminiKeyPool,
  normalizeApiKeys,
  shouldRotateGeminiKey,
} from "./geminiApiKeys.js";

describe("geminiApiKeys", () => {
  it("normalizeApiKeys deduplica e trim", () => {
    const keys = normalizeApiKeys([" a ", "b"], "a,b", "c");
    assert.deepEqual(keys, ["a", "b", "c"]);
  });

  it("buildGeminiKeyPool coloca chave preferida primeiro", () => {
    const pool = buildGeminiKeyPool("key-b", ["key-a", "key-b", "key-c"]);
    assert.equal(pool[0], "key-b");
    assert.equal(pool.length, 3);
  });

  it("shouldRotateGeminiKey em quota e overload", () => {
    assert.equal(shouldRotateGeminiKey(429), true);
    assert.equal(shouldRotateGeminiKey(503), true);
    assert.equal(shouldRotateGeminiKey(400), false);
  });
});