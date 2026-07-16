import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import test from "node:test";
import {
  appendProjectEventLog,
  projectEventLogPath,
  summarizeTimelineAssets,
} from "./projectEventLog.js";

test("projectEventLog persiste diagnóstico sem segredos", () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-log-"));
  try {
    appendProjectEventLog(projectDir, {
      component: "narration",
      event: "test_event",
      message: "teste",
      details: { chunk_count: 3, api_key: "segredo" },
    });
    const line = fs
      .readFileSync(projectEventLogPath(projectDir), "utf8")
      .trim();
    const event = JSON.parse(line);
    assert.equal(event.event, "test_event");
    assert.equal(event.details.chunk_count, 3);
    assert.equal(event.details.api_key, undefined);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("summarizeTimelineAssets encontra slots vazios e arquivos repetidos", () => {
  const summary = summarizeTimelineAssets(
    {
      1: [{ asset: "a.mp4" }, { asset: "" }],
      2: [{ asset: "a.mp4" }],
    },
    [{ block: 1 }, { block: 1 }, { block: 2 }]
  );
  assert.equal(summary.blocks["1"].empty_slots, 1);
  assert.equal(summary.blocks["1"].scene_count, 2);
  assert.equal(summary.duplicate_files.length, 1);
});
