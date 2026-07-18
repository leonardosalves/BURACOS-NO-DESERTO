import test from "node:test";
import assert from "node:assert/strict";
import {
  dedupeNearDuplicateVisualPromptsInBlocks,
  narrationTextSimilarity,
  normalizeVisualPromptBlocks,
} from "./scriptQuality.js";

test("narrationTextSimilarity detecta inclusão e identidade", () => {
  assert.equal(
    narrationTextSimilarity(
      "A água desce pelo canal.",
      "A água desce pelo canal."
    ),
    1
  );
  assert.ok(
    narrationTextSimilarity(
      "A água desce pelo canal principal da montanha.",
      "A água desce pelo canal principal da montanha e alimenta o moinho."
    ) >= 0.7
  );
  assert.ok(
    narrationTextSimilarity(
      "Totalmente diferente aqui.",
      "Outra frase sem relação."
    ) < 0.5
  );
});

test("dedupe remove última cena duplicada DENTRO do bloco (não no último bloco só)", () => {
  const vps = [
    {
      scene: "2.1",
      block: 2,
      narration_text: "No interior da rocha, a pressão aumenta.",
      prompt: "rock pressure",
      duration_from_whisper: true,
      duration_seconds: 4.2,
    },
    {
      scene: "2.2",
      block: 2,
      narration_text: "O engenheiro marca o ponto de furo.",
      prompt: "engineer marks",
      duration_from_whisper: true,
      duration_seconds: 3.5,
    },
    // Última do bloco 2 duplicada: com e sem segundos
    {
      scene: "2.3",
      block: 2,
      narration_text: "E a carga explode em silêncio controlado.",
      prompt: "controlled blast detailed cinematic",
      duration_from_whisper: true,
      duration_seconds: 5.1,
    },
    {
      scene: "2.4",
      block: 2,
      narration_text: "E a carga explode em silêncio controlado.",
      prompt: "blast",
    },
    // Bloco 3 ok
    {
      scene: "3.1",
      block: 3,
      narration_text: "Depois da fumaça, o túnel avança.",
      prompt: "tunnel advances",
    },
  ];

  const out = dedupeNearDuplicateVisualPromptsInBlocks(vps);
  const b2 = out.filter((v) => Number(v.block) === 2);
  const b3 = out.filter((v) => Number(v.block) === 3);
  assert.equal(b2.length, 3, "bloco 2 deve ter 3 cenas após dedupe");
  assert.equal(b3.length, 1);
  assert.equal(b2[2].duration_from_whisper, true);
  assert.equal(b2[2].duration_seconds, 5.1);
  assert.equal(b2[2].scene, "2.3");
});

test("normalizeVisualPromptBlocks aplica dedupe após coverage", () => {
  const result = normalizeVisualPromptBlocks(
    {
      narrative_script:
        "Primeira frase do bloco. Segunda frase do bloco. Terceira frase do bloco.",
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          narration_text: "Primeira frase do bloco.",
          type: "imagem IA 2k",
          prompt: "p1 long enough prompt for scene",
        },
        {
          scene: "1.2",
          block: 1,
          narration_text: "Segunda frase do bloco.",
          type: "imagem IA 2k",
          prompt: "p2 long enough prompt for scene",
        },
        {
          scene: "1.3",
          block: 1,
          narration_text: "Terceira frase do bloco.",
          type: "imagem IA 2k",
          prompt: "p3 detailed enough prompt for scene",
          duration_from_whisper: true,
          duration_seconds: 4,
        },
        {
          scene: "1.4",
          block: 1,
          narration_text: "Terceira frase do bloco.",
          type: "imagem IA 2k",
          prompt: "p3 copy",
        },
      ],
      technical_config: {
        block_phrases: [{ block: 1, phrase: "Primeira frase" }],
      },
    },
    {
      blockCount: 1,
      format: "LONGO",
      ideaTitle: "Túnel",
      skipPromptEnrichment: true,
    }
  );

  const vps = result.visual_prompts;
  assert.equal(vps.length, 3, `expected 3 after dedupe, got ${vps.length}`);
  assert.equal(vps[2].duration_from_whisper, true);
});
