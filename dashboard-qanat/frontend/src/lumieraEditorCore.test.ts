import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLumieraCommand,
  createEmptyLumieraProject,
  framesToSeconds,
  secondsToFrames,
  validateAIEditPlan,
} from "./lumieraEditorCore.ts";

test("converte segundos e frames sem deriva", () => {
  assert.equal(secondsToFrames(1.2, 30), 36);
  assert.equal(framesToSeconds(36, 30), 1.2);
});

test("aplica, audita e reverte um clip motion como clip normal", () => {
  const project = createEmptyLumieraProject("9:16", 30);
  const added = applyLumieraCommand(project, {
    type: "ADD_CLIP",
    clip: {
      id: "motion-1",
      trackId: "motion",
      type: "motion-template",
      startFrame: 30,
      durationInFrames: 120,
      templateId: "odometer-digit-roll",
      props: { opacity: 0.6, forceTransparent: true, title: "Texto editÃ¡vel" },
    },
  });
  assert.equal(added.errors.length, 0);
  assert.equal(added.project.tracks.find((track) => track.id === "motion")?.clips.length, 1);
  assert.equal(added.project.auditLog[0]?.commandType, "ADD_CLIP");
  const motion = added.project.tracks.find((track) => track.id === "motion")?.clips[0];
  assert.equal(motion?.props?.opacity, 0.6);
  assert.equal(motion?.props?.forceTransparent, true);
  assert.equal(motion?.props?.title, "Texto editÃ¡vel");
  const reverted = applyLumieraCommand(added.project, added.inverse, { audit: false });
  assert.equal(reverted.project.tracks.find((track) => track.id === "motion")?.clips.length, 0);
});

test("rejeita plano de IA fora do projeto", () => {
  const project = createEmptyLumieraProject();
  const result = validateAIEditPlan(project, {
    version: "1.0",
    summary: "mover clip inexistente",
    operations: [{ operation: "move_clip", clipId: "missing", startFrame: 10 }],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /inexistente/i);
});

test("aplica formato vertical detectado pelo video", () => {
  const project = createEmptyLumieraProject("16:9");
  const result = applyLumieraCommand(project, {
    type: "SET_FORMAT",
    width: 1080,
    height: 1920,
  });
  assert.equal(result.errors.length, 0);
  assert.equal(result.project.width, 1080);
  assert.equal(result.project.height, 1920);
});

test("apara o inicio e o final do asset preservando o trecho da fonte", () => {
  const project = createEmptyLumieraProject("16:9", 30);
  const added = applyLumieraCommand(project, {
    type: "ADD_CLIP",
    clip: {
      id: "video-1",
      trackId: "video",
      type: "video",
      startFrame: 30,
      durationInFrames: 150,
      sourceStartFrame: 0,
      sourceEndFrame: 150,
    },
  }).project;
  const trimmed = applyLumieraCommand(added, {
    type: "TRIM_CLIP",
    clipId: "video-1",
    startFrame: 60,
    durationInFrames: 90,
    sourceStartFrame: 30,
    sourceEndFrame: 120,
  }).project;
  const clip = trimmed.tracks.find((track) => track.id === "video")?.clips[0];
  assert.equal(clip?.startFrame, 60);
  assert.equal(clip?.durationInFrames, 90);
  assert.equal(clip?.sourceStartFrame, 30);
  assert.equal(clip?.sourceEndFrame, 120);
});
