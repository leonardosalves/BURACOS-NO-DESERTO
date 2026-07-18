import test from "node:test";
import assert from "node:assert/strict";
import {
  isSceneSpecificFallbackPrompt,
  isPromptTooGeneric,
  buildSceneSpecificPrompt,
  enrichVisualPromptsSpecificity,
  extractSceneAnchors,
} from "./scenePromptSpecificity.js";

test("scenePromptSpecificity module", async (t) => {
  await t.test(
    "extractSceneAnchors parses species, actions, proper nouns, and years",
    () => {
      const narration =
        "Em 1994, o falcão-peregrino mergulha a 320 km por hora sobre a presa.";
      const anchors = extractSceneAnchors(narration);

      assert.equal(anchors.species?.en, "peregrine falcon");
      assert.equal(anchors.action, "plunge-diving");
      assert.deepEqual(anchors.years, ["1994"]);
      assert.ok(anchors.numbers.includes("320 km"));
    }
  );

  await t.test(
    "isPromptTooGeneric detects generic terms and narration pasting",
    () => {
      const narration = "O albatroz planar no céu de forma gloriosa.";
      const genericPrompt =
        "A generic bird flying in cinematic scene illustrating";
      const pastePrompt = "O albatroz planar no céu de forma gloriosa.";
      const specificPrompt =
        "Close-up shot of a wandering albatross gliding smoothly over deep blue ocean.";

      assert.ok(isPromptTooGeneric(genericPrompt, narration));
      assert.ok(isPromptTooGeneric(pastePrompt, narration));
      assert.ok(isPromptTooGeneric("", narration)); // empty prompt
      assert.ok(!isPromptTooGeneric(specificPrompt, narration));
    }
  );

  await t.test(
    "isSceneSpecificFallbackPrompt identifies matching patterns",
    () => {
      assert.ok(
        isSceneSpecificFallbackPrompt(
          "Photorealistic cinematic shot. Documentary science style, dramatic lighting"
        )
      );
      assert.ok(
        isSceneSpecificFallbackPrompt(
          "Photorealistic 2k drone shot. Documentary science style, dramatic lighting"
        )
      );
      assert.ok(
        !isSceneSpecificFallbackPrompt("A generic space station orbiting Mars")
      );
    }
  );

  await t.test(
    "buildSceneSpecificPrompt generates descriptive English prompt",
    () => {
      const vp = {
        narration_text: "O albatroz voando e mergulha no oceano",
        type: "video",
      };
      const prompt = buildSceneSpecificPrompt(vp);
      assert.match(prompt, /wandering albatross/i);
      assert.match(prompt, /plunge-diving/i);
      assert.match(prompt, /documentary science style/i);
    }
  );

  await t.test("keeps Remotion overlays out of generated source media", () => {
    const prompt = buildSceneSpecificPrompt({
      narration_text: "A estrada atravessa os Estados Unidos",
      type: "video",
      text_overlay: "A MAIOR ESTRADA",
    });

    assert.match(prompt, /added later in post-production/i);
    assert.match(prompt, /do not render words/i);
    assert.doesNotMatch(prompt, /A MAIOR ESTRADA/);
    assert.doesNotMatch(prompt, /text must be in Portuguese/i);
  });

  await t.test(
    "enrichVisualPromptsSpecificity corrects unspecific or paste prompts",
    () => {
      const visualPrompts = [
        {
          narration_text: "O falcão-peregrino voando rápido",
          prompt: "O falcão-peregrino voando rápido", // paste
          type: "video",
        },
        {
          narration_text: "Uma ponte de aço no rio",
          prompt: "Cinematic medium shot of a bridge crossing a wide river", // already specific
          type: "image",
        },
      ];

      const enriched = enrichVisualPromptsSpecificity(visualPrompts);
      assert.equal(enriched.length, 2);
      // The first one should have been corrected to English visual prompt
      assert.match(enriched[0].prompt, /peregrine falcon/i);
      assert.match(enriched[0].prompt, /photorealistic/i);
      // The second one should remain unchanged
      assert.equal(
        enriched[1].prompt,
        "Cinematic medium shot of a bridge crossing a wide river"
      );
    }
  );
});
