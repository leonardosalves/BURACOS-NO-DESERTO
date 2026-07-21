import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

// ── narrationChunks: tolerant matching ──
import {
  narrationsMatch,
  normalizeNarrationForComparison,
} from "./narrationChunks.js";

test("narrationsMatch tolerates accent/punctuation/case differences", () => {
  const a = "Passando pelas blindagens de aço, entramos no labirinto.";
  const b = "passando pelas blindagens de aco entramos no labirinto";
  assert.ok(narrationsMatch(a, b));
});

test("narrationsMatch detects real content alterations", () => {
  const a = "Entramos no labirinto de túneis.";
  const b = "Entramos no labirinto de cavernas.";
  assert.ok(!narrationsMatch(a, b));
});

test("normalizeNarrationForComparison strips accents and punctuation", () => {
  assert.equal(
    normalizeNarrationForComparison("Olá, mundo! Tudo bem?"),
    "ola mundo tudo bem"
  );
});

test("narrationsMatch handles empty strings", () => {
  assert.ok(narrationsMatch("", ""));
  assert.ok(!narrationsMatch("hello", ""));
});

// ── videoReverseEngineering: extractReverseEngineeringJson ──
import { extractReverseEngineeringJson } from "./videoReverseEngineering.js";

test("extractReverseEngineeringJson parses fenced JSON", () => {
  const raw = '```json\n{"title":"test","scenes":[{"id":"s1"}]}\n```';
  const parsed = extractReverseEngineeringJson(raw);
  assert.equal(parsed.title, "test");
  assert.equal(parsed.scenes.length, 1);
});

test("extractReverseEngineeringJson returns null for invalid input", () => {
  assert.equal(extractReverseEngineeringJson("no json here"), null);
});

// ── reverseEngineeringCache: round-trip ──
import {
  getCacheKey,
  readCache,
  writeCache,
} from "./reverseEngineeringCache.js";

test("cache round-trip works", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rev-cache-"));
  const key = getCacheKey({
    url: "http://example.com/video",
    format: "SHORTS",
    mode: "transformative",
    mediaStrategy: "adaptive",
  });
  const result = { scenes: [{ scene: 1 }] };

  assert.equal(readCache(tmp, key), null); // empty before
  writeCache(tmp, key, result);
  assert.deepEqual(readCache(tmp, key), result); // returns after

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("different formats produce different cache keys", () => {
  const k1 = getCacheKey({
    url: "http://example.com/video",
    format: "SHORTS",
    mode: "transformative",
    mediaStrategy: "adaptive",
  });
  const k2 = getCacheKey({
    url: "http://example.com/video",
    format: "LONGO",
    mode: "transformative",
    mediaStrategy: "adaptive",
  });
  assert.notEqual(k1, k2);
});
