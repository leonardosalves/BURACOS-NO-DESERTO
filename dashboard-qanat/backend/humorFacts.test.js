import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHumorIdeasPrompt,
  buildHumorNarrationPrompt,
  buildHumorProductionPrompt,
  areHumorTopicsSimilar,
  filterNovelHumorIdeas,
  parseHumorIdeasResponse,
  parseHumorProductionResponse,
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

test("prompt de ideias incorpora a zona proibida da rodada", () => {
  const prompt = buildHumorIdeasPrompt({
    niche: "engenharia antiga",
    format: "SHORTS",
    generationSeed: 123,
    exclusionAddendum: "TOPICOS PROIBIDOS: Mecanismo de Anticitera",
  });
  assert.match(prompt, /RODADA DE PESQUISA: 123/);
  assert.match(prompt, /Mecanismo de Anticitera/);
  assert.match(prompt, /mesmo objeto, pessoa, obra, evento, mecanismo/);
});

test("comparacao reconhece reformulacoes do mesmo assunto", () => {
  assert.equal(
    areHumorTopicsSimilar(
      "O computador grego que previa eclipses: o Mecanismo de Anticitera",
      "A Maquina de Anticitera: computador antigo"
    ),
    true
  );
  assert.equal(
    areHumorTopicsSimilar(
      "Como funcionava um badgir nas casas persas",
      "O ar-condicionado persa movido a vento"
    ),
    true
  );
});

test("filtro elimina repeticoes contra projetos e dentro da rodada", () => {
  const filtered = filterNovelHumorIdeas(
    [
      {
        title: "O computador grego que previa o futuro",
        factualPremise: "O Mecanismo de Anticitera calculava eclipses.",
        confidence: "alta",
        sources: [{ url: "https://example.com/anticitera" }],
      },
      {
        title: "O elevador hidraulico do Coliseu",
        factualPremise: "Sistemas de contrapeso moviam plataformas.",
        confidence: "alta",
        sources: [{ url: "https://example.com/elevador" }],
      },
      {
        title: "Coliseu: plataformas que surgiam da arena",
        factualPremise: "Contrapesos moviam elevadores sob a arena.",
        confidence: "alta",
        sources: [{ url: "https://example.com/plataformas" }],
      },
    ],
    ["A Maquina de Anticitera: computador antigo"],
    [],
    { niche: "engenharia antiga" }
  );
  assert.deepEqual(
    filtered.ideas.map((idea) => idea.title),
    ["O elevador hidraulico do Coliseu"]
  );
  assert.equal(filtered.rejected.length, 2);
});

test("filtro impede fuga metaforica de um nicho de engenharia", () => {
  const filtered = filterNovelHumorIdeas(
    [
      {
        title: "A nevoa que congelou a Europa",
        factualPremise: "Uma erupcao alterou o clima do continente.",
        confidence: "alta",
        sources: [{ url: "https://example.com/laki" }],
      },
      {
        title: "Como o fogo quebrava pedras nas pedreiras antigas",
        factualPremise:
          "Uma tecnica humana de choque termico facilitava a extracao de pedra.",
        confidence: "alta",
        sources: [{ url: "https://example.com/quarry" }],
      },
    ],
    [],
    [],
    { niche: "engenharia antiga" }
  );
  assert.deepEqual(
    filtered.ideas.map((idea) => idea.title),
    ["Como o fogo quebrava pedras nas pedreiras antigas"]
  );
  assert.match(filtered.rejected[0].conflict, /fora do nicho/);
});

test("filtro rejeita premissa alienigena mesmo com fonte", () => {
  const filtered = filterNovelHumorIdeas(
    [
      {
        title: "Estatuas seriam visitantes de outro mundo",
        factualPremise: "A teoria diz que alienigenas inspiraram as figuras.",
        confidence: "media",
        sources: [{ url: "https://example.com/statues" }],
      },
    ],
    [],
    [],
    { niche: "engenharia antiga" }
  );
  assert.equal(filtered.ideas.length, 0);
  assert.match(filtered.rejected[0].conflict, /especulativa/);
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

test("plano humoristico exige prompts de imagem e video sem poluicao", () => {
  const prompt = buildHumorProductionPrompt({
    title: "Agua-viva de segunda-feira",
    narration:
      "Esta agua-viva reinicia o proprio ciclo. Enquanto isso, a gente ainda tenta reiniciar o roteador.",
    format: "SHORTS",
  });
  assert.match(prompt, /imagePrompt/);
  assert.match(prompt, /videoPrompt/);
  assert.match(prompt, /Escolha mediaType cena por cena/);
  assert.match(prompt, /Use image quando/);
  assert.match(prompt, /Use video somente quando/);
  assert.match(prompt, /SFX somente quando/i);
  assert.match(prompt, /NAO ALTERAR NENHUMA PALAVRA/);
});

test("parser preserva integralmente a narracao ao distribuir cenas", () => {
  const narration =
    "Primeira frase aprovada. Segunda frase aprovada! Terceira frase aprovada?";
  const plan = parseHumorProductionResponse(
    JSON.stringify({
      title: "Teste",
      scenes: [
        {
          mediaType: "image",
          mediaReason: "Artefato estatico.",
          imagePrompt: "Imagem um",
          videoPrompt: "",
        },
        {
          mediaType: "video",
          mediaReason: "Movimento indispensavel.",
          imagePrompt: "",
          videoPrompt: "Video dois",
        },
      ],
    }),
    narration
  );
  assert.equal(
    plan.scenes.map((scene) => scene.narration).join(" "),
    narration
  );
  assert.equal(plan.scenes.length, 2);
  assert.equal(plan.scenes[0].mediaType, "image");
  assert.equal(plan.scenes[0].videoPrompt, "");
  assert.equal(plan.scenes[1].mediaType, "video");
  assert.equal(plan.scenes[1].imagePrompt, "");
});

test("parser bloqueia cena sem prompt da midia escolhida", () => {
  assert.throws(
    () =>
      parseHumorProductionResponse(
        JSON.stringify({
          scenes: [{ mediaType: "video", imagePrompt: "Somente imagem" }],
        }),
        "Narracao aprovada com tamanho suficiente para uma cena completa."
      ),
    /nao trouxe o prompt correspondente/i
  );
});
