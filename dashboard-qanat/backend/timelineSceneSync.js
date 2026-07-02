import { isFilenameSourceUsedInOtherProject } from "./mediaUsageRegistry.js";

/**
 * Shared timeline scene timing logic — mirrors the editor preview in App.tsx
 * (getDynamicAssetWords + getAssetDuration) so render matches manual adjustments.
 */

const PORTUGUESE_STOP_WORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "para", "com", "por", "sob", "sobre", "sem",
  "que", "se", "e", "ou", "mas", "porem", "todavia", "contudo", "entretanto",
  "aqui", "ali", "la", "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
  "eu", "tu", "ele", "ela", "nos", "vos", "eles", "elas", "me", "te", "se", "lhe",
  "ao", "aos", "pelo", "pela", "pelos", "pelas", "num", "numa", "nuns", "numas",
  "como", "mais", "muito", "seus", "suas", "seu", "sua", "dele", "dela", "deles", "delas",
]);

function cleanText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function matchWords(w1, w2) {
  if (w1 === w2) return true;
  const s1 = w1.endsWith("s") ? w1.slice(0, -1) : w1;
  const s2 = w2.endsWith("s") ? w2.slice(0, -1) : w2;
  return s1 === s2 && s1.length > 3;
}

export function flattenWordTranscripts(wordTranscripts) {
  const flatList = [];
  if (!Array.isArray(wordTranscripts)) return flatList;

  for (const segment of wordTranscripts) {
    const segStart = segment.start_time || 0;
    if (segment.words && Array.isArray(segment.words) && segment.words.length > 0) {
      for (const w of segment.words) {
        let wStart = w.start;
        let wEnd = w.end;
        if (wStart < segStart) {
          wStart += segStart;
          wEnd += segStart;
        }
        const cleanArr = cleanText(w.word);
        flatList.push({
          word: w.word,
          clean: cleanArr[cleanArr.length - 1] || "",
          start: wStart,
          end: wEnd,
        });
      }
    }
  }
  return flatList;
}

export function findNarrationMatch(
  narrationText,
  flatTranscriptWords,
  { searchAfter = 0, searchBefore = Infinity } = {},
) {
  if (!narrationText || !flatTranscriptWords?.length) return null;

  const targetWords = cleanText(narrationText);
  if (targetWords.length === 0) return null;

  const eligible = flatTranscriptWords
    .map((w, idx) => ({ w, idx }))
    .filter(({ w }) => w.start >= searchAfter - 0.35 && w.start <= searchBefore + 0.5);

  if (eligible.length === 0) return null;

  const targetWeights = targetWords.map((w) => (PORTUGUESE_STOP_WORDS.has(w) ? 1 : 10));
  const maxPossibleScore = targetWeights.reduce((acc, val) => acc + val, 0);
  const N = targetWords.length;
  const W = N + 8;

  let bestScore = 0;
  let bestFirstMatchIdx = -1;
  let bestLastMatchIdx = -1;

  for (let i = 0; i <= eligible.length - Math.min(N, eligible.length); i++) {
    let score = 0;
    let firstMatchIdxInWindow = -1;
    let lastMatchIdxInWindow = -1;
    const matchedTargetIndices = new Set();
    const windowWords = eligible.slice(i, i + W);

    windowWords.forEach((entry, twIdx) => {
      const cleanTw = entry.w.clean;
      for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
        if (!matchedTargetIndices.has(tIdx) && matchWords(targetWords[tIdx], cleanTw)) {
          score += targetWeights[tIdx];
          matchedTargetIndices.add(tIdx);
          if (firstMatchIdxInWindow === -1) firstMatchIdxInWindow = twIdx;
          lastMatchIdxInWindow = twIdx;
          break;
        }
      }
    });

    const currentFirstAbs = eligible[i + firstMatchIdxInWindow]?.idx ?? -1;
    const currentLastAbs = eligible[i + lastMatchIdxInWindow]?.idx ?? -1;
    const currentSpan = currentLastAbs - currentFirstAbs;
    const bestSpan = bestLastMatchIdx - bestFirstMatchIdx;

    if (
      score > bestScore ||
      (score === bestScore &&
        score > 0 &&
        firstMatchIdxInWindow !== -1 &&
        (bestFirstMatchIdx === -1 || currentSpan < bestSpan))
    ) {
      bestScore = score;
      bestFirstMatchIdx = currentFirstAbs;
      bestLastMatchIdx = currentLastAbs;
    }
  }

  const threshold = Math.max(2, Math.min(11, Math.floor(maxPossibleScore * 0.5)));
  if (bestScore >= threshold && bestFirstMatchIdx !== -1 && bestLastMatchIdx !== -1) {
    const start = flatTranscriptWords[bestFirstMatchIdx].start;
    const end = flatTranscriptWords[bestLastMatchIdx].end;
    return { start, end, duration: end - start, bestFirstMatchIdx, bestLastMatchIdx };
  }
  return null;
}

