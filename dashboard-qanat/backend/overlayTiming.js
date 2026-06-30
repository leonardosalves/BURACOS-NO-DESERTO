/**
 * Duração e posicionamento de overlays — usa duração do BLOCO (não só da cena/asset)
 * para evitar overlays que somem ou passam rápido demais em listicles.
 */

export const OVERLAY_MIN_DURATION = {
  counter: 3.5,
  "bar-chart": 4.5,
  timeline: 5,
  "lower-third": 3,
  "kinetic-text": 2.5,
  "info-card": 3.5,
  "source-card": 3,
  "chapter-stinger": 1.8,
  "social-post": 3.5,
  "geo-map": 4,
};

const HUD_OVERLAY_TYPES = new Set([
  "rank-progress",
  "listicle-stinger",
  "listicle-recap",
  "chapter-stinger",
]);

export function isHudOverlay(overlay = {}) {
  if (!overlay) return false;
  if (HUD_OVERLAY_TYPES.has(overlay.type)) return true;
  const id = String(overlay.id || "");
  return id.startsWith("listicle-") || id === "retention-hook" || id === "mid-video-cta";
}

export function extractBlockIndex(overlay = {}, sceneRef = "") {
  const fromBlock = Number(overlay.block || overlay.props?.block || 0);
  if (fromBlock > 0) return fromBlock - 1;

  const ref = String(sceneRef || overlay.scene_ref || "").trim();
  const sceneMatch = ref.match(/^(\d+)\./);
  if (sceneMatch) return Math.max(0, Number(sceneMatch[1]) - 1);

  const idMatch = String(overlay.id || "").match(/(?:block|bloco)[_-]?(\d+)/i);
  if (idMatch) return Math.max(0, Number(idMatch[1]) - 1);

  return -1;
}

export function getBlockTiming(blockIdx, starts = [], durations = []) {
  if (blockIdx < 0 || blockIdx >= starts.length) {
    return { blockStart: 0, blockDur: 0, blockEnd: 0 };
  }
  const blockStart = Number(starts[blockIdx]);
  const blockDur = Number(durations[blockIdx]) || 0;
  if (!Number.isFinite(blockStart)) {
    return { blockStart: 0, blockDur: 0, blockEnd: 0 };
  }
  return {
    blockStart,
    blockDur: Math.max(0, blockDur),
    blockEnd: blockStart + Math.max(0, blockDur),
  };
}

export function computeOverlayDisplayDuration(overlay, {
  overlayStart,
  blockStart,
  blockEnd,
  plan = {},
  isListicle = false,
} = {}) {
  const type = overlay?.type || "lower-third";
  const minDur = OVERLAY_MIN_DURATION[type] || 3;
  const maxDur = Number(plan?.limits?.maxDurationSeconds) || 7;
  const listicleMin = isListicle ? Math.max(minDur, minDur * 1.1) : minDur;

  const available = blockEnd - overlayStart - 0.3;
  if (!Number.isFinite(available) || available <= 0.8) {
    return Math.max(2, Math.min(maxDur, 2.5));
  }

  const ideal = Math.min(maxDur, Math.max(listicleMin, available * 0.82));
  return Math.max(2, Math.min(ideal, available));
}

export function stabilizeOverlayTimings(overlays = [], {
  starts = [],
  durations = [],
  plan = {},
  config = {},
  storyboard = {},
} = {}) {
  const isListicle = config?.content_mode === "LISTICLE"
    || storyboard?.listicle?.content_mode === "LISTICLE";

  for (const overlay of overlays) {
    if (!overlay || isHudOverlay(overlay)) continue;

    const blockIdx = extractBlockIndex(overlay, overlay.scene_ref);
    if (blockIdx < 0) continue;

    const { blockStart, blockDur, blockEnd } = getBlockTiming(blockIdx, starts, durations);
    if (!Number.isFinite(blockStart) || blockDur <= 0) continue;

    let start = Number(overlay.start);
    if (!Number.isFinite(start)) start = blockStart + 0.5;

    const minStart = blockStart + 0.35;
    const minReadable = OVERLAY_MIN_DURATION[overlay.type] || 3;
    const maxStart = Math.max(minStart, blockEnd - minReadable - 0.35);

    if (start < minStart) start = minStart;
    if (start > maxStart) start = Math.min(minStart + 0.6, maxStart);

    overlay.start = start;
    overlay.duration = computeOverlayDisplayDuration(overlay, {
      overlayStart: start,
      blockStart,
      blockEnd,
      plan,
      isListicle,
    });

    overlay.block_ref = blockIdx + 1;
  }

  return overlays;
}

