/**
 * Editor de timing por cena — lógica isolada.
 * Narração calculada DENTRO do bloco (sem vazamento entre blocos).
 */

import {
  findBoundedNarrationMatch,
  getBlockNarrationText,
  getBlockTimeBounds,
  getStrictBlockBounds,
  mapStoryboardWordsWithTiming,
  type BlockTimingStatus,
  type NarrationSyncContext,
  type TimelineAsset,
} from "./timelineNarrationSync";
import { repairMojibake } from "./textEncoding";

function cleanWordToken(word: string): string {
  return String(word || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)[0] || "";
}

export type TranscriptWord = {
  word: string;
  clean?: string;
  start: number;
  end: number;
  segmentIndex?: number;
};

export type SceneTimingRow = {
  idx: number;
  duration: number;
  windowStart: number;
  windowEnd: number;
  words: TranscriptWord[];
  narrationText: string;
  assetLabel: string;
  assetPath: string;
  assetType: "image" | "video" | "none";
  audioStart: number;
};

function inferAssetType(asset: TimelineAsset): "image" | "video" | "none" {
  const path = String(asset.asset || "").trim();
  if (!path) return "none";
  if (asset.type === "video" || /\.(mp4|mov|webm|m4v)$/i.test(path)) return "video";
  return "image";
}

export type BlockTimingModel = {
  blockKey: string;
  blockNum: number;
  blockStart: number;
  blockEnd: number;
  narrationStart: number;
  narrationEnd: number;
  blockWords: TranscriptWord[];
  blockText: string;
  scenes: SceneTimingRow[];
  totalDuration: number;
  coveredWords: number;
  totalWords: number;
  coveragePercent: number;
};

const MIN_SCENE_SECONDS = 0.5;

export function flattenTranscriptWords(wordTranscripts: any[]): TranscriptWord[] {
  const flat: TranscriptWord[] = [];
  if (!Array.isArray(wordTranscripts)) return flat;

  for (let segIdx = 0; segIdx < wordTranscripts.length; segIdx++) {
    const segment = wordTranscripts[segIdx];
    const segStart = Number(segment.start_time) || 0;
    const segDuration = Number(segment.duration) || 0;
    const segText = String(segment.text || "");

    if (Array.isArray(segment.words) && segment.words.length > 0) {
      for (const w of segment.words) {
        let wStart = Number(w.start);
        let wEnd = Number(w.end);
        if (wStart < segStart) {
          wStart += segStart;
          wEnd += segStart;
        }
        const token = String(w.word || "").trim();
        flat.push({
          word: token,
          clean: cleanWordToken(token),
          start: wStart,
          end: wEnd,
          segmentIndex: segIdx,
        });
      }
    } else if (segText) {
      const rawWords = segText.split(/\s+/).filter(Boolean);
      const wordDur = rawWords.length ? segDuration / rawWords.length : segDuration;
      rawWords.forEach((word, wIdx) => {
        flat.push({
          word,
          clean: cleanWordToken(word),
          start: segStart + wIdx * wordDur,
          end: segStart + (wIdx + 1) * wordDur,
          segmentIndex: segIdx,
        });
      });
    }
  }

  return flat.sort((a, b) => a.start - b.start);
}

export function getSceneNarrationText(
  blockNum: number,
  assetIdx: number,
  storyboard?: { visual_prompts?: Array<{ block?: number; narration_text?: string; narration_excerpt?: string }> },
): string {
  const scenes = (storyboard?.visual_prompts || []).filter((vp) => Number(vp.block) === blockNum);
  if (scenes.length > assetIdx) {
    return repairMojibake(
      String(scenes[assetIdx]?.narration_text || scenes[assetIdx]?.narration_excerpt || "").trim(),
    );
  }
  return "";
}

export function resolveBlockWords(
  flatWords: TranscriptWord[],
  status: BlockTimingStatus | undefined,
  blockNum: number,
  ctx: NarrationSyncContext,
): { blockStart: number; blockEnd: number; words: TranscriptWord[]; blockText: string } {
  const strict = getStrictBlockBounds(status, blockNum);
  const blockText = getBlockNarrationText(ctx, blockNum);
  const bounds = getBlockTimeBounds(status, blockNum);

  let words: TranscriptWord[] = [];
  const seen = new Set<string>();

  if (blockText && flatWords.length) {
    const matched = findBoundedNarrationMatch(blockText, flatWords, bounds);
    if (matched) {
      const mapped = mapStoryboardWordsWithTiming(
        blockText,
        flatWords,
        matched.bestFirstMatchIdx,
        matched.bestLastMatchIdx,
      );
      mapped.forEach((w) => {
        if (w.start < strict.start - 0.05 || w.start >= strict.end) return;
        const key = `${w.start.toFixed(3)}-${w.word}`;
        if (seen.has(key)) return;
        seen.add(key);
        words.push(w);
      });
    }
  }

  if (!words.length) {
    words = flatWords.filter(
      (w) => w.start >= strict.start - 0.05 && w.start < strict.end + 0.05,
    );
  }

  words.sort((a, b) => a.start - b.start);

  return {
    blockStart: strict.start,
    blockEnd: strict.end,
    words,
    blockText,
  };
}

