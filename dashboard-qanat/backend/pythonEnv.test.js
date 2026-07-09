import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getFfmpegStatus, resetFfmpegCache } from "./pythonEnv.js";

describe("pythonEnv ffmpeg", () => {
  it("encontra ffmpeg no WinGet ou C:\\Lumiera\\tools", () => {
    resetFfmpegCache();
    const status = getFfmpegStatus();
    assert.equal(status.found, true, "ffmpeg deve ser encontrado neste PC");
    assert.ok(status.binary);
    assert.match(status.binary, /ffmpeg(\.exe)?$/i);
  });
});
