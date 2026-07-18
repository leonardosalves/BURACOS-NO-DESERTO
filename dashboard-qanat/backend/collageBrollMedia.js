/**
 * Collage B-roll media — dual-frame pipeline (start + end) + vídeo.
 *
 * Fluxo Fase 1:
 *  1) End Frame (composição final = fonte de verdade)
 *  2) Start Frame derivado do End Frame (posições iniciais)
 *  3) Motion prompt + vídeo com start_frame + end_frame
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { buildGeminiKeyPool } from "./geminiApiKeys.js";
import {
  buildImagegenPrompt,
  buildOmniPrompt,
  buildVisualSpec,
  buildDualFrameSpec,
  buildEndFrameImagePrompt,
  buildStartFrameImagePrompt,
  buildMotionPrompt,
  buildFrameConsistency,
  canRunGate3,
  buildGoogleFlowExport,
  normalizeCollageMode,
} from "./collageBroll.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const COLLAGE_OUTPUT_ROOT = path.join(
  __dirname,
  "data",
  "collage-broll-outputs"
);

export const GEMINI_IMAGE_MODELS = Object.freeze([
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
]);

function safeSeg(s, fallback = "x") {
  const t = String(s || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return t || fallback;
}

export function cardOutputDir(sessionId, cardId) {
  return path.join(
    COLLAGE_OUTPUT_ROOT,
    safeSeg(sessionId, "sess"),
    safeSeg(cardId, "card")
  );
}

export function ensureCardDir(sessionId, cardId) {
  const dir = cardOutputDir(sessionId, cardId);
  fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
  fs.mkdirSync(path.join(dir, "omni"), { recursive: true });
  return dir;
}

export function mediaUrl(sessionId, cardId, file) {
  return `/api/collage-broll/media/${encodeURIComponent(safeSeg(sessionId, "sess"))}/${encodeURIComponent(safeSeg(cardId, "card"))}/${encodeURIComponent(path.basename(file))}`;
}

function resolveFfmpeg() {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

function runCmd(bin, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      reject(new Error(`${bin} timeout ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stderr });
      else
        reject(
          new Error(
            `${bin} exit ${code}: ${stderr.slice(-800) || "sem stderr"}`
          )
        );
    });
  });
}

export async function writeEmptyColorFrame(outPath, hex = "#0B3D5C") {
  const color = String(hex || "#0B3D5C").replace("#", "0x");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await runCmd(resolveFfmpeg(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=720x1280:d=0.04`,
    "-frames:v",
    "1",
    outPath,
  ]);
  return outPath;
}

export function extractImageFromGeminiResponse(json) {
  const parts = json?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (
      inline?.data &&
      /image\//i.test(
        String(inline.mimeType || inline.mime_type || "image/png")
      )
    ) {
      return {
        base64: inline.data,
        mimeType: inline.mimeType || inline.mime_type || "image/png",
      };
    }
  }
  const raw = JSON.stringify(json || {});
  const m = raw.match(
    /"mimeType"\s*:\s*"(image\/[a-zA-Z0-9.+-]+)"[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)"/
  );
  if (m) return { mimeType: m[1], base64: m[2] };
  return null;
}

/**
 * Gera imagem Gemini (texto e/ou image-to-image com referência).
 */
