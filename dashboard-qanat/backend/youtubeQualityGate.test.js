import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getFfmpegStatus } from "./pythonEnv.js";
import {
  assessMetadataAndPolicy,
  assessOriginality,
  assessRetention,
  autoFixYoutubeQualityGate,
  resolveQualityGateVideo,
  textSimilarity,
} from "./youtubeQualityGate.js";

test("detecta narração praticamente duplicada", () => {
  const current =
    "O concreto romano resiste por dois mil anos porque pequenos cristais fecham suas rachaduras.";
  const result = assessOriginality({
    narration: current,
    title: "O segredo do concreto romano",
    previousProjects: [
      {
        name: "anterior",
        narration:
          "O concreto romano resiste por dois mil anos porque pequenos cristais fecham suas rachaduras rapidamente.",
        title: "Segredo do concreto romano",
        assets: [],
      },
    ],
    sourceCount: 1,
  });
  assert.ok(result.maxNarration.score > 0.65);
  assert.ok(result.score < 65);
});

test("similaridade distingue textos não relacionados", () => {
  assert.ok(
    textSimilarity(
      "Como os romanos faziam concreto",
      "A formação de estrelas em galáxias distantes"
    ) < 0.1
  );
});

test("retenção penaliza saudação vaga e recompensa promessa entregue", () => {
  const weak = assessRetention({
    title: "Como funciona a energia solar",
    narration:
      "Olá pessoal, antes de começar se inscreva. No vídeo de hoje vamos conversar sobre várias coisas.",
  });
  const strong = assessRetention({
    title: "Como funciona a energia solar",
    narration:
      "Como a energia solar vira eletricidade mesmo sem peças móveis? O segredo está nos elétrons do silício.",
  });
  assert.ok(strong.score > weak.score);
  assert.equal(weak.vagueOpening, true);
});

test("política exige declaração sintética e metadados essenciais", () => {
  const result = assessMetadataAndPolicy({
    metadata: {
      title: "",
      description: "",
      tags: [],
      chapters: "",
      containsSyntheticMedia: false,
    },
    narration: "Uma explicação educacional.",
  });
  assert.ok(result.score < 40);
});

test("localiza o render selecionado na pasta final do Remotion", () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-gate-"));
  const outputDir = path.join(projectDir, "OUTPUT", "qanat_persa_video_final");
  fs.mkdirSync(outputDir, { recursive: true });
  const videoPath = path.join(outputDir, "remotion_1784212652150.mp4");
  fs.writeFileSync(videoPath, "video");
  try {
    assert.equal(
      resolveQualityGateVideo(projectDir, "remotion_1784212652150.mp4"),
      videoPath
    );
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("correção automática alinha metadados e cria backup", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-fix-"));
  const projectDir = path.join(root, "project");
  fs.mkdirSync(path.join(projectDir, "OUTPUT"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, "storyboard.json"),
    JSON.stringify({
      narrative_script:
        "A ponte de cinquenta e cinco quilômetros atravessa o oceano e esconde um túnel submarino.",
    })
  );
  fs.writeFileSync(
    path.join(projectDir, "config_qanat.json"),
    JSON.stringify({
      upload_metadata: {
        youtube: {
          title: "Título sem relação",
          description: "",
          privacy: "public",
          contains_synthetic_media: false,
        },
      },
    })
  );
  try {
    const result = await autoFixYoutubeQualityGate({
      workspaceDir: root,
      projectsRoot: root,
      projectDir,
      fixWithAi: async () => ({
        title: "A ponte de 55 km que esconde um túnel submarino",
        description: "Conheça a engenharia da ponte e seu túnel sob o oceano.",
      }),
    });
    const saved = JSON.parse(
      fs.readFileSync(path.join(projectDir, "config_qanat.json"), "utf8")
    );
    assert.equal(saved.upload_metadata.youtube.privacy, "private");
    assert.equal(saved.upload_metadata.youtube.contains_synthetic_media, true);
    assert.match(saved.upload_metadata.youtube.title, /ponte de 55 km/i);
    assert.ok(result.backupPath && fs.existsSync(result.backupPath));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test(
  "correção automática recodifica MP4 incompatível e preserva backup",
  { timeout: 120000 },
  async (t) => {
    const ff = getFfmpegStatus();
    if (!ff.binary) return t.skip("FFmpeg indisponível");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-video-fix-"));
    const projectDir = path.join(root, "project");
    const outputDir = path.join(
      projectDir,
      "OUTPUT",
      "qanat_persa_video_final"
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const videoPath = path.join(outputDir, "test.mp4");
    const generated = spawnSync(
      ff.binary,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=320x240:rate=30:duration=1.2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:duration=1.2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv444p",
        "-c:a",
        "aac",
        videoPath,
      ],
      { windowsHide: true }
    );
    assert.equal(generated.status, 0, generated.stderr?.toString());
    fs.writeFileSync(
      path.join(projectDir, "storyboard.json"),
      JSON.stringify({
        narrative_script:
          "Uma ponte pequena demonstra como a engenharia distribui forças.",
      })
    );
    fs.writeFileSync(
      path.join(projectDir, "config_qanat.json"),
      JSON.stringify({
        aspect_ratio: "16:9",
        upload_metadata: {
          youtube: {
            title: "Como uma ponte distribui forças",
            description: "Explicação de engenharia.",
            privacy: "private",
            contains_synthetic_media: true,
          },
        },
      })
    );
    try {
      const result = await autoFixYoutubeQualityGate({
        workspaceDir: root,
        projectsRoot: root,
        projectDir,
        videoName: "test.mp4",
        fixWithAi: async () => ({}),
      });
      assert.ok(result.applied.some((item) => item.id === "video.resolution"));
      assert.ok(
        fs
          .readdirSync(path.join(projectDir, ".quality-gate-backups"))
          .some((name) => name.endsWith(".mp4"))
      );
      assert.equal(result.report.video.width, 1920);
      assert.equal(result.report.video.height, 1080);
      assert.equal(result.report.video.pixelFormat, "yuv420p");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
);
