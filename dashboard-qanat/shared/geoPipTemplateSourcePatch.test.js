import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  isGeoPipTemplateSource,
  patchGeoPipTemplateSourceForChrome,
} from "./geoPipTemplateSourcePatch.js";
import { repairCorruptedTemplateStringLiterals } from "./remotionTemplateSourceRepair.js";

const require = createRequire(
  new URL("../remotion-renderer/package.json", import.meta.url)
);
const { transform } = require("sucrase");

function assertCompilableTsx(code, label) {
  let src = String(code);
  src = src.replace(/^"use client";\s*/m, "");
  src = src.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*/gm, "");
  src = src.replace(/export\s+const\s+exampleProps[^=]*=[\s\S]*?;\s*/m, "");
  src = src.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
  try {
    transform(src, { transforms: ["typescript", "jsx"] });
  } catch (err) {
    throw new Error(`${label}: ${err.message}`);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(
  __dirname,
  "../backend/data/remotion-template-catalog.json"
);

function loadPipShortSource() {
  const c = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  for (const entry of Object.values(c.niches || {})) {
    const tpl = (entry.templates || []).find((t) =>
      String(t.name || "").includes("Picture in Picture")
    );
    if (tpl) return tpl.sourceCode.short;
  }
  throw new Error("PIP template not found");
}

describe("geoPipTemplateSourcePatch", () => {
  it("detecta template PIP", () => {
    const src = loadPipShortSource();
    assert.equal(isGeoPipTemplateSource(src), true);
  });

  it("remove badge % PIP e condiciona chrome vazio", () => {
    const src = loadPipShortSource();
    const patched = patchGeoPipTemplateSourceForChrome(src);
    assert.equal(patched.includes("{progressPercent}% PIP"), false);
    assert.match(patched, /showMainContentLabel && descriptorText &&/);
    assert.match(
      patched,
      /showMainContentLabel && \(mainTitle \|\| mainSubtitle\) \? contentProgress : 0/
    );
    assert.match(
      patched,
      /geoPipOverlayChrome \? "transparent" : backgroundColor/
    );
    assert.match(patched, /geoPipOverlayChrome\s*=\s*false/);
    assert.match(patched, /\{!geoPipOverlayChrome \? \(/);
    assert.match(
      patched,
      /opacity: geoPipOverlayChrome \? 0 : contentProgress/
    );
    assert.doesNotMatch(patched, /opacity: contentProgress,/);
    assert.match(patched, /geoPipOverlayChrome \? null : \(/);
    assert.match(patched, /statusText \? \(/);
    assert.match(patched, /pipTag \? \(/);
    assert.doesNotMatch(patched, />\s*PIP\s*<\/div>/);
    assertCompilableTsx(patched, "catalog patched");
  });

  it("TSX corrompido de projeto real compila apos repair + patch", () => {
    const studioPath =
      "C:/Users/Leo/Desktop/Lumiera Videos/videos curtos shorts/Norma_NBR_6118/timeline_studio.json";
    if (!fs.existsSync(studioPath)) return;
    const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    const clip = studio.clips.find(
      (c) => c.props?.geo_pip_composite && c.props?.studio_source_code
    );
    if (!clip) return;
    const repaired = repairCorruptedTemplateStringLiterals(
      clip.props.studio_source_code
    );
    const patched = patchGeoPipTemplateSourceForChrome(repaired);
    assertCompilableTsx(repaired, "project repaired");
    assertCompilableTsx(patched, "project patched");
  });
});