const SYSTEM_OVERLAY_IDS = new Set(["retention-hook", "mid-video-cta"]);

export function isInformativeOverlay(overlay = {}) {
  if (!overlay) return false;
  if (isHudOverlay(overlay)) return false;
  if (SYSTEM_OVERLAY_IDS.has(String(overlay.id || ""))) return false;
  return true;
}

/** Espalha overlays informativos no vídeo — evita colisão de 2.5s que o enforcement de 5s elimina. */
export function redistributeInformativeOverlayStarts(overlays = [], plan = {}, totalDuration = 0) {
  if (!Array.isArray(overlays) || overlays.length === 0) return overlays;

  const duration = Math.max(Number(totalDuration) || 0, 20);
  const minGap = Number(plan?.limits?.minGapSeconds) || 5;
  const hookEnd = Number(plan?.rhythm?.hookCleanSeconds) || 1.5;
  const outroPad = Number(plan?.rhythm?.outroCleanSeconds) || 2;
  const outroStart = Math.max(hookEnd + minGap, duration - outroPad);

  const informative = overlays.filter(isInformativeOverlay);
  if (informative.length <= 1) return overlays;

  const rhythm = plan?.rhythm || {};
  const defaultPercents = [0.12, 0.35, 0.58, 0.75, 0.88];
  const rhythmPercents = [
    rhythm.firstOverlayPercent,
    rhythm.secondOverlayPercent,
    rhythm.thirdOverlayPercent,
    rhythm.fourthOverlayPercent,
  ].filter((p) => Number.isFinite(Number(p)) && Number(p) > 0);

  const sorted = [...informative].sort((a, b) => {
    const blockA = extractBlockIndex(a, a.scene_ref);
    const blockB = extractBlockIndex(b, b.scene_ref);
    if (blockA !== blockB) return blockA - blockB;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  let lastStart = hookEnd;
  for (let i = 0; i < sorted.length; i++) {
    const overlay = sorted[i];
    const percent = rhythmPercents[i] ?? defaultPercents[i] ?? (0.12 + i * 0.18);
    let target = duration * Math.min(0.92, Math.max(hookEnd / duration + 0.02, percent));
    target = Math.max(target, lastStart + minGap);
    target = Math.min(target, outroStart - (Number(overlay.duration) || 3));
    overlay.start = Math.max(hookEnd + 0.35, target);
    lastStart = overlay.start;
  }

  console.log(
    `[Overlays] ${sorted.length} overlays informativos redistribuídos (gap mín. ${minGap}s, ${duration.toFixed(1)}s total).`,
  );
  return overlays;
}

function extractOverlayKeywords(overlay = {}) {
  const text = [
    overlay?.props?.title,
    overlay?.props?.subtitle,
    overlay?.props?.description,
    overlay?.props?.label,
    overlay?.props?.text,
  ].filter(Boolean).join(" ").toLowerCase();

  return text
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
    .slice(0, 8);
}

function findKeywordTimeInRange(wordTranscripts, keywords, rangeStart, rangeEnd) {
  if (!Array.isArray(wordTranscripts) || keywords.length === 0) return null;

  for (const segment of wordTranscripts) {
    const segStart = Number(segment.start_time || 0);
    const words = Array.isArray(segment.words) ? segment.words : [];

    for (const wordEntry of words) {
      const absStart = segStart + Number(wordEntry.start || 0);
      if (absStart < rangeStart || absStart > rangeEnd) continue;

      const cleanWord = String(wordEntry.word || "")
        .toLowerCase()
        .replace(/[^\wáàâãéèêíìîóòôõúùûç]/gi, "");
      if (!cleanWord) continue;

      for (const keyword of keywords) {
        if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
          return absStart;
        }
      }
    }
  }

  return null;
}

function isLikelySceneId(raw) {
  const m = String(raw ?? "").trim().match(/^(\d+)\.(\d+)$/);
  if (!m) return false;
  return Number(m[1]) >= 1 && Number(m[2]) >= 1;
}

/**
 * Verifica e opcionalmente repara o momento de cada overlay informativo da IA.
 * Cruza scene_ref, bloco, narração (word_transcripts) e zonas proibidas do plano.
 */
export function verifyAndRepairAiOverlayTiming(overlays = [], {
  starts = [],
  durations = [],
  sceneStarts = {},
  sceneDurations = {},
  wordTranscripts = [],
  totalDuration = 0,
  plan = {},
  repair = true,
} = {}) {
  const duration = Math.max(Number(totalDuration) || 0, 20);
  const hookEnd = Number(plan?.rhythm?.hookCleanSeconds) || 1.5;
  const outroPad = Number(plan?.rhythm?.outroCleanSeconds) || 2;
  const outroStart = Math.max(hookEnd + 2, duration - outroPad);
  const maxKeywordDrift = 3.5;

  const entries = [];
  let repairedCount = 0;
  const informative = overlays.filter(isInformativeOverlay);

  for (const overlay of overlays) {
    if (!isInformativeOverlay(overlay)) continue;

    if (!overlay.scene_ref && isLikelySceneId(overlay.start)) {
      overlay.scene_ref = String(overlay.start).trim();
    }
    if (!overlay.scene_ref && isLikelySceneId(overlay.scene)) {
      overlay.scene_ref = String(overlay.scene).trim();
    }

    const blockIdx = extractBlockIndex(overlay, overlay.scene_ref);
    const { blockStart, blockEnd } = getBlockTiming(blockIdx, starts, durations);
    const sceneRef = String(overlay.scene_ref || overlay.planned_scene || "").trim();
    const sceneStart = sceneRef && sceneStarts[sceneRef] != null
      ? Number(sceneStarts[sceneRef])
      : null;
    const sceneEnd = sceneStart != null
      ? sceneStart + (Number(sceneDurations[sceneRef]) || 4)
      : null;

    const rangeStart = sceneStart != null ? sceneStart : (blockStart > 0 ? blockStart : 0);
    const rangeEnd = sceneEnd != null ? sceneEnd : (blockEnd > blockStart ? blockEnd : duration);

    let start = Number(overlay.start);
    const dur = Number(overlay.duration) || 3;
    let status = "ok";
    let message = "";
    let keywordMatchSec = null;

    const keywords = extractOverlayKeywords(overlay);
    if (keywords.length && rangeEnd > rangeStart) {
      keywordMatchSec = findKeywordTimeInRange(wordTranscripts, keywords, rangeStart, rangeEnd);
    }

    if (!Number.isFinite(start)) {
      status = "error";
      message = "start inválido — overlay não renderiza";
      if (repair && rangeStart >= 0) {
        start = rangeStart + 0.5;
        overlay.start = start;
        repairedCount++;
        status = "repaired";
        message = `start ausente → ${start.toFixed(1)}s (início do bloco/cena)`;
      }
    } else {
      const insideBlock = blockEnd > blockStart
        ? start >= blockStart + 0.15 && start + dur <= blockEnd + 0.5
        : true;
      const insideScene = sceneStart != null && sceneEnd != null
        ? start >= sceneStart && start + dur <= sceneEnd + 0.3
        : null;

      if (insideScene === false) {
        status = "warning";
        message = `fora da cena ${sceneRef} (${sceneStart?.toFixed(1)}–${sceneEnd?.toFixed(1)}s), em ${start.toFixed(1)}s`;
        if (repair && sceneStart != null) {
          start = Math.min(sceneStart + 0.5, sceneEnd - dur - 0.2);
          overlay.start = start;
          repairedCount++;
          status = "repaired";
          message = `reancorado à cena ${sceneRef} → ${start.toFixed(1)}s`;
        }
      } else if (!insideBlock && blockEnd > blockStart) {
        status = "warning";
        message = `fora do bloco ${blockIdx + 1} (${blockStart.toFixed(1)}–${blockEnd.toFixed(1)}s)`;
        if (repair) {
          start = Math.min(blockStart + 0.5, blockEnd - dur - 0.25);
          overlay.start = start;
          repairedCount++;
          status = "repaired";
          message = `reancorado ao bloco ${blockIdx + 1} → ${start.toFixed(1)}s`;
        }
      }

      if (start < hookEnd) {
        status = status === "ok" ? "warning" : status;
        const prev = message;
        message = prev
          ? `${prev}; zona de gancho (${hookEnd}s)`
          : `no gancho (${start.toFixed(1)}s < ${hookEnd}s)`;
        if (repair) {
          start = hookEnd + 0.35;
          overlay.start = start;
          if (status !== "repaired") repairedCount++;
          status = "repaired";
          message = `afastado do gancho → ${start.toFixed(1)}s`;
        }
      }

      if (start + dur > duration - 0.5) {
        status = status === "ok" ? "warning" : status;
        message = message || `ultrapassa o fim do vídeo (${duration.toFixed(1)}s)`;
        if (repair) {
          start = Math.max(hookEnd + 0.35, duration - dur - outroPad);
          overlay.start = start;
          if (status !== "repaired") repairedCount++;
          status = "repaired";
          message = `encurtado antes do outro → ${start.toFixed(1)}s`;
        }
      }

      if (keywordMatchSec != null) {
        const drift = Math.abs(start - keywordMatchSec);
        if (drift > maxKeywordDrift) {
          const driftMsg = `desvio ${drift.toFixed(1)}s da palavra-chave (${keywordMatchSec.toFixed(1)}s)`;
          if (status === "ok") {
            status = "warning";
            message = driftMsg;
          } else if (!message.includes("palavra-chave")) {
            message = `${message}; ${driftMsg}`;
          }
          if (repair) {
            const snapped = Math.min(
              keywordMatchSec + 0.15,
              (rangeEnd > rangeStart ? rangeEnd - dur - 0.2 : start + 10),
            );
            if (snapped >= hookEnd + 0.2 && snapped + dur <= outroStart) {
              overlay.start = snapped;
              start = snapped;
              repairedCount++;
              status = "repaired";
              message = `sincronizado à narração (${keywordMatchSec.toFixed(1)}s) → ${start.toFixed(1)}s`;
            }
          }
        } else if (status === "ok") {
          message = `alinhado à narração (±${drift.toFixed(1)}s)`;
        }
      } else if (status === "ok" && !message) {
        message = sceneRef
          ? `no bloco ${blockIdx + 1}, cena ${sceneRef}`
          : `no bloco ${blockIdx + 1}`;
      }
    }

    overlay.duration = computeOverlayDisplayDuration(overlay, {
      overlayStart: start,
      blockStart: blockStart || rangeStart,
      blockEnd: blockEnd || rangeEnd,
      plan,
      isListicle: false,
    });

    entries.push({
      id: overlay.id,
      type: overlay.type,
      plannedScene: sceneRef || null,
      block: blockIdx >= 0 ? blockIdx + 1 : null,
      startSec: Number(overlay.start),
      endSec: Number(overlay.start) + (Number(overlay.duration) || dur),
      blockRange: blockEnd > blockStart ? [blockStart, blockEnd] : null,
      sceneRange: sceneStart != null ? [sceneStart, sceneEnd] : null,
      keywordMatchSec,
      status,
      message,
    });

    console.log(
      `[Overlays Timing] ${overlay.id}: ${overlay.start.toFixed(1)}s — ${status}${message ? ` (${message})` : ""}`,
    );
  }

  const okCount = entries.filter((e) => e.status === "ok").length;
  const warnCount = entries.filter((e) => e.status === "warning").length;
  const errCount = entries.filter((e) => e.status === "error").length;

  const report = {
    ok: errCount === 0 && warnCount === 0,
    checked: informative.length,
    repaired: repairedCount,
    okCount,
    warnCount,
    errCount,
    entries,
    verifiedAt: new Date().toISOString(),
  };

  if (informative.length) {
    console.log(
      `[Overlays Timing] Verificação: ${informative.length} overlay(s) — ${okCount} ok, ${warnCount} aviso(s), ${repairedCount} reparo(s).`,
    );
  }

  return { overlays, report };
}

/** Converte relatório de timing em issues para quality_report. */
export function overlayTimingIssuesFromReport(report = {}) {
  const issues = [];
  for (const entry of report.entries || []) {
    if (entry.status === "ok") continue;
    issues.push({
      severity: entry.status === "error" ? "error" : entry.status === "repaired" ? "info" : "warning",
      code: entry.status === "repaired" ? "overlay_timing_repaired" : "overlay_timing",
      message: `Overlay "${entry.id}" @ ${entry.startSec?.toFixed?.(1) ?? "?"}s: ${entry.message}`,
    });
  }
  return issues;
}