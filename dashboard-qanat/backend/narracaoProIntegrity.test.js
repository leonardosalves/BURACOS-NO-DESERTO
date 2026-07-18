import test from "node:test";
import assert from "node:assert/strict";
import { assessNarracaoProIntegrity } from "./scriptQuality.js";

function validTrace(overrides = {}) {
  return {
    etapa_1_recorte: { pergunta: "Qual é a tese verificável?" },
    etapa_2_pesquisa: ["Estudo acadêmico — fonte: https://example.test/paper"],
    etapa_3_entidades: [{ entidade: "favo de mel" }],
    etapa_4_tese: { tese_completa: "A geometria permite uma comparação." },
    etapa_5_fatos_selecionados: ["eficiência geométrica"],
    etapa_6_cadeia_causal: {
      problema: "desperdício de espaço",
      mecanismo: "tesselação",
      consequencia: "comparação geométrica",
    },
    etapa_10_validacao_factual: {
      teste_identidade_passou: true,
      fusao_detectada: false,
    },
    etapa_11_validacao_narracao: {
      portoes_15_resultado: "Todos passaram",
    },
    etapa_12_validacao_entrega: {
      duracao_ok: true,
      fechamento_declarativo: true,
    },
    ...overrides,
  };
}

test("bloqueia o caso abelhas/Baalbek com influência histórica não comprovada", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "As abelhas influenciaram a engenharia antiga. Os romanos replicaram esse projeto em templos de alta resistência. O pátio hexagonal de Baalbek prova essa herança.",
    idea: {
      reality_status: "documented",
      promise: "Mostrar como as colmeias influenciaram estruturas antigas.",
      validation_needed:
        "Confirmar fontes acadêmicas que provem essa inspiração direta.",
    },
    trace: validTrace({ etapa_2_pesquisa: [] }),
  });

  assert.equal(audit.ok, false);
  assert.match(audit.issues.join(" "), /causal|influência|fonte/i);
});

test("bloqueia imitar ou copiar as abelhas mesmo sem depender da premissa", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "Na Roma antiga, construtores descobriram que imitar os favos evitava desabamentos. Copiar as abelhas garantiu a sobrevivência dos maiores monumentos.",
    idea: {
      reality_status: "documented",
      validation_needed:
        "Confirmar exemplos arquitetônicos e evidência histórica direta.",
    },
    trace: validTrace({ etapa_2_pesquisa: [] }),
  });

  assert.equal(audit.ok, false);
  assert.equal(audit.evidence.assertsCausality, true);
  assert.match(audit.issues.join(" "), /causal|fonte|pesquisa/i);
});

test("aceita comparação honesta sem alegar continuidade histórica", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "O hexágono aparece nos favos porque aproveita bem o espaço. Padrões hexagonais também aparecem na arte antiga, mas não há evidência de que os romanos copiaram as abelhas.",
    idea: {
      reality_status: "disputed",
      validation_needed: "Verificar se existiu influência direta.",
    },
    researchFacts: [
      {
        claim:
          "A conjectura do favo explica a eficiência geométrica da tesselação hexagonal.",
      },
    ],
    researchSources: [
      { title: "Honeycomb conjecture", url: "https://example.test" },
    ],
    trace: validTrace({
      etapa_3_entidades: [
        { entidade: "favo de mel" },
        { entidade: "mosaicos antigos" },
      ],
      etapa_5_fatos_selecionados: ["eficiência geométrica", "analogia visual"],
    }),
  });

  assert.equal(audit.ok, true);
});

test("bloqueia intenção psicológica inventada em El Castillo", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      'Sua mente seria "hackeada" ao subir esta escada antiga? A inclinação bloqueia a visão lateral, anulando a percepção do ambiente. Estudos de ergonomia e arquitetura ritualística sugerem que essa perda de referência causava desorientação e profunda reverência. A engenharia maia controlava fisicamente a percepção de quem subia.',
    idea: {
      reality_status: "documented",
      validation_needed:
        "Verificar se existe evidência de intenção psicológica no projeto.",
    },
    trace: validTrace({
      etapa_2_pesquisa: [
        "Estudos de ergonomia sugerem alterações de percepção em escadas.",
      ],
    }),
  });

  assert.equal(audit.ok, false);
  assert.equal(audit.evidence.assertsPsychologicalIntent, true);
  assert.equal(audit.evidence.usesSensationalNeuroscience, true);
  assert.equal(audit.evidence.usesVagueStudyAttribution, true);
  assert.match(
    audit.issues.join(" "),
    /neuropsicológica|psicológica|atribuição vaga/i
  );
});

test("aceita descrição física com limite factual explícito", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "A escadaria de El Castillo tem inclinação próxima de 45 graus, o que torna a subida exigente. Isso pode concentrar a atenção nos passos, mas não há evidência de que os maias tenham projetado a escada para desorientar visitantes.",
    idea: {
      reality_status: "documented",
      validation_needed:
        "Verificar se existe evidência de intenção psicológica no projeto.",
    },
    researchFacts: [
      {
        claim:
          "Medições arquitetônicas descrevem a inclinação da escadaria em aproximadamente 45 graus.",
      },
    ],
    researchSources: [
      {
        title: "The Sunlight Effect of the Kukulcán Pyramid",
        url: "https://doi.org/10.1007/s00004-010-0019-3",
      },
    ],
    trace: validTrace({
      etapa_2_pesquisa: ["Fonte: https://doi.org/10.1007/s00004-010-0019-3"],
      etapa_3_entidades: [{ entidade: "El Castillo" }],
      etapa_5_fatos_selecionados: [
        "inclinação de aproximadamente 45 graus",
        "ausência de prova sobre intenção psicológica",
      ],
    }),
  });

  assert.equal(audit.ok, true);
});

test("bloqueia excesso de fatos e entidades em Short", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript: "Texto factual sem relação causal extraordinária.",
    trace: validTrace({
      etapa_3_entidades: [{}, {}, {}, {}],
      etapa_5_fatos_selecionados: ["a", "b", "c", "d"],
    }),
  });

  assert.equal(audit.ok, false);
  assert.match(audit.issues.join(" "), /limite|entidades/i);
});

test("bloqueia qualquer narração sem trace obrigatório", () => {
  const audit = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript: "Uma frase curta e aparentemente correta.",
  });

  assert.equal(audit.ok, false);
  assert.match(audit.issues.join(" "), /trace/i);
});
