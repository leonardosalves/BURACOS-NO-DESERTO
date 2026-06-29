/**
 * Ferramentas de workflow Lumiera: B-roll, TTS, gaps, publish-prep, pipeline, BGM.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { spawn } from "child_process";
import { adaptMetadataForPlatforms } from "./platformMetadataAdapter.js";
import { convertCinematicMarkersForTts, isListicleProject } from "./videoProEnhancements.js";

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
        stock_query: vp.stock_query || vp.prompt || "",
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

async function searchPexels(query, { apiKey, isVideo = false }) {
  if (!apiKey) return null;
  const base = isVideo
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3`;
  const data = await httpsGetJson(base, { Authorization: apiKey });
  if (isVideo) {
    const video = data.videos?.[0];
    const file = video?.video_files?.find((f) => f.quality === "hd") || video?.video_files?.[0];
    return file?.link ? { url: file.link, ext: ".mp4", source: "pexels" } : null;
  }
  const photo = data.photos?.[0];
  return photo?.src?.large2x || photo?.src?.large
    ? { url: photo.src.large2x || photo.src.large, ext: ".jpeg", source: "pexels" }
    : null;
}

async function searchPixabay(query, { apiKey, isVideo = false }) {
  if (!apiKey) return null;
  const type = isVideo ? "film" : "photo";
  const url = `https://pixabay.com/api/${isVideo ? "videos/" : ""}?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=3&safesearch=true`;
  const data = await httpsGetJson(url);
  if (isVideo) {
    const hit = data.hits?.[0];
    const videoUrl = hit?.videos?.medium?.url || hit?.videos?.small?.url;
    return videoUrl ? { url: videoUrl, ext: ".mp4", source: "pixabay" } : null;
  }
  const hit = data.hits?.[0];
  return hit?.largeImageURL ? { url: hit.largeImageURL, ext: ".jpg", source: "pixabay" } : null;
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
  const targets = onlyMissing ? gapReport.gaps : (storyboard.visual_prompts || []).map((vp, index) => ({
    index,
    scene: vp.scene,
    block: vp.block,
    stock_query: vp.stock_query || vp.prompt,
    isVideo: isVideoScene(vp),
  }));

  if (!keys.pexels && !keys.pixabay) {
    return {
      success: false,
      error: "Configure pexels_api_key ou pixabay_api_key em Configurações → Workflow.",
      fetched: [],
      skipped: targets.length,
    };
  }

  const assetsDir = path.join(projDir, "ASSETS");
  fs.mkdirSync(assetsDir, { recursive: true });
  const fetched = [];
  const errors = [];

  for (const target of targets.slice(0, maxScenes)) {
    const query = String(target.stock_query || target.narration_text || "cinematic").trim().slice(0, 80);
    if (!query) continue;
    onLog(`[Stock] Buscando: "${query}" (cena ${target.scene || target.index + 1})...`);

    let media = null;
    try {
      media = await searchPexels(query, { apiKey: keys.pexels, isVideo: target.isVideo });
      if (!media && keys.pixabay) {
        media = await searchPixabay(query, { apiKey: keys.pixabay, isVideo: target.isVideo });
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
    const filename = `${slugify(query)}_${stamp}${media.ext}`;
    const destPath = path.join(assetsDir, filename);

    try {
      await downloadFile(media.url, destPath);
      fetched.push({ scene: target.scene, block: target.block, file: filename, source: media.source, query });
      onLog(`[Stock] ✓ ${filename} (${media.source})`);

      if (Array.isArray(storyboard.visual_prompts) && storyboard.visual_prompts[target.index]) {
        storyboard.visual_prompts[target.index].asset = {
          asset: filename,
          type: target.isVideo ? "video" : "image",
          fixed: target.isVideo ? 8 : undefined,
        };
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
  voice = "pt-BR-AntonioNeural",
  rate = "+0%",
  platform = "edge",
} = {}) {
  const storyboard = readJson(path.join(projDir, "storyboard.json"), {});
  const tagged = storyboard.narrative_script_tagged || storyboard.narrative_script || "";
  const plain = storyboard.narrative_script || String(tagged).replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();

  if (!plain || plain.length < 40) {
    throw new Error("Roteiro de narração ausente ou muito curto no storyboard.");
  }

  const textForTts = platform === "edge"
    ? plain
    : convertCinematicMarkersForTts(tagged, platform);

  if (platform !== "edge") {
    throw new Error(`Plataforma TTS "${platform}" ainda não integrada. Use engine=edge.`);
  }

  let EdgeTTS;
  try {
    ({ EdgeTTS } = await import("edge-tts-universal"));
  } catch {
    throw new Error("Pacote edge-tts-universal não instalado. Rode npm install no backend.");
  }

  const tts = new EdgeTTS(textForTts, voice, { rate });
  const result = await tts.synthesize();
  const buffer = Buffer.from(await result.audio.arrayBuffer());
  const dest = path.join(projDir, NARRATION_FILENAME);
  fs.writeFileSync(dest, buffer);

  return {
    success: true,
    file: NARRATION_FILENAME,
    chars: textForTts.length,
    voice,
  };
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
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
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