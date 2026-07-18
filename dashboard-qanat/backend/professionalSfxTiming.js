const CATEGORY_RULES = {
  ambience: {
    minDuration: 2,
    maxDuration: 10,
    defaultDuration: 4,
    minVolume: 0.035,
    maxVolume: 0.1,
  },
  transition: {
    minDuration: 0.35,
    maxDuration: 2.5,
    defaultDuration: 0.9,
    minVolume: 0.06,
    maxVolume: 0.16,
  },
  detail: {
    minDuration: 0.5,
    maxDuration: 3.2,
    defaultDuration: 1.2,
    minVolume: 0.05,
    maxVolume: 0.14,
  },
  impact: {
    minDuration: 0.35,
    maxDuration: 3.5,
    defaultDuration: 0.8,
    minVolume: 0.08,
    maxVolume: 0.2,
  },
  riser: {
    minDuration: 0.8,
    maxDuration: 4,
    defaultDuration: 1.8,
    minVolume: 0.05,
    maxVolume: 0.14,
  },
};

const CATEGORY_TITLE_TERMS = {
  ambience: {
    positive: [
      "ambience",
      "ambient",
      "atmosphere",
      "room tone",
      "wind",
      "rain",
      "crowd",
      "hum",
    ],
    negative: ["hit", "impact", "whoosh", "riser", "sting", "click"],
  },
  transition: {
    positive: ["whoosh", "swoosh", "swish", "pass by", "transition", "sweep"],
    negative: ["ambience", "room tone", "footstep", "loop", "riser"],
  },
  detail: {
    positive: [
      "click",
      "step",
      "footstep",
      "mechanical",
      "metal",
      "cloth",
      "door",
      "switch",
      "movement",
    ],
    negative: ["riser", "trailer", "boom", "ambience", "atmosphere"],
  },
  impact: {
    positive: [
      "impact",
      "hit",
      "slam",
      "thud",
      "boom",
      "drop",
      "crash",
      "punch",
    ],
    negative: ["ambience", "room tone", "riser", "whoosh", "loop"],
  },
  riser: {
    positive: ["riser", "rise", "build", "tension", "crescendo", "swell"],
    negative: ["impact", "hit", "click", "footstep", "ambience"],
  },
};

const QUERY_STOP_WORDS = new Set([
  "sound",
  "effect",
  "effects",
  "sfx",
  "cinematic",
  "professional",
  "audio",
  "the",
  "and",
  "with",
  "short",
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value) => Number.isFinite(Number(value));
const providedFinite = (value) =>
  value !== null && value !== undefined && finite(value);
const rounded = (value) => Number(Number(value).toFixed(3));

/**
 * SFX de trilha (Epidemic/overlay) só em assets IMAGE.
 * Vídeos IA já carregam sonoplastia diegética no próprio arquivo;
 * sonorizar de novo na trilha SFX cria empilhamento e “seca” o mix.
 * Desconhecido/legado (sem type) continua elegível — só bloqueia VIDEO explícito.
 */
export function isImageMediaForSfx(mediaType = "", asset = "") {
  const type = String(mediaType || "").toLowerCase();
  const file = String(asset || "").toLowerCase();
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(file)) return false;
  if (
    type.includes("vídeo") ||
    type.includes("video") ||
    /\bvídeo\b|\bvideo\b/.test(type)
  ) {
    return false;
  }
  return true;
}

function firstFinite(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && finite(value))
      return Number(value);
  }
  return null;
}

function collectSceneRanges(rows = []) {
  const ranges = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const ref = String(row?.scene_ref || row?.scene || "").trim();
    if (!ref) continue;
    const start = firstFinite(row?.start_s, row?.start_time, row?.start);
    const end = firstFinite(
      row?.end_s,
      row?.end_time,
      row?.end,
      start != null && finite(row?.duration)
        ? start + Number(row.duration)
        : null
    );
    if (start == null || end == null || end <= start) continue;
    const previous = ranges.get(ref);
    ranges.set(ref, {
      start: previous ? Math.min(previous.start, start) : start,
      end: previous ? Math.max(previous.end, end) : end,
    });
  }
  return ranges;
}

/**
 * Extrai cenas priorizando a timeline visual. Projetos do wizard guardam os
 * segundos em config.timeline_assets; chunks/Whisper e bloco são fallbacks.
 */
