import test from "node:test";
import assert from "node:assert/strict";
import { assessEditorialContract } from "./scriptQuality.js";

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
