import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFormatScriptRules,
  buildListicleScriptRules,
  buildNarrationOnlyPrompt,
  buildFullScriptFromNarrationPrompt,
  buildCreatorPhase2Prompt,
  buildCreatorFullScriptPrompt,
  buildVisualPromptsFromNarrationPrompt,
  buildHumanizeRepairPrompt,
  buildNarrationHumanizeRepairPrompt,
  buildListicleRankingIdeasPrompt,
  normalizeListicleIdeasResponse,
  buildIdeaOpportunityAddendum,
  buildCustomIdeaEvaluationPrompt,
  normalizeIdeaOpportunity,
} from "./promptBuilders.js";

test("promptBuilders module", async (t) => {
  const commonCtx = {
    niche: "História",
    format: "LONGO",
    idea: {
      title: "Invenções Romanas",
      promise: "As maiores invenções de Roma",
      emotion: "Admiração",
    },
    isListicle: true,
    listicleRank: 5,
    listicleTopic: "Invenções",
    rankOrder: "desc",
    listicleBlockCount: 7,
  };

  await t.test("buildFormatScriptRules returns format rules", () => {
    const rules = buildFormatScriptRules("SHORTS");
    assert.match(rules, /REGRAS ESPECÍFICAS/i);
    assert.match(rules, /SHORTS/i);
  });

  await t.test(
    "buildListicleScriptRules returns structured listicle instructions",
    () => {
      const rules = buildListicleScriptRules({
        rankCount: 5,
        rankOrder: "desc",
        format: "LONGO",
        listTopic: "Pontes Romanas",
        blockCount: 7,
      });
      assert.match(rules, /MODO LISTICLE/i);
      assert.match(rules, /Pontes Romanas/i);
      assert.match(rules, /Chamada do ranking/i);
    }
  );

  await t.test(
    "buildNarrationOnlyPrompt generates string containing input idea info",
    () => {
      const prompt = buildNarrationOnlyPrompt({
        ...commonCtx,
        notebooklmContext: "Algumas fontes romanas",
      });
      assert.match(prompt, /Romanas/i);
      assert.match(prompt, /Algumas fontes romanas/i);
    }
  );

  await t.test(
    "buildFullScriptFromNarrationPrompt formats full script instructions",
    () => {
      const prompt = buildFullScriptFromNarrationPrompt({
        ...commonCtx,
        approvedNarration: "Roma antiga tinha aquedutos incríveis.",
      });
      assert.match(prompt, /Roma antiga tinha aquedutos incríveis/i);
    }
  );

  await t.test(
    "buildCreatorPhase2Prompt formats phase 2 script parameters",
    () => {
      const prompt = buildCreatorPhase2Prompt({
        approvedNarration: "Roma antiga tinha aquedutos incríveis.",
        ...commonCtx,
      });
      assert.match(prompt, /FASE 2/i);
    }
  );

  await t.test(
    "buildCreatorFullScriptPrompt outputs correctly formatted instructions",
    () => {
      const prompt = buildCreatorFullScriptPrompt({
        ...commonCtx,
      });
      assert.match(prompt, /Roteirista Profissional/i);
      assert.match(prompt, /Invenções/i);
    }
  );

  await t.test(
    "buildVisualPromptsFromNarrationPrompt formats visual prompts task",
    () => {
      const prompt = buildVisualPromptsFromNarrationPrompt({
        ...commonCtx,
        approvedNarration: "Roma antiga tinha aquedutos incríveis.",
      });
      assert.match(prompt, /Gere visual_prompts/i);
      assert.match(prompt, /renderizados depois pelo Remotion/i);
      assert.doesNotMatch(prompt, /Any visible text must be in Portuguese/i);
    }
  );

  await t.test("buildHumanizeRepairPrompt builds repair prompt", () => {
    const prompt = buildHumanizeRepairPrompt({
      format: "LONGO",
      ideaTitle: "Pontes Romanas",
      rawScript: { text: "Roteiro antigo" },
      blockCount: 5,
    });
    assert.match(prompt, /Roteiro antigo/i);
    assert.match(prompt, /Pontes Romanas/i);
  });

  await t.test(
    "buildNarrationHumanizeRepairPrompt builds narration repair prompt",
    () => {
      const prompt = buildNarrationHumanizeRepairPrompt({
        format: "LONGO",
        ideaTitle: "Pontes Romanas",
        narrative_script: "Roma antiga tinha aquedutos incríveis.",
        blockCount: 5,
      });
      assert.match(prompt, /Roma antiga tinha aquedutos incríveis/i);
    }
  );

  await t.test(
    "buildListicleRankingIdeasPrompt builds ranking ideas prompt",
    () => {
      const prompt = buildListicleRankingIdeasPrompt({
        niche: "Tecnologia",
        format: "SHORTS",
      });
      assert.match(prompt, /Sugerir exatamente 12 ideias/i);
    }
  );

  await t.test(
    "normalizeListicleIdeasResponse parses listicle ideas safely",
    () => {
      const rawData = {
        niche_analysis: { summary: "Bom nicho" },
        ranking_ideas: [
          {
            titulo: "Ideia 1",
            quantidade: 5,
            tema: "Tema 1",
            reality_status: "documented",
            evidence_anchor: "Relatório técnico identificado de 1924",
            validation_needed: "nenhuma validação crítica",
          },
        ],
      };
      const res = normalizeListicleIdeasResponse(rawData, { format: "SHORTS" });
      assert.equal(res.ranking_ideas[0].title, "Ideia 1");
      assert.equal(res.ranking_ideas[0].suggested_rank_count, 5);
    }
  );

  await t.test(
    "opportunity contract distinguishes evidence, saturation and format",
    () => {
      const prompt = buildIdeaOpportunityAddendum("SHORTS");
      assert.match(prompt, /saturation_level/i);
      assert.match(prompt, /no máximo 60 segundos/i);
      assert.match(prompt, /não invente volume/i);
    }
  );

  await t.test(
    "custom idea evaluation preserves the user idea and requests premium improvements",
    () => {
      const prompt = buildCustomIdeaEvaluationPrompt({
        niche: "história",
        format: "LONGO",
        title: "A ponte esquecida",
        researchContext: "CASO DOCUMENTADO: ponte X",
      });
      assert.match(prompt, /A ponte esquecida/);
      assert.match(prompt, /CASO DOCUMENTADO/);
      assert.match(prompt, /improved_title/);
    }
  );

  await t.test("opportunity normalization never assumes low saturation", () => {
    const idea = normalizeIdeaOpportunity(
      { title: "Tema" },
      { format: "SHORTS" }
    );
    assert.equal(idea.saturation_level, "unknown");
    assert.equal(idea.format_fit, "SHORTS");
    assert.equal(idea.reality_status, "disputed");
  });

  await t.test("pending factual validation cannot remain documented", () => {
    const idea = normalizeIdeaOpportunity({
      title: "Abelhas e engenharia antiga",
      reality_status: "documented",
      validation_needed:
        "Confirmar fontes que comprovem influência histórica direta.",
    });
    assert.equal(idea.reality_status, "disputed");
    assert.equal(idea.script_eligible, false);
    assert.match(idea.blocking_reasons.join(" "), /validação factual/i);
  });

  await t.test("only fully evidenced ideas are eligible for scripts", () => {
    const idea = normalizeIdeaOpportunity({
      title: "Ponte documentada",
      reality_status: "documented",
      evidence_anchor: "Relatório técnico municipal de 1924",
      validation_needed: "nenhuma validação crítica",
    });
    assert.equal(idea.script_eligible, true);
    assert.deepEqual(idea.blocking_reasons, []);
  });

  await t.test("listicle response removes disputed recommendations", () => {
    const response = normalizeListicleIdeasResponse({
      ranking_ideas: [
        {
          title: "Teoria sem prova",
          reality_status: "disputed",
          evidence_anchor: "Hipótese discutida por autores",
          validation_needed: "confirmar fontes",
        },
        {
          title: "Caso comprovado",
          reality_status: "documented",
          evidence_anchor: "Arquivo histórico municipal de 1924",
          validation_needed: "nenhuma validação crítica",
        },
      ],
      best_index: 0,
    });
    assert.equal(response.ranking_ideas.length, 1);
    assert.equal(response.ranking_ideas[0].title, "Caso comprovado");
    assert.equal(response.best_index, 0);
    assert.equal(response.rejected_idea_count, 1);
  });

  await t.test(
    "narration prompt carries the premium opportunity contract",
    () => {
      const prompt = buildNarrationOnlyPrompt({
        niche: "história",
        format: "LONGO",
        idea: {
          title: "A ponte esquecida",
          reality_status: "documented",
          evidence_anchor: "relatório técnico de 1924",
          undercovered_reason: "os vídeos tratam apenas da inauguração",
          premium_upgrade: "comparar a planta ao estado atual",
          validation_needed: "confirmar a data da reforma",
        },
      });
      assert.match(prompt, /CONTRATO DE OPORTUNIDADE DA IDEIA/);
      assert.match(prompt, /relatório técnico de 1924/);
      assert.match(prompt, /confirmar a data da reforma/);
    }
  );
});
