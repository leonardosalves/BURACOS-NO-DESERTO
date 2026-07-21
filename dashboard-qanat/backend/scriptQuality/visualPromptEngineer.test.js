import test from "node:test";
import assert from "node:assert/strict";
import {
  VISUAL_DIEGETIC_TEXT_RULE,
  VISUAL_MINIMAL_TEXT_RULE,
  VIDEO_DIEGETIC_AUDIO_POLICY,
  assessCinematicVideoPromptDetail,
  buildVisualIdentityBrief,
  buildCinematicVideoPromptRepairPrompt,
  buildVisualPromptEngineerRequest,
  buildVisualPromptEngineerSystemPrompt,
  detectNicheFromContent,
  normalizeNicheHint,
  enforceVideoDiegeticAudioPolicy,
  enforceVisualLocalizedTextRule,
  enforceNarrativeMaterialFidelity,
} from "./visualPromptEngineer.js";

test("material estrutural central precisa ficar visível no prompt", () => {
  const prompt = enforceNarrativeMaterialFidelity(
    "A cinematic low-angle shot of the completed Home Insurance Building in Chicago.",
    {
      narration:
        "O primeiro arranha-céu permaneceu firme de pé e tinha paredes finas.",
      narrativeScript:
        "Seu esqueleto pioneiro de aço e ferro sustentava todo o peso.",
    }
  );

  assert.match(prompt, /load-bearing riveted steel-and-iron skeleton/i);
  assert.match(prompt, /thin non-load-bearing exterior cladding/i);
  assert.match(
    prompt,
    /do not depict a conventional massive load-bearing stone building/i
  );
  assert.equal(
    enforceNarrativeMaterialFidelity(prompt, {
      narration: "O primeiro arranha-céu permaneceu firme de pé.",
      narrativeScript: "Seu esqueleto de aço e ferro sustentava o peso.",
    }),
    prompt
  );
});

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
    assert.equal(essential.split(VISUAL_DIEGETIC_TEXT_RULE).length - 1, 1);
    assert.match(essential, /9:16 portrait composition/i);
  });

  await t.test("system prompt separa overlays da geração de mídia", () => {
    const prompt = buildVisualPromptEngineerSystemPrompt({ niche: "history" });

    assert.match(prompt, /metadados para o Remotion/i);
    assert.match(prompt, /2[\s–-]{1,3}5 palavras/i);
    assert.doesNotMatch(prompt, /ROAD CLOSED/);
    assert.doesNotMatch(prompt, /ESTRADA FECHADA/);
  });

  await t.test(
    "vídeo permite reação não verbal, mas bloqueia palavras, narração e música",
    () => {
      const result = enforceVideoDiegeticAudioPolicy(
        "Soldiers recoil with panicked gasps. Diegetic sound only: buzzing; absolutely no speech, no narration, no dialogue, no music.",
        "vídeo IA (max 10s)"
      );

      assert.equal(result.split(VIDEO_DIEGETIC_AUDIO_POLICY).length - 1, 1);
      assert.match(result, /non-verbal human reactions/i);
      assert.match(result, /Diegetic audio details: buzzing/i);
      assert.match(result, /no intelligible speech/i);
      assert.match(result, /no spoken words/i);
      assert.match(result, /no narration/i);
      assert.match(result, /no music/i);
      assert.doesNotMatch(result, /absolutely no speech/i);
    }
  );
});

