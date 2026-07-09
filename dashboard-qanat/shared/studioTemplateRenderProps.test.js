import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeStudioRenderProps,
  isGeoPipCompositeProps,
  isGeoPipShortMode,
  stripGeoPipMapMediaForTemplateProps,
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

  it("isGeoPipShortMode ativa PIP global em 9:16 com geo_pip_composite", () => {
    assert.equal(
      isGeoPipShortMode({
        aspect_ratio: "9:16",
        geo_pip_composite: true,
        flyover_video: "ASSETS/satellite/x.mp4",
      }),
      true
    );
    assert.equal(
      isGeoPipShortMode({
        aspect_ratio: "16:9",
        geo_pip_composite: true,
      }),
      false
    );
  });

  it("mergeStudioRenderProps remove flyover do template em modo PIP short", () => {
    const merged = mergeStudioRenderProps({
      inputProps: {
        geo_pip_composite: true,
        aspect_ratio: "9:16",
        flyover_video: "ASSETS/satellite/map.mp4",
        referencePoint: "Palmanova",
        sectorLabel: "Fortaleza estelar",
      },
      exampleProps: { durationInFrames: 90 },
      durationInFrames: 240,
      fps: 30,
    });
    assert.equal(merged.flyover_video, undefined);
    assert.equal(merged.referencePoint, "Palmanova");
    assert.equal(merged.sectorLabel, "Fortaleza estelar");
  });

  it("stripGeoPipMapMediaForTemplateProps remove midia de mapa", () => {
    const stripped = stripGeoPipMapMediaForTemplateProps({
      flyover_video: "x.mp4",
      backgroundImage: "a.jpg",
      referencePoint: "Roma",
    });
    assert.equal(stripped.flyover_video, undefined);
    assert.equal(stripped.referencePoint, "Roma");
  });
});
