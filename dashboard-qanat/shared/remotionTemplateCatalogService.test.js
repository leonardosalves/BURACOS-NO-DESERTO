import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachStudioTemplateToScene,
  mapStudioTemplateToMotionId,
  pickStudioTemplateForTrigger,
  resolveStudioSourceCode,
  syncCatalogForNiche,
} from "../backend/remotionTemplateCatalogService.js";

const SAMPLE_TSX = `"use client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const exampleProps = { title: "TESTE", value: 42 };
export default function BridgeSample() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundColor: frame > 0 ? "#111" : "#000" }} />;
}`;

const TEST_NICHE = "__test_studio_bridge__";

describe("remotionTemplateCatalogService bridge", () => {
  it("mapStudioTemplateToMotionId mapeia bar chart corretamente", () => {
    const id = mapStudioTemplateToMotionId({
      name: "Engenharia Bar chart Draft",
      category: "chart-data",
      subcategory: "Bar chart",
      shortPreview: "bars",
    });
    assert.equal(id, "bar-chart");
  });

  it("sync persiste sourceCode e pick escolhe template do nicho", () => {
    syncCatalogForNiche(TEST_NICHE, [
      {
        id: "studio-bar-1",
        name: "Test Bar chart",
        category: "chart-data",
        subcategory: "Bar chart",
        niche: TEST_NICHE,
        status: "approved",
        description: "Barras de teste",
        dataSlots: ["title", "items"],
        shortPreview: "bars",
        longPreview: "bars",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
      {
        id: "studio-counter-1",
        name: "Test Counter",
        category: "chart-data",
        subcategory: "Counter",
        niche: TEST_NICHE,
        status: "approved",
        description: "Contador",
        dataSlots: ["value", "label"],
        shortPreview: "counter",
        longPreview: "counter",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);

    const pick = pickStudioTemplateForTrigger({
      trigger: "comparison",
      motionTemplateId: "bar-chart",
      niche: TEST_NICHE,
      aspectRatio: "9:16",
    });

    assert.ok(pick);
    assert.equal(pick.id, "studio-bar-1");
    assert.ok(pick.studio_source_code.includes("useCurrentFrame"));

    const scene = attachStudioTemplateToScene(
      {
        template_id: "bar-chart",
        props: { title: "COMPARACAO", aspect_ratio: "9:16" },
      },
      pick
    );

    assert.equal(scene.props.template_studio_id, "studio-bar-1");
    assert.ok(scene.props.studio_source_code);
    assert.equal(
      resolveStudioSourceCode(pick, "16:9"),
      resolveStudioSourceCode(pick, "9:16")
    );
  });
});
