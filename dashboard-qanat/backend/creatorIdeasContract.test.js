import test from "node:test";
import assert from "node:assert/strict";
import {
  CreatorIdeasContractError,
  generateCreatorIdeasWithSingleRetry,
  validateCreatorExpressInput,
  validateCreatorExpressPayload,
  validateCreatorIdeasPayload,
} from "./creatorIdeasContract.js";

function validPayload() {
  return {
    diagnostic: { looking_for: "Histórias verificáveis" },
    ideas: Array.from({ length: 10 }, (_, index) => ({
      title: `Ideia ${index + 1}`,
    })),
    best_idea_index: 0,
    best_idea_reason: "Maior potencial de retenção",
  };
}

test("valida e normaliza os campos do Criador Express", () => {
  assert.deepEqual(
    validateCreatorExpressInput({
      theme: "  Buracos negros  ",
      niche: "  Ciência  ",
      tone: " educativo ",
      project: " short ciência/01 ",
    }),
    {
      ok: true,
      value: {
        theme: "Buracos negros",
        niche: "Ciência",
        tone: "educativo",
        project: "short_ci_ncia_01",
      },
    }
  );
});

test("bloqueia campos vazios e nomes de projeto sem letras ou números", () => {
  assert.equal(validateCreatorExpressInput({}).ok, false);
  assert.deepEqual(
    validateCreatorExpressInput({
      theme: "Tema",
      niche: "Nicho",
      project: "///",
    }),
    {
      ok: false,
      error: "O nome do projeto deve conter pelo menos uma letra ou número.",
    }
  );
});

test("exige narração válida na resposta do Criador Express", () => {
  assert.equal(validateCreatorExpressPayload(null).ok, false);
  assert.equal(validateCreatorExpressPayload({ narrative_script: "curto" }).ok, false);
  assert.deepEqual(
    validateCreatorExpressPayload({
      narrative_script: "Uma narração completa e pronta para revisão.",
    }),
    { ok: true, reason: "" }
  );
});

test("aceita uma resposta completa na primeira tentativa", async () => {
  let calls = 0;
  const result = await generateCreatorIdeasWithSingleRetry({
    basePrompt: "Gere ideias",
    generate: async () => {
      calls += 1;
      return JSON.stringify(validPayload());
    },
    parse: JSON.parse,
  });

  assert.equal(calls, 1);
  assert.equal(result.attempts, 1);
  assert.equal(result.data.ideas.length, 10);
});

test("repete automaticamente quando a primeira resposta não contém ideas", async () => {
  const prompts = [];
  const responses = [
    JSON.stringify({ diagnostic: { looking_for: "algo" } }),
    JSON.stringify(validPayload()),
  ];
  const result = await generateCreatorIdeasWithSingleRetry({
    basePrompt: "Gere ideias",
    generate: async ({ prompt }) => {
      prompts.push(prompt);
      return responses.shift();
    },
    parse: JSON.parse,
  });

  assert.equal(result.attempts, 2);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /campo ideas está ausente/);
  assert.match(prompts[1], /exatamente 10 itens/);
});

test("repete automaticamente quando o primeiro JSON é inválido", async () => {
  const responses = ["não é JSON", JSON.stringify(validPayload())];
  const result = await generateCreatorIdeasWithSingleRetry({
    basePrompt: "Gere ideias",
    generate: async () => responses.shift(),
    parse: JSON.parse,
  });

  assert.equal(result.attempts, 2);
  assert.equal(result.data.ideas.length, 10);
});

test("falha claramente depois de duas respostas incompletas", async () => {
  await assert.rejects(
    generateCreatorIdeasWithSingleRetry({
      basePrompt: "Gere ideias",
      generate: async () => JSON.stringify({ diagnostic: {} }),
      parse: JSON.parse,
    }),
    (error) => {
      assert.ok(error instanceof CreatorIdeasContractError);
      assert.equal(error.code, "CREATOR_IDEAS_INVALID_RESPONSE");
      assert.equal(error.details.attempts, 2);
      return true;
    }
  );
});

test("não repete quando o backend já respondeu pelo modo navegador", async () => {
  let calls = 0;
  const result = await generateCreatorIdeasWithSingleRetry({
    basePrompt: "Gere ideias",
    generate: async () => {
      calls += 1;
      return null;
    },
    parse: JSON.parse,
  });

  assert.equal(calls, 1);
  assert.equal(result.handledExternally, true);
});

test("validador exige exatamente dez ideias e índice recomendado válido", () => {
  const nineIdeas = validPayload();
  nineIdeas.ideas.pop();
  assert.deepEqual(validateCreatorIdeasPayload(nineIdeas), {
    ok: false,
    reason: "foram recebidas 9 de 10 ideias",
  });

  const invalidIndex = validPayload();
  invalidIndex.best_idea_index = 10;
  assert.deepEqual(validateCreatorIdeasPayload(invalidIndex), {
    ok: false,
    reason: "best_idea_index é inválido",
  });
});
