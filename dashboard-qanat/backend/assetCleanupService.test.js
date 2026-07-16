import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  applyAssetCleanupResult,
  buildVideoCleanupArgs,
  createAssetCleanupResult,
  revertAssetCleanupResult,
} from "./assetCleanupService.js";
import { getFfmpegStatus } from "./pythonEnv.js";

describe("assetCleanupService", () => {
  it("cria cópia de imagem, aplica e desfaz sem sobrescrever o original", async () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-cleanup-"));
    const assetsDir = path.join(projDir, "ASSETS");
    fs.mkdirSync(assetsDir, { recursive: true });
    const sourcePath = path.join(assetsDir, "scene.png");
    await sharp({
      create: { width: 320, height: 180, channels: 3, background: "#406080" },
    })
      .png()
      .toFile(sourcePath);
    fs.writeFileSync(
      path.join(projDir, "config_qanat.json"),
      JSON.stringify({
        timeline_assets: {
          1: [{ asset: "ASSETS/scene.png", type: "image", scene_ref: "1.1" }],
        },
      })
    );

    const original = fs.readFileSync(sourcePath);
    const job = await createAssetCleanupResult(projDir, {
      asset: "ASSETS/scene.png",
      block: 1,
      assetIndex: 0,
      rect: { x: 0.7, y: 0.75, width: 0.25, height: 0.15 },
      method: "reconstruct",
      rightsConfirmed: true,
    });
    assert.ok(fs.existsSync(path.join(projDir, job.result_asset)));
    assert.deepEqual(fs.readFileSync(sourcePath), original);

    applyAssetCleanupResult(projDir, job.id);
    let config = JSON.parse(
      fs.readFileSync(path.join(projDir, "config_qanat.json"), "utf8")
    );
    assert.equal(config.timeline_assets[1][0].asset, job.result_asset);
    assert.equal(
      config.timeline_assets[1][0].cleanup_original_asset,
      "ASSETS/scene.png"
    );

    revertAssetCleanupResult(projDir, job.id);
    config = JSON.parse(
      fs.readFileSync(path.join(projDir, "config_qanat.json"), "utf8")
    );
    assert.equal(config.timeline_assets[1][0].asset, "ASSETS/scene.png");
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("exige confirmação de direitos", async () => {
    await assert.rejects(
      () =>
        createAssetCleanupResult("C:/nao-usado", {
          asset: "ASSETS/x.png",
          rect: { x: 0.7, y: 0.7, width: 0.2, height: 0.1 },
          rightsConfirmed: false,
        }),
      { code: "RIGHTS_CONFIRMATION_REQUIRED" }
    );
  });

  it("monta filtro de vídeo preservando áudio e faststart", () => {
    const args = buildVideoCleanupArgs({
      source: "source.mp4",
      destination: "clean.mp4",
      region: { x: 100, y: 700, width: 250, height: 80 },
    });
    assert.ok(args.includes("0:a?"));
    assert.ok(args.includes("aac"));
    assert.ok(args.includes("+faststart"));
    assert.ok(args.includes("delogo=x=100:y=700:w=250:h=80:show=0"));
  });

  const ffmpeg = getFfmpegStatus();
  it(
    "processa um vídeo real quadro a quadro quando FFmpeg está disponível",
    { skip: !ffmpeg.binary },
    async () => {
      const projDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "lumiera-cleanup-video-")
      );
      const assetsDir = path.join(projDir, "ASSETS");
      fs.mkdirSync(assetsDir, { recursive: true });
      const sourcePath = path.join(assetsDir, "scene.mp4");
      const generated = spawnSync(
        ffmpeg.binary,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "color=c=#406080:s=320x180:d=0.5",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=0.5",
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-shortest",
          sourcePath,
        ],
        { windowsHide: true }
      );
      assert.equal(generated.status, 0, generated.stderr?.toString());
      fs.writeFileSync(
        path.join(projDir, "config_qanat.json"),
        JSON.stringify({
          timeline_assets: {
            1: [{ asset: "ASSETS/scene.mp4", type: "video" }],
          },
        })
      );
      const job = await createAssetCleanupResult(projDir, {
        asset: "ASSETS/scene.mp4",
        block: 1,
        assetIndex: 0,
        rect: { x: 0.7, y: 0.75, width: 0.2, height: 0.15 },
        rightsConfirmed: true,
      });
      const output = path.join(projDir, job.result_asset);
      assert.ok(fs.statSync(output).size > 1000);
      fs.rmSync(projDir, { recursive: true, force: true });
    }
  );
});
