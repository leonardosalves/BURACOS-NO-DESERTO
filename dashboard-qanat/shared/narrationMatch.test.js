import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findNarrationMatch,
  findBoundedNarrationMatch,
  cleanText,
  matchWords,
} from "./narrationMatch.js";

function wordsFromText(text, startAt = 0, step = 0.3) {
  const tokens = cleanText(text);
  return tokens.map((clean, i) => ({
    word: ` ${clean}`,
    clean,
    start: startAt + i * step,
    end: startAt + (i + 1) * step,
  }));
}

describe("narrationMatch", () => {
  it("findBoundedNarrationMatch é alias de findNarrationMatch", () => {
    assert.equal(findBoundedNarrationMatch, findNarrationMatch);
  });

  it("matchWords tolera plural curto", () => {
    assert.equal(matchWords("templos", "templo"), true);
    assert.equal(matchWords("sol", "lua"), false);
  });

  it("encontra trecho dentro dos bounds", () => {
    const flat = [
      ...wordsFromText("introducao geral do documentario", 0),
      ...wordsFromText("segunda parte sobre engenharia medieval", 5),
    ];
    const hit = findNarrationMatch(
      "segunda parte sobre engenharia",
      flat,
      { searchAfter: 4.5, searchBefore: 12 },
    );
    assert.ok(hit);
    assert.ok(hit.start >= 4.5);
    assert.ok(hit.end <= 12);
    assert.ok(hit.duration >= 0.5);
    assert.equal(typeof hit.bestFirstMatchIdx, "number");
  });

  it("respeita searchAfter e ignora trecho anterior", () => {
    const flat = wordsFromText("bloco um texto longo aqui bloco dois inicio", 0);
    const early = findNarrationMatch("bloco um texto", flat, { searchAfter: 0, searchBefore: 20 });
    const late = findNarrationMatch(
      "bloco dois inicio",
      flat,
      { searchAfter: early.end, searchBefore: 20 },
    );
    assert.ok(early);
    assert.ok(late);
    assert.ok(late.start >= early.end - 0.05);
  });

  it("estende início quando palavras iniciais não casam no transcript", () => {
    const flat = wordsFromText("mundo antigo de pedra", 2.0, 0.25);
    const hit = findNarrationMatch(
      "o grande mundo antigo de pedra",
      flat,
      { searchAfter: 0, searchBefore: 10 },
    );
    assert.ok(hit);
    assert.ok(hit.start < flat[0].start, "deve antecipar start para cobrir palavras não casadas");
  });

  it("retorna null para texto vazio", () => {
    assert.equal(findNarrationMatch("", [{ word: "a", clean: "a", start: 0, end: 1 }]), null);
  });
});