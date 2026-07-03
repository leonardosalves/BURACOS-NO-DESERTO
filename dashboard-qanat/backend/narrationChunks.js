/**
 * Narração por trechos — planejamento IA, TTS por chunk, montagem e timings.
 * Substitui (opcionalmente) o fluxo de 1 MP3 master + Whisper para alinhar blocos/cenas.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { buildPythonSpawnEnv, getFfmpegStatus } from "./pythonEnv.js";
import { convertCinematicMarkersForTts, stripTtsMarkersForPlainText } from "./videoProEnhancements.js";
import { synthesizeKokoroNarration, KOKORO_DEFAULT_VOICE, KOKORO_DEFAULT_SPEED } from "./kokoroTts.js";
import { fetchFishSpeechAudio, loadFishSpeechConfig, applyFishOptionOverrides } from "./fishSpeechTts.js";
import { loadVoiceboxConfig, synthesizeVoiceboxNarration } from "./voiceboxTts.js";
import { loadGptSovitsConfig, synthesizeGptSovitsNarration } from "./gptSovitsTts.js";
import {
  loadChatterboxConfig,
  synthesizeChatterboxNarration,
  CHATTERBOX_DEFAULT_VOICE,
} from "./chatterboxTts.js";


export const NARRATION_CHUNKS_DIR = "narration_chunks";
export const NARRATION_MASTER_FILENAME = "narracao_mestra_premium.mp3";
export const NARRATION_MODE_CHUNKED = "chunked";
export const NARRATION_MODE_MASTER = "master";

const DEFAULT_PAUSE_BETWEEN_SCENES_MS = 350;
const DEFAULT_PAUSE_BETWEEN_BLOCKS_MS = 750;

function clampPauseMs(value, fallback = 400) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(8000, Math.round(n)));
}

function normalizeVoiceRef(raw = {}, fallback = {}) {
  const engine = String(raw.engine || raw.platform || fallback.engine || "kokoro").toLowerCase();
  return {
    engine: engine === "gpt-sovits" ? "gptsovits" : engine,
    voice: String(raw.voice || raw.voice_id || fallback.voice || KOKORO_DEFAULT_VOICE),
    speed: Number.isFinite(Number(raw.speed)) ? Number(raw.speed) : (fallback.speed ?? KOKORO_DEFAULT_SPEED),
    rate: raw.rate || fallback.rate || "+0%",
    pitch: raw.pitch || fallback.pitch || "+0Hz",
  };
}

export function chunkAudioRelativePath(chunkId) {
  const safe = String(chunkId || "chunk").replace(/[^\w.-]+/g, "_");
  return path.join(NARRATION_CHUNKS_DIR, `${safe}.mp3`).replace(/\\/g, "/");
}

/** Trechos heurísticos a partir de visual_prompts + block_phrases. */
export function buildHeuristicNarrationChunks({
  storyboard = {},
  config = {},
  defaultVoice = {},
} = {}) {
  const scenes = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : (Array.isArray(storyboard.technical_config?.block_phrases)
      ? storyboard.technical_config.block_phrases
      : []);
  const phraseByBlock = new Map(
    blockPhrases.map((bp) => [Number(bp.block) || 0, String(bp.phrase || "").trim()]),
  );
  const voice = normalizeVoiceRef(defaultVoice);
  const chunks = [];
  let prevBlock = null;

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const block = Number(scene.block) || 1;
    const sceneRef = String(scene.scene || scene.scene_ref || `${block}.${i + 1}`);
    const text = String(scene.narration_text || "").trim();
    if (!text) continue;

    const pauseAfter = prevBlock != null && block !== prevBlock
      ? DEFAULT_PAUSE_BETWEEN_BLOCKS_MS
      : DEFAULT_PAUSE_BETWEEN_SCENES_MS;

    chunks.push({
      id: `chunk-${String(chunks.length + 1).padStart(2, "0")}`,
      block,
      scene_ref: sceneRef,
      text,
      text_tagged: text,
      pause_after_ms: i === scenes.length - 1 ? 0 : pauseAfter,
      pause_reason: block !== prevBlock && prevBlock != null ? "virada de bloco" : "respiro entre cenas",
      block_phrase: phraseByBlock.get(block) || "",
      voice: { ...voice },
      audio_file: null,
      duration_s: null,
      start_s: null,
      end_s: null,
      status: "planned",
    });
    prevBlock = block;
  }

  return normalizeNarrationChunkPlan({ chunks, default_voice: voice }, { storyboard, config });
}

