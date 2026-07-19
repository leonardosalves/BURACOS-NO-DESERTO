import test from "node:test";
import assert from "node:assert/strict";
import {
  browserVisualPromptsUsable,
  normalizeVisualPromptBlocks,
  parseBlockNumber,
} from "./scriptQuality.js";

test("browser visual prompts are preserved only when every scene is complete", () => {
  const complete = Array.from({ length: 8 }, (_, index) => ({
    scene: `${index + 1}.1`,
    narration_text: `Narração completa da cena ${index + 1}.`,
    prompt: `Detailed cinematic documentary scene ${index + 1} with a specific physical subject and setting`,
  }));

  assert.equal(browserVisualPromptsUsable(complete, { format: "LONGO" }), true);
  assert.equal(
    browserVisualPromptsUsable(
      complete.map((scene, index) =>
        index === 3 ? { ...scene, prompt: "" } : scene
      ),
      { format: "LONGO" }
    ),
    false
  );
});

test("normalizeVisualPromptBlocks injects missing first sentence", () => {
  const parsedData = {
    narrative_script:
      "Antes da eletricidade, a água movia o mundo. Quem mantinha essa força funcionando? Um engenheiro do século XVIII era o guardião. Após a tempestade, o moinho silenciava.",
    visual_prompts: [
      {
        scene: "1.2",
        block: 1,
        narration_text:
          "Quem mantinha essa força funcionando? Um engenheiro do século XVIII era o guardião.",
        type: "imagem IA 2k",
        prompt: "test prompt 1",
        editor_notes: "Ken Burns",
        stock_query: "watermill",
      },
      {
        scene: "1.3",
        block: 1,
        narration_text: "Após a tempestade, o moinho silenciava.",
        type: "imagem IA 2k",
        prompt: "test prompt 2",
        editor_notes: "Ken Burns",
        stock_query: "storm",
      },
    ],
    technical_config: {
      block_phrases: [
        { block: 1, phrase: "Antes da eletricidade, a água movia o mundo." },
      ],
    },
  };

  const result = normalizeVisualPromptBlocks(parsedData, {
    blockCount: 1,
    format: "SHORTS",
    ideaTitle: "Test",
    skipPromptEnrichment: true,
  });

  const vps = result.visual_prompts;

  // The first VP should now contain the missing sentence
  assert.ok(vps.length >= 3, `Expected at least 3 VPs, got ${vps.length}`);

  const firstVp = vps[0];
  assert.ok(
    firstVp.narration_text.includes("Antes da eletricidade"),
    `First VP should contain the missing sentence. Got: "${firstVp.narration_text}"`
  );

  // Scene numbering should be 1.1, 1.2, 1.3
  assert.equal(firstVp.scene, "1.1", "First scene should be renumbered to 1.1");
  assert.equal(vps[1].scene, "1.2");
  assert.equal(vps[2].scene, "1.3");
});

test("normalizeVisualPromptBlocks does NOT inject when all sentences are covered", () => {
  const parsedData = {
    narrative_script:
      "Antes da eletricidade, a água movia o mundo. Quem mantinha essa força funcionando?",
    visual_prompts: [
      {
        scene: "1.1",
        block: 1,
        narration_text: "Antes da eletricidade, a água movia o mundo.",
        type: "imagem IA 2k",
        prompt: "test prompt 1",
        editor_notes: "Ken Burns",
        stock_query: "watermill",
      },
      {
        scene: "1.2",
        block: 1,
        narration_text: "Quem mantinha essa força funcionando?",
        type: "imagem IA 2k",
        prompt: "test prompt 2",
        editor_notes: "Ken Burns",
        stock_query: "engineer",
      },
    ],
    technical_config: {
      block_phrases: [{ block: 1, phrase: "Antes da eletricidade" }],
    },
  };

  const result = normalizeVisualPromptBlocks(parsedData, {
    blockCount: 1,
    format: "SHORTS",
    ideaTitle: "Test",
    skipPromptEnrichment: true,
  });

  assert.equal(
    result.visual_prompts.length,
    2,
    "No extra VPs should be injected"
  );
});
