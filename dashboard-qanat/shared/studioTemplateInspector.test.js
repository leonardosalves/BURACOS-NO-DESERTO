import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractExamplePropsFromSource,
  extractDesignPropKeys,
  resolveEffectiveSlotValue,
  slotLabel,
} from "./studioTemplateInspector.js";

const SAMPLE_SRC = `
export default function EngineeringCinematicTitleIntro(props = {}) {
  const { title = "MEGAESTRUTURA", eyebrow = "ANÁLISE TÉCNICA" } = props;
  return null;
}
export const exampleProps = {
  title: "MEGAESTRUTURA",
  subtitle: "A engenharia por trás do impossível",
  eyebrow: "ANÁLISE TÉCNICA",
  projectCode: "ENG-3107",
  statusText: "SISTEMA ATIVO",
  location: "SETOR ESTRUTURAL",
  panelLabel: "BLUEPRINT INTRO",
  primaryColor: "#22d3ee",
  secondaryColor: "#0ea5e9",
  accentColor: "#facc15",
  backgroundColor: "#030712",
};
`;

describe("studioTemplateInspector", () => {
  it("extrai exampleProps do source (ENG-3107, MEGAESTRUTURA)", () => {
    const ex = extractExamplePropsFromSource(SAMPLE_SRC);
    assert.equal(ex.title, "MEGAESTRUTURA");
    assert.equal(ex.eyebrow, "ANÁLISE TÉCNICA");
    assert.equal(ex.projectCode, "ENG-3107");
    assert.equal(ex.statusText, "SISTEMA ATIVO");
  });

  it("resolveEffectiveSlotValue usa default do template quando clip vazio", () => {
    const clip = {
      props: {
        studio_source_code: SAMPLE_SRC,
        title: "Narração longa sobre elefante de guerra de seis toneladas?",
        studio_props: {
          title: "Narração longa sobre elefante de guerra de seis toneladas?",
        },
      },
    };
    // title do clip existe → usa o do clip
    assert.match(String(resolveEffectiveSlotValue(clip, "title")), /elefante/i);
    // eyebrow vazio no clip → default do template
    assert.equal(resolveEffectiveSlotValue(clip, "eyebrow"), "ANÁLISE TÉCNICA");
    assert.equal(resolveEffectiveSlotValue(clip, "projectCode"), "ENG-3107");
  });

  it("extractDesignPropKeys prioriza campos de design", () => {
    const keys = extractDesignPropKeys({
      props: {
        studio_source_code: SAMPLE_SRC,
        template_studio_data_slots: ["title", "projectCode"],
      },
    });
    assert.ok(keys.includes("title"));
    assert.ok(keys.includes("eyebrow"));
    assert.ok(keys.includes("projectCode"));
    assert.ok(keys.indexOf("title") < keys.indexOf("primaryColor"));
  });

  it("slotLabel amigável", () => {
    assert.match(slotLabel("projectCode"), /ENG-3107|Código/i);
    assert.match(slotLabel("eyebrow"), /ANÁLISE|Faixa/i);
  });
});