export function getAssetDurationSeconds(
  assets: TimelineAsset[],
  assetIdx: number,
  blockDuration: number,
): number {
  const asset = assets[assetIdx];
  if (asset?.fixed != null && Number.isFinite(Number(asset.fixed))) {
    return Math.max(MIN_SCENE_SECONDS, Number(asset.fixed));
  }

  const sumFixed = assets.reduce((acc, a) => acc + (a.fixed ? Number(a.fixed) : 0), 0);
  const flexCount = assets.filter((a) => a.fixed == null).length;
  if (flexCount > 0) {
    const remaining = Math.max(MIN_SCENE_SECONDS * flexCount, blockDuration - sumFixed);
    return remaining / flexCount;
  }
  return Math.max(MIN_SCENE_SECONDS, blockDuration / Math.max(1, assets.length));
}

/** Limites sequenciais a partir da duração — sem buracos nem audio_start antigo. */
function buildSequentialSceneBoundaries(
  assets: TimelineAsset[],
  narrationStart: number,
  narrationEnd: number,
  blockDuration: number,
): number[] {
  const starts: number[] = [];
  let cursor = narrationStart;
  for (let idx = 0; idx < assets.length; idx++) {
    starts.push(cursor);
    cursor += getAssetDurationSeconds(assets, idx, blockDuration);
  }
  starts.push(Math.max(cursor, narrationEnd + 0.15));
  return starts;
}

function wordMidpoint(w: TranscriptWord): number {
  const end = Number.isFinite(w.end) ? w.end : w.start;
  return (w.start + end) / 2;
}

/** Cada palavra vai para exatamente uma cena (ponto médio dentro do intervalo). */
function assignWordsToScene(
  blockWords: TranscriptWord[],
  sceneStarts: number[],
  sceneIdx: number,
): TranscriptWord[] {
  const start = sceneStarts[sceneIdx];
  const end = sceneStarts[sceneIdx + 1];
  const isLast = sceneIdx >= sceneStarts.length - 2;

  return blockWords.filter((w) => {
    const mid = wordMidpoint(w);
    if (mid < start - 0.06) return false;
    if (isLast) return mid < end + 0.06;
    return mid < end - 0.02;
  });
}

export function buildBlockTimingModel(
  blockKey: string,
  assets: TimelineAsset[],
  flatWords: TranscriptWord[],
  status: BlockTimingStatus | undefined,
  ctx: NarrationSyncContext,
): BlockTimingModel | null {
  if (!assets.length) return null;

  const blockNum = parseInt(blockKey, 10);
  const { blockStart, blockEnd, words: blockWords, blockText } = resolveBlockWords(
    flatWords,
    status,
    blockNum,
    ctx,
  );

  const blockDuration = Math.max(MIN_SCENE_SECONDS, blockEnd - blockStart);
  const narrationStart = blockWords[0]?.start ?? blockStart;
  const narrationEnd = blockWords[blockWords.length - 1]?.end ?? blockEnd;
  const sceneStarts = buildSequentialSceneBoundaries(
    assets,
    narrationStart,
    narrationEnd,
    blockDuration,
  );

  const scenes: SceneTimingRow[] = assets.map((asset, idx) => {
    const duration = getAssetDurationSeconds(assets, idx, blockDuration);
    const windowStart = sceneStarts[idx];
    const windowEnd = sceneStarts[idx + 1];
    const sceneWords = assignWordsToScene(blockWords, sceneStarts, idx);

    const assetPath = String(asset.asset || "").trim();
    return {
      idx,
      duration,
      windowStart,
      windowEnd,
      words: sceneWords,
      narrationText: sceneWords.map((w) => repairMojibake(w.word)).join(" "),
      assetLabel: assetPath.split(/[/\\]/).pop() || `Cena ${idx + 1}`,
      assetPath,
      assetType: inferAssetType(asset),
      audioStart: windowStart,
    };
  });

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  let totalEndTime = narrationStart;
  for (let i = 0; i < assets.length; i++) {
    totalEndTime += getAssetDurationSeconds(assets, i, blockDuration);
  }
  const effectiveEnd = Math.max(totalEndTime, narrationEnd + 0.15);
  const coveredWords = blockWords.filter((w) => w.start < effectiveEnd - 0.05).length;
  const totalWords = blockWords.length;

  return {
    blockKey,
    blockNum,
    blockStart,
    blockEnd,
    narrationStart,
    narrationEnd,
    blockWords,
    blockText,
    scenes,
    totalDuration,
    coveredWords,
    totalWords,
    coveragePercent: totalWords > 0 ? Math.round((coveredWords / totalWords) * 100) : 0,
  };
}

