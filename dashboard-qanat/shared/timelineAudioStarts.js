/**
 * Duração de clip e reancoragem sequencial de audio_start — fonte única editor + render.
 */

export function computeAssetDuration(asset, allAssets, blockDuration) {
  if (asset?.fixed !== undefined && asset?.fixed !== null) {
    return Number(asset.fixed);
  }
  const sumFixed = (allAssets || []).reduce(
    (acc, c) => acc + (c?.fixed ? Number(c.fixed) : 0),
    0,
  );
  const flexibleClips = (allAssets || []).filter(
    (c) => c?.fixed === undefined || c?.fixed === null,
  );
  const nFlex = flexibleClips.length;
  if (nFlex > 0) {
    const remaining = Math.max(0.5 * nFlex, Number(blockDuration) - sumFixed);
    return remaining / nFlex;
  }
  return 0.5;
}

/**
 * Recalcula audio_start em sequência dentro de um bloco.
 * @param {object} opts
 * @param {Array} opts.assets
 * @param {number} opts.blockDuration
 * @param {number} opts.anchorStart — início da fala no bloco
 * @param {(asset: object, allAssets: object[], blockDuration: number) => number} [opts.resolveDuration]
 * @param {number} [opts.preserveUntilIndex] — mantém audio_start até este índice (inclusive)
 * @param {boolean} [opts.clearSpeechSync] — remove synced_to_speech ao recalcular
 */
export function recalculateBlockSequentialAudioStarts({
  assets = [],
  blockDuration = 10,
  anchorStart = 0,
  resolveDuration = null,
  preserveUntilIndex = -1,
  clearSpeechSync = false,
} = {}) {
  const updated = (assets || []).map((a) => ({ ...a }));
  if (!updated.length) return updated;

  const durationFn = resolveDuration || ((a, all, bd) => computeAssetDuration(a, all, bd));
  const narrationStart = Number.isFinite(Number(anchorStart)) ? Number(anchorStart) : 0;

  let cursor = narrationStart;
  for (let i = 0; i < updated.length; i += 1) {
    if (
      i <= preserveUntilIndex
      && updated[i]?.audio_start !== undefined
      && updated[i]?.audio_start !== null
    ) {
      cursor = Number(updated[i].audio_start) + durationFn(updated[i], updated, blockDuration);
      continue;
    }

    const start = i === 0 ? narrationStart : cursor;
    updated[i].audio_start = parseFloat(Number(start).toFixed(3));
    if (clearSpeechSync) {
      delete updated[i].synced_to_speech;
      delete updated[i].speech_end;
    }
    cursor = Number(updated[i].audio_start) + durationFn(updated[i], updated, blockDuration);
  }

  return updated;
}