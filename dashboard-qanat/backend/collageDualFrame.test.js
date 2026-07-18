import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDualFrameSpec,
  buildEndFramePrompt,
  buildStartFramePrompt,
  buildVideoPrompt,
  canRunGate3,
  buildGoogleFlowExport,
  classifyAnimationMode,
  splitCollageLines,
  normalizeEditorialCardSpec,
  validateEditorialContinuity,
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
  assert.ok(dual.endFrame.imagePrompt.toLowerCase().includes("end frame"));
  assert.ok(dual.startFrame.imagePrompt.toLowerCase().includes("start frame"));
  assert.ok(dual.motion.videoPrompt.toLowerCase().includes("interpolate"));
  assert.notEqual(dual.startFrame.imagePrompt, dual.endFrame.imagePrompt);
});

test("end frame é composição final; start menciona offscreen", () => {
  const spec = normalizeEditorialCardSpec(sample, 0, sample.line, "geo");
  const end = buildEndFramePrompt(spec);
  const start = buildStartFramePrompt(spec);
  assert.ok(/final/i.test(end));
  assert.ok(/start frame|off-frame/i.test(start));
});

test("motion prompt não pede objetos novos", () => {
  const spec = normalizeEditorialCardSpec(sample, 0, sample.line, "geo");
  const m = buildVideoPrompt(spec);
  assert.ok(/interpolate/i.test(m));
  assert.ok(/stop-motion/i.test(m));
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

test("classifyAnimationMode assemble", () => {
  assert.equal(classifyAnimationMode(sample), "start_end_frames");
});

test("6-line limitation splits correctly", () => {
  const text = "L1\nL2\n\nL3\nL4\nL5\nL6\nL7\nL8";
  const lines = splitCollageLines(text);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], "L1");
  assert.equal(lines[5], "L6");
});

test("Diomedes classification enforces correct metadata", () => {
  const spec = normalizeEditorialCardSpec(
    {},
    0,
    "Ilhas Diomedes travessia",
    "editorial"
  );
  assert.equal(spec.topic, "Ilhas Diomedes");
  assert.equal(spec.domain, "Geografia");
  assert.equal(spec.subdomain, "Geopolítica e fusos horários");
  assert.ok(spec.layers.length >= 3);
});

test("Continuity validator catches errors", () => {
  const invalidSpec = {
    backdrop: { static: false },
    layers: [],
    composition: { safeZonePercent: 2 },
  };
  const errors = validateEditorialContinuity(invalidSpec);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("B0_BACKGROUND")));
  assert.ok(errors.some((e) => e.includes("safeZonePercent")));
});
