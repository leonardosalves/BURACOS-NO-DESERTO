import test from "node:test";
import assert from "node:assert/strict";
import {
  VISUAL_DIEGETIC_TEXT_RULE,
  VISUAL_MINIMAL_TEXT_RULE,
  buildVisualPromptEngineerSystemPrompt,
  enforceVisualLocalizedTextRule,
} from "./visualPromptEngineer.js";

test("Engenharia Visual PRO mantém a mídia-fonte sem texto editorial", async (t) => {
  await t.test("remove a regra antiga de tradução duplicada", () => {
    const legacy =
      "A cinematic road scene. Any visible text must be in Portuguese (Brazilian). Texto visível em português do Brasil.";
    const result = enforceVisualLocalizedTextRule(legacy);

    assert.match(result, /Clean source media/);
    assert.doesNotMatch(result, /visible text must be in Portuguese/i);
    assert.doesNotMatch(result, /Texto visível em português/i);
  });

  await t.test("não duplica a política ao reprocessar um prompt", () => {
    const once = enforceVisualLocalizedTextRule("Cinematic aerial view.");
    const twice = enforceVisualLocalizedTextRule(once);

    assert.equal(twice.split(VISUAL_MINIMAL_TEXT_RULE).length - 1, 1);
  });

  await t.test("texto diegético é opt-in e limitado", () => {
    const normal = enforceVisualLocalizedTextRule("Close-up of a document.");
    const essential = enforceVisualLocalizedTextRule(
      "Close-up of a document.",
      {
        allowDiegeticText: true,
      }
    );

    assert.doesNotMatch(normal, /four essential words/i);
    assert.match(essential, /four essential words/i);
    assert.ok(essential.endsWith(VISUAL_DIEGETIC_TEXT_RULE));
  });

  await t.test("system prompt separa overlays da geração de mídia", () => {
    const prompt = buildVisualPromptEngineerSystemPrompt({ niche: "history" });

    assert.match(prompt, /metadados para o Remotion/i);
    assert.match(prompt, /2 a 5 palavras/i);
    assert.doesNotMatch(prompt, /ROAD CLOSED/);
    assert.doesNotMatch(prompt, /ESTRADA FECHADA/);
  });
});
