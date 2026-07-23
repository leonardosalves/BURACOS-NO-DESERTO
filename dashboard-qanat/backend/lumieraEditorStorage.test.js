import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildLumieraAssetUrls,
  buildTimelineStudioFromLumieraEditor,
  createLumieraEditorProject,
  createLumieraRenderSnapshot,
  hydrateLumieraEditorFromTimelineStudio,
  loadLumieraEditorProject,
  normalizeLumieraProbe,
  saveLumieraEditorProject,
} from "./lumieraEditorStorage.js";
import {
  buildOverlaysFromStudio,
  resolveStudioFormat,
} from "./timelineStudioRenderSync.js";
import { extractBingVideoHits } from "./bingImageStock.js";

test("normaliza metadados de ingestao em frames", () => {
  const metadata = normalizeLumieraProbe(
    {
      format: { duration: "2.5" },
      streams: [
        { codec_type: "video", width: 1920, height: 1080, codec_name: "h264" },
        { codec_type: "audio", sample_rate: "48000", codec_name: "aac" },
      ],
    },
    30
  );
  assert.equal(metadata.durationInFrames, 75);
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.sampleRate, 48000);
});

test("gera URLs distintas para original, proxy, waveform e thumbnails", () => {
  const urls = buildLumieraAssetUrls("Meu Projeto", "asset-1", ".mov", "video");
  assert.match(urls.originalSource, /originals\/asset-1\.mov$/);
  assert.match(urls.proxySource, /proxies\/asset-1\.mp4$/);
  assert.equal(urls.thumbnailSources.length, 3);
  assert.match(urls.waveformSource, /waveforms\/asset-1\.png$/);
});

test("cria projeto vazio no formato vertical solicitado", () => {
  const project = createLumieraEditorProject("9:16", 30);
  assert.equal(project.width, 1080);
  assert.equal(project.height, 1920);
  assert.ok(project.tracks.some((track) => track.id === "video"));
  assert.ok(project.tracks.some((track) => track.id === "images"));
});

test("extrai resultados de video do Bing, inclusive paginas importaveis via yt-dlp", () => {
  const metadata = JSON.stringify({
    murl: "https://www.youtube.com/watch?v=x",
    pgurl: "https://www.youtube.com/watch?v=x",
    turl: "https://cdn.example/thumb.jpg?a=1&b=2",
    vt: "Carro em movimento",
    du: "01:23",
  })
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
  const hits = extractBingVideoHits(
    `<div class="vrhdata" vrhm="${metadata}"></div>`
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].mediaUrl, "https://www.youtube.com/watch?v=x");
  assert.equal(hits[0].title, "Carro em movimento");
});

