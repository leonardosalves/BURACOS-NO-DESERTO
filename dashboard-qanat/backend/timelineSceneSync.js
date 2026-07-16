import { isFilenameSourceUsedInOtherProject } from "./mediaUsageRegistry.js";
import { cleanText, findNarrationMatch } from "../shared/narrationMatch.js";
import {
  computeAssetDuration,
  computeChainedSceneDuration,
  recalculateBlockSequentialAudioStarts,
} from "../shared/timelineAudioStarts.js";
import {
  getAssetNarrationText,
  getBlockNarrationAnchor,
  getBlockNarrationText,
} from "../shared/timelineNarration.js";
import { flattenWordTranscripts } from "../shared/wordTranscripts.js";
import { dedupeNearDuplicateVisualPromptsInBlocks } from "./scriptQuality.js";
import { isPromptOnlyKeyframe } from "../shared/timelineKeyframeUtils.js";
import { isVideoAssetPath, isVideoSceneType } from "./shared/mediaTypes.js";

/**
 * Shared timeline scene timing logic — mirrors the editor preview in App.tsx
 * (getDynamicAssetWords + getAssetDuration) so render matches manual adjustments.
 */

export { findNarrationMatch } from "../shared/narrationMatch.js";
export { flattenWordTranscripts } from "../shared/wordTranscripts.js";
export {
  computeAssetDuration,
  recalculateBlockSequentialAudioStarts,
} from "../shared/timelineAudioStarts.js";
export {
  getAssetNarrationText,
  getBlockNarrationAnchor,
  getBlockNarrationText,
} from "../shared/timelineNarration.js";

export function isAssetDurationLocked(asset) {
  return asset?.fixed_locked === true;
}

export function assetHasExplicitDuration(asset) {
  const fixed = Number(asset?.fixed);
  return (
    asset?.fixed !== undefined &&
    asset?.fixed !== null &&
    Number.isFinite(fixed) &&
    fixed > 0
  );
}

export function blockHasLockedDurations(assets = []) {
  return Array.isArray(assets) && assets.some(isAssetDurationLocked);
}

export function blockUsesSequentialFixedLayout(assets = []) {
  if (!Array.isArray(assets) || assets.length === 0) return false;
  if (blockHasLockedDurations(assets)) return true;
  return assets.every(assetHasExplicitDuration);
}

/** Remove o mesmo arquivo de mídia em slots consecutivos (evita B-roll repetido). */
export function dedupeConsecutiveTimelineAssets(assets) {
  if (!Array.isArray(assets)) return [];
  const result = [];
  for (const asset of assets) {
    const path = String(asset?.asset || "").trim();
    const last = result[result.length - 1];
    if (path && last && String(last?.asset || "").trim() === path) continue;
    result.push(asset);
  }
  return result;
}

/** Rotação do pool de arquivos. offset=0 preserva ordem cronológica no primeiro auto-map. */
export function rotateAssetList(files, offset = 0) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const o = Math.abs(Number(offset) || 0) % files.length;
  return [...files.slice(o), ...files.slice(0, o)];
}

