import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  ensureMotionSceneForUpload,
  motionSceneMatches,
  patchMotionSceneFlyover,
  patchStudioClipFlyover,
  resolveFlyoverDest,
} from "../backend/motionFlyoverUpload.js";
import { buildStudioCatalogMotionClip } from "../backend/timelineStudioNichePacks.js";

const TSX =
  '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}';

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

  it("motionSceneMatches aceita id e scene_ref", () => {
    const ms = { id: "ms-3.2", scene_ref: "3.2" };
    assert.equal(motionSceneMatches(ms, "ms-3.2"), true);
    assert.equal(motionSceneMatches(ms, "3.2"), true);
    assert.equal(motionSceneMatches(ms, "ms-9.9"), false);
  });

  it("ensureMotionSceneForUpload cria cena a partir do clip da timeline", () => {
    const clip = buildStudioCatalogMotionClip({
      templateId: "location-intro",
      playhead: 26,
      props: {
        studio_source_code: TSX,
        presentation: "pip",
        geo_pip_composite: true,
      },
      label: "Picture in Picture",
    });
    const studio = { clips: [clip] };
    const ensured = ensureMotionSceneForUpload([], studio, clip.id);
    assert.equal(ensured.length, 1);
    assert.equal(ensured[0].id, clip.id);
    assert.equal(ensured[0].template_id, "location-intro");
    const patched = patchMotionSceneFlyover(
      ensured,
      clip.id,
      "ASSETS/satellite/test-geo-flyover.mp4"
    );
    assert.equal(
      patched[0].props.flyover_video,
      "ASSETS/satellite/test-geo-flyover.mp4"
    );
  });

  it("patchStudioClipFlyover atualiza clip motion na timeline", () => {
    const clip = buildStudioCatalogMotionClip({
      templateId: "location-intro",
      playhead: 0,
      props: { studio_source_code: TSX },
      label: "PIP",
    });
    const studio = { clips: [clip] };
    const next = patchStudioClipFlyover(
      studio,
      clip.id,
      "ASSETS/satellite/pip-geo-flyover.mp4"
    );
    assert.equal(
      next.clips[0].props.flyover_video,
      "ASSETS/satellite/pip-geo-flyover.mp4"
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
