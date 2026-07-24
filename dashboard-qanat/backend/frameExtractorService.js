import fs from "fs";
import path from "path";
import os from "os";
import { runCommand } from "./shared/commonUtils.js";

/**
 * Encontra o executável do FFmpeg no ambiente (PATH ou C:\Lumiera\tools).
 */
export function getFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    "C:\\Lumiera\\tools\\ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "ffmpeg",
    "ffmpeg.exe",
  ].filter(Boolean);

  for (const bin of candidates) {
    if (bin.includes("\\") || bin.includes("/")) {
      if (fs.existsSync(bin)) return bin;
    } else {
      return bin;
    }
  }
  return "ffmpeg";
}

/**
 * Converte timestamp (ex: "1:30" ou "01:30:00" ou segundos) em número total de segundos.
 */
export function parseTimestampToSeconds(ts) {
  if (ts === null || ts === undefined || ts === "") return null;
  if (typeof ts === "number") return Math.max(0, ts);
  const str = String(ts).trim();
  if (!str) return null;
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);

  const parts = str.split(":").map(Number);
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * Extrai frames de um vídeo usando FFmpeg com base em modos de detalhe e deduplicação (estilo claude-video).
 *
 * @param {Object} params
 * @param {string} params.videoPath - Caminho do arquivo de vídeo local.
 * @param {string} [params.outputDir] - Diretorório de saída para salvar os JPEGs.
 * @param {"transcript" | "efficient" | "balanced" | "token-burner"} [params.mode="balanced"] - Modo de extração.
 * @param {number} [params.maxFrames=100] - Cap máximo de frames mantidos.
 * @param {string|number} [params.startTime] - Tempo de início (ex: "0:00").
 * @param {string|number} [params.endTime] - Tempo de fim (ex: "0:15").
 * @param {number} [params.fpsCap=2] - Limite máximo de quadros por segundo (máx 2 fps).
 * @param {number} [params.resolution=512] - Largura alvo da imagem JPEG.
 * @param {boolean} [params.dedup=true] - Se deve aplicar a deduplicação MAD 16x16.
 * @param {number} [params.dedupThreshold=2.0] - Limiar de diferença de brilho (0-255).
 * @returns {Promise<{ ok: boolean, framePaths: string[], totalExtracted: number, droppedDuplicates: number, error?: string }>}
 */
