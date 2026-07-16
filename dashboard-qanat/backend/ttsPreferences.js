import fs from "fs";
import path from "path";
import { writeJsonAtomicSync } from "./shared/atomicJson.js";

export const TTS_ENGINE_ALIASES = Object.freeze({
  kokoro: "kokoro",
  edge: "edge",
  "edge-tts": "edge",
  chatterbox: "chatterbox",
  "chatterbox-tts": "chatterbox",
  voicebox: "voicebox",
  gptsovits: "gptsovits",
  gpt_sovits: "gptsovits",
  "gpt-sovits": "gptsovits",
  fish: "fish",
  "fish-speech": "fish",
  fish_speech: "fish",
});

export const TTS_ALLOWED_ENGINES = Object.freeze([
  "kokoro",
  "edge",
  "chatterbox",
  "voicebox",
  "gptsovits",
  "fish",
]);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function sanitizeVoice(value) {
  const voice = String(value || "").trim();
  if (
    !voice ||
    voice === "__configure__" ||
    voice.length > 240 ||
    /[\r\n]/.test(voice)
  ) {
    return "";
  }
  return voice;
}

export function normalizeTtsEngine(value, fallback = "") {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return TTS_ENGINE_ALIASES[raw] || fallback;
}

export function readTtsDefaultVoices({ workspaceDir, projectDir = null } = {}) {
  const readDefaults = (dir) => {
    if (!dir) return {};
    const config = readJson(path.join(dir, "config_qanat.json"));
    const defaults = config.tts_default_voices;
    return defaults && typeof defaults === "object" && !Array.isArray(defaults)
      ? defaults
      : {};
  };

  const merged = { ...readDefaults(workspaceDir), ...readDefaults(projectDir) };
  return Object.fromEntries(
    Object.entries(merged)
      .map(([engine, voice]) => [
        normalizeTtsEngine(engine),
        sanitizeVoice(voice),
      ])
      .filter(
        ([engine, voice]) => TTS_ALLOWED_ENGINES.includes(engine) && voice
      )
  );
}

export function resolveTtsVoice({
  workspaceDir,
  projectDir = null,
  engine,
  requestedVoice,
  fallback = "",
} = {}) {
  const explicit = sanitizeVoice(requestedVoice);
  if (explicit) return explicit;
  const normalizedEngine = normalizeTtsEngine(engine);
  const defaults = readTtsDefaultVoices({ workspaceDir, projectDir });
  return defaults[normalizedEngine] || sanitizeVoice(fallback);
}

export function saveTtsDefaultVoice({ workspaceDir, engine, voice } = {}) {
  const normalizedEngine = normalizeTtsEngine(engine);
  const normalizedVoice = sanitizeVoice(voice);
  if (!TTS_ALLOWED_ENGINES.includes(normalizedEngine)) {
    throw new Error("Motor TTS invalido.");
  }
  if (!normalizedVoice) throw new Error("Voz TTS invalida.");
  if (!workspaceDir) throw new Error("Workspace TTS nao informado.");

  const configPath = path.join(workspaceDir, "config_qanat.json");
  const config = readJson(configPath);
  config.tts_default_voices = {
    ...(config.tts_default_voices &&
    typeof config.tts_default_voices === "object"
      ? config.tts_default_voices
      : {}),
    [normalizedEngine]: normalizedVoice,
  };
  writeJsonAtomicSync(configPath, config);
  return {
    engine: normalizedEngine,
    voice: normalizedVoice,
    defaults: config.tts_default_voices,
  };
}

export function applyTtsDefaultsToEngines(engines, defaults = {}) {
  return (Array.isArray(engines) ? engines : []).map((engine) => {
    const savedVoice = sanitizeVoice(defaults[normalizeTtsEngine(engine?.id)]);
    const exists =
      savedVoice &&
      (!engine?.voices?.length ||
        engine.voices.some((voice) => voice.id === savedVoice));
    return exists ? { ...engine, defaultVoice: savedVoice } : engine;
  });
}
