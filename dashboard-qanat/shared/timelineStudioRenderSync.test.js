import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildScenesFromStudio,
  copyMotionPropsAssets,
} from "../backend/timelineStudioRenderSync.js";

describe("timelineStudioRenderSync", () => {
  it("copyMotionPropsAssets copia zoom_keyframes e boundary", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-motion-"));
    const publicDir = path.join(tmp, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    const img = path.join(tmp, "ASSETS", "satellite", "ms-z8.jpg");
    const boundary = path.join(tmp, "ASSETS", "satellite", "ms-boundary.json");
    fs.mkdirSync(path.dirname(img), { recursive: true });
    fs.writeFileSync(img, Buffer.alloc(1200, 1));
    fs.writeFileSync(boundary, JSON.stringify({ type: "Polygon" }));

    const copied = [];
    const props = copyMotionPropsAssets(
      {
        backgroundImage: "ASSETS/satellite/ms-z8.jpg",
        zoom_keyframes: [
          { zoom: 8, image: "ASSETS/satellite/ms-z8.jpg" },
          { zoom: 14, image: "ASSETS/satellite/ms-z8.jpg" },
        ],
        boundaryGeoJson: "ASSETS/satellite/ms-boundary.json",
      },
      {
        projectDir: tmp,
        publicProjectDir: publicDir,
        projectSlug: "test-proj",
        copyRemotionAsset: (src, dest, prefix) => {
          const name = `${prefix}${path.basename(src)}`;
          fs.copyFileSync(src, path.join(dest, name));
          copied.push(name);
          return name;
        },
        findProjectFile: (dir, rel) => path.join(dir, rel),
      },
      "rv1_"
    );

    assert.match(String(props.backgroundImage), /projects\/test-proj\//);
    assert.equal(props.zoom_keyframes.length, 2);
    assert.match(
      String(props.zoom_keyframes[0].image),
      /projects\/test-proj\//
    );
    assert.match(String(props.boundaryGeoJson), /projects\/test-proj\//);
    assert.ok(copied.length >= 3);
  });

  it("buildScenesFromStudio emite type remotion para clip primário", () => {
    const studio = {
      version: 1,
      clips: [
        {
          id: "ms-3.2",
          trackId: "video",
          start: 35.7,
          duration: 5,
          templateId: "location-intro",
          props: {
            media_mode: "remotion",
            location: "Palmanova",
            fly_mode: "earth_descent",
            zoom_keyframes: [{ zoom: 8, image: "ASSETS/satellite/x.jpg" }],
          },
        },
      ],
      totalDuration: 60,
    };

    const scenes = buildScenesFromStudio(studio, {
      projectDir: "/tmp",
      publicProjectDir: "/tmp/public",
      projectSlug: "demo",
      copyRemotionAsset: () => "x.jpg",
      findProjectFile: (_dir, rel) => rel,
      fillSceneTimelineGaps: (s) => s,
    });

    assert.equal(scenes.length, 1);
    assert.equal(scenes[0].type, "remotion");
    assert.equal(scenes[0].remotionTemplate, "location-intro");
    assert.equal(scenes[0].remotionProps.fly_mode, "earth_descent");
  });
});
