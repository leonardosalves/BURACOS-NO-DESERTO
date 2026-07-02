/**
 * Narração via GPT-SoVITS (clone few-shot) — API v2 local.
 * https://github.com/RVC-Boss/GPT-SoVITS — python api_v2.py -a 127.0.0.1 -p 9880
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getFfmpegStatus } from "./pythonEnv.js";

export const GPT_SOVITS_DEFAULT_URL = "http://127.0.0.1:9880";
export const GPT_SOVITS_DEFAULT_VOICE = "__configure__";

export const GPT_SOVITS_DEFAULTS = {
  baseUrl: GPT_SOVITS_DEFAULT_URL,
  textLang: "en",
  promptLang: "en",
  textSplitMethod: "cut5",
  speedFactor: 1,
  temperature: 1,
  topP: 1,
  topK: 15,
  repetitionPenalty: 1.35,
  timeoutMs: 900000,
};

const TEXT_LANG_OPTIONS = [
  { id: "en", label: "English (cross-lingual PT-BR)" },
  { id: "zh", label: "中文 Chinese" },
  { id: "ja", label: "日本語 Japanese" },
  { id: "ko", label: "한국어 Korean" },
  { id: "yue", label: "粤语 Cantonese" },
];

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

export function loadGptSovitsConfig({ workspaceDir = null, projectDir = null } = {}) {
  const wsCfg = workspaceDir ? readJsonSafe(path.join(workspaceDir, "config_qanat.json")) : {};
  const projCfg = projectDir ? readJsonSafe(path.join(projectDir, "config_qanat.json")) : {};
  const ws = wsCfg.gpt_sovits || wsCfg.gptSovits || {};
  const proj = projCfg.gpt_sovits || projCfg.gptSovits || {};
  return { gpt_sovits: { ...ws, ...proj } };
}

export function resolveGptSovitsConfig(config = {}) {
  const gs = config.gpt_sovits || config.gptSovits || config;
  const voicesRaw = gs.voices || gs.profiles || [];
  const voices = Array.isArray(voicesRaw)
    ? voicesRaw.map((v, idx) => ({
      id: String(v.id || v.name || `voice_${idx + 1}`),
      label: String(v.label || v.name || v.id || `Voz ${idx + 1}`),
      ref_audio_path: String(v.ref_audio_path || v.refAudioPath || "").trim(),
      prompt_text: String(v.prompt_text || v.promptText || "").trim(),
      prompt_lang: String(v.prompt_lang || v.promptLang || gs.prompt_lang || gs.promptLang || GPT_SOVITS_DEFAULTS.promptLang),
      text_lang: String(v.text_lang || v.textLang || gs.text_lang || gs.textLang || GPT_SOVITS_DEFAULTS.textLang),
    })).filter((v) => v.id)
    : [];

  return {
    baseUrl: String(gs.base_url || gs.baseUrl || GPT_SOVITS_DEFAULTS.baseUrl).replace(/\/$/, ""),
    textLang: String(gs.text_lang || gs.textLang || GPT_SOVITS_DEFAULTS.textLang).toLowerCase(),
    promptLang: String(gs.prompt_lang || gs.promptLang || GPT_SOVITS_DEFAULTS.promptLang).toLowerCase(),
    textSplitMethod: String(gs.text_split_method || gs.textSplitMethod || GPT_SOVITS_DEFAULTS.textSplitMethod),
    speedFactor: Number(gs.speed_factor ?? gs.speedFactor ?? GPT_SOVITS_DEFAULTS.speedFactor),
    temperature: Number(gs.temperature ?? GPT_SOVITS_DEFAULTS.temperature),
    topP: Number(gs.top_p ?? gs.topP ?? GPT_SOVITS_DEFAULTS.topP),
    topK: Number(gs.top_k ?? gs.topK ?? GPT_SOVITS_DEFAULTS.topK),
    repetitionPenalty: Number(gs.repetition_penalty ?? gs.repetitionPenalty ?? GPT_SOVITS_DEFAULTS.repetitionPenalty),
    timeoutMs: Number(gs.timeout_ms ?? gs.timeoutMs ?? GPT_SOVITS_DEFAULTS.timeoutMs),
    defaultVoiceId: String(gs.default_voice_id || gs.defaultVoiceId || voices[0]?.id || ""),
    voices,
  };
}

export function getGptSovitsTextLangOptions() {
  return TEXT_LANG_OPTIONS;
}

function resolveVoice(cfg, voiceId) {
  const voices = cfg.voices || [];
  const needle = String(voiceId || "").trim();
  const hit = voices.find((v) => v.id === needle)
    || voices.find((v) => String(v.label).toLowerCase() === needle.toLowerCase());
  if (hit?.ref_audio_path) return hit;
  if (cfg.defaultVoiceId) {
    const def = voices.find((v) => v.id === cfg.defaultVoiceId);
    if (def?.ref_audio_path) return def;
  }
  return voices.find((v) => v.ref_audio_path) || null;
}

export async function probeGptSovitsServer(config = {}, { timeoutMs = 6000 } = {}) {
  const cfg = resolveGptSovitsConfig(config);
  const errors = [];

  try {
    const res = await fetch(`${cfg.baseUrl}/tts`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.status === 400 || contentType.includes("json")) {
      return {
        ok: true,
        baseUrl: cfg.baseUrl,
        voiceCount: cfg.voices.filter((v) => v.ref_audio_path).length,
        configuredVoices: cfg.voices.length,
        hint: cfg.voices.length
          ? `${cfg.voices.length} voz(es) no config`
          : "API online — configure gpt_sovits.voices no config_qanat.json",
      };
    }
    if (res.ok) {
      return { ok: true, baseUrl: cfg.baseUrl, voiceCount: cfg.voices.length, configuredVoices: cfg.voices.length };
    }
    errors.push(`HTTP ${res.status}`);
  } catch (err) {
    errors.push(err?.message || "offline");
  }

  return {
    ok: false,
    baseUrl: cfg.baseUrl,
    error: `${cfg.baseUrl}: ${errors[0] || "offline"}. Rode: .\\scripts\\start-gpt-sovits.ps1`,
    voiceCount: 0,
    configuredVoices: cfg.voices.length,
  };
}

export function buildGptSovitsVoiceList(probe = {}, config = {}) {
  const cfg = resolveGptSovitsConfig(config);
  const ready = cfg.voices.filter((v) => v.ref_audio_path);

  if (!ready.length) {
    return [{
      id: GPT_SOVITS_DEFAULT_VOICE,
      label: "Configure vozes em config_qanat.json → gpt_sovits.voices",
      group: "config",
    }];
  }

  return ready.map((v) => ({
    id: v.id,
    label: v.label,
    group: "clone",
    refAudioPath: v.ref_audio_path,
    promptText: v.prompt_text,
  }));
}

export function buildGptSovitsStatusHint(probe = {}, voices = []) {
  if (!probe.ok) return probe.error || "Inicie api_v2.py na porta 9880";
  const usable = voices.filter((v) => v.id !== GPT_SOVITS_DEFAULT_VOICE);
  if (!usable.length) {
    return "API online — adicione ref_audio_path em gpt_sovits.voices (caminho no PC do GPT-SoVITS)";
  }
  return `GPT-SoVITS ativo · ${usable.length} voz(es) clone · few-shot`;
}

function runFfmpegToMp3(inputPath, outputPath) {
  const ff = getFfmpegStatus();
  if (!ff.found || !ff.binary) {
    const wavDest = outputPath.replace(/\.mp3$/i, ".wav");
    fs.copyFileSync(inputPath, wavDest);
    throw new Error("ffmpeg ausente — salvo como WAV. Instale ffmpeg para MP3.");
  }
  return new Promise((resolve, reject) => {
    const args = ["-y", "-i", inputPath, "-codec:a", "libmp3lame", "-q:a", "2", outputPath];
    const proc = spawn(ff.binary, args, { windowsHide: true });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(new Error(`ffmpeg falhou (${code}): ${stderr.slice(-400)}`));
    });
    proc.on("error", reject);
  });
}

async function writeWavBufferAsMp3(wavBuffer, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const tmpWav = outputPath.replace(/\.mp3$/i, "_gptsovits_tmp.wav");
  fs.writeFileSync(tmpWav, wavBuffer);
  try {
    await runFfmpegToMp3(tmpWav, outputPath);
    return { format: "mp3", bytes: fs.statSync(outputPath).size };
  } finally {
    try { fs.unlinkSync(tmpWav); } catch { /* ignore */ }
  }
}

