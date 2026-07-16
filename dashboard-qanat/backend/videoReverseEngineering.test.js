import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReverseEngineeringPrompt,
  extractReverseEngineeringJson,
  normalizeReverseEngineeringResult,
} from "./videoReverseEngineering.js";

test("extrai JSON mesmo quando a resposta usa fence", () => {
  const parsed = extractReverseEngineeringJson(
    '```json\n{"title":"Teste","scenes":[]}\n```'
  );
  assert.equal(parsed.title, "Teste");
});

test("normaliza cenas e preserva a transcricao recuperada", () => {
  const result = normalizeReverseEngineeringResult(
    {
      title: "Reconstrucao",
      scenes: [
        {
          narration: "Primeira fala.",
          duration_sec: 4,
          image_prompt: "Frame documental",
        },
      ],
    },
    {
      url: "https://youtu.be/abcdefghijk",
      format: "SHORTS",
      mode: "faithful",
      sourceTranscript: "Texto realmente recuperado.",
      multimodal: true,
    }
  );
  assert.equal(result.mode, "faithful");
  assert.equal(result.source_transcript, "Texto realmente recuperado.");
  assert.equal(result.scenes[0].id, "scene-01");
  assert.equal(result.evidence.multimodal, true);
});

test("prompt exige cobertura integral e prompts por cena", () => {
  const prompt = buildReverseEngineeringPrompt({
    url: "https://example.com/video",
    mode: "transformative",
    transcript: "Uma fala de exemplo.",
  });
  assert.match(prompt, /Cubra o video inteiro/i);
  assert.match(prompt, /image_prompt/);
  assert.match(prompt, /video_prompt/);
  assert.match(prompt, /speech_segments/);
  assert.match(prompt, /mesma cena/i);
  assert.match(prompt, /TRANSFORMACAO CRIATIVA/);
});

test("preserva duas vozes dentro de uma única cena sem alterar o texto", () => {
  const result = normalizeReverseEngineeringResult({
    scenes: [
      {
        narration: "Você encontrou a chave? Encontrei, mas ela não abre.",
        speech_segments: [
          {
            speaker: "Lia",
            role: "character",
            text: "Você encontrou a chave?",
          },
          {
            speaker: "Rui",
            role: "character",
            text: "Encontrei, mas ela não abre.",
          },
        ],
      },
    ],
  });

  assert.equal(result.scenes.length, 1);
  assert.equal(result.scenes[0].speech_segments.length, 2);
  assert.equal(result.scenes[0].speech_segments[0].speaker, "Lia");
  assert.equal(
    result.scenes[0].speech_segments.map((segment) => segment.text).join(" "),
    result.scenes[0].narration
  );
});
