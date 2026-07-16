import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  normalizeTtsEngine,
  readTtsDefaultVoices,
  resolveTtsVoice,
  saveTtsDefaultVoice,
} from "./ttsPreferences.js";

function withWorkspace(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-tts-pref-"));
  try {
    fs.writeFileSync(path.join(dir, "config_qanat.json"), "{}", "utf8");
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("normaliza aliases dos motores TTS", () => {
  assert.equal(normalizeTtsEngine("GPT-SoVITS"), "gptsovits");
  assert.equal(normalizeTtsEngine("fish_speech"), "fish");
  assert.equal(normalizeTtsEngine("desconhecido"), "");
});

test("salva e resolve a voz padrao do workspace", () => {
  withWorkspace((workspaceDir) => {
    saveTtsDefaultVoice({
      workspaceDir,
      engine: "edge-tts",
      voice: "pt-BR-FranciscaNeural",
    });
    assert.equal(
      readTtsDefaultVoices({ workspaceDir }).edge,
      "pt-BR-FranciscaNeural"
    );
    assert.equal(
      resolveTtsVoice({ workspaceDir, engine: "edge", fallback: "fallback" }),
      "pt-BR-FranciscaNeural"
    );
  });
});

test("voz explicita vence projeto, workspace e fallback", () => {
  withWorkspace((workspaceDir) => {
    const projectDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "lumiera-tts-project-")
    );
    try {
      fs.writeFileSync(
        path.join(workspaceDir, "config_qanat.json"),
        JSON.stringify({ tts_default_voices: { kokoro: "workspace" } }),
        "utf8"
      );
      fs.writeFileSync(
        path.join(projectDir, "config_qanat.json"),
        JSON.stringify({ tts_default_voices: { kokoro: "project" } }),
        "utf8"
      );
      assert.equal(
        resolveTtsVoice({ workspaceDir, projectDir, engine: "kokoro" }),
        "project"
      );
      assert.equal(
        resolveTtsVoice({
          workspaceDir,
          projectDir,
          engine: "kokoro",
          requestedVoice: "manual",
        }),
        "manual"
      );
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

test("rejeita sentinela de configuracao como voz", () => {
  withWorkspace((workspaceDir) => {
    assert.throws(
      () =>
        saveTtsDefaultVoice({
          workspaceDir,
          engine: "voicebox",
          voice: "__configure__",
        }),
      /invalida/i
    );
  });
});
