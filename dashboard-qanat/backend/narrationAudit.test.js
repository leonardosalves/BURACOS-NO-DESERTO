import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  appendNarrationAuditEvent,
  readNarrationAudit,
} from "./narrationAudit.js";

test("narration audit appends immutable ordered events", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-audit-"));
  appendNarrationAuditEvent(dir, {
    type: "chunk",
    status: "generating",
    chunk_id: "chunk-01",
  });
  appendNarrationAuditEvent(dir, {
    type: "chunk",
    status: "generated",
    chunk_id: "chunk-01",
  });
  const audit = readNarrationAudit(dir);
  assert.equal(audit.events.length, 2);
  assert.equal(audit.events[1].status, "generated");
  assert.ok(audit.events.every((event) => event.id && event.at));
  fs.rmSync(dir, { recursive: true, force: true });
});
