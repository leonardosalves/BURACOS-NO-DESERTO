import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FULLSCREEN_TEMPLATES } from "./motionSceneCatalog.js";

/** Espelha dashboard-qanat/frontend/src/timelineStudioMotionLayout.ts */
function isFullscreenMotionClip(clip = {}) {
  const templateId = String(clip.templateId || "");
  const props = clip.props || {};
  const layout = String(props.layout || "").trim();

  if (layout === "fullscreen") return true;
  if (FULLSCREEN_TEMPLATES.has(templateId)) return true;
  if (templateId === "location-intro") {
    return props.presentation === "fullscreen";
  }
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

  it("location-intro pip permanece cartão", () => {
    assert.equal(
      isFullscreenMotionClip({
        templateId: "location-intro",
        props: { presentation: "pip", layout: "pip" },
      }),
      false
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
});
