import test from "node:test";
import assert from "node:assert/strict";
import {
  expandTextForTtsSpeech,
  numberToPortugueseWords,
  prepareTextForTtsEngine,
} from "./ttsSpeakableText.js";

test("números em português", () => {
  assert.equal(numberToPortugueseWords(0), "zero");
  assert.equal(numberToPortugueseWords(11), "onze");
  assert.equal(numberToPortugueseWords(21), "vinte e um");
  assert.equal(numberToPortugueseWords(100), "cem");
  assert.equal(numberToPortugueseWords(450), "quatrocentos e cinquenta");
  assert.match(numberToPortugueseWords(1280), /mil/);
});

test("450 m e 11 mil t em falável", () => {
  const a = expandTextForTtsSpeech("A estrutura media 450 m sobre o rio.");
  assert.match(a, /quatrocentos e cinquenta/);
  assert.match(a, /me tros|metros/i);
  assert.doesNotMatch(a, /\b450\b/);

  const b = expandTextForTtsSpeech("Usaram 11 mil t de pedra.");
  // "11 mil" pode virar "onze" + "mil" + toneladas
  assert.match(b, /onze|mil/i);
  assert.match(b, /to nelad|tonelad/i);
  assert.doesNotMatch(b, /\b\d+\s*t\b/i);
});

test("a.C. e d.C.", () => {
  const a = expandTextForTtsSpeech("A ponte data de 62 d.C.");
  assert.match(a, /depois de Cristo/i);
  assert.match(a, /sessenta e dois/i);

  const b = expandTextForTtsSpeech("Em 305 a.C. começaram a obra.");
  assert.match(b, /antes de Cristo/i);
});

test("AC não é expandido dentro de palavras com letras acentuadas", () => {
  const original =
    "O transe da sacerdotisa parecia divino, mas resultava de química e acústica.";
  const result = expandTextForTtsSpeech(original);
  assert.equal(result, original);
  assert.doesNotMatch(result, /antes de Cristo/i);
  assert.doesNotMatch(result, /Cristostica/i);
  assert.equal(
    expandTextForTtsSpeech(
      "O projeto acústico analisou ação, acesso e acidentes."
    ),
    "O projeto acústico analisou ação, acesso e acidentes."
  );
});

test("km e percent", () => {
  const t = expandTextForTtsSpeech("Ficava a 12 km e 15% do total.");
  assert.match(t, /qui lômetros|quilômetros/i);
  assert.match(t, /por cento/i);
});

test("prepareTextForTtsEngine remove tags", () => {
  const t = prepareTextForTtsEngine(
    "Foram [pausa] 200 toneladas. [ênfase] em 14 d.C."
  );
  assert.doesNotMatch(t, /\[pausa\]/);
  assert.match(t, /to nelad|tonelad/i);
  assert.match(t, /depois de Cristo/i);
});
