import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENGENHARIA_SEED_CATEGORIES,
  buildEngenhariaSeedTemplates,
} from "./remotionTemplateEngenhariaSeed.js";
import { hasRunnableStudioSource } from "./remotionTemplateStudioCatalog.js";

describe("remotionTemplateEngenhariaSeed", () => {
  it("gera 85 templates Engenharia com contagens do catalogo original", () => {
    const { templates } = buildEngenhariaSeedTemplates("Engenharia");
    assert.equal(templates.length, 85);

    const byCategory = new Map();
    for (const tpl of templates) {
      byCategory.set(tpl.category, (byCategory.get(tpl.category) || 0) + 1);
    }
    assert.equal(byCategory.get("chart-data"), 12);
    assert.equal(byCategory.get("text"), 9);
    assert.equal(byCategory.get("content-animation"), 9);
    assert.equal(byCategory.get("background"), 9);
    assert.equal(byCategory.get("cinematic"), 9);
    assert.equal(byCategory.get("transition"), 9);
    assert.equal(byCategory.get("logo-branding"), 9);
    assert.equal(byCategory.get("intro-outro"), 9);
    assert.equal(byCategory.get("image-media"), 9);
    assert.equal(byCategory.get("frame"), 1);
  });

  it("cada template tem TSX executavel e nome Draft", () => {
    const { templates } = buildEngenhariaSeedTemplates("Engenharia");
    for (const tpl of templates) {
      assert.match(tpl.name, /Engenharia .+ Draft/);
      assert.equal(tpl.status, "approved");
      assert.ok(hasRunnableStudioSource(tpl.sourceCode), tpl.id);
    }
  });

  it("categorias seed batem com subcategorias esperadas", () => {
    const totalSubs = ENGENHARIA_SEED_CATEGORIES.reduce(
      (sum, cat) => sum + cat.subcategories.length,
      0
    );
    assert.equal(totalSubs, 85);
  });
});
