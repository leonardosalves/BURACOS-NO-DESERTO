import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectProjectTopics, mergeExclusionTopics } from "./ideasVariety.js";

test("coletor inclui titulos alternativos que revelam o assunto real", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-ideas-"));
  const project = path.join(root, "videos longos", "Projeto_Generico");
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "build_video.py"), "");
  fs.writeFileSync(
    path.join(project, "storyboard.json"),
    JSON.stringify({
      strategy: {
        title_main: "O computador de dois mil anos",
        title_variations: [
          "A Maquina de Anticitera: o computador antigo",
          "Mecanismo de Anticitera revelado",
        ],
        hook: "Uma caixa de engrenagens encontrada no mar.",
      },
    })
  );

  try {
    const topics = collectProjectTopics(root);
    assert.ok(topics.includes("A Maquina de Anticitera: o computador antigo"));
    assert.ok(topics.includes("Mecanismo de Anticitera revelado"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("mergeExclusionTopics nao bloqueia sugestoes do historico a menos que exista projeto real", () => {
  const historyTopics = [
    "A Ponte Romana que Nunca Morria",
    "O Truque do Balde d'Água",
  ];
  const projectTopics = ["A Ponte Romana que Nunca Morria"];

  const excluded = mergeExclusionTopics({
    projectTopics,
    historyTopics,
    previousIdeas: [],
  });

  // O tema com projeto real 'A Ponte Romana' DEVE ser bloqueado
  assert.ok(excluded.some((t) => t.toLowerCase().includes("ponte romana")));

  // O tema sem projeto 'O Truque do Balde d'Água' NAO deve ser bloqueado
  assert.ok(!excluded.some((t) => t.toLowerCase().includes("balde")));
});
