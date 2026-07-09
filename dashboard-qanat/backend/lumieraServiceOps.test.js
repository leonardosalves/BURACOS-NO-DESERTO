import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLumieraServiceOpsStatus,
  isWindowsServiceMode,
} from "./lumieraServiceOps.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("lumieraServiceOps", () => {
  it("expõe status de ops do serviço", () => {
    const status = getLumieraServiceOpsStatus(__dirname);
    assert.equal(typeof status.canRestart, "boolean");
    assert.equal(status.serviceName, "LumieraBackend");
  });

  it("detecta modo serviço Windows pelo marker", () => {
    const mode = isWindowsServiceMode(__dirname);
    assert.equal(typeof mode, "boolean");
  });
});