export function buildProfessionalSfxScenes(
  visualPrompts = [],
  {
    timelineAssets = {},
    narrationChunkPlan = {},
    wordTranscripts = [],
    blockTimings = {},
  } = {}
) {
  const chunkRanges = collectSceneRanges(narrationChunkPlan?.chunks || []);
  const transcriptRanges = collectSceneRanges(wordTranscripts);
  const blockCounters = {};

  return (Array.isArray(visualPrompts) ? visualPrompts : [])
    .slice(0, 180)
    .map((vp) => {
      const sceneRef = String(
        vp?.scene_ref || vp?.scene || vp?.production?.scene_ref || vp?.id || ""
      );
      const block = Math.max(1, Number(vp?.block) || 1);
      const blockKey = String(block);
      const localIndex = blockCounters[blockKey] || 0;
      blockCounters[blockKey] = localIndex + 1;
      const timelineSlot = timelineAssets?.[blockKey]?.[localIndex] || {};
      const timelineStart = firstFinite(
        timelineSlot?.audio_start,
        timelineSlot?.start
      );
      const timelineDuration = firstFinite(
        timelineSlot?.fixed,
        timelineSlot?.duration
      );
      const chunkRange = chunkRanges.get(sceneRef);
      const transcriptRange = transcriptRanges.get(sceneRef);
      const blockStart = firstFinite(blockTimings?.starts?.[block - 1]);
      const blockDuration = firstFinite(blockTimings?.durations?.[block - 1]);

      const start =
        firstFinite(
          vp?.start,
          vp?.start_time,
          vp?.production?.start,
          vp?.production?.start_time,
          vp?.speech_start,
          timelineStart,
          chunkRange?.start,
          transcriptRange?.start,
          blockStart
        ) ?? 0;
      const end = firstFinite(
        vp?.end,
        vp?.end_time,
        vp?.production?.end,
        vp?.production?.end_time,
        vp?.speech_end,
        timelineStart != null && timelineDuration != null
          ? timelineStart + timelineDuration
          : null,
        chunkRange?.end,
        transcriptRange?.end,
        blockStart != null && blockDuration != null
          ? blockStart + blockDuration
          : null
      );

      const mediaType = String(
        timelineSlot?.type ||
          vp?.media_mode ||
          vp?.production?.broll_type ||
          vp?.type ||
          ""
      ).toLowerCase();
      const asset = String(
        timelineSlot?.asset ||
          vp?.asset?.asset ||
          vp?.asset ||
          vp?.production?.asset ||
          ""
      );
      return {
        scene_ref: sceneRef,
        block,
        start: rounded(start),
        end: end != null ? rounded(end) : null,
        duration: firstFinite(
          vp?.duration_seconds,
          vp?.duration,
          end != null ? rounded(end - start) : null
        ),
        narration: String(vp?.narration_text || vp?.text || "").slice(0, 220),
        visual: String(vp?.prompt || vp?.visual_description || "").slice(
          0,
          220
        ),
        media_type: mediaType,
        asset,
        sfx_eligible: isImageMediaForSfx(mediaType, asset),
      };
    });
}

function sceneBounds(scene, totalDuration) {
  const start = Math.max(0, Number(scene?.start) || 0);
  const end = finite(scene?.end)
    ? Number(scene.end)
    : Math.min(totalDuration, start + (Number(scene?.duration) || 6));
  return { start, end: Math.max(start + 0.25, Math.min(totalDuration, end)) };
}

function openingFrameAnchor(row) {
  return /(?:primeiro quadro|abertura|opening frame|immediate|instant)/i.test(
    String(row?.sync_anchor || "")
  );
}

function tokenize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token));
}

function candidateDurationSeconds(candidate) {
  const raw = Number(candidate?.duration);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw > 120 ? raw / 1000 : raw;
}

