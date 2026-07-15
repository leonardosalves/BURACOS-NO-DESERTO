import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNarrationChunksPreserveSource,
  buildNarrationChunkPlan,
  buildNarrationChunkSignature,
  hashNarrationIntegrityText,
  normalizeNarrationChunkPlan,
  resolveExpressivePause,
} from "./narrationChunks.js";

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

test("AI chunk plan blocks tagged text with different words", () => {
  assert.throws(
    () =>
      assertNarrationChunksPreserveSource(
        [
          {
            id: "chunk-01",
            text: "Texto aprovado.",
            text_tagged: "[ênfase] Texto alterado.",
          },
        ],
        "Texto aprovado."
      ),
    /texto com tags/i
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