function slugifyStockToken(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function sceneBindingTokens(promptObj = {}) {
  const block = Number(promptObj.block || 1);
  const scene = String(promptObj.scene || "").trim();
  const tokens = [
    `b${block}_s`,
    `block${block}_scene`,
    `scene_${scene.replace(/\./g, "_")}`,
  ];
  if (scene) tokens.push(`s${scene.replace(/\./g, "_")}`);
  return tokens.map((t) => t.toLowerCase());
}

/** Casa arquivo de ASSETS ao stock_query / cena / asset já vinculado no storyboard. */
export function scoreAssetForScene(filename, promptObj = {}) {
  const base = String(filename || "")
    .replace(/\\/g, "/")
    .toLowerCase();
  const baseName = base.split("/").pop() || base;
  let score = 0;

  const bound = String(promptObj?.asset?.asset || promptObj?.asset_file || "")
    .replace(/\\/g, "/")
    .trim();
  if (
    bound &&
    (base === bound.toLowerCase() || baseName === bound.toLowerCase())
  ) {
    return 100;
  }

  const queries = [
    promptObj?.stock_query,
    promptObj?.stockQuery,
    promptObj?.visual_hook,
    promptObj?.busca_termo,
  ]
    .map(slugifyStockToken)
    .filter(
      (q) =>
        q.length >= 3 &&
        !["cinematic", "documentary", "documentary_scene"].includes(q)
    );

  for (const q of queries) {
    if (baseName.includes(q))
      score = Math.max(score, 12 + Math.min(q.length, 20));
  }

  for (const token of sceneBindingTokens(promptObj)) {
    if (token.length >= 4 && baseName.includes(token))
      score = Math.max(score, 25);
  }

  return score;
}

function isGloballyBlockedAsset(
  filename,
  { stockRegistry = null, currentProject = "" } = {}
) {
  if (!stockRegistry) return false;
  return isFilenameSourceUsedInOtherProject(
    filename,
    stockRegistry,
    currentProject
  );
}

function pickSemanticAsset(
  promptObj,
  assetFiles,
  blockUsed,
  globalOpts = null
) {
  if (!promptObj || !assetFiles?.length) return "";
  let best = "";
  let bestScore = 0;
  for (const file of assetFiles) {
    const path = String(file || "").trim();
    if (!path || blockUsed.has(path)) continue;
    if (isGloballyBlockedAsset(path, globalOpts)) continue;
    const s = scoreAssetForScene(path, promptObj);
    if (s > bestScore) {
      bestScore = s;
      best = path;
    }
  }
  return bestScore >= 8 ? best : "";
}

function pickHintAsset(promptObj, assetFileSet, blockUsed) {
  if (!promptObj) return "";
  const hints = [
    promptObj?.asset?.asset,
    promptObj.asset_file,
    promptObj.stock_file,
    promptObj.media_file,
    promptObj.broll_file,
  ]
    .map((v) =>
      String(v || "")
        .replace(/\\/g, "/")
        .trim()
    )
    .filter(Boolean);
  for (const hint of hints) {
    if (assetFileSet.has(hint) && !blockUsed.has(hint)) return hint;
  }
  return "";
}

const RECENT_GLOBAL_WINDOW = 8;

function pickLeastUsedAsset(
  assetFiles,
  usageCount,
  blockUsed,
  lastPath = "",
  recentGlobal = [],
  globalOpts = null
) {
  const recentSet = new Set(recentGlobal);
  const notBlocked = (f) => f && !isGloballyBlockedAsset(f, globalOpts);
  const candidates = assetFiles
    .filter(
      (f) =>
        notBlocked(f) &&
        !blockUsed.has(f) &&
        f !== lastPath &&
        !recentSet.has(f)
    )
    .sort((a, b) => (usageCount.get(a) || 0) - (usageCount.get(b) || 0));
  if (candidates.length) return candidates[0];

  const relaxed = assetFiles
    .filter((f) => notBlocked(f) && !blockUsed.has(f) && f !== lastPath)
    .sort((a, b) => (usageCount.get(a) || 0) - (usageCount.get(b) || 0));
  if (relaxed.length) return relaxed[0];

  const fallback = assetFiles
    .filter((f) => f && f !== lastPath && !blockUsed.has(f))
    .sort((a, b) => (usageCount.get(a) || 0) - (usageCount.get(b) || 0));
  return fallback[0] || "";
}

function trackRecentGlobal(recentGlobal, assetPath) {
  if (!assetPath) return;
  recentGlobal.push(assetPath);
  while (recentGlobal.length > RECENT_GLOBAL_WINDOW) recentGlobal.shift();
}

/** Nenhum arquivo repetido dentro do mesmo bloco — troca por alternativa do pool. */
export function dedupeBlockUniqueAssets(assets, assetFiles = []) {
  if (!Array.isArray(assets)) return [];
  const used = new Set();
  const pool = Array.isArray(assetFiles) ? assetFiles : [];
  let poolCursor = 0;
  const result = [];

  for (const asset of assets) {
    let path = String(asset?.asset || "").trim();
    if (!path) {
      result.push(asset);
      continue;
    }
    if (used.has(path)) {
      let replacement = "";
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[(poolCursor + i) % pool.length];
        if (candidate && !used.has(candidate) && candidate !== path) {
          replacement = candidate;
          poolCursor = (poolCursor + i + 1) % pool.length;
          break;
        }
      }
      if (!replacement) continue;
      path = replacement;
    }
    used.add(path);
    result.push({ ...asset, asset: path });
  }
  return result;
}

/** Sanitiza timeline inteira — sem repetição dentro de cada bloco. */
export function sanitizeFullTimelineAssets(timelineAssets, assetFiles = []) {
  const src = timelineAssets || {};
  const next = {};
  let replaced = 0;
  for (const blockKey of Object.keys(src)) {
    const before = src[blockKey] || [];
    const after = dedupeBlockUniqueAssets(before, assetFiles);
    replaced += Math.max(0, before.length - after.length);
    next[blockKey] = dedupeConsecutiveTimelineAssets(after);
  }
  return { timeline: next, replaced };
}

/**
 * Monta timeline_assets com anti-repetição.
 * remapping=true (auto-map): redistribui arquivos em vez de congelar o mapeamento anterior.
 */