export function rankProfessionalSfxCandidates(results = [], event = {}) {
  const category = String(event?.category || "detail").toLowerCase();
  const rules = CATEGORY_RULES[category] || CATEGORY_RULES.detail;
  const titleRules =
    CATEGORY_TITLE_TERMS[category] || CATEGORY_TITLE_TERMS.detail;
  const query = String(event?.query_en || "");
  const queryTokens = tokenize(query);
  const desiredDuration = clamp(
    Number(event?.duration) || rules.defaultDuration,
    rules.minDuration,
    rules.maxDuration
  );

  return (Array.isArray(results) ? results : [])
    .filter((candidate) => candidate?.id && candidate?.previewUrl)
    .map((candidate) => {
      const title = String(candidate?.title || "").toLowerCase();
      const titleTokens = new Set(tokenize(title));
      const matchedTokens = queryTokens.filter((token) =>
        titleTokens.has(token)
      );
      const positiveHits = titleRules.positive.filter((term) =>
        title.includes(term)
      );
      const negativeHits = titleRules.negative.filter((term) =>
        title.includes(term)
      );
      const duration = candidateDurationSeconds(candidate);

      let score = matchedTokens.length * 3;
      score += positiveHits.length * 4;
      score -= negativeHits.length * 6;
      if (query.trim().length > 5 && title.includes(query.toLowerCase())) {
        score += 5;
      }
      if (duration != null) {
        const ratio = duration / desiredDuration;
        if (category === "ambience") {
          score += duration >= Math.min(2, desiredDuration) ? 3 : -5;
        } else if (ratio >= 0.55 && ratio <= 2.8) {
          score += 3;
        } else if (ratio > 5 || ratio < 0.2) {
          score -= 4;
        }
      }

      return {
        ...candidate,
        duration_seconds: duration,
        professional_match_score: score,
        professional_match_evidence: matchedTokens.length + positiveHits.length,
        professional_match: {
          matched_query_tokens: matchedTokens,
          positive_family_terms: positiveHits,
          negative_family_terms: negativeHits,
        },
      };
    })
    .filter(
      (candidate) =>
        candidate.professional_match_score >= 2 &&
        candidate.professional_match_evidence > 0
    )
    .sort(
      (a, b) =>
        b.professional_match_score - a.professional_match_score ||
        Math.abs((a.duration_seconds || desiredDuration) - desiredDuration) -
          Math.abs((b.duration_seconds || desiredDuration) - desiredDuration)
    );
}

export function shouldIncludeAutomaticSfx({
  professionalTimeline = {},
  overlaySfxEnabled = true,
} = {}) {
  const hasProfessionalPlan =
    professionalTimeline?.generated_by === "ai-professional-sound-design" &&
    Array.isArray(professionalTimeline.sfx_events);
  return overlaySfxEnabled && !hasProfessionalPlan;
}

