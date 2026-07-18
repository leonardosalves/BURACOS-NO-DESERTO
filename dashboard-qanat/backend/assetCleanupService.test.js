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
      .composite([
        {
          input: {
            create: {
              width: 80,
              height: 27,
              channels: 3,
              background: "#ff0000",
            },
          },
          left: 224,
          top: 135,
        },
      ])
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
    const resultPath = path.join(projDir, job.result_asset);
    assert.ok(fs.existsSync(resultPath));
    const cleanedPixel = await sharp(resultPath)
      .extract({ left: 250, top: 148, width: 1, height: 1 })
      .raw()
      .toBuffer();
    assert.ok(
      cleanedPixel[0] < 180,
      "a reconstrução precisa substituir o vermelho da marca"
    );
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

  it("informa o asset atual quando a comparação ficou desatualizada", async () => {
    const projDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "lumiera-cleanup-stale-")
    );
    const assetsDir = path.join(projDir, "ASSETS");
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const name of ["original.png", "novo.png"]) {
      await sharp({
        create: { width: 320, height: 180, channels: 3, background: "#406080" },
      })
        .png()
        .toFile(path.join(assetsDir, name));
    }
    const configPath = path.join(projDir, "config_qanat.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        timeline_assets: {
          1: [{ asset: "ASSETS/original.png", type: "image" }],
        },
      })
    );
    const job = await createAssetCleanupResult(projDir, {
      asset: "ASSETS/original.png",
      block: 1,
      assetIndex: 0,
      rect: { x: 0.7, y: 0.75, width: 0.2, height: 0.15 },
      rightsConfirmed: true,
    });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        timeline_assets: {
          1: [{ asset: "ASSETS/novo.png", type: "image" }],
        },
      })
    );
    assert.throws(
      () => applyAssetCleanupResult(projDir, job.id),
      (error) =>
        error.code === "ASSET_CLEANUP_SOURCE_CHANGED" &&
        error.current_asset === "ASSETS/novo.png"
    );
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("monta reconstrução de vídeo com pixels vizinhos, áudio e faststart", () => {
    const args = buildVideoCleanupArgs({
      source: "source.mp4",
      destination: "clean.mp4",
      region: {
        x: 100,
        y: 700,
        width: 250,
        height: 80,
        frameWidth: 1920,
        frameHeight: 1080,
      },
    });
    assert.ok(args.includes("0:a?"));
    assert.ok(args.includes("aac"));
    assert.ok(args.includes("+faststart"));
    const filter = args[args.indexOf("-filter_complex") + 1];
    assert.match(filter, /crop=/);
    assert.match(filter, /overlay=100:700/);
    assert.doesNotMatch(filter, /delogo/);
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
          "-vf",
          "drawbox=x=224:y=135:w=64:h=27:color=red:t=fill",
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
      assert.equal(job.method, "neighbor_patch");
      const framePath = path.join(projDir, "cleaned-frame.png");
      const extracted = spawnSync(
        ffmpeg.binary,
        ["-y", "-ss", "0.2", "-i", output, "-frames:v", "1", framePath],
        { windowsHide: true }
      );
      assert.equal(extracted.status, 0, extracted.stderr?.toString());
      const cleanedPixel = await sharp(framePath)
        .extract({ left: 250, top: 148, width: 1, height: 1 })
        .raw()
        .toBuffer();
      assert.ok(
        cleanedPixel[0] < 180,
        "o patch quadro a quadro precisa substituir o vermelho da marca"
      );
      fs.rmSync(projDir, { recursive: true, force: true });
    }
  );
});