export function getAssetNarrationText(blockNum, assetIdx, { visualPrompts = [], blockPhrases = [], timelineAssets = {} } = {}) {
  const blockScenes = visualPrompts.filter((vp) => Number(vp?.block) === blockNum);
  if (blockScenes.length > assetIdx) {
    const sceneText = String(
      blockScenes[assetIdx]?.narration_text || blockScenes[assetIdx]?.narration_excerpt || "",
    ).trim();
    if (sceneText) return sceneText;
  }

  const blockKey = String(blockNum);
  const assets = timelineAssets[blockKey] || [];
  const segment = String(assets[assetIdx]?.narration_segment || "").trim();
  if (segment) return segment;

  if (assets.length <= 1) {
    const bp = blockPhrases.find((x) => Number(x?.block) === blockNum);
    return bp?.phrase || "";
  }
  return "";
}

export function isAssetDurationLocked(asset) {
  return asset?.fixed_locked === true;
}

export function assetHasExplicitDuration(asset) {
  const fixed = Number(asset?.fixed);
  return asset?.fixed !== undefined && asset?.fixed !== null && Number.isFinite(fixed) && fixed > 0;
}

export function blockHasLockedDurations(assets = []) {
  return Array.isArray(assets) && assets.some(isAssetDurationLocked);
}

export function blockUsesSequentialFixedLayout(assets = []) {
  if (!Array.isArray(assets) || assets.length === 0) return false;
  if (blockHasLockedDurations(assets)) return true;
  return assets.every(assetHasExplicitDuration);
}

/** Same formula as getAssetDuration() in App.tsx */
export function computeAssetDuration(asset, allAssets, blockDuration) {
  if (asset?.fixed !== undefined && asset?.fixed !== null) {
    return Number(asset.fixed);
  }
  const sumFixed = allAssets.reduce((acc, c) => acc + (c?.fixed ? Number(c.fixed) : 0), 0);
  const flexibleClips = allAssets.filter((c) => c?.fixed === undefined || c?.fixed === null);
  const nFlex = flexibleClips.length;
  if (nFlex > 0) {
    const remaining = Math.max(0.5 * nFlex, blockDuration - sumFixed);
    return remaining / nFlex;
  }
  return 0.5;
}

/**
 * Block narration anchor = timestamp of the first matched word across all assets
 * (same as blockNarrationWordsCache[0].start in the editor).
 */
export function getBlockNarrationText(blockNum, context = {}) {
  const { visualPrompts = [], blockPhrases = [] } = context;
  const scenes = visualPrompts.filter((vp) => Number(vp?.block) === blockNum);
  const sceneTexts = scenes
    .map((vp) => String(vp?.narration_text || vp?.narration_excerpt || "").trim())
    .filter(Boolean);
  if (sceneTexts.length > 0) return sceneTexts.join(" ");
  const bp = blockPhrases.find((x) => Number(x?.block) === blockNum);
  return String(bp?.phrase || "").trim();
}

