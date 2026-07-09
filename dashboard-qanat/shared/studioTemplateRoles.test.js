import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyStudioRoleToScene,
  resolveStudioRole,
} from "./studioTemplateRoles.js";

describe("studioTemplateRoles", () => {
  it("resolveStudioRole mapeia categorias", () => {
    assert.equal(resolveStudioRole({ category: "transition" }), "transition");
    assert.equal(
      resolveStudioRole({ category: "background" }),
      "background_frame"
    );
    assert.equal(resolveStudioRole({ category: "logo-branding" }), "logo_bug");
    assert.equal(resolveStudioRole({ category: "chart-data" }), "overlay");
  });

  it("applyStudioRoleToScene ajusta transicao", () => {
    const scene = applyStudioRoleToScene(
      { duration_seconds: 8, layout: "pip", props: {} },
      { category: "transition" }
    );
    assert.equal(scene.props.studio_role, "transition");
    assert.equal(scene.layout, "fullscreen");
    assert.ok(scene.duration_seconds <= 4);
  });
});
