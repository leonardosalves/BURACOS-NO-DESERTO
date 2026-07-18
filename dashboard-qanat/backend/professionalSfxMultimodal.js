import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function renderSceneEvidence(source, ffmpegBinary) {
  const extension = path.extname(source).toLowerCase();
  const isVideo = VIDEO_EXTENSIONS.has(extension);
  if (!isVideo && !IMAGE_EXTENSIONS.has(extension)) return null;
  const filter = isVideo
    ? "fps=1,scale=240:-2,tile=3x2:padding=4:margin=4:color=black"
    : "scale=720:-2";
  const result = spawnSync(
    ffmpegBinary || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      source,
      "-vf",
      filter,
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-",
    ],
    {
      windowsHide: true,
      maxBuffer: 12 * 1024 * 1024,
      encoding: null,
    }
  );
  if (
    result.status !== 0 ||
    !Buffer.isBuffer(result.stdout) ||
    result.stdout.length < 1000
  ) {
    return null;
  }
  return result.stdout;
}

export function buildProfessionalSfxMultimodalRequest({
  prompt,
  scenes = [],
  resolveAsset,
  ffmpegBinary = "ffmpeg",
  maxScenes = 12,
}) {
  const parts = [{ text: String(prompt || "") }];
  const verifiedSceneRefs = new Set();
  for (const scene of (Array.isArray(scenes) ? scenes : []).slice(
    0,
    maxScenes
  )) {
    const sceneRef = String(scene?.scene_ref || "").trim();
    const source = resolveAsset?.(scene?.asset);
    if (!sceneRef || !source || !fs.existsSync(source)) continue;
    const evidence = renderSceneEvidence(source, ffmpegBinary);
    if (!evidence) continue;
    parts.push({
      text:
        `EVIDÊNCIA VISUAL REAL DA CENA ${sceneRef}. ` +
        "Em vídeo, os quadros estão em ordem temporal da esquerda para a direita e de cima para baixo. " +
        "Não descreva nem sonorize ação que não esteja visível nestes quadros.",
    });
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: evidence.toString("base64") },
    });
    verifiedSceneRefs.add(sceneRef);
  }
  return {
    bodyOverride:
      verifiedSceneRefs.size > 0
        ? {
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }
        : null,
    verifiedSceneRefs,
  };
}
