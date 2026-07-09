import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  finalizeStudioForDisk,
  mergeRemotionFromStoryboard,
  pruneStoryboardRemotionSources,
  purgeLegacyStoryboardRemotion,
  syncStudioTimingToStoryboard,
  syncStudioBrollToTimelineAssets,
} from "../backend/timelineStudioMigration.js";
import {
  expandDeletedClipSuppressions,
  stripSuppressedRemotionClips,
} from "./timelineStudioRemotionSuppress.js";

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

  it("mergeRemotionFromStoryboard remove clips suprimidos já presentes", () => {
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
      overlays_ai: [{ id: "ov-1", type: "counter", start: 5, duration: 4 }],
    };
    const studio = {
      clips: [
        { id: "ms-1.1", trackId: "motion", start: 0, duration: 8 },
        { id: "ov-1", trackId: "overlays", start: 5, duration: 4 },
        { id: "video-1", trackId: "video", start: 0, duration: 10 },
      ],
      suppressedMotionSceneIds: ["ms-1.1", "ov-1"],
    };

    const merged = mergeRemotionFromStoryboard(studio, storyboard);
    const ids = merged.studio.clips.map((c) => c.id);
    assert.deepEqual(ids, ["video-1"]);
  });

  it("expandDeletedClipSuppressions inclui duplicata semântica de overlay", () => {
    const storyboard = {
      overlays_ai: [
        {
          id: "ov-epicenter-dist",
          type: "counter",
          start: 1.85,
          props: { label: "Distância do Epicentro (Mianmar-Bangcoc)" },
        },
      ],
    };
    const studio = {
      clips: [
        {
          id: "cnt-epicenter",
          trackId: "overlays",
          templateId: "counter",
          start: 14,
          label: "counter",
          props: { label: "Distância do Epicentro" },
        },
      ],
      suppressedMotionSceneIds: [],
    };
    const expanded = expandDeletedClipSuppressions(storyboard, studio, {
      id: "ov-epicenter-dist",
      trackId: "overlays",
      templateId: "counter",
      start: 1.85,
      props: { label: "Distância do Epicentro (Mianmar-Bangcoc)" },
    });
    assert.ok(expanded.suppressedMotionSceneIds.includes("ov-epicenter-dist"));
    assert.ok(expanded.suppressedMotionSceneIds.includes("cnt-epicenter"));
  });

  it("stripSuppressedRemotionClips remove clips suprimidos do array", () => {
    const studio = {
      clips: [
        { id: "ms-1.1", trackId: "motion", start: 0, duration: 8 },
        { id: "video-1", trackId: "video", start: 0, duration: 10 },
      ],
      suppressedMotionSceneIds: ["ms-1.1"],
    };
    const stripped = stripSuppressedRemotionClips(studio);
    assert.deepEqual(
      stripped.clips.map((c) => c.id),
      ["video-1"]
    );
  });

  it("finalizeStudioForDisk persiste exclusão no PUT", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-finalize-"));
    const storyboardPath = path.join(tmp, "storyboard.json");
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(
        {
          motion_scenes: [
            {
              id: "ms-1.1",
              template_id: "location-intro",
              start_hint: 0,
              duration_seconds: 8,
              props: { location: "Bangkok" },
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );
    const studioPath = path.join(tmp, "timeline_studio.json");
    fs.writeFileSync(
      studioPath,
      JSON.stringify(
        {
          clips: [
            { id: "ms-1.1", trackId: "motion", start: 0, duration: 8 },
            { id: "video-1", trackId: "video", start: 0, duration: 10 },
          ],
          suppressedMotionSceneIds: [],
        },
        null,
        2
      ),
      "utf8"
    );

    const previous = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    const next = {
      clips: [{ id: "video-1", trackId: "video", start: 0, duration: 10 }],
      suppressedMotionSceneIds: ["ms-1.1"],
    };
    finalizeStudioForDisk(tmp, next, { previousStudio: previous });

    const saved = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    assert.equal(saved.clips.filter((c) => c.trackId === "motion").length, 0);
    assert.ok(saved.suppressedMotionSceneIds.includes("ms-1.1"));
    const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    assert.equal(sb.motion_scenes.length, 0);
  });

  it("finalizeStudioForDisk infere exclusão Remotion removida direto da trilha", () => {
    const tmp = fs.mkdtempSync(
      path.join(os.tmpdir(), "lumiera-finalize-implicit-")
    );
    const storyboardPath = path.join(tmp, "storyboard.json");
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(
        {
          motion_scenes: [
            {
              id: "ms-laufenburg",
              template_id: "location-intro",
              start_hint: 12,
              duration_seconds: 8,
              props: { location: "Ponte de Laufenburg" },
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );
    const studioPath = path.join(tmp, "timeline_studio.json");
    fs.writeFileSync(
      studioPath,
      JSON.stringify(
        {
          clips: [
            {
              id: "clip-generated-1",
              trackId: "motion",
              start: 12,
              duration: 8,
              label: "Ponte de Laufenburg",
              props: {
                motion_scene_id: "ms-laufenburg",
                template_id: "location-intro",
                location: "Ponte de Laufenburg",
              },
            },
            { id: "video-1", trackId: "video", start: 0, duration: 20 },
          ],
          suppressedMotionSceneIds: [],
        },
        null,
        2
      ),
      "utf8"
    );

    const previous = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    const next = {
      clips: [{ id: "video-1", trackId: "video", start: 0, duration: 20 }],
      suppressedMotionSceneIds: [],
    };
    finalizeStudioForDisk(tmp, next, { previousStudio: previous });

    const saved = JSON.parse(fs.readFileSync(studioPath, "utf8"));
    assert.equal(
      saved.clips.some((c) => c.trackId === "motion"),
      false
    );
    assert.ok(saved.suppressedMotionSceneIds.includes("ms-laufenburg"));
    assert.ok(saved.suppressedMotionSceneIds.includes("clip-generated-1"));
    const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    assert.equal(sb.motion_scenes.length, 0);
  });

  it("mergeRemotionFromStoryboard ignora overlays_ai legados", () => {
    const storyboard = {
      overlays_ai: [
        {
          id: "ov-bar",
          type: "bar-chart",
          start: 2,
          duration: 4,
          props: { title: "COMPARAÇÃO" },
        },
      ],
      motion_scenes: [
        {
          id: "ms-bar",
          template_id: "bar-chart",
          media_mode: "remotion",
          start_hint: 2,
          duration_seconds: 4,
          props: { title: "COMPARAÇÃO" },
        },
      ],
    };
    const studio = {
      clips: [{ id: "video-1", trackId: "video", start: 0, duration: 10 }],
    };
    const merged = mergeRemotionFromStoryboard(studio, storyboard);
    assert.equal(
      merged.studio.clips.filter((c) => c.trackId !== "video").length,
      0
    );
  });

  it("purgeLegacyStoryboardRemotion remove overlays_ai e motion sem TSX", () => {
    const storyboard = {
      overlays_ai: [{ id: "ov-1", type: "counter", start: 1, duration: 3 }],
      motion_scenes: [
        {
          id: "ms-geo",
          template_id: "location-intro",
          props: { location: "Bangkok" },
        },
        {
          id: "ms-bar",
          template_id: "bar-chart",
          props: { title: "COMPARAÇÃO" },
        },
      ],
    };
    const purged = purgeLegacyStoryboardRemotion(storyboard);
    assert.equal(purged.changed, true);
    assert.equal(purged.storyboard.overlays_ai.length, 0);
    assert.equal(purged.storyboard.motion_scenes.length, 1);
    assert.equal(purged.storyboard.motion_scenes[0].id, "ms-geo");
  });

  it("syncStudioTimingToStoryboard casa clip por motion_scene_id", () => {
    const tmp = fs.mkdtempSync(
      path.join(os.tmpdir(), "lumiera-timing-motion-id-")
    );
    const storyboardPath = path.join(tmp, "storyboard.json");
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(
        {
          motion_scenes: [
            {
              id: "ms-pip-draft",
              template_id: "location-intro",
              start_hint: 11.4,
              duration_seconds: 4,
              props: { template_studio_name: "Engenharia Picture in Picture" },
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );

    const studio = {
      clips: [
        {
          id: "motion-studio-1783573511378",
          trackId: "motion",
          start: 16,
          duration: 10,
          timing_manual: true,
          props: {
            motion_scene_id: "ms-pip-draft",
            timing_manual: true,
          },
        },
      ],
    };

    const result = syncStudioTimingToStoryboard(tmp, studio);
    assert.equal(result.changed, true);
    assert.equal(result.motion_scenes[0].start_hint, 16);
    assert.equal(result.motion_scenes[0].duration_seconds, 10);
  });

  it("syncStudioBrollToTimelineAssets propaga start/duration dos clips video", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-broll-sync-"));
    const configPath = path.join(tmp, "config_qanat.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          timeline_assets: {
            1: [
              {
                asset: "clip_a.mp4",
                type: "video",
                audio_start: 0,
                fixed: 14.1,
              },
              {
                asset: "clip_b.jpeg",
                type: "image",
                audio_start: 14.114,
                fixed: 11.9,
              },
            ],
          },
        },
        null,
        2
      ),
      "utf8"
    );

    const studio = {
      clips: [
        {
          id: "video-1-0",
          trackId: "video",
          start: 0,
          duration: 10,
          timing_manual: true,
          props: { blockKey: "1", assetIndex: 0, timing_manual: true },
        },
        {
          id: "video-1-1",
          trackId: "video",
          start: 10,
          duration: 16,
          timing_manual: true,
          props: { blockKey: "1", assetIndex: 1, timing_manual: true },
        },
      ],
    };

    const result = syncStudioBrollToTimelineAssets(tmp, studio);
    assert.equal(result.changed, true);
    assert.equal(result.timeline_assets["1"][0].fixed, 10);
    assert.equal(result.timeline_assets["1"][0].audio_start, 0);
    assert.equal(result.timeline_assets["1"][0].fixed_locked, true);
    assert.equal(result.timeline_assets["1"][1].fixed, 16);
    assert.equal(result.timeline_assets["1"][1].audio_start, 10);
    assert.equal(result.timeline_assets["1"][1].fixed_locked, true);

    const onDisk = JSON.parse(fs.readFileSync(configPath, "utf8"));
    assert.equal(onDisk.timeline_assets["1"][0].fixed, 10);
    assert.equal(onDisk.timeline_assets["1"][1].fixed, 16);
  });

  it("syncStudioTimingToStoryboard propaga start/duration dos clips motion", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-timing-sync-"));
    const storyboardPath = path.join(tmp, "storyboard.json");
    const sceneId = "motion-studio-1783573511378";
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(
        {
          motion_scenes: [
            {
              id: sceneId,
              template_id: "engenharia-picture-in-picture",
              start_hint: 11.4,
              duration_seconds: 4,
              props: { location: "Norma NBR 6118" },
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );

    const studio = {
      clips: [
        {
          id: sceneId,
          trackId: "motion",
          start: 16,
          duration: 10,
          props: { motion_scene_id: sceneId },
        },
      ],
    };

    const result = syncStudioTimingToStoryboard(tmp, studio);
    assert.equal(result.changed, true);
    assert.equal(result.motion_scenes[0].start_hint, 16);
    assert.equal(result.motion_scenes[0].duration_seconds, 10);

    const onDisk = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    assert.equal(onDisk.motion_scenes[0].start_hint, 16);
    assert.equal(onDisk.motion_scenes[0].duration_seconds, 10);
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
