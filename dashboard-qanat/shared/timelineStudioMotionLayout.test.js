import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FULLSCREEN_TEMPLATES } from "./motionSceneCatalog.js";

/** Espelha dashboard-qanat/frontend/src/timelineStudioMotionLayout.ts */
function isFullscreenMotionClip(clip = {}) {
  const templateId = String(clip.templateId || "");
  const props = clip.props || {};
  const layout = String(props.layout || "").trim();

  if (templateId === "location-intro" || templateId === "geo-map") {
    const aspectRatio = String(props.aspect_ratio || "").trim();
    const presentation = String(
      props.presentation || props.layout || ""
    ).trim();
    if (aspectRatio === "9:16" && presentation === "pip") {
      return false;
    }
    return true;
  }
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

  it("location-intro 16:9 pip ainda é tratado como fullscreen no layout", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "location-intro",
        props: { presentation: "pip", layout: "pip", aspect_ratio: "16:9" },
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

  it("location-intro 9:16 PIP fica fora da legenda", () => {
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
