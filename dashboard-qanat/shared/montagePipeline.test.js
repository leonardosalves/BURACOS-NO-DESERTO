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
  parseAiNarrationChunkResponse,
  applyChunkPlanToVisualPrompts,
} from "../backend/narrationChunks.js";
import { sanitizeNarrationChunkTaggedText } from "../backend/videoProEnhancements.js";

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

    it("sanitizeNarrationChunkTaggedText remove breath e ênfase", () => {
      const raw = "[ênfase] Mil (breath) anos depois, [ênfase dramática] tudo mudou.";
      assert.equal(
        sanitizeNarrationChunkTaggedText(raw, "Mil anos depois, tudo mudou."),
        "Mil anos depois, tudo mudou.",
      );
    });

    it("parseAiNarrationChunkResponse sanitiza text_tagged da IA", () => {
      const chunks = parseAiNarrationChunkResponse({
        chunks: [{
          id: "chunk-01",
          block: 1,
          scene_ref: "1.1",
          text: "A torre resistiu.",
          text_tagged: "[ênfase] A torre (breath) resistiu.",
        }],
      });
      assert.equal(chunks[0].text_tagged, "A torre resistiu.");
    });

    it("applyChunkPlanToVisualPrompts corrige duration_seconds e asset no storyboard", () => {
      const prompts = [{
        scene: "2.2",
        block: 2,
        duration_seconds: 40.5,
        speech_end: 45.85,
        asset: { asset: "old.jpeg", type: "image" },
      }];
      const plan = {
        chunks: [{
          id: "chunk-02",
          block: 2,
          scene_ref: "2.2",
          text: "Trecho bloco 2.",
          duration_s: 7.027,
          start_s: 5.388,
          end_s: 12.415,
          pause_after_ms: 800,
        }],
      };
      const timeline = {
        2: [{
          asset: "Futuristic_buildings.jpeg",
          type: "image",
          fixed: 7,
          user_locked: true,
        }],
      };
      const out = applyChunkPlanToVisualPrompts(prompts, plan, timeline);
      assert.equal(out[0].duration_seconds, 7);
      assert.equal(out[0].speech_end, 12.415);
      assert.equal(out[0].asset.asset, "Futuristic_buildings.jpeg");
    });

    it("buildBlockTimingsFromChunks usa menor start_s por bloco", () => {
      const timings = buildBlockTimingsFromChunks([
        { block: 2, start_s: 12, end_s: 15, pause_after_ms: 0 },
        { block: 2, start_s: 5, end_s: 8, pause_after_ms: 200 },
      ]);
      assert.equal(timings.starts[0], 5);
      assert.equal(timings.durations[0], 10);
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