import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVisualPromptMediaTypes,
  normalizeVisualPromptBlocks,
  finalizeGeneratedVisualPromptMedia,
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

test("aerial still e objeto crane não são confundidos com movimento de vídeo", () => {
  const out = normalizeVisualPromptMediaTypes([
    {
      scene: "1.2",
      block: 1,
      type: "IMAGE",
      prompt:
        "High-angle aerial still photograph of an ancient wooden crane beside a harbor, static composition, sharp detail",
    },
  ]);
  assert.equal(out[0].type, IMAGE_SCENE_TYPE);
  assert.equal(out[0].media_mode, "image");
  assert.doesNotMatch(out[0].prompt, /max\s*10\s*seconds/i);
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
  assert.equal(out[0].media_mode, "image");
  assert.equal(out[0].production.broll_type, "image");
  assert.doesNotMatch(out[0].prompt, /max\s*10\s*seconds/i);
  assert.doesNotMatch(out[0].prompt, /cinematic motion/i);
  assert.match(out[0].prompt, /trash bin/i);
  assert.equal(out[0].production.generate_from_prompt, out[0].prompt);
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

test("contrato final normaliza IMAGE mesmo quando Shorts já tem vídeos suficientes", () => {
  const residualImage = {
    scene: "1.1",
    block: 1,
    type: "image",
    media_mode: "image",
    aspect_ratio: "16:9",
    prompt:
      "A heavy iron claw above ocean waves, high shutter speed, photorealistic. Cinematic motion, max 10 seconds, no text.",
    production: {
      broll_type: "image",
      generate_from_prompt:
        "A heavy iron claw above ocean waves. Cinematic motion, max 10 seconds, no text.",
    },
  };
  const videos = [2, 3, 4].map((block) => ({
    scene: `${block}.1`,
    block,
    type: SHORTS_VIDEO_SCENE_TYPE,
    prompt: `Active historical action scene ${block}, cinematic motion, max 10 seconds`,
  }));

  const out = finalizeGeneratedVisualPromptMedia(
    [residualImage, ...videos],
    { format: "SHORTS" }
  );

  assert.equal(out[0].type, IMAGE_SCENE_TYPE);
  assert.equal(out[0].media_mode, "image");
  assert.equal(out[0].aspect_ratio, "9:16");
  assert.equal(out[0].production.broll_type, "image");
  assert.equal(out[0].production.generate_from_prompt, out[0].prompt);
  assert.doesNotMatch(out[0].prompt, /cinematic motion|max\s*10\s*seconds/i);
});

test("contrato final promove IMAGE com movimento real e sincroniza produção", () => {
  const out = finalizeGeneratedVisualPromptMedia(
    [
      {
        scene: "3.2",
        block: 3,
        type: "IMAGE",
        media_mode: "image",
        prompt:
          "A wooden crane lifting a Roman warship, dramatic low-angle tracking shot, water pouring from the hull.",
        production: {
          broll_type: "image",
          generate_from_prompt: "stale image prompt",
        },
      },
    ],
    { format: "LONGO" }
  );

  assert.equal(out[0].type, SHORTS_VIDEO_SCENE_TYPE);
  assert.equal(out[0].media_mode, "video");
  assert.equal(out[0].production.broll_type, "video");
  assert.equal(out[0].production.generate_from_prompt, out[0].prompt);
  assert.match(out[0].prompt, /cinematic motion|max 10 seconds/i);
});

test("contrato final preserva media_mode especial criado pela orquestração", () => {
  const out = finalizeGeneratedVisualPromptMedia(
    [
      {
        scene: "2.1",
        block: 2,
        type: "image",
        media_mode: "remotion",
        prompt:
          "Animated technical diagram with labels appearing in sequence, cinematic motion, max 10 seconds.",
        production: { broll_type: "image" },
      },
    ],
    { format: "SHORTS" }
  );

  assert.equal(out[0].media_mode, "remotion");
  assert.equal(out[0].type, IMAGE_SCENE_TYPE);
  assert.equal(out[0].production.broll_type, "image");
  assert.doesNotMatch(out[0].prompt, /cinematic motion|max\s*10\s*seconds/i);
});