export function getBlockNarrationAnchor(blockNum, assets, flatTranscriptWords, context = {}) {
  const searchAfter = Number(context.blockStart);
  const searchBefore = Number(context.blockEnd);
  const bounds = {
    searchAfter: Number.isFinite(searchAfter) ? searchAfter : 0,
    searchBefore: Number.isFinite(searchBefore) ? searchBefore : Infinity,
  };

  const blockText = getBlockNarrationText(blockNum, context);
  if (blockText) {
    const blockMatch = findNarrationMatch(blockText, flatTranscriptWords, bounds);
    if (blockMatch) return blockMatch.start;
  }

  const allStarts = [];
  for (let idx = 0; idx < assets.length; idx++) {
    const narrationText = getAssetNarrationText(blockNum, idx, context);
    const matched = findNarrationMatch(narrationText, flatTranscriptWords, bounds);
    if (matched) allStarts.push(matched.start);
  }
  if (allStarts.length > 0) return Math.min(...allStarts);
  return null;
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
  const base = String(filename || "").replace(/\\/g, "/").toLowerCase();
  const baseName = base.split("/").pop() || base;
  let score = 0;

  const bound = String(promptObj?.asset?.asset || promptObj?.asset_file || "").replace(/\\/g, "/").trim();
  if (bound && (base === bound.toLowerCase() || baseName === bound.toLowerCase())) {
    return 100;
  }

  const queries = [
    promptObj?.stock_query,
    promptObj?.stockQuery,
    promptObj?.visual_hook,
    promptObj?.busca_termo,
  ]
    .map(slugifyStockToken)
    .filter((q) => q.length >= 3 && !["cinematic", "documentary", "documentary_scene"].includes(q));

  for (const q of queries) {
    if (baseName.includes(q)) score = Math.max(score, 12 + Math.min(q.length, 20));
  }

  for (const token of sceneBindingTokens(promptObj)) {
    if (token.length >= 4 && baseName.includes(token)) score = Math.max(score, 25);
  }

  return score;
}

function isGloballyBlockedAsset(filename, { stockRegistry = null, currentProject = "" } = {}) {
  if (!stockRegistry) return false;
  return isFilenameSourceUsedInOtherProject(filename, stockRegistry, currentProject);
}

function pickSemanticAsset(promptObj, assetFiles, blockUsed, globalOpts = null) {
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
    .map((v) => String(v || "").replace(/\\/g, "/").trim())
    .filter(Boolean);
  for (const hint of hints) {
    if (assetFileSet.has(hint) && !blockUsed.has(hint)) return hint;
  }
  return "";
}

const RECENT_GLOBAL_WINDOW = 8;

function pickLeastUsedAsset(assetFiles, usageCount, blockUsed, lastPath = "", recentGlobal = [], globalOpts = null) {
  const recentSet = new Set(recentGlobal);
  const notBlocked = (f) => f && !isGloballyBlockedAsset(f, globalOpts);
  const candidates = assetFiles
    .filter((f) => notBlocked(f) && !blockUsed.has(f) && f !== lastPath && !recentSet.has(f))
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
    const existingBlock = Array.isArray(existingTimeline[blockKey]) ? existingTimeline[blockKey] : [];
    const expectedCount = Math.max(1, expectedScenes.length || existingBlock.length || 1);
    const blockDuration = Number(timings.durations?.[block - 1]);
    const effectiveBlockDuration = Number.isFinite(blockDuration) && blockDuration > 0 ? blockDuration : expectedCount * 4;
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

      const slotLocked = prevSlot?.user_locked === true || prevSlot?.manual_asset === true;

      if (slotLocked && prevSlot?.asset && assetFileSet.has(prevSlot.asset)) {
        assetPath = prevSlot.asset;
      } else if (!remapping && prevSlot?.asset && assetFileSet.has(prevSlot.asset) && !blockUsed.has(prevSlot.asset)) {
        assetPath = prevSlot.asset;
      } else {
        assetPath = pickHintAsset(promptObj, assetFileSet, blockUsed);
        if (!assetPath) {
          assetPath = pickSemanticAsset(promptObj, rotatedFiles, blockUsed, globalOpts);
        }
        if (!assetPath) {
          assetPath = pickLeastUsedAsset(rotatedFiles, usageCount, blockUsed, lastPath, recentGlobal, globalOpts);
        }
      }

      if (assetPath) {
        usageCount.set(assetPath, (usageCount.get(assetPath) || 0) + 1);
        blockUsed.add(assetPath);
        trackRecentGlobal(recentGlobal, assetPath);
      } else {
        warnings.push(`Bloco ${block} slot ${slot + 1}: sem mídia disponível sem repetir.`);
      }

      let resolvedType = "image";
      if (assetPath) {
        resolvedType = /\.(mp4|mov|webm)$/i.test(assetPath) ? "video" : "image";
      } else if (promptObj?.type) {
        resolvedType = String(promptObj.type).includes("video") || String(promptObj.type).includes("vídeo")
          ? "video"
          : "image";
      } else if (prevSlot?.type) {
        resolvedType = prevSlot.type;
      }

      const entry = {
        asset: assetPath,
        type: resolvedType,
        fixed: prevSlot?.fixed !== undefined && prevSlot?.fixed !== null
          ? Number(prevSlot.fixed)
          : Number(slotDuration.toFixed(1)),
      };
      if (!remapping && prevSlot?.audio_start !== undefined && prevSlot?.audio_start !== null) {
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
        entry.playback_rate = Math.min(2, Math.max(0.25, Number(prevSlot.playback_rate)));
      }
      if (!entry.narration_segment && promptObj) {
        const seg = String(promptObj.narration_text || promptObj.narration_excerpt || "").trim();
        if (seg) entry.narration_segment = seg;
      }
      blockAssets.push(entry);
    }

    const uniqueBlock = dedupeBlockUniqueAssets(blockAssets, rotatedFiles);
    if (uniqueBlock.length < blockAssets.length) {
      warnings.push(`Bloco ${block}: ${blockAssets.length - uniqueBlock.length} repetição(ões) intra-bloco substituída(s).`);
    }
    if (uniqueBlock.length > 0) {
      timelineAssets[blockKey] = dedupeConsecutiveTimelineAssets(uniqueBlock);
    }
  }

  const { timeline: sanitized, replaced } = sanitizeFullTimelineAssets(timelineAssets, rotatedFiles);
  if (replaced > 0) {
    warnings.push(`${replaced} slot(s) com mídia duplicada foram substituídos globalmente.`);
  }

  return { timelineAssets: sanitized, warnings, usageCount };
}