export function buildTimelineAssetMap({
  blocks = [],
  promptsByBlock = new Map(),
  existingTimeline = {},
  assetFiles = [],
  timings = { durations: [] },
  remapping = false,
  rotateOffset = 0,
  stockRegistry = null,
  currentProject = "",
} = {}) {
  const globalOpts = { stockRegistry, currentProject };
  const timelineAssets = {};
  const warnings = [];
  const assetFileSet = new Set(assetFiles);
  const rotatedFiles = rotateAssetList(assetFiles, rotateOffset);
  const usageCount = new Map();
  const recentGlobal = [];

  for (const block of blocks) {
    const blockKey = String(block);
    const expectedScenes = promptsByBlock.get(block) || [];
    const existingBlock = Array.isArray(existingTimeline[blockKey])
      ? existingTimeline[blockKey]
      : [];
    const expectedCount = Math.max(
      1,
      expectedScenes.length || existingBlock.length || 1
    );
    const blockDuration = Number(timings.durations?.[block - 1]);
    const effectiveBlockDuration =
      Number.isFinite(blockDuration) && blockDuration > 0
        ? blockDuration
        : expectedCount * 4;
    const slotDuration = Math.max(0.5, effectiveBlockDuration / expectedCount);
    const blockUsed = new Set();
    const blockAssets = [];

    for (let slot = 0; slot < expectedCount; slot++) {
      const promptObj = expectedScenes[slot];
      const prevSlot = existingBlock[slot];
      const lastPath = blockAssets.length
        ? String(blockAssets[blockAssets.length - 1]?.asset || "").trim()
        : "";

      let assetPath = "";

      const slotLocked =
        prevSlot?.user_locked === true || prevSlot?.manual_asset === true;

      if (slotLocked && prevSlot?.asset && assetFileSet.has(prevSlot.asset)) {
        assetPath = prevSlot.asset;
      } else if (
        !remapping &&
        prevSlot?.asset &&
        assetFileSet.has(prevSlot.asset) &&
        !blockUsed.has(prevSlot.asset)
      ) {
        assetPath = prevSlot.asset;
      } else {
        assetPath = pickHintAsset(promptObj, assetFileSet, blockUsed);
        if (!assetPath) {
          assetPath = pickSemanticAsset(
            promptObj,
            rotatedFiles,
            blockUsed,
            globalOpts
          );
        }
        if (!assetPath) {
          assetPath = pickLeastUsedAsset(
            rotatedFiles,
            usageCount,
            blockUsed,
            lastPath,
            recentGlobal,
            globalOpts
          );
        }
      }

      if (assetPath) {
        usageCount.set(assetPath, (usageCount.get(assetPath) || 0) + 1);
        blockUsed.add(assetPath);
        trackRecentGlobal(recentGlobal, assetPath);
      } else {
        warnings.push(
          `Bloco ${block} slot ${slot + 1}: sem mídia disponível sem repetir.`
        );
      }

      let resolvedType = "image";
      if (assetPath) {
        resolvedType = isVideoAssetPath(assetPath) ? "video" : "image";
      } else if (promptObj?.type) {
        resolvedType = isVideoSceneType(promptObj.type) ? "video" : "image";
      } else if (prevSlot?.type) {
        resolvedType = prevSlot.type;
      }

      const entry = {
        asset: assetPath,
        type: resolvedType,
        fixed:
          prevSlot?.fixed !== undefined && prevSlot?.fixed !== null
            ? Number(prevSlot.fixed)
            : Number(slotDuration.toFixed(1)),
      };
      if (
        !remapping &&
        prevSlot?.audio_start !== undefined &&
        prevSlot?.audio_start !== null
      ) {
        entry.audio_start = prevSlot.audio_start;
      }
      if (prevSlot?.narration_segment) {
        entry.narration_segment = prevSlot.narration_segment;
      }
      if (slotLocked) {
        entry.user_locked = true;
        entry.manual_asset = true;
      }
      if (Number.isFinite(Number(prevSlot?.volume))) {
        entry.volume = Math.min(1, Math.max(0, Number(prevSlot.volume)));
      }
      if (Number.isFinite(Number(prevSlot?.playback_rate))) {
        entry.playback_rate = Math.min(
          2,
          Math.max(0.25, Number(prevSlot.playback_rate))
        );
      }
      if (!entry.narration_segment && promptObj) {
        const seg = String(
          promptObj.narration_text || promptObj.narration_excerpt || ""
        ).trim();
        if (seg) entry.narration_segment = seg;
      }
      // POV Video A/B: propaga flags para o render usar só áudio do asset
      const isPovPrompt =
        promptObj?.is_pov === true ||
        promptObj?.use_source_audio === true ||
        promptObj?.no_channel_narration === true ||
        String(promptObj?.scene_kind || "").toLowerCase() === "pov" ||
        String(promptObj?.video_role || "").toUpperCase() === "A" ||
        String(promptObj?.video_role || "").toUpperCase() === "B" ||
        prevSlot?.is_pov === true;
      if (isPovPrompt) {
        entry.is_pov = true;
        entry.scene_kind = "pov";
        entry.use_source_audio = true;
        entry.no_channel_narration = true;
        // Sem VO de canal no trecho POV (só fala embutida no asset)
        entry.narration_segment = "";
        entry.volume = Number.isFinite(Number(entry.volume)) ? entry.volume : 1;
        if (promptObj?.video_role || prevSlot?.video_role) {
          entry.video_role = promptObj?.video_role || prevSlot?.video_role;
        }
        if (promptObj?.continuity || prevSlot?.continuity) {
          entry.continuity = promptObj?.continuity || prevSlot?.continuity;
        }
        if (promptObj?.pov_pair_id || prevSlot?.pov_pair_id) {
          entry.pov_pair_id = promptObj?.pov_pair_id || prevSlot?.pov_pair_id;
        }
        if (promptObj?.pov_scene != null || prevSlot?.pov_scene != null) {
          entry.pov_scene = promptObj?.pov_scene ?? prevSlot?.pov_scene;
        }
      }
      blockAssets.push(entry);
    }

    const uniqueBlock = dedupeBlockUniqueAssets(blockAssets, rotatedFiles);
    if (uniqueBlock.length < blockAssets.length) {
      warnings.push(
        `Bloco ${block}: ${blockAssets.length - uniqueBlock.length} repetição(ões) intra-bloco substituída(s).`
      );
    }
    if (uniqueBlock.length > 0) {
      timelineAssets[blockKey] = dedupeConsecutiveTimelineAssets(uniqueBlock);
    }
  }

  const { timeline: sanitized, replaced } = sanitizeFullTimelineAssets(
    timelineAssets,
    rotatedFiles
  );
  if (replaced > 0) {
    warnings.push(
      `${replaced} slot(s) com mídia duplicada foram substituídos globalmente.`
    );
  }

  return { timelineAssets: sanitized, warnings, usageCount };
}