export function buildNarrationChunkPlanPrompt({
  narrativeScript = "",
  narrativeScriptTagged = "",
  visualPrompts = [],
  blockPhrases = [],
  niche = "Geral",
} = {}) {
  const sceneLines = (visualPrompts || []).map((vp) => ({
    scene: vp.scene,
    block: vp.block,
    narration_text: vp.narration_text,
    duration: vp.duration,
  }));

  return `Você é diretor de áudio documental no Lumiera. Divida a narração em TRECHOS independentes (chunks) alinhados a blocos/cenas.

Nicho: ${niche} — tom documental natural, ritmo de respiração entre ideias.

NARRAÇÃO COMPLETA:
${String(narrativeScript || "").trim().slice(0, 12000)}

CENAS (visual_prompts — use como mapa principal):
${JSON.stringify(sceneLines, null, 2)}

ÂNCORAS DE BLOCO (block_phrases):
${JSON.stringify(blockPhrases || [], null, 2)}

REGRAS:
- Um trecho = uma cena OU um bloco inteiro se a cena for muito curta (< 8 palavras); prefira 1 trecho por cena quando houver narration_text.
- "text" = exatamente o que será falado em PT-BR (pode condensar levemente, sem mudar o sentido).
- "text_tagged" = mesmo texto com tags TTS moderadas: [pausa], (breath). Use [ênfase] só imediatamente antes da palavra (ex.: "[ênfase] mil" — nunca repita a palavra depois da tag).
- "pause_after_ms": silêncio APÓS o trecho antes do próximo (0–3000). Virada de bloco: 600–1200ms; mesma cena/bloco: 200–500ms; clímax→resolução: até 1500ms.
- "pause_reason": frase curta explicando a pausa.
- Cobrir 100% da narração sem repetir trechos.
- NÃO inclua voz/engine — só texto e pausas.

Retorne APENAS JSON:
{
  "chunks": [
    {
      "id": "chunk-01",
      "block": 1,
      "scene_ref": "1.1",
      "text": "...",
      "text_tagged": "...",
      "pause_after_ms": 600,
      "pause_reason": "..."
    }
  ]
}`;
}

export function parseAiNarrationChunkResponse(parsed = {}) {
  const raw = parsed.chunks || parsed.narration_chunks || parsed.segments || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((c, idx) => ({
    id: String(c.id || `chunk-${String(idx + 1).padStart(2, "0")}`),
    block: Number(c.block) || 1,
    scene_ref: String(c.scene_ref || c.scene || c.sceneRef || `${Number(c.block) || 1}.${idx + 1}`),
    text: String(c.text || "").trim(),
    text_tagged: String(c.text_tagged || c.textTagged || c.text || "").trim(),
    pause_after_ms: clampPauseMs(c.pause_after_ms ?? c.pauseAfterMs, DEFAULT_PAUSE_BETWEEN_SCENES_MS),
    pause_reason: String(c.pause_reason || c.pauseReason || "").trim() || undefined,
    voice: c.voice || null,
    audio_file: null,
    duration_s: null,
    start_s: null,
    end_s: null,
    status: "planned",
  })).filter((c) => c.text.length >= 2);
}

export function computeChunkTimeline(chunks = []) {
  let cursor = 0;
  return (chunks || []).map((chunk, idx, arr) => {
    const duration = Number(chunk.duration_s) || 0;
    const pauseMs = idx < arr.length - 1 ? clampPauseMs(chunk.pause_after_ms, 0) : 0;
    if (duration <= 0) {
      return { ...chunk, start_s: null, end_s: null, pause_after_ms: pauseMs };
    }
    const start = cursor;
    const end = start + duration;
    cursor = end + pauseMs / 1000;
    return {
      ...chunk,
      start_s: Number(start.toFixed(3)),
      end_s: Number(end.toFixed(3)),
      pause_after_ms: pauseMs,
    };
  });
}

