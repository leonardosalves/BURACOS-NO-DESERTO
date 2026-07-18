import { spawnSync } from "child_process";

const analysisCache = new Map();

const CATEGORY_MIX = {
  ambience: {
    targetMeanDb: -38,
    targetPeakDb: -18,
    floor: 0.12,
    ceiling: 0.42,
    reference: 0.06,
  },
  detail: {
    targetMeanDb: -32,
    targetPeakDb: -12,
    floor: 0.18,
    ceiling: 0.55,
    reference: 0.09,
  },
  impact: {
    targetMeanDb: -27,
    targetPeakDb: -8,
    floor: 0.24,
    ceiling: 0.68,
    reference: 0.13,
  },
  riser: {
    targetMeanDb: -34,
    targetPeakDb: -12,
    floor: 0.16,
    ceiling: 0.5,
    reference: 0.09,
  },
  transition: {
    targetMeanDb: -32,
    targetPeakDb: -11,
    floor: 0.18,
    ceiling: 0.52,
    reference: 0.1,
  },
  utility: {
    targetMeanDb: -35,
    targetPeakDb: -15,
    floor: 0.12,
    ceiling: 0.4,
    reference: 0.05,
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = (value, digits = 3) => Number(Number(value).toFixed(digits));

export function parseVolumeDetectOutput(output) {
  const text = String(output || "");
  const meanMatch = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i);
  const peakMatch = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/i);
  const meanDb = Number(meanMatch?.[1]);
  const maxDb = Number(peakMatch?.[1]);
  if (!Number.isFinite(meanDb) || !Number.isFinite(maxDb)) return null;
  return { meanDb, maxDb };
}

export function calculateProfessionalSfxRenderVolume({
  category = "detail",
  requestedVolume = 0,
  meanDb,
  maxDb,
}) {
  const rule =
    CATEGORY_MIX[String(category).toLowerCase()] || CATEGORY_MIX.detail;
  const editorialScale = clamp(
    Number(requestedVolume || rule.reference) / rule.reference,
    0.82,
    1.16
  );
  const fallback = clamp(
    Number(requestedVolume || rule.reference) * 3.2,
    rule.floor,
    rule.ceiling
  );
  if (!Number.isFinite(meanDb) || !Number.isFinite(maxDb)) {
    return rounded(fallback);
  }
  const gainForMean = 10 ** ((rule.targetMeanDb - meanDb) / 20);
  const gainForPeak = 10 ** ((rule.targetPeakDb - maxDb) / 20);
  return rounded(
    clamp(
      Math.min(gainForMean, gainForPeak) * editorialScale,
      rule.floor,
      rule.ceiling
    )
  );
}

export function calculateNormalizedProfessionalSfxVolume({
  category = "detail",
  requestedVolume = 0,
}) {
  const bases = {
    ambience: 0.46,
    detail: 0.68,
    impact: 0.72,
    riser: 0.58,
    transition: 0.62,
    utility: 0.36,
  };
  const rule =
    CATEGORY_MIX[String(category).toLowerCase()] || CATEGORY_MIX.detail;
  const base = bases[String(category).toLowerCase()] || bases.detail;
  const editorialScale = clamp(
    Number(requestedVolume || rule.reference) / rule.reference,
    0.88,
    1.12
  );
  return rounded(clamp(base * editorialScale, 0.18, 0.72));
}

export function normalizeProfessionalSfxAsset({
  sourcePath,
  destinationPath,
  sourceStart = 0,
  duration = 1,
  ffmpegBinary = "ffmpeg",
}) {
  const result = spawnSync(
    ffmpegBinary,
    [
      "-y",
      "-hide_banner",
      "-nostats",
      "-ss",
      String(Math.max(0, Number(sourceStart) || 0)),
      "-t",
      String(Math.max(0.08, Number(duration) || 1)),
      "-i",
      sourcePath,
      "-vn",
      "-af",
      "highpass=f=40,acompressor=threshold=0.08:ratio=4:attack=5:release=100:makeup=4,dynaudnorm=f=150:g=9:p=0.9:m=12,loudnorm=I=-20:LRA=5:TP=-2",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      destinationPath,
    ],
    { encoding: "utf8", windowsHide: true, maxBuffer: 2 * 1024 * 1024 }
  );
  return result.status === 0;
}

function analyzeWindow(filePath, start, duration, ffmpegBinary = "ffmpeg") {
  const cacheKey = `${ffmpegBinary}|${filePath}|${rounded(start)}|${rounded(duration)}`;
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);
  const result = spawnSync(
    ffmpegBinary,
    [
      "-hide_banner",
      "-nostats",
      "-ss",
      String(start),
      "-t",
      String(duration),
      "-i",
      filePath,
      "-vn",
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    }
  );
  const analysis = parseVolumeDetectOutput(
    `${result.stdout || ""}\n${result.stderr || ""}`
  );
  analysisCache.set(cacheKey, analysis);
  return analysis;
}

export function analyzeProfessionalSfxForRender({
  filePath,
  category = "detail",
  requestedDuration = 0.8,
  requestedVolume = 0,
  sourceDuration = 0,
  ffmpegBinary = "ffmpeg",
}) {
  const duration = Math.max(
    0.08,
    Number(sourceDuration) || Number(requestedDuration) || 0.8
  );
  const sampleDuration = Math.min(
    duration,
    Math.max(
      0.25,
      String(category).toLowerCase() === "impact"
        ? 3.5
        : Number(requestedDuration) || 0.8
    )
  );
  const maxStart = Math.max(0, duration - sampleDuration);
  const canChooseContinuousWindow =
    ["ambience", "detail"].includes(String(category).toLowerCase()) &&
    maxStart > 0.5;
  const starts = canChooseContinuousWindow
    ? [0, maxStart * 0.25, maxStart * 0.5, maxStart * 0.75, maxStart]
    : [0];
  const windows = starts
    .map((start) => ({
      start,
      analysis: analyzeWindow(filePath, start, sampleDuration, ffmpegBinary),
    }))
    .filter((entry) => entry.analysis);
  const best = windows.sort((a, b) => {
    const meanDifference = b.analysis.meanDb - a.analysis.meanDb;
    return Math.abs(meanDifference) > 0.2
      ? meanDifference
      : b.analysis.maxDb - a.analysis.maxDb;
  })[0];
  const volume = calculateProfessionalSfxRenderVolume({
    category,
    requestedVolume,
    meanDb: best?.analysis?.meanDb,
    maxDb: best?.analysis?.maxDb,
  });
  return {
    sourceStart: rounded(best?.start || 0),
    volume,
    meanDb: Number.isFinite(best?.analysis?.meanDb)
      ? rounded(best.analysis.meanDb, 1)
      : null,
    maxDb: Number.isFinite(best?.analysis?.maxDb)
      ? rounded(best.analysis.maxDb, 1)
      : null,
    sampleDuration: rounded(sampleDuration),
  };
}
