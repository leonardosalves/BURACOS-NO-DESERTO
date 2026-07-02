/**
 * Lumiera Dub — dublagem de vídeo (ShortGPT-inspired pipeline).
 * Whisper → traduzir → TTS por bloco → mux MP4 com BGM original.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv, getFfmpegStatus } from "./pythonEnv.js";
import { runPythonScript } from "./workflowTools.js";
import { fetchFishSpeechAudio, loadFishSpeechConfig, applyFishOptionOverrides } from "./fishSpeechTts.js";
import { loadVoiceboxConfig, synthesizeVoiceboxNarration } from "./voiceboxTts.js";
import { loadGptSovitsConfig, synthesizeGptSovitsNarration } from "./gptSovitsTts.js";
import { synthesizeKokoroNarration, KOKORO_DEFAULT_VOICE } from "./kokoroTts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_SCRIPTS = path.resolve(__dirname, "..", "..", "scripts");

export const DUB_TARGET_LANGUAGES = [
  { id: "pt", label: "Português (pt)" },
  { id: "en", label: "English (en)" },
  { id: "es", label: "Español (es)" },
  { id: "fr", label: "Français (fr)" },
  { id: "de", label: "Deutsch (de)" },
  { id: "it", label: "Italiano (it)" },
];

const LANGUAGE_NAMES = {
  pt: "português brasileiro",
  en: "English",
  es: "español",
  fr: "français",
  de: "Deutsch",
  it: "italiano",
};

export function getSpeechBlocksFromWhisper(whisperResult, silenceTime = 0.8) {
  const segments = whisperResult?.segments || [];
  const blocks = [];
  let st = 0;
  let et = 0;
  let txt = "";

  for (const seg of segments) {
    const start = Number(seg.start) || 0;
    const end = Number(seg.end) || start;
    const text = String(seg.text || "").trim();
    if (!text) continue;

    if (start - et > silenceTime && txt) {
      blocks.push({ start: st, end: et, text: txt.trim() });
      st = start;
      et = end;
      txt = text;
    } else if (!txt) {
      st = start;
      et = end;
      txt = text;
    } else {
      et = end;
      txt = `${txt} ${text}`.trim();
    }
  }
  if (txt) blocks.push({ start: st, end: et, text: txt.trim() });
  return blocks;
}

function listMp4InDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.(mp4|mov|webm|mkv)$/i.test(f))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

export function listDubSourceVideos(projDir) {
  const sources = [];
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  for (const item of listMp4InDir(outputDir)) {
    sources.push({
      id: `output:${item.name}`,
      label: `OUTPUT — ${item.name}`,
      path: item.path,
      relative: `OUTPUT/qanat_persa_video_final/${item.name}`,
    });
  }
  const rootMp4 = listMp4InDir(projDir).filter((f) => !f.path.includes("DUB_WORK"));
  for (const item of rootMp4.slice(0, 5)) {
    sources.push({
      id: `project:${item.name}`,
      label: item.name,
      path: item.path,
      relative: item.name,
    });
  }
  return sources;
}

export function resolveDubSourceVideo(projDir, sourceId = "") {
  const sources = listDubSourceVideos(projDir);
  if (sourceId) {
    const hit = sources.find((s) => s.id === sourceId);
    if (hit && fs.existsSync(hit.path)) return hit;
  }
  if (sources[0]) return sources[0];
  throw new Error("Nenhum MP4 encontrado no projeto. Renderize em OUTPUT primeiro ou informe sourceId.");
}

function runFfmpeg(args, onLog = () => {}) {
  const ff = getFfmpegStatus();
  if (!ff.binary) throw new Error("ffmpeg não encontrado no PATH.");
  return new Promise((resolve, reject) => {
    const child = spawn(ff.binary, args, { shell: false, env: buildPythonSpawnEnv() });
    let stderr = "";
    child.stderr.on("data", (d) => {
      const line = d.toString();
      stderr += line;
      if (line.trim()) onLog(`[ffmpeg] ${line.trim()}`);
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(stderr.slice(-600) || `ffmpeg exit ${code}`));
    });
  });
}

async function probeMediaDuration(filePath) {
  const ff = getFfmpegStatus();
  if (!ff.binary) throw new Error("ffmpeg não encontrado no PATH.");
  const ffprobe = ff.binary.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  return new Promise((resolve, reject) => {
    const child = spawn(ffprobe, [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", filePath,
    ], { shell: false });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error("ffprobe falhou"));
      else resolve(Number(out.trim()) || 0);
    });
  });
}

async function speedUpAudioToDuration(inputPath, outputPath, targetSeconds, onLog = () => {}) {
  const dur = await probeMediaDuration(inputPath);
  if (!dur || !targetSeconds || targetSeconds <= 0.1) {
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }
  let ratio = dur / targetSeconds;
  if (ratio < 0.85) ratio = 0.85;
  if (ratio > 1.35) ratio = 1.35;
  if (Math.abs(ratio - 1) < 0.03) {
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }
  const filters = [];
  let remaining = ratio;
  while (remaining > 2.0) {
    filters.push("atempo=2.0");
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  await runFfmpeg(["-y", "-i", inputPath, "-filter:a", filters.join(","), outputPath], onLog);
  return outputPath;
}

async function transcribeForDub(audioOrVideoPath, {
  pythonPath,
  language = null,
  modelSize = "base",
  workDir,
  onLog = () => {},
} = {}) {
  const script = path.join(WORKSPACE_SCRIPTS, "lumiera_dub_transcribe.py");
  if (!fs.existsSync(script)) throw new Error(`Script ausente: ${script}`);

  const args = [audioOrVideoPath];
  if (language && language !== "auto") args.push(language);
  else args.push("auto");
  args.push(modelSize);

  onLog("[Dub] Transcrevendo com Whisper...");
  const { stdout } = await runPythonScript(pythonPath, workDir, script, args);
  const line = stdout.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("{"));
  if (!line) throw new Error("Whisper não retornou JSON.");
  const whisper = JSON.parse(line);
  const blocks = getSpeechBlocksFromWhisper(whisper);
  return {
    whisper,
    blocks,
    detectedLanguage: whisper.language || null,
  };
}

async function translateDubBlocks(blocks, targetLang, { callGemini, workspaceDir, projDir, onLog = () => {} }) {
  if (!blocks.length) return [];
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const payload = blocks.map((b, i) => ({ i, text: b.text }));
  const prompt = `Traduza cada bloco de narração para ${targetName}.
Mantenha tom documental natural, sem explicações extras.
Retorne APENAS JSON válido: {"translations":["...", "..."]} na mesma ordem.
Blocos:
${JSON.stringify(payload, null, 2)}`;

  onLog(`[Dub] Traduzindo ${blocks.length} bloco(s) para ${targetLang}...`);
  const raw = await callGemini(prompt, { temperature: 0.25, projectDir: projDir, workspaceDir });
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Tradução: resposta JSON inválida.");
  const parsed = JSON.parse(match[0]);
  const translations = parsed.translations || parsed.blocks || [];
  if (!Array.isArray(translations) || translations.length !== blocks.length) {
    throw new Error("Tradução: contagem de blocos não confere.");
  }
  return blocks.map((b, idx) => ({
    ...b,
    translatedText: String(translations[idx] || "").trim() || b.text,
  }));
}

async function synthesizeDubBlock(text, {
  engine,
  voice,
  workDir,
  index,
  slotDuration,
  workspaceDir,
  projDir,
  fishOptions = {},
  onLog = () => {},
}) {
  const rawOut = path.join(workDir, `block_${index}_raw.wav`);
  const finalOut = path.join(workDir, `block_${index}.wav`);
  const plain = String(text || "").trim();
  if (plain.length < 2) throw new Error(`Bloco ${index}: texto vazio.`);

  if (engine === "fish") {
    const fishConfig = applyFishOptionOverrides(
      loadFishSpeechConfig({ workspaceDir, projectDir: projDir }),
      fishOptions,
    );
    const result = await fetchFishSpeechAudio(plain, {
      referenceId: voice,
      config: fishConfig,
      onLog,
    });
    fs.writeFileSync(rawOut.replace(/\.wav$/, ".mp3"), result.buffer);
    await runFfmpeg(["-y", "-i", rawOut.replace(/\.wav$/, ".mp3"), "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", rawOut], onLog);
  } else if (engine === "voicebox") {
    const vbConfig = loadVoiceboxConfig({ workspaceDir, projectDir: projDir });
    const tmpMp3 = path.join(workDir, `block_${index}_vb.mp3`);
    await synthesizeVoiceboxNarration(plain, {
      voice,
      outputPath: tmpMp3,
      config: vbConfig,
      onLog,
    });
    await runFfmpeg(["-y", "-i", tmpMp3, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", rawOut], onLog);
  } else if (engine === "gptsovits" || engine === "gpt_sovits") {
    const gsConfig = loadGptSovitsConfig({ workspaceDir, projectDir: projDir });
    const tmpMp3 = path.join(workDir, `block_${index}_gs.mp3`);
    await synthesizeGptSovitsNarration(plain, {
      voice,
      outputPath: tmpMp3,
      config: gsConfig,
      onLog,
    });
    await runFfmpeg(["-y", "-i", tmpMp3, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", rawOut], onLog);
  } else if (engine === "kokoro") {
    const tmpMp3 = path.join(workDir, `block_${index}_kokoro.mp3`);
    await synthesizeKokoroNarration(plain, {
      voice: voice || KOKORO_DEFAULT_VOICE,
      outputPath: tmpMp3,
      workDir,
      onLog,
    });
    await runFfmpeg(["-y", "-i", tmpMp3, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", rawOut], onLog);
  } else if (engine === "edge") {
    let EdgeTTS;
    try {
      ({ EdgeTTS } = await import("edge-tts-universal"));
    } catch {
      throw new Error("edge-tts-universal não instalado no backend.");
    }
    const edgeVoice = voice || "pt-BR-AntonioNeural";
    const tts = new EdgeTTS(plain, edgeVoice, { rate: "+0%", pitch: "+0Hz" });
    const result = await tts.synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    const tmpMp3 = path.join(workDir, `block_${index}_edge.mp3`);
    fs.writeFileSync(tmpMp3, buffer);
    await runFfmpeg(["-y", "-i", tmpMp3, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", rawOut], onLog);
  } else {
    throw new Error(`Motor TTS não suportado no dub: ${engine}`);
  }

  await speedUpAudioToDuration(rawOut, finalOut, slotDuration - 0.05, onLog);
  return finalOut;
}

async function renderDubbedVideo({ videoPath, blocks, outputPath, workDir, bgmVolume = 0.35, onLog = () => {} }) {
  const script = path.join(WORKSPACE_SCRIPTS, "lumiera_dub_render.py");
  const cfgPath = path.join(workDir, "dub_render_config.json");
  const renderBlocks = blocks.map((b) => ({
    start: b.start,
    audio: b.audioPath,
  }));
  fs.writeFileSync(cfgPath, JSON.stringify({
    video: videoPath,
    blocks: renderBlocks,
    output: outputPath,
    work_dir: workDir,
    bgm_volume: bgmVolume,
  }, null, 2), "utf8");

  onLog("[Dub] Muxando vídeo + voz dublada + BGM...");
  const python = process.env.PYTHON_PATH || "python";
  const { stdout } = await runPythonScript(python, workDir, script, [cfgPath]);
  const line = stdout.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("{"));
  if (!line) throw new Error("Render dub sem resposta JSON.");
  const parsed = JSON.parse(line);
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function analyzeDubProject(projDir, {
  sourceId,
  pythonPath,
  language = "auto",
  onLog = () => {},
} = {}) {
  const source = resolveDubSourceVideo(projDir, sourceId);
  const workDir = path.join(projDir, "DUB_WORK", "analyze");
  fs.mkdirSync(workDir, { recursive: true });

  const { whisper, blocks, detectedLanguage } = await transcribeForDub(source.path, {
    pythonPath,
    language: language === "auto" ? null : language,
    workDir,
    onLog,
  });

  const manifest = {
    analyzedAt: new Date().toISOString(),
    source: source,
    detectedLanguage,
    blockCount: blocks.length,
    blocks: blocks.map((b) => ({ start: b.start, end: b.end, text: b.text })),
  };
  fs.writeFileSync(path.join(projDir, "DUB_WORK", "dub_analysis.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(workDir, "whisper_raw.json"), JSON.stringify(whisper, null, 2), "utf8");

  return manifest;
}

export async function runLumieraDub(projDir, options = {}, deps = {}) {
  const {
    sourceId,
    targetLanguage = "en",
    sourceLanguage = "auto",
    engine = "fish",
    voice = null,
    skipTranslate = false,
    bgmVolume = 0.35,
    fishOptions = {},
    onLog = () => {},
  } = options;

  const { pythonPath, workspaceDir, callGemini } = deps;
  if (!pythonPath) throw new Error("PYTHON_PATH não configurado.");
  if (!callGemini && !skipTranslate) throw new Error("Gemini indisponível para tradução.");

  const source = resolveDubSourceVideo(projDir, sourceId);
  const workDir = path.join(projDir, "DUB_WORK", `run_${targetLanguage}_${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  onLog(`[Dub] Fonte: ${source.label}`);
  let blocks;
  let detectedLanguage = sourceLanguage;

  const cachedAnalysis = path.join(projDir, "DUB_WORK", "dub_analysis.json");
  if (fs.existsSync(cachedAnalysis) && !options.forceRetranscribe) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachedAnalysis, "utf8"));
      if (cached.source?.path === source.path && cached.blocks?.length) {
        blocks = cached.blocks;
        detectedLanguage = cached.detectedLanguage || detectedLanguage;
        onLog(`[Dub] Reutilizando análise (${blocks.length} blocos).`);
      }
    } catch {
      /* re-transcribe */
    }
  }

  if (!blocks?.length) {
    const analysis = await transcribeForDub(source.path, {
      pythonPath,
      language: sourceLanguage === "auto" ? null : sourceLanguage,
      workDir,
      onLog,
    });
    blocks = analysis.blocks;
    detectedLanguage = analysis.detectedLanguage;
  }

  if (!blocks.length) throw new Error("Nenhum bloco de fala detectado no vídeo.");

  let workingBlocks = blocks.map((b) => ({ ...b }));
  const needTranslate = !skipTranslate
    && targetLanguage
    && detectedLanguage !== targetLanguage
    && String(detectedLanguage || "").slice(0, 2) !== String(targetLanguage).slice(0, 2);

  if (needTranslate) {
    workingBlocks = await translateDubBlocks(workingBlocks, targetLanguage, {
      callGemini,
      workspaceDir,
      projDir,
      onLog,
    });
  } else {
    workingBlocks = workingBlocks.map((b) => ({ ...b, translatedText: b.text }));
  }

  const dubbedBlocks = [];
  for (let i = 0; i < workingBlocks.length; i += 1) {
    const b = workingBlocks[i];
    const slot = Math.max(0.5, (b.end || b.start + 1) - b.start);
    const text = b.translatedText || b.text;
    onLog(`[Dub] TTS bloco ${i + 1}/${workingBlocks.length} (${slot.toFixed(1)}s)...`);
    const audioPath = await synthesizeDubBlock(text, {
      engine,
      voice,
      workDir,
      index: i,
      slotDuration: slot,
      workspaceDir,
      projDir,
      fishOptions,
      onLog,
    });
    dubbedBlocks.push({ start: b.start, end: b.end, text, translatedText: text, audioPath });
  }

  const outName = `lumiera_dub_${targetLanguage}_${Date.now()}.mp4`;
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outName);

  const renderResult = await renderDubbedVideo({
    videoPath: source.path,
    blocks: dubbedBlocks,
    outputPath,
    workDir,
    bgmVolume,
    onLog,
  });

  const manifest = {
    completedAt: new Date().toISOString(),
    source,
    targetLanguage,
    detectedLanguage,
    engine,
    voice,
    blockCount: dubbedBlocks.length,
    output: {
      path: outputPath,
      relative: `OUTPUT/qanat_persa_video_final/${outName}`,
      name: outName,
    },
    blocks: dubbedBlocks.map(({ start, end, text, translatedText }) => ({ start, end, text, translatedText })),
  };
  fs.writeFileSync(path.join(projDir, "DUB_WORK", "dub_last_run.json"), JSON.stringify(manifest, null, 2), "utf8");

  onLog(`[Dub] Concluído: ${outName}`);
  return { ...manifest, duration: renderResult.duration };
}