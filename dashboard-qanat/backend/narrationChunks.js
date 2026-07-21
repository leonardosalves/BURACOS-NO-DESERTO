/**
 * Narração por trechos — planejamento IA, TTS por chunk, montagem e timings.
 * Substitui (opcionalmente) o fluxo de 1 MP3 master + Whisper para alinhar blocos/cenas.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import {
  resolveStoryboardFormat,
  splitNarrationIntoSpeechSegments,
  segmentsPreserveIntegrity,
  estimateFishSpeechSeconds,
  SHORTS_MAX_SCENE_SECONDS,
} from "./shortsSceneChunker.js";
import {
  convertCinematicMarkersForTts,
  sanitizeNarrationChunkTaggedText,
  stripTtsMarkersForPlainText,
} from "./videoProEnhancements.js";
import {
  synthesizeKokoroNarration,
  KOKORO_DEFAULT_VOICE,
  KOKORO_DEFAULT_SPEED,
} from "./kokoroTts.js";
import {
  fetchFishSpeechAudio,
  loadFishSpeechConfig,
  applyFishOptionOverrides,
} from "./fishSpeechTts.js";
import {
  loadVoiceboxConfig,
  synthesizeVoiceboxNarration,
} from "./voiceboxTts.js";
import {
  loadGptSovitsConfig,
  synthesizeGptSovitsNarration,
} from "./gptSovitsTts.js";
import {
  loadChatterboxConfig,
  synthesizeChatterboxNarration,
  CHATTERBOX_DEFAULT_VOICE,
} from "./chatterboxTts.js";
import {
  loadQwen3TtsConfig,
  synthesizeQwen3TtsNarration,
  prepareQwen3ExpressiveNarration,
  QWEN3_TTS_DEFAULT_VOICE,
} from "./qwen3Tts.js";
import { flattenWordTranscripts } from "../shared/wordTranscripts.js";
import { cleanText, matchWords } from "../shared/narrationMatch.js";
import { tightenTimelineRetentionDurations } from "./timelineSceneSync.js";
import { applyNarrationFirstVisualPlan } from "../shared/narrationFirstVisualPlan.js";
import { isPromptOnlyKeyframe } from "../shared/timelineKeyframeUtils.js";
import { getFfmpegStatus, buildPythonSpawnEnv } from "./pythonEnv.js";

const MAX_WHISPER_WORD_DURATION_S = 2.5;
const MAX_WHISPER_INTER_WORD_GAP_S = 1.2;
const MIN_WHISPER_TOKEN_COVERAGE = 0.72;

export function normalizeNarrationIntegrityText(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

// Tolerant normalization for narration matching/comparison (ignores casing, accents, punctuation)
export function normalizeNarrationForComparison(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // remove punctuation, keep letters/numbers
    .replace(/\s+/g, " ")
    .trim();
}

export function narrationsMatch(a = "", b = "") {
  return (
    normalizeNarrationForComparison(a) === normalizeNarrationForComparison(b)
  );
}

export function hashNarrationIntegrityText(text = "") {
  return crypto
    .createHash("sha256")
    .update(normalizeNarrationIntegrityText(text), "utf8")
    .digest("hex");
}

export function promoteNarrationChunkPlanAsApprovedSource(
  storyboard = {},
  plan = {}
) {
  const chunks = Array.isArray(plan?.chunks) ? plan.chunks : [];
  const narrativeScript = normalizeNarrationIntegrityText(
    chunks.map((chunk) => chunk?.text || "").join(" ")
  );
  if (!narrativeScript) {
    return { storyboard, plan, changed: false };
  }

  const narrativeScriptTagged = chunks
    .map((chunk) => String(chunk?.text_tagged || chunk?.text || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[\u200b\u2060\ufeff]/g, "")
    .trim();
  const sourceHash = hashNarrationIntegrityText(narrativeScript);
  const taggedHash = narrativeScriptTagged
    ? hashNarrationIntegrityText(narrativeScriptTagged)
    : null;
  const previousHash =
    storyboard?.narration_integrity?.approved_text_sha256 ||
    (storyboard?.narrative_script
      ? hashNarrationIntegrityText(storyboard.narrative_script)
      : null);
  const changed = sourceHash !== previousHash;
  const approvedAt = new Date().toISOString();
  const nextPlan = {
    ...plan,
    source_narration_hash: sourceHash,
    narrative_script_snapshot: narrativeScript.slice(0, 500),
  };
  const nextAudit = storyboard?.narracao_pro_audit
    ? {
        ...storyboard.narracao_pro_audit,
        narrative_sha256: sourceHash,
        approved: true,
        user_edited: changed || storyboard.narracao_pro_audit.user_edited,
        user_approved_at: changed
          ? approvedAt
          : storyboard.narracao_pro_audit.user_approved_at,
        previous_narrative_sha256:
          changed && previousHash !== sourceHash
            ? previousHash
            : storyboard.narracao_pro_audit.previous_narrative_sha256,
      }
    : storyboard?.narracao_pro_audit;

  return {
    changed,
    plan: nextPlan,
    storyboard: {
      ...storyboard,
      narrative_script: narrativeScript,
      narrative_script_tagged: narrativeScriptTagged || narrativeScript,
      technical_config: {
        ...(storyboard.technical_config || {}),
        script: narrativeScript,
      },
      narration_chunk_plan: nextPlan,
      narration_integrity: {
        ...(storyboard.narration_integrity || {}),
        approved_text_sha256: sourceHash,
        approved_tagged_sha256: taggedHash,
        locked: true,
        approved_at: approvedAt,
        user_edited: changed,
        previous_approved_text_sha256:
          changed && previousHash !== sourceHash
            ? previousHash
            : storyboard?.narration_integrity?.previous_approved_text_sha256 ||
              null,
        pipeline_restored_approved_text: false,
      },
      ...(nextAudit ? { narracao_pro_audit: nextAudit } : {}),
    },
  };
}

export function assertNarrationChunksPreserveSource(
  chunks = [],
  sourceText = ""
) {
  const source = sourceText;
  const planned = (chunks || []).map((chunk) => chunk?.text || "").join(" ");
  if (!source)
    throw new Error("Narração aprovada ausente para planejar trechos.");
  if (!narrationsMatch(planned, source)) {
    throw new Error(
      "O planejador tentou alterar a narração aprovada. O plano foi bloqueado; gere novamente sem condensar, remover ou acrescentar palavras."
    );
  }
  return hashNarrationIntegrityText(source);
}

export function assertNarrationPlanMatchesSource(plan = {}, sourceText = "") {
  const sourceHash = assertNarrationChunksPreserveSource(
    plan.chunks || [],
    sourceText
  );
  if (plan.source_narration_hash && plan.source_narration_hash !== sourceHash) {
    throw new Error(
      "A narração aprovada mudou depois que os trechos foram planejados. Gere um novo plano antes do TTS."
    );
  }
  return sourceHash;
}

function tokenizePlainNarration(text = "") {
  return stripTtsMarkersForPlainText(text).split(/\s+/).filter(Boolean);
}

/** Tempos relativos ao start_time do segmento (formato align_transcripts / Whisper). */
export function synthesizeWordEntriesForDuration(plainText = "", duration = 0) {
  const plain = stripTtsMarkersForPlainText(plainText);
  const words = tokenizePlainNarration(plain);
  const safeDuration = Math.max(0.05, Number(duration) || 0);
  if (!words.length) return [];

  const weights = words.map((w) =>
    Math.max(1, w.replace(/[^\wáéíóúâêîôûãõç]/gi, "").length)
  );
  const totalWeight =
    weights.reduce((sum, w) => sum + w, 0) || words.length || 1;
  let relT = 0;
  return words.map((word, wi) => {
    const wordDur = safeDuration * (weights[wi] / totalWeight);
    const wStart = relT;
    const wEnd = relT + wordDur;
    relT = wEnd;
    return {
      word: wi === 0 ? word : ` ${word}`,
      start: Number(wStart.toFixed(3)),
      end: Number(wEnd.toFixed(3)),
    };
  });
}

function countSequentialTokenMatches(expectedTokens = [], whisperTokens = []) {
  let matched = 0;
  let wi = 0;
  for (const expected of expectedTokens) {
    while (
      wi < whisperTokens.length &&
      !matchWords(expected, whisperTokens[wi])
    ) {
      wi += 1;
    }
    if (wi >= whisperTokens.length) break;
    matched += 1;
    wi += 1;
  }
  return matched;
}