/** Normaliza a resposta da IA e ancora cada som na ação visual da cena. */
export function normalizeProfessionalSfxEvents({
  rawEvents = [],
  scenes = [],
  totalDuration = 60,
  isShort = false,
  maxEvents = 12,
}) {
  const sceneMap = new Map(
    scenes.map((scene) => [String(scene?.scene_ref || ""), scene])
  );

  const candidates = [];
  for (const row of Array.isArray(rawEvents) ? rawEvents : []) {
    const category = String(row?.category || "detail").toLowerCase();
    const rule = CATEGORY_RULES[category];
    if (!rule || (Number(row?.confidence) || 0) < 0.68) continue;

    const scene = sceneMap.get(String(row?.scene_ref || ""));
    // Trilha SFX só em IMAGE — vídeo usa áudio diegético do próprio arquivo.
    if (scene && !isImageMediaForSfx(scene.media_type, scene.asset)) {
      continue;
    }
    const visibleAction = `${scene?.visual || ""} ${scene?.narration || ""}`;
    const impactHasVisualEvidence =
      /\b(fall(?:s|ing|en)?|collapse[sd]?|hit(?:s|ting)?|slam(?:s|ming)?|crash(?:es|ing)?|strike[sd]?|explode[sd]?|land(?:s|ing)?|cai|caindo|queda|desaba|colide|bate|atinge|explode)\b/i.test(
        visibleAction
      );
    if (category === "impact" && !impactHasVisualEvidence) continue;
    const { start: sceneStart, end: sceneEnd } = sceneBounds(
      scene,
      totalDuration
    );
    const sceneLength = Math.max(0.25, sceneEnd - sceneStart);
    const requestedDuration = finite(row?.duration)
      ? Number(row.duration)
      : rule.defaultDuration;
    const duration = clamp(
      requestedDuration,
      rule.minDuration,
      Math.min(rule.maxDuration, sceneLength)
    );

    const hasExplicitAnchor =
      providedFinite(row?.offset) ||
      providedFinite(row?.anchor_position) ||
      providedFinite(row?.time);
    let offset;
    if (providedFinite(row?.offset)) offset = Number(row.offset);
    else if (providedFinite(row?.anchor_position))
      offset = clamp(Number(row.anchor_position), 0, 1) * sceneLength;
    else if (providedFinite(row?.time)) offset = Number(row.time) - sceneStart;
    else
      offset =
        category === "ambience" || category === "transition"
          ? 0
          : sceneLength * 0.3;

    const anchorTime =
      sceneStart + clamp(offset, 0, Math.max(0, sceneLength - 0.05));
    let time = anchorTime;
    if (category === "detail" && String(scene?.media_type).includes("image")) {
      time = sceneStart + Math.min(0.08, sceneLength * 0.04);
    } else if (category === "riser") {
      // O riser pertence à virada: seu último frame deve coincidir com o fim da cena.
      time = Math.max(sceneStart, sceneEnd - duration);
    } else if (category === "transition") {
      const preRoll = clamp(
        finite(row?.pre_roll) ? Number(row.pre_roll) : 0.18,
        0.04,
        Math.min(0.75, duration * 0.7)
      );
      time = Math.max(0, anchorTime - preRoll);
    } else if (
      (category === "detail" || category === "impact") &&
      !openingFrameAnchor(row) &&
      !hasExplicitAnchor
    ) {
      // Um pequeno assentamento impede o som de antecipar uma ação ainda não visível.
      time = Math.max(sceneStart + Math.min(0.12, sceneLength * 0.08), time);
    }
    time = clamp(
      time,
      category === "transition" ? Math.max(0, sceneStart - 0.75) : sceneStart,
      Math.max(sceneStart, sceneEnd - 0.05)
    );

    const actionDuration = finite(row?.action_duration)
      ? clamp(Number(row.action_duration), 0, sceneEnd - time)
      : duration;
    const requestedRepeatMode = String(
      row?.repeat_mode || "none"
    ).toLowerCase();
    const repeatMode =
      category === "ambience"
        ? "loop"
        : category === "detail" &&
            (requestedRepeatMode === "pulse" ||
              actionDuration > Math.max(1.5, duration * 1.35))
          ? "pulse"
          : "none";
    const repeatInterval = clamp(
      finite(row?.repeat_interval)
        ? Number(row.repeat_interval)
        : Math.max(0.7, duration * 0.8),
      0.65,
      2.5
    );
    const repeatCount =
      repeatMode === "pulse"
        ? clamp(
            finite(row?.repeat_count)
              ? Math.round(Number(row.repeat_count))
              : Math.ceil(actionDuration / repeatInterval),
            2,
            3
          )
        : 1;
    const fadeIn = clamp(
      finite(row?.fade_in)
        ? Number(row.fade_in)
        : category === "ambience"
          ? 0.35
          : category === "riser"
            ? 0.08
            : category === "transition"
              ? 0.015
              : 0.008,
      0.004,
      Math.min(0.8, duration * 0.35)
    );
    const fadeOut = clamp(
      finite(row?.fade_out)
        ? Number(row.fade_out)
        : category === "ambience"
          ? 0.6
          : category === "impact"
            ? 0.45
            : category === "transition"
              ? 0.28
              : 0.18,
      0.04,
      Math.min(1.2, duration * 0.45)
    );

    candidates.push({
      ...row,
      category,
      time: rounded(time),
      anchor_time: rounded(category === "riser" ? sceneEnd : anchorTime),
      offset: rounded(time - sceneStart),
      scene_start: rounded(sceneStart),
      scene_end: rounded(sceneEnd),
      duration: rounded(Math.min(duration, sceneEnd - time || duration)),
      action_duration: rounded(actionDuration),
      repeat_mode: repeatMode,
      repeat_interval: rounded(repeatInterval),
      repeat_count: repeatCount,
      volume: rounded(
        clamp(
          finite(row?.volume) ? Number(row.volume) : rule.minVolume,
          rule.minVolume,
          rule.maxVolume
        )
      ),
      fade_in: rounded(fadeIn),
      fade_out: rounded(fadeOut),
    });
  }

  const minimumGap = isShort ? 2.8 : 6;
  const accepted = [];
  for (const candidate of candidates.sort((a, b) => a.time - b.time)) {
    const conflicts = accepted.some((previous) => {
      if (candidate.category === "ambience" || previous.category === "ambience")
        return false;
      const strongerGap =
        candidate.category === "impact" || previous.category === "impact"
          ? minimumGap + 1
          : minimumGap;
      return Math.abs(previous.time - candidate.time) < strongerGap;
    });
    if (!conflicts) accepted.push(candidate);
    if (accepted.length >= maxEvents) break;
  }
  return accepted;
}

