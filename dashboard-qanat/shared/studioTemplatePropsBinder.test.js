import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bindStudioTemplateProps,
  computeStudioContractCoverage,
  enrichStudioTemplateScene,
  mergeStudioPropsFromLlm,
  validateStudioContractCoverage,
} from "./studioTemplatePropsBinder.js";

describe("studioTemplatePropsBinder", () => {
  it("preenche text/subtitle/projectCode para template text animado", () => {
    const { studio_props, studio_props_meta } = bindStudioTemplateProps({
      template: {
        id: "popping-1",
        name: "Popping Scale",
        category: "text",
        subcategory: "Popping Scale",
        dataSlots: [
          "text",
          "subtitle",
          "projectCode",
          "statusText",
          "location",
          "primaryColor",
          "delayPerChar",
        ],
      },
      scene: {
        narration_text:
          "A ponte Golden Gate suporta 40 mil veículos por dia desde 1937.",
        trigger: "stat_number",
        block: 2,
        scene_ref: "2.1",
      },
      researchContext: {
        globalFacts: [
          "A ponte Golden Gate suporta 40 mil veículos por dia desde 1937.",
        ],
        globalSources: [{ title: "Caltrans", url: "https://example.com" }],
        bySceneRef: new Map([
          [
            "2.1",
            {
              facts: [
                "A ponte Golden Gate suporta 40 mil veículos por dia desde 1937.",
              ],
              sources: [{ title: "Caltrans" }],
            },
          ],
        ]),
      },
      config: {
        accent_color: "#D4AF37",
        project_name: "Golden Gate Engenharia",
        niche: "Engenharia",
      },
    });

    assert.ok(studio_props.text);
    assert.ok(studio_props.subtitle);
    assert.equal(studio_props.projectCode, "GOLDEN-GATE-ENGENHARIA");
    assert.equal(studio_props.statusText, "DADO VERIFICADO");
    assert.equal(studio_props.primaryColor, "#D4AF37");
    assert.equal(studio_props.delayPerChar, 3);
    assert.ok(studio_props_meta.confidence > 0.4);
    assert.ok(studio_props_meta.filled_slots.includes("text"));
  });

  it("preenche items para bar chart com comparação numérica", () => {
    const { studio_props } = bindStudioTemplateProps({
      template: {
        id: "bar-1",
        category: "chart-data",
        subcategory: "Bar chart",
        dataSlots: ["title", "items", "accentColor"],
      },
      scene: {
        narration_text:
          "O concreto resiste a 40 MPa, o aço a 250 MPa e a madeira apenas 12 MPa.",
        trigger: "comparison",
      },
      config: { accent_color: "#22d3ee" },
    });

    assert.ok(Array.isArray(studio_props.items));
    assert.ok(studio_props.items.length >= 2);
    assert.equal(studio_props.accentColor, "#22d3ee");
  });

  it("enrichStudioTemplateScene mescla props no clip", () => {
    const scene = enrichStudioTemplateScene(
      {
        narration_text: "Em 1937 a estrutura foi inaugurada.",
        props: {
          template_studio_id: "tl-1",
          template_studio_name: "Timeline Draft",
          template_studio_category: "content-animation",
          template_studio_subcategory: "Timeline",
          template_studio_data_slots: ["events", "title"],
        },
      },
      {
        config: { accent_color: "#fff" },
        researchContext: {
          globalFacts: ["Em 1937 a estrutura foi inaugurada."],
        },
      }
    );

    assert.ok(Array.isArray(scene.props.events));
    assert.ok(scene.props.studio_props);
    assert.equal(scene.props.events, scene.props.studio_props.events);
  });

  it("validateStudioContractCoverage rejeita cena com poucos slots", () => {
    const scene = {
      props: {
        template_studio_data_slots: ["text", "subtitle", "value", "label"],
        text: "IMPACTO REAL",
      },
    };
    const result = validateStudioContractCoverage(scene, 0.5);
    assert.equal(result.valid, false);
    assert.equal(result.coverage, 0.25);
    assert.ok(result.missing_slots.includes("value"));
  });

  it("mergeStudioPropsFromLlm preserva heurístico e preenche faltantes", () => {
    const merged = mergeStudioPropsFromLlm(
      { text: "62%", label: "BRASIL" },
      { text: "IGNORAR", subtitle: "Dado verificado", value: 62 },
      ["text", "subtitle", "value", "label"]
    );
    assert.equal(merged.text, "62%");
    assert.equal(merged.subtitle, "Dado verificado");
    assert.equal(merged.value, 62);
    assert.equal(merged.label, "BRASIL");
  });

  it("computeStudioContractCoverage conta slots preenchidos", () => {
    const scene = {
      props: {
        template_studio_data_slots: ["value", "label"],
        value: 42,
        label: "BRASIL 42",
      },
    };
    const cov = computeStudioContractCoverage(scene);
    assert.equal(cov.coverage, 1);
    assert.deepEqual(cov.missing_slots, []);
  });
});
