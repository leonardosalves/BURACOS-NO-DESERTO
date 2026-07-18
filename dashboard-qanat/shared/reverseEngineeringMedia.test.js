import test from "node:test";
import assert from "node:assert/strict";
import {
  isVideoVisualPrompt,
  normalizeReverseEngineeredStoryboard,
  resolveReverseEngineeringMediaType,
} from "./reverseEngineeringMedia.js";

test("adaptive preserva cenas de imagem da engenharia reversa", () => {
  const storyboard = {
    reverse_engineering: {
      source: { url: "https://example.test/video" },
      media_strategy: "adaptive",
    },
    visual_prompts: [
      {
        scene: "1.1",
        type: "imagem IA",
        media_mode: "image",
        image_prompt: "Documento historico em close",
        prompt: "Documento historico em close",
        production: {
          broll_type: "image",
          generation_source: "video-reverse-engineering",
        },
        provenance: "video-reverse-engineering",
      },
      {
        scene: "1.2",
        type: "vídeo IA (max 10s)",
        media_mode: "video",
        video_prompt: "Engrenagens girando em sequencia",
        prompt: "Engrenagens girando em sequencia",
        production: {
          broll_type: "video",
          generation_source: "video-reverse-engineering",
        },
        provenance: "video-reverse-engineering",
      },
    ],
  };

  const normalized = normalizeReverseEngineeredStoryboard(storyboard);
  assert.equal(normalized.visual_prompts[0].media_mode, "image");
  assert.equal(normalized.visual_prompts[0].type, "imagem IA");
  assert.equal(normalized.visual_prompts[0].video_prompt, "");
  assert.equal(normalized.visual_prompts[0].production.broll_type, "image");
  assert.equal(
    isVideoVisualPrompt(normalized.visual_prompts[0], normalized),
    false
  );

  assert.equal(normalized.visual_prompts[1].media_mode, "video");
  assert.equal(normalized.visual_prompts[1].type, "vídeo IA (max 10s)");
  assert.equal(
    isVideoVisualPrompt(normalized.visual_prompts[1], normalized),
    true
  );
});

test("video_only ainda forca todas as cenas para video", () => {
  const storyboard = {
    reverse_engineering: {
      source: { url: "https://example.test/video" },
      media_strategy: "video_only",
    },
    visual_prompts: [
      {
        scene: "1.1",
        type: "imagem IA",
        media_mode: "image",
        image_prompt: "Mapa antigo",
        provenance: "video-reverse-engineering",
      },
    ],
  };

  const normalized = normalizeReverseEngineeredStoryboard(storyboard);
  const scene = normalized.visual_prompts[0];
  assert.equal(scene.type, "vídeo IA (max 10s)");
  assert.equal(scene.media_mode, "video");
  assert.ok(String(scene.video_prompt || scene.prompt).length > 0);
  assert.equal(scene.production.broll_type, "video");
  assert.equal(isVideoVisualPrompt(scene, normalized), true);
});

test("resolveReverseEngineeringMediaType le broll_type e type", () => {
  assert.equal(
    resolveReverseEngineeringMediaType({
      type: "imagem IA",
      media_mode: "image",
    }),
    "image"
  );
  assert.equal(
    resolveReverseEngineeringMediaType({
      production: { broll_type: "video" },
    }),
    "video"
  );
});

test("detecção de vídeo usa media_mode mesmo se type estiver ausente", () => {
  assert.equal(isVideoVisualPrompt({ media_mode: "video" }), true);
  assert.equal(isVideoVisualPrompt({ type: "imagem IA 2k" }), false);
});