export function setSceneDuration(
  assets: TimelineAsset[],
  sceneIdx: number,
  newDuration: number,
  blockDuration: number,
): TimelineAsset[] {
  const next = assets.map((a) => ({ ...a }));
  const clamped = Math.max(MIN_SCENE_SECONDS, Number(newDuration.toFixed(1)));
  next[sceneIdx] = { ...next[sceneIdx], fixed: clamped };
  return rebalanceBlockDurations(next, blockDuration);
}

/** Ajusta divisor entre duas cenas mantendo a soma das duas. */
export function resizeScenePair(
  assets: TimelineAsset[],
  leftIdx: number,
  deltaSeconds: number,
  blockDuration: number,
): TimelineAsset[] {
  const next = assets.map((a) => ({ ...a }));
  const leftDur = getAssetDurationSeconds(next, leftIdx, blockDuration);
  const rightIdx = leftIdx + 1;
  if (rightIdx >= next.length) return next;

  const rightDur = getAssetDurationSeconds(next, rightIdx, blockDuration);
  const newLeft = Math.max(MIN_SCENE_SECONDS, leftDur + deltaSeconds);
  const newRight = Math.max(MIN_SCENE_SECONDS, rightDur - deltaSeconds);

  next[leftIdx] = { ...next[leftIdx], fixed: parseFloat(newLeft.toFixed(1)) };
  next[rightIdx] = { ...next[rightIdx], fixed: parseFloat(newRight.toFixed(1)) };
  return next;
}

function rebalanceBlockDurations(assets: TimelineAsset[], blockDuration: number): TimelineAsset[] {
  const next = assets.map((a) => ({ ...a }));
  const sum = next.reduce((acc, a, i) => acc + getAssetDurationSeconds(next, i, blockDuration), 0);
  if (sum <= blockDuration + 0.01 || next.length === 0) return next;

  const scale = blockDuration / sum;
  return next.map((a) => ({
    ...a,
    fixed: parseFloat(Math.max(MIN_SCENE_SECONDS, Number(a.fixed || 1) * scale).toFixed(1)),
  }));
}

export function applyAudioStartsFromScenes(
  assets: TimelineAsset[],
  model: BlockTimingModel,
): TimelineAsset[] {
  return assets.map((asset, idx) => {
    const scene = model.scenes[idx];
    if (!scene) return { ...asset };
    return {
      ...asset,
      fixed: scene.duration,
      audio_start: parseFloat(scene.audioStart.toFixed(3)),
    };
  });
}

/** Alinha duração de cada cena ao trecho da fala no áudio (por texto do storyboard). */
export function syncBlockScenesToSpeech(
  blockKey: string,
  assets: TimelineAsset[],
  flatWords: TranscriptWord[],
  status: BlockTimingStatus | undefined,
  storyboard?: { visual_prompts?: Array<{ block?: number; narration_text?: string; narration_excerpt?: string }> },
): { assets: TimelineAsset[]; aligned: number } {
  const blockNum = parseInt(blockKey, 10);
  const strict = getStrictBlockBounds(status, blockNum);
  const bounds = { searchAfter: strict.start, searchBefore: strict.end };
  const next = assets.map((a) => ({ ...a }));
  const usedRanges: Array<{ start: number; end: number }> = [];
  let aligned = 0;

  for (let idx = 0; idx < next.length; idx++) {
    const sceneText = getSceneNarrationText(blockNum, idx, storyboard);
    if (!sceneText.trim()) continue;

    const matched = findBoundedNarrationMatch(sceneText, flatWords, bounds);
    if (!matched) continue;

    const overlaps = usedRanges.some(
      (r) => matched.start < r.end - 0.15 && matched.end > r.start + 0.15,
    );
    if (overlaps) continue;

    const speechDur = Math.max(MIN_SCENE_SECONDS, matched.end - matched.start);
    next[idx].fixed = parseFloat(speechDur.toFixed(1));
    next[idx].audio_start = parseFloat(matched.start.toFixed(3));
    next[idx].synced_to_speech = true;
    usedRanges.push({ start: matched.start, end: matched.end });
    aligned += 1;
  }

  return { assets: next, aligned };
}

export function formatTimelineClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(m > 0 ? 4 : 3, "0")}`;
}