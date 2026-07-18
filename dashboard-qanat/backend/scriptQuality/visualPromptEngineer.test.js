import test from "node:test";
import assert from "node:assert/strict";
import {
  VISUAL_DIEGETIC_TEXT_RULE,
  VISUAL_MINIMAL_TEXT_RULE,
  buildVisualIdentityBrief,
  buildVisualPromptEngineerRequest,
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
    assert.match(prompt, /2[\s–-]{1,3}5 palavras/i);
    assert.doesNotMatch(prompt, /ROAD CLOSED/);
    assert.doesNotMatch(prompt, /ESTRADA FECHADA/);
  });
});

test("Engenharia Visual PRO prioriza identidade + unidade roteiro↔imagem", async (t) => {
  await t.test("DNA visual extrai título e continuidade", () => {
    const brief = buildVisualIdentityBrief({
      strategy: {
        title_main: "O Inesperado Poder do Álcool",
        hook: "Prepare-se para histórias absurdas",
        tone: "documental curiosidade",
      },
      narrative:
        "O álcool influenciou decisões absurdas. No Titanic, um homem mantinha a calma.",
      niche: "history",
      format: "SHORTS",
    });

    assert.match(brief.title, /Álcool/i);
    assert.ok(brief.continuity_rules.length >= 3);
    assert.match(brief.palette_and_light, /Period-accurate|cinematic/i);
  });

  await t.test("system prompt exige peça única e gancho por frame", () => {
    const prompt = buildVisualPromptEngineerSystemPrompt({
      niche: "history",
      format: "SHORTS",
      identityBrief: buildVisualIdentityBrief({
        strategy: { title_main: "Teste", hook: "Gancho" },
        niche: "history",
      }),
    });

    assert.match(prompt, /Peça única/i);
    assert.match(prompt, /visual_hook/i);
    assert.match(prompt, /identity_tags/i);
    assert.match(prompt, /narrative_job/i);
    assert.match(prompt, /DNA VISUAL/i);
    assert.match(prompt, /UNIDADE ROTEIRO/i);
    assert.match(prompt, /DIEGETIC AUDIO|no speech|no music|no narration/i);
  });

  await t.test(
    "request envia continuidade prev/next e brief de identidade",
    () => {
      const { userPrompt, identityBrief, detectedNiche } =
        buildVisualPromptEngineerRequest(
          {
            strategy: {
              title_main: "Poder do Álcool",
              hook: "Histórias reais absurdas",
            },
            narrative_script:
              "Prepare-se. O álcool. No Titanic um homem mantinha a calma.",
            visual_prompts: [
              {
                scene: "1.1",
                block: 1,
                narration_text: "Prepare-se para histórias absurdas.",
                type: "vídeo IA (max 10s)",
                prompt: "generic people talking",
              },
              {
                scene: "1.2",
                block: 1,
                narration_text: "No Titanic um homem mantinha a calma.",
                type: "imagem IA 2k",
                prompt: "old ship",
              },
            ],
          },
          { format: "SHORTS" }
        );

      assert.ok(identityBrief);
      assert.match(userPrompt, /prev_narration/i);
      assert.match(userPrompt, /next_narration/i);
      assert.match(userPrompt, /visual_identity_brief/i);
      assert.match(userPrompt, /UM FILME COESO/i);
      assert.equal(typeof detectedNiche, "string");
    }
  );
});
