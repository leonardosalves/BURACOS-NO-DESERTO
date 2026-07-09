import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyGeoPipChromeProps,
  bindGeoPipTemplateStudioProps,
  isPictureInPictureStudioTemplate,
  mapGeoPipFlyoverToTemplateRenderProps,
  resolveGeoPipClipDurationSec,
  resolvePipMediaUrl,
} from "./geoPipTemplateProps.js";
import { summarizeGeoPipFooterSubject } from "./geoPipSceneText.js";

describe("geoPipTemplateProps", () => {
  it("isPictureInPictureStudioTemplate reconhece subcategoria", () => {
    assert.equal(
      isPictureInPictureStudioTemplate({
        template_studio_subcategory: "Picture in Picture",
      }),
      true
    );
  });

  it("bindGeoPipTemplateStudioProps usa slots do template", () => {
    const { studio_props, pipTitle, location, pipMediaUrl } =
      bindGeoPipTemplateStudioProps(
        {
          location: "Palmanova",
          country: "Itália",
          flyover_video: "ASSETS/satellite/voo.mp4",
          template_studio_subcategory: "Picture in Picture",
        },
        {
          narration: "A fortaleza estelar de Palmanova impressiona.",
          dataSlots: ["pipMediaUrl", "pipTitle", "location"],
          flyoverDurationSec: 6.2,
        }
      );
    assert.equal(pipMediaUrl, "ASSETS/satellite/voo.mp4");
    assert.equal(studio_props.pipMediaUrl, "ASSETS/satellite/voo.mp4");
    assert.equal(pipTitle, "Palmanova");
    assert.equal(studio_props.pipTitle, "");
    assert.match(location, /Palmanova|fortaleza/i);
    assert.equal(studio_props.location, location);
    assert.equal(studio_props.durationSeconds, 6.2);
  });

  it("mapGeoPipFlyoverToTemplateRenderProps expõe pipMediaUrl no render", () => {
    const mapped = mapGeoPipFlyoverToTemplateRenderProps({
      geo_pip_composite: true,
      template_studio_subcategory: "Picture in Picture",
      flyover_video: "ASSETS/satellite/map.mp4",
      location: "Roma",
      narration_text: "Em Roma, a engenharia romana ainda impressiona.",
    });
    assert.equal(mapped.pipMediaUrl, "ASSETS/satellite/map.mp4");
    assert.equal(mapped.pipTitle, "");
    assert.match(String(mapped.location), /Roma|engenharia/i);
    assert.equal(mapped.flyover_video, "ASSETS/satellite/map.mp4");
  });

  it("resolveGeoPipClipDurationSec prioriza durationSeconds do upload", () => {
    assert.equal(
      resolveGeoPipClipDurationSec({
        duration: 4,
        props: {
          studio_props: { durationSeconds: 12.8 },
        },
      }),
      12.8
    );
  });

  it("resolvePipMediaUrl prioriza pipMediaUrl salvo", () => {
    assert.equal(
      resolvePipMediaUrl({
        studio_props: { pipMediaUrl: "ASSETS/a.mp4" },
        flyover_video: "ASSETS/b.mp4",
      }),
      "ASSETS/a.mp4"
    );
  });

  it("bindGeoPipTemplateStudioProps limpa chrome e mantém location narrada", () => {
    const { studio_props, location } = bindGeoPipTemplateStudioProps(
      {
        template_studio_subcategory: "Picture in Picture",
        flyover_video: "ASSETS/satellite/voo.mp4",
      },
      {
        narration: "Debaixo dos seus pés, a fundação NBR 6118 exige rigor.",
        flyoverDurationSec: 10,
      }
    );
    assert.equal(studio_props.descriptorText, "");
    assert.equal(studio_props.statusText, "");
    assert.equal(studio_props.pipTag, "");
    assert.equal(studio_props.pipTitle, "");
    assert.equal(studio_props.mainMediaUrl, "");
    assert.equal(studio_props.showPointerLines, false);
    assert.equal(studio_props.showMainContentLabel, false);
    assert.equal(studio_props.mainTitle, "");
    assert.equal(studio_props.geoPipOverlayChrome, true);
    assert.equal(studio_props.durationSeconds, 10);
    assert.match(location, /Debaixo dos seus pés|fundação|NBR/i);
  });

  it("applyGeoPipChromeProps oculta centro e usa resumo no rodape", () => {
    const chrome = applyGeoPipChromeProps(
      {},
      {
        narration:
          "Muitos acham que o Brasil está livre de tremores, mas a engenharia civil criou um escudo silencioso.",
        sector: "Setor A",
      }
    );
    assert.equal(chrome.showMainContentLabel, false);
    assert.equal(chrome.mainTitle, "");
    assert.equal(chrome.geoPipOverlayChrome, true);
    assert.equal(chrome.backgroundColor, "transparent");
    assert.equal(
      chrome.location,
      summarizeGeoPipFooterSubject(
        "Muitos acham que o Brasil está livre de tremores, mas a engenharia civil criou um escudo silencioso."
      )
    );
  });
});
