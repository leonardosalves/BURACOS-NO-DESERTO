import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateOriginalTemplateCode,
  validateFinalTemplateCode,
  extractTemplateTsxFromLlm,
} from "./remotionTemplateStudioValidate.js";
import { generateEngineeringCircularProgressTemplate } from "./remotionTemplateStudioGenerate.js";

const SAMPLE_ORIGINAL = `"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export default function CircularProgress() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, fps * 2], [0, 78], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div>{Math.round(p)}%</div>
    </AbsoluteFill>
  );
}`;

describe("remotionTemplateStudioValidate", () => {
  it("rejeita codigo original incompleto", () => {
    const result = validateOriginalTemplateCode(
      "// codigo original do template"
    );
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /incompleto/i);
  });

  it("aceita codigo original completo", () => {
    const result = validateOriginalTemplateCode(SAMPLE_ORIGINAL);
    assert.equal(result.ok, true);
  });

  it("rejeita codigo final com TODO", () => {
    const bad = `${SAMPLE_ORIGINAL}\n// TODO remover`;
    const result = validateFinalTemplateCode(bad);
    assert.equal(result.ok, false);
  });

  it("aceita gerador circular progress engenharia", () => {
    const code = generateEngineeringCircularProgressTemplate();
    const result = validateFinalTemplateCode(code);
    assert.equal(result.ok, true);
    assert.match(code, /\[0,\s*durationInFrames\],\s*\[0,\s*progress\]/);
    assert.doesNotMatch(code, /frame\s*%\s*90/);
  });

  it("extrai TSX de resposta markdown", () => {
    const extracted = extractTemplateTsxFromLlm(
      '```tsx\n"use client";\nexport default function X(){}\n```'
    );
    assert.match(extracted, /export default function X/);
  });
});
