import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildVisualSceneTimingSegments,
  syncTimelineFromChunkPlan,
  buildBlockTimingsFromChunks,
  computeChunkTimeline,
  mergeWhisperTranscriptsWithChunkPlan,
  assessWhisperWordQuality,
  alignNarrationChunkPlanToWhisper,
  resolveChunkTimeline,
  stabilizeNarrationChunkPauses,
} from "../backend/narrationChunks.js";
import { flattenWordTranscripts } from "./wordTranscripts.js";
import { tightenTimelineRetentionDurations } from "../backend/timelineSceneSync.js";
import { computeAssetDuration } from "./timelineAudioStarts.js";

describe("syncTimelineFromChunkPlan", () => {
  it("preserva três cenas visuais quando dois chunks cobrem o bloco", () => {
    const chunks = computeChunkTimeline([
      {
        id: "c1",
        block: 3,
        scene_ref: "3.1",
        text: "China lidera.",
        duration_s: 4,
        pause_after_ms: 200,
      },
      {
        id: "c2",
        block: 3,
        scene_ref: "3.2",
        text: "Comente e siga para mais.",
        duration_s: 4,
        pause_after_ms: 0,
      },
    ]);
    const visualPrompts = [
      { block: 3, scene: "3.1", type: "vídeo IA (max 10s)" },
      { block: 3, scene: "3.2", type: "vídeo IA (max 10s)" },
      { block: 3, scene: "3.3", type: "vídeo IA (max 10s)" },
    ];
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: { 3: [{ asset: "china.mp4" }, { asset: "cta.mp4" }] },
      chunkPlan: { chunks },
      visualPrompts,
    });

    assert.equal(timelineAssets["3"].length, 3);
    assert.equal(timelineAssets["3"][2].type, "video");
    assert.notEqual(
      timelineAssets["3"][1].narration_segment,
      timelineAssets["3"][2].narration_segment
    );
    assert.ok(
      timelineAssets["3"][2].audio_start > timelineAssets["3"][1].audio_start
    );
  });

  it("mantém uma única cena quando duas vozes pertencem à mesma cena", () => {
    const segments = buildVisualSceneTimingSegments(
      [
        {
          id: "fala-a",
          scene_ref: "1.1",
          text: "Pessoa A fala.",
          start_s: 0,
          end_s: 2,
        },
        {
          id: "fala-b",
          scene_ref: "1.1",
          text: "Pessoa B responde.",
          start_s: 2,
          end_s: 4,
        },
      ],
      [{ block: 1, scene: "1.1" }]
    );
    assert.equal(segments.length, 1);
    assert.equal(segments[0].start_s, 0);
    assert.equal(segments[0].end_s, 4);
    assert.match(segments[0].text, /Pessoa A fala.*Pessoa B responde/);
  });

  it("cobre as pausas com vídeo e não deixa a trilha visual menor que a narração", () => {
    const chunks = computeChunkTimeline([
      {
        id: "c1",
        block: 1,
        scene_ref: "1.1",
        text: "Primeira.",
        duration_s: 2,
        pause_after_ms: 800,
      },
      {
        id: "c2",
        block: 1,
        scene_ref: "1.2",
        text: "Segunda.",
        duration_s: 3,
        pause_after_ms: 0,
      },
    ]);
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: { 1: [{ asset: "a.mp4" }, { asset: "b.mp4" }] },
      chunkPlan: { chunks },
      visualPrompts: [
        { block: 1, scene: "1.1" },
        { block: 1, scene: "1.2" },
      ],
    });
    assert.equal(timelineAssets["1"][0].fixed, 2.8);
    assert.equal(timelineAssets["1"][1].audio_start, 2.8);
    assert.equal(
      timelineAssets["1"][1].audio_start + timelineAssets["1"][1].fixed,
      5.8
    );
  });

  it("não recria slot que o editor excluiu de uma seleção visual já preenchida", () => {
    const chunks = computeChunkTimeline([
      {
        id: "c1",
        block: 1,
        scene_ref: "1.1",
        text: "Primeira.",
        duration_s: 2,
        pause_after_ms: 0,
      },
      {
        id: "c2",
        block: 1,
        scene_ref: "1.2",
        text: "Segunda.",
        duration_s: 2,
        pause_after_ms: 0,
      },
    ]);
    const { timelineAssets } = syncTimelineFromChunkPlan({
      timelineAssets: {
        1: [
          { asset: "a.mp4", user_locked: true },
          { asset: "b.mp4", user_locked: true },
        ],
      },
      chunkPlan: { chunks },
      visualPrompts: [
        { block: 1, scene: "1.1" },
        { block: 1, scene: "1.2" },
        { block: 1, scene: "1.3" },
      ],
    });
    assert.equal(timelineAssets["1"].length, 2);
  });

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

describe("planejamento estável e alinhamento real por Whisper", () => {
  it("remove escada artificial 800/900/1000ms e posiciona virada no fim do bloco", () => {
    const chunks = stabilizeNarrationChunkPauses([
      { id: "c1", block: 1, text: "Primeira ideia.", pause_after_ms: 800 },
      { id: "c2", block: 1, text: "Segunda ideia.", pause_after_ms: 900 },
      { id: "c3", block: 2, text: "Terceira ideia.", pause_after_ms: 1000 },
    ]);
    assert.deepEqual(
      chunks.map((chunk) => chunk.pause_after_ms),
      [350, 850, 0]
    );
    assert.equal(chunks[1].pause_reason, "virada de bloco");
  });

  it("reancora cenas nas palavras reais e preserva esses tempos", () => {
    const plan = {
      chunks: [
        {
          id: "c1",
          block: 1,
          scene_ref: "1.1",
          text: "A ponte caiu",
          duration_s: 2,
          pause_after_ms: 800,
        },
        {
          id: "c2",
          block: 1,
          scene_ref: "1.2",
          text: "A cidade reagiu",
          duration_s: 2,
          pause_after_ms: 0,
        },
      ],
    };
    const words = [
      { word: "A", start: 0.18, end: 0.32 },
      { word: "ponte", start: 0.32, end: 0.72 },
      { word: "caiu", start: 0.72, end: 1.16 },
      { word: "A", start: 2.04, end: 2.18 },
      { word: "cidade", start: 2.18, end: 2.62 },
      { word: "reagiu", start: 2.62, end: 3.1 },
    ];
    const aligned = alignNarrationChunkPlanToWhisper(plan, words);
    assert.equal(aligned.chunks[0].start_s, 0.18);
    assert.equal(aligned.chunks[0].end_s, 1.16);
    assert.equal(aligned.chunks[1].start_s, 2.04);
    assert.equal(aligned.chunks[0].observed_pause_after_ms, 880);
    assert.equal(aligned.chunks[0].pause_after_ms, 800);

    const preserved = resolveChunkTimeline(aligned.chunks);
    assert.equal(preserved[0].start_s, 0.18);
    assert.equal(preserved[1].start_s, 2.04);
  });
});