export function normalizeNarrationChunkPlan(plan = {}, { storyboard = {}, config = {} } = {}) {
  const defaultVoice = normalizeVoiceRef(
    plan.default_voice || config.narration_default_voice || {},
    { engine: "kokoro", voice: KOKORO_DEFAULT_VOICE, speed: KOKORO_DEFAULT_SPEED },
  );
  let chunks = Array.isArray(plan.chunks) ? plan.chunks : [];
  chunks = chunks.map((c, idx) => {
    const voice = normalizeVoiceRef(c.voice || {}, defaultVoice);
    const id = String(c.id || `chunk-${String(idx + 1).padStart(2, "0")}`);
    return {
      id,
      block: Number(c.block) || 1,
      scene_ref: String(c.scene_ref || c.scene || `${Number(c.block) || 1}.${idx + 1}`),
      text: String(c.text || "").trim(),
      text_tagged: String(c.text_tagged || c.text || "").trim(),
      pause_after_ms: clampPauseMs(c.pause_after_ms, idx === chunks.length - 1 ? 0 : DEFAULT_PAUSE_BETWEEN_SCENES_MS),
      pause_reason: c.pause_reason || undefined,
      block_phrase: c.block_phrase || undefined,
      voice,
      audio_file: c.audio_file || chunkAudioRelativePath(id),
      duration_s: Number.isFinite(Number(c.duration_s)) ? Number(c.duration_s) : null,
      start_s: Number.isFinite(Number(c.start_s)) ? Number(c.start_s) : null,
      end_s: Number.isFinite(Number(c.end_s)) ? Number(c.end_s) : null,
      status: c.status || (c.audio_file ? "generated" : "planned"),
    };
  }).filter((c) => c.text.length >= 2);

  const withAudio = chunks.filter((c) => Number(c.duration_s) > 0);
  const timed = withAudio.length === chunks.length && withAudio.length > 0
    ? computeChunkTimeline(chunks)
    : chunks;

  const totalDuration = timed.length
    ? (timed[timed.length - 1].end_s || 0)
      + (timed[timed.length - 1].pause_after_ms || 0) / 1000
    : 0;

  return {
    version: 1,
    mode: NARRATION_MODE_CHUNKED,
    planned_at: plan.planned_at || new Date().toISOString(),
    default_voice: defaultVoice,
    chunk_count: timed.length,
    total_duration: Number(totalDuration.toFixed(3)) || null,
    chunks: timed,
    source: plan.source || "normalized",
    narrative_script_snapshot: String(storyboard.narrative_script || "").slice(0, 500) || undefined,
  };
}

export function buildBlockTimingsFromChunks(chunks = []) {
  const byBlock = new Map();
  for (const chunk of chunks) {
    const block = Number(chunk.block) || 1;
    const start = Number(chunk.start_s) || 0;
    const end = Number(chunk.end_s) || start;
    const pause = Number(chunk.pause_after_ms) || 0;
    const blockEnd = end + pause / 1000;
    if (!byBlock.has(block)) {
      byBlock.set(block, { block, start, end: blockEnd });
    } else {
      const entry = byBlock.get(block);
      entry.end = Math.max(entry.end, blockEnd);
    }
  }
  const blocks = [...byBlock.values()].sort((a, b) => a.block - b.block);
  const starts = blocks.map((b) => Number(b.start.toFixed(3)));
  const durations = blocks.map((b) => Number(Math.max(0.1, b.end - b.start).toFixed(3)));
  const total = durations.reduce((sum, d, i) => Math.max(sum, starts[i] + d), 0);
  return {
    starts,
    durations,
    total_duration: Number(total.toFixed(3)),
    source: "narration_chunks",
  };
}

