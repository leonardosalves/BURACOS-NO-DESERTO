import test from "node:test";
import assert from "node:assert/strict";

import { alternativeSuggestionConflict } from "./pioneerNicheDiscovery.js";

const previousIdeas = [
  "Um dia na vida de um Engenheiro de Faróis (século XIX)",
  "O Engenheiro dos Céus: Um Dia na Era dos Dirigíveis Gigantes",
  "O Guardião do Gás: Um Dia com o Engenheiro de Hidrogênio de Dirigíveis",
  "O Engenheiro das Células: Um Dia de Risco com Hidrogênio no Dirigível",
];

test("rejeita a mesma profissao/tecnologia com outro titulo", () => {
  const conflict = alternativeSuggestionConflict(
    {
      title: "O Primeiro Sopro de Hidrogênio no Gigante dos Céus",
      primarySubject: "engenheiro de hidrogênio de dirigíveis",
      specificAngle: "A inflação das células de um dirigível",
    },
    previousIdeas
  );

  assert.match(conflict, /repetido|sugerido/);
});

test("rejeita uma profissao antiga que ja apareceu no historico", () => {
  const conflict = alternativeSuggestionConflict(
    {
      title: "A Noite Solitária do Farol",
      primarySubject: "engenheiro de faróis",
      specificAngle: "A rotina de manutenção de um farol no século XIX",
    },
    previousIdeas
  );

  assert.match(conflict, /repetido|sugerido/);
});

test("aceita outra profissao extinta dentro da perspectiva editorial", () => {
  const conflict = alternativeSuggestionConflict(
    {
      title:
        "O Calculista que Impedia Pontes de Desabar Antes dos Computadores",
      primarySubject: "calculista de pontes ferroviárias",
      specificAngle:
        "Como calculistas verificavam pontes ferroviárias manualmente",
      searchQuery: "calculista pontes ferroviárias profissão antiga",
    },
    previousIdeas
  );

  assert.equal(conflict, "");
});

test("rejeita o caso real de engenheiro de equilibrio suspenso", () => {
  const conflict = alternativeSuggestionConflict(
    {
      title:
        "O Engenheiro do Equilíbrio Suspenso: A Calibração Final para o Primeiro Flutuar do Dirigível",
      primarySubject: "engenheiro de equilíbrio suspenso",
      specificAngle:
        "A micro-rotina de calibração das células de hidrogênio de um dirigível",
    },
    previousIdeas,
    [],
    { requireDifferentProfession: true }
  );

  assert.equal(conflict, "a profissao principal continua sendo a mesma");
});

test("nao permite esconder engenheiro atras de outro nome de assunto", () => {
  const conflict = alternativeSuggestionConflict(
    {
      title: "O Engenheiro que Ensinava o Dirigível a Flutuar",
      primarySubject: "especialista em equilíbrio suspenso",
      specificAngle: "O engenheiro calibra o dirigível antes do primeiro voo",
    },
    previousIdeas,
    [],
    { requireDifferentProfession: true }
  );

  assert.equal(conflict, "a profissao principal continua sendo a mesma");
});
