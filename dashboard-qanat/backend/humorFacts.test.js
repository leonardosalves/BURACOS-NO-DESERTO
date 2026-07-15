import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHumorIdeasPrompt,
  buildHumorNarrationPrompt,
  parseHumorIdeasResponse,
} from "./humorFacts.js";

test("prompt de ideias mantem a feature isolada e factual", () => {
  const prompt = buildHumorIdeasPrompt({
    niche: "engenharia antiga",
    format: "SHORTS",
  });
  assert.match(prompt, /EXCLUSIVA/);
  assert.match(prompt, /nao deve copiar, alterar ou alimentar automaticamente/);
  assert.match(prompt, /nao invente fonte/i);
  assert.match(prompt, /35 a 60 segundos/);
});

test("prompt longo pede explicacao aprofundada sem inventar detalhes", () => {
  const prompt = buildHumorNarrationPrompt({
    format: "LONGO",
    idea: {
      title: "Pontes teimosas",
      factualPremise: "Uma ponte documentada resistiu a tres reformas.",
    },
  });
  assert.match(prompt, /6 a 12 minutos/);
  assert.match(prompt, /nao acrescente nomes, datas, estatisticas/);
});

test("parser remove ideias sem premissa factual", () => {
  const ideas = parseHumorIdeasResponse(
    JSON.stringify({
      ideas: [
        {
          title: "Valida",
          factualPremise: "Fato verificavel",
          formatFit: "SHORTS",
        },
        { title: "Invalida", factualPremise: "" },
      ],
    })
  );
  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].title, "Valida");
});
