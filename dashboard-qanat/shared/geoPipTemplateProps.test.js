import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bindGeoPipTemplateStudioProps,
  isPictureInPictureStudioTemplate,
  mapGeoPipFlyoverToTemplateRenderProps,
  resolveGeoPipClipDurationSec,
  resolvePipMediaUrl,
} from "./geoPipTemplateProps.js";

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
    assert.equal(studio_props.pipTitle, "Palmanova");
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
    assert.equal(mapped.pipTitle, "Roma");
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
});
