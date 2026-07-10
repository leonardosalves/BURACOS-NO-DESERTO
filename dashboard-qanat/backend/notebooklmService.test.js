import test from "node:test";
import assert from "node:assert/strict";
import { assessNotebooklmSourcesReadiness } from "./notebooklmService.js";

test("NotebookLM source readiness waits for every source", () => {
  const readiness = assessNotebooklmSourcesReadiness([
    { id: "a", char_count: 240 },
    { id: "b", char_count: 0, status: "processing" },
  ]);

  assert.equal(readiness.ready, false);
  assert.equal(readiness.pending, 1);
});

test("NotebookLM source readiness accepts fully loaded sources", () => {
  const readiness = assessNotebooklmSourcesReadiness([
    { id: "a", char_count: 240 },
    { id: "b", char_count: 180 },
  ]);

  assert.equal(readiness.ready, true);
  assert.equal(readiness.total, 2);
});
