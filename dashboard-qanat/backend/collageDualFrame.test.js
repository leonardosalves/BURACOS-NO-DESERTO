import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDualFrameSpec,
  buildEndFrameImagePrompt,
  buildStartFrameImagePrompt,
  buildMotionPrompt,
  canRunGate3,
  buildGoogleFlowExport,
  classifyAnimationMode,
} from "./collageBroll.js";

const sample = {
  id: "c01",
  line: "Este mapa faz a Groenlândia parecer quase do tamanho da África.",
  mode: "geo",
  visual_proposition:
    "Mapa de papel com silhuetas da Groenlândia e da África lado a lado",
  core_meaning: "distorção de tamanho cartográfico",
  key_objects: ["Groenlândia", "África", "mapa de papel"],
  assembly_order: ["1 fundo", "2 Groenlândia", "3 África"],
  background_color: { name: "ocean ink", hex: "#0B3D5C" },
  accent_colors: ["#E8D5A3"],
  lineAnalysis: {
    requiredVisualAnchors: ["mapa", "Groenlândia", "África"],
  },
};

test("buildDualFrameSpec cria start/end/motion distintos", () => {
  const dual = buildDualFrameSpec(sample);
  assert.equal(dual.animationMode, "start_end_frames");
  assert.ok(dual.endFrame.imagePrompt.includes("END FRAME"));
  assert.ok(dual.startFrame.imagePrompt.includes("START FRAME"));
  assert.ok(dual.startFrame.fromEndFrame);
  assert.ok(dual.motion.videoPrompt.includes("start and end frames"));
  assert.ok(dual.motion.videoPrompt.includes("No morphing"));
  assert.notEqual(dual.startFrame.imagePrompt, dual.endFrame.imagePrompt);
  assert.ok(dual.frameConsistency.lockedElements.length >= 3);
  assert.ok(dual.frameConsistency.movingElements.includes("Groenlândia"));
});

test("end frame é composição final; start menciona offscreen", () => {
  const end = buildEndFrameImagePrompt(sample);
  const start = buildStartFrameImagePrompt(sample);
  assert.ok(/FINAL completed|final frame/i.test(end));
  assert.ok(/outside|empty|START/i.test(start));
});

test("motion prompt não pede objetos novos", () => {
  const m = buildMotionPrompt(sample);
  assert.ok(/No morphing/i.test(m));
  assert.ok(/No new objects/i.test(m));
  assert.ok(/End exactly on the supplied end frame/i.test(m));
});

test("canRunGate3 bloqueia sem frames aprovados", () => {
  assert.equal(canRunGate3(sample).ok, false);
  const withEnd = {
    ...sample,
    still_approved: true,
    still_url: "http://x/end.png",
    endFrame: { approved: true, imageUrl: "http://x/end.png" },
  };
  assert.equal(canRunGate3(withEnd).ok, false);
  const both = {
    ...withEnd,
    startFrame: { approved: true, imageUrl: "http://x/start.png" },
  };
  assert.equal(canRunGate3(both).ok, true);
});

test("export Google Flow tem start/end/motion", () => {
  const item = {
    ...sample,
    endFrame: {
      approved: true,
      imageUrl: "/api/end.png",
      imagePrompt: "end",
    },
    startFrame: {
      approved: true,
      imageUrl: "/api/start.png",
      imagePrompt: "start",
    },
    motion: { videoPrompt: "move pieces" },
  };
  const pack = buildGoogleFlowExport(item, "sess1");
  assert.equal(pack.sceneId, "c01");
  assert.equal(pack.animationMode, "start_end_frames");
  assert.ok(pack.startFrame.approved);
  assert.ok(pack.endFrame.approved);
  assert.ok(pack.motionPrompt);
});

test("classifyAnimationMode assemble", () => {
  assert.equal(classifyAnimationMode(sample), "start_end_frames");
});
