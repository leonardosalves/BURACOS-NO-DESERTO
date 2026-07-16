const CATEGORY_RULES = {
  ambience: {
    minDuration: 2,
    maxDuration: 10,
    defaultDuration: 4,
    minVolume: 0.1,
    maxVolume: 0.18,
  },
  transition: {
    minDuration: 0.35,
    maxDuration: 2.5,
    defaultDuration: 0.9,
    minVolume: 0.18,
    maxVolume: 0.32,
  },
  detail: {
    minDuration: 0.5,
    maxDuration: 3.2,
    defaultDuration: 1.2,
    minVolume: 0.16,
    maxVolume: 0.3,
  },
  impact: {
    minDuration: 0.35,
    maxDuration: 2.2,
    defaultDuration: 0.8,
    minVolume: 0.22,
    maxVolume: 0.38,
  },
  riser: {
    minDuration: 0.8,
    maxDuration: 4,
    defaultDuration: 1.8,
    minVolume: 0.16,
    maxVolume: 0.28,
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value) => Number.isFinite(Number(value));
const rounded = (value) => Number(Number(value).toFixed(3));

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
    if (!rule || (Number(row?.confidence) || 0) < 0.62) continue;

    const scene = sceneMap.get(String(row?.scene_ref || ""));
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

    let offset;
    if (finite(row?.offset)) offset = Number(row.offset);
    else if (finite(row?.anchor_position))
      offset = clamp(Number(row.anchor_position), 0, 1) * sceneLength;
    else if (finite(row?.time)) offset = Number(row.time) - sceneStart;
    else
      offset =
        category === "ambience" || category === "transition"
          ? 0
          : sceneLength * 0.3;

    let time = sceneStart + clamp(offset, 0, Math.max(0, sceneLength - 0.05));
    if (category === "riser") {
      // O riser pertence à virada: seu último frame deve coincidir com o fim da cena.
      time = Math.max(sceneStart, sceneEnd - duration);
    } else if (category === "transition") {
      // Evita que o ataque seja ouvido durante o último quadro da cena anterior.
      time = Math.max(sceneStart + Math.min(0.06, sceneLength * 0.05), time);
    } else if (
      (category === "detail" || category === "impact") &&
      !openingFrameAnchor(row)
    ) {
      // Um pequeno assentamento impede o som de antecipar uma ação ainda não visível.
      time = Math.max(sceneStart + Math.min(0.12, sceneLength * 0.08), time);
    }
    time = clamp(time, sceneStart, Math.max(sceneStart, sceneEnd - 0.05));

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
          : 0.06,
      0.02,
      Math.min(0.8, duration * 0.35)
    );
    const fadeOut = clamp(
      finite(row?.fade_out)
        ? Number(row.fade_out)
        : category === "ambience"
          ? 0.6
          : 0.22,
      0.06,
      Math.min(1.2, duration * 0.45)
    );

    candidates.push({
      ...row,
      category,
      time: rounded(time),
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

  const minimumGap = isShort ? 2.2 : 4;
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
  const endLimit = Math.max(start + 0.05, Math.min(totalDuration, sceneEnd));
  const requestedDuration = Math.max(0.2, Number(event?.duration) || 0.8);
  const realSourceDuration =
    Number(sourceDuration) > 0.05 ? Number(sourceDuration) : requestedDuration;
  const volume = clamp(Number(event?.volume) || 0.04, 0.01, 0.42);

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
        interval * 0.88,
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