test("detectNicheFromContent reconhece engenharia e nicheHint", async (t) => {
  await t.test("esqueleto de aço / engenharia civil → engineering", () => {
    const niche = detectNicheFromContent(
      { title_main: "O primeiro arranha-céu" },
      "Seu esqueleto pioneiro de aço e ferro sustentava todo o peso da estrutura de engenharia civil.",
      ""
    );
    assert.equal(niche, "engineering");
  });

  await t.test("nicheHint do wizard tem prioridade", () => {
    assert.equal(normalizeNicheHint("Engenharia antiga"), "engineering");
    const niche = detectNicheFromContent(
      { title_main: "Algo genérico" },
      "Texto sem palavras-chave fortes de nicho.",
      "",
      "engenharia"
    );
    assert.equal(niche, "engineering");
  });

  await t.test("skillsAddendum entra no system prompt do request", () => {
    const { systemPrompt, detectedNiche } = buildVisualPromptEngineerRequest(
      {
        strategy: { title_main: "Teste" },
        narrative_script: "Narração de teste com conteúdo suficiente para o payload.",
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            narration_text: "Cena de teste",
            type: "imagem IA 2k",
            prompt: "A steel beam close-up",
          },
        ],
      },
      {
        format: "LONGO",
        nicheHint: "engenharia",
        skillsAddendum:
          "## SKILLS DO ESTÚDIO — bundle \"visual-prompt\"\nUse stock_query concreto.",
      }
    );
    assert.equal(detectedNiche, "engineering");
    assert.match(systemPrompt, /SKILLS DO ESTÚDIO/);
    assert.match(systemPrompt, /visual-prompt/);
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
    assert.match(prompt, /120[–-]220 palavras/i);
    assert.match(prompt, /3 beats temporais/i);
    assert.match(prompt, /POV NÃO É PADRÃO/i);
    assert.match(prompt, /reações humanas NÃO VERBAIS/i);
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
                is_pov: false,
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
      assert.match(userPrompt, /"source_is_pov": false/i);
      assert.equal(typeof detectedNiche, "string");
    }
  );

  await t.test("gate rejeita microbeat e aceita mini-cena completa", () => {
    const sparse = assessCinematicVideoPromptDetail(
      "A Greek soldier throws a clay pot into a dark tunnel. Handheld camera. Buzzing sound. Max 10 seconds.",
      "vídeo IA (max 10s)"
    );
    assert.equal(sparse.ok, false);
    assert.ok(sparse.missing.includes("detail"));
    assert.ok(sparse.missing.includes("ending"));

    const detailed = `The sequence begins inside a narrow counter-tunnel beneath an ancient city, where Greek defenders crouch behind rough timber braces and hold fragile clay vessels while loose soil trembles under warm oil-lamp light. Their bronze helmets, linen armor and dirt-streaked hands remain physically grounded and period appropriate. The camera starts in a tight third-person tracking shot behind the defenders, revealing the confined passage and the advancing vibration in the wall. Then the earth breaks open and Roman sappers appear beyond the dust. A defender hurls the clay vessel; it shatters against the timber and releases a dense swarm into the cramped breach. The camera follows the impact without cutting, swings toward the Romans as they shield their eyes, lose formation and stumble over dropped tools. Bees cross shafts of amber light while dust and splinters thicken the air. The shot ends on the Roman group retreating into darkness as the Greeks stay behind their barricade. Audio uses cracking earth, breaking pottery, escalating buzzing, metal and tools striking soil, heavy breathing, gasps and panicked non-verbal cries. No intelligible speech, spoken words, dialogue, narration or music. Vertical 9:16 portrait composition, no text.`;
    const accepted = assessCinematicVideoPromptDetail(
      detailed,
      "vídeo IA (max 10s)"
    );
    assert.equal(accepted.ok, true);
    assert.ok(accepted.wordCount >= 110);
  });

  await t.test("reparo exige detalhe, fidelidade factual e POV opt-in", () => {
    const repair = buildCinematicVideoPromptRepairPrompt({
      format: "SHORTS",
      visualPrompts: [
        {
          scene: "2.2",
          type: "vídeo IA (max 10s)",
          narration_text: "Defensores lançaram enxames no contra-túnel.",
          prompt: "A soldier throws a pot.",
        },
      ],
    });

    assert.match(repair, /120 e 220 palavras/i);
    assert.match(repair, /no máximo 3 beats/i);
    assert.match(repair, /Reações humanas não verbais/i);
    assert.match(repair, /proíba fala inteligível/i);
    assert.match(repair, /POV somente quando source_is_pov=true/i);
    assert.match(repair, /não invente datas/i);
    assert.match(repair, /"source_is_pov": false/i);
    assert.match(repair, /9:16/i);
  });
});
