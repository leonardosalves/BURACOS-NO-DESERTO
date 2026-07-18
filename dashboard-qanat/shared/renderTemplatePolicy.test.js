import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyRenderTemplatePreset,
  enforceOverlayBudget,
  isBrandOutroAsset,
  listRenderTemplatePresets,
  normalizeRenderTemplatePolicy,
  resolveRenderTemplatePolicy,
  validateRenderTemplateComposition,
} from "./renderTemplatePolicy.js";

describe("renderTemplatePolicy", () => {
  it("normaliza defaults smart para longos", () => {
    const p = normalizeRenderTemplatePolicy({}, "16:9");
    assert.equal(p.mode, "smart");
    assert.equal(p.chapter_title.enabled, true);
    assert.equal(p.effects.enabled, true);
    assert.equal(p.subscribe_mid.enabled, false);
  });

  it("shorts ativa subscribe_mid por padrão smart", () => {
    const p = normalizeRenderTemplatePolicy({}, "9:16");
    assert.equal(p.subscribe_mid.enabled, true);
    assert.equal(p.chapter_title.enabled, false);
  });

  it("preset legado desliga camadas", () => {
    const p = applyRenderTemplatePreset("legacy", "16:9");
    assert.equal(p.mode, "legacy");
    assert.equal(p.effects.enabled, false);
    assert.equal(p.end_card.enabled, false);
  });

  it("lista presets", () => {
    const list = listRenderTemplatePresets();
    assert.ok(list.some((x) => x.id === "doc-engenharia"));
    assert.ok(list.some((x) => x.id === "shorts-curiosidade"));
  });

  it("resolve a partir de config", () => {
    const p = resolveRenderTemplatePolicy({
      aspect_ratio: "9:16",
      render_template_policy: { mode: "smart", end_card: { enabled: true } },
    });
    assert.equal(p.end_card.enabled, true);
    assert.equal(p.subscribe_mid.enabled, true);
  });

  it("detecta brand outro", () => {
    assert.equal(isBrandOutroAsset("assets/logo_final_channel.mp4"), true);
    assert.equal(isBrandOutroAsset("broll/scene01.mp4"), false);
  });

  it("valida conflito end card + logo", () => {
    const result = validateRenderTemplateComposition({
      policy: normalizeRenderTemplatePolicy({
        mode: "smart",
        end_card: { enabled: true, replace_brand_outro: true },
      }),
      scenes: [{ asset: "OUTPUT/logo_final_x.mp4" }],
      motionScenes: [
        {
          props: {
            studio_role: "end_card",
            template_studio_subcategory: "End Card",
          },
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors[0].includes("End Card"));
  });

  it("enforceOverlayBudget reduz densos", () => {
    const scenes = Array.from({ length: 12 }, (_, i) => ({
      id: `ms-${i}`,
      start_hint: i * 5,
      duration_seconds: 4,
      confidence: i / 12,
      props: { studio_role: "chart" },
    }));
    const limited = enforceOverlayBudget(
      scenes,
      normalizeRenderTemplatePolicy({
        overlay_budget: { max_coverage: 0.1, max_dense_per_minute: 2 },
      }),
      60
    );
    assert.ok(limited.length < scenes.length);
    assert.ok(limited.length <= 2);
  });
});
