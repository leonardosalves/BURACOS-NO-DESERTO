import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  syncTimelineFromChunkPlan,
  buildBlockTimingsFromChunks,
  computeChunkTimeline,
  mergeWhisperTranscriptsWithChunkPlan,
  assessWhisperWordQuality,
} from "../backend/narrationChunks.js";
import { flattenWordTranscripts } from "./wordTranscripts.js";
import { tightenTimelineRetentionDurations } from "../backend/timelineSceneSync.js";
import { computeAssetDuration } from "./timelineAudioStarts.js";

describe("syncTimelineFromChunkPlan", () => {
  it("mapeia 1 trecho por slot ordinal no bloco", () => {
    const chunks = [
      {
        id: "c1",
        block: 3,
        scene_ref: "3.1",
        text: "Primeira",
        duration_s: 4,
        pause_after_ms: 350,
      },
      {
        id: "c2",
        block: 3,
        scene_ref: "3.2",
        text: "Segunda",
        duration_s: 5,
        pause_after_ms: 0,
      },
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
      {
        id: "c1",
        block: 1,
        scene_ref: "1.1",
        text: "A",
        duration_s: 3,
        pause_after_ms: 200,
      },
      {
        id: "c2",
        block: 1,
        scene_ref: "1.2",
        text: "B",
        duration_s: 4,
        pause_after_ms: 0,
      },
    ];
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: { 1: [{ asset: "x.mp4" }, { asset: "y.mp4" }] },
      chunkPlan: { chunks },
    });
    const timings = buildBlockTimingsFromChunks(computeChunkTimeline(chunks));
    const tightened = tightenTimelineRetentionDurations(
      timelineAssets,
      timings
    );
    const assets = tightened["1"];
    const blockEnd =
      timings.starts[1] ?? timings.starts[0] + timings.durations[0];
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
    assert.ok(
      d0 + d1 <= timings.durations[0] + 0.2,
      "soma das cenas não excede o bloco"
    );
    assert.ok(
      d0 < timings.durations[0] * 0.55,
      "primeira cena não engole o bloco inteiro"
    );
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

describe("mergeWhisperTranscriptsWithChunkPlan", () => {
  const chunk08Text =
    "Não foi negligência humana ou materiais ruins. Foi a física pura encontrando o alvo perfeito a centenas de quilômetros de distância.";

  it("rejeita Whisper truncado com palavra de vários segundos e re-sintetiza", () => {
    const badWhisperWords = [
      { word: " foi", start: 79.82, end: 80.12 },
      { word: " negligência", start: 80.12, end: 80.92 },
      { word: " humana", start: 80.92, end: 81.52 },
      { word: " ou", start: 81.52, end: 81.96 },
      { word: " materiais", start: 81.96, end: 82.66 },
      { word: " ruins.", start: 82.66, end: 83.02 },
      { word: " Foi", start: 83.64, end: 83.74 },
      { word: " a", start: 83.74, end: 83.9 },
      { word: " física", start: 83.9, end: 84.36 },
      { word: " pura", start: 84.36, end: 84.9 },
      { word: " encontrando", start: 84.9, end: 85.56 },
      { word: " o", start: 85.56, end: 89.3 },
      { word: " alvo", start: 89.3, end: 89.45 },
      { word: " perfeito", start: 89.45, end: 89.6 },
    ];
    const quality = assessWhisperWordQuality(
      chunk08Text,
      badWhisperWords.map((w) => ({
        ...w,
        start: w.start - 79.58,
        end: w.end - 79.58,
      })),
      9.9
    );
    assert.equal(quality.ok, false);

    const plan = {
      chunks: [
        {
          id: "chunk-08",
          block: 5,
          scene_ref: "5.1",
          text: chunk08Text,
          duration_s: 9.9,
          start_s: 79.58,
          end_s: 89.48,
          pause_after_ms: 0,
        },
      ],
    };
    const merged = mergeWhisperTranscriptsWithChunkPlan(plan, badWhisperWords);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].words.length, 21);
    const flat = flattenWordTranscripts(merged);
    const last = flat[flat.length - 1];
    assert.ok(last.end <= 89.5, `last end ${last.end}`);
    assert.ok(
      last.end - flat[flat.length - 2].end < 1.5,
      "últimas palavras não colapsam no fim"
    );
  });
});
