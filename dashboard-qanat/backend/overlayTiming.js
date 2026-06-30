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