/**
 * Garante que cada cena termina quando a próxima começa — sem sobreposição que deixa vestígio.
 */
export function normalizeBlockSceneTimings(timings, blockEnd = Infinity) {
  if (!Array.isArray(timings) || timings.length === 0) return [];
  const sorted = [...timings].sort(
    (a, b) => a.start - b.start || a.index - b.index
  );
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = { ...sorted[i] };
    const hardLocked = isAssetDurationLocked(t.asset);
    const synced = t.asset?.synced_to_speech === true;
    const nextStart = i < sorted.length - 1 ? sorted[i + 1].start : blockEnd;
    if (!hardLocked && Number.isFinite(nextStart) && nextStart > t.start) {
      const chained = Math.max(0.5, nextStart - t.start);
      if (synced) {
        t.duration = chained;
      } else {
        t.duration = Math.max(0.5, Math.min(t.duration, chained));
      }
    }
    out.push(t);
  }
  return out;
}

/**
 * Ajusta fixed de cada slot sincronizado para encadear cenas (sem hold após a fala).
 */
export function tightenTimelineRetentionDurations(
  timelineAssets = {},
  blockTimings = {}
) {
  const out = { ...timelineAssets };
  const starts = blockTimings.starts || [];
  const durations = blockTimings.durations || [];
  const blockNums = Object.keys(out)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);

  for (const blockNum of blockNums) {
    const blockKey = String(blockNum);
    const assets = (out[blockKey] || []).map((a) => ({ ...a }));
    if (!assets.length) continue;

    const blockStart = Number(starts[blockNum - 1]);
    const blockDuration = Number(durations[blockNum - 1]);
    const nextBlockStart = Number(starts[blockNum]);
    const blockEnd = Number.isFinite(nextBlockStart)
      ? nextBlockStart
      : Number.isFinite(blockStart) && Number.isFinite(blockDuration)
        ? blockStart + blockDuration
        : Infinity;

    assets.forEach((asset, idx) => {
      if (isAssetDurationLocked(asset) || asset.synced_to_speech !== true)
        return;
      const chained = computeChainedSceneDuration(asset, assets, idx, blockEnd);
      if (chained == null) return;
      asset.fixed = parseFloat(chained.toFixed(3));
      asset.duration_from_whisper = true;
    });

    out[blockKey] = assets;
  }

  return out;
}

/**
 * Build { start, duration } for each asset in a block.
 * Prefers persisted audio_start; falls back to transcript-anchored sequential layout.
 */
export function buildBlockSceneTimings(
  blockNum,
  assets,
  blockDuration,
  flatTranscriptWords,
  context = {}
) {
  const cleanAssets = dedupeConsecutiveTimelineAssets(assets);
  if (cleanAssets.length === 0) return [];

  const blockEnd = Number(context.blockEnd);
  const safeBlockEnd = Number.isFinite(blockEnd) ? blockEnd : Infinity;

  const narrationAnchor = getBlockNarrationAnchor(
    blockNum,
    cleanAssets,
    flatTranscriptWords,
    context
  );
  const fallbackBlockStart = Number(context.blockStart);
  const anchor =
    narrationAnchor ??
    (Number.isFinite(fallbackBlockStart) ? fallbackBlockStart : 0);

  let sequentialCursor = anchor;
  const timings = [];

  const blockStartBound = Number.isFinite(fallbackBlockStart)
    ? fallbackBlockStart
    : 0;
  const useLockedSequentialLayout = blockUsesSequentialFixedLayout(cleanAssets);

  cleanAssets.forEach((asset, index) => {
    const duration = Math.max(
      0.5,
      computeAssetDuration(asset, cleanAssets, blockDuration, {
        assetIndex: index,
        blockEnd: safeBlockEnd,
      })
    );
    let start;

    // Se o asset foi sincronizado pelo usuario, usar valores salvos diretamente
    if (asset.synced_to_speech && Number.isFinite(Number(asset.audio_start))) {
      start = Number(asset.audio_start);
      sequentialCursor = start + duration;
      timings.push({ index, start, duration, asset });
      return;
    }

    if (useLockedSequentialLayout) {
      start = index === 0 ? anchor : sequentialCursor;
      sequentialCursor = start + duration;
    } else {
      const rawAudioStart = Number(asset?.audio_start);
      const audioStartInBlock =
        Number.isFinite(rawAudioStart) &&
        rawAudioStart >= blockStartBound - 0.35 &&
        rawAudioStart < safeBlockEnd - 0.25;

      if (audioStartInBlock && !isAssetDurationLocked(asset)) {
        start = rawAudioStart;
        sequentialCursor = start + duration;
      } else {
        start = sequentialCursor;
        sequentialCursor += duration;
      }
    }

    timings.push({ index, start, duration, asset });
  });

  return normalizeBlockSceneTimings(timings, safeBlockEnd);
}

export function blockHasExplicitSync(assets, { blockStart, blockEnd } = {}) {
  if (!Array.isArray(assets)) return false;
  const blockS = Number(blockStart);
  const blockE = Number(blockEnd);
  const hasBounds = Number.isFinite(blockS) && Number.isFinite(blockE);
  return assets.some((item) => {
    const start = Number(item?.audio_start);
    if (!Number.isFinite(start)) return false;
    if (!hasBounds) return true;
    return start >= blockS - 0.35 && start < blockE - 0.25;
  });
}

