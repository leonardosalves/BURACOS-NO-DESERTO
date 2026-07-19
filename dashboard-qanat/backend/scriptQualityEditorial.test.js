import test from "node:test";
import assert from "node:assert/strict";
import {
  assessEditorialContract,
  assessNarrationReadiness,
  assessNarracaoProIntegrity,
  assessVisualStoryboardReadiness,
} from "./scriptQuality.js";

const completeNarracaoTrace = {
  etapa_1_recorte: "Como colmeias foram usadas em um cerco?",
  etapa_2_pesquisa: ["Relato do cerco — fonte: exemplo histórico"],
  etapa_3_entidades: [{ entidade: "Temiscira", funcao: "local do cerco" }],
  etapa_4_tese: { tese_completa: "Colmeias foram usadas para dificultar túneis." },
  etapa_5_fatos_selecionados: ["Colmeias foram lançadas contra túneis."],
  etapa_6_cadeia_causal: "Colmeias lançadas → insetos dispersos → recuo nos túneis",
  etapa_10_validacao_factual: {
    teste_identidade_passou: true,
    fusao_detectada: false,
  },
  etapa_11_validacao_narracao: { portoes_15_resultado: "Todos passaram" },
  etapa_12_validacao_entrega: { duracao_ok: true },
};

test("editorial contract flags a short without payoff", () => {
  const report = assessEditorialContract({
    format: "SHORTS",
    strategy: {
      hook: "Uma ponte mudou a engenharia",
      promise: "Entenda a mudança",
    },
    narrativeScript:
      "Uma ponte antiga parece simples. Ela foi construída com pedras pesadas. Os engenheiros trabalharam por anos. A estrutura resistiu ao rio. O método inspirou novas obras. Comenta aí.",
  });

  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes("Final sem payoff")));
});

test("narration readiness flags speech-unfriendly density", () => {
  const report = assessNarrationReadiness({
    format: "SHORTS",
    narrativeScript:
      "NASA e ONU divulgaram 20251234 dados importantes, mas esta frase foi construída para ficar deliberadamente longa e cansativa quando alguém tenta narrá-la sem uma pausa natural no meio.",
  });

  assert.equal(report.ok, true);
  assert.ok(report.longSentenceCount > 0);
  assert.ok(report.acronyms.includes("NASA"));
  assert.ok(report.recommendations.length > 0);
});

test("narration readiness rejects inflated abstractions instead of concrete consequences", () => {
  const report = assessNarrationReadiness({
    format: "SHORTS",
    narrativeScript:
      "Essa tática transformou a biologia em uma engenharia de defesa brutal.",
  });

  assert.equal(report.ok, false);
  assert.equal(report.inflatedAbstractionCount, 1);
  assert.ok(
    report.recommendations.some((item) => item.includes("causa e consequência"))
  );
});

test("NARRACAOPRO blocks an inflated lethal ending without explicit evidence", () => {
  const report = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "Os defensores lançavam colmeias contra os túneis. Os insetos obrigavam os soldados a recuar. A escavação terminou em picadas mortais.",
    trace: completeNarracaoTrace,
    researchFacts: ["O relato descreve insetos dispersos nos túneis e o recuo de soldados."],
    researchSources: [{ title: "Relato histórico", url: "https://example.com/source" }],
  });

  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes("Fechamento sensacionalista")));
  assert.equal(report.evidence.dramaticTerminalClaim, "picadas mortais");
});

test("NARRACAOPRO accepts a lethal ending when the research explicitly supports it", () => {
  const report = assessNarracaoProIntegrity({
    format: "SHORTS",
    narrativeScript:
      "Os defensores lançavam colmeias contra os túneis. O registro afirma que houve picadas mortais.",
    trace: completeNarracaoTrace,
    researchFacts: ["O registro consultado descreve mortes causadas por picadas letais."],
    researchSources: [{ title: "Relato histórico", url: "https://example.com/source" }],
  });

  assert.equal(
    report.issues.some((issue) => issue.includes("Fechamento sensacionalista")),
    false
  );
  assert.equal(report.evidence.dramaticClaimSupported, true);
});


test("visual readiness flags weak and repeated coverage", () => {
  const report = assessVisualStoryboardReadiness({
    format: "SHORTS",
    visualPrompts: [
      { prompt: "logo placeholder", narration_text: "Abertura" },
      { prompt: "ancient bridge close up" },
      {
        prompt: "ancient bridge close up",
        narration_text: "Detalhe",
        duration_seconds: 8,
      },
    ],
  });

  assert.equal(report.ok, false);
  assert.equal(report.missingNarrationCount, 1);
  assert.equal(report.duplicateVisualCount, 1);
  assert.equal(report.longSceneCount, 1);
});

test("editorial contract accepts a complete short structure", () => {
  const report = assessEditorialContract({
    format: "SHORTS",
    strategy: {
      hook: "Esta ponte romana ainda vence enchentes",
      promise: "O segredo é a pressão distribuída",
    },
    narrativeScript:
      "Esta ponte romana ainda vence enchentes. Ela não depende de cimento moderno para ficar de pé. Cada pedra empurra a próxima para dentro do arco. A água passa, mas o peso se espalha pelas laterais. Por isso o arco fica mais firme quando recebe carga e não desaba no meio. Séculos depois, engenheiros repetem o mesmo princípio em pontes modernas de concreto. O segredo não era força bruta. Era transformar pressão em estabilidade duradoura.",
  });

  assert.equal(report.ok, true);
});

test("editorial contract accepts a dense 4-sentence short in range", () => {
  const report = assessEditorialContract({
    format: "SHORTS",
    strategy: {
      hook: "Em cidades como Tóquio a engenharia desafia terremotos",
      promise: "Isoladores de base salvam o prédio",
    },
    narrativeScript:
      "Em cidades como Tóquio, a engenharia civil desafia os terremotos mais violentos com uma tática contra-intuitiva. Em vez de fixar a estrutura ao chão, engenheiros instalam isoladores de base feitos de borracha e aço. Esses blocos absorvem o impacto e estendem o período de vibração do edifício em até três vezes, diminuindo a força destrutiva do sismo em até oitenta por cento. Ao permitir que a fundação se mova enquanto o topo permanece estável, a física transforma o impacto violento em uma oscilação segura.",
  });

  assert.equal(report.ok, true);
  assert.equal(report.sentenceCount, 4);
  assert.ok(report.wordCount >= 70);
});

test("editorial contract recommends a mid-video CTA for long-form", () => {
  const report = assessEditorialContract({
    format: "LONGO",
    strategy: {
      hook: "Uma descoberta muda a história",
      promise: "Entenda a causa",
    },
    narrativeScript: Array.from(
      { length: 24 },
      (_, index) =>
        `Bloco ${index + 1}: o fato revela uma consequência importante porque muda o contexto da história.`
    ).join(" "),
  });

  assert.equal(report.checks.contextualCta, false);
  assert.ok(
    report.recommendations.some((item) => item.includes("CTA contextualizado"))
  );
});
