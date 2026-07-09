import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachGeoPipStudioTemplate,
  buildGeoPipStudioProps,
  isGeoPipShortScene,
  pickGeoPipStudioTemplate,
  resolveGeoPipPresentation,
} from "./geoPipStudioTemplate.js";

describe("geoPipStudioTemplate", () => {
  it("9:16 location-intro usa PIP", () => {
    assert.equal(resolveGeoPipPresentation("9:16"), "pip");
    assert.equal(resolveGeoPipPresentation("16:9"), "fullscreen");
    assert.ok(
      isGeoPipShortScene({
        template_id: "location-intro",
        props: { aspect_ratio: "9:16" },
      })
    );
    assert.ok(
      !isGeoPipShortScene({
        template_id: "location-intro",
        props: { aspect_ratio: "16:9" },
      })
    );
  });

  it("buildGeoPipStudioProps limpa chrome e preenche location narrada", () => {
    const { studio_props } = buildGeoPipStudioProps(
      {
        props: {
          location: "Porto Alegre",
          region: "RS",
          country: "Brasil",
          lat: -29.99,
          lng: -51.3,
          narration_text: "A infraestrutura de Porto Alegre evolui.",
        },
      },
      {
        subcategory: "Picture in Picture",
        dataSlots: ["pipTitle", "location", "coordinateText"],
      }
    );
    assert.equal(studio_props.pipTitle, "");
    assert.equal(studio_props.descriptorText, "");
    assert.equal(studio_props.statusText, "");
    assert.equal(studio_props.coordinateText, "");
    assert.match(String(studio_props.location), /Porto Alegre|infraestrutura/i);
  });

  it("pickGeoPipStudioTemplate filtra image-media Picture in Picture", () => {
    const tpl = pickGeoPipStudioTemplate(
      {
        approved: [
          {
            id: "pip-1",
            name: "Eng PIP",
            category: "image-media",
            subcategory: "Picture in Picture",
            niche: "Engenharia",
            status: "approved",
            orchestration_ready: true,
            has_source_code: true,
            motion_template_id: "location-intro",
          },
          {
            id: "other",
            category: "chart-data",
            subcategory: "Bar chart",
            status: "approved",
            orchestration_ready: true,
            has_source_code: true,
          },
        ],
      },
      "Engenharia"
    );
    assert.equal(tpl?.id, "pip-1");
  });

  it("attachGeoPipStudioTemplate liga studio PIP limpo para novos projetos", () => {
    const scene = attachGeoPipStudioTemplate(
      {
        template_id: "location-intro",
        props: {
          aspect_ratio: "9:16",
          location: "Golden Gate",
          region: "CA",
          narration_text: "A ponte Golden Gate marca o horizonte.",
        },
      },
      {
        niche: "Engenharia",
        catalog: {
          approved: [
            {
              id: "pip-geo",
              name: "PIP Geo",
              category: "image-media",
              subcategory: "Picture in Picture",
              niche: "Engenharia",
              status: "approved",
              orchestration_ready: true,
              has_source_code: true,
              motion_template_id: "location-intro",
              dataSlots: ["referencePoint", "pipTitle"],
              sourceCode: {
                short: "export default function P(){return null;}",
                long: "export default function P(){return null;}",
              },
            },
          ],
        },
        resolveSourceCode: (tpl) => tpl.sourceCode.short,
      }
    );
    assert.equal(scene.layout, "pip");
    assert.equal(scene.props.geo_pip_composite, true);
    assert.equal(scene.props.template_studio_subcategory, "Picture in Picture");
    assert.equal(scene.props.referencePoint, "Golden Gate");
    assert.equal(scene.props.pipTitle, "");
    assert.equal(scene.props.studio_props.pipTitle, "");
    assert.equal(scene.props.studio_props.descriptorText, "");
    assert.ok(scene.props.studio_source_code);
  });
});