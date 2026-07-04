/**
 * Texto de narração por bloco/asset e âncora temporal — fonte única editor + render.
 */

import { findNarrationMatch } from "./narrationMatch.js";

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

/**
 * Âncora de fala do bloco = timestamp da primeira palavra casada (bloco ou assets).
 */
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
  for (let idx = 0; idx < assets.length; idx += 1) {
    const narrationText = getAssetNarrationText(blockNum, idx, context);
    const matched = findNarrationMatch(narrationText, flatTranscriptWords, bounds);
    if (matched) allStarts.push(matched.start);
  }
  if (allStarts.length > 0) return Math.min(...allStarts);
  return null;
}