import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeIdentityFrameSeeds,
  seedIdentityFramesForNiche,
} from "./identityFrameTemplates.js";
import { resolveTemplateDataSlots } from "./studioTemplateDataSlots.js";

describe("identityFrameTemplates", () => {
  it("gera 4 frames quando nicho não tem frame", () => {
    const seeds = seedIdentityFramesForNiche("Engenharia", []);
    assert.equal(seeds.length, 4);
    assert.ok(seeds.every((s) => s.category === "frame"));
    assert.ok(seeds.every((s) => s.status === "approved"));
  });

  it("não duplica se já existe frame", () => {
    const seeds = seedIdentityFramesForNiche("Engenharia", [
      { category: "frame", id: "x" },
    ]);
    assert.equal(seeds.length, 0);
  });

  it("mergeIdentityFrameSeeds adiciona ao catálogo", () => {
    const cat = mergeIdentityFrameSeeds(
      { niches: { Engenharia: { templates: [] } } },
      "Engenharia"
    );
    assert.ok(cat.niches.Engenharia.templates.length >= 4);
  });
});

describe("studioTemplateDataSlots", () => {
  it("enriquece chart-data", () => {
    const slots = resolveTemplateDataSlots({
      category: "chart-data",
      subcategory: "Stat Counter",
      dataSlots: ["title"],
    });
    assert.ok(slots.includes("value"));
    assert.ok(slots.includes("title"));
  });

  it("enriquece cinematic", () => {
    const slots = resolveTemplateDataSlots({
      category: "cinematic",
      subcategory: "Film Burn",
      dataSlots: [],
    });
    assert.ok(slots.includes("sceneAsset") || slots.includes("intensity"));
  });
});
