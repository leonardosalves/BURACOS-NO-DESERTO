import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  balanceCaptionLines,
  groupCaptionsIntoSentencePages,
} from "./captionSentencePages.js";

function words(text) {
  return text.split(" ").map((word, index) => ({
    text: word,
    startMs: index * 200,
    endMs: index * 200 + 180,
  }));
}

describe("captionSentencePages", () => {
  it("mantém a frase inteira e inicia a próxima em nova página", () => {
    const pages = groupCaptionsIntoSentencePages(
      words(
        "A ponte resistiu ao impacto. Depois os engenheiros iniciaram a inspeção."
      )
    );
    assert.equal(pages.length, 2);
    assert.equal(
      pages[0].words.map((word) => word.text).join(" "),
      "A ponte resistiu ao impacto."
    );
    assert.equal(
      pages[1].words.map((word) => word.text).join(" "),
      "Depois os engenheiros iniciaram a inspeção."
    );
  });

  it("não corta frase em vírgula quando ela cabe", () => {
    const pages = groupCaptionsIntoSentencePages(
      words("Quando a água subiu, a estrutura distribuiu a pressão."),
      { maxCharacters: 90 }
    );
    assert.equal(pages.length, 1);
  });

  it("divide frase excepcionalmente longa em limite natural", () => {
    const pages = groupCaptionsIntoSentencePages(
      words(
        "A estrutura recebeu a carga principal, mas os cabos laterais continuaram transferindo forças para as torres durante toda a tempestade."
      ),
      { maxCharacters: 58, maxWords: 12 }
    );
    assert.ok(pages.length >= 2);
    assert.match(pages[0].words.at(-1).text, /,$/);
  });

  it("balanceia a página em no máximo duas linhas", () => {
    const lines = balanceCaptionLines(
      words("Esta frase aparece completa e permanece fácil de acompanhar"),
      24
    );
    assert.equal(lines.length, 2);
    assert.equal(lines.flat().length, 9);
  });

  it("merges a very short sentence with the next page to avoid flashing", () => {
    const pages = groupCaptionsIntoSentencePages(
      words("E agora? A estrutura comeca a girar lentamente."),
      { maxCharacters: 58, maxWords: 9 }
    );
    assert.equal(pages.length, 1);
    assert.equal(pages[0].words.length, 8);
  });

  it("keeps short pages separated when there is a real pause", () => {
    const input = words("Pare agora. Depois continuamos.");
    input[2].startMs = 2500;
    input[2].endMs = 2680;
    input[3].startMs = 2700;
    input[3].endMs = 2880;
    const pages = groupCaptionsIntoSentencePages(input, {
      pauseThresholdMs: 900,
    });
    assert.equal(pages.length, 2);
  });
});