/**
 * Estende cada cena até a próxima começar — evita buracos pretos entre B-rolls.
 */
export function fillSceneTimelineGaps(scenes, endTime) {
  if (!Array.isArray(scenes) || scenes.length === 0) return [];
  const targetEnd = Number(endTime);
  const sorted = [...scenes]
    .filter((s) => s?.asset || s?.type === "remotion")
    .sort((a, b) => a.start - b.start || 0);
  const out = sorted.map((s) => ({ ...s }));

  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].durationLocked) continue;
    const sceneEnd = out[i].start + out[i].duration;
    const nextStart = out[i + 1].start;
    if (nextStart > sceneEnd + 0.05) {
      out[i].duration += nextStart - sceneEnd;
    }
  }

  if (Number.isFinite(targetEnd) && targetEnd > 0) {
    const last = out[out.length - 1];
    if (!last.durationLocked) {
      const lastEnd = last.start + last.duration;
      if (targetEnd > lastEnd + 0.05) {
        last.duration += targetEnd - lastEnd;
      }
    }
  }

  return out;
}

export function groupTranscriptSegmentsByBlock(wordTranscripts = []) {
  const byBlock = new Map();
  if (!Array.isArray(wordTranscripts)) return byBlock;
  for (const seg of wordTranscripts) {
    const block = Number(seg?.block);
    if (!Number.isFinite(block) || block < 1) continue;
    if (!byBlock.has(block)) byBlock.set(block, []);
    byBlock.get(block).push(seg);
  }
  return byBlock;
}

export function getTranscriptSegmentsForBlock(wordTranscripts, blockNum) {
  const segs =
    groupTranscriptSegmentsByBlock(wordTranscripts).get(blockNum) || [];
  return [...segs].sort(
    (a, b) =>
      Number(a.index) - Number(b.index) ||
      Number(a.start_time) - Number(b.start_time)
  );
}

/** block_timings a partir dos segmentos Whisper (1 cena = 1 segmento), sem vazar fala do bloco seguinte. */
export function rebuildBlockTimingsFromTranscriptSegments(
  wordTranscripts = []
) {
  const byBlock = groupTranscriptSegmentsByBlock(wordTranscripts);
  const blockNums = [...byBlock.keys()].sort((a, b) => a - b);
  if (!blockNums.length) return null;

  const starts = [];
  const durations = [];
  let totalEnd = 0;

  for (const blockNum of blockNums) {
    const ordered = getTranscriptSegmentsForBlock(wordTranscripts, blockNum);
    const blockStart = Number(ordered[0]?.start_time);
    const blockEnd = Math.max(...ordered.map((s) => Number(s.end_time)));
    if (
      !Number.isFinite(blockStart) ||
      !Number.isFinite(blockEnd) ||
      blockEnd <= blockStart
    )
      continue;
    starts.push(blockStart);
    durations.push(Math.max(0.25, blockEnd - blockStart));
    totalEnd = Math.max(totalEnd, blockEnd);
  }

  if (!starts.length) return null;
  return { starts, durations, total_duration: totalEnd };
}

function resolveSceneSpeechMatch({
  narrationText,
  flatTranscriptWords,
  transcriptSegment,
  searchAfter,
  searchBefore,
}) {
  let matched = null;
  if (narrationText && flatTranscriptWords?.length) {
    matched = findNarrationMatch(narrationText, flatTranscriptWords, {
      searchAfter,
      searchBefore,
    });
  }

  if (transcriptSegment) {
    const segStart = Number(transcriptSegment.start_time);
    const segEnd = Number(transcriptSegment.end_time);
    if (
      Number.isFinite(segStart) &&
      Number.isFinite(segEnd) &&
      segEnd > segStart
    ) {
      const segMatch = {
        start: segStart,
        end: segEnd,
        duration: segEnd - segStart,
      };
      if (!matched) return segMatch;
      if (segStart >= searchAfter - 0.35 && segEnd <= searchBefore + 0.35) {
        if (
          Math.abs(segStart - matched.start) > 1.5 ||
          Math.abs(segEnd - matched.end) > 1.5
        ) {
          return segMatch;
        }
      }
    }
  }

  return matched;
}

/**
 * Reancora audio_start / speech_end por cena — storyboard + segmentos Whisper, sem estender até o fim do bloco.
 */
export function resolveBlockBounds(
  blockNum,
  wordTranscripts,
  starts,
  durations
) {
  const transcriptSegments = getTranscriptSegmentsForBlock(
    wordTranscripts,
    blockNum
  );
  const blockStart = Number(
    transcriptSegments[0]?.start_time ?? starts[blockNum - 1]
  );
  const blockDuration = Number(durations[blockNum - 1]);
  const segmentBlockEnd = transcriptSegments.length
    ? Math.max(...transcriptSegments.map((s) => Number(s.end_time)))
    : NaN;
  const timingBlockEnd =
    Number.isFinite(blockStart) && Number.isFinite(blockDuration)
      ? blockStart + blockDuration
      : NaN;
  const blockEnd = Number.isFinite(segmentBlockEnd)
    ? segmentBlockEnd
    : timingBlockEnd;

  const isValid =
    Number.isFinite(blockStart) &&
    Number.isFinite(blockEnd) &&
    blockEnd > blockStart;

  return {
    transcriptSegments,
    blockStart,
    blockDuration,
    blockEnd,
    isValid,
  };
}