export async function extractVideoFrames({
  videoPath,
  outputDir,
  mode = "balanced",
  maxFrames = 100,
  startTime = null,
  endTime = null,
  fpsCap = 2,
  resolution = 512,
  dedup = true,
  dedupThreshold = 2.0,
}) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    return {
      ok: false,
      error: "Arquivo de vídeo não encontrado",
      framePaths: [],
      totalExtracted: 0,
      droppedDuplicates: 0,
    };
  }

  if (mode === "transcript") {
    return {
      ok: true,
      framePaths: [],
      totalExtracted: 0,
      droppedDuplicates: 0,
    };
  }

  const outDir =
    outputDir || fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-frames-"));
  fs.mkdirSync(outDir, { recursive: true });

  const ffmpegBin = getFfmpegPath();
  const startSec = parseTimestampToSeconds(startTime);
  const endSec = parseTimestampToSeconds(endTime);

  const args = ["-y"];

  if (startSec !== null) {
    args.push("-ss", String(startSec));
  }
  if (endSec !== null && startSec !== null && endSec > startSec) {
    args.push("-to", String(endSec));
  } else if (endSec !== null && startSec === null) {
    args.push("-to", String(endSec));
  }

  args.push("-i", videoPath);

  // Seleção do filtro FFmpeg por modo
  const effectiveFps = Math.min(Math.max(0.1, fpsCap), 2);
  const scaleFilter = `scale=${resolution}:-1`;

  if (mode === "efficient") {
    // Apenas keyframes / I-frames (fast decode)
    args.push("-skip_frame", "nokey");
    args.push("-vf", `${scaleFilter},fps=${effectiveFps}`);
  } else if (mode === "balanced" || mode === "token-burner") {
    // Corte de cena ou amostragem uniforme de segurança
    args.push(
      "-vf",
      `select='gt(scene\\,0.3)',${scaleFilter},fps=${effectiveFps}`
    );
    args.push("-vsync", "vfr");
  } else {
    args.push("-vf", `${scaleFilter},fps=${effectiveFps}`);
  }

  args.push("-q:v", "3"); // Boa qualidade JPEG
  const outTpl = path.join(outDir, "frame_%04d.jpg");
  args.push(outTpl);

  try {
    await runCommand(ffmpegBin, args, { timeoutMs: 120_000 });

    let rawFrames = fs
      .readdirSync(outDir)
      .filter((f) => /^frame_\d+\.jpg$/i.test(f))
      .map((f) => path.join(outDir, f))
      .sort();

    // Fallback: se 'scene' filter resultou em 0 frames, faz amostragem uniforme simples
    if (!rawFrames.length && mode !== "efficient") {
      const fallbackArgs = [
        "-y",
        "-i",
        videoPath,
        "-vf",
        `${scaleFilter},fps=${effectiveFps}`,
        "-q:v",
        "3",
        outTpl,
      ];
      await runCommand(ffmpegBin, fallbackArgs, { timeoutMs: 90_000 });
      rawFrames = fs
        .readdirSync(outDir)
        .filter((f) => /^frame_\d+\.jpg$/i.test(f))
        .map((f) => path.join(outDir, f))
        .sort();
    }

    const totalExtracted = rawFrames.length;
    let keptFrames = rawFrames;
    let droppedDuplicates = 0;

    // Deduplicação 16x16 Mean Absolute Difference (MAD)
    if (dedup && rawFrames.length > 1) {
      const dedupResult = await deduplicateFramesMAD({
        imagePaths: rawFrames,
        threshold: dedupThreshold,
        ffmpegBin,
      });
      keptFrames = dedupResult.keptPaths;
      droppedDuplicates = dedupResult.droppedCount;
    }

    // Aplica cap final de frames por modo
    const cap =
      mode === "efficient"
        ? Math.min(maxFrames, 50)
        : mode === "token-burner"
          ? 9999
          : maxFrames;
    if (keptFrames.length > cap) {
      // Amostragem uniforme entre first e last
      const sampled = [];
      const step = (keptFrames.length - 1) / (cap - 1);
      for (let i = 0; i < cap; i++) {
        const idx = Math.min(Math.round(i * step), keptFrames.length - 1);
        sampled.push(keptFrames[idx]);
      }
      keptFrames = [...new Set(sampled)];
    }

    return {
      ok: true,
      framePaths: keptFrames,
      totalExtracted,
      droppedDuplicates,
      outDir,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Falha na extração de frames: ${err.message}`,
      framePaths: [],
      totalExtracted: 0,
      droppedDuplicates: 0,
    };
  }
}

/**
 * Deduplica frames convertendo cada imagem em thumbnail cinza 16x16 e calculando a variação média de brilho (MAD).
 *
 * @param {Object} params
 * @param {string[]} params.imagePaths - Lista de caminhos para os JPEGs.
 * @param {number} [params.threshold=2.0] - Limiar de diferença (0-255).
 * @param {string} [params.ffmpegBin] - Executável FFmpeg.
 * @returns {Promise<{ keptPaths: string[], droppedCount: number }>}
 */
export async function deduplicateFramesMAD({
  imagePaths,
  threshold = 2.0,
  ffmpegBin = "ffmpeg",
}) {
  if (!imagePaths || imagePaths.length <= 1) {
    return { keptPaths: imagePaths || [], droppedCount: 0 };
  }

  const thumbDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-mad-"));
  fs.mkdirSync(thumbDir, { recursive: true });

  const keptPaths = [];
  let droppedCount = 0;
  let lastThumbBuffer = null;

  try {
    for (let i = 0; i < imagePaths.length; i++) {
      const imgPath = imagePaths[i];
      const thumbPath = path.join(
        thumbDir,
        `thumb_${String(i).padStart(4, "0")}.raw`
      );

      // Gera thumbnail 16x16 em formato gray (256 bytes puros)
      await runCommand(
        ffmpegBin,
        [
          "-y",
          "-i",
          imgPath,
          "-vf",
          "scale=16:16,format=gray",
          "-f",
          "rawvideo",
          thumbPath,
        ],
        { timeoutMs: 15_000 }
      );

      if (!fs.existsSync(thumbPath)) {
        keptPaths.push(imgPath);
        continue;
      }

      const buf = fs.readFileSync(thumbPath);
      if (buf.length !== 256) {
        keptPaths.push(imgPath);
        continue;
      }

      if (!lastThumbBuffer) {
        keptPaths.push(imgPath);
        lastThumbBuffer = buf;
      } else {
        let sumDiff = 0;
        for (let b = 0; b < 256; b++) {
          sumDiff += Math.abs(buf[b] - lastThumbBuffer[b]);
        }
        const meanDiff = sumDiff / 256;

        if (meanDiff > threshold) {
          keptPaths.push(imgPath);
          lastThumbBuffer = buf;
        } else {
          droppedCount++;
          // Remove frame duplicado do disco para economizar espaço
          try {
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    // Se falhar o processamento em lote, retorna os originais sem perder nada
    return { keptPaths: imagePaths, droppedCount: 0 };
  } finally {
    try {
      fs.rmSync(thumbDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return { keptPaths, droppedCount };
}
