import test from "node:test";
import assert from "node:assert/strict";
import {
  isVideoVisualPrompt,
  normalizeReverseEngineeredStoryboard,
} from "./reverseEngineeringMedia.js";

test("engenharia reversa repara cenas antigas marcadas como imagem", () => {
  const storyboard = {
    reverse_engineering: { source: { url: "https://example.test/video" } },
    visual_prompts: [
      {
        scene: "1.1",
        type: "imagem IA 2k",
        image_prompt: "Frame inicial",
        video_prompt: "Mapa em movimento com travelling de câmera",
      },
    ],
  };

  const normalized = normalizeReverseEngineeredStoryboard(storyboard);
  const scene = normalized.visual_prompts[0];
  assert.equal(scene.type, "vídeo IA (max 10s)");
  assert.equal(scene.media_mode, "video");
  assert.equal(scene.prompt, scene.video_prompt);
  assert.equal(scene.production.broll_type, "video");
  assert.equal(scene.provenance, "video-reverse-engineering");
  assert.equal(isVideoVisualPrompt(scene, normalized), true);
});

test("detecção de vídeo usa media_mode mesmo se type estiver ausente", () => {
  assert.equal(isVideoVisualPrompt({ media_mode: "video" }), true);
  assert.equal(isVideoVisualPrompt({ type: "imagem IA 2k" }), false);
});
