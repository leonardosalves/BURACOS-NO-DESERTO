import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyNicheDesignPack,
  applyNicheDesignToMotionScenes,
  resolveNicheDesignPack,
} from "./nicheDesignPack.js";

describe("nicheDesignPack", () => {
  it("resolve pack industrial-impact", () => {
    const pack = resolveNicheDesignPack("industrial-impact");
    assert.equal(pack.theme, "technical");
    assert.match(pack.accentColor, /^#/);
  });

  it("aplica design tokens em counter", () => {
    const scene = applyNicheDesignPack(
      {
        id: "ms-1",
        template_id: "counter",
        props: { value: 42, label: "KM" },
      },
      "industrial-impact"
    );
    assert.equal(scene.niche_pack, "industrial-impact");
    assert.equal(scene.props.accentColor, "#FF6B35");
    assert.equal(scene.props.design_tokens.pack_id, "industrial-impact");
    assert.equal(scene.props.customStyle.blueprint, true);
  });

  it("aplica em lote de motion scenes", () => {
    const out = applyNicheDesignToMotionScenes(
      [
        { id: "a", template_id: "bar-chart", props: {} },
        { id: "b", template_id: "location-intro", props: {} },
      ],
      "geography-explorer"
    );
    assert.equal(out.length, 2);
    assert.equal(out[0].props.design_tokens.pack_id, "geography-explorer");
    assert.equal(out[1].props.accentColor, "#4CAF50");
  });
});
