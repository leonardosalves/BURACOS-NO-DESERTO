/**
 * Ferramentas de workflow Lumiera: B-roll, TTS, gaps, publish-prep, pipeline, BGM.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { spawn } from "child_process";
import { buildPythonSpawnEnv } from "./pythonEnv.js";
import { adaptMetadataForPlatforms } from "./platformMetadataAdapter.js";
import { convertCinematicMarkersForTts, isListicleProject } from "./videoProEnhancements.js";
import {
  synthesizeKokoroNarration,
  KOKORO_DEFAULT_VOICE,
  KOKORO_DEFAULT_SPEED,
} from "./kokoroTts.js";
import {
  loadFishSpeechConfig,
  synthesizeFishSpeech,
  FISH_SPEECH_DEFAULT_VOICE,
} from "./fishSpeechTts.js";
import {
  loadChatterboxConfig,
  synthesizeChatterboxNarration,
  CHATTERBOX_DEFAULT_VOICE,
} from "./chatterboxTts.js";
import {
  loadVoiceboxConfig,
  synthesizeVoiceboxNarration,
} from "./voiceboxTts.js";
import {
  loadGptSovitsConfig,
  synthesizeGptSovitsNarration,
  applyGptSovitsOptionOverrides,
  GPT_SOVITS_DEFAULT_VOICE,
} from "./gptSovitsTts.js";
import {
  loadStockUsageRegistry,
  registerStockUsage,
} from "./mediaUsageRegistry.js";
import { searchArchiveOrgMedia } from "./archiveOrgStock.js";
import { searchBingImagesMedia } from "./bingImageStock.js";
import { resolveStockSearchQuery } from "./stockSearchQuery.js";

const NARRATION_FILENAME = "narracao_mestra_premium.mp3";

export const LISTICLE_WORKFLOW_PRESETS = {
  SHORTS: [
    {
      id: "short-top3-shock",
      label: "Short Top 3 — choque rápido",
      niche: "curiosidades e fatos surpreendentes",
      topic: "fatos mais chocantes que poucos conhecem",
      rankCount: 3,
      rankOrder: "desc",
      hudStyle: "full",
      contentMode: "LISTICLE",
    },
    {
      id: "short-top3-daily-bizarre",
      label: "Short Top 3 — origens bizarras do dia a dia",
      niche: "curiosidades e fatos surpreendentes",
      topic: "objetos diários com histórias de origem inusitadas",
      rankCount: 3,
      rankOrder: "desc",
      hudStyle: "full",
      contentMode: "LISTICLE",
    },
    {
      id: "short-top5-viral",
      label: "Short Top 5 — ranking viral",
      niche: "história e tecnologia em formato curto",
      topic: "invenções ou eventos que mudaram tudo em segundos",
      rankCount: 5,
      rankOrder: "desc",
      hudStyle: "compact",
      contentMode: "LISTICLE",
    },
  ],
  LONGO: [
    {
      id: "long-top15-inventions",
      label: "Top 15 invenções que mudaram o mundo",
      niche: "história e invenções",
      topic: "invenções que mudaram a humanidade",
      rankCount: 15,
      rankOrder: "desc",
      hudStyle: "full",
      contentMode: "LISTICLE",
    },
    {
      id: "long-top20-history",
      label: "Top 20 momentos históricos",
      niche: "história e documentário",
      topic: "momentos históricos que mudaram o curso do mundo",
      rankCount: 20,
      rankOrder: "desc",
      hudStyle: "full",
      contentMode: "LISTICLE",
    },
  ],
};

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(urlObj, { method: "GET", headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpsGetJson(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode >= 400) {
        file.close();
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(destPath)));
    }).on("error", reject);
  });
}

function slugify(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "asset";
}

function isVideoScene(vp = {}) {
  const type = String(vp.type || "").toLowerCase();
  return type.includes("vídeo") || type.includes("video") || type.includes("mp4");
}

function sceneHasAsset(vp = {}, timelineAssets = {}, blockAssets = new Set()) {
  if (vp?.asset?.asset) return true;
  const block = String(vp.block || 1);
  const items = timelineAssets[block] || [];
  return items.some((item) => item?.asset && blockAssets.has(String(item.asset).split("/").pop()));
}

export function getWorkflowApiKeys(workspaceDir, projDir) {
  const globalPath = path.join(workspaceDir, "dashboard-qanat", "backend", "render_config_global.json");
  const globalCfg = readJson(globalPath, {});
  const projCfg = readJson(path.join(projDir, "config_qanat.json"), {});
  return {
    pexels: projCfg.pexels_api_key || globalCfg.pexels_api_key || process.env.PEXELS_API_KEY || "",
    pixabay: projCfg.pixabay_api_key || globalCfg.pixabay_api_key || process.env.PIXABAY_API_KEY || "",
  };
}

export function analyzeSceneGaps(projDir, { config = {}, storyboard = {} } = {}) {
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const timelineAssets = config.timeline_assets || {};
  const assetsDir = path.join(projDir, "ASSETS");
  const blockAssets = new Set();

  if (fs.existsSync(assetsDir)) {
    const scan = (dir, prefix = "") => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) scan(full, prefix ? `${prefix}/${item}` : item);
        else blockAssets.add(prefix ? `${prefix}/${item}` : item);
      }
    };
    scan(assetsDir);
  }

  const gaps = [];
  for (let i = 0; i < visualPrompts.length; i++) {
    const vp = visualPrompts[i];
    const hasAsset = vp?.asset?.asset || sceneHasAsset(vp, timelineAssets, blockAssets);
    if (!hasAsset) {
      gaps.push({
        index: i,
        scene: vp.scene || `${vp.block}.${i + 1}`,
        block: Number(vp.block || 1),
        narration_text: String(vp.narration_text || "").slice(0, 120),
        stock_query: resolveStockSearchQuery(vp, {
          strategyTitle: storyboard?.strategy?.title_main || "",
          format:
            config?.video_format ||
            storyboard?.format ||
            storyboard?.video_format ||
            "LONGO",
        }),
        type: vp.type || "image",
        isVideo: isVideoScene(vp),
        action: "fetch_stock",
      });
    }
  }

  const actions = [];
  if (!fs.existsSync(path.join(projDir, NARRATION_FILENAME))) {
    actions.push({ id: "generate_tts", label: "Gerar narração TTS", severity: "error" });
  }
  if (gaps.length > 0) {
    actions.push({ id: "fetch_stock", label: `Buscar B-roll (${gaps.length} cenas)`, severity: "warning", count: gaps.length });
  }
  if (gaps.length > 0 || !config.timeline_assets || !Object.keys(config.timeline_assets).length) {
    actions.push({ id: "auto_map", label: "Associar mídias com IA", severity: "info" });
  }
  const cachePath = path.join(projDir, "youtube_metadata_cache.json");
  if (!fs.existsSync(cachePath)) {
    actions.push({ id: "publish_prep", label: "Preparar publicação (metadados + thumbs)", severity: "info" });
  }
  const hasBgm = config.use_single_bgm || (Array.isArray(config.bgm_mappings) && config.bgm_mappings.length > 0);
  if (!hasBgm) {
    actions.push({ id: "apply_bgm", label: "Aplicar trilha Epidemic", severity: "info" });
  }
  if (!fs.existsSync(path.join(projDir, "block_timings.json"))) {
    actions.push({ id: "sync_timings", label: "Sincronizar narração (Whisper)", severity: "error" });
  }

  return {
    gaps,
    gapCount: gaps.length,
    totalScenes: visualPrompts.length,
    hasNarration: fs.existsSync(path.join(projDir, NARRATION_FILENAME)),
    hasTimings: fs.existsSync(path.join(projDir, "block_timings.json")),
    hasMetadataCache: fs.existsSync(cachePath),
    isListicle: isListicleProject(config, storyboard),
    actions,
  };
}

async function searchPexels(query, { apiKey, isVideo = false, skipSourceIds = new Set() }) {
  if (!apiKey) return null;
  const base = isVideo
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`;
  const data = await httpsGetJson(base, { Authorization: apiKey });
  if (isVideo) {
    for (const video of data.videos || []) {
      const sourceId = `pexels:${video.id}`;
      if (skipSourceIds.has(sourceId)) continue;
      const file = video?.video_files?.find((f) => f.quality === "hd") || video?.video_files?.[0];
      if (file?.link) {
        return { url: file.link, ext: ".mp4", source: "pexels", sourceId };
      }
    }
    return null;
  }
  for (const photo of data.photos || []) {
    const sourceId = `pexels:${photo.id}`;
    if (skipSourceIds.has(sourceId)) continue;
    const url = photo?.src?.large2x || photo?.src?.large;
    if (url) return { url, ext: ".jpeg", source: "pexels", sourceId };
  }
  return null;
}

async function searchPixabay(query, { apiKey, isVideo = false, skipSourceIds = new Set() }) {
  if (!apiKey) return null;
  const url = `https://pixabay.com/api/${isVideo ? "videos/" : ""}?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=12&safesearch=true`;
  const data = await httpsGetJson(url);
  if (isVideo) {
    for (const hit of data.hits || []) {
      const sourceId = `pixabay:${hit.id}`;
      if (skipSourceIds.has(sourceId)) continue;
      const videoUrl = hit?.videos?.medium?.url || hit?.videos?.small?.url;
      if (videoUrl) return { url: videoUrl, ext: ".mp4", source: "pixabay", sourceId };
    }
    return null;
  }
  for (const hit of data.hits || []) {
    const sourceId = `pixabay:${hit.id}`;
    if (skipSourceIds.has(sourceId)) continue;
    if (hit?.largeImageURL) return { url: hit.largeImageURL, ext: ".jpg", source: "pixabay", sourceId };
  }
  return null;
}

function buildStockQuery(target = {}, { strategyTitle = "" } = {}) {
  return resolveStockSearchQuery(target, { strategyTitle });
}

export async function fetchStockForScenes(projDir, {
  workspaceDir,
  maxScenes = 12,
  onlyMissing = true,
  onLog = () => {},
} = {}) {
  const config = readJson(path.join(projDir, "config_qanat.json"), {});
  const storyboard = readJson(path.join(projDir, "storyboard.json"), {});
  const keys = getWorkflowApiKeys(workspaceDir, projDir);
  const gapReport = analyzeSceneGaps(projDir, { config, storyboard });
  const strategyTitle = storyboard?.strategy?.title_main || "";
  const targets = onlyMissing ? gapReport.gaps : (storyboard.visual_prompts || []).map((vp, index) => ({
    index,
    scene: vp.scene,
    block: vp.block,
    stock_query: resolveStockSearchQuery(vp, { strategyTitle }),
    narration_text: vp.narration_text,
    prompt: vp.prompt,
    isVideo: isVideoScene(vp),
  }));

  const useBing = config.use_bing_images !== false;
  const useArchive = config.use_archive_org !== false;

  if (!keys.pexels && !keys.pixabay && !useBing && !useArchive) {
    return {
      success: false,
      error: "Configure Pexels/Pixabay ou mantenha Bing Images / Archive.org ativos.",
      fetched: [],
      skipped: targets.length,
    };
  }

  const assetsDir = path.join(projDir, "ASSETS");
  fs.mkdirSync(assetsDir, { recursive: true });
  const fetched = [];
  const errors = [];
  const registry = workspaceDir ? loadStockUsageRegistry(workspaceDir) : { bySourceId: {} };
  const skipSourceIds = new Set(
    Object.keys(registry.bySourceId || {}).filter((id) => (registry.bySourceId[id]?.count || 0) > 0),
  );
  const projectName = path.basename(projDir);

  for (const target of targets.slice(0, maxScenes)) {
    const query = buildStockQuery(target, { strategyTitle });
    if (!query) continue;
    onLog(`[Stock] Buscando: "${query}" (cena ${target.scene || target.index + 1})...`);

    let media = null;
    try {
      media = await searchPexels(query, { apiKey: keys.pexels, isVideo: target.isVideo, skipSourceIds });
      if (!media && keys.pixabay) {
        media = await searchPixabay(query, { apiKey: keys.pixabay, isVideo: target.isVideo, skipSourceIds });
      }
      if (!media && useBing && !target.isVideo) {
        media = await searchBingImagesMedia(query, { skipSourceIds });
        if (media) onLog(`[Stock] Bing Images: "${query}" → ${media.sourceId}`);
      }
      if (!media && useArchive) {
        media = await searchArchiveOrgMedia(query, {
          preferVideo: target.isVideo,
          skipSourceIds,
        });
        if (media) onLog(`[Stock] Archive.org: "${query}" → ${media.sourceId}`);
      }
    } catch (err) {
      errors.push({ scene: target.scene, query, error: err.message });
      onLog(`[Stock] ✗ ${query}: ${err.message}`);
      continue;
    }

    if (!media?.url) {
      errors.push({ scene: target.scene, query, error: "Nenhum resultado" });
      continue;
    }

    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const block = Number(target.block || 1);
    const sceneTag = String(target.scene || `${block}.${(target.index ?? 0) + 1}`).replace(/\./g, "_");
    const sourceTag = media.sourceId ? media.sourceId.replace(":", "_") : media.source;
    const filename = `b${block}_s${sceneTag}_${slugify(query)}_${sourceTag}_${stamp}${media.ext}`;
    const destPath = path.join(assetsDir, filename);

    try {
      await downloadFile(media.url, destPath);
      if (media.sourceId) skipSourceIds.add(media.sourceId);
      if (workspaceDir) {
        registerStockUsage(workspaceDir, {
          sourceId: media.sourceId,
          relPath: filename,
          project: projectName,
          scene: target.scene,
          query,
        });
      }
      fetched.push({ scene: target.scene, block: target.block, file: filename, source: media.source, query, sourceId: media.sourceId });
      onLog(`[Stock] ✓ ${filename} (${media.source})`);

      if (Array.isArray(storyboard.visual_prompts) && storyboard.visual_prompts[target.index]) {
        storyboard.visual_prompts[target.index].asset = {
          asset: filename,
          type: target.isVideo ? "video" : "image",
          fixed: target.isVideo ? 8 : undefined,
        };
        const narration = String(storyboard.visual_prompts[target.index].narration_text || "").trim();
        if (narration) {
          storyboard.visual_prompts[target.index].stock_query = query;
        }
      }
    } catch (err) {
      errors.push({ scene: target.scene, query, error: err.message });
    }
  }

  if (fetched.length) {
    writeJson(path.join(projDir, "storyboard.json"), storyboard);
  }

  return { success: fetched.length > 0, fetched, errors, skipped: targets.length - fetched.length };
}

export async function generateNarrationTts(projDir, {
  voice,
  rate = "+0%",
  pitch = "+0Hz",
  speed = KOKORO_DEFAULT_SPEED,
  platform = "kokoro",
  workspaceDir = null,
  onLog = () => {},
  onProgress = () => {},
  ttsOptions = {},
} = {}) {
  const storyboard = readJson(path.join(projDir, "storyboard.json"), {});
  const taggedFromBoard = storyboard.narrative_script_tagged || storyboard.narrative_script || "";
  const plainFromBoard = storyboard.narrative_script
    || String(taggedFromBoard).replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
  const tagged = String(ttsOptions.customTaggedText || "").trim() || taggedFromBoard;
  const plain = String(ttsOptions.customPlainText || "").trim() || plainFromBoard;

  if (!plain || plain.length < 40) {
    throw new Error("Roteiro de narração ausente ou muito curto no storyboard.");
  }

  const useTaggedOverride = ttsOptions.useTaggedScript;

  const engine = String(platform || "kokoro").toLowerCase();
  const engineLabel = engine === "voicebox"
    ? "Voicebox"
    : (engine === "gptsovits" || engine === "gpt_sovits" || engine === "gpt-sovits")
      ? "GPT-SoVITS"
      : (engine === "fish" || engine === "fish-speech" || engine === "fish_speech")
        ? "Fish Audio"
        : engine === "kokoro"
          ? "Kokoro"
          : engine === "edge"
            ? "Edge TTS"
            : "TTS";
  onProgress("prepare", `${engineLabel}: preparando narração…`, 4);
  const dest = path.join(projDir, NARRATION_FILENAME);

  const invalidateNarrationTimings = () => {
    for (const fname of ["word_transcripts.json", "block_timings.json"]) {
      const stalePath = path.join(projDir, fname);
      if (fs.existsSync(stalePath)) {
        try { fs.unlinkSync(stalePath); } catch (_) {}
      }
    }
  };

  if (engine === "kokoro") {
    const kokoroVoice = voice || KOKORO_DEFAULT_VOICE;
    const kokoroSpeed = Number(speed);
    const result = await synthesizeKokoroNarration(plain, {
      voice: kokoroVoice,
      speed: Number.isFinite(kokoroSpeed) ? kokoroSpeed : KOKORO_DEFAULT_SPEED,
      outputPath: dest,
      workDir: projDir,
      onLog,
    });
    invalidateNarrationTimings();
    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: result.chars,
      voice: result.voice,
      speed: result.speed,
      engine: "kokoro",
      durationSeconds: result.durationSeconds,
      message: `Narração Kokoro gerada (${result.voice}, ${result.durationSeconds?.toFixed(1) || "?"}s). Rode sync Whisper para atualizar timings.`,
    };
  }

  if (engine === "edge") {
    const textForTts = plain;
    const edgeVoice = voice || "pt-BR-AntonioNeural";

    let EdgeTTS;
    try {
      ({ EdgeTTS } = await import("edge-tts-universal"));
    } catch {
      throw new Error("Pacote edge-tts-universal não instalado. Rode npm install no backend.");
    }

    const tts = new EdgeTTS(textForTts, edgeVoice, { rate, pitch });
    const result = await tts.synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    invalidateNarrationTimings();

    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: textForTts.length,
      voice: edgeVoice,
      engine: "edge",
      message: `Narração Edge TTS gerada (${edgeVoice}). Rode sync Whisper para atualizar timings.`,
    };
  }

  if (engine === "chatterbox" || engine === "chatterbox-tts") {
    const cbConfig = loadChatterboxConfig({ workspaceDir, projectDir: projDir });
    const cbCfg = cbConfig.chatterbox || {};
    const voicePreset = voice || cbCfg.default_voice || cbCfg.defaultVoice || CHATTERBOX_DEFAULT_VOICE;
    const useTurboTags = String(voicePreset).includes("turbo");
    const tagPlatform = useTurboTags ? "turbo" : "chatterbox";
    const useTagged = cbCfg.use_tagged_script !== false && cbCfg.useTaggedScript !== false;
    const textForTts = useTagged && String(tagged).trim().length > 40
      ? convertCinematicMarkersForTts(tagged, tagPlatform)
      : plain;

    const result = await synthesizeChatterboxNarration(textForTts, {
      voice: voicePreset,
      outputPath: dest,
      workDir: projDir,
      config: cbConfig,
      onLog,
    });
    invalidateNarrationTimings();

    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: result.chars,
      voice: result.voice,
      engine: "chatterbox",
      model: result.model,
      durationSeconds: result.durationSeconds,
      message: `Narração Chatterbox gerada (${result.voice}, ${result.durationSeconds?.toFixed(1) || "?"}s, ${result.chunks || 1} bloco(s)). Rode sync Whisper para timings.`,
    };
  }

  if (engine === "voicebox") {
    const vbConfig = loadVoiceboxConfig({ workspaceDir, projectDir: projDir });
    const vbCfg = vbConfig.voicebox || {};
    const vbOpt = ttsOptions.voicebox || {};
    if (vbOpt.engine) vbConfig.voicebox = { ...vbCfg, engine: vbOpt.engine };
    if (vbOpt.language) vbConfig.voicebox = { ...vbConfig.voicebox, language: vbOpt.language };
    if (vbOpt.maxChunkChars) {
      vbConfig.voicebox = { ...vbConfig.voicebox, max_chunk_chars: vbOpt.maxChunkChars };
    }
    const useTagged = useTaggedOverride !== undefined
      ? Boolean(useTaggedOverride)
      : (vbCfg.use_tagged_script !== false && vbCfg.useTaggedScript !== false);
    const tagPlatform = String(vbConfig.voicebox.engine || "chatterbox").includes("turbo") ? "turbo" : "chatterbox";
    const textForTts = useTagged && String(tagged).trim().length > 40
      ? convertCinematicMarkersForTts(tagged, tagPlatform)
      : plain;
    const vbVoice = voice || vbCfg.default_profile_id || vbCfg.defaultProfileId || "";

    const result = await synthesizeVoiceboxNarration(textForTts, {
      voice: vbVoice,
      outputPath: dest,
      config: vbConfig,
      onLog,
      onProgress,
    });
    invalidateNarrationTimings();

    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: result.chars,
      voice: result.profileName,
      engine: "voicebox",
      profileId: result.profileId,
      durationSeconds: result.durationSeconds,
      message: `Narração Voicebox gerada (${result.profileName}, engine ${result.engine}). Clone local — rode sync Whisper para timings.`,
    };
  }

  if (engine === "gptsovits" || engine === "gpt_sovits" || engine === "gpt-sovits") {
    const gsConfig = applyGptSovitsOptionOverrides(
      loadGptSovitsConfig({ workspaceDir, projectDir: projDir }),
      ttsOptions.gptSovits || ttsOptions.gpt_sovits || {},
    );
    const gsVoice = voice || gsConfig.gpt_sovits?.default_voice_id || GPT_SOVITS_DEFAULT_VOICE;
    const textForTts = plain;

    const result = await synthesizeGptSovitsNarration(textForTts, {
      voice: gsVoice,
      outputPath: dest,
      config: gsConfig,
      onLog,
      onProgress: (phase, label, percent) => onProgress(phase, label, percent),
      options: ttsOptions.gptSovits || ttsOptions.gpt_sovits || {},
    });
    invalidateNarrationTimings();

    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: result.chars,
      voice: result.voiceLabel || gsVoice,
      engine: "gptsovits",
      format: result.format,
      message: `Narração GPT-SoVITS gerada (${result.voiceLabel || gsVoice}, clone few-shot). Rode sync Whisper para timings.`,
    };
  }

  if (engine === "fish" || engine === "fish-speech" || engine === "fish_speech") {
    const fishConfig = loadFishSpeechConfig({ workspaceDir, projectDir: projDir });
    const fishCfg = fishConfig.fish_speech || {};
    const fishOpt = ttsOptions.fish || {};
    fishConfig.fish_speech = {
      ...fishCfg,
      ...(fishOpt.temperature != null ? { temperature: Number(fishOpt.temperature) } : {}),
      ...(fishOpt.topP != null ? { top_p: Number(fishOpt.topP) } : {}),
      ...(fishOpt.top_p != null ? { top_p: Number(fishOpt.top_p) } : {}),
      ...(fishOpt.repetitionPenalty != null ? { repetition_penalty: Number(fishOpt.repetitionPenalty) } : {}),
      ...(fishOpt.repetition_penalty != null ? { repetition_penalty: Number(fishOpt.repetition_penalty) } : {}),
      ...(fishOpt.chunkLength != null ? { chunk_length: Number(fishOpt.chunkLength) } : {}),
      ...(fishOpt.chunk_length != null ? { chunk_length: Number(fishOpt.chunk_length) } : {}),
      ...(fishOpt.prosodySpeed != null ? { prosody_speed: Number(fishOpt.prosodySpeed) } : {}),
      ...(fishOpt.prosody_speed != null ? { prosody_speed: Number(fishOpt.prosody_speed) } : {}),
      ...(fishOpt.cloudModel ? { cloud_model: String(fishOpt.cloudModel) } : {}),
      ...(fishOpt.cloud_model ? { cloud_model: String(fishOpt.cloud_model) } : {}),
    };
    const useTagged = useTaggedOverride !== undefined
      ? Boolean(useTaggedOverride)
      : (fishCfg.use_tagged_script !== false && fishCfg.useTaggedScript !== false);
    const textForTts = useTagged && String(tagged).trim().length > 40
      ? convertCinematicMarkersForTts(tagged, "fish")
      : plain;
    const fishVoice = voice || fishCfg.default_reference_id || fishCfg.defaultReferenceId || FISH_SPEECH_DEFAULT_VOICE;

    const result = await synthesizeFishSpeech(textForTts, {
      outputPath: dest,
      referenceId: fishVoice,
      config: fishConfig,
      onLog,
      onProgress,
    });
    invalidateNarrationTimings();

    const refLabel = result.referenceId || "padrão S2";
    return {
      success: true,
      file: NARRATION_FILENAME,
      chars: textForTts.length,
      voice: fishVoice,
      engine: "fish",
      format: result.format,
      message: `Narração Fish Speech gerada (ref: ${refLabel}). Tags inline ativas se narrative_script_tagged existir. Rode sync Whisper para timings.`,
    };
  }

  const textForTts = convertCinematicMarkersForTts(tagged, engine);
  throw new Error(`Engine TTS "${engine}" não suportado. Use kokoro, voicebox, gptsovits, chatterbox, fish ou edge. Texto: ${textForTts.slice(0, 80)}...`);
}

export function applyListiclePreset(preset = {}, { format = "SHORTS" } = {}) {
  const list = LISTICLE_WORKFLOW_PRESETS[format] || LISTICLE_WORKFLOW_PRESETS.SHORTS;
  const found = list.find((p) => p.id === preset.id) || preset;
  return {
    format: format === "SHORTS" ? "SHORTS" : "LONGO",
    aspect_ratio: format === "SHORTS" ? "9:16" : "16:9",
    content_mode: "LISTICLE",
    rank_count: found.rankCount || 3,
    rank_order: found.rankOrder || "desc",
    list_topic: found.topic || "",
    niche: found.niche || "",
    listicle_hud_style: found.hudStyle || "full",
    preset_id: found.id,
    preset_label: found.label,
  };
}

export async function runPublishPrep(projDir, {
  generateMetadata,
  generateThumbnails,
  onLog = () => {},
} = {}) {
  if (!generateMetadata) throw new Error("generateMetadata handler ausente");

  onLog("[Publish Prep] Gerando metadados YouTube...");
  const metadata = await generateMetadata(projDir);
  onLog("[Publish Prep] Metadados gerados.");

  let thumbnails = metadata?.parsed?.thumbnails || [];
  if (generateThumbnails && thumbnails.length) {
    onLog("[Publish Prep] Gerando imagens de thumbnail...");
    const thumbResult = await generateThumbnails(projDir, metadata);
    thumbnails = thumbResult?.thumbnails || thumbnails;
    onLog(`[Publish Prep] ${thumbnails.length} thumbnails prontas.`);
  }

  const adapted = adaptMetadataForPlatforms(metadata.parsed || {}, metadata.format || "LONG");
  const configPath = path.join(projDir, "config_qanat.json");
  const config = readJson(configPath, {});
  config.upload_metadata = {
    youtube: adapted.youtube,
    instagram: adapted.instagram,
    tiktok: adapted.tiktok,
    kwai: adapted.kwai,
    preparedAt: new Date().toISOString(),
  };
  writeJson(configPath, config);
  onLog("[Publish Prep] Campos de upload preenchidos em config_qanat.json.");

  return {
    success: true,
    metadata,
    adapted,
    thumbnails,
  };
}

export function runPythonScript(pythonPath, projDir, script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [script, ...args], {
      cwd: projDir,
      shell: false,
      env: buildPythonSpawnEnv(),
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Exit ${code}`));
    });
  });
}

export const CREATOR_PIPELINE_STEPS = [
  { id: "sync", label: "Sincronizar narração (Whisper)" },
  { id: "stock", label: "Buscar B-roll faltante" },
  { id: "automap", label: "Associar mídias na timeline" },
  { id: "bgm", label: "Trilha Epidemic automática" },
  { id: "mix", label: "Mix BGM", optional: true },
  { id: "metadata", label: "Metadados YouTube" },
  { id: "thumbnails", label: "Thumbnails A/B" },
];

export async function runCreatorPipelineStep(stepId, projDir, handlers = {}, onLog = () => {}) {
  const step = CREATOR_PIPELINE_STEPS.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step desconhecido: ${stepId}`);
  onLog(`[Pipeline] ▶ ${step.label}...`);

  if (handlers[stepId]) {
    await handlers[stepId](projDir, onLog);
    onLog(`[Pipeline] ✓ ${step.label}`);
    return { ok: true };
  }

  throw new Error(`Handler ausente para: ${stepId}`);
}

export async function runCreatorPipeline(projDir, {
  steps = ["sync", "stock", "automap", "bgm", "mix", "metadata", "thumbnails"],
  handlers = {},
  onLog = () => {},
} = {}) {
  const results = [];
  for (const stepId of steps) {
    try {
      await runCreatorPipelineStep(stepId, projDir, handlers, onLog);
      results.push({ stepId, ok: true });
    } catch (err) {
      results.push({ stepId, ok: false, error: err.message });
      onLog(`[Pipeline] ✗ ${stepId}: ${err.message}`);
      break;
    }
  }
  return results;
}