/**
 * Seedance T2V — Fase 2 Lumiera
 * Compila directing_brief + visual_prompt + refs para os provedores de vídeo ativos.
 */

import fs from "fs";
import path from "path";
import {
  SEEDANCE_REF_SLOTS,
  normalizeSceneDirecting,
} from "./seedanceDirecting.js";
import { getExternalJobProgress } from "./externalJobRegistry.js";
import {
  generateSeedanceApiVideo,
  loadSeedanceApiConfig,
} from "./seedanceApiProvider.js";
import { queueMobileWanGeneration } from "./mobilewanService.js";

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".mkv"]);

const VIDEO_GENERATION_OPTIONS = {
  fps: 24,
  aspect_ratios: [
    { id: "16:9", sizes: { "8gb": { width: 640, height: 384, frames: 121 } } },
    { id: "9:16", sizes: { "8gb": { width: 384, height: 640, frames: 121 } } },
    { id: "1:1", sizes: { "8gb": { width: 512, height: 512, frames: 121 } } },
  ],
};

function secondsToFrames(seconds) {
  const raw = Math.max(
    9,
    Math.round(Number(seconds || 0) * VIDEO_GENERATION_OPTIONS.fps)
  );
  return Math.min(121, Math.round((raw - 1) / 8) * 8 + 1);
}

function framesToSeconds(frames) {
  return (
    Math.round((Number(frames || 1) / VIDEO_GENERATION_OPTIONS.fps) * 100) / 100
  );
}

export function isVideoIaScene(vp = {}) {
  const type = String(vp.type || "").toLowerCase();
  return type.includes("video") || type.includes("vídeo");
}

export function listVideoIaSceneIndices(visualPrompts = []) {
  return visualPrompts
    .map((vp, i) => (isVideoIaScene(vp) ? i : -1))
    .filter((i) => i >= 0);
}

