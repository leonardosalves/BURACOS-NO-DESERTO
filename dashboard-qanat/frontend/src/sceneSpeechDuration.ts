import { findBoundedNarrationMatch, getBlockTimeBounds } from "./timelineNarrationSync";

export const parseDurationSeconds = (duration: unknown) => {
  if (typeof duration === "number" && Number.isFinite(duration)) return duration;
  if (typeof duration !== "string") return null;
  const normalized = duration.replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

export function flattenWordsForSceneDuration(wordTranscripts: any[]) {
  const flat: Array<{ word: string; clean: string; start: number; end: number }> = [];
  if (!Array.isArray(wordTranscripts)) return flat;
  for (const segment of wordTranscripts) {
    const segStart = Number(segment.start_time) || 0;
    for (const w of segment.words || []) {
      let wStart = Number(w.start);
      let wEnd = Number(w.end);
      if (wStart < segStart) {
        wStart += segStart;
        wEnd += segStart;
      }
      const token = String(w.word || "").trim();
      const clean = token
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .pop() || "";
      flat.push({ word: token, clean, start: wStart, end: wEnd });
    }
  }
  return flat;
}

export function getSceneSpeechDurationSeconds(
  scene: any,
  wordTranscripts: any[],
  blockNum: number,
  sceneIdxInBlock: number,
  status?: { block_timings?: { starts?: number[]; durations?: number[] } },
  scenesInBlock?: any[],
): number | null {
  if (scene?.duration_from_whisper) {
    if (scene?.duration_seconds != null && Number.isFinite(Number(scene.duration_seconds))) {
      return Number(scene.duration_seconds);
    }
    const parsed = parseDurationSeconds(scene?.duration ?? scene?.duracaoSegundos);
    if (parsed != null) return parsed;
  }

  const narrationText = String(scene?.narration_text || scene?.narration_excerpt || "").trim();
  if (!narrationText || !wordTranscripts?.length || !status?.block_timings?.starts?.length) return null;

  const flat = flattenWordsForSceneDuration(wordTranscripts);
  if (!flat.length) return null;

  const bounds = getBlockTimeBounds(status, blockNum);
  let searchAfter = bounds.searchAfter;
  if (scenesInBlock) {
    for (let i = 0; i < sceneIdxInBlock; i += 1) {
      const prevText = String(scenesInBlock[i]?.narration_text || scenesInBlock[i]?.narration_excerpt || "").trim();
      if (!prevText) continue;
      const prev = findBoundedNarrationMatch(prevText, flat, { searchAfter, searchBefore: bounds.searchBefore });
      if (prev) searchAfter = prev.end;
    }
  }

  const matched = findBoundedNarrationMatch(narrationText, flat, { searchAfter, searchBefore: bounds.searchBefore });
  if (matched?.duration > 0) return parseFloat(matched.duration.toFixed(1));
  return null;
}

export const isWhisperTimelineReady = (
  wordTranscripts: any[],
  status?: { block_timings?: { starts?: number[] } },
) =>
  Array.isArray(wordTranscripts)
  && wordTranscripts.length > 0
  && (status?.block_timings?.starts?.length ?? 0) > 0;

export function isChunkedNarrationProject(
  config?: { narration_mode?: string } | null,
  storyboard?: { narration_chunk_plan?: ChunkPlanLike } | null,
  wordTranscripts?: Array<{ chunk_id?: string }> | null,
): boolean {
  const plan = storyboard?.narration_chunk_plan;
  const chunks = plan?.chunks;
  const hasPlan = Array.isArray(chunks) && chunks.some((c) => String(c?.text || "").trim().length >= 2);
  if (config?.narration_mode === "chunked" || plan?.mode === "chunked") return hasPlan;
  if (Array.isArray(wordTranscripts) && wordTranscripts.some((s) => s?.chunk_id)) return hasPlan;
  return false;
}

type ChunkPlanLike = {
  mode?: string;
  chunks?: Array<{
    text?: string;
    scene_ref?: string;
    block?: number;
    duration_s?: number;
    start_s?: number | null;
    end_s?: number | null;
  }>;
};

export function getSceneDurationFromChunkPlan(
  scene: any,
  chunkPlan?: ChunkPlanLike | null,
  sceneIdxInBlock = 0,
): number | null {
  const chunks = chunkPlan?.chunks;
  if (!chunks?.length) return null;

  const sceneRef = String(scene?.scene ?? scene?.scene_ref ?? "").trim();
  const block = Number(scene?.block) || 1;
  let chunk = sceneRef
    ? chunks.find((c) => String(c.scene_ref || "").trim() === sceneRef)
    : undefined;

  if (!chunk) {
    const inBlock = chunks
      .filter((c) => Number(c.block) === block)
      .sort(
        (a, b) => Number(a.start_s ?? 0) - Number(b.start_s ?? 0)
          || String(a.scene_ref || "").localeCompare(String(b.scene_ref || "")),
      );
    chunk = inBlock[sceneIdxInBlock];
  }
  if (!chunk) return null;
  const start = Number(chunk.start_s);
  const end = Number(chunk.end_s);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return parseFloat((end - start).toFixed(1));
  }
  const dur = Number(chunk.duration_s);
  return Number.isFinite(dur) && dur > 0 ? parseFloat(dur.toFixed(1)) : null;
}

/** Detecta timeline corrompida (durações somadas >> bloco ou audio_start block-relative). */
export function chunkedTimelineNeedsRepair(
  config?: { timeline_assets?: Record<string, Array<{ fixed?: number; audio_start?: number; synced_to_speech?: boolean }>> } | null,
  status?: { block_timings?: { starts?: number[]; durations?: number[] } },
): boolean {
  const durations = status?.block_timings?.durations || [];
  const starts = status?.block_timings?.starts || [];
  const assetsByBlock = config?.timeline_assets || {};
  for (const blockKey of Object.keys(assetsByBlock)) {
    const blockNum = parseInt(blockKey, 10);
    if (!Number.isFinite(blockNum) || blockNum < 1) continue;
    const blockAssets = assetsByBlock[blockKey] || [];
    if (!blockAssets.some((a) => a.synced_to_speech)) continue;
    const blockDur = Number(durations[blockNum - 1]);
    if (Number.isFinite(blockDur) && blockDur > 0) {
      const sumFixed = blockAssets.reduce((acc, a) => acc + (Number(a.fixed) || 0), 0);
      if (sumFixed > blockDur * 1.35) return true;
    }
    const blockStart = Number(starts[blockNum - 1]);
    const assetStarts = blockAssets
      .map((a) => Number(a.audio_start))
      .filter((n) => Number.isFinite(n));
    if (Number.isFinite(blockStart) && blockStart > 0.5 && assetStarts.length) {
      if (Math.max(...assetStarts) < blockStart - 0.25) return true;
    }
  }
  return false;
}

export const getSceneDurationSeconds = (
  scene: any,
  wordTranscripts?: any[],
  blockNum?: number,
  sceneIdxInBlock?: number,
  status?: { block_timings?: { starts?: number[]; durations?: number[] } },
  scenesInBlock?: any[],
  chunkPlan?: ChunkPlanLike | null,
) => {
  const fromChunks = getSceneDurationFromChunkPlan(scene, chunkPlan, sceneIdxInBlock);
  if (fromChunks != null) return fromChunks;

  if (wordTranscripts && blockNum != null && sceneIdxInBlock != null) {
    return getSceneSpeechDurationSeconds(
      scene,
      wordTranscripts,
      blockNum,
      sceneIdxInBlock,
      status,
      scenesInBlock,
    );
  }
  return null;
};