export async function generateCollageImageWithGemini({
  prompt,
  apiKeys = [],
  preferredKey = "",
  models = GEMINI_IMAGE_MODELS,
  referenceImageBase64 = null,
  referenceMime = "image/png",
  label = "CollageImage",
} = {}) {
  const keyPool = buildGeminiKeyPool(preferredKey, apiKeys);
  if (!keyPool.length) {
    throw new Error("Nenhuma chave Gemini configurada para imagegen.");
  }

  const parts = [];
  if (referenceImageBase64) {
    parts.push({
      inline_data: {
        mime_type: referenceMime,
        data: referenceImageBase64,
      },
    });
    parts.push({
      text: `${prompt}\n\nIMPORTANT: Edit the supplied reference image. Preserve identity of all paper cut-outs, colors, texture and framing. Only apply the requested positional changes.`,
    });
  } else {
    parts.push({ text: prompt });
  }

  let lastErr = null;
  for (const model of models) {
    for (let ki = 0; ki < Math.min(keyPool.length, 3); ki += 1) {
      const key = keyPool[ki];
      const t0 = Date.now();
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const body = {
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const ms = Date.now() - t0;
        if (!res.ok) {
          const errJ = await res.json().catch(() => ({}));
          const msg = errJ?.error?.message || res.statusText;
          console.warn(
            `[${label}] HTTP ${res.status} model=${model} key=${ki + 1} · ${ms}ms: ${msg}`
          );
          lastErr = new Error(`${model}: ${msg}`);
          continue;
        }
        const json = await res.json();
        const img = extractImageFromGeminiResponse(json);
        if (!img) {
          lastErr = new Error(`${model}: resposta sem imagem`);
          console.warn(`[${label}] sem imagem model=${model} · ${ms}ms`);
          continue;
        }
        console.log(`[${label}] ok model=${model} key=${ki + 1} · ${ms}ms`);
        return { ...img, model, prompt, ms };
      } catch (err) {
        lastErr = err;
        console.warn(`[${label}] erro model=${model}: ${err.message}`);
      }
    }
  }
  throw lastErr || new Error(`Falha ao gerar imagem (${label}).`);
}

/** @deprecated use generateCollageImageWithGemini */
export async function generateCollageStillWithGemini(opts = {}) {
  const prompt = opts.item
    ? buildEndFrameImagePrompt(opts.item)
    : opts.prompt || "";
  return generateCollageImageWithGemini({
    ...opts,
    prompt,
    label: "CollageStill",
  });
}

/**
 * Gate 2A — END FRAME (fonte de verdade).
 */
export async function produceEndFrame({
  item,
  sessionId,
  apiKeys,
  preferredKey,
} = {}) {
  const cardId = item?.id || "c01";
  const dir = ensureCardDir(sessionId, cardId);
  const endPath = path.join(dir, "frames", "end-frame.png");
  const lastPath = path.join(dir, "frames", "last-frame.png");
  const stillPath = path.join(dir, "still.png");
  const exportEnd = path.join(dir, "end_frame.png");

  const dual = buildDualFrameSpec(item);
  const endPrompt = dual.endFrame.imagePrompt;
  const visual_spec = item.visual_spec || buildVisualSpec(item);

  const gen = await generateCollageImageWithGemini({
    prompt: endPrompt,
    apiKeys,
    preferredKey,
    label: "EndFrame",
  });

  const buf = Buffer.from(gen.base64, "base64");
  fs.writeFileSync(endPath, buf);
  fs.writeFileSync(lastPath, buf);
  fs.writeFileSync(stillPath, buf);
  fs.writeFileSync(exportEnd, buf);

  const endFrame = {
    ...dual.endFrame,
    description: dual.endFrame.description,
    imagePrompt: endPrompt,
    imageUrl: mediaUrl(sessionId, cardId, "end-frame.png"),
    imagePath: endPath,
    status: "generated",
    approved: false,
    model: gen.model,
  };

  return {
    cardId,
    sessionId,
    visual_spec,
    imagegen_prompt: endPrompt, // legado
    still_model: gen.model,
    still_path: stillPath,
    still_url: mediaUrl(sessionId, cardId, "still.png"),
    last_frame_path: lastPath,
    last_frame_url: mediaUrl(sessionId, cardId, "last-frame.png"),
    endFrame,
    startFrame: dual.startFrame,
    motion: dual.motion,
    frameConsistency: dual.frameConsistency,
    animationMode: dual.animationMode,
    still_status: "generated",
    still_approved: false,
    still_note: "End Frame gerado — aprove antes do Start Frame",
    gate: 2,
  };
}

/**
 * Gate 2B — START FRAME derivado do END FRAME (preferência image-to-image).
 */
