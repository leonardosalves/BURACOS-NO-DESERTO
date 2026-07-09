import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeStudioRenderProps,
  isGeoPipCompositeProps,
} from "./studioTemplateRenderProps.js";

describe("studioTemplateRenderProps", () => {
  it("mergeStudioRenderProps ignora exampleProps e usa duracao da cena", () => {
    const merged = mergeStudioRenderProps({
      inputProps: {
        studio_props: { headline: "Norma NBR 6118", value: 2017 },
        template_studio_subcategory: "Bar chart",
      },
      exampleProps: {
        headline: "CONTEÚDO PRINCIPAL",
        subtitle: "VISÃO GERAL",
        value: 1200,
        primaryColor: "#D4AF37",
        durationInFrames: 90,
      },
      durationInFrames: 450,
      fps: 30,
    });

    assert.equal(merged.headline, "Norma NBR 6118");
    assert.equal(merged.value, 2017);
    assert.equal(merged.subtitle, undefined);
    assert.equal(merged.primaryColor, "#D4AF37");
    assert.equal(merged.durationInFrames, 450);
    assert.equal(merged.fps, 30);
  });

  it("isGeoPipCompositeProps reconhece PIP geo", () => {
    assert.equal(
      isGeoPipCompositeProps({
        geo_pip_composite: true,
        flyover_video: "ASSETS/satellite/x.mp4",
      }),
      true
    );
    assert.equal(
      isGeoPipCompositeProps({
        template_studio_subcategory: "Picture in Picture",
        location: "Brasil",
      }),
      true
    );
    assert.equal(isGeoPipCompositeProps({ location: "Brasil" }), false);
  });
});
