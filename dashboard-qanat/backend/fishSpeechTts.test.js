import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFishSpeechRequestBody,
  prepareFishSpeechInputText,
  shouldNormalizeFishSpeechText,
} from "./fishSpeechTts.js";

const cfg = {
  format: "mp3",
  chunkLength: 300,
  temperature: 0.8,
  topP: 0.8,
  repetitionPenalty: 1.1,
  maxNewTokens: 1024,
};

test("Fish preserva texto portugues ja escrito por extenso", () => {
  const text = "Ninguém aguenta quarenta e cinco minutos aqui.";
  const body = buildFishSpeechRequestBody(text, cfg, "valentino", {
    independentChunk: true,
  });

  assert.equal(body.text, text);
  assert.equal(body.normalize, false);
  assert.equal(body.condition_on_previous_chunks, false);
  assert.equal(body.temperature, 0.7);
  assert.equal(body.top_p, 0.75);
});

test("Fish mantem normalizacao para numeros e abreviacoes", () => {
  assert.equal(shouldNormalizeFishSpeechText("Duração: 45 min."), true);
  assert.equal(
    shouldNormalizeFishSpeechText("Duração: quarenta e cinco minutos."),
    false
  );

  const body = buildFishSpeechRequestBody("Duração: 45 min.", cfg, null, {
    independentChunk: true,
  });
  assert.equal(body.normalize, true);
});

test("narracao longa conserva contexto entre chunks internos", () => {
  const body = buildFishSpeechRequestBody(
    "Texto longo já preparado para a síntese da narração mestra.",
    cfg
  );

  assert.equal(body.condition_on_previous_chunks, true);
  assert.equal(body.temperature, 0.8);
  assert.equal(body.top_p, 0.8);
});

test("Fish preserva literalmente um trecho curto de narracao", () => {
  const text = "Sim.";
  assert.equal(prepareFishSpeechInputText(text), text);
  const body = buildFishSpeechRequestBody(text, cfg, "valentino", {
    independentChunk: true,
  });

  assert.equal(body.text, text);
  assert.equal(body.min_chunk_length, text.length);
  assert.equal(body.condition_on_previous_chunks, false);
});

test("Fish rejeita somente trecho vazio", () => {
  assert.throws(
    () => prepareFishSpeechInputText("   "),
    /Texto vazio para Fish Speech\./
  );
});