export async function produceStartFrame({
  item,
  sessionId,
  apiKeys,
  preferredKey,
} = {}) {
  const cardId = item?.id || "c01";
  const dir = ensureCardDir(sessionId, cardId);
  const startPath = path.join(dir, "frames", "start-frame.png");
  const firstPath = path.join(dir, "frames", "first-frame.png");
  const exportStart = path.join(dir, "start_frame.png");

  const dual = buildDualFrameSpec(item);
  const startPrompt = dual.startFrame.imagePrompt;

  const endPath =
    item.endFrame?.imagePath ||
    item.last_frame_path ||
    item.still_path ||
    path.join(dir, "frames", "end-frame.png");

  if (!fs.existsSync(endPath)) {
    throw new Error(
      "End Frame não encontrado. Gere e aprove o End Frame (Gate 2A) primeiro."
    );
  }
  if (!(item.endFrame?.approved || item.still_approved)) {
    // soft warn only — still allow gen if user forced; prefer approved
  }

  const endBuf = fs.readFileSync(endPath);
  const endB64 = endBuf.toString("base64");

  let gen;
  try {
    gen = await generateCollageImageWithGemini({
      prompt: startPrompt,
      apiKeys,
      preferredKey,
      referenceImageBase64: endB64,
      referenceMime: "image/png",
      label: "StartFrame",
    });
  } catch (err) {
    console.warn(
      `[StartFrame] image-to-image falhou (${err.message}) — fallback text-only`
    );
    gen = await generateCollageImageWithGemini({
      prompt: startPrompt,
      apiKeys,
      preferredKey,
      label: "StartFrameText",
    });
  }

  const buf = Buffer.from(gen.base64, "base64");
  fs.writeFileSync(startPath, buf);
  fs.writeFileSync(firstPath, buf);
  fs.writeFileSync(exportStart, buf);

  // motion prompt file for Google Flow
  const motionPrompt =
    item.motion?.videoPrompt ||
    dual.motion.videoPrompt ||
    buildMotionPrompt(item, dual.frameConsistency);
  fs.writeFileSync(path.join(dir, "motion_prompt.txt"), motionPrompt, "utf8");
  fs.writeFileSync(
    path.join(dir, "visual_spec.json"),
    JSON.stringify(
      {
        ...buildVisualSpec(item),
        dualFrame: dual,
        endFramePrompt: item.endFrame?.imagePrompt,
        startFramePrompt: startPrompt,
        motionPrompt,
      },
      null,
      2
    ),
    "utf8"
  );

  const startFrame = {
    ...dual.startFrame,
    imagePrompt: startPrompt,
    imageUrl: mediaUrl(sessionId, cardId, "start-frame.png"),
    imagePath: startPath,
    status: "generated",
    approved: false,
    fromEndFrame: true,
    model: gen.model,
  };

  return {
    cardId,
    sessionId,
    first_frame_path: firstPath,
    first_frame_url: mediaUrl(sessionId, cardId, "first-frame.png"),
    startFrame,
    endFrame: item.endFrame || dual.endFrame,
    motion: {
      ...(item.motion || dual.motion),
      videoPrompt: motionPrompt,
      description: dual.motion.description,
    },
    frameConsistency: item.frameConsistency || dual.frameConsistency,
    animationMode: item.animationMode || dual.animationMode,
    omni_prompt: motionPrompt, // legado
    gate: 2,
  };
}

/**
 * Legado: produceCollageStill = End Frame + empty first (sem start real).
 * Preferir produceEndFrame + produceStartFrame.
 */
export async function produceCollageStill(opts = {}) {
  return produceEndFrame(opts);
}

/**
 * Gate 3: vídeo com start + end frames obrigatórios.
 * ffmpeg xfade start→end (fallback local).
 */
