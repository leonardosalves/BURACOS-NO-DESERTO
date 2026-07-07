import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildOverlaysFromStudio,
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

  it("buildScenesFromStudio mantém só B-roll na trilha video", () => {
    const studio = {
      version: 1,
      clips: [
        {
          id: "video-1",
          trackId: "video",
          start: 0,
          duration: 10,
          source: "ASSETS/cena.jpg",
        },
        {
          id: "ms-3.2",
          trackId: "motion",
          start: 35.7,
          duration: 5,
          templateId: "location-intro",
          props: {
            media_mode: "remotion",
            location: "Palmanova",
            fly_mode: "earth_descent",
          },
        },
      ],
      totalDuration: 60,
    };

    const scenes = buildScenesFromStudio(studio, {
      projectDir: "/tmp",
      publicProjectDir: "/tmp/public",
      projectSlug: "demo",
      copyRemotionAsset: () => "cena.jpg",
      findProjectFile: (_dir, rel) => rel,
      fillSceneTimelineGaps: (s) => s,
    });

    assert.equal(scenes.length, 1);
    assert.equal(scenes[0].type, "image");
    assert.ok(scenes[0].asset.includes("cena.jpg"));
  });

  it("buildOverlaysFromStudio inclui trilha motion", () => {
    const studio = {
      version: 1,
      clips: [
        {
          id: "ms-3.2",
          trackId: "motion",
          start: 35.7,
          duration: 5,
          templateId: "location-intro",
          props: { location: "Palmanova", presentation: "pip" },
        },
      ],
    };

    const overlays = buildOverlaysFromStudio(studio, {
      projectDir: "/tmp",
      publicProjectDir: "/tmp/public",
      projectSlug: "demo",
      copyRemotionAsset: () => null,
      findProjectFile: (_dir, rel) => rel,
    });

    assert.equal(overlays.length, 1);
    assert.equal(overlays[0].type, "location-intro");
    assert.equal(overlays[0].props.location, "Palmanova");
  });
});
