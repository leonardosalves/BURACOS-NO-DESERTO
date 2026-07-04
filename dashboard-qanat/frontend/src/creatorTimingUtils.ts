import { getSceneDurationSeconds, isWhisperTimelineReady } from "./sceneSpeechDuration";

export const parseCreatorBlockNumber = (raw: unknown, sceneRaw?: unknown): number => {
  if (raw != null && raw !== "") {
    const n = Number(String(raw).trim());
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  if (sceneRaw != null && sceneRaw !== "") {
    const sceneStr = String(sceneRaw).trim();
    const dotMatch = sceneStr.match(/^(\d+)\./);
    if (dotMatch) return parseInt(dotMatch[1], 10);
    const n = Number(sceneStr);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return 1;
};

export const countCreatorUniqueBlocks = (visualPrompts: any[]) => {
  const blocks = new Set<number>();
  (visualPrompts || []).forEach((vp) => {
    blocks.add(parseCreatorBlockNumber(vp?.block ?? vp?.bloco, vp?.scene ?? vp?.cena));
  });
  return blocks.size;
};

export const getBlockTimingSummary = (
  visualPrompts: any[],
  blockNum: number,
  gapSeconds = 2,
  wordTranscripts?: any[],
  status?: { block_timings?: { starts?: number[] } },
) => {
  const scenes = (visualPrompts || []).filter(
    (scene: any) => parseCreatorBlockNumber(scene?.block ?? scene?.bloco, scene?.scene ?? scene?.cena) === blockNum,
  );
  const whisperReady = isWhisperTimelineReady(wordTranscripts || [], status);
  let sceneSeconds = 0;
  let complete = whisperReady && scenes.length > 0;

  scenes.forEach((scene, localIdx) => {
    const d = getSceneDurationSeconds(scene, wordTranscripts, blockNum, localIdx, status, scenes);
    if (d == null) complete = false;
    else sceneSeconds += d;
  });

  return {
    sceneCount: scenes.length,
    sceneSeconds: complete ? parseFloat(sceneSeconds.toFixed(1)) : null,
    gapSeconds: complete ? gapSeconds : null,
    totalSeconds: complete ? parseFloat((sceneSeconds + gapSeconds).toFixed(1)) : null,
    whisperReady,
  };
};