/** Converte um evento editorial em segmentos realmente audíveis no Remotion. */
export function buildSfxPlaybackSegments({
  event,
  sourceDuration = 0,
  totalDuration = 0,
}) {
  const category = String(event?.category || "detail").toLowerCase();
  const sceneEnd = finite(event?.scene_end)
    ? Number(event.scene_end)
    : totalDuration;
  const sceneStart = finite(event?.scene_start) ? Number(event.scene_start) : 0;
  let start = clamp(
    Number(event?.time) || 0,
    0,
    Math.max(0, totalDuration - 0.01)
  );
  const tailAllowance =
    category === "impact" ? 1.25 : category === "transition" ? 0.65 : 0.15;
  const endLimit = Math.max(
    start + 0.05,
    Math.min(
      totalDuration,
      category === "ambience" || category === "riser"
        ? sceneEnd
        : sceneEnd + tailAllowance
    )
  );
  const requestedDuration = Math.max(0.2, Number(event?.duration) || 0.8);
  const realSourceDuration =
    Number(sourceDuration) > 0.05 ? Number(sourceDuration) : requestedDuration;
  const maxPlaybackVolume = category === "utility" ? 0.42 : 0.82;
  const volume = clamp(Number(event?.volume) || 0.04, 0.01, maxPlaybackVolume);

  if (category === "riser") {
    const duration = Math.min(
      requestedDuration,
      realSourceDuration,
      endLimit - sceneStart
    );
    start = Math.max(sceneStart, endLimit - duration);
    return [
      {
        ...event,
        start: rounded(start),
        duration: rounded(duration),
        volume,
        loop: false,
        repeatIndex: 0,
      },
    ];
  }

  if (category === "ambience") {
    const duration = Math.max(
      0.2,
      Math.min(requestedDuration, endLimit - start)
    );
    return [
      {
        ...event,
        start: rounded(start),
        duration: rounded(duration),
        volume,
        loop: realSourceDuration + 0.08 < duration,
        repeatIndex: 0,
      },
    ];
  }

  if (category === "impact" || category === "transition") {
    const naturalMax = category === "impact" ? 3.5 : 2.5;
    const duration = Math.max(
      0.08,
      Math.min(
        Math.max(requestedDuration, Math.min(realSourceDuration, naturalMax)),
        realSourceDuration,
        naturalMax,
        endLimit - start
      )
    );
    return [
      {
        ...event,
        start: rounded(start),
        duration: rounded(duration),
        volume,
        fadeInS: rounded(
          Math.min(Number(event?.fade_in) || 0.008, duration * 0.12)
        ),
        fadeOutS: rounded(
          Math.min(Number(event?.fade_out) || 0.35, duration * 0.45)
        ),
        loop: false,
        repeatIndex: 0,
      },
    ];
  }

  const repeatMode =
    category === "detail" ? String(event?.repeat_mode || "none") : "none";
  const repeatCount =
    repeatMode === "pulse"
      ? clamp(Math.round(Number(event?.repeat_count) || 2), 2, 3)
      : 1;
  const interval = clamp(
    Number(event?.repeat_interval) || Math.max(0.7, realSourceDuration * 0.8),
    0.65,
    2.5
  );
  const segments = [];
  for (let index = 0; index < repeatCount; index += 1) {
    const segmentStart = start + index * interval;
    if (segmentStart >= endLimit - 0.08) break;
    const duration = Math.max(
      0.08,
      Math.min(
        requestedDuration,
        realSourceDuration,
        repeatMode === "pulse" ? interval * 0.88 : requestedDuration,
        endLimit - segmentStart
      )
    );
    const volumeScale = [1, 0.76, 0.58][index] || 0.5;
    segments.push({
      ...event,
      start: rounded(segmentStart),
      duration: rounded(duration),
      volume: rounded(volume * volumeScale),
      fadeInS: rounded(
        Math.min(Number(event?.fade_in) || 0.06, duration * 0.3)
      ),
      fadeOutS: rounded(
        Math.min(Number(event?.fade_out) || 0.22, duration * 0.4)
      ),
      loop: false,
      repeatIndex: index,
    });
  }
  return segments;
}