export function buildWordTranscriptsFromChunks(chunks = []) {
  return (chunks || []).map((chunk, idx) => {
    const start = Number(chunk.start_s) || 0;
    const duration = Math.max(0.05, (Number(chunk.end_s) || start) - start);
    const end = start + duration;
    const plain = stripTtsMarkersForPlainText(chunk.text || chunk.text_tagged || "");
    const words = plain.split(/\s+/).filter(Boolean);
    const weights = words.map((w) => Math.max(1, w.replace(/[^\wáéíóúâêîôûãõç]/gi, "").length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || words.length || 1;
    // Tempos relativos ao start_time do segmento (mesmo formato do align_transcripts.py / Whisper).
    let relT = 0;
    const wordEntries = words.map((word, wi) => {
      const wordDur = duration * (weights[wi] / totalWeight);
      const wStart = relT;
      const wEnd = relT + wordDur;
      relT = wEnd;
      return { word: ` ${word}`, start: Number(wStart.toFixed(3)), end: Number(wEnd.toFixed(3)) };
    });
    return {
      index: idx + 1,
      block: Number(chunk.block) || 1,
      scene_ref: chunk.scene_ref,
      chunk_id: chunk.id,
      filename: path.basename(chunk.audio_file || `${chunk.id}.mp3`),
      start_time: Number(start.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      end_time: Number(end.toFixed(3)),
      words: wordEntries,
      text: ` ${plain}`,
    };
  });
}

export function buildNarrationChunkPlan({
  aiChunks = [],
  storyboard = {},
  config = {},
  defaultVoice = {},
} = {}) {
  if (aiChunks.length > 0) {
    return normalizeNarrationChunkPlan({
      chunks: aiChunks,
      default_voice: defaultVoice,
      source: "ai",
      planned_at: new Date().toISOString(),
    }, { storyboard, config });
  }
  return buildHeuristicNarrationChunks({ storyboard, config, defaultVoice });
}

export function formatNarrationChunkPlanLog(plan = {}) {
  const lines = [`Plano de narração: ${plan.chunk_count || 0} trecho(s).`];
  for (const c of plan.chunks || []) {
    lines.push(
      `  ${c.id} bloco ${c.block} · ${c.scene_ref} · pausa ${c.pause_after_ms}ms`
      + ` · ${c.voice?.engine}/${c.voice?.voice}`
      + (c.duration_s ? ` · ${c.duration_s.toFixed(1)}s` : ""),
    );
  }
  if (plan.total_duration) lines.push(`Duração total estimada: ${plan.total_duration.toFixed(1)}s`);
  return lines;
}

function runFfmpeg(args, onLog = () => {}) {
  const ff = getFfmpegStatus();
  if (!ff.binary) throw new Error("ffmpeg não encontrado no PATH.");
  return new Promise((resolve, reject) => {
    const child = spawn(ff.binary, args, { shell: false, env: buildPythonSpawnEnv() });
    let stderr = "";
    child.stderr.on("data", (d) => {
      const msg = d.toString();
      stderr += msg;
      onLog(msg.trim());
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(stderr.slice(-800) || `ffmpeg exit ${code}`));
    });
  });
}

export async function probeAudioDuration(filePath) {
  const ff = getFfmpegStatus();
  if (!ff.binary || !filePath || !fs.existsSync(filePath)) return 0;
  const ffprobe = ff.binary.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  return new Promise((resolve) => {
    const child = spawn(ffprobe, [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", filePath,
    ], { shell: false });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("close", () => {
      const dur = parseFloat(out.trim());
      resolve(Number.isFinite(dur) ? dur : 0);
    });
    child.on("error", () => resolve(0));
  });
}

async function generateSilenceMp3(outPath, durationSec) {
  const dur = Math.max(0.05, Number(durationSec) || 0.1);
  await runFfmpeg([
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", String(dur), "-q:a", "9", "-acodec", "libmp3lame", outPath,
  ]);
}

export async function synthesizeNarrationChunkAudio(text, voiceRef, {
  outputPath,
  workDir,
  workspaceDir,
  projDir,
  useTagged = true,
  taggedText = "",
  stripEmphasis = false,
  onLog = () => {},
} = {}) {
  const voice = normalizeVoiceRef(voiceRef);
  const plain = String(text || "").trim();
  if (plain.length < 2) throw new Error("Trecho vazio.");
  const engine = voice.engine;

  if (engine === "kokoro") {
    const result = await synthesizeKokoroNarration(plain, {
      voice: voice.voice,
      speed: voice.speed,
      outputPath,
      workDir: workDir || path.dirname(outputPath),
      onLog,
    });
    return { engine: "kokoro", voice: result.voice, durationSeconds: result.durationSeconds };
  }

  if (engine === "edge") {
    let EdgeTTS;
    try {
      ({ EdgeTTS } = await import("edge-tts-universal"));
    } catch {
      throw new Error("edge-tts-universal não instalado.");
    }
    const tts = new EdgeTTS(plain, voice.voice || "pt-BR-AntonioNeural", { rate: voice.rate, pitch: voice.pitch });
    const result = await tts.synthesize();
    fs.writeFileSync(outputPath, Buffer.from(await result.audio.arrayBuffer()));
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "edge", voice: voice.voice, durationSeconds };
  }

  if (engine === "chatterbox" || engine === "chatterbox-tts") {
    const cbConfig = loadChatterboxConfig({ workspaceDir, projectDir: projDir });
    const tagPlatform = String(voice.voice).includes("turbo") ? "turbo" : "chatterbox";
    const tagged = String(taggedText || "").trim();
    const textForTts = useTagged && tagged.length > 2
      ? convertCinematicMarkersForTts(tagged, tagPlatform, { stripEmphasis })
      : plain;
    const result = await synthesizeChatterboxNarration(textForTts, {
      voice: voice.voice || CHATTERBOX_DEFAULT_VOICE,
      outputPath,
      workDir: workDir || path.dirname(outputPath),
      config: cbConfig,
      onLog,
    });
    return { engine: "chatterbox", voice: result.voice, durationSeconds: result.durationSeconds };
  }

  if (engine === "fish" || engine === "fish-speech") {
    const fishConfig = loadFishSpeechConfig({ workspaceDir, projectDir: projDir });
    const tagged = String(taggedText || "").trim();
    const textForTts = useTagged && tagged.length > 2
      ? convertCinematicMarkersForTts(tagged, "fish", { stripEmphasis })
      : plain;
    const result = await fetchFishSpeechAudio(textForTts, {
      referenceId: voice.voice,
      config: fishConfig,
      onLog,
    });
    fs.writeFileSync(outputPath, result.buffer);
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "fish", voice: voice.voice, durationSeconds };
  }

  if (engine === "voicebox") {
    const vbConfig = loadVoiceboxConfig({ workspaceDir, projectDir: projDir });
    await synthesizeVoiceboxNarration(plain, {
      voice: voice.voice,
      outputPath,
      config: vbConfig,
      onLog,
    });
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "voicebox", voice: voice.voice, durationSeconds };
  }

  if (engine === "gptsovits" || engine === "gpt_sovits") {
    const gsConfig = loadGptSovitsConfig({ workspaceDir, projectDir: projDir });
    await synthesizeGptSovitsNarration(plain, {
      voice: voice.voice,
      outputPath,
      config: gsConfig,
      onLog,
    });
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "gptsovits", voice: voice.voice, durationSeconds };
  }

  throw new Error(`Motor TTS não suportado para trechos: ${engine}`);
}