/** Detecta timestamps Whisper corrompidos (palavra única com vários segundos, texto truncado, etc.). */
export function assessWhisperWordQuality(
  plainText = "",
  wordEntries = [],
  duration = 0
) {
  const expectedTokens = cleanText(plainText);
  const whisperTokens = (wordEntries || []).map(
    (w) => cleanText(String(w.word || "")).pop() || ""
  );
  const safeDuration = Math.max(0.05, Number(duration) || 0);

  if (!expectedTokens.length || !whisperTokens.length) {
    return {
      ok: false,
      reason: "empty",
      coverage: 0,
      matched: 0,
      expected: expectedTokens.length,
    };
  }

  const matched = countSequentialTokenMatches(expectedTokens, whisperTokens);
  const coverage = matched / expectedTokens.length;

  let maxWordDuration = 0;
  let maxGap = 0;
  for (let i = 0; i < wordEntries.length; i += 1) {
    const start = Number(wordEntries[i]?.start) || 0;
    const end = Number(wordEntries[i]?.end) || start;
    maxWordDuration = Math.max(maxWordDuration, Math.max(0, end - start));
    if (i > 0) {
      const prevEnd = Number(wordEntries[i - 1]?.end) || 0;
      maxGap = Math.max(maxGap, Math.max(0, start - prevEnd));
    }
  }

  const lastEnd = Number(wordEntries[wordEntries.length - 1]?.end) || 0;
  const trailingSilence = Math.max(0, safeDuration - lastEnd);
  const countRatio = whisperTokens.length / expectedTokens.length;

  const ok =
    coverage >= MIN_WHISPER_TOKEN_COVERAGE &&
    countRatio >= 0.6 &&
    maxWordDuration <= MAX_WHISPER_WORD_DURATION_S &&
    maxGap <= MAX_WHISPER_INTER_WORD_GAP_S &&
    trailingSilence <= 1.25 &&
    lastEnd <= safeDuration + 0.2;

  return {
    ok,
    coverage,
    matched,
    expected: expectedTokens.length,
    whisperCount: whisperTokens.length,
    maxWordDuration,
    maxGap,
    trailingSilence,
    lastEnd,
  };
}

function clampWordEntriesToDuration(wordEntries = [], duration = 0) {
  const safeDuration = Math.max(0.05, Number(duration) || 0);
  return (wordEntries || []).map((entry, index, list) => {
    const start = Math.max(0, Math.min(safeDuration, Number(entry.start) || 0));
    let end = Math.max(start + 0.05, Number(entry.end) || start + 0.15);
    end = Math.min(end, start + MAX_WHISPER_WORD_DURATION_S);
    if (index < list.length - 1) {
      const nextStart = Math.max(0, Number(list[index + 1]?.start) || end);
      end = Math.min(end, Math.max(start + 0.05, nextStart - 0.02));
    } else {
      end = Math.min(end, safeDuration);
    }
    return {
      ...entry,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
  });
}

export const NARRATION_CHUNKS_DIR = "narration_chunks";
export const NARRATION_MASTER_FILENAME = "narracao_mestra_premium.mp3";
export const NARRATION_MODE_CHUNKED = "chunked";
export const NARRATION_MODE_MASTER = "master";

/** Projeto com plano de trechos gerado — timings vêm do chunk plan, não do agrupamento Whisper por bloco. */
export function isChunkedNarrationProject(config = {}, storyboard = {}) {
  const plan = storyboard?.narration_chunk_plan;
  const chunks = Array.isArray(plan?.chunks) ? plan.chunks : [];
  return (
    (config.narration_mode === NARRATION_MODE_CHUNKED ||
      plan?.mode === NARRATION_MODE_CHUNKED) &&
    chunks.some((c) => String(c.text || "").trim().length >= 2)
  );
}

const DEFAULT_PAUSE_BETWEEN_SCENES_MS = 350;
const DEFAULT_PAUSE_BETWEEN_BLOCKS_MS = 750;

function clampPauseMs(value, fallback = 400) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(8000, Math.round(n)));
}

function normalizeVoiceRef(raw = {}, fallback = {}) {
  let engine = String(
    raw.engine || raw.platform || fallback.engine || "kokoro"
  ).toLowerCase();
  if (engine === "gpt-sovits" || engine === "gpt_sovits") engine = "gptsovits";
  if (
    engine === "qwen3-tts" ||
    engine === "qwen_tts" ||
    engine === "qwen" ||
    engine === "qwen_custom_voice"
  ) {
    engine = "qwen3";
  }
  return {
    engine,
    voice: String(
      raw.voice || raw.voice_id || fallback.voice || KOKORO_DEFAULT_VOICE
    ),
    speed: Number.isFinite(Number(raw.speed))
      ? Number(raw.speed)
      : (fallback.speed ?? KOKORO_DEFAULT_SPEED),
    rate: raw.rate || fallback.rate || "+0%",
    pitch: raw.pitch || fallback.pitch || "+0Hz",
  };
}

export function buildNarrationChunkSignature(chunk = {}, voiceOverride = null) {
  const voice = normalizeVoiceRef(voiceOverride || chunk.voice || {});
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        text: String(chunk.text || "").trim(),
        text_tagged: sanitizeNarrationChunkTaggedText(
          chunk.text_tagged || chunk.text || "",
          chunk.text || ""
        ),
        voice,
      })
    )
    .digest("hex");
}

export function resolveExpressivePause({
  text = "",
  changesBlock = false,
} = {}) {
  const spoken = String(text || "").trim();
  if (!spoken)
    return {
      ms: DEFAULT_PAUSE_BETWEEN_SCENES_MS,
      reason: "respiro entre cenas",
    };
  if (changesBlock) return { ms: 850, reason: "virada de bloco" };
  if (/\?\s*$/.test(spoken)) return { ms: 700, reason: "pausa após pergunta" };
  if (/\b(mas|porém|só que|o detalhe|a resposta|até que)\b/i.test(spoken)) {
    return { ms: 900, reason: "suspense antes da próxima revelação" };
  }
  if (/\b(por isso|resultado|finalmente|em resumo)\b/i.test(spoken)) {
    return { ms: 550, reason: "assimilação da conclusão" };
  }
  return { ms: DEFAULT_PAUSE_BETWEEN_SCENES_MS, reason: "respiro entre cenas" };
}

/**
 * Pausas automáticas determinísticas. A IA decide o texto/corte, mas não cria
 * rampas arbitrárias como 800 → 900 → 1000 ms entre cenas equivalentes.
 * Edições manuais posteriores continuam preservadas pela normalização comum.
 */
export function stabilizeNarrationChunkPauses(chunks = []) {
  const list = Array.isArray(chunks) ? chunks : [];
  return list.map((chunk, index) => {
    if (index === list.length - 1) {
      return {
        ...chunk,
        pause_after_ms: 0,
        pause_reason: "fim da narração",
      };
    }
    const next = list[index + 1];
    const changesBlock = Number(next?.block || 1) !== Number(chunk?.block || 1);
    const pause = resolveExpressivePause({
      text: chunk?.text,
      changesBlock,
    });
    return {
      ...chunk,
      pause_after_ms: pause.ms,
      pause_reason: pause.reason,
    };
  });
}

export function chunkAudioRelativePath(chunkId) {
  const safe = String(chunkId || "chunk").replace(/[^\w.-]+/g, "_");
  return path.join(NARRATION_CHUNKS_DIR, `${safe}.mp3`).replace(/\\/g, "/");
}

export function archiveNarrationChunkAudio(projDir, chunk = {}) {
  const activeRel = String(
    chunk.audio_file || chunkAudioRelativePath(chunk.id)
  ).replace(/\\/g, "/");
  const activePath = path.join(projDir, activeRel);
  if (!fs.existsSync(activePath)) return null;
  const safeId = String(chunk.id || "chunk").replace(/[^\w.-]+/g, "_");
  const versionRel = path
    .join(NARRATION_CHUNKS_DIR, "versions", `${safeId}-${Date.now()}.mp3`)
    .replace(/\\/g, "/");
  const versionPath = path.join(projDir, versionRel);
  fs.mkdirSync(path.dirname(versionPath), { recursive: true });
  fs.copyFileSync(activePath, versionPath);
  return {
    file: versionRel,
    archived_at: new Date().toISOString(),
    duration_s: chunk.duration_s || null,
    voice: chunk.voice || null,
    generation_signature: chunk.generation_signature || null,
  };
}

