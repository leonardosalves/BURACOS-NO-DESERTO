import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  mergeRemotionFromStoryboard,
  pruneStoryboardRemotionSources,
} from "../backend/timelineStudioMigration.js";

describe("timelineStudioRemotionSync", () => {
  it("mergeRemotionFromStoryboard não restaura cena suprimida no F5", () => {
    const storyboard = {
      motion_scenes: [
        {
          id: "ms-1.1",
          template_id: "location-intro",
          start_hint: 0,
          duration_seconds: 8,
          props: { location: "Bangkok" },
        },
      ],
    };
    const studio = {
      clips: [{ id: "video-1", trackId: "video", start: 0, duration: 10 }],
      suppressedMotionSceneIds: ["ms-1.1"],
    };

    const merged = mergeRemotionFromStoryboard(studio, storyboard);
    const motion = merged.studio.clips.filter((c) => c.trackId === "motion");
    assert.equal(motion.length, 0);
    assert.deepEqual(merged.studio.suppressedMotionSceneIds, ["ms-1.1"]);
  });

  it("mergeRemotionFromStoryboard não limpa suppressedMotionSceneIds", () => {
    const storyboard = {
      motion_scenes: [
        {
          id: "ms-1.1",
          template_id: "location-intro",
          start_hint: 0,
          duration_seconds: 8,
          props: {},
        },
      ],
    };
    const studio = {
      clips: [],
      suppressedMotionSceneIds: ["ms-1.1"],
    };
    const merged = mergeRemotionFromStoryboard(studio, storyboard);
    assert.deepEqual(merged.studio.suppressedMotionSceneIds, ["ms-1.1"]);
  });

  it("pruneStoryboardRemotionSources remove motion_scenes suprimidas", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-prune-"));
    const storyboardPath = path.join(tmp, "storyboard.json");
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(
        {
          motion_scenes: [{ id: "ms-1.1" }, { id: "ms-3.1" }],
          overlays_ai: [{ id: "ov-1", type: "counter" }],
        },
        null,
        2
      ),
      "utf8"
    );

    const changed = pruneStoryboardRemotionSources(tmp, ["ms-1.1", "ov-1"]);
    assert.equal(changed, true);

    const next = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    assert.deepEqual(
      next.motion_scenes.map((m) => m.id),
      ["ms-3.1"]
    );
    assert.equal(next.overlays_ai.length, 0);
  });
});
