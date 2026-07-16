import test from "node:test";
import assert from "node:assert";
import {
  numberToWordsPtBr,
  replaceNumbersAndAbbreviationsPtBr,
  convertCinematicMarkersForTts,
} from "./videoProEnhancements.js";

test("numberToWordsPtBr - conversões corretas", () => {
  assert.strictEqual(numberToWordsPtBr(0), "zero");
  assert.strictEqual(numberToWordsPtBr(8), "oito");
  assert.strictEqual(numberToWordsPtBr(15), "quinze");
  assert.strictEqual(numberToWordsPtBr(80), "oitenta");
  assert.strictEqual(numberToWordsPtBr(100), "cem");
  assert.strictEqual(numberToWordsPtBr(120), "cento e vinte");
  assert.strictEqual(numberToWordsPtBr(800), "oitocentos");
  assert.strictEqual(numberToWordsPtBr(1000), "mil");
  assert.strictEqual(numberToWordsPtBr(1500), "mil e quinhentos");
  assert.strictEqual(
    numberToWordsPtBr(4450),
    "quatro mil quatrocentos e cinquenta"
  );
  assert.strictEqual(numberToWordsPtBr(1000000), "um milhão");
});

test("replaceNumbersAndAbbreviationsPtBr - números e abreviações com preservação de tags", () => {
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "Ela começa no Alasca, nos EUA, e retorna aos E.U.A."
    ),
    "Ela começa no Alasca, nos Estados Unidos, e retorna aos Estados Unidos."
  );

  // Teste com abreviações d.C. e a.C.
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "O templo foi construído em 450 a.C. e destruído em 70 d.C."
    ),
    "O templo foi construído em quatrocentos e cinquenta antes de Cristo e destruído em setenta depois de Cristo"
  );

  // Teste com abreviações a. C. (com espaço após ponto) e AC/DC sem pontos
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "Construído em 450 a. C. e reconstruído em 100 AC. Queda em 45 DC."
    ),
    "Construído em quatrocentos e cinquenta antes de Cristo e reconstruído em cem antes de Cristo. Queda em quarenta e cinco depois de Cristo."
  );

  // Regressão: verificar se "a câmara" não vira "antes de Cristoâmara"
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "Esta é a câmara anecoica da Microsoft, projetada em Redmond."
    ),
    "Esta é a câmara anecoica da Microsoft, projetada em Redmond."
  );

  // Teste com km, m, kg e %
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "Uma bacia de 800 m abriga 4.450 painéis a 12 km de distância com 85% de eficiência."
    ),
    "Uma bacia de oitocentos metros abriga quatro mil quatrocentos e cinquenta painéis a doze quilômetros de distância com oitenta e cinco por cento de eficiência."
  );

  // Teste com decimais
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr("A temperatura aumentou 3,5 graus."),
    "A temperatura aumentou três vírgula cinco graus."
  );

  // Teste de preservação de tags [ênfase], [pausa], (pause 600ms)
  assert.strictEqual(
    replaceNumbersAndAbbreviationsPtBr(
      "O imperador [ênfase] governou por 12 anos. (pause 600ms) Ele tinha 80% do exército."
    ),
    "O imperador [ênfase] governou por doze anos. (pause 600ms) Ele tinha oitenta por cento do exército."
  );
});

test("convertCinematicMarkersForTts - integra conversão de números e formatação", () => {
  const result = convertCinematicMarkersForTts(
    "Uma bacia natural de 800 metros abriga 4.450 painéis triangulares. [pausa] Ele governou em 14 d.C.",
    "fish"
  );
  assert.ok(result.includes("oitocentos"));
  assert.ok(result.includes("quatro mil quatrocentos e cinquenta"));
  assert.ok(result.includes("catorze") || result.includes("quatorze"));
  assert.ok(result.includes("depois de Cristo"));
  assert.ok(result.includes("[pausa]"));
});