function readJsonSafe(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function buildSeedanceT2vPrompt(vp = {}) {
  const scene = normalizeSceneDirecting(vp);
  const brief = scene.directing_brief || {};
  const refs = scene.seedance_refs || {};
  const visual = String(scene.prompt || "").trim();
  const narration = String(scene.narration_text || "").trim();

  const directingLines = [
    brief.dramatic_function && `Dramatic intent: ${brief.dramatic_function}`,
    brief.camera_intent && `Camera: ${brief.camera_intent}`,
    brief.lighting_intent && `Lighting: ${brief.lighting_intent}`,
    brief.performance_intent && `Performance: ${brief.performance_intent}`,
    brief.sound_intent && `Sound mood: ${brief.sound_intent}`,
  ].filter(Boolean);

  const refLines = SEEDANCE_REF_SLOTS.map(
    (s) => refs[s.id] && `${s.label}: ${refs[s.id]}`
  ).filter(Boolean);

  const parts = [];
  if (visual) parts.push(visual);
  if (directingLines.length)
    parts.push(`[Directing] ${directingLines.join(". ")}`);
  if (refLines.length) parts.push(`[Refs] ${refLines.join(" | ")}`);
  if (
    narration &&
    !visual.toLowerCase().includes(narration.slice(0, 40).toLowerCase())
  ) {
    parts.push(`[Narration context] ${narration}`);
  }

  const compiled = parts.join("\n").trim();
  return (
    compiled ||
    narration ||
    "Cinematic documentary scene, photorealistic, smooth camera motion."
  );
}

export function resolveGenerationDimensions(videoFormat = "LONGO") {
  const aspect = videoFormat === "SHORTS" ? "9:16" : "16:9";
  const preset =
    VIDEO_GENERATION_OPTIONS.aspect_ratios.find((a) => a.id === aspect) ||
    VIDEO_GENERATION_OPTIONS.aspect_ratios[0];
  const size = preset.sizes["8gb"] || preset.sizes.fast;
  return {
    width: size.width,
    height: size.height,
    frames: size.frames,
    aspect_ratio: aspect,
    duration_seconds: framesToSeconds(size.frames),
  };
}

export function resolveSceneGenerationTiming(vp = {}, config = {}) {
  const dims = resolveGenerationDimensions(config.video_format || "LONGO");
  const targetSec = Math.min(
    10,
    Math.max(
      0.7,
      Number(vp.duration_seconds || vp.duration || dims.duration_seconds) ||
        dims.duration_seconds
    )
  );
  const frames = secondsToFrames(targetSec);
  return {
    ...dims,
    frames,
    duration_seconds: framesToSeconds(frames),
  };
}

export function buildSceneAssetFilename(vp = {}, sceneIndex = 0, ext = ".mp4") {
  const block = vp.block || 1;
  const sceneLabel = String(vp.scene || sceneIndex + 1).replace(/\./g, "_");
  const ts = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  return `b${block}_${sceneLabel}_seedance_${ts}${ext}`;
}

export function computeSceneAssetIdx(visualPrompts = [], sceneIndex = 0) {
  const block = visualPrompts[sceneIndex]?.block || 1;
  let assetIdx = 0;
  for (let i = 0; i < sceneIndex; i += 1) {
    if ((visualPrompts[i]?.block || 1) === block) assetIdx += 1;
  }
  return { block, blockKey: String(block), assetIdx };
}

export function attachVideoAssetToProject(
  projDir,
  storyboard = {},
  config = {},
  sceneIndex = 0,
  assetFilename = ""
) {
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? [...storyboard.visual_prompts]
    : [];
  if (!visualPrompts[sceneIndex])
    throw new Error(`Cena ${sceneIndex} não encontrada no storyboard.`);

  const { blockKey, assetIdx } = computeSceneAssetIdx(
    visualPrompts,
    sceneIndex
  );
  const nextVp = {
    ...visualPrompts[sceneIndex],
    asset: {
      asset: assetFilename,
      type: "video",
      fixed: visualPrompts[sceneIndex]?.asset?.fixed ?? 8.0,
      seedance_generated: true,
    },
    seedance_t2v: {
      ...(visualPrompts[sceneIndex]?.seedance_t2v || {}),
      attached_at: new Date().toISOString(),
      asset: assetFilename,
    },
  };
  visualPrompts[sceneIndex] = nextVp;

  const nextStoryboard = { ...storyboard, visual_prompts: visualPrompts };
  const nextConfig = {
    ...config,
    timeline_assets: { ...(config.timeline_assets || {}) },
  };
  if (!nextConfig.timeline_assets[blockKey])
    nextConfig.timeline_assets[blockKey] = [];

  const blockAssets = [...nextConfig.timeline_assets[blockKey]];
  const prevSlot = blockAssets[assetIdx] || {};
  blockAssets[assetIdx] = {
    ...prevSlot,
    asset: assetFilename,
    type: "video",
    fixed: prevSlot.fixed ?? 8.0,
    user_locked: true,
    manual_asset: true,
    seedance_generated: true,
  };
  nextConfig.timeline_assets[blockKey] = blockAssets;

  const storyboardPath = path.join(projDir, "storyboard.json");
  const configPath = path.join(projDir, "config_qanat.json");
  writeJson(storyboardPath, nextStoryboard);
  writeJson(configPath, nextConfig);

  return {
    storyboard: nextStoryboard,
    config: nextConfig,
    asset: assetFilename,
    blockKey,
    assetIdx,
  };
}

export function importGeneratedOutputToProject(
  projDir,
  output = {},
  vp = {},
  sceneIndex = 0
) {
  const srcPath = output.filepath;
  if (!srcPath || !fs.existsSync(srcPath)) {
    throw new Error("Arquivo de saída da geração não encontrado.");
  }
  const ext = path.extname(output.filename || srcPath) || ".mp4";
  const destName = buildSceneAssetFilename(vp, sceneIndex, ext);
  const assetsDir = path.join(projDir, "ASSETS");
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  const destPath = path.join(assetsDir, destName);
  fs.copyFileSync(srcPath, destPath);
  return destName;
}

export async function waitForGenerationJob(
  promptId,
  { timeoutMs = 600_000, pollMs = 2000 } = {}
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const progress = getExternalJobProgress(promptId);
    if (progress?.status === "completed" && progress.outputs?.length) {
      return progress;
    }
    if (progress?.status === "error") {
      throw new Error(
        progress.error || progress.message || "Erro na geração de vídeo."
      );
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error("Timeout aguardando geração de vídeo.");
}

export async function queueSeedanceSceneApi(
  projDir,
  storyboard = {},
  config = {},
  sceneIndex = 0
) {
  const apiCfg = loadSeedanceApiConfig(projDir);
  const vp = storyboard.visual_prompts?.[sceneIndex];
  if (!vp) throw new Error(`Cena índice ${sceneIndex} inválida.`);
  if (!isVideoIaScene(vp))
    throw new Error(`Cena ${vp.scene || sceneIndex + 1} não é tipo vídeo IA.`);

  const compiledPrompt = buildSeedanceT2vPrompt(vp);
  const timing = resolveSceneGenerationTiming(vp, config);
  const refs = vp.seedance_refs || {};

  const result = await generateSeedanceApiVideo({
    prompt: compiledPrompt,
    refs,
    directing_brief: vp.directing_brief,
    duration_seconds: timing.duration_seconds,
    aspect_ratio: timing.aspect_ratio,
    config: apiCfg,
    projDir,
  });

  return {
    provider: "seedance",
    mode: "api",
    scene_index: sceneIndex,
    scene: vp.scene,
    compiled_prompt: compiledPrompt,
    ...result,
  };
}

export async function queueMobileWanScene(
  projDir,
  storyboard = {},
  config = {},
  sceneIndex = 0
) {
  const visualPrompts = storyboard.visual_prompts || [];
  const vp = visualPrompts[sceneIndex];
  if (!vp) throw new Error(`Cena índice ${sceneIndex} inválida.`);
  if (!isVideoIaScene(vp))
    throw new Error(`Cena ${vp.scene || sceneIndex + 1} não é tipo vídeo IA.`);

  const compiledPrompt = buildSeedanceT2vPrompt(vp);
  const timing = resolveSceneGenerationTiming(vp, config);
  const { block, assetIdx } = computeSceneAssetIdx(visualPrompts, sceneIndex);

  const result = await queueMobileWanGeneration({
    prompt: compiledPrompt,
    aspect_ratio: timing.aspect_ratio,
    steps: 3, // default fast 3-step inference for MobileWAN
    high_quality: false,
  });

  return {
    provider: "mobilewan",
    mode: "local",
    scene_index: sceneIndex,
    scene: vp.scene,
    compiled_prompt: compiledPrompt,
    ...result,
  };
}

export async function generateSeedanceScenes({
  projDir,
  storyboard = {},
  config = {},
  sceneIndices = null,
  provider = "mobilewan",
  wait = false,
}) {
  const visualPrompts = storyboard.visual_prompts || [];
  let indices =
    Array.isArray(sceneIndices) && sceneIndices.length
      ? sceneIndices.filter((i) => i >= 0 && i < visualPrompts.length)
      : listVideoIaSceneIndices(visualPrompts);

  indices = indices.filter((i) => isVideoIaScene(visualPrompts[i]));
  if (!indices.length)
    throw new Error("Nenhuma cena tipo vídeo IA para gerar.");

  const jobs = [];
  for (const sceneIndex of indices) {
    let job;
    if (provider === "seedance") {
      job = await queueSeedanceSceneApi(
        projDir,
        storyboard,
        config,
        sceneIndex
      );
    } else {
      job = await queueMobileWanScene(projDir, storyboard, config, sceneIndex);
    }

    if (wait && job.prompt_id) {
      const progress = await waitForGenerationJob(job.prompt_id);
      const vp = visualPrompts[sceneIndex];
      const assetFilename = importGeneratedOutputToProject(
        projDir,
        progress.outputs[0],
        vp,
        sceneIndex
      );
      const attached = attachVideoAssetToProject(
        projDir,
        storyboard,
        config,
        sceneIndex,
        assetFilename
      );
      storyboard = attached.storyboard;
      config = attached.config;
      job.attached = true;
      job.asset = assetFilename;
      job.outputs = progress.outputs;
    }

    jobs.push(job);
  }

  return { jobs, storyboard, config, provider, waited: wait };
}

export async function attachSeedanceT2vOutput(
  projDir,
  storyboard = {},
  config = {},
  sceneIndex = 0,
  promptId = ""
) {
  const progress = getExternalJobProgress(promptId);
  if (progress?.status !== "completed" || !progress.outputs?.length) {
    return {
      ready: false,
      status: progress?.status || "unknown",
      progress,
    };
  }

  const vp = storyboard.visual_prompts?.[sceneIndex];
  const assetFilename = importGeneratedOutputToProject(
    projDir,
    progress.outputs[0],
    vp,
    sceneIndex
  );
  const attached = attachVideoAssetToProject(
    projDir,
    storyboard,
    config,
    sceneIndex,
    assetFilename
  );

  return {
    ready: true,
    asset: assetFilename,
    outputs: progress.outputs,
    ...attached,
  };
}
