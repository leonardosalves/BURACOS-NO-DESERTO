import test from "node:test";
import assert from "node:assert/strict";
import { assessAutomaticScriptQuality } from "./scriptQuality/index.js";

function validTrace(overrides = {}) {
  return {
    etapa_1_recorte: { pergunta: "Qual tese pode ser demonstrada?" },
    etapa_2_pesquisa: ["Fonte tecnica - fonte: https://example.test/bridge"],
    etapa_3_entidades: [{ entidade: "ponte romana" }],
    etapa_4_tese: { tese_completa: "O arco distribui carga pelas laterais." },
    etapa_5_fatos_selecionados: ["arco distribui carga", "pedras trabalham em compressao"],
    etapa_6_cadeia_causal: {
      problema: "atravessar rios com materiais pesados",
      mecanismo: "compressao no arco",
      consequencia: "estrutura mais estavel",
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

test("automatic script quality passes a strong deterministic short", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {
      hook: "Por que esta ponte romana ainda muda a engenharia?",
      promise: "O segredo e transformar pressao em estabilidade.",
    },
    narrativeScript:
      "Por que esta ponte romana ainda muda a engenharia? Ela parece simples, mas cada pedra trabalha como parte de uma maquina precisa. O arco distribui o peso para as laterais e reduz a pressao no centro. A agua passa por baixo, enquanto a estrutura empurra as cargas para apoios mais fortes. Por isso a ponte nao depende de cimento moderno para continuar firme. Seculos depois, a mesma logica aparece em obras que precisam vencer vao, peso e correnteza. Nao era forca bruta. O segredo era transformar pressao em estabilidade duradoura.",
    researchFacts: [
      {
        claim:
          "Arcos de alvenaria trabalham principalmente por compressao e transferem carga para os apoios laterais.",
      },
    ],
    researchSources: [{ title: "Bridge engineering", url: "https://example.test/bridge" }],
    trace: validTrace(),
  });

  assert.equal(report.passed, true);
  assert.equal(report.hardBlockers.length, 0);
  assert.ok(report.score >= 80);
  assert.equal(report.dimensions.editorial.ok, true);
  assert.equal(report.dimensions.narration.ok, true);
  assert.equal(report.dimensions.factual.ok, true);
  assert.equal(report.dimensions.retention.ok, true);
  assert.equal(report.dimensions.retention.checks.contextualCta, false);
});

test("automatic script quality fails a weak script with deterministic recommendations", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {},
    narrativeScript: "Oi pessoal. Hoje eu vou falar de uma ponte antiga. Comenta ai.",
  });

  assert.equal(report.passed, false);
  assert.ok(report.score < 80);
  assert.ok(report.hardBlockers.some((item) => item.includes("Factual:")));
  assert.ok(report.recommendations.length > 0);
  assert.equal(report.dimensions.editorial.ok, false);
  assert.equal(report.dimensions.factual.ok, false);
});

test("automatic script quality blocks generic greetings before asset generation", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {
      hook: "Oi pessoal, hoje eu vou falar de uma ponte romana.",
      promise: "O arco transforma pressao em estabilidade.",
    },
    narrativeScript:
      "Oi pessoal, hoje eu vou falar de uma ponte romana. Ela parece antiga, mas o arco esconde uma decisao de engenharia muito precisa. O peso entra pelo centro e viaja para os apoios laterais. Por isso a ponte fica estavel mesmo quando a correnteza tenta empurrar as pedras. Depois, essa mesma logica apareceu em outras obras que precisavam vencer vao e carga. O resultado era uma estrutura simples, resistente e facil de repetir.",
    researchFacts: [
      {
        claim:
          "Arcos de alvenaria transferem carga para apoios laterais e trabalham por compressao.",
      },
    ],
    researchSources: [{ title: "Bridge engineering", url: "https://example.test/bridge" }],
    trace: validTrace(),
  });

  assert.equal(report.passed, false);
  assert.equal(report.dimensions.retention.ok, false);
  assert.ok(
    report.dimensions.retention.issues.some((issue) =>
      issue.includes("saudação genérica")
    )
  );
  assert.ok(
    report.dimensions.retention.diagnostics.some(
      (item) => item.severity === "blocking" && item.points > 0
    )
  );
});

