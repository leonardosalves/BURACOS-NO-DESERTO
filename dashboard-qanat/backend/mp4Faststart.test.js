import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { ensureMp4Faststart } from "./mp4Faststart.js";

describe("mp4Faststart", () => {
  it("skip non-mp4", () => {
    const p = path.join(os.tmpdir(), `lumiera-fs-test-${Date.now()}.txt`);
    fs.writeFileSync(p, "x");
    const r = ensureMp4Faststart(p);
    assert.equal(r.ok, true);
    assert.equal(r.skipped, true);
    fs.unlinkSync(p);
  });

  it("missing file", () => {
    const r = ensureMp4Faststart("/no/such/file.mp4");
    assert.equal(r.ok, false);
  });
});
