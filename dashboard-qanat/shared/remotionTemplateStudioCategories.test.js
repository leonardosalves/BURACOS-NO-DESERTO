import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countTemplatesInCategory,
  filterTemplatesByCategorySubcategory,
  templateMatchesPaletteCategory,
  templateMatchesPaletteSubcategory,
} from "./remotionTemplateStudioCategories.js";

const pipTpl = {
  id: "eng-pip",
  name: "Engenharia Picture in Picture Draft",
  category: "image-media",
  subcategory: "Picture in Picture",
  motion_template_id: "location-intro",
};

const barTpl = {
  id: "eng-bar",
  name: "Engenharia Bar chart Draft",
  category: "chart-data",
  subcategory: "Bar chart",
  motion_template_id: "bar-chart",
};

describe("remotionTemplateStudioCategories palette aliases", () => {
  it("image-media PIP aparece na categoria Mapas", () => {
    assert.equal(templateMatchesPaletteCategory(pipTpl, "maps"), true);
    assert.equal(templateMatchesPaletteCategory(barTpl, "maps"), false);
    assert.equal(countTemplatesInCategory([pipTpl, barTpl], "maps"), 1);
  });

  it("subcategoria PIP mapa casa com Picture in Picture", () => {
    assert.equal(
      templateMatchesPaletteSubcategory(pipTpl, "maps", "PIP mapa"),
      true
    );
    const visible = filterTemplatesByCategorySubcategory(
      [pipTpl, barTpl],
      "maps",
      "PIP mapa"
    );
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, "eng-pip");
  });

  it("location-intro sem categoria maps ainda entra em Mapas", () => {
    const geo = {
      id: "geo-1",
      category: "chart-data",
      subcategory: "Counter",
      motion_template_id: "location-intro",
    };
    assert.equal(templateMatchesPaletteCategory(geo, "maps"), true);
  });
});
