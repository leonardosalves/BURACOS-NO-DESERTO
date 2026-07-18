import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVisualPromptMediaTypes,
  normalizeVisualPromptBlocks,
  SHORTS_VIDEO_SCENE_TYPE,
  IMAGE_SCENE_TYPE,
} from "./scriptQuality.js";

test("prompt de movimento com type imagem vira vídeo IA", () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "2.1",
      block: 2,
      type: "imagem IA 2k",
      narration_text: "O pica-pau fura o tronco.",
      prompt:
        "Close-up of a woodpecker drilling into a pine tree, beak pecking rapidly, bark chips flying, cinematic motion, handheld",
    },
  ]);
  assert.equal(out[0].type, SHORTS_VIDEO_SCENE_TYPE);
  assert.equal(out[0].production.broll_type, "video");
  assert.match(out[0].prompt, /cinematic motion|max 10/i);
});

test("still sem movimento permanece imagem", () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "1.1",
      block: 1,
      type: "imagem IA 2k",
      prompt:
        "Wide still of ancient stone aqueduct at golden hour, photorealistic 2k, static composition",
    },
  ]);
  assert.equal(out[0].type, IMAGE_SCENE_TYPE);
  assert.equal(out[0].production.broll_type, "image");
});

test("IMAGE com 'max 10 seconds' residual limpa e NÃO vira vídeo", () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "2.1",
      block: 2,
      type: "imagem IA 2k",
      prompt:
        "Medium close-up of a dark grey residential trash bin on a clean Copenhagen street, soft morning light, photorealistic. Vertical 9:16 composition. Cinematic motion, max 10 seconds, no text.",
    },
  ]);
  assert.equal(out[0].type, IMAGE_SCENE_TYPE);
  assert.equal(out[0].production.broll_type, "image");
  assert.doesNotMatch(out[0].prompt, /max\s*10\s*seconds/i);
  assert.doesNotMatch(out[0].prompt, /cinematic motion/i);
  assert.match(out[0].prompt, /trash bin/i);
});

test('type "image" + prompt com duração 8 seconds vira vídeo IA', () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "3.2",
      block: 3,
      type: "image",
      prompt:
        "Woodpecker drilling into pine tree bark, rapid pecking, 8 seconds, photorealistic documentary",
    },
  ]);
  assert.equal(out[0].type, SHORTS_VIDEO_SCENE_TYPE);
  assert.equal(out[0].production.broll_type, "video");
});

test("POV força vídeo mesmo com type imagem", () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "4.1",
      block: 4,
      type: "imagem IA 2k",
      is_pov: true,
      video_role: "A",
      prompt: "First person hands holding a tool",
    },
  ]);
  assert.equal(out[0].type, SHORTS_VIDEO_SCENE_TYPE);
});

test("normalizeVisualPromptBlocks aplica coerção de mídia", () => {
  const result = normalizeVisualPromptBlocks(
    {
      narrative_script: "O pica-pau fura o tronco com força.",
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          type: "imagem IA 2k",
          narration_text: "O pica-pau fura o tronco com força.",
          prompt:
            "Woodpecker drilling into pine bark, chips flying, rapid pecking motion, photorealistic",
        },
      ],
      technical_config: {
        block_phrases: [{ block: 1, phrase: "O pica-pau" }],
      },
    },
    {
      blockCount: 1,
      format: "LONGO",
      ideaTitle: "Pica-pau",
      skipPromptEnrichment: true,
    }
  );
  assert.equal(result.visual_prompts[0].type, SHORTS_VIDEO_SCENE_TYPE);
});
