import test from "node:test";
import assert from "node:assert/strict";
import { buildProfessionalSfxMultimodalRequest } from "./professionalSfxMultimodal.js";

test("não declara cena verificada quando o asset não existe", () => {
  const result = buildProfessionalSfxMultimodalRequest({
    prompt: "planeje",
    scenes: [{ scene_ref: "1.1", asset: "missing.mp4" }],
    resolveAsset: () => null,
  });
  assert.equal(result.bodyOverride, null);
  assert.equal(result.verifiedSceneRefs.size, 0);
});