export async function assembleNarrationChunksToMaster(projDir, plan, { onLog = () => {} } = {}) {
  const chunks = plan?.chunks || [];
  const generated = chunks.filter((c) => c.audio_file && fs.existsSync(path.join(projDir, c.audio_file)));
  if (!generated.length) throw new Error("Nenhum trecho com áudio gerado para montar.");

  const workDir = path.join(projDir, NARRATION_CHUNKS_DIR, "_assemble");
  fs.mkdirSync(workDir, { recursive: true });

  const concatEntries = [];
  for (let i = 0; i < generated.length; i += 1) {
    const chunk = generated[i];
    const audioPath = path.join(projDir, chunk.audio_file);
    concatEntries.push(audioPath);
    const pauseMs = Number(chunk.pause_after_ms) || 0;
    if (pauseMs > 0 && i < generated.length - 1) {
      const silencePath = path.join(workDir, `silence_${i}.mp3`);
      await generateSilenceMp3(silencePath, pauseMs / 1000);
      concatEntries.push(silencePath);
    }
  }

  const listPath = path.join(workDir, "concat_list.txt");
  const listBody = concatEntries
    .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listBody, "utf8");

  const masterPath = path.join(projDir, NARRATION_MASTER_FILENAME);
  onLog(`Montando ${generated.length} trecho(s) + pausas → ${NARRATION_MASTER_FILENAME}`);
  await runFfmpeg([
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-acodec", "libmp3lame", "-q:a", "2", masterPath,
  ], onLog);

  return masterPath;
}

