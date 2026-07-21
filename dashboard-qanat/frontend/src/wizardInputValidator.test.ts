/**
 * Run with: npx tsx --test src/wizardInputValidator.test.ts
 * (or via node after build). Pure unit — no DOM.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateWizardInputForVisualPro } from "./wizardInputValidator";

describe("validateWizardInputForVisualPro", () => {
  it("bloqueia sem projeto ou cenas", () => {
    const r = validateWizardInputForVisualPro({
      projectName: "",
      visualPrompts: [],
      narrativeScript: "x".repeat(100),
    });
    assert.equal(r.podeProsseguir, false);
    assert.ok(r.problemas.length >= 1);
  });

  it("permite com projeto + narração + cenas", () => {
    const r = validateWizardInputForVisualPro({
      projectName: "meu_projeto",
      nicheInput: "engenharia",
      formatSelector: "LONGO",
      narrativeScript: "A".repeat(100),
      visualPrompts: [{ scene: "1.1", prompt: "steel beam" }],
    });
    assert.equal(r.podeProsseguir, true);
    assert.equal(r.problemas.length, 0);
  });

  it("avisa SHORTS com narração longa", () => {
    const words = Array.from({ length: 180 }, (_, i) => `w${i}`).join(" ");
    const r = validateWizardInputForVisualPro({
      projectName: "p",
      formatSelector: "SHORTS",
      narrativeScript: words,
      visualPrompts: [{ prompt: "x" }],
    });
    assert.equal(r.podeProsseguir, true);
    assert.ok(r.avisos.some((a) => /SHORTS/i.test(a)));
  });
});
