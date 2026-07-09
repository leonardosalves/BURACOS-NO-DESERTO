import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  isGeoPipTemplateSource,
  patchGeoPipTemplateSourceForChrome,
} from "./geoPipTemplateSourcePatch.js";

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
    assert.match(patched, /statusText \? \(/);
    assert.match(patched, /pipTag \? \(/);
    assert.doesNotMatch(patched, />\s*PIP\s*<\/div>/);
  });
});