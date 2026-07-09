import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractNotebooklmQuestions,
  isNotebooklmAwaitingUser,
  assessNotebooklmReadiness,
  buildNotebooklmSessionFromResearch,
  replyNotebooklmSession,
} from "./notebooklmInteractive.js";

describe("notebooklmInteractive", () => {
  it("extrai perguntas do NotebookLM", () => {
    const text = `Aqui estão alguns fatos sobre Củ Chi.

Você gostaria que eu fizesse essa pesquisa na web agora?`;
    const questions = extractNotebooklmQuestions(text);
    assert.ok(questions.length >= 1);
    assert.match(questions[0], /pesquisa na web/i);
  });

  it("detecta quando NotebookLM aguarda resposta do editor", () => {
    const awaiting = isNotebooklmAwaitingUser(
      "Posso fazer uma pesquisa web sobre os túneis de Củ Chi agora?"
    );
    assert.equal(awaiting, true);

    const factsOnly = isNotebooklmAwaitingUser(
      "1. 250 km de túneis\n2. 3 andares\n3. 1960 — início da construção\n4. 45 mil soldados\n5. 11% de umidade\n6. Saídas camufladas"
    );
    assert.equal(factsOnly, false);
  });

  it("marca sessão como pendente quando há pergunta", () => {
    const session = buildNotebooklmSessionFromResearch({
      research: {
        summary:
          "Para aprofundar, você quer que eu pesquise na web os números oficiais?",
        awaitingUser: true,
        questions: ["Você quer que eu pesquise na web os números oficiais?"],
        available: true,
      },
      niche: "Engenharia de Guerra",
      format: "SHORTS",
      purpose: "script",
    });
    assert.equal(session.status, "pending_user");
    assert.equal(session.awaitingUser, true);
    assert.equal(session.readiness.ready, false);
  });

  it("nao trava em loop quando ja houve 2 respostas do editor", () => {
    const readiness = assessNotebooklmReadiness({
      awaitingUser: true,
      turns: [
        { role: "assistant", content: "Pergunta 1?" },
        { role: "user", content: "sim pesquise" },
        { role: "assistant", content: "Pergunta 2?" },
        { role: "user", content: "traga numeros" },
        { role: "assistant", content: "Mais uma pergunta?" },
      ],
      accumulatedSummary: "Fatos sobre cabos submarinos e fibra otica.",
    });
    assert.equal(readiness.ready, true);
  });

  it("sim para narração não dispara pesquisa web de novo", async () => {
    const session = {
      niche: "Cabos submarinos",
      format: "SHORTS",
      notebookId: "nb-1",
      researchDone: true,
      questions: ["Você quer que eu gere a narração de 60 segundos agora?"],
      turns: [
        {
          role: "assistant",
          content: "Fatos sobre cabos.",
          questions: [],
        },
      ],
      accumulatedSummary: "Fatos sobre cabos.",
      status: "pending_user",
      awaitingUser: true,
    };
    let researchCalled = false;
    const result = await replyNotebooklmSession({
      session,
      userReply: "Sim",
      backendDir: "/tmp",
      queryNotebook: async () => "não deveria consultar",
      runResearch: async () => {
        researchCalled = true;
      },
    });
    assert.equal(researchCalled, false);
    assert.equal(result.suggestProceed, true);
    assert.equal(result.session.awaitingUser, false);
  });

  it("sim para pesquisa web dispara runResearch quando ainda não feita", async () => {
    const session = {
      niche: "Cabos",
      format: "SHORTS",
      notebookId: "nb-2",
      researchDone: false,
      questions: ["Você gostaria que eu fizesse essa pesquisa na web agora?"],
      turns: [{ role: "assistant", content: "Poucas fontes." }],
      status: "pending_user",
      awaitingUser: true,
      initialQuestion: "fatos sobre cabos",
    };
    let researchCalled = false;
    await replyNotebooklmSession({
      session,
      userReply: "Sim",
      backendDir: "/tmp",
      queryNotebook: async () => "1. Fato A\n2. Fato B",
      runResearch: async () => {
        researchCalled = true;
      },
    });
    assert.equal(researchCalled, true);
  });

  it("libera prosseguir com material factual acumulado", () => {
    const readiness = assessNotebooklmReadiness({
      awaitingUser: false,
      turns: [
        { role: "assistant", content: "fatos" },
        { role: "user", content: "sim" },
        { role: "assistant", content: "mais fatos" },
        { role: "user", content: "traga números" },
        { role: "assistant", content: "ainda mais" },
      ],
      accumulatedSummary: [
        "1. Em 1968, os túneis de Củ Chi tinham 250 km de extensão total.",
        "2. O sistema tinha 3 níveis subterrâneos e 45 mil soldados passaram por ele.",
        "3. A umidade chegava a 90% e a temperatura a 32°C em trechos profundos.",
        "4. Saídas camufladas permitiam emboscadas a 11 km da base americana.",
        "5. Engenheiros vietnamitas escavaram 1 metro por dia em solo argiloso.",
        "6. Hospitais subterrâneos atendiam 200 feridos por semana com suprimentos limitados.",
        "7. Cozinhas escondidas produziam arroz para 3 mil combatentes por mês.",
        "8. Armadilhas punji cobriam 15% das entradas secundárias do complexo.",
      ].join("\n"),
    });
    assert.equal(readiness.ready, true);
    assert.ok(readiness.confidence >= 0.65);
  });
});
