/**
 * Planejamento de trilha por emoção/temática (longos).
 * Segmentos temporais atravessam blocos; emoções iguais adjacentes são fundidas.
 */

import {
  moodToClimaxMode,
  moodToDuckStrength,
  moodToSearchTheme,
  scoreMoodFromText,
  pickDominantMood,
} from "./bgmSonoplastia.js";

export const EMOTION_TYPES = [
  "intro", "calm", "wonder", "tension", "epic", "climax", "resolve", "neutral",
];

const MIN_SEGMENT_DURATION = 8;
const EMOTION_CROSSFADE_S = 4;
const DEFAULT_FADE_IN = 2.5;
const DEFAULT_FADE_OUT = 4;

export function resolveBgmMode(config = {}, storyboard = {}, format = "LONG") {
  if (format === "SHORT" || config.use_single_bgm === true) return "single";
  if (config.bgm_mode === "block") return "block";
  if (config.bgm_mode === "emotion") return "emotion";
  if (storyboard?.bgm_emotion_plan?.segments?.length) return "emotion";
  return "emotion";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeEmotion(raw) {
  const e = String(raw || "").trim().toLowerCase();
  if (EMOTION_TYPES.includes(e)) return e;
  if (e === "action" || e === "energy") return "epic";
  if (e === "mystery" || e === "suspense") return "tension";
  if (e === "hope" || e === "uplift") return "resolve";
  if (e === "curiosity" || e === "discovery") return "wonder";
  return "neutral";
}

function segmentDuration(seg) {
  return Math.max(0, Number(seg.end) - Number(seg.start));
}

function enrichSegment(seg, nicheMood = null, pace = "normal") {
  const emotion = normalizeEmotion(seg.emotion);
  const climaxMode = seg.climax_mode || seg.climaxMode || moodToClimaxMode(emotion, pace);
  const duckStrength = seg.duck_strength || seg.duckStrength || moodToDuckStrength(emotion, pace);
  const searchTheme = String(seg.search_theme || seg.searchTheme || "").trim()
    || moodToSearchTheme(emotion, nicheMood);
  return {
    ...seg,
    emotion,
    climax_mode: climaxMode,
    duck_strength: duckStrength,
    search_theme: searchTheme,
    fade_in_s: Number(seg.fade_in_s ?? seg.fadeInS) || DEFAULT_FADE_IN,
    fade_out_s: Number(seg.fade_out_s ?? seg.fadeOutS) || DEFAULT_FADE_OUT,
  };
}

/** Funde segmentos adjacentes com a mesma emoção. */
export function mergeAdjacentSameEmotionSegments(segments = []) {
  if (!segments.length) return [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged = [];

  for (const raw of sorted) {
    const seg = { ...raw };
    const last = merged[merged.length - 1];
    if (last && normalizeEmotion(last.emotion) === normalizeEmotion(seg.emotion)) {
      last.end = Math.max(last.end, seg.end);
      last.scene_refs = [...new Set([
        ...(last.scene_refs || []),
        ...(seg.scene_refs || []),
      ])];
      if (seg.narration_excerpt && !String(last.narration_excerpt || "").includes(seg.narration_excerpt)) {
        last.narration_excerpt = `${last.narration_excerpt || ""} ${seg.narration_excerpt}`.trim().slice(0, 280);
      }
      if (seg.mood_label && last.mood_label !== seg.mood_label) {
        last.mood_label = last.mood_label || seg.mood_label;
      }
      continue;
    }
    merged.push(seg);
  }

  return merged.map((seg, idx) => ({
    ...seg,
    id: seg.id || `seg-${String(idx + 1).padStart(2, "0")}`,
  }));
}

/**
 * Costura segmentos emocionais sem silêncio: crossfade sobreposto entre faixas.
 * Transição no ponto médio entre fim do segmento anterior e início do próximo.
 */
export function stitchEmotionSegmentsContinuous(segments = [], totalDuration = 0, crossfadeS = EMOTION_CROSSFADE_S) {
  if (!segments.length) return [];
  const total = Math.max(
    Number(totalDuration) || 0,
    ...segments.map((seg) => Number(seg.end) || 0),
  );
  const xfade = Math.max(2, Number(crossfadeS) || EMOTION_CROSSFADE_S);
  const sorted = [...segments].sort((a, b) => a.start - b.start).map((seg) => ({ ...seg }));

  sorted[0].start = 0;
  sorted[0].fade_in_s = Number(sorted[0].fade_in_s ?? sorted[0].fadeInS) || DEFAULT_FADE_IN;

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const curEnd = Number(cur.end) || 0;
    const nextStart = Number(next.start) || curEnd;
    const boundary = (curEnd + nextStart) / 2;

    cur.end = boundary + xfade / 2;
    next.start = Math.max(0, boundary - xfade / 2);
    cur.fade_out_s = xfade;
    next.fade_in_s = xfade;
  }

  sorted[sorted.length - 1].end = total;
  sorted[sorted.length - 1].fade_out_s = Number(
    sorted[sorted.length - 1].fade_out_s ?? sorted[sorted.length - 1].fadeOutS,
  ) || DEFAULT_FADE_OUT;

  return sorted.map((seg, idx) => ({
    ...seg,
    id: seg.id || `seg-${String(idx + 1).padStart(2, "0")}`,
    duration: Math.max(0.5, Number(seg.end) - Number(seg.start)),
  }));
}

export function normalizeEmotionSegments(rawSegments = [], totalDuration = 0, nicheMood = null) {
  const total = Math.max(Number(totalDuration) || 0, 1);
  const parsed = (rawSegments || []).map((seg, idx) => {
    const start = clamp(Number(seg.start) || 0, 0, total);
    const end = clamp(Number(seg.end) || start + 20, start + MIN_SEGMENT_DURATION, total);
    return enrichSegment({
      id: seg.id || `seg-${String(idx + 1).padStart(2, "0")}`,
      start,
      end: Math.max(end, start + MIN_SEGMENT_DURATION),
      emotion: normalizeEmotion(seg.emotion),
      mood_label: String(seg.mood_label || seg.moodLabel || "").trim() || undefined,
      scene_refs: Array.isArray(seg.scene_refs)
        ? seg.scene_refs.map(String)
        : Array.isArray(seg.sceneRefs)
          ? seg.sceneRefs.map(String)
          : [],
      narration_excerpt: String(seg.narration_excerpt || seg.narrationExcerpt || "").trim().slice(0, 280),
      climax_mode: seg.climax_mode || seg.climaxMode,
      duck_strength: seg.duck_strength || seg.duckStrength,
      search_theme: seg.search_theme || seg.searchTheme,
      fade_in_s: seg.fade_in_s ?? seg.fadeInS,
      fade_out_s: seg.fade_out_s ?? seg.fadeOutS,
    }, nicheMood);
  }).filter((s) => segmentDuration(s) >= MIN_SEGMENT_DURATION * 0.5);

  let merged = mergeAdjacentSameEmotionSegments(parsed);
  merged = stitchEmotionSegmentsContinuous(merged, total);
  return merged.map((seg, idx) => ({
    ...seg,
    id: seg.id || `seg-${String(idx + 1).padStart(2, "0")}`,
    duration: segmentDuration(seg),
  }));
}

/** Heurística offline: blocos → emoção → merge. */
export function buildHeuristicEmotionSegments({
  config = {},
  storyboard = {},
  blockRanges = [],
  wordTranscripts = [],
  totalDuration = 0,
  nicheMood = null,
} = {}) {
  const phrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const total = Number(totalDuration)
    || blockRanges.reduce((max, r) => Math.max(max, r.start + r.duration), 0)
    || 120;

  const draft = blockRanges.map((range, index) => {
    const block = range.block;
    const phrase = phrases.find((p) => Number(p.block) === block);
    const phraseText = String(phrase?.phrase || phrase?.text || "").trim();
    const sceneTexts = visualPrompts
      .filter((vp) => Number(vp.block) === block)
      .map((vp) => String(vp.narration_text || "").trim())
      .join(" ");
    const combined = [phraseText, sceneTexts, storyboard.narrative_script || ""].filter(Boolean).join(" ");
    const scores = scoreMoodFromText(combined);
    let emotion = pickDominantMood(scores, "neutral");
    if (index === 0) emotion = "intro";
    else if (index === blockRanges.length - 1 && blockRanges.length >= 3) emotion = "climax";
    else if (index === blockRanges.length - 2 && blockRanges.length >= 4) emotion = "resolve";

    const sceneRefs = visualPrompts
      .filter((vp) => Number(vp.block) === block)
      .map((vp) => String(vp.scene || `${block}.1`));

    return {
      id: `seg-${String(index + 1).padStart(2, "0")}`,
      start: range.start,
      end: Math.min(total, range.start + range.duration),
      emotion,
      mood_label: emotion,
      scene_refs: sceneRefs,
      narration_excerpt: (phraseText || sceneTexts).slice(0, 200),
    };
  });

  return normalizeEmotionSegments(draft, total, nicheMood);
}

export function buildBgmEmotionPlanPrompt({
  narrativeScript = "",
  visualPrompts = [],
  blockRanges = [],
  totalDuration = 0,
  niche = "Geral",
  sceneTiming = {},
} = {}) {
  const sceneLines = (visualPrompts || []).slice(0, 40).map((vp) => {
    const sceneId = String(vp.scene || `${vp.block || 1}.1`);
    const start = sceneTiming.sceneStarts?.[sceneId];
    const text = String(vp.narration_text || "").trim().slice(0, 160);
    return `- Cena ${sceneId}${Number.isFinite(start) ? ` @ ${start.toFixed(1)}s` : ""}: ${text}`;
  }).join("\n");

  const blockLines = (blockRanges || []).map((r) => (
    `Bloco ${r.block}: ${r.start.toFixed(1)}s → ${(r.start + r.duration).toFixed(1)}s`
  )).join("\n");

  return `Você é sonoplasta documental. Planeje a trilha sonora de um vídeo LONGO por EMOÇÃO/TEMÁTICA da narração — NÃO uma faixa por bloco narrativo.

Nicho: "${niche}"
Duração total: ~${Number(totalDuration).toFixed(1)}s

REGRAS OBRIGATÓRIAS:
1. Segmentos temporais com start/end em segundos absolutos no vídeo
2. emotion: intro | calm | wonder | tension | epic | climax | resolve | neutral
3. Fundir trechos vizinhos com a MESMA emoção (retorne já fundido)
4. Evite trocar trilha a cada bloco — um segmento pode cobrir vários blocos
5. Cobertura CONTÍNUA do vídeo — segmentos podem se sobrepor ~4s em crossfade; NUNCA deixe silêncio entre trilhas
6. Transição suave: a próxima faixa entra enquanto a anterior sai (como documentário profissional)
7. climax_mode: soft | rise | peak — prefira rise para transições narrativas graduais
8. duck_strength: light ou normal na maioria; strong só em clímax breve
9. search_theme: query em inglês para Epidemic Sound
10. Alinhe mudanças de emoção a viradas narrativas (2–5 segmentos em vídeos de 2–15 min)

BLOCOS (referência temporal):
${blockLines || "(sem timings)"}

CENAS E NARRAÇÃO:
${sceneLines || "(sem cenas)"}

ROTEIRO (trecho):
${String(narrativeScript || "").slice(0, 4000)}

Retorne APENAS JSON:
{
  "segments": [
    {
      "id": "seg-01",
      "start": 0,
      "end": 45.5,
      "emotion": "wonder",
      "mood_label": "Curiosidade inicial",
      "scene_refs": ["1.1", "1.2"],
      "narration_excerpt": "trecho representativo",
      "search_theme": "curious discovery ambient documentary",
      "climax_mode": "rise",
      "duck_strength": "light",
      "fade_in_s": 2,
      "fade_out_s": 2.5
    }
  ]
}`;
}

export function parseAiEmotionPlanResponse(data = {}) {
  const raw = data.segments || data.bgm_emotion_plan?.segments || data.bgm_emotion_segments || [];
  return Array.isArray(raw) ? raw : [];
}

export function buildBgmEmotionPlan({
  aiSegments = null,
  config = {},
  storyboard = {},
  blockRanges = [],
  wordTranscripts = [],
  totalDuration = 0,
  nicheMood = null,
} = {}) {
  const total = Number(totalDuration)
    || blockRanges.reduce((max, r) => Math.max(max, r.start + r.duration), 0)
    || 120;

  const segments = aiSegments?.length
    ? normalizeEmotionSegments(aiSegments, total, nicheMood)
    : buildHeuristicEmotionSegments({
      config,
      storyboard,
      blockRanges,
      wordTranscripts,
      totalDuration: total,
      nicheMood,
    });

  return {
    version: 1,
    mode: "emotion",
    planned_at: new Date().toISOString(),
    segment_count: segments.length,
    total_duration: total,
    segments,
  };
}

export function segmentsNeedingBgmDownload(segments = [], mappings = [], fileExists = () => false) {
  const byId = new Map((mappings || []).map((m) => [String(m.segment_id || m.id), m]));
  return (segments || []).filter((seg) => {
    const mapping = byId.get(seg.id);
    if (!mapping?.file) return true;
    return !fileExists(mapping.file);
  });
}

export function formatEmotionPlanLog(plan) {
  const lines = [];
  for (const seg of plan?.segments || []) {
    lines.push(
      `[BGM Emoção] ${seg.id} ${seg.start.toFixed(1)}–${seg.end.toFixed(1)}s`
      + ` | ${seg.emotion} (${seg.mood_label || ""})`
      + ` | ${seg.climax_mode} duck=${seg.duck_strength}`
      + ` | "${seg.search_theme}"`,
    );
  }
  return lines;
}

/** Mapeia arquivos locais numerados (1.mp3…) ou ES_* aos segmentos do plano emocional. */
export function buildEmotionMappingsFromLocalFiles(segments = [], availableFiles = []) {
  const excluded = new Set([
    "narracao_mestra_premium.mp3",
    "trilha_documentario.mp3",
  ]);
  const musicFiles = (availableFiles || [])
    .filter((fileName) => fileName && !excluded.has(String(fileName).toLowerCase()))
    .filter((fileName) => /^(\d+)\.mp3$/i.test(fileName) || /^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName))
    .sort((a, b) => {
      const blockA = /^(\d+)\.mp3$/i.exec(a);
      const blockB = /^(\d+)\.mp3$/i.exec(b);
      if (blockA && blockB) return Number(blockA[1]) - Number(blockB[1]);
      return String(a).localeCompare(String(b));
    });

  if (!musicFiles.length || !segments.length) return [];

  return segments.map((seg, idx) => ({
    segment_id: seg.id,
    file: musicFiles[Math.min(idx, musicFiles.length - 1)],
    start: Number(seg.start) || 0,
    duration: Math.max(0.5, Number(seg.duration ?? (seg.end - seg.start)) || 0.5),
    emotion: seg.emotion,
    climax_mode: seg.climax_mode,
    duck_strength: seg.duck_strength,
    search_theme: seg.search_theme,
    fade_in_s: seg.fade_in_s,
    fade_out_s: seg.fade_out_s,
  }));
}

/** Atualiza bgm_emotion_mappings com timings costurados do plano (preserva arquivos escolhidos). */
export function syncEmotionMappingsToPlan(plan = {}, mappings = []) {
  const segments = plan?.segments || [];
  const byId = new Map((mappings || []).map((m) => [String(m.segment_id || m.id), m]));
  return segments.map((seg) => {
    const prev = byId.get(seg.id) || {};
    const start = Number(seg.start) || 0;
    const duration = Math.max(0.5, Number(seg.duration ?? (seg.end - seg.start)) || 0.5);
    return {
      segment_id: seg.id,
      file: prev.file || "",
      start,
      duration,
      emotion: seg.emotion,
      climax_mode: seg.climax_mode || prev.climax_mode,
      duck_strength: seg.duck_strength || prev.duck_strength,
      search_theme: seg.search_theme || prev.search_theme,
      fade_in_s: seg.fade_in_s,
      fade_out_s: seg.fade_out_s,
    };
  }).filter((m) => m.file);
}