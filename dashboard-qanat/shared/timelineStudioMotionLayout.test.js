import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FULLSCREEN_TEMPLATES } from "./motionSceneCatalog.js";

/** Espelha dashboard-qanat/frontend/src/timelineStudioMotionLayout.ts */
function isFullscreenMotionClip(clip = {}) {
  const templateId = String(clip.templateId || "");
  const props = clip.props || {};
  const layout = String(props.layout || "").trim();

  if (templateId === "location-intro") {
    const aspectRatio = String(props.aspect_ratio || "").trim();
    const niche = String(props.niche || "").trim();
    if (
      aspectRatio === "9:16" &&
      /engenharia|engineering|industrial/i.test(niche)
    ) {
      return false;
    }
    return true;
  }
  if (templateId === "geo-map") return true;
  if (layout === "fullscreen") return true;
  if (FULLSCREEN_TEMPLATES.has(templateId)) return true;
  return false;
}

describe("isFullscreenMotionClip", () => {
  it("kinetic-text é fullscreen (não PIP sobre legendas)", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "kinetic-text",
        props: { layout: "full", presentation: "pip", text: "SOLO" },
      }),
      true
    );
  });

  it("location-intro legado pip → fullscreen (geo proibido em PIP)", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "location-intro",
        props: { presentation: "pip", layout: "pip" },
      }),
      true
    );
  });

  it("location-intro fullscreen cobre o frame", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "location-intro",
        props: { presentation: "fullscreen" },
      }),
      true
    );
  });

  it("location-intro engenharia 9:16 fica PIP fora da legenda", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "location-intro",
        props: {
          presentation: "pip",
          layout: "pip",
          aspect_ratio: "9:16",
          niche: "Engenharia",
        },
      }),
      false
    );
  });
});
