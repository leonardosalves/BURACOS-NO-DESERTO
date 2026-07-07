import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBlenderAvailable,
  resolveBlenderExecutable,
} from "../backend/blenderMapService.js";
import { resolveMapEngine } from "../backend/satelliteMapService.js";

describe("blenderMapService", () => {
  it("resolveMapEngine padrão é blender", () => {
    assert.equal(resolveMapEngine({}, {}), "blender");
  });

  it("resolveBlenderExecutable retorna string", () => {
    const exe = resolveBlenderExecutable();
    assert.equal(typeof exe, "string");
  });

  it("isBlenderAvailable reflete executável", () => {
    const exe = resolveBlenderExecutable();
    assert.equal(isBlenderAvailable(), Boolean(exe));
  });
});
