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
  assert.equal(result.scenes[0].media_type, "image");
  assert.equal(result.scenes[0].video_prompt, "");
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

test("modo somente video exige video em todas as cenas", () => {
  const prompt = buildReverseEngineeringPrompt({
    url: "https://example.com/video",
    mediaStrategy: "video_only",
  });
  assert.match(prompt, /SOMENTE VIDEO/);
  assert.match(prompt, /media_type deve ser video em TODAS as cenas/);

  const result = normalizeReverseEngineeringResult(
    {
      scenes: [
        {
          narration: "Cena inicialmente estatica.",
          visual_description: "Um mapa antigo sobre uma mesa.",
          media_type: "image",
          image_prompt: "Mapa antigo detalhado.",
        },
      ],
    },
    { mediaStrategy: "video_only" }
  );
  assert.equal(result.media_strategy, "video_only");
  assert.equal(result.scenes[0].media_type, "video");
  assert.ok(result.scenes[0].video_prompt);
  assert.equal(result.scenes[0].image_prompt, "");
});

test("modo adaptativo preserva decisao diferente por cena", () => {
  const result = normalizeReverseEngineeringResult(
    {
      scenes: [
        {
          narration: "Observe o documento.",
          media_type: "image",
          media_reason: "Leitura e composicao precisa.",
          image_prompt: "Documento historico em close.",
        },
        {
          narration: "Agora veja o mecanismo girar.",
          media_type: "video",
          media_reason: "O movimento explica o mecanismo.",
          video_prompt: "Engrenagens girando em sequencia.",
        },
      ],
    },
    { mediaStrategy: "adaptive" }
  );
  assert.deepEqual(
    result.scenes.map((scene) => scene.media_type),
    ["image", "video"]
  );
  assert.equal(result.scenes[0].video_prompt, "");
  assert.equal(result.scenes[1].image_prompt, "");
});

test("modo adaptativo reequilibra quando a IA devolve so video", () => {
  const result = normalizeReverseEngineeringResult(
    {
      scenes: [
        {
          narration: "Leia o mapa.",
          media_type: "video",
          visual_description: "Mapa antigo estatico sobre a mesa.",
          video_prompt: "Slow pan over an archival map document.",
        },
        {
          narration: "O mecanismo gira.",
          media_type: "video",
          visual_description: "Engrenagens girando sem parar.",
          video_prompt: "Gears rotating continuously.",
        },
        {
          narration: "O selo real.",
          media_type: "video",
          visual_description: "Selo e medalha em close estatico.",
          video_prompt: "Static close-up of royal seal medal.",
        },
      ],
    },
    { mediaStrategy: "adaptive" }
  );
  const types = result.scenes.map((scene) => scene.media_type);
  assert.ok(types.includes("image"), `esperava image no mix, veio ${types}`);
  assert.ok(types.includes("video"), `esperava video no mix, veio ${types}`);
  const images = result.scenes.filter((s) => s.media_type === "image");
  for (const scene of images) {
    assert.ok(scene.image_prompt);
    assert.equal(scene.video_prompt, "");
  }
});

test("prompt adaptive proibe so video", () => {
  const prompt = buildReverseEngineeringPrompt({
    url: "https://example.com/video",
    mediaStrategy: "adaptive",
  });
  assert.match(prompt, /IA DECIDE/i);
  assert.match(prompt, /PROIBIDO devolver todas as cenas como video/i);
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