test("persiste projeto e congela snapshot de render usando originais", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-editor-"));
  try {
    const project = saveLumieraEditorProject(dir, {
      version: 2,
      fps: 30,
      durationInFrames: 90,
      tracks: [
        {
          id: "video",
          type: "video",
          clips: [
            {
              id: "clip",
              trackId: "video",
              type: "video",
              startFrame: 30,
              durationInFrames: 60,
              sourceStartFrame: 45,
              sourceEndFrame: 105,
              assetId: "a",
            },
          ],
        },
      ],
      assets: [
        { id: "a", originalSource: "/original.mov", proxySource: "/proxy.mp4" },
      ],
      auditLog: [],
    });
    assert.equal(loadLumieraEditorProject(dir).fps, 30);
    const result = createLumieraRenderSnapshot(dir);
    assert.ok(fs.existsSync(result.snapshotPath));
    assert.equal(
      result.snapshot.editor.assets[0].renderSource,
      "/original.mov"
    );
    assert.equal(result.snapshot.editor.assets[0].proxySource, "/original.mov");
    const studioClip = result.snapshot.files["timeline_studio.json"].clips.find(
      (clip) => clip.id === "lumiera-editor-clip"
    );
    assert.equal(studioClip.start, 1);
    assert.equal(studioClip.duration, 2);
    assert.equal(studioClip.source, "/original.mov");
    assert.equal(studioClip.sourceStart, 1.5);
    assert.equal(studioClip.sourceEnd, 3.5);
    project.assets[0].originalSource = "/mutated.mov";
    assert.equal(
      result.snapshot.editor.assets[0].originalSource,
      "/original.mov"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("traduz Motion Template em clip normal de render", () => {
  const studio = buildTimelineStudioFromLumieraEditor({
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 120,
    assets: [],
    tracks: [
      {
        id: "motion",
        type: "motion-template",
        clips: [
          {
            id: "m1",
            trackId: "motion",
            type: "motion-template",
            startFrame: 15,
            durationInFrames: 90,
            templateId: "odometer-digit-roll",
            props: {
              value: 310,
              title: "Ponte do Rio",
              subtitle: "310 metros",
              positionX: 0.22,
              positionY: 0.74,
              opacity: 0.62,
              forceTransparent: true,
              palette: { primary: "#ffaa00", accent: "#2288ff" },
            },
          },
        ],
      },
    ],
  });
  const clip = studio.clips[0];
  assert.equal(clip.trackId, "motion");
  assert.equal(clip.props.motion_shot.templateId, "odometer-digit-roll");
  assert.equal(clip.props.motion_shot.props.value, 310);
  assert.equal(clip.props.motion_shot.props.positionX, 0.22);
  assert.equal(clip.props.motion_shot.props.positionY, 0.74);
  assert.equal(clip.props.motion_shot.props.opacity, 0.62);
  assert.equal(clip.props.motion_shot.props.forceTransparent, true);
  assert.equal(clip.props.motion_shot.props.title, "Ponte do Rio");
  assert.equal(clip.props.motion_shot.props.subtitle, "310 metros");
  assert.equal(clip.props.motion_shot.palette.primary, "#ffaa00");
  assert.equal(studio.format, "9:16");
  assert.equal(resolveStudioFormat(studio, { aspect_ratio: "16:9" }), "9:16");
  const overlays = buildOverlaysFromStudio(studio, {});
  assert.equal(overlays.length, 1);
  assert.equal(overlays[0].type, "shotcraft");
  assert.equal(overlays[0].props.motion_shot.templateId, "odometer-digit-roll");
  assert.equal(overlays[0].props.motion_shot.props.positionX, 0.22);
  assert.equal(overlays[0].props.motion_shot.props.positionY, 0.74);
  assert.equal(overlays[0].props.motion_shot.props.opacity, 0.62);
  assert.equal(overlays[0].props.motion_shot.props.forceTransparent, true);
  assert.equal(overlays[0].props.motion_shot.props.title, "Ponte do Rio");
  assert.equal(overlays[0].props.motion_shot.palette.accent, "#2288ff");
});

test("converte texto, Lottie e efeito da timeline em overlays de render", () => {
  const studio = buildTimelineStudioFromLumieraEditor({
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 120,
    assets: [{ id: "lot", originalSource: "ASSETS/lottie.json" }],
    tracks: [
      {
        id: "text",
        clips: [
          {
            id: "t1",
            trackId: "text",
            type: "text",
            startFrame: 0,
            durationInFrames: 60,
            props: { text: "Titulo" },
          },
        ],
      },
      {
        id: "lottie",
        clips: [
          {
            id: "l1",
            trackId: "lottie",
            type: "lottie",
            startFrame: 30,
            durationInFrames: 60,
            assetId: "lot",
          },
        ],
      },
      {
        id: "effects",
        clips: [
          {
            id: "e1",
            trackId: "effects",
            type: "effect",
            startFrame: 0,
            durationInFrames: 90,
            props: { effect: "fade" },
          },
        ],
      },
    ],
  });
  const overlays = buildOverlaysFromStudio(studio, {});
  assert.deepEqual(overlays.map((item) => item.type).sort(), [
    "effect-overlay",
    "kinetic-text",
    "lottie-overlay",
  ]);
});

test("hidrata continuamente novas midias e respeita o formato da timeline", () => {
  const editor = {
    fps: 30,
    durationInFrames: 30,
    assets: [],
    tracks: [
      { id: "video", clips: [] },
      { id: "images", clips: [] },
      { id: "audio", clips: [] },
      { id: "captions", clips: [] },
      { id: "text", clips: [] },
    ],
  };
  const studio = {
    format: "9:16",
    clips: [
      {
        id: "v1",
        trackId: "video",
        start: 0,
        duration: 3,
        source: "video.mp4",
      },
      {
        id: "voice",
        trackId: "voice",
        start: 0,
        duration: 4,
        source: "narracao.mp3",
      },
      {
        id: "cap",
        trackId: "captions",
        start: 1,
        duration: 1,
        label: "Legenda",
        props: { text: "Legenda" },
      },
    ],
  };
  const hydrated = hydrateLumieraEditorFromTimelineStudio(
    editor,
    studio,
    "Projeto"
  );
  assert.equal(hydrated.imported, 3);
  assert.equal(
    hydrated.project.tracks.find((track) => track.id === "video").clips.length,
    1
  );
  assert.equal(
    hydrated.project.tracks.find((track) => track.id === "audio").clips.length,
    1
  );
  assert.equal(
    hydrated.project.tracks.find((track) => track.id === "captions").clips
      .length,
    1
  );
  assert.equal(hydrated.project.width, 1080);
  assert.equal(hydrated.project.height, 1920);
  assert.equal(
    hydrateLumieraEditorFromTimelineStudio(hydrated.project, studio, "Projeto")
      .imported,
    0
  );

  const withNewImage = {
    ...studio,
    clips: [
      ...studio.clips,
      {
        id: "img2",
        trackId: "video",
        start: 3,
        duration: 2,
        source: "imagem.jpg",
        props: { type: "image" },
      },
    ],
  };
  const refreshed = hydrateLumieraEditorFromTimelineStudio(
    hydrated.project,
    withNewImage,
    "Projeto"
  );
  assert.equal(refreshed.imported, 1);
  assert.equal(
    refreshed.project.tracks.find((track) => track.id === "images").clips
      .length,
    1
  );
  assert.ok(
    refreshed.project.assets.some((asset) =>
      asset.originalSource.endsWith("/ASSETS/imagem.jpg")
    )
  );
});
