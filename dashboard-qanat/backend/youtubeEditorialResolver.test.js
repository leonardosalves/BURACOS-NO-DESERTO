import test from "node:test";
import assert from "node:assert/strict";
import {
  buildYoutubeEditorialFixPrompt,
  parseYoutubeEditorialFix,
  resolveYoutubeEditorialWithAi,
  sanitizeShortsKeywordTitle,
} from "./youtubeEditorialResolver.js";
import { generateResurrectorMetadata } from "./videoResurrector.js";

const narration =
  "A Ponte do Rio Danxui atravessa um cânion na China. Seu arco central se eleva a trezentos metros e distribui as forças pela estrutura.";

test("prompt editorial prende título e descrição à narração real", () => {
  const prompt = buildYoutubeEditorialFixPrompt({
    currentTitle: "Título antigo",
    currentDescription: "Descrição antiga",
    narration,
  });
  assert.match(prompt, /Não invente conteúdo/i);
  assert.match(prompt, /Ponte do Rio Danxui/);
  assert.match(prompt, /Título antigo/);
});

test("parser editorial aceita JSON cercado por markdown", () => {
  const parsed = parseYoutubeEditorialFix(
    '```json\n{"title":"Ponte do Rio Danxui","description":"Uma ponte sobre um cânion.","reason":"alinhado"}\n```'
  );
  assert.equal(parsed.title, "Ponte do Rio Danxui");
  assert.match(parsed.description, /cânion/);
});

test("Ressuscitador usa o mesmo resolvedor editorial do Quality Gate", async () => {
  let receivedPrompt = "";
  const result = await generateResurrectorMetadata(
    {
      title: "Título sem relação",
      currentMetadata: {
        title: "Título sem relação",
        description: narration,
        tags: ["ponte", "engenharia"],
      },
      format: "SHORTS",
      ageDays: 30,
      viewCount: 100,
    },
    {
      workspaceDir: process.cwd(),
      getApiKey: () => "test-key",
      callGemini: async (prompt) => {
        receivedPrompt = prompt;
        return JSON.stringify({
          title: "Ponte do Rio Danxui: 300 metros sobre o cânion",
          description:
            "Veja como a Ponte do Rio Danxui cruza o cânion e distribui as forças de seu arco.",
          reason: "O título agora reflete a narração.",
        });
      },
    }
  );
  assert.match(receivedPrompt, /Corrija SOMENTE a embalagem editorial/);
  assert.match(receivedPrompt, /Ponte do Rio Danxui/);
  assert.equal(
    result.proposed.title,
    "Ponte do Rio Danxui: 300 metros sobre o cânion"
  );
  assert.deepEqual(result.proposed.tags, ["ponte", "engenharia"]);
  assert.equal(result.usedFallback, false);
});

test("resolvedor editorial rejeita resposta sem descrição", async () => {
  await assert.rejects(
    resolveYoutubeEditorialWithAi({
      narration,
      generate: async () => '{"title":"Só título"}',
    }),
    /título e descrição válidos/i
  );
});

test("sanitizeShortsKeywordTitle move país/categoria para o final para garantir palavra-chave principal no início", () => {
  const res1 = sanitizeShortsKeywordTitle("China: Hotel de 30 andares construído em apenas 15 dias!");
  assert.equal(res1, "Hotel de 30 andares construído em apenas 15 dias na China!");

  const res2 = sanitizeShortsKeywordTitle("Ponte do Rio Danxui: 300 metros sobre o cânion");
  assert.equal(res2, "Ponte do Rio Danxui: 300 metros sobre o cânion");
});
