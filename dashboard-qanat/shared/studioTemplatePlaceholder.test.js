import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTemplatePlaceholderValue } from "./studioTemplatePlaceholder.js";

describe("studioTemplatePlaceholder", () => {
  it("detecta placeholders e preserva dados reais", () => {
    assert.equal(isTemplatePlaceholderValue("TESTE"), true);
    assert.equal(isTemplatePlaceholderValue("CONTEÚDO PRINCIPAL"), true);
    assert.equal(isTemplatePlaceholderValue("2017"), false);
    assert.equal(isTemplatePlaceholderValue("Norma NBR 6118"), false);
  });
});