/**
 * Garante que cada cena termina quando a próxima começa — sem sobreposição que deixa vestígio.
 */
export function normalizeBlockSceneTimings(timings, blockEnd = Infinity) {
  if (!Array.isArray(timings) || timings.length === 0) return [];
  const sorted = [...timings].sort((a, b) => a.start - b.start || a.index - b.index);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = { ...sorted[i] };
    const locked = isAssetDurationLocked(t.asset) || assetHasExplicitDuration(t.asset);
    const nextStart = i < sorted.length - 1 ? sorted[i + 1].start : blockEnd;
    if (!locked && Number.isFinite(nextStart) && nextStart > t.start) {
      t.duration = Math.max(0.5, Math.min(t.duration, nextStart - t.start));
    }
    out.push(t);
  }
  return out;
}

/**
 * Build { start, duration } for each asset in a block.
 * Prefers persisted audio_start; falls back to transcript-anchored sequential layout.
 */
export function buildBlockSceneTimings(blockNum, assets, blockDuration, flatTranscriptWords, context = {}) {
  const cleanAssets = dedupeConsecutiveTimelineAssets(assets);
  if (cleanAssets.length === 0) return [];

  const blockEnd = Number(context.blockEnd);
  const safeBlockEnd = Number.isFinite(blockEnd) ? blockEnd : Infinity;

  const narrationAnchor = getBlockNarrationAnchor(blockNum, cleanAssets, flatTranscriptWords, context);
  const fallbackBlockStart = Number(context.blockStart);
  const anchor = narrationAnchor ?? (Number.isFinite(fallbackBlockStart) ? fallbackBlockStart : 0);

  let sequentialCursor = anchor;
  const timings = [];

  const blockStartBound = Number.isFinite(fallbackBlockStart) ? fallbackBlockStart : 0;
  const useLockedSequentialLayout = blockUsesSequentialFixedLayout(cleanAssets);

  cleanAssets.forEach((asset, index) => {
    const duration = Math.max(0.5, computeAssetDuration(asset, cleanAssets, blockDuration));
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
      const audioStartInBlock = Number.isFinite(rawAudioStart)
        && rawAudioStart >= blockStartBound - 0.35
        && rawAudioStart < safeBlockEnd - 0.25;

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
    .filter((s) => s?.asset)
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
  const segs = groupTranscriptSegmentsByBlock(wordTranscripts).get(blockNum) || [];
  return [...segs].sort(
    (a, b) => Number(a.index) - Number(b.index) || Number(a.start_time) - Number(b.start_time),
  );
}

/** block_timings a partir dos segmentos Whisper (1 cena = 1 segmento), sem vazar fala do bloco seguinte. */
export function rebuildBlockTimingsFromTranscriptSegments(wordTranscripts = []) {
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
    if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd) || blockEnd <= blockStart) continue;
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
    if (Number.isFinite(segStart) && Number.isFinite(segEnd) && segEnd > segStart) {
      const segMatch = {
        start: segStart,
        end: segEnd,
        duration: segEnd - segStart,
      };
      if (!matched) return segMatch;
      if (segStart >= searchAfter - 0.35 && segEnd <= searchBefore + 0.35) {
        if (Math.abs(segStart - matched.start) > 1.5 || Math.abs(segEnd - matched.end) > 1.5) {
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

    const transcriptSegments = getTranscriptSegmentsForBlock(wordTranscripts, blockNum);
    const blockStart = Number(
      transcriptSegments[0]?.start_time ?? starts[blockNum - 1],
    );
    const blockDuration = Number(durations[blockNum - 1]);
    const segmentBlockEnd = transcriptSegments.length
      ? Math.max(...transcriptSegments.map((s) => Number(s.end_time)))
      : NaN;
    const timingBlockEnd = Number.isFinite(blockStart) && Number.isFinite(blockDuration)
      ? blockStart + blockDuration
      : NaN;
    const blockEnd = Number.isFinite(segmentBlockEnd)
      ? segmentBlockEnd
      : timingBlockEnd;

    if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd) || blockEnd <= blockStart) continue;

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

      assets[idx].audio_start = parseFloat(speechStart.toFixed(3));
      assets[idx].speech_end = parseFloat(speechEnd.toFixed(3));
      assets[idx].synced_to_speech = true;
      if (narrationText) {
        assets[idx].narration_segment = narrationText;
      }

      if (!isAssetDurationLocked(assets[idx])) {
        if (!(preserveExplicitFixed && assetHasExplicitDuration(assets[idx]))) {
          const nextMatch = idx < assets.length - 1
            ? resolveSceneSpeechMatch({
              narrationText: getAssetNarrationText(blockNum, idx + 1, context),
              flatTranscriptWords,
              transcriptSegment: transcriptSegments[idx + 1],
              searchAfter: speechEnd,
              searchBefore: blockEnd,
            })
            : null;
          if (nextMatch) {
            assets[idx].fixed = parseFloat(Math.max(0.5, nextMatch.start - speechStart).toFixed(1));
          } else {
            assets[idx].fixed = parseFloat(Math.max(0.5, speechEnd - speechStart).toFixed(1));
          }
        }
      }

      searchAfter = speechEnd;
      aligned++;
    }

    if (aligned === 0 && !blockHasLockedDurations(assets)) {
      let cursor = blockStart;
      for (let idx = 0; idx < assets.length; idx++) {
        if (isAssetDurationLocked(assets[idx])) {
          cursor = Number(assets[idx].audio_start || cursor) + computeAssetDuration(assets[idx], assets, blockDuration);
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

    out[blockKey] = assets;
  }

  return out;
}

/** Pós-Whisper: reconstrói block_timings e sincroniza timeline_assets com os segmentos. */
export function syncProjectTimelineAfterWhisper({
  timelineAssets = {},
  blockTimings = { starts: [], durations: [] },
  wordTranscripts = [],
  flatTranscriptWords = [],
  visualPrompts = [],
  blockPhrases = [],
  preserveExplicitFixed = true,
} = {}) {
  const rebuilt = rebuildBlockTimingsFromTranscriptSegments(wordTranscripts);
  const timings = rebuilt || blockTimings;
  const timelineAssetsSynced = realignTimelineAssetsToSpeech({
    timelineAssets,
    blockTimings: timings,
    flatTranscriptWords,
    wordTranscripts,
    visualPrompts,
    blockPhrases,
    preserveExplicitFixed,
  });
  return { timelineAssets: timelineAssetsSynced, blockTimings: timings };
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
    const blockEnd = Number.isFinite(blockStart) && Number.isFinite(blockDuration)
      ? blockStart + blockDuration
      : Infinity;
    const context = {
      visualPrompts,
      blockPhrases,
      timelineAssets: out,
      blockStart,
      blockEnd,
    };

    const anchor = getBlockNarrationAnchor(blockNum, assets, flatTranscriptWords, context);
    let cursor = anchor ?? (Number.isFinite(blockStart) ? blockStart : 0);

    for (let idx = 0; idx < assets.length; idx++) {
      const dur = computeAssetDuration(assets[idx], assets, blockDuration);
      assets[idx].audio_start = parseFloat(cursor.toFixed(3));
      delete assets[idx].synced_to_speech;
      cursor += dur;
    }

    out[blockKey] = assets;
  }

  return out;
}