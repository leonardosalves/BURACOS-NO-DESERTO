import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {
  resolveProjectsRoot,
  getProjectsDirs,
  resetProjectsRootCache,
} from "./projectsRoot.js";

describe("projectsRoot", () => {
  it("aponta para Desktop do usuario Leo, nao systemprofile", () => {
    resetProjectsRootCache();
    const root = resolveProjectsRoot();
    assert.match(root, /Users\\Leo\\Desktop\\Lumiera Videos/i);
    assert.doesNotMatch(root, /systemprofile/i);
    const { shortsDir } = getProjectsDirs();
    const count = fs
      .readdirSync(shortsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).length;
    assert.ok(count >= 10, `esperado dezenas de shorts, obteve ${count}`);
  });
});