export async function produceCollageVideo({ item, sessionId } = {}) {
  const cardId = item?.id || "c01";
  const dir = ensureCardDir(sessionId, cardId);

  const gate = canRunGate3(item);
  if (!gate.ok) {
    throw new Error(gate.reason || "Frames não aprovados para Gate 3.");
  }

  const firstPath =
    item.startFrame?.imagePath ||
    item.first_frame_path ||
    path.join(dir, "frames", "start-frame.png");
  const lastPath =
    item.endFrame?.imagePath ||
    item.last_frame_path ||
    item.still_path ||
    path.join(dir, "frames", "end-frame.png");
  const outPath = path.join(dir, "omni", "final-5s.mp4");

  if (!fs.existsSync(lastPath)) {
    throw new Error("End Frame não encontrado em disco.");
  }
  if (!fs.existsSync(firstPath)) {
    // último recurso: color field (não ideal)
    const hex = item?.background_color?.hex || "#0B3D5C";
    await writeEmptyColorFrame(firstPath, hex);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Start hold → xfade → end hold (assemble-from-empty feel)
  const filter = [
    "[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v0]",
    "[1:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v1]",
    "[v0][v1]xfade=transition=fade:duration=1.0:offset=1.5,trim=duration=5,setpts=PTS-STARTPTS[v]",
  ].join(";");

  await runCmd(
    resolveFfmpeg(),
    [
      "-y",
      "-loop",
      "1",
      "-t",
      "3.5",
      "-i",
      firstPath,
      "-loop",
      "1",
      "-t",
      "5",
      "-i",
      lastPath,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      "5",
      outPath,
    ],
    { timeoutMs: 180_000 }
  );

  const motionPrompt =
    item.motion?.videoPrompt ||
    buildMotionPrompt(item, item.frameConsistency) ||
    buildOmniPrompt(item);

  // Google Flow export files
  try {
    if (fs.existsSync(firstPath)) {
      fs.copyFileSync(firstPath, path.join(dir, "start_frame.png"));
    }
    if (fs.existsSync(lastPath)) {
      fs.copyFileSync(lastPath, path.join(dir, "end_frame.png"));
    }
    fs.writeFileSync(path.join(dir, "motion_prompt.txt"), motionPrompt, "utf8");
  } catch {
    /* ignore */
  }

  return {
    cardId,
    sessionId,
    video_path: outPath,
    video_url: mediaUrl(sessionId, cardId, "final-5s.mp4"),
    omni_prompt: motionPrompt,
    motion: {
      ...(item.motion || {}),
      videoPrompt: motionPrompt,
      durationSeconds: 5,
    },
    video_mode: "start_end_frames_ffmpeg",
    video_note:
      "Vídeo 5s interpolando Start Frame → End Frame (ffmpeg). Pronto para Google Flow com os mesmos frames.",
    video_status: "generated",
    googleFlow: buildGoogleFlowExport(
      {
        ...item,
        startFrame: item.startFrame,
        endFrame: item.endFrame,
        motion: { videoPrompt: motionPrompt },
      },
      sessionId
    ),
    gate: 3,
    mode: normalizeCollageMode(item?.mode),
  };
}

export function resolveCollageMediaFile(sessionId, cardId, fileName) {
  const base = cardOutputDir(sessionId, cardId);
  const name = path.basename(String(fileName || ""));
  const candidates = [
    path.join(base, name),
    path.join(base, "frames", name),
    path.join(base, "omni", name),
  ];
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (!resolved.startsWith(path.resolve(base))) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }
  return null;
}

export function exportGoogleFlowPackage(item, sessionId) {
  const dir = ensureCardDir(sessionId, item.id || "c01");
  const pack = buildGoogleFlowExport(item, sessionId);
  fs.writeFileSync(
    path.join(dir, "google_flow.json"),
    JSON.stringify(pack, null, 2),
    "utf8"
  );
  if (pack.motionPrompt) {
    fs.writeFileSync(
      path.join(dir, "motion_prompt.txt"),
      pack.motionPrompt,
      "utf8"
    );
  }
  return {
    ...pack,
    folder: dir,
    files: [
      "start_frame.png",
      "end_frame.png",
      "motion_prompt.txt",
      "visual_spec.json",
      "google_flow.json",
    ],
  };
}