export function applySpeechWindowToAsset(
  asset,
  start,
  end,
  { idx, assets, blockEnd, narrationText, preserveExplicitFixed }
) {
  asset.audio_start = parseFloat(start.toFixed(3));
  asset.speech_end = parseFloat(end.toFixed(3));
  asset.synced_to_speech = true;
  if (narrationText) {
    asset.narration_segment = narrationText;
  }

  if (
    !isAssetDurationLocked(asset) &&
    !(preserveExplicitFixed && assetHasExplicitDuration(asset))
  ) {
    const chained = computeChainedSceneDuration(asset, assets, idx, blockEnd);
    if (chained != null) {
      asset.fixed = parseFloat(chained.toFixed(1));
    } else {
      asset.fixed = parseFloat(Math.max(0.5, end - start).toFixed(1));
    }
  }
}

/**
 * Reancora audio_start / speech_end por cena — storyboard + segmentos Whisper, sem estender até o fim do bloco.
 */
export function realignTimelineAssetsToSpeech({
  timelineAssets = {},
  blockTimings = { starts: [], durations: [] },
  flatTranscriptWords = [],
  wordTranscripts = [],
  visualPrompts = [],
  blockPhrases = [],
  preserveExplicitFixed = false,
} = {}) {
  const out = { ...timelineAssets };
  const starts = blockTimings.starts || [];
  const durations = blockTimings.durations || [];
  for (const blockKey of Object.keys(out)) {
    const blockNum = Number(blockKey);
    if (!Number.isFinite(blockNum) || blockNum < 1) continue;

    const assets = (out[blockKey] || []).map((a) => ({ ...a }));
    if (!assets.length) continue;

    const { transcriptSegments, blockStart, blockDuration, blockEnd, isValid } =
      resolveBlockBounds(blockNum, wordTranscripts, starts, durations);

    if (!isValid) continue;

    const context = {
      visualPrompts,
      blockPhrases,
      timelineAssets: out,
      blockStart,
      blockEnd,
    };

    let searchAfter = blockStart;
    let aligned = 0;

    for (let idx = 0; idx < assets.length; idx++) {
      const narrationText = getAssetNarrationText(blockNum, idx, context);
      const matched = resolveSceneSpeechMatch({
        narrationText,
        flatTranscriptWords,
        transcriptSegment: transcriptSegments[idx],
        searchAfter,
        searchBefore: blockEnd,
      });
      if (!matched) continue;

      const speechStart = Math.max(matched.start, searchAfter - 0.05);
      const speechEnd = Math.max(matched.end, speechStart + 0.25);

      applySpeechWindowToAsset(assets[idx], speechStart, speechEnd, {
        idx,
        assets,
        blockEnd,
        narrationText,
        preserveExplicitFixed,
      });

      searchAfter = speechEnd;
      aligned++;
    }

    for (let idx = 0; idx < assets.length; idx++) {
      if (assets[idx].synced_to_speech) continue;
      const seg = transcriptSegments[idx];
      if (!seg) continue;
      const segStart = Number(seg.start_time);
      const segEnd = Number(seg.end_time);
      if (
        !Number.isFinite(segStart) ||
        !Number.isFinite(segEnd) ||
        segEnd <= segStart
      )
        continue;

      const narrationText = getAssetNarrationText(blockNum, idx, context);
      applySpeechWindowToAsset(assets[idx], segStart, segEnd, {
        idx,
        assets,
        blockEnd,
        narrationText,
        preserveExplicitFixed,
      });
      if (seg.chunk_id) assets[idx].chunk_id = seg.chunk_id;
      aligned++;
    }

    if (aligned === 0 && !blockHasLockedDurations(assets)) {
      let cursor = blockStart;
      for (let idx = 0; idx < assets.length; idx++) {
        if (isAssetDurationLocked(assets[idx])) {
          cursor =
            Number(assets[idx].audio_start || cursor) +
            computeAssetDuration(assets[idx], assets, blockDuration);
          continue;
        }
        const dur = computeAssetDuration(assets[idx], assets, blockDuration);
        assets[idx].fixed = parseFloat(Math.max(0.5, dur).toFixed(1));
        assets[idx].audio_start = parseFloat(cursor.toFixed(3));
        delete assets[idx].synced_to_speech;
        delete assets[idx].speech_end;
        cursor += dur;
      }
    }

    out[blockKey] = tightenTimelineRetentionDurations(
      { [blockKey]: assets },
      blockTimings
    )[blockKey];
  }

  return tightenTimelineRetentionDurations(out, blockTimings);
}

// isPromptOnlyKeyframe importado de ../shared/timelineKeyframeUtils.js

function groupVisualPromptsByBlock(visualPrompts = []) {
  const byBlock = new Map();
  for (const vp of visualPrompts) {
    // Keyframes POV: só prompt para gerar vídeo — não criam slot de upload/timeline
    if (isPromptOnlyKeyframe(vp)) continue;
    const block = Number(vp?.block || 1);
    if (!byBlock.has(block)) byBlock.set(block, []);
    byBlock.get(block).push(vp);
  }
  for (const scenes of byBlock.values()) {
    scenes.sort((a, b) =>
      String(a?.scene || "").localeCompare(String(b?.scene || ""))
    );
  }
  return byBlock;
}

/**
 * Cria/atualiza slots da timeline a partir dos segmentos Whisper — sem distribuir mídia (wizard manual).
 */