/** Trechos heurísticos a partir de visual_prompts + block_phrases. */
export function buildHeuristicNarrationChunks({
  storyboard = {},
  config = {},
  defaultVoice = {},
} = {}) {
  const scenes = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : Array.isArray(storyboard.technical_config?.block_phrases)
      ? storyboard.technical_config.block_phrases
      : [];
  const phraseByBlock = new Map(
    blockPhrases.map((bp) => [
      Number(bp.block) || 0,
      String(bp.phrase || "").trim(),
    ])
  );
  const voice = normalizeVoiceRef(defaultVoice);
  const format = resolveStoryboardFormat(storyboard, config);
  const prosodySpeed =
    Number(voice.prosody_speed ?? voice.prosodySpeed ?? voice.speed ?? 1) || 1;

  const chunks = [];
  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const block = Number(scene.block) || 1;
    const sceneRef = String(
      scene.scene || scene.scene_ref || `${block}.${i + 1}`
    );
    const text = String(scene.narration_text || "").trim();
    if (!text) continue;

    let speechSegments = (
      Array.isArray(scene.speech_segments) ? scene.speech_segments : []
    )
      .map((segment, segmentIndex) => ({
        id: String(segment?.id || `speech-${segmentIndex + 1}`),
        speaker: String(segment?.speaker || "Narrador").trim() || "Narrador",
        role: String(segment?.role || "narrator").trim() || "narrator",
        text: String(segment?.text || "").trim(),
      }))
      .filter((segment) => segment.text);

    const temSegmentosValidos =
      speechSegments.length > 0 &&
      narrationsMatch(
        speechSegments.map((segment) => segment.text).join(" "),
        text
      );

    if (
      !temSegmentosValidos &&
      format === "SHORTS" &&
      estimateFishSpeechSeconds(text, prosodySpeed) > SHORTS_MAX_SCENE_SECONDS
    ) {
      const autoSegments = splitNarrationIntoSpeechSegments(text, {
        maxSeconds: SHORTS_MAX_SCENE_SECONDS,
        prosodySpeed,
      });
      if (segmentsPreserveIntegrity(autoSegments, text)) {
        speechSegments = autoSegments;
      }
    }

    const turns =
      speechSegments.length > 0 &&
      narrationsMatch(
        speechSegments.map((segment) => segment.text).join(" "),
        text
      )
        ? speechSegments
        : [{ id: "speech-01", speaker: "Narrador", role: "narrator", text }];

    const pause = resolveExpressivePause({
      text,
      changesBlock:
        i < scenes.length - 1 && Number(scenes[i + 1]?.block || 1) !== block,
    });

    turns.forEach((turn, turnIndex) => {
      const isLastTurn = turnIndex === turns.length - 1;
      const isLastScene = i === scenes.length - 1;
      chunks.push({
        id: `chunk-${String(chunks.length + 1).padStart(2, "0")}`,
        block,
        scene_ref: sceneRef,
        speech_segment_id: turn.id,
        speaker: turn.speaker,
        speech_role: turn.role,
        text: turn.text,
        text_tagged: turn.text,
        pause_after_ms: !isLastTurn ? 180 : isLastScene ? 0 : pause.ms,
        pause_reason:
          i === scenes.length - 1 ? "fim da narração" : pause.reason,
        block_phrase: phraseByBlock.get(block) || "",
        voice: { ...voice },
        audio_file: null,
        duration_s: null,
        start_s: null,
        end_s: null,
        status: "planned",
      });
    });
  }

  return normalizeNarrationChunkPlan(
    { chunks, default_voice: voice },
    { storyboard, config }
  );
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
${String(narrativeScript || "")
  .trim()
  .slice(0, 40000)}

CENAS (visual_prompts — use como mapa principal):
${JSON.stringify(sceneLines, null, 2)}

ÂNCORAS DE BLOCO (block_phrases):
${JSON.stringify(blockPhrases || [], null, 2)}

REGRAS:
- Um trecho = uma cena OU um bloco inteiro se a cena for muito curta (< 8 palavras); prefira 1 trecho por cena quando houver narration_text.
- "text" = trecho LITERAL da NARRAÇÃO COMPLETA. PROIBIDO condensar, resumir, corrigir, parafrasear, remover ou acrescentar qualquer palavra.
- "text_tagged" = igual a "text" (texto limpo, sem tags inline). PROIBIDO: (breath), [ênfase], [emphasis], [ênfase dramática] — pausas entre trechos são só "pause_after_ms".
- "pause_after_ms": silêncio APÓS o trecho. Use apenas estes presets: 350ms entre cenas, 700ms após pergunta, 850ms na última cena antes da virada de bloco e 550ms após conclusão. Último trecho: 0ms.
- PROIBIDO criar progressão numérica artificial (ex.: 800, 900, 1000ms). Cenas com a mesma função narrativa usam a mesma pausa.
- "pause_reason": frase curta explicando a pausa.
- Cobrir 100% da narração sem repetir trechos.
- A concatenação de todos os campos "text", na ordem e ignorando apenas espaços/quebras de linha, deve ser IDÊNTICA à NARRAÇÃO COMPLETA.
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
  return raw
    .map((c, idx) => ({
      id: String(c.id || `chunk-${String(idx + 1).padStart(2, "0")}`),
      block: Number(c.block) || 1,
      scene_ref: String(
        c.scene_ref ||
          c.scene ||
          c.sceneRef ||
          `${Number(c.block) || 1}.${idx + 1}`
      ),
      text: String(c.text || "").trim(),
      caption_text: String(
        c.caption_text || c.captionText || c.text || ""
      ).trim(),
      text_tagged: sanitizeNarrationChunkTaggedText(
        c.text_tagged || c.textTagged || c.text || "",
        c.text || ""
      ),
      pause_after_ms: clampPauseMs(
        c.pause_after_ms ?? c.pauseAfterMs,
        DEFAULT_PAUSE_BETWEEN_SCENES_MS
      ),
      pause_reason:
        String(c.pause_reason || c.pauseReason || "").trim() || undefined,
      voice: c.voice || null,
      audio_file: null,
      duration_s: null,
      start_s: null,
      end_s: null,
      status: "planned",
    }))
    .filter((c) => c.text.length >= 2);
}