test("automatic script quality blocks clickbait without final payoff", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {
      hook: "Voce nao vai acreditar no segredo desta ponte romana.",
      promise: "O segredo da ponte precisa ser revelado no final.",
    },
    narrativeScript:
      "Voce nao vai acreditar no segredo desta ponte romana. Durante seculos, viajantes passaram por ela sem entender por que ainda chamava tanta atencao. As pedras ficam alinhadas em uma forma que parece comum, mas cria expectativa a cada detalhe. Depois aparecem marcas, medidas e escolhas de construcao que prometem uma revelacao maior. A historia cresce como se existisse uma resposta escondida em cada bloco. No fim, fica apenas a sensacao de misterio. Comenta se voce ja viu algo assim.",
    researchFacts: [
      {
        claim:
          "Arcos de alvenaria transferem carga para apoios laterais e trabalham por compressao.",
      },
    ],
    researchSources: [{ title: "Bridge engineering", url: "https://example.test/bridge" }],
    trace: validTrace(),
  });

  assert.equal(report.passed, false);
  assert.equal(report.dimensions.retention.ok, false);
  assert.ok(
    report.dimensions.retention.issues.some((issue) =>
      issue.includes("clickbait")
    )
  );
  assert.equal(report.dimensions.retention.checks.payoff, false);
});

test("automatic script quality blocks excessive repetition", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {
      hook: "Por que esta ponte romana ainda muda a engenharia?",
      promise: "O arco transforma pressao em estabilidade.",
    },
    narrativeScript:
      "Por que esta ponte romana ainda muda a engenharia? A ponte mostra como o arco distribui peso. A ponte mostra como o arco distribui peso quando a carga aumenta. A ponte mostra como o arco distribui peso nos apoios laterais. A ponte mostra como o arco distribui peso sem depender de forca bruta. Por isso a estrutura transforma pressao em estabilidade. O resultado e uma licao simples: repetir carga pelas laterais mantem a ponte firme.",
    researchFacts: [
      {
        claim:
          "Arcos de alvenaria transferem carga para apoios laterais e trabalham por compressao.",
      },
    ],
    researchSources: [{ title: "Bridge engineering", url: "https://example.test/bridge" }],
    trace: validTrace(),
  });

  assert.equal(report.passed, false);
  assert.equal(report.dimensions.retention.ok, false);
  assert.equal(report.dimensions.retention.checks.repetition, false);
  assert.ok(
    report.dimensions.retention.issues.some((issue) =>
      issue.includes("repetid")
    )
  );
});

test("automatic script quality hard-blocks unsupported factual causality", () => {
  const report = assessAutomaticScriptQuality({
    format: "SHORTS",
    strategy: {
      hook: "As abelhas ensinaram Roma a construir?",
      promise: "A origem escondida dos templos hexagonais.",
    },
    narrativeScript:
      "As abelhas influenciaram a engenharia antiga. Os romanos copiaram os favos e aplicaram esse modelo em templos resistentes. Essa origem prova que a natureza forneceu o projeto secreto. Por isso o hexagono virou uma assinatura de poder duradouro.",
    idea: {
      reality_status: "documented",
      validation_needed: "Confirmar fontes academicas que provem essa inspiracao direta.",
    },
    trace: validTrace({ etapa_2_pesquisa: [] }),
  });

  assert.equal(report.passed, false);
  assert.ok(report.score <= 49);
  assert.ok(report.hardBlockers.some((item) => /causal|fonte|pesquisa/i.test(item)));
  assert.equal(report.dimensions.factual.ok, false);
  assert.equal(report.dimensions.factual.evidence.assertsCausality, true);
});

test("automatic script quality returns stable output for identical input", () => {
  const input = {
    format: "SHORTS",
    strategy: {
      hook: "Por que esta ponte romana ainda muda a engenharia?",
      promise: "O segredo e transformar pressao em estabilidade.",
    },
    narrativeScript:
      "Por que esta ponte romana ainda muda a engenharia? Ela parece simples, mas cada pedra trabalha como parte de uma maquina precisa. O arco distribui o peso para as laterais e reduz a pressao no centro. A agua passa por baixo, enquanto a estrutura empurra as cargas para apoios mais fortes. Por isso a ponte nao depende de cimento moderno para continuar firme. Seculos depois, a mesma logica aparece em obras que precisam vencer vao, peso e correnteza. Nao era forca bruta. O segredo era transformar pressao em estabilidade duradoura.",
    researchFacts: [
      {
        claim:
          "Arcos de alvenaria trabalham principalmente por compressao e transferem carga para os apoios laterais.",
      },
    ],
    researchSources: [{ title: "Bridge engineering", url: "https://example.test/bridge" }],
    trace: validTrace(),
  };

  assert.deepEqual(
    assessAutomaticScriptQuality(input),
    assessAutomaticScriptQuality(input)
  );
});