export function bootstrapTimelineSlotsFromWhisper({
  timelineAssets = {},
  wordTranscripts = [],
  visualPrompts = [],
  blockPhrases = [],
  flatTranscriptWords = [],
} = {}) {
  if (!Array.isArray(wordTranscripts) || wordTranscripts.length === 0) {
    return { ...timelineAssets };
  }

  const promptsByBlock = groupVisualPromptsByBlock(visualPrompts);
  const segmentBlocks = [
    ...groupTranscriptSegmentsByBlock(wordTranscripts).keys(),
  ];
  const promptBlocks = [...promptsByBlock.keys()];
  const blockNums = [...new Set([...segmentBlocks, ...promptBlocks])].sort(
    (a, b) => a - b
  );
  const out = { ...timelineAssets };

  for (const blockNum of blockNums) {
    const blockKey = String(blockNum);
    const segments = getTranscriptSegmentsForBlock(wordTranscripts, blockNum);
    const scenes = promptsByBlock.get(blockNum) || [];
    const existing = Array.isArray(out[blockKey]) ? out[blockKey] : [];
    // Fonte de verdade: visual_prompts do bloco.
    // NÃO criar slot extra porque o Whisper tem mais segmentos — isso gerava
    // "última cena do bloco" duplicada (uma com segundos, uma sem / ~2s).
    const lockedExisting = existing.filter(
      (e) => e?.user_locked === true || e?.manual_asset === true
    ).length;
    const slotCount =
      scenes.length > 0
        ? Math.max(scenes.length, lockedExisting)
        : Math.max(segments.length, existing.length, 1);
    const blockAssets = [];

    for (let idx = 0; idx < slotCount; idx++) {
      const prev = existing[idx] || {};
      // Se há mais segmentos Whisper que cenas, o ÚLTIMO slot absorve o resto
      // (evita residual ~2s como “cena fantasma” no fim do bloco).
      let seg = segments[idx];
      if (
        scenes.length > 0 &&
        idx === scenes.length - 1 &&
        segments.length > scenes.length
      ) {
        const tail = segments.slice(idx);
        if (tail.length) {
          const start = Number(tail[0].start_time);
          const end = Math.max(...tail.map((s) => Number(s.end_time)));
          seg = {
            ...tail[0],
            start_time: start,
            end_time: end,
            text: tail.map((s) => String(s.text || "").trim()).join(" "),
          };
        }
      }
      const scene = scenes[idx];
      const narrationText = scene
        ? String(scene.narration_text || scene.narration_excerpt || "").trim()
        : getAssetNarrationText(blockNum, idx, {
            visualPrompts,
            blockPhrases,
            timelineAssets: out,
          });

      const entry = {
        asset: String(prev.asset || "").trim(),
        type: prev.type || "image",
        narration_segment: narrationText || prev.narration_segment || "",
      };

      if (prev.user_locked || prev.manual_asset) {
        entry.user_locked = true;
        entry.manual_asset = true;
        if (prev.asset) entry.asset = prev.asset;
        if (prev.type) entry.type = prev.type;
      }

      const flatWords = flatTranscriptWords;
      const blockStart = Number(segments[0]?.start_time);
      const blockEnd = segments.length
        ? Math.max(...segments.map((s) => Number(s.end_time)))
        : NaN;
      const searchAfter =
        idx > 0 && blockAssets[idx - 1]?.speech_end != null
          ? Number(blockAssets[idx - 1].speech_end)
          : blockStart;

      const speechMatch =
        flatWords?.length && narrationText
          ? resolveSceneSpeechMatch({
              narrationText,
              flatTranscriptWords: flatWords,
              transcriptSegment: seg,
              searchAfter: Number.isFinite(searchAfter) ? searchAfter : 0,
              searchBefore: Number.isFinite(blockEnd) ? blockEnd : Infinity,
            })
          : null;

      if (speechMatch) {
        const speechDur = Math.max(0.5, speechMatch.end - speechMatch.start);
        entry.audio_start = parseFloat(speechMatch.start.toFixed(3));
        entry.speech_end = parseFloat(speechMatch.end.toFixed(3));
        entry.fixed = parseFloat(speechDur.toFixed(1));
        entry.synced_to_speech = true;
        entry.duration_from_whisper = true;
      } else if (seg) {
        const segStart = Number(seg.start_time);
        const segEnd = Number(seg.end_time);
        if (
          Number.isFinite(segStart) &&
          Number.isFinite(segEnd) &&
          segEnd > segStart
        ) {
          const speechDur = Math.max(0.5, segEnd - segStart);
          entry.audio_start = parseFloat(segStart.toFixed(3));
          entry.speech_end = parseFloat(segEnd.toFixed(3));
          entry.fixed = parseFloat(speechDur.toFixed(1));
          entry.synced_to_speech = true;
          entry.duration_from_whisper = true;
        }
      } else if (
        prev.fixed !== undefined &&
        prev.fixed !== null &&
        prev.fixed_locked
      ) {
        entry.fixed = Number(prev.fixed);
        entry.fixed_locked = true;
      } else if (prev.fixed !== undefined && prev.fixed !== null) {
        entry.fixed = Number(prev.fixed);
      }

      if (prev.fixed_locked && !entry.fixed_locked) {
        entry.fixed_locked = true;
        if (prev.fixed !== undefined) entry.fixed = Number(prev.fixed);
      }

      blockAssets.push(entry);
    }

    if (blockAssets.length) out[blockKey] = blockAssets;
  }

  return out;
}

