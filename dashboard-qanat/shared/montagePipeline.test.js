import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveBgmMode } from "../backend/bgmEmotionPlan.js";
import {
  allNarrationChunksHaveAudio,
  computeChunkTimeline,
  buildBlockTimingsFromChunks,
  isFullNarrationChunkBatch,
  chunkAudioRelativePath,
} from "../backend/narrationChunks.js";

describe("montage pipeline", () => {
  describe("resolveBgmMode", () => {
    it("bgm_mode block tem prioridade sobre SHORTS", () => {
      assert.equal(
        resolveBgmMode({ bgm_mode: "block", use_single_bgm: false }, {}, "SHORT"),
        "block",
      );
    });

    it("use_single_bgm força single em longos", () => {
      assert.equal(
        resolveBgmMode({ use_single_bgm: true }, {}, "LONG"),
        "single",
      );
    });

    it("padrão longo é emotion", () => {
      assert.equal(resolveBgmMode({}, {}, "LONG"), "emotion");
    });
  });

  describe("narration chunks", () => {
    let tmpDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-chunks-"));
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("isFullNarrationChunkBatch detecta batch completo", () => {
      const plan = { chunks: [{ id: "chunk-01" }, { id: "chunk-02" }] };
      assert.equal(isFullNarrationChunkBatch(null, plan), true);
      assert.equal(isFullNarrationChunkBatch(["chunk-01"], plan), false);
      assert.equal(isFullNarrationChunkBatch(["chunk-01", "chunk-02"], plan), true);
    });

    it("allNarrationChunksHaveAudio exige todos os MP3", () => {
      const plan = {
        chunks: [
          { id: "chunk-01", audio_file: chunkAudioRelativePath("chunk-01") },
          { id: "chunk-02", audio_file: chunkAudioRelativePath("chunk-02") },
        ],
      };
      const chunkDir = path.join(tmpDir, "narration_chunks");
      fs.mkdirSync(chunkDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, plan.chunks[0].audio_file.replace(/\//g, path.sep)), "x");
      assert.equal(allNarrationChunksHaveAudio(plan, tmpDir), false);

      fs.writeFileSync(path.join(tmpDir, plan.chunks[1].audio_file.replace(/\//g, path.sep)), "y");
      assert.equal(allNarrationChunksHaveAudio(plan, tmpDir), true);
    });

    it("computeChunkTimeline soma pausas entre trechos", () => {
      const chunks = computeChunkTimeline([
        { id: "c1", duration_s: 2, pause_after_ms: 500 },
        { id: "c2", duration_s: 3, pause_after_ms: 0 },
      ]);
      assert.equal(chunks[0].start_s, 0);
      assert.equal(chunks[0].end_s, 2);
      assert.equal(chunks[1].start_s, 2.5);
      assert.equal(chunks[1].end_s, 5.5);
    });

    it("buildBlockTimingsFromChunks agrupa por bloco", () => {
      const timings = buildBlockTimingsFromChunks([
        { block: 1, start_s: 0, end_s: 2, pause_after_ms: 200 },
        { block: 1, start_s: 2.2, end_s: 4, pause_after_ms: 0 },
        { block: 2, start_s: 4, end_s: 7, pause_after_ms: 300 },
      ]);
      assert.equal(timings.source, "narration_chunks");
      assert.equal(timings.starts.length, 2);
      assert.equal(timings.durations[0], 4);
      assert.ok(timings.durations[1] >= 3);
    });
  });
});