export function computeChunkTimeline(chunks = []) {
  let cursor = 0;
  return (chunks || []).map((chunk, idx, arr) => {
    const duration = Number(chunk.duration_s) || 0;
    const pauseMs =
      idx < arr.length - 1 ? clampPauseMs(chunk.pause_after_ms, 0) : 0;
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

function hasCompleteChunkTimeline(chunks = []) {
  return (
    chunks.length > 0 &&
    chunks.every((chunk) => {
      const start = Number(chunk?.start_s);
      const end = Number(chunk?.end_s);
      return Number.isFinite(start) && Number.isFinite(end) && end > start;
    })
  );
}

/** Preserva tempos reais (Whisper) quando disponíveis; senão calcula pelo plano. */
export function resolveChunkTimeline(
  chunks = [],
  { preferExisting = true } = {}
) {
  const list = Array.isArray(chunks) ? chunks : [];
  if (preferExisting && hasCompleteChunkTimeline(list)) {
    return list.map((chunk, index) => ({
      ...chunk,
      start_s: Number(Number(chunk.start_s).toFixed(3)),
      end_s: Number(Number(chunk.end_s).toFixed(3)),
      pause_after_ms:
        index === list.length - 1 ? 0 : clampPauseMs(chunk.pause_after_ms, 0),
    }));
  }
  return computeChunkTimeline(list);
}

/**
 * Une somente a janela visual de turnos que pertencem à mesma cena. Os áudios
 * continuam separados por voz; a timeline recebe um único asset/cena cobrindo
 * do início da primeira fala ao fim da última.
 */
export function aggregateNarrationChunksByScene(chunks = []) {
  const groups = new Map();
  const order = [];
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const sceneRef = String(chunk?.scene_ref || "").trim();
    const key = sceneRef
      ? `${Number(chunk?.block) || 1}:${sceneRef}`
      : `chunk:${chunk?.id || order.length}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...chunk,
        chunk_ids: [chunk?.id].filter(Boolean),
        speakers: [chunk?.speaker].filter(Boolean),
      });
      order.push(key);
      continue;
    }
    const current = groups.get(key);
    const startValues = [
      Number(current.start_s),
      Number(chunk?.start_s),
    ].filter(Number.isFinite);
    const endValues = [Number(current.end_s), Number(chunk?.end_s)].filter(
      Number.isFinite
    );
    groups.set(key, {
      ...current,
      text: `${String(current.text || "").trim()} ${String(chunk?.text || "").trim()}`.trim(),
      text_tagged:
        `${String(current.text_tagged || current.text || "").trim()} ${String(chunk?.text_tagged || chunk?.text || "").trim()}`.trim(),
      start_s: startValues.length ? Math.min(...startValues) : current.start_s,
      end_s: endValues.length ? Math.max(...endValues) : current.end_s,
      duration_s:
        endValues.length && startValues.length
          ? Math.max(...endValues) - Math.min(...startValues)
          : current.duration_s,
      chunk_ids: [...(current.chunk_ids || []), chunk?.id].filter(Boolean),
      speakers: [
        ...new Set(
          [...(current.speakers || []), chunk?.speaker].filter(Boolean)
        ),
      ],
    });
  }
  return order.map((key) => groups.get(key));
}

function findWhisperChunkWindow(expectedTokens, words, cursor) {
  if (!expectedTokens.length || cursor >= words.length) return null;
  const searchEnd = Math.min(
    words.length,
    cursor + Math.max(48, expectedTokens.length * 5)
  );
  let best = null;

  for (let candidate = cursor; candidate < searchEnd; candidate += 1) {
    const firstToken = cleanText(String(words[candidate]?.word || ""))[0] || "";
    if (!matchWords(expectedTokens[0], firstToken)) continue;

    let wi = candidate;
    const matchedIndices = [];
    for (const expected of expectedTokens) {
      // Uma divergência comum do Whisper ("dez" -> "10", por exemplo)
      // não pode consumir várias palavras reais. O comportamento anterior
      // avançava até 8 posições por token ausente e acabava atravessando a
      // próxima cena. Procuramos apenas na vizinhança imediata; se a palavra
      // esperada não existir, mantemos o cursor para a próxima tentativa.
      let matchedAt = -1;
      const lookAheadEnd = Math.min(words.length, wi + 3);
      for (let probe = wi; probe < lookAheadEnd; probe += 1) {
        const actual = cleanText(String(words[probe]?.word || ""))[0] || "";
        if (matchWords(expected, actual)) {
          matchedAt = probe;
          break;
        }
      }
      if (matchedAt < 0) continue;
      matchedIndices.push(matchedAt);
      wi = matchedAt + 1;
    }

    const coverage = matchedIndices.length / expectedTokens.length;
    const span = matchedIndices.length
      ? matchedIndices[matchedIndices.length - 1] - matchedIndices[0] + 1
      : Infinity;
    const score = coverage - Math.max(0, span - expectedTokens.length) * 0.004;
    if (!best || score > best.score) {
      best = { score, coverage, matchedIndices };
    }
    if (coverage >= 0.96) break;
  }

  if (!best || best.coverage < 0.65 || best.matchedIndices.length < 2) {
    return null;
  }
  const first = best.matchedIndices[0];
  const last = best.matchedIndices[best.matchedIndices.length - 1];
  return { first, last, nextCursor: last + 1, coverage: best.coverage };
}

/**
 * Reancora cada trecho nas palavras reais do Whisper. A pausa planejada não é
 * alterada; a pausa observada fica separada para diagnóstico e não realimenta
 * o planejador em execuções futuras.
 */
export function alignNarrationChunkPlanToWhisper(
  chunkPlan = {},
  flatWords = []
) {
  const words = (Array.isArray(flatWords) ? flatWords : [])
    .filter(
      (word) =>
        Number.isFinite(Number(word?.start)) &&
        Number.isFinite(Number(word?.end)) &&
        Number(word.end) > Number(word.start)
    )
    .sort((a, b) => Number(a.start) - Number(b.start));
  const planned = computeChunkTimeline(chunkPlan?.chunks || []);
  if (!planned.length || !words.length)
    return { ...chunkPlan, chunks: planned };

  let cursor = 0;
  let previousAligned = null;
  const aligned = planned.map((chunk) => {
    const expected = cleanText(stripTtsMarkersForPlainText(chunk.text || ""));
    const window = findWhisperChunkWindow(expected, words, cursor);
    if (!window) {
      const duration = Math.max(
        0.05,
        Number(chunk.duration_s) ||
          Number(chunk.speech_duration_s) ||
          Number(chunk.end_s) - Number(chunk.start_s) ||
          0.05
      );
      const fallbackStart = previousAligned
        ? Number(previousAligned.end_s) +
          Number(previousAligned.pause_after_ms || 0) / 1000
        : Number(chunk.start_s) || 0;
      const fallback = {
        ...chunk,
        timing_source: "chunk-plan-fallback",
        alignment_coverage: 0,
        start_s: Number(fallbackStart.toFixed(3)),
        end_s: Number((fallbackStart + duration).toFixed(3)),
        speech_duration_s: Number(duration.toFixed(3)),
      };
      previousAligned = fallback;
      return fallback;
    }
    cursor = window.nextCursor;
    const start = Number(words[window.first].start);
    const end = Number(words[window.last].end);
    const matched = {
      ...chunk,
      start_s: Number(start.toFixed(3)),
      end_s: Number(end.toFixed(3)),
      speech_duration_s: Number(Math.max(0.05, end - start).toFixed(3)),
      timing_source: "whisper",
      alignment_coverage: Number(window.coverage.toFixed(3)),
    };
    previousAligned = matched;
    return matched;
  });

  const withObservedPauses = aligned.map((chunk, index) => {
    const next = aligned[index + 1];
    const observed = next
      ? Math.max(
          0,
          Math.round((Number(next.start_s) - Number(chunk.end_s)) * 1000)
        )
      : 0;
    return { ...chunk, observed_pause_after_ms: observed };
  });
  return {
    ...chunkPlan,
    timing_source: "whisper",
    aligned_at: new Date().toISOString(),
    chunks: withObservedPauses,
  };
}

/** Extrai as palavras absolutas do JSON bruto do Whisper, sem realinhamento textual. */
export function extractWhisperRawWords(rawTranscript = {}) {
  const segments = Array.isArray(rawTranscript)
    ? rawTranscript
    : Array.isArray(rawTranscript?.segments)
      ? rawTranscript.segments
      : [];
  return segments
    .flatMap((segment) => (Array.isArray(segment?.words) ? segment.words : []))
    .filter(
      (word) =>
        Number.isFinite(Number(word?.start)) &&
        Number.isFinite(Number(word?.end)) &&
        Number(word.end) > Number(word.start)
    )
    .map((word) => ({
      word: String(word.word || ""),
      start: Number(word.start),
      end: Number(word.end),
    }))
    .sort((a, b) => a.start - b.start);
}

export function normalizeNarrationChunkPlan(
  plan = {},
  { storyboard = {}, config = {} } = {}
) {
  const defaultVoice = normalizeVoiceRef(
    plan.default_voice || config.narration_default_voice || {},
    {
      engine: "kokoro",
      voice: KOKORO_DEFAULT_VOICE,
      speed: KOKORO_DEFAULT_SPEED,
    }
  );
  let chunks = Array.isArray(plan.chunks) ? plan.chunks : [];
  chunks = chunks
    .map((c, idx) => {
      const voice = normalizeVoiceRef(c.voice || {}, defaultVoice);
      const id = String(c.id || `chunk-${String(idx + 1).padStart(2, "0")}`);
      const generationSignature = c.generation_signature || null;
      const desiredSignature = buildNarrationChunkSignature(c, voice);
      const rawAudioFile = String(c.audio_file || "").trim() || null;
      const durationS = Number.isFinite(Number(c.duration_s))
        ? Number(c.duration_s)
        : null;
      // Áudio real só conta com MP3 + duração > 0. Nunca inventar path em
      // trechos "planned" — isso fazia o botão Play aparecer sem arquivo em disco.
      const hasGeneratedAudio = Boolean(rawAudioFile && Number(durationS) > 0);
      const audioIsStale = Boolean(
        hasGeneratedAudio && generationSignature !== desiredSignature
      );
      return {
        id,
        block: Number(c.block) || 1,
        scene_ref: String(
          c.scene_ref || c.scene || `${Number(c.block) || 1}.${idx + 1}`
        ),
        speech_segment_id: c.speech_segment_id || undefined,
        speaker: c.speaker || undefined,
        speech_role: c.speech_role || undefined,
        text: String(c.text || "").trim(),
        caption_text: String(c.caption_text || c.text || "").trim(),
        text_tagged: sanitizeNarrationChunkTaggedText(
          c.text_tagged || c.text || "",
          c.text || ""
        ),
        pause_after_ms: clampPauseMs(
          c.pause_after_ms,
          idx === chunks.length - 1 ? 0 : DEFAULT_PAUSE_BETWEEN_SCENES_MS
        ),
        pause_reason: c.pause_reason || undefined,
        block_phrase: c.block_phrase || undefined,
        voice,
        audio_file: hasGeneratedAudio
          ? rawAudioFile || chunkAudioRelativePath(id)
          : null,
        duration_s: durationS,
        start_s: Number.isFinite(Number(c.start_s)) ? Number(c.start_s) : null,
        end_s: Number.isFinite(Number(c.end_s)) ? Number(c.end_s) : null,
        generation_signature: generationSignature,
        generated_at: c.generated_at || null,
        failed_at: c.failed_at || null,
        error: c.error || null,
        versions: Array.isArray(c.versions) ? c.versions : [],
        status: audioIsStale
          ? "stale"
          : c.status === "failed"
            ? "failed"
            : hasGeneratedAudio
              ? c.status === "stale"
                ? "stale"
                : "generated"
              : "planned",
      };
    })
    .filter((c) => c.text.length >= 2);

  const withAudio = chunks.filter((c) => Number(c.duration_s) > 0);
  const timed =
    withAudio.length === chunks.length && withAudio.length > 0
      ? computeChunkTimeline(chunks)
      : chunks;

  const totalDuration = timed.length
    ? (timed[timed.length - 1].end_s || 0) +
      (timed[timed.length - 1].pause_after_ms || 0) / 1000
    : 0;

  return {
    version: 1,
    mode: NARRATION_MODE_CHUNKED,
    planned_at: plan.planned_at || new Date().toISOString(),
    default_voice: defaultVoice,
    chunk_count: timed.length,
    total_duration: Number(totalDuration.toFixed(3)) || null,
    source_narration_hash:
      plan.source_narration_hash ||
      (storyboard.narrative_script
        ? hashNarrationIntegrityText(storyboard.narrative_script)
        : null),
    chunks: timed,
    source: plan.source || "normalized",
    narrative_script_snapshot:
      String(storyboard.narrative_script || "").slice(0, 500) || undefined,
  };
}

export function buildBlockTimingsFromChunks(chunks = []) {
  const list = Array.isArray(chunks) ? chunks : [];
  const needsTimeline = list.some(
    (c) =>
      Number(c.duration_s) > 0 &&
      (!Number.isFinite(Number(c.start_s)) || !Number.isFinite(Number(c.end_s)))
  );
  const resolved = needsTimeline ? computeChunkTimeline(list) : list;

  const byBlock = new Map();
  for (const chunk of resolved) {
    const block = Number(chunk.block) || 1;
    const start = Number(chunk.start_s) || 0;
    const end = Number(chunk.end_s) || start;
    const pause = Number(chunk.pause_after_ms) || 0;
    const blockEnd = end + pause / 1000;
    if (!byBlock.has(block)) {
      byBlock.set(block, { block, start, end: blockEnd });
    } else {
      const entry = byBlock.get(block);
      entry.start = Math.min(entry.start, start);
      entry.end = Math.max(entry.end, blockEnd);
    }
  }
  const blocks = [...byBlock.values()].sort((a, b) => a.block - b.block);
  const starts = blocks.map((b) => Number(b.start.toFixed(3)));
  const durations = blocks.map((b) =>
    Number(Math.max(0.1, b.end - b.start).toFixed(3))
  );
  const total = durations.reduce(
    (sum, d, i) => Math.max(sum, starts[i] + d),
    0
  );
  return {
    starts,
    durations,
    total_duration: Number(total.toFixed(3)),
    source: "narration_chunks",
  };
}

function parseSceneRefIndex(sceneRef = "", fallback = 0) {
  const parts = String(sceneRef || "")
    .trim()
    .split(".");
  const sub = Number(parts[1]);
  if (Number.isFinite(sub) && sub >= 1) return sub - 1;
  return fallback;
}

/** Índice do asset na timeline para um trecho do plano (scene_ref ou ordem no bloco). */
export function resolveChunkAssetIndex(chunk, assets = [], ordinalInBlock = 0) {
  const list = Array.isArray(assets) ? assets : [];
  if (!list.length) return 0;
  const byRef = parseSceneRefIndex(chunk?.scene_ref, -1);
  if (byRef >= 0 && byRef < list.length) return byRef;
  return Math.min(ordinalInBlock, list.length - 1);
}

function splitNarrationText(text = "", partCount = 1) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const count = Math.max(1, Number(partCount) || 1);
  if (count === 1 || words.length < 2) return [words.join(" ")];
  return Array.from({ length: count }, (_, index) => {
    const start = Math.round((index * words.length) / count);
    const end = Math.round(((index + 1) * words.length) / count);
    return words.slice(start, end).join(" ");
  });
}

/**
 * Converte chunks de voz em janelas visuais sem assumir 1 chunk = 1 cena.
 * Várias vozes podem compartilhar uma cena e uma fala pode cobrir várias cenas.
 */
export function buildVisualSceneTimingSegments(chunks = [], scenes = []) {
  const timedChunks = [...(chunks || [])]
    .filter(
      (chunk) =>
        Number.isFinite(Number(chunk?.start_s)) &&
        Number.isFinite(Number(chunk?.end_s)) &&
        Number(chunk.end_s) > Number(chunk.start_s)
    )
    .sort((a, b) => Number(a.start_s) - Number(b.start_s));
  const visualScenes = (scenes || []).filter(
    (scene) => !isPromptOnlyKeyframe(scene)
  );
  if (!visualScenes.length) return timedChunks;
  if (!timedChunks.length) return [];

  const sceneRefs = visualScenes.map((scene, index) =>
    String(
      scene?.scene || scene?.scene_ref || `${scene?.block || 1}.${index + 1}`
    ).trim()
  );
  const chunksByScene = new Map();
  timedChunks.forEach((chunk, chunkIndex) => {
    const exactIndex = sceneRefs.indexOf(String(chunk?.scene_ref || "").trim());
    const fallbackIndex =
      visualScenes.length === 1 || timedChunks.length === 1
        ? 0
        : Math.round(
            (chunkIndex * (visualScenes.length - 1)) / (timedChunks.length - 1)
          );
    const sceneIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
    if (!chunksByScene.has(sceneIndex)) chunksByScene.set(sceneIndex, []);
    chunksByScene.get(sceneIndex).push(chunk);
  });

  const occupied = [...chunksByScene.keys()].sort((a, b) => a - b);
  const ownerForScene = visualScenes.map((_, sceneIndex) => {
    if (chunksByScene.has(sceneIndex)) return sceneIndex;
    return occupied.reduce(
      (best, candidate) =>
        Math.abs(candidate - sceneIndex) < Math.abs(best - sceneIndex)
          ? candidate
          : best,
      occupied[0]
    );
  });

  const scenesByOwner = new Map();
  ownerForScene.forEach((owner, sceneIndex) => {
    if (!scenesByOwner.has(owner)) scenesByOwner.set(owner, []);
    scenesByOwner.get(owner).push(sceneIndex);
  });

  const segments = Array(visualScenes.length).fill(null);
  for (const [owner, sceneIndexes] of scenesByOwner) {
    const ownedChunks = chunksByScene.get(owner) || [];
    const start = Math.min(
      ...ownedChunks.map((chunk) => Number(chunk.start_s))
    );
    const speechEnd = Math.max(
      ...ownedChunks.map((chunk) => Number(chunk.end_s))
    );
    // A janela visual inclui a pausa posterior. Sem isso, a timeline ganha
    // buracos entre cenas e termina antes da narração mestre.
    const end = Math.max(
      ...ownedChunks.map(
        (chunk) =>
          Number(chunk.end_s) +
          Math.max(0, Number(chunk.pause_after_ms) || 0) / 1000
      )
    );
    const duration = Math.max(0.05, end - start);
    const combinedText = ownedChunks
      .map((chunk) => String(chunk.text || "").trim())
      .filter(Boolean)
      .join(" ");
    const textParts = splitNarrationText(combinedText, sceneIndexes.length);
    sceneIndexes.forEach((sceneIndex, partIndex) => {
      const partStart = start + (duration * partIndex) / sceneIndexes.length;
      const partEnd =
        start + (duration * (partIndex + 1)) / sceneIndexes.length;
      segments[sceneIndex] = {
        ...ownedChunks[0],
        id: ownedChunks.map((chunk) => chunk.id).join("+"),
        scene_ref: sceneRefs[sceneIndex],
        text: textParts[partIndex] || "",
        start_s: Number(partStart.toFixed(3)),
        end_s: Number(partEnd.toFixed(3)),
        speech_end_s: Number(Math.min(speechEnd, partEnd).toFixed(3)),
        source_chunk_ids: ownedChunks.map((chunk) => chunk.id),
      };
    });
  }
  return segments.filter(Boolean);
}

/**
 * Sincroniza timeline + storyboard a partir dos trechos (start_s/end_s) — fonte de verdade no modo chunked.
 */
export function syncTimelineFromChunkPlan({
  timelineAssets = {},
  chunkPlan = {},
  visualPrompts = [],
} = {}) {
  const timed = aggregateNarrationChunksByScene(
    resolveChunkTimeline(chunkPlan?.chunks || [], {
      preferExisting: true,
    })
  );
  if (!timed.length) {
    return {
      timelineAssets: { ...timelineAssets },
      visualPrompts: [...(visualPrompts || [])],
    };
  }

  const out = { ...timelineAssets };
  const nextPrompts = [...(visualPrompts || [])];
  const byBlock = new Map();

  for (const chunk of timed) {
    const block = Number(chunk.block) || 1;
    if (!byBlock.has(block)) byBlock.set(block, []);
    byBlock.get(block).push(chunk);
  }

  for (const [blockNum, blockChunks] of byBlock) {
    const blockKey = String(blockNum);
    let assets = [...(out[blockKey] || [])];
    const storyboardBlockScenes = nextPrompts.filter(
      (scene) =>
        Number(scene?.block) === blockNum && !isPromptOnlyKeyframe(scene)
    );
    // Se o editor já manteve somente slots reais/bloqueados, essa seleção é
    // intencional (por exemplo após excluir uma cena repetida). Não recrie o
    // slot apagado apenas porque o storyboard legado ainda o referencia.
    const hasExplicitVisualSelection =
      assets.length > 0 &&
      assets.every(
        (asset) => asset?.user_locked === true || asset?.manual_asset === true
      );
    const blockScenes =
      hasExplicitVisualSelection && assets.length < storyboardBlockScenes.length
        ? storyboardBlockScenes.slice(0, assets.length)
        : storyboardBlockScenes;
    const sortedRaw = [...blockChunks].sort((a, b) => {
      const diff = Number(a.start_s) - Number(b.start_s);
      if (diff !== 0) return diff;
      const aParts = String(a.scene_ref || "")
        .split(".")
        .map(Number);
      const bParts = String(b.scene_ref || "")
        .split(".")
        .map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart !== bPart) return aPart - bPart;
      }
      return 0;
    });
    // Um resíduo muito curto (ex.: a última palavra com 0,5s) não merece
    // criar um segundo asset vazio; ele deve permanecer na cena anterior.
    const compactedChunks = sortedRaw.reduce((merged, chunk) => {
      const duration = Number(chunk.end_s) - Number(chunk.start_s);
      const previous = merged.at(-1);
      if (previous && Number.isFinite(duration) && duration < 1.1) {
        return [
          ...merged.slice(0, -1),
          {
            ...previous,
            end_s: chunk.end_s,
            text: `${String(previous.text || "").trim()} ${String(chunk.text || "").trim()}`.trim(),
            text_tagged:
              `${String(previous.text_tagged || previous.text || "").trim()} ${String(chunk.text_tagged || chunk.text || "").trim()}`.trim(),
          },
        ];
      }
      return [...merged, chunk];
    }, []);

    const sorted = buildVisualSceneTimingSegments(compactedChunks, blockScenes);

    // Após compactar resíduos, descarte apenas placeholders excedentes. Assets
    // reais e slots bloqueados do usuário nunca são removidos automaticamente.
    if (assets.length > sorted.length) {
      assets = assets.filter(
        (asset, index) =>
          index < sorted.length ||
          Boolean(String(asset?.asset || "").trim()) ||
          asset?.user_locked === true
      );
    }

    while (assets.length < sorted.length) {
      const scene = blockScenes[assets.length];
      const sceneAsset =
        scene?.asset && typeof scene.asset === "object"
          ? scene.asset.asset
          : scene?.asset;
      assets.push({
        asset: String(sceneAsset || ""),
        type:
          scene?.asset?.type ||
          (String(scene?.type || "")
            .toLowerCase()
            .includes("vídeo")
            ? "video"
            : "image"),
      });
    }

    sorted.forEach((chunk, ordinal) => {
      const start = Number(chunk.start_s);
      const end = Number(chunk.end_s);
      const speechEnd = Number(chunk.speech_end_s ?? chunk.end_s);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        return;

      const text = String(chunk.text || "").trim();
      // O slot segue a cena visual; chunks de voz podem ser agregados ou divididos.
      const idx = Math.min(ordinal, assets.length - 1);
      assets[idx] = {
        ...assets[idx],
        narration_segment: text,
        audio_start: parseFloat(start.toFixed(3)),
        speech_end: parseFloat(speechEnd.toFixed(3)),
        fixed: parseFloat(Math.max(0.5, end - start).toFixed(3)),
        synced_to_speech: true,
        duration_from_whisper: chunkPlan?.timing_source === "whisper",
        chunk_id: chunk.id,
      };

      const sceneRef = String(chunk.scene_ref || `${blockNum}.${idx + 1}`);
      const vpIdx = nextPrompts.findIndex(
        (vp) => String(vp?.scene || "").trim() === sceneRef
      );
      if (vpIdx >= 0 && text) {
        nextPrompts[vpIdx] = { ...nextPrompts[vpIdx], narration_text: text };
      } else if (text) {
        const blockScenes = nextPrompts
          .map((vp, i) => ({ vp, i }))
          .filter(({ vp }) => Number(vp?.block) === blockNum);
        if (blockScenes[ordinal]) {
          const { i } = blockScenes[ordinal];
          nextPrompts[i] = { ...nextPrompts[i], narration_text: text };
        }
      }
    });

    out[blockKey] = assets;
  }

  return { timelineAssets: out, visualPrompts: nextPrompts };
}

/**
 * Reconstrói word_transcripts com 1 segmento por trecho — evita Whisper colapsar várias cenas em 1 bloco.
 */
export function mergeWhisperTranscriptsWithChunkPlan(
  chunkPlan = {},
  flatWords = []
) {
  const timed = resolveChunkTimeline(chunkPlan?.chunks || [], {
    preferExisting: true,
  });
  if (!timed.length) return [];

  return timed.map((chunk, idx) => {
    const start = Number(chunk.start_s) || 0;
    const end = Number(chunk.end_s) || start;
    const duration = Math.max(0.05, end - start);
    const text = String(chunk.caption_text || chunk.text || "").trim();
    const plain = stripTtsMarkersForPlainText(text);
    const wordsInWindow = (flatWords || []).filter(
      (w) => Number(w.start) >= start - 0.08 && Number(w.start) < end + 0.12
    );

    let wordEntries;
    if (wordsInWindow.length >= 2) {
      const whisperRelative = wordsInWindow.map((w) => ({
        word: String(w.word || "").startsWith(" ")
          ? String(w.word)
          : ` ${String(w.word || "").trim()}`,
        start: Math.max(0, Number(w.start) - start),
        end: Math.max(0.05, Number(w.end) - start),
      }));
      const quality = assessWhisperWordQuality(
        plain,
        whisperRelative,
        duration
      );
      wordEntries = quality.ok
        ? clampWordEntriesToDuration(whisperRelative, duration)
        : synthesizeWordEntriesForDuration(plain, duration);
    } else {
      wordEntries = synthesizeWordEntriesForDuration(plain, duration);
    }

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

/**
 * Pós-Whisper em modo chunked: restaura block_timings + timeline pelo plano de trechos.
 * Retorna null se não for narração por trechos (caller usa syncProjectTimelineAfterWhisper).
 */
/** Atualiza visual_prompts com durações do plano de trechos + assets da timeline (preserva uploads). */
export function applyChunkPlanToVisualPrompts(
  visualPrompts = [],
  chunkPlan = {},
  timelineAssets = {}
) {
  const rawChunks = chunkPlan?.chunks || [];
  const timed =
    rawChunks.length &&
    rawChunks.every(
      (c) =>
        Number.isFinite(Number(c.start_s)) && Number.isFinite(Number(c.end_s))
    )
      ? rawChunks
      : computeChunkTimeline(rawChunks);
  const chunkByScene = new Map(
    aggregateNarrationChunksByScene(timed).map((c) => [
      String(c.scene_ref || "").trim(),
      c,
    ])
  );
  const sceneOrdinalInBlock = new Map();
  const blockCounters = new Map();
  for (const vp of visualPrompts || []) {
    const blockKey = String(Number(vp?.block) || 1);
    const ord = blockCounters.get(blockKey) ?? 0;
    blockCounters.set(blockKey, ord + 1);
    const sceneRef = String(vp?.scene || vp?.scene_ref || "").trim();
    if (sceneRef) sceneOrdinalInBlock.set(`${blockKey}:${sceneRef}`, ord);
  }

  return (visualPrompts || []).map((vp) => {
    const sceneRef = String(vp?.scene || vp?.scene_ref || "").trim();
    const blockNum = Number(vp?.block) || 1;
    const chunk = sceneRef ? chunkByScene.get(sceneRef) : null;

    const blockKey = String(blockNum);
    const assets = timelineAssets[blockKey] || [];
    const ordInBlock =
      sceneRef && sceneOrdinalInBlock.has(`${blockKey}:${sceneRef}`)
        ? sceneOrdinalInBlock.get(`${blockKey}:${sceneRef}`)
        : 0;
    const assetIdx = Math.min(ordInBlock, Math.max(assets.length - 1, 0));
    const slot = assets[assetIdx];

    let next = { ...vp };
    if (
      chunk &&
      Number.isFinite(Number(chunk.start_s)) &&
      Number.isFinite(Number(chunk.end_s))
    ) {
      const start = Number(chunk.start_s);
      const end = Number(chunk.end_s);
      const dur =
        slot?.synced_to_speech && Number.isFinite(Number(slot?.fixed))
          ? Number(slot.fixed)
          : parseFloat(Math.max(0.5, end - start).toFixed(1));
      next = {
        ...next,
        duration: `${dur} segundos`,
        duration_seconds: dur,
        duration_from_whisper: true,
        speech_start: parseFloat(start.toFixed(3)),
        speech_end: parseFloat(end.toFixed(3)),
        narration_text:
          String(chunk.text || next.narration_text || "").trim() ||
          next.narration_text,
      };
    }
    if (slot?.asset) {
      next.asset = {
        ...(next.asset && typeof next.asset === "object" ? next.asset : {}),
        asset: slot.asset,
        type: slot.type || next.asset?.type || "image",
        ...(slot.fixed != null ? { fixed: slot.fixed } : {}),
      };
    }
    return next;
  });
}

export function applyChunkedTimelineAfterWhisper(
  projDir,
  { config = {}, storyboard = {}, wordTranscripts = [], flatWords = [] } = {}
) {
  const chunkPlan = storyboard?.narration_chunk_plan;
  if (
    !isChunkedNarrationProject(config, storyboard) ||
    !chunkPlan?.chunks?.length
  ) {
    return null;
  }
  const timedChunks = computeChunkTimeline(chunkPlan.chunks);
  if (
    !timedChunks.some(
      (c) => Number(c.duration_s) > 0 && Number.isFinite(Number(c.start_s))
    )
  ) {
    return null;
  }
  let canonicalWords = Array.isArray(flatWords) ? flatWords : [];
  const rawTranscriptPath = path.join(projDir, "whisper_raw_transcript.json");
  if (fs.existsSync(rawTranscriptPath)) {
    try {
      const rawWords = extractWhisperRawWords(
        JSON.parse(fs.readFileSync(rawTranscriptPath, "utf8"))
      );
      if (rawWords.length) canonicalWords = rawWords;
    } catch {
      // Mantém o alinhamento já fornecido quando o artefato bruto está inválido.
    }
  }
  return applyChunkedNarrationSyncToProject(projDir, {
    chunkPlan: { ...chunkPlan, chunks: timedChunks },
    config,
    storyboard,
    whisperTranscripts: wordTranscripts,
    flatWords: canonicalWords,
  });
}

export function applyChunkedNarrationSyncToProject(
  projDir,
  {
    chunkPlan,
    config = {},
    storyboard = {},
    whisperTranscripts = null,
    flatWords = [],
  } = {}
) {
  if (!chunkPlan?.chunks?.length) {
    return { config, storyboard, timings: null, transcripts: null };
  }

  const flat = flatWords?.length
    ? flatWords
    : Array.isArray(whisperTranscripts) && whisperTranscripts.length
      ? flattenWordTranscripts(whisperTranscripts)
      : [];
  const alignedPlan = flat.length
    ? alignNarrationChunkPlanToWhisper(chunkPlan, flat)
    : chunkPlan;
  const timedPlan = {
    ...alignedPlan,
    chunks: resolveChunkTimeline(alignedPlan.chunks, {
      preferExisting: true,
    }),
  };

  const synced = syncTimelineFromChunkPlan({
    timelineAssets: config.timeline_assets || {},
    chunkPlan: timedPlan,
    visualPrompts: storyboard.visual_prompts || [],
  });

  let transcripts = buildWordTranscriptsFromChunks(timedPlan.chunks);
  if (flat.length) {
    transcripts = mergeWhisperTranscriptsWithChunkPlan(timedPlan, flat);
  }

  const timings = buildBlockTimingsFromChunks(timedPlan.chunks);
  const tightenedTimeline = tightenTimelineRetentionDurations(
    synced.timelineAssets,
    timings
  );
  let nextConfig = {
    ...config,
    timeline_assets: tightenedTimeline,
    narration_mode: NARRATION_MODE_CHUNKED,
  };
  const visualPrompts = applyChunkPlanToVisualPrompts(
    synced.visualPrompts,
    timedPlan,
    tightenedTimeline
  );
  let nextStoryboard = {
    ...storyboard,
    visual_prompts: visualPrompts,
    narration_chunk_plan: timedPlan,
  };

  const temporal = applyNarrationFirstVisualPlan({
    storyboard: nextStoryboard,
    timelineAssets: nextConfig.timeline_assets,
    chunkPlan: timedPlan,
  });
  if (temporal.applied) {
    nextStoryboard = temporal.storyboard;
    nextConfig = { ...nextConfig, timeline_assets: temporal.timelineAssets };
  }

  fs.writeFileSync(
    path.join(projDir, "config_qanat.json"),
    JSON.stringify(nextConfig, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(projDir, "storyboard.json"),
    JSON.stringify(nextStoryboard, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(projDir, "block_timings.json"),
    JSON.stringify(timings, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(projDir, "word_transcripts.json"),
    JSON.stringify(transcripts, null, 2),
    "utf8"
  );

  return {
    config: nextConfig,
    storyboard: nextStoryboard,
    timings,
    transcripts,
  };
}

export function buildWordTranscriptsFromChunks(chunks = []) {
  return (chunks || []).map((chunk, idx) => {
    const start = Number(chunk.start_s) || 0;
    const duration = Math.max(0.05, (Number(chunk.end_s) || start) - start);
    const end = start + duration;
    const plain = stripTtsMarkersForPlainText(
      chunk.caption_text || chunk.text || chunk.text_tagged || ""
    );
    const wordEntries = synthesizeWordEntriesForDuration(plain, duration);
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
    const sourceNarration = String(storyboard.narrative_script || "");
    const sourceHash = assertNarrationChunksPreserveSource(
      aiChunks,
      sourceNarration
    );
    return normalizeNarrationChunkPlan(
      {
        chunks: stabilizeNarrationChunkPauses(aiChunks),
        default_voice: defaultVoice,
        source: "ai",
        source_narration_hash: sourceHash,
        planned_at: new Date().toISOString(),
      },
      { storyboard, config }
    );
  }
  return buildHeuristicNarrationChunks({ storyboard, config, defaultVoice });
}

export function formatNarrationChunkPlanLog(plan = {}) {
  const lines = [`Plano de narração: ${plan.chunk_count || 0} trecho(s).`];
  for (const c of plan.chunks || []) {
    lines.push(
      `  ${c.id} bloco ${c.block} · ${c.scene_ref} · pausa ${c.pause_after_ms}ms` +
        ` · ${c.voice?.engine}/${c.voice?.voice}` +
        (c.duration_s ? ` · ${c.duration_s.toFixed(1)}s` : "")
    );
  }
  if (plan.total_duration)
    lines.push(`Duração total estimada: ${plan.total_duration.toFixed(1)}s`);
  return lines;
}

function runFfmpeg(args, onLog = () => {}) {
  const ff = getFfmpegStatus();
  if (!ff.binary) throw new Error("ffmpeg não encontrado no PATH.");
  return new Promise((resolve, reject) => {
    const child = spawn(ff.binary, args, {
      shell: false,
      env: buildPythonSpawnEnv(),
    });
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
    const child = spawn(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { shell: false }
    );
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
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
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    String(dur),
    "-q:a",
    "9",
    "-acodec",
    "libmp3lame",
    outPath,
  ]);
}

export async function synthesizeNarrationChunkAudio(
  text,
  voiceRef,
  {
    outputPath,
    workDir,
    workspaceDir,
    projDir,
    useTagged = true,
    taggedText = "",
    stripEmphasis = true,
    onLog = () => {},
  } = {}
) {
  const voice = normalizeVoiceRef(voiceRef);
  const plain = String(text || "").trim();
  if (plain.length < 2) throw new Error("Trecho vazio.");
  const engine = voice.engine;
  const sanitizedTagged = sanitizeNarrationChunkTaggedText(taggedText, plain);

  if (engine === "kokoro") {
    const result = await synthesizeKokoroNarration(plain, {
      voice: voice.voice,
      speed: voice.speed,
      outputPath,
      workDir: workDir || path.dirname(outputPath),
      onLog,
    });
    return {
      engine: "kokoro",
      voice: result.voice,
      durationSeconds: result.durationSeconds,
    };
  }

  if (engine === "edge") {
    let EdgeTTS;
    try {
      ({ EdgeTTS } = await import("edge-tts-universal"));
    } catch {
      throw new Error("edge-tts-universal não instalado.");
    }
    const tts = new EdgeTTS(plain, voice.voice || "pt-BR-AntonioNeural", {
      rate: voice.rate,
      pitch: voice.pitch,
    });
    const result = await tts.synthesize();
    fs.writeFileSync(outputPath, Buffer.from(await result.audio.arrayBuffer()));
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "edge", voice: voice.voice, durationSeconds };
  }

  if (engine === "chatterbox" || engine === "chatterbox-tts") {
    const cbConfig = loadChatterboxConfig({
      workspaceDir,
      projectDir: projDir,
    });
    const tagPlatform = String(voice.voice).includes("turbo")
      ? "turbo"
      : "chatterbox";
    const tagged = sanitizedTagged;
    const textForTts =
      useTagged && tagged.length > 2
        ? convertCinematicMarkersForTts(tagged, tagPlatform, {
            stripEmphasis: true,
          })
        : plain;
    const result = await synthesizeChatterboxNarration(textForTts, {
      voice: voice.voice || CHATTERBOX_DEFAULT_VOICE,
      outputPath,
      workDir: workDir || path.dirname(outputPath),
      config: cbConfig,
      onLog,
    });
    return {
      engine: "chatterbox",
      voice: result.voice,
      durationSeconds: result.durationSeconds,
    };
  }

  if (
    engine === "qwen3" ||
    engine === "qwen3-tts" ||
    engine === "qwen" ||
    engine === "qwen_tts"
  ) {
    const qConfig = loadQwen3TtsConfig({
      workspaceDir,
      projectDir: projDir,
    });
    const voiceId = voice.voice || QWEN3_TTS_DEFAULT_VOICE;
    // Prefere texto com tags (tom/pausa/ênfase) → instruct + fala limpa
    const sourceText =
      useTagged && sanitizedTagged.length > 2 ? sanitizedTagged : plain;
    // sanitizeNarrationChunkTaggedText remove [ênfase]; se o plain tinha tags
    // ricas no original, tenta o tagged bruto antes da sanitização forte
    const taggedRaw = String(taggedText || "").trim();
    const expressiveSource =
      useTagged && taggedRaw.length > 2 ? taggedRaw : sourceText;
    const prepared = prepareQwen3ExpressiveNarration(expressiveSource, {
      voiceId,
    });
    const result = await synthesizeQwen3TtsNarration(prepared.text, {
      voice: voiceId,
      outputPath,
      workDir: workDir || path.dirname(outputPath),
      config: qConfig,
      instruct: prepared.instruct,
      applyTags: false,
      minChars: 2,
      onLog,
    });
    return {
      engine: "qwen3",
      voice: result.voice,
      durationSeconds: result.durationSeconds,
      speaker: result.speaker,
      language: result.language,
      instruct: prepared.instruct,
      tags: prepared.tags,
    };
  }

  if (engine === "fish" || engine === "fish-speech") {
    const fishConfig = loadFishSpeechConfig({
      workspaceDir,
      projectDir: projDir,
    });
    const tagged = sanitizedTagged;
    const textForTts =
      useTagged && tagged.length > 2
        ? convertCinematicMarkersForTts(tagged, "fish", { stripEmphasis: true })
        : plain;
    const result = await fetchFishSpeechAudio(textForTts, {
      referenceId: voice.voice,
      config: fishConfig,
      onLog,
      independentChunk: true,
    });
    fs.writeFileSync(outputPath, result.buffer);
    const durationSeconds = await probeAudioDuration(outputPath);
    return { engine: "fish", voice: voice.voice, durationSeconds };
  }

  if (engine === "voicebox") {
    const vbConfig = loadVoiceboxConfig({ workspaceDir, projectDir: projDir });
    const textForTts =
      useTagged && sanitizedTagged.length > 2 ? sanitizedTagged : plain;
    await synthesizeVoiceboxNarration(textForTts, {
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

export async function assembleNarrationChunksToMaster(
  projDir,
  plan,
  { onLog = () => {} } = {}
) {
  const chunks = plan?.chunks || [];
  if (!allNarrationChunksHaveAudio(plan, projDir)) {
    throw new Error(
      "Montagem master exige todos os trechos com áudio — gere os trechos faltantes antes."
    );
  }
  const generated = chunks.filter((c) => {
    const rel = String(c.audio_file || chunkAudioRelativePath(c.id)).replace(
      /\\/g,
      "/"
    );
    return fs.existsSync(path.join(projDir, rel));
  });
  if (!generated.length)
    throw new Error("Nenhum trecho com áudio gerado para montar.");

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
  onLog(
    `Montando ${generated.length} trecho(s) + pausas → ${NARRATION_MASTER_FILENAME}`
  );
  await runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-acodec",
      "libmp3lame",
      "-q:a",
      "2",
      masterPath,
    ],
    onLog
  );

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

  const narrationMode =
    config.narration_mode === NARRATION_MODE_MASTER
      ? NARRATION_MODE_MASTER
      : config.narration_mode || NARRATION_MODE_CHUNKED;
  const cfg = { ...config, narration_mode: narrationMode };
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
  return { storyboard, config: cfg };
}

export function writeTimingsFromChunkPlan(projDir, plan) {
  const timings = buildBlockTimingsFromChunks(plan.chunks);
  const transcripts = buildWordTranscriptsFromChunks(plan.chunks);
  fs.writeFileSync(
    path.join(projDir, "block_timings.json"),
    JSON.stringify(timings, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(projDir, "word_transcripts.json"),
    JSON.stringify(transcripts, null, 2),
    "utf8"
  );
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

/** Todos os trechos do plano têm MP3 no disco — pré-requisito para montar o master. */
export function allNarrationChunksHaveAudio(plan, projDir) {
  const chunks = plan?.chunks || [];
  if (!chunks.length) return false;
  return chunks.every((c) => {
    const rel = String(c.audio_file || chunkAudioRelativePath(c.id)).replace(
      /\\/g,
      "/"
    );
    return fs.existsSync(path.join(projDir, rel));
  });
}

export async function generateNarrationChunksTts(
  projDir,
  {
    plan,
    chunkIds = null,
    defaultVoice = {},
    workspaceDir = null,
    useTagged = true,
    stripEmphasis = true,
    assembleMaster = true,
    onLog = () => {},
    onProgress = () => {},
    onChunkUpdate = () => {},
  } = {}
) {
  if (!plan?.chunks?.length) throw new Error("Plano de trechos vazio.");

  const chunksDir = path.join(projDir, NARRATION_CHUNKS_DIR);
  fs.mkdirSync(chunksDir, { recursive: true });

  const idSet =
    Array.isArray(chunkIds) && chunkIds.length
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
    onLog(
      `[Chunks] TTS ${c.id} bloco ${c.block} (${c.voice?.engine}/${c.voice?.voice})`
    );

    const rel = chunkAudioRelativePath(c.id);
    const outPath = path.join(projDir, rel);
    const voice = normalizeVoiceRef(
      c.voice || {},
      normalizeVoiceRef(defaultVoice, plan.default_voice)
    );
    const archivedVersion = archiveNarrationChunkAudio(projDir, c);
    if (archivedVersion) {
      updatedChunks[idx] = {
        ...c,
        versions: [...(c.versions || []), archivedVersion],
      };
    }

    updatedChunks[idx] = {
      ...updatedChunks[idx],
      voice,
      status: "generating",
      error: null,
    };
    await onChunkUpdate(
      normalizeNarrationChunkPlan({ ...plan, chunks: updatedChunks }, {}),
      updatedChunks[idx]
    );

    let result;
    try {
      result = await synthesizeNarrationChunkAudio(c.text, voice, {
        outputPath: outPath,
        workDir: chunksDir,
        workspaceDir,
        projDir,
        useTagged,
        taggedText: c.text_tagged,
        stripEmphasis,
        onLog,
      });
    } catch (err) {
      updatedChunks[idx] = {
        ...updatedChunks[idx],
        voice,
        status: "failed",
        error: err?.message || String(err),
        failed_at: new Date().toISOString(),
      };
      if (archivedVersion)
        fs.copyFileSync(path.join(projDir, archivedVersion.file), outPath);
      await onChunkUpdate(
        normalizeNarrationChunkPlan({ ...plan, chunks: updatedChunks }, {}),
        updatedChunks[idx]
      );
      throw err;
    }

    const duration =
      Number(result.durationSeconds) || (await probeAudioDuration(outPath));
    updatedChunks[idx] = {
      ...updatedChunks[idx],
      voice,
      audio_file: rel,
      duration_s: Number(duration.toFixed(3)),
      generation_signature: buildNarrationChunkSignature(c, voice),
      generated_at: new Date().toISOString(),
      error: null,
      status: "generated",
    };
    await onChunkUpdate(
      normalizeNarrationChunkPlan({ ...plan, chunks: updatedChunks }, {}),
      updatedChunks[idx]
    );
  }

  let nextPlan = normalizeNarrationChunkPlan(
    { ...plan, chunks: updatedChunks },
    {}
  );

  const readyForMaster = allNarrationChunksHaveAudio(nextPlan, projDir);
  if (readyForMaster) {
    nextPlan = normalizeNarrationChunkPlan(
      {
        ...nextPlan,
        chunks: computeChunkTimeline(nextPlan.chunks),
      },
      {}
    );
  }

  if (assembleMaster && readyForMaster) {
    onProgress("assemble", "Montando narração master com pausas…", 92);
    await assembleNarrationChunksToMaster(projDir, nextPlan, { onLog });
    writeTimingsFromChunkPlan(projDir, nextPlan);
    onProgress("done", "Narração por trechos concluída.", 100);
  } else if (assembleMaster) {
    onLog("[Chunks] Montagem master adiada — ainda faltam trechos sem áudio.");
    onProgress(
      "done",
      "Trecho(s) gerado(s). Gere todos para montar o master.",
      100
    );
  }

  return nextPlan;
}
