import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isStudioTemplateOrchestrationReady,
  mapStudioTemplateToMotionId,
  STUDIO_RUNTIME_MOTION_ID,
} from "./remotionTemplateStudioCatalog.js";

const runnable = {
  short: `export default function T() { const f = useCurrentFrame(); return null; }`,
  long: `export default function T() { const f = useCurrentFrame(); return null; }`,
};

describe("remotionTemplateStudioCatalog map", () => {
  it("cinematic/transition/intro não viram counter", () => {
    assert.equal(
      mapStudioTemplateToMotionId({
        category: "cinematic",
        subcategory: "Film Burn",
        sourceCode: runnable,
      }),
      STUDIO_RUNTIME_MOTION_ID
    );
    assert.equal(
      mapStudioTemplateToMotionId({
        category: "transition",
        subcategory: "Cross Dissolve",
        sourceCode: runnable,
      }),
      STUDIO_RUNTIME_MOTION_ID
    );
    assert.equal(
      mapStudioTemplateToMotionId({
        category: "intro-outro",
        subcategory: "End Card",
        sourceCode: runnable,
      }),
      STUDIO_RUNTIME_MOTION_ID
    );
  });

  it("chart data mapeia para shotcraft (odometer-digit-roll)", () => {
    assert.equal(
      mapStudioTemplateToMotionId({
        category: "chart-data",
        subcategory: "Stat Counter",
        name: "Stat Counter",
        sourceCode: runnable,
      }),
      "odometer-digit-roll"
    );
  });

  it("orchestration ready para studio-runtime", () => {
    assert.equal(
      isStudioTemplateOrchestrationReady({
        category: "cinematic",
        subcategory: "Vignette Pulse",
        sourceCode: runnable,
      }),
      true
    );
  });
});
