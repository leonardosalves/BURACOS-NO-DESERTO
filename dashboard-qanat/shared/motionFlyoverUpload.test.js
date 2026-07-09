import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  patchMotionSceneFlyover,
  resolveFlyoverDest,
} from "../backend/motionFlyoverUpload.js";

describe("motionFlyoverUpload", () => {
  it("resolveFlyoverDest grava em ASSETS/satellite", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-fly-"));
    const dest = resolveFlyoverDest(tmp, "ms-3.2", "voo.mp4");
    assert.match(dest.relPath, /^ASSETS\/satellite\//);
    assert.match(dest.fileName, /ms-3\.2-geo-flyover\.mp4$/);
    assert.equal(
      dest.absPath,
      path.join(tmp, dest.relPath.replace(/\//g, path.sep))
    );
  });

  it("patchMotionSceneFlyover atualiza flyover_video", () => {
    const scenes = [
      {
        id: "ms-1",
        template_id: "location-intro",
        props: { location: "Roma" },
      },
      { id: "ms-2", template_id: "counter", props: {} },
    ];
    const next = patchMotionSceneFlyover(
      scenes,
      "ms-1",
      "ASSETS/satellite/ms-1-geo-flyover.mp4"
    );
    assert.equal(
      next[0].props.flyover_video,
      "ASSETS/satellite/ms-1-geo-flyover.mp4"
    );
    assert.equal(next[0].props.map_provider, "ai_t2v");
    assert.equal(next[1].props.flyover_video, undefined);
  });
});