export function persistChunkPlanToProject(projDir, plan, config = {}) {
  const storyboardPath = path.join(projDir, "storyboard.json");
  const configPath = path.join(projDir, "config_qanat.json");
  const storyboard = fs.existsSync(storyboardPath)
    ? JSON.parse(fs.readFileSync(storyboardPath, "utf8"))
    : {};
  storyboard.narration_chunk_plan = plan;
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");

  const cfg = { ...config, narration_mode: NARRATION_MODE_CHUNKED };
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
  return { storyboard, config: cfg };
}

export function writeTimingsFromChunkPlan(projDir, plan) {
  const timings = buildBlockTimingsFromChunks(plan.chunks);
  const transcripts = buildWordTranscriptsFromChunks(plan.chunks);
  fs.writeFileSync(path.join(projDir, "block_timings.json"), JSON.stringify(timings, null, 2), "utf8");
  fs.writeFileSync(path.join(projDir, "word_transcripts.json"), JSON.stringify(transcripts, null, 2), "utf8");
  return { timings, transcripts };
}

/** true quando o pedido cobre todos os trechos do plano (ex.: "Gerar todos"). */
export function isFullNarrationChunkBatch(chunkIds, plan) {
  const all = (plan?.chunks || []).map((c) => String(c.id));
  if (!all.length) return false;
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) return true;
  const requested = new Set(chunkIds.map(String));
  return all.every((id) => requested.has(id));
}

export async function generateNarrationChunksTts(projDir, {
  plan,
  chunkIds = null,
  defaultVoice = {},
  workspaceDir = null,
  useTagged = true,
  stripEmphasis = false,
  assembleMaster = true,
  onLog = () => {},
  onProgress = () => {},
} = {}) {
  if (!plan?.chunks?.length) throw new Error("Plano de trechos vazio.");

  const chunksDir = path.join(projDir, NARRATION_CHUNKS_DIR);
  fs.mkdirSync(chunksDir, { recursive: true });

  const idSet = Array.isArray(chunkIds) && chunkIds.length
    ? new Set(chunkIds.map(String))
    : null;

  const updatedChunks = [...plan.chunks];
  const targets = updatedChunks
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => !idSet || idSet.has(String(c.id)));

  if (!targets.length) throw new Error("Nenhum trecho selecionado para TTS.");

  onProgress("prepare", `Gerando ${targets.length} trecho(s) de narração…`, 8);

  for (let i = 0; i < targets.length; i += 1) {
    const { c, idx } = targets[i];
    const pct = Math.round(((i + 1) / targets.length) * 85);
    onProgress("tts", `TTS ${c.id} (${i + 1}/${targets.length})…`, pct);
    onLog(`[Chunks] TTS ${c.id} bloco ${c.block} (${c.voice?.engine}/${c.voice?.voice})`);

    const rel = chunkAudioRelativePath(c.id);
    const outPath = path.join(projDir, rel);
    const voice = normalizeVoiceRef(c.voice || {}, normalizeVoiceRef(defaultVoice, plan.default_voice));

    const result = await synthesizeNarrationChunkAudio(c.text, voice, {
      outputPath: outPath,
      workDir: chunksDir,
      workspaceDir,
      projDir,
      useTagged,
      taggedText: c.text_tagged,
      stripEmphasis,
      onLog,
    });

    const duration = Number(result.durationSeconds) || await probeAudioDuration(outPath);
    updatedChunks[idx] = {
      ...c,
      voice,
      audio_file: rel,
      duration_s: Number(duration.toFixed(3)),
      status: "generated",
    };
  }

  let nextPlan = normalizeNarrationChunkPlan({
    ...plan,
    chunks: computeChunkTimeline(updatedChunks),
  }, {});

  if (assembleMaster) {
    onProgress("assemble", "Montando narração master com pausas…", 92);
    await assembleNarrationChunksToMaster(projDir, nextPlan, { onLog });
    writeTimingsFromChunkPlan(projDir, nextPlan);
    onProgress("done", "Narração por trechos concluída.", 100);
  }

  return nextPlan;
}