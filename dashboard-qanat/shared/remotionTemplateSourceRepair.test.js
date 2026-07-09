import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { repairCorruptedTemplateStringLiterals } from "./remotionTemplateSourceRepair.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  path.join(__dirname, "../remotion-renderer/package.json")
);
const { transform } = require("sucrase");

function canTransform(code) {
  let src = code
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .trim();
  src = src.replace(/^"use client";\s*/m, "");
  src = src.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*/gm, "");
  src = src.replace(/export\s+const\s+exampleProps[^=]*=[\s\S]*?;\s*/m, "");
  src = src.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
  transform(src, { transforms: ["typescript", "jsx"] });
  return true;
}

describe("remotionTemplateSourceRepair", () => {
  it("repara strings quebradas do template PIP corrompido", () => {
    const broken =
      'pipSubtitle = "MAPA " ROTA " SETOR",\n' +
      'coordinateText = "2959\' S " 5118\' W",';
    const fixed = repairCorruptedTemplateStringLiterals(broken);
    assert.match(fixed, /pipSubtitle = "MAPA • ROTA • SETOR"/);
    assert.match(fixed, /coordinateText = "29°59' S • 51°18' W"/);
  });

  it("compila TSX real do projeto Norma_NBR_6118 após reparo", () => {
    const studioPath =
      "C:/Users/Leo/Desktop/Lumiera Videos/videos curtos shorts/Norma_NBR_6118/timeline_studio.json";
    if (!fs.existsSync(studioPath)) return;
    const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    const clip = studio.clips.find(
      (c) =>
        c.trackId === "motion" &&
        String(c.props?.studio_source_code || "").includes("Picture in Picture")
    );
    assert.ok(clip);
    const raw = clip.props.studio_source_code;
    assert.throws(() => canTransform(raw));
    const repaired = repairCorruptedTemplateStringLiterals(raw);
    assert.doesNotThrow(() => canTransform(repaired));
  });
});
