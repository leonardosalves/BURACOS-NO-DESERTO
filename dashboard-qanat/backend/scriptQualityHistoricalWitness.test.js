import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHistoricalWitnessContractBlock,
  buildNarrationOnlyPrompt,
  buildCreatorPhase2Prompt,
} from "./scriptQuality.js";

const historicalWitness = {
  contentMode: "HISTORICAL_WITNESS",
  niche: "Engenharia histórica",
  format: "SHORTS",
  character: {
    id: "engineer",
    label: "Engenheiro de campo",
    hint: "Testemunha a obra",
    description: "engenheiro civil presente na obra em 1927",
  },
  idea: {
    title: "A falha que mudou o rio",
    event: "Grande Enchente do Mississippi",
    period: "1927",
    location: "Mississippi, Estados Unidos",
    hiddenTruth: "A resposta alterou a política federal de controle de cheias.",
    popularBelief: "Foi apenas um desastre natural.",
    characterView: "Relata as decisões técnicas enquanto elas acontecem.",
    hook: "O dique diante de mim acaba de ceder.",
    certainty: "documentado",
  },
  blueprint: {
    title: "A noite em que o dique cedeu",
    hook: "O dique diante de mim acaba de ceder.",
    promise: "Mostrar como uma falha local mudou uma política nacional.",
    characterLock:
      "same 34-year-old field engineer, brown coat, leather notebook",
    voiceDirection: "primeira pessoa, presente, sem conhecimento do futuro",
    historicalFrame: {
      entity: "Mississippi River flood-control system",
      period: "1927",
      location: "Mississippi, United States",
      certainty: "documented",
    },
    blocks: [
      {
        block: 1,
        narration: "O dique diante de mim acaba de ceder.",
        causalRole: "causa",
        factBasis: "relatos documentados da enchente",
        visualEvidence: "dique rompido e água avançando",
        visualPrompt: "field engineer beside a breached levee",
      },
    ],
  },
};

test("contrato História Viva preserva identidade, entidade e causalidade", () => {
  const prompt = buildHistoricalWitnessContractBlock(historicalWitness);
  assert.match(prompt, /HISTORICAL_WITNESS/);
  assert.match(prompt, /same 34-year-old field engineer/);
  assert.match(prompt, /Grande Enchente do Mississippi/);
  assert.match(
    prompt,
    /CAUSA -> ACAO -> MECANISMO -> RESULTADO -> IMPORTANCIA/
  );
  assert.match(prompt, /Nunca funda dados de entidades/);
});

test("NARRADORPRO recebe o contrato na fase de narração", () => {
  const prompt = buildNarrationOnlyPrompt({
    niche: historicalWitness.niche,
    format: "SHORTS",
    idea: historicalWitness.idea,
    isHistoricalWitness: true,
    historicalWitness,
  });
  assert.match(prompt, /Este projeto NAO e uma ideia personalizada generica/);
  assert.match(prompt, /sem conhecimento do futuro/);
  assert.match(prompt, /Grande Enchente do Mississippi/);
});

test("fase visual recebe character lock e preserva narração aprovada", () => {
  const approvedNarration = "O dique diante de mim acaba de ceder.";
  const prompt = buildCreatorPhase2Prompt({
    niche: historicalWitness.niche,
    format: "SHORTS",
    idea: historicalWitness.idea,
    approvedNarration,
    isHistoricalWitness: true,
    historicalWitness,
  });
  assert.match(prompt, /same 34-year-old field engineer/);
  assert.match(prompt, /copie EXATAMENTE em narrative_script/);
  assert.match(prompt, new RegExp(approvedNarration.replace(".", "\\.")));
});
