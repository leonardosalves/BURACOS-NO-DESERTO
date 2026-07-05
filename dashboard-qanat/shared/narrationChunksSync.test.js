import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  syncTimelineFromChunkPlan,
  buildBlockTimingsFromChunks,
  computeChunkTimeline,
} from "../backend/narrationChunks.js";
import { tightenTimelineRetentionDurations } from "../backend/timelineSceneSync.js";
import { computeAssetDuration } from "./timelineAudioStarts.js";

describe("syncTimelineFromChunkPlan", () => {
  it("mapeia 1 trecho por slot ordinal no bloco", () => {
    const chunks = [
      { id: "c1", block: 3, scene_ref: "3.1", text: "Primeira", duration_s: 4, pause_after_ms: 350 },
      { id: "c2", block: 3, scene_ref: "3.2", text: "Segunda", duration_s: 5, pause_after_ms: 0 },
    ];
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: { 3: [{ asset: "a.mp4" }, { asset: "b.mp4" }] },
      chunkPlan: { chunks },
    });
    const assets = timelineAssets["3"];
    assert.equal(assets.length, 2);
    assert.equal(assets[0].audio_start, 0);
    assert.equal(assets[1].audio_start, 4.35);
    assert.equal(assets[0].synced_to_speech, true);
    assert.equal(assets[1].synced_to_speech, true);
    assert.equal(assets[0].chunk_id, "c1");
    assert.equal(assets[1].chunk_id, "c2");
  });

  it("encadeia fixed após tighten — segunda cena não absorve o bloco inteiro", () => {
    const chunks = [
      { id: "c1", block: 1, scene_ref: "1.1", text: "A", duration_s: 3, pause_after_ms: 200 },
      { id: "c2", block: 1, scene_ref: "1.2", text: "B", duration_s: 4, pause_after_ms: 0 },
    ];
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: { 1: [{ asset: "x.mp4" }, { asset: "y.mp4" }] },
      chunkPlan: { chunks },
    });
    const timings = buildBlockTimingsFromChunks(computeChunkTimeline(chunks));
    const tightened = tightenTimelineRetentionDurations(timelineAssets, timings);
    const assets = tightened["1"];
    const blockEnd = timings.starts[1] ?? timings.starts[0] + timings.durations[0];
    const d0 = computeAssetDuration(assets[0], assets, timings.durations[0], {
      assetIndex: 0,
      blockEnd,
    });
    const d1 = computeAssetDuration(assets[1], assets, timings.durations[0], {
      assetIndex: 1,
      blockEnd,
    });
    assert.ok(Math.abs(d0 - 3.2) < 0.15, `d0=${d0}`);
    assert.ok(Math.abs(d1 - 4) < 0.25, `d1=${d1}`);
    assert.ok(d0 + d1 <= timings.durations[0] + 0.2, "soma das cenas não excede o bloco");
    assert.ok(d0 < timings.durations[0] * 0.55, "primeira cena não engole o bloco inteiro");
  });

  it("buildBlockTimingsFromChunks infere timeline quando só há duration_s", () => {
    const timings = buildBlockTimingsFromChunks([
      { block: 1, duration_s: 3, pause_after_ms: 200 },
      { block: 1, duration_s: 4, pause_after_ms: 0 },
    ]);
    assert.equal(timings.durations[0], 7.2);
    assert.equal(timings.starts[0], 0);
  });
});