import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNarrationChunksPreserveSource,
  aggregateNarrationChunksByScene,
  buildHeuristicNarrationChunks,
  buildNarrationChunkPlan,
  buildNarrationChunkSignature,
  hashNarrationIntegrityText,
  normalizeNarrationChunkPlan,
  resolveExpressivePause,
  syncTimelineFromChunkPlan,
} from "./narrationChunks.js";
import { prepareVoiceboxExpressiveText } from "./voiceboxTts.js";

test("AI chunk plan preserves the approved narration literally", () => {
  const narration = "Primeira frase. Segunda frase, sem alteração.";
  const chunks = [
    { id: "chunk-01", block: 1, text: "Primeira frase." },
    { id: "chunk-02", block: 1, text: "Segunda frase, sem alteração." },
  ];
  assert.equal(
    assertNarrationChunksPreserveSource(chunks, narration),
    hashNarrationIntegrityText(narration)
  );
  const plan = buildNarrationChunkPlan({
    aiChunks: chunks,
    storyboard: { narrative_script: narration },
  });
  assert.equal(
    plan.source_narration_hash,
    hashNarrationIntegrityText(narration)
  );
});

test("AI chunk plan blocks paraphrases of the approved narration", () => {
  assert.throws(
    () =>
      assertNarrationChunksPreserveSource(
        [{ text: "Primeira frase resumida." }],
        "Primeira frase completa e intacta."
      ),
    /tentou alterar a narração aprovada/i
  );
});

test("TTS override may change punctuation or wording without rewriting approved text", () => {
  assert.equal(
    assertNarrationChunksPreserveSource(
      [
        {
          id: "chunk-01",
          text: "Texto aprovado.",
          text_tagged: "Texto aprovado???",
        },
      ],
      "Texto aprovado."
    ),
    hashNarrationIntegrityText("Texto aprovado.")
  );
});

test("Voicebox reinforces interrogative prosody and preserves manual emphasis", () => {
  assert.equal(
    prepareVoiceboxExpressiveText(
      "Já se perguntou qual é a estrada mais longa?"
    ),
    "Já se perguntou qual é a estrada mais longa???"
  );
  assert.equal(
    prepareVoiceboxExpressiveText("Isso aconteceu mesmo???"),
    "Isso aconteceu mesmo???"
  );
  assert.equal(
    prepareVoiceboxExpressiveText("Qual é a maior estrada dos EUA?"),
    "Qual é a maior estrada dos Estados Unidos???"
  );
});

test("expressive narration pauses preserve questions and reveals", () => {
  assert.equal(
    resolveExpressivePause({ text: "Como isso foi possível?" }).reason,
    "pausa após pergunta"
  );
  assert.equal(
    resolveExpressivePause({ text: "Mas o detalhe muda tudo." }).ms,
    900
  );
  assert.equal(
    resolveExpressivePause({ text: "Texto comum.", changesBlock: true }).reason,
    "virada de bloco"
  );
});

test("changing narration text or voice marks generated audio as stale", () => {
  const original = {
    id: "chunk-01",
    text: "Texto original.",
    text_tagged: "Texto original.",
    voice: { engine: "kokoro", voice: "pm_alex", speed: 1 },
    audio_file: "narration_chunks/chunk-01.mp3",
    duration_s: 2,
    status: "generated",
  };
  original.generation_signature = buildNarrationChunkSignature(original);

  assert.equal(
    normalizeNarrationChunkPlan({ chunks: [original] }).chunks[0].status,
    "generated"
  );
  assert.equal(
    normalizeNarrationChunkPlan({
      chunks: [{ ...original, text: "Texto alterado." }],
    }).chunks[0].status,
    "stale"
  );
  assert.equal(
    normalizeNarrationChunkPlan({
      chunks: [{ ...original, voice: { ...original.voice, voice: "pf_dora" } }],
    }).chunks[0].status,
    "stale"
  );
});

test("multi-character speech creates separate TTS chunks but one visual scene", () => {
  const narration = "Você chegou cedo. Eu nunca fui embora.";
  const plan = buildHeuristicNarrationChunks({
    storyboard: {
      narrative_script: narration,
      visual_prompts: [
        {
          block: 1,
          scene: "1.1",
          narration_text: narration,
          speech_segments: [
            {
              id: "a",
              speaker: "Ana",
              role: "character",
              text: "Você chegou cedo.",
            },
            {
              id: "b",
              speaker: "Bruno",
              role: "character",
              text: "Eu nunca fui embora.",
            },
          ],
        },
      ],
    },
  });

  assert.equal(plan.chunks.length, 2);
  assert.equal(plan.chunks[0].scene_ref, "1.1");
  assert.equal(plan.chunks[1].scene_ref, "1.1");
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.speaker),
    ["Ana", "Bruno"]
  );

  const visualScenes = aggregateNarrationChunksByScene([
    { ...plan.chunks[0], start_s: 0, end_s: 1.2 },
    { ...plan.chunks[1], start_s: 1.38, end_s: 2.8 },
  ]);
  assert.equal(visualScenes.length, 1);
  assert.equal(visualScenes[0].start_s, 0);
  assert.equal(visualScenes[0].end_s, 2.8);
  assert.deepEqual(visualScenes[0].speakers, ["Ana", "Bruno"]);

  const synced = syncTimelineFromChunkPlan({
    timelineAssets: { 1: [{ asset: "scene.mp4", type: "video" }] },
    chunkPlan: {
      chunks: [
        { ...plan.chunks[0], start_s: 0, end_s: 1.2 },
        { ...plan.chunks[1], start_s: 1.38, end_s: 2.8 },
      ],
    },
    visualPrompts: [{ block: 1, scene: "1.1", narration_text: narration }],
  });
  assert.equal(synced.timelineAssets["1"].length, 1);
  assert.equal(synced.timelineAssets["1"][0].fixed, 2.98);
  assert.equal(synced.visualPrompts.length, 1);
  assert.equal(synced.visualPrompts[0].narration_text, narration);
});
