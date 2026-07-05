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
): number | null {
  const sceneRef = String(scene?.scene ?? scene?.scene_ref ?? "").trim();
  if (!sceneRef || !chunkPlan?.chunks?.length) return null;
  const chunk = chunkPlan.chunks.find(
    (c) => String(c.scene_ref || "").trim() === sceneRef,
  );
  if (!chunk) return null;
  const start = Number(chunk.start_s);
  const end = Number(chunk.end_s);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return parseFloat((end - start).toFixed(1));
  }
  const dur = Number(chunk.duration_s);
  return Number.isFinite(dur) && dur > 0 ? parseFloat(dur.toFixed(1)) : null;
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
  const fromChunks = getSceneDurationFromChunkPlan(scene, chunkPlan);
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