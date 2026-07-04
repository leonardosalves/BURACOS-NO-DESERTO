import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveBgmMode } from "./bgmMode.js";
import { NARRATION_MODE_MASTER, NARRATION_MODE_CHUNKED } from "../backend/narrationChunks.js";
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

    it("persistChunkPlan preserva narration_mode master quando informado", async () => {
      const { persistChunkPlanToProject } = await import("../backend/narrationChunks.js");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-plan-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "storyboard.json"), "{}");
        fs.writeFileSync(path.join(tmpDir, "config_qanat.json"), JSON.stringify({ niche: "Test" }));
        const plan = { chunks: [{ id: "chunk-01", text: "teste", block: 1 }] };
        const saved = persistChunkPlanToProject(tmpDir, plan, { narration_mode: NARRATION_MODE_MASTER });
        assert.equal(saved.config.narration_mode, NARRATION_MODE_MASTER);
        const savedChunked = persistChunkPlanToProject(tmpDir, plan, {});
        assert.equal(savedChunked.config.narration_mode, NARRATION_MODE_CHUNKED);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("syncTimelineFromChunkPlan distribui narração por cena no bloco", async () => {
      const { syncTimelineFromChunkPlan, computeChunkTimeline } = await import("../backend/narrationChunks.js");
      const chunks = computeChunkTimeline([
        { id: "c1", block: 2, scene_ref: "2.1", text: "Primeira frase do bloco.", duration_s: 3, pause_after_ms: 300 },
        { id: "c2", block: 2, scene_ref: "2.2", text: "Segunda frase do bloco.", duration_s: 4, pause_after_ms: 0 },
      ]);
      const synced = syncTimelineFromChunkPlan({
        timelineAssets: {
          2: [{ asset: "a.mp4", type: "video" }, { asset: "b.jpeg", type: "image" }],
        },
        chunkPlan: { chunks },
        visualPrompts: [
          { block: 2, scene: "2.1", narration_text: "" },
          { block: 2, scene: "2.2", narration_text: "" },
        ],
      });
      assert.equal(synced.timelineAssets["2"][0].narration_segment, "Primeira frase do bloco.");
      assert.equal(synced.timelineAssets["2"][1].narration_segment, "Segunda frase do bloco.");
      assert.ok(synced.timelineAssets["2"][0].speech_end < synced.timelineAssets["2"][1].audio_start);
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