function stripTtsMarkers(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\(breath\)|\(sigh\)|\(laughs\)/gi, " ")
    .replace(/<break[^>]*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchGptSovitsAudio(text, {
  voiceId = null,
  config = {},
  onLog = () => {},
  options = {},
} = {}) {
  const cfg = resolveGptSovitsConfig(config);
  const plain = stripTtsMarkers(text);
  if (plain.length < 8) {
    throw new Error("Texto muito curto para GPT-SoVITS.");
  }

  const probe = await probeGptSovitsServer(config);
  if (!probe.ok) {
    throw new Error(`GPT-SoVITS indisponível. ${probe.error || ""}`.trim());
  }

  const voice = resolveVoice(cfg, voiceId);
  if (!voice?.ref_audio_path) {
    throw new Error(
      "Nenhuma voz GPT-SoVITS configurada. Adicione gpt_sovits.voices com ref_audio_path no config_qanat.json.",
    );
  }

  const textLang = String(options.textLang || voice.text_lang || cfg.textLang).toLowerCase();
  const promptLang = String(options.promptLang || voice.prompt_lang || cfg.promptLang).toLowerCase();

  const payload = {
    text: plain.slice(0, 50000),
    text_lang: textLang,
    ref_audio_path: voice.ref_audio_path,
    prompt_lang: promptLang,
    prompt_text: String(options.promptText || voice.prompt_text || "").trim(),
    text_split_method: String(options.textSplitMethod || cfg.textSplitMethod),
    speed_factor: Number(options.speedFactor ?? cfg.speedFactor) || 1,
    temperature: Number(options.temperature ?? cfg.temperature) || 1,
    top_p: Number(options.topP ?? cfg.topP) || 1,
    top_k: Number(options.topK ?? cfg.topK) || 15,
    repetition_penalty: Number(options.repetitionPenalty ?? cfg.repetitionPenalty) || 1.35,
    media_type: "wav",
    streaming_mode: false,
    parallel_infer: true,
  };

  onLog(`[GPT-SoVITS] ${plain.length} chars · voz=${voice.label} · lang=${textLang} · ${cfg.baseUrl}`);

  const res = await fetch(`${cfg.baseUrl}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const msg = errJson?.message || errJson?.Exception || await res.text().catch(() => "");
    throw new Error(`GPT-SoVITS HTTP ${res.status}: ${String(msg).slice(0, 400)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error("GPT-SoVITS retornou áudio vazio.");
  }

  return {
    buffer,
    voiceId: voice.id,
    voiceLabel: voice.label,
    refAudioPath: voice.ref_audio_path,
    chars: plain.length,
    format: "wav",
  };
}

export async function previewGptSovitsVoice({
  voice,
  sampleText,
  narrativeScript = "",
  config = {},
  options = {},
} = {}) {
  const plain = stripTtsMarkers(sampleText)
    || stripTtsMarkers(String(narrativeScript || "").slice(0, 200))
    || "Esta é uma amostra da voz clonada com GPT-SoVITS em português brasileiro.";
  const result = await fetchGptSovitsAudio(plain, {
    voiceId: voice,
    config,
    options,
    onLog: () => {},
  });
  return { ...result, sampleText: plain };
}

export async function synthesizeGptSovitsNarration(text, {
  outputPath,
  voice = null,
  config = {},
  onLog = () => {},
  onProgress = null,
  options = {},
} = {}) {
  if (!outputPath) {
    throw new Error("Caminho de saída ausente para GPT-SoVITS.");
  }

  onProgress?.("gptsovits", "Sintetizando com GPT-SoVITS…", 42);

  const result = await fetchGptSovitsAudio(text, {
    voiceId: voice,
    config,
    onLog,
    options,
  });

  onProgress?.("gptsovits", "Convertendo WAV → MP3…", 88);
  const written = await writeWavBufferAsMp3(result.buffer, outputPath);

  return {
    outputPath,
    voiceId: result.voiceId,
    voiceLabel: result.voiceLabel,
    chars: result.chars,
    format: written.format,
    bytes: written.bytes,
  };
}

export function applyGptSovitsOptionOverrides(config = {}, options = {}) {
  const gs = config.gpt_sovits || {};
  return {
    gpt_sovits: {
      ...gs,
      ...(options.textLang ? { text_lang: String(options.textLang) } : {}),
      ...(options.promptLang ? { prompt_lang: String(options.promptLang) } : {}),
      ...(options.speedFactor != null ? { speed_factor: Number(options.speedFactor) } : {}),
      ...(options.temperature != null ? { temperature: Number(options.temperature) } : {}),
      ...(options.topP != null ? { top_p: Number(options.topP) } : {}),
      ...(options.topK != null ? { top_k: Number(options.topK) } : {}),
      ...(options.repetitionPenalty != null ? { repetition_penalty: Number(options.repetitionPenalty) } : {}),
      ...(options.textSplitMethod ? { text_split_method: String(options.textSplitMethod) } : {}),
    },
  };
}