/** Atualiza duração de cada cena no storyboard — 100% da voz, frase a frase (sem estimativa). */
export function applyWhisperDurationsToStoryboard(
  storyboard = {},
  wordTranscripts = [],
  { flatTranscriptWords = null, blockTimings = null } = {}
) {
  let prompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  if (!prompts.length || !wordTranscripts.length) return storyboard;

  // Antes do Whisper: remove última cena do bloco duplicada (com/sem segundos)
  prompts = dedupeNearDuplicateVisualPromptsInBlocks(prompts);

  const flat = flatTranscriptWords || flattenWordTranscripts(wordTranscripts);
  if (!flat.length) {
    return { ...storyboard, visual_prompts: prompts };
  }

  const timings =
    blockTimings || rebuildBlockTimingsFromTranscriptSegments(wordTranscripts);
  const starts = timings?.starts || [];
  const durations = timings?.durations || [];

  const scenesByBlock = groupVisualPromptsByBlock(prompts);
  const indexByVp = new Map();
  prompts.forEach((vp, idx) => indexByVp.set(vp, idx));

  const nextPrompts = [...prompts];
  for (const [blockNum, scenes] of scenesByBlock) {
    const { transcriptSegments, blockStart, blockEnd, isValid } =
      resolveBlockBounds(blockNum, wordTranscripts, starts, durations);

    if (!isValid) continue;

    let searchAfter = blockStart;
    scenes.forEach((vp, localIdx) => {
      const idx = indexByVp.get(vp);
      if (idx == null) return;

      const narrationText = String(
        vp?.narration_text || vp?.narration_excerpt || ""
      ).trim();
      const matched = resolveSceneSpeechMatch({
        narrationText,
        flatTranscriptWords: flat,
        transcriptSegment: transcriptSegments[localIdx],
        searchAfter,
        searchBefore: blockEnd,
      });
      if (!matched) return;

      const dur = parseFloat(
        Math.max(0.5, matched.end - matched.start).toFixed(1)
      );
      nextPrompts[idx] = {
        ...vp,
        duration: `${dur} segundos`,
        duration_seconds: dur,
        duration_from_whisper: true,
        speech_start: parseFloat(matched.start.toFixed(3)),
        speech_end: parseFloat(matched.end.toFixed(3)),
      };
      searchAfter = matched.end;
    });
  }

  return { ...storyboard, visual_prompts: nextPrompts };
}

/** Pós-Whisper: block_timings + slots com segundos da voz (sem auto-map de mídia). */
export function syncProjectTimelineAfterWhisper({
  timelineAssets = {},
  blockTimings = { starts: [], durations: [] },
  wordTranscripts = [],
  flatTranscriptWords = [],
  visualPrompts = [],
  blockPhrases = [],
  preserveExplicitFixed = false,
} = {}) {
  const rebuilt = rebuildBlockTimingsFromTranscriptSegments(wordTranscripts);
  const timings = rebuilt || blockTimings;
  const cleanPrompts = dedupeNearDuplicateVisualPromptsInBlocks(visualPrompts);

  let slots = bootstrapTimelineSlotsFromWhisper({
    timelineAssets,
    wordTranscripts,
    visualPrompts: cleanPrompts,
    blockPhrases,
    flatTranscriptWords,
  });

  const timelineAssetsSynced = realignTimelineAssetsToSpeech({
    timelineAssets: slots,
    blockTimings: timings,
    flatTranscriptWords,
    wordTranscripts,
    visualPrompts: cleanPrompts,
    blockPhrases,
    preserveExplicitFixed,
  });

  return {
    visualPrompts: cleanPrompts,
    timelineAssets: tightenTimelineRetentionDurations(
      timelineAssetsSynced,
      timings
    ),
    blockTimings: timings,
  };
}

/** Recalcula audio_start em sequência (durações fixas) — usado após auto-map. */
export function recalculateSequentialAudioStarts({
  timelineAssets = {},
  blockTimings = { starts: [], durations: [] },
  flatTranscriptWords = [],
  visualPrompts = [],
  blockPhrases = [],
} = {}) {
  const out = { ...timelineAssets };
  const starts = blockTimings.starts || [];
  const durations = blockTimings.durations || [];

  for (const blockKey of Object.keys(out)) {
    const blockNum = Number(blockKey);
    if (!Number.isFinite(blockNum) || blockNum < 1) continue;

    const assets = (out[blockKey] || []).map((a) => ({ ...a }));
    if (!assets.length) continue;

    if (assets.some((a) => a.synced_to_speech)) continue;

    const blockStart = Number(starts[blockNum - 1]);
    const blockDuration = Number(durations[blockNum - 1]);
    const blockEnd =
      Number.isFinite(blockStart) && Number.isFinite(blockDuration)
        ? blockStart + blockDuration
        : Infinity;
    const context = {
      visualPrompts,
      blockPhrases,
      timelineAssets: out,
      blockStart,
      blockEnd,
    };

    const anchor = getBlockNarrationAnchor(
      blockNum,
      assets,
      flatTranscriptWords,
      context
    );
    out[blockKey] = recalculateBlockSequentialAudioStarts({
      assets,
      blockDuration,
      anchorStart: anchor ?? (Number.isFinite(blockStart) ? blockStart : 0),
      clearSpeechSync: true,
    });
  }

  return out;
}
