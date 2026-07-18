import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getFfmpegStatus } from "./pythonEnv.js";

const REPORT_NAME = "youtube_quality_gate.json";
const OUTCOMES_NAME = "youtube_quality_outcomes.json";
const WORD_RE = /[\p{L}\p{N}]+/gu;

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value) {
  return normalizeText(value).match(WORD_RE) || [];
}

function shingles(value, size = 3) {
  const words = tokenize(value);
  if (words.length < size) return new Set(words);
  const out = new Set();
  for (let i = 0; i <= words.length - size; i += 1) {
    out.add(words.slice(i, i + size).join(" "));
  }
  return out;
}

export function jaccard(a, b) {
  const left = a instanceof Set ? a : new Set(a || []);
  const right = b instanceof Set ? b : new Set(b || []);
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / Math.max(1, left.size + right.size - intersection);
}

export function textSimilarity(a, b) {
  if (!String(a || "").trim() || !String(b || "").trim()) return 0;
  return jaccard(shingles(a), shingles(b));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function check(id, category, status, message, fix = "", details = {}) {
  return { id, category, status, message, fix, details };
}

function getNarration(storyboard, config) {
  return String(
    storyboard?.narrative_script ||
      storyboard?.technical_config?.script ||
      config?.narration_script ||
      config?.script ||
      ""
  ).trim();
}

function getYoutubeMetadata(storyboard, config) {
  const upload = config?.upload_metadata?.youtube || {};
  return {
    title: String(
      upload.title || storyboard?.strategy?.title_main || config?.title || ""
    ).trim(),
    description: String(upload.description || "").trim(),
    tags: Array.isArray(upload.tags)
      ? upload.tags
      : String(upload.tags || "")
          .split(/[,;]/)
          .map((item) => item.trim())
          .filter(Boolean),
    chapters: String(upload.chapters || "").trim(),
    thumbnail: String(upload.thumbnail || upload.thumbnail_path || "").trim(),
    privacy: String(upload.privacy || "private").toLowerCase(),
    containsSyntheticMedia:
      upload.contains_synthetic_media !== false &&
      String(upload.contains_synthetic_media ?? "true").toLowerCase() !==
        "false",
  };
}

function collectAssets(config) {
  const values = [];
  const timeline = config?.timeline_assets || {};
  for (const list of Object.values(timeline)) {
    for (const item of Array.isArray(list) ? list : []) {
      if (typeof item === "string") values.push({ asset: item });
      else if (item && typeof item === "object") values.push(item);
    }
  }
  return values;
}

function collectUrls(value, out = new Set()) {
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    for (const url of matches) out.add(url.replace(/[),.;]+$/, ""));
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectUrls(nested, out);
  }
  return out;
}

function listSiblingProjects(projectsRoot, currentDir) {
  if (!projectsRoot || !fs.existsSync(projectsRoot)) return [];
  const current = path.resolve(currentDir).toLowerCase();
  const dirs = [];
  const roots = [projectsRoot];
  for (const name of ["VIDEOS LONGOS", "VIDEOS CURTOS SHORTS"]) {
    const nested = path.join(projectsRoot, name);
    if (fs.existsSync(nested)) roots.push(nested);
  }
  for (const root of roots) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      if (path.resolve(dir).toLowerCase() === current) continue;
      const storyboardPath = path.join(dir, "storyboard.json");
      const configPath = path.join(dir, "config_qanat.json");
      if (!fs.existsSync(storyboardPath) && !fs.existsSync(configPath))
        continue;
      let mtime = 0;
      try {
        mtime = Math.max(
          fs.existsSync(storyboardPath)
            ? fs.statSync(storyboardPath).mtimeMs
            : 0,
          fs.existsSync(configPath) ? fs.statSync(configPath).mtimeMs : 0
        );
      } catch {
        // Ignore projetos removidos durante a varredura.
      }
      dirs.push({ dir, mtime });
    }
  }
  return dirs.sort((a, b) => b.mtime - a.mtime).slice(0, 100);
}

export function assessOriginality({
  narration,
  title,
  assets = [],
  previousProjects = [],
  sourceCount = 0,
}) {
  let maxNarration = { score: 0, project: null };
  let maxTitle = { score: 0, project: null };
  let maxAssets = { score: 0, project: null };
  const currentAssets = new Set(
    assets
      .map((item) =>
        path.basename(String(item.asset || item.file || "")).toLowerCase()
      )
      .filter(Boolean)
  );

  for (const previous of previousProjects) {
    const narrationScore = textSimilarity(narration, previous.narration);
    const titleScore = textSimilarity(title, previous.title);
    const assetScore = jaccard(currentAssets, new Set(previous.assets || []));
    if (narrationScore > maxNarration.score)
      maxNarration = { score: narrationScore, project: previous.name };
    if (titleScore > maxTitle.score)
      maxTitle = { score: titleScore, project: previous.name };
    if (assetScore > maxAssets.score)
      maxAssets = { score: assetScore, project: previous.name };
  }

  const genericIntro =
    /^(ola|oi pessoal|no video de hoje|voce nao vai acreditar|prepare se|nesse video)/i.test(
      normalizeText(narration)
    );
  let score = 100;
  score -= maxNarration.score * 60;
  score -= maxTitle.score * 12;
  score -= maxAssets.score * 18;
  if (genericIntro) score -= 10;
  if (!sourceCount) score -= 8;

  return {
    score: round(clamp(score)),
    maxNarration,
    maxTitle,
    maxAssets,
    genericIntro,
    sourceCount,
  };
}

export function assessRetention({ title, narration, sceneDurations = [] }) {
  const words = tokenize(narration);
  const firstWords = words.slice(0, 75).join(" ");
  const promiseOverlap = jaccard(
    new Set(tokenize(title).filter((word) => word.length > 3)),
    new Set(tokenize(firstWords).filter((word) => word.length > 3))
  );
  const vagueOpening =
    /^(ola|oi|bem vind|no video de hoje|antes de comecar|se inscreva)/i.test(
      normalizeText(narration)
    );
  const concreteHook =
    /\d|por que|como|segredo|descob|prova|mas|porem|nunca|maior|primeir/i.test(
      firstWords
    );
  const sentences = String(narration || "")
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .filter((item) => tokenize(item).length >= 5);
  let repeatedPairs = 0;
  for (let i = 0; i < sentences.length; i += 1) {
    for (let j = i + 1; j < sentences.length; j += 1) {
      if (textSimilarity(sentences[i], sentences[j]) >= 0.72)
        repeatedPairs += 1;
    }
  }
  const maxScene = sceneDurations.length ? Math.max(...sceneDurations) : 0;
  const averageScene = sceneDurations.length
    ? sceneDurations.reduce((sum, value) => sum + value, 0) /
      sceneDurations.length
    : 0;
  const factSignals = (
    String(narration).match(
      /\d+|%|estudo|pesquisa|dados|segundo|cientist|universidade/gi
    ) || []
  ).length;
  const openLoop =
    /mas|porem|segredo|o que aconteceu|a verdade|ate que|descobrir/i.test(
      narration
    );

  let score = 45;
  score += Math.min(18, promiseOverlap * 30);
  if (concreteHook) score += 14;
  if (!vagueOpening) score += 10;
  if (factSignals >= 2) score += 8;
  if (openLoop) score += 5;
  score -= Math.min(18, repeatedPairs * 6);
  if (maxScene > 12) score -= 8;
  if (averageScene > 8) score -= 5;

  return {
    score: round(clamp(score)),
    promiseOverlap: round(promiseOverlap, 2),
    vagueOpening,
    concreteHook,
    repeatedPairs,
    maxScene: round(maxScene),
    averageScene: round(averageScene),
    factSignals,
    openLoop,
  };
}

export function assessMetadataAndPolicy({
  metadata,
  narration,
  assetCount = 0,
  provenanceCount = 0,
  sourceCount = 0,
  isShort = false,
}) {
  const sensitiveTerms =
    /\b(morte|matar|assassin|suicid|sangue|sexo|nudez|droga|cocaina|arma|guerra|terror|abuso|fraude|golpe)\b/gi;
  const educationalContext =
    /\b(historia|documentario|educacional|analise|pesquisa|contexto|explica|cientifico|noticia)\b/i.test(
      `${metadata.title} ${metadata.description} ${narration}`
    );
  const sensitiveInTitle = (metadata.title.match(sensitiveTerms) || []).length;
  const sensitiveInBody = (
    `${metadata.description} ${narration}`.match(sensitiveTerms) || []
  ).length;
  const chapters = metadata.chapters
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{1,2}:\d{2}/.test(line));
  const provenanceCoverage = assetCount ? provenanceCount / assetCount : 1;
  let score = 100;
  if (!metadata.title) score -= 35;
  if (metadata.title.length > 100) score -= 20;
  if (!metadata.description) score -= 15;
  if (!metadata.tags.length) score -= 5;
  if (!isShort && chapters.length < 3) score -= 8;
  if (!metadata.containsSyntheticMedia) score -= 20;
  if (sensitiveInTitle) score -= educationalContext ? 8 : 20;
  if (sensitiveInBody > 2) score -= educationalContext ? 5 : 15;
  if (assetCount && provenanceCoverage < 0.4) score -= 8;
  if (!sourceCount) score -= 6;
  return {
    score: round(clamp(score)),
    chapters: chapters.length,
    sensitiveInTitle,
    sensitiveInBody,
    educationalContext,
    provenanceCoverage: round(provenanceCoverage, 2),
  };
}

function command(binary, args, { timeoutMs = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Tempo limite excedido: ${path.basename(binary)}`));
    }, timeoutMs);
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function parseDuration(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRate(value) {
  const [num, den] = String(value || "0/1")
    .split("/")
    .map(Number);
  return den ? num / den : num || 0;
}

async function probeVideo(videoPath) {
  const ffmpeg = getFfmpegStatus();
  if (!ffmpeg.found) throw new Error("FFmpeg não encontrado.");
  const ffprobe = path.join(ffmpeg.dir, "ffprobe.exe");
  const result = await command(ffprobe, [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    videoPath,
  ]);
  if (result.code !== 0)
    throw new Error(result.stderr.trim() || "ffprobe falhou.");
  return { data: JSON.parse(result.stdout), ffmpeg: ffmpeg.binary };
}

function parseIntervals(text, type) {
  const regex =
    type === "black"
      ? /black_start:([\d.]+).*?black_end:([\d.]+).*?black_duration:([\d.]+)/g
      : type === "freeze"
        ? /freeze_start:([\d.]+)[\s\S]*?freeze_duration:([\d.]+)/g
        : /silence_start:\s*([\d.]+)[\s\S]*?silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;
  const out = [];
  let match;
  while ((match = regex.exec(text))) {
    out.push(
      type === "freeze"
        ? { start: Number(match[1]), duration: Number(match[2]) }
        : {
            start: Number(match[1]),
            end: Number(match[2]),
            duration: Number(match[3]),
          }
    );
  }
  return out;
}

async function analyzeMedia(ffmpegBinary, videoPath, hasAudio) {
  const videoResult = await command(ffmpegBinary, [
    "-hide_banner",
    "-nostats",
    "-i",
    videoPath,
    "-vf",
    "blackdetect=d=0.5:pix_th=0.10,freezedetect=n=-50dB:d=2",
    "-an",
    "-f",
    "null",
    "-",
  ]);
  let audioResult = { stderr: "" };
  if (hasAudio) {
    audioResult = await command(ffmpegBinary, [
      "-hide_banner",
      "-nostats",
      "-i",
      videoPath,
      "-af",
      "silencedetect=n=-45dB:d=2,volumedetect",
      "-vn",
      "-f",
      "null",
      "-",
    ]);
  }
  const meanVolume = Number(
    audioResult.stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i)?.[1]
  );
  const maxVolume = Number(
    audioResult.stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/i)?.[1]
  );
  return {
    black: parseIntervals(videoResult.stderr, "black"),
    freeze: parseIntervals(videoResult.stderr, "freeze"),
    silence: parseIntervals(audioResult.stderr, "silence"),
    meanVolume: Number.isFinite(meanVolume) ? meanVolume : null,
    maxVolume: Number.isFinite(maxVolume) ? maxVolume : null,
  };
}

function inspectFaststart(videoPath) {
  const fd = fs.openSync(videoPath, "r");
  try {
    const size = Math.min(fs.statSync(videoPath).size, 2 * 1024 * 1024);
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0);
    const text = buffer.toString("latin1");
    const moov = text.indexOf("moov");
    const mdat = text.indexOf("mdat");
    return { faststart: moov >= 0 && (mdat < 0 || moov < mdat), moov, mdat };
  } finally {
    fs.closeSync(fd);
  }
}

export function resolveQualityGateVideo(projectDir, requestedName = "") {
  const outputDir = path.join(projectDir, "OUTPUT");
  if (!fs.existsSync(outputDir)) return null;
  const requested = path.basename(String(requestedName || "").trim());
  if (requested) {
    const searchRoots = [
      path.join(outputDir, "qanat_persa_video_final"),
      outputDir,
    ];
    for (const root of searchRoots) {
      if (!fs.existsSync(root)) continue;
      const exact = path.join(root, requested);
      if (
        fs.existsSync(exact) &&
        path.extname(exact).toLowerCase() === ".mp4"
      ) {
        return exact;
      }
      const pending = [root];
      while (pending.length) {
        const current = pending.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const candidate = path.join(current, entry.name);
          if (entry.isDirectory()) pending.push(candidate);
          else if (
            entry.isFile() &&
            entry.name.toLowerCase() === requested.toLowerCase()
          ) {
            return candidate;
          }
        }
      }
    }
  }
  const preferred = [
    "video_final_60fps.mp4",
    "video_final.mp4",
    "qanat_persa_video_final.mp4",
  ];
  const videos = [];
  const pending = [
    path.join(outputDir, "qanat_persa_video_final"),
    outputDir,
  ].filter(
    (root, index, all) => fs.existsSync(root) && all.indexOf(root) === index
  );
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp4")) {
        videos.push({
          path: candidate,
          name: entry.name,
          mtime: fs.statSync(candidate).mtimeMs,
        });
      }
    }
  }
  for (const name of preferred) {
    const match = videos.find((video) => video.name === name);
    if (match) return match.path;
  }
  videos.sort((a, b) => b.mtime - a.mtime);
  return videos[0]?.path || null;
}

function loadPreviousProjects(projectsRoot, projectDir) {
  return listSiblingProjects(projectsRoot, projectDir).map(({ dir }) => {
    const storyboard = readJson(path.join(dir, "storyboard.json"));
    const config = readJson(path.join(dir, "config_qanat.json"));
    return {
      name: path.basename(dir),
      narration: getNarration(storyboard, config),
      title: getYoutubeMetadata(storyboard, config).title,
      assets: collectAssets(config)
        .map((item) =>
          path.basename(String(item.asset || item.file || "")).toLowerCase()
        )
        .filter(Boolean),
    };
  });
}

function scoreChecks(checks) {
  const penalties = { error: 18, warning: 6, pass: 0, info: 0 };
  return round(
    clamp(
      100 - checks.reduce((sum, item) => sum + (penalties[item.status] || 0), 0)
    )
  );
}

function parseSceneDurations(storyboard, config) {
  const values = [];
  for (const prompt of storyboard?.visual_prompts || []) {
    const value = Number(String(prompt?.duration || "").match(/[\d.]+/)?.[0]);
    if (Number.isFinite(value)) values.push(value);
  }
  if (!values.length) {
    for (const item of collectAssets(config)) {
      const value = Number(item.fixed || item.duration || 0);
      if (value > 0) values.push(value);
    }
  }
  return values;
}

export async function runYoutubeQualityGate({
  workspaceDir,
  projectsRoot,
  projectDir,
  videoName = "",
}) {
  const generatedAt = new Date().toISOString();
  const configPath = path.join(projectDir, "config_qanat.json");
  const storyboardPath = path.join(projectDir, "storyboard.json");
  const config = readJson(configPath);
  const storyboard = readJson(storyboardPath);
  const metadata = getYoutubeMetadata(storyboard, config);
  const narration = getNarration(storyboard, config);
  const assets = collectAssets(config);
  const sources = collectUrls(storyboard);
  const provenanceCount = assets.filter(
    (item) =>
      item.source_url ||
      item.sourceUrl ||
      item.provider ||
      item.license ||
      item.rights ||
      /(_generated_|openai|gemini|veo|flux|midjourney)/i.test(
        String(item.asset || "")
      )
  ).length;
  const checks = [];
  const videoPath = resolveQualityGateVideo(projectDir, videoName);
  if (!videoPath) {
    checks.push(
      check(
        "video.missing",
        "technical",
        "error",
        "Nenhum MP4 renderizado foi encontrado.",
        "Renderize o vídeo final antes de publicar."
      )
    );
  }

  let video = null;
  let technicalScore = 0;
  if (videoPath) {
    const stat = fs.statSync(videoPath);
    video = {
      path: videoPath,
      name: path.basename(videoPath),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
    try {
      const { data, ffmpeg } = await probeVideo(videoPath);
      const videoStream = data.streams?.find(
        (stream) => stream.codec_type === "video"
      );
      const audioStream = data.streams?.find(
        (stream) => stream.codec_type === "audio"
      );
      const duration = parseDuration(
        data.format?.duration || videoStream?.duration
      );
      const width = Number(videoStream?.width || 0);
      const height = Number(videoStream?.height || 0);
      const fps = parseRate(
        videoStream?.avg_frame_rate || videoStream?.r_frame_rate
      );
      Object.assign(video, {
        duration: round(duration, 2),
        width,
        height,
        fps: round(fps, 2),
        videoCodec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        pixelFormat: videoStream?.pix_fmt || null,
        sampleRate: Number(audioStream?.sample_rate || 0) || null,
      });

      checks.push(
        check(
          "video.playable",
          "technical",
          videoStream && duration > 0 ? "pass" : "error",
          videoStream && duration > 0
            ? `MP4 reproduzível, duração ${round(duration)}s.`
            : "O arquivo não contém vídeo reproduzível.",
          "Renderize novamente o arquivo final."
        )
      );
      checks.push(
        check(
          "video.resolution",
          "technical",
          Math.min(width, height) >= 720
            ? "pass"
            : Math.min(width, height) >= 480
              ? "warning"
              : "error",
          `Resolução detectada: ${width}×${height}.`,
          "Exporte em pelo menos 1280×720 ou 720×1280."
        )
      );
      checks.push(
        check(
          "video.pixel-format",
          "technical",
          /yuvj?420p/i.test(videoStream?.pix_fmt || "") ? "pass" : "warning",
          `Formato de pixel: ${videoStream?.pix_fmt || "desconhecido"}.`,
          "Use yuv420p para máxima compatibilidade."
        )
      );
      checks.push(
        check(
          "video.progressive",
          "technical",
          !videoStream?.field_order ||
            /progressive|unknown/i.test(videoStream.field_order)
            ? "pass"
            : "warning",
          `Varredura: ${videoStream?.field_order || "progressiva/indefinida"}.`,
          "Exporte com varredura progressiva."
        )
      );
      checks.push(
        check(
          "audio.present",
          "technical",
          audioStream ? "pass" : "error",
          audioStream
            ? `Áudio ${audioStream.codec_name || ""} ${audioStream.sample_rate || ""} Hz.`
            : "Nenhuma faixa de áudio foi encontrada.",
          "Inclua a mixagem final de narração, música e efeitos."
        )
      );
      const faststart = inspectFaststart(videoPath);
      checks.push(
        check(
          "video.faststart",
          "technical",
          faststart.faststart ? "pass" : "warning",
          faststart.faststart
            ? "MP4 otimizado para início rápido."
            : "O índice MP4 parece estar no fim do arquivo.",
          "Aplique faststart ao MP4 final."
        )
      );
      const media = await analyzeMedia(ffmpeg, videoPath, Boolean(audioStream));
      const blackDuration = media.black.reduce(
        (sum, item) => sum + item.duration,
        0
      );
      const freezeDuration = media.freeze.reduce(
        (sum, item) => sum + item.duration,
        0
      );
      const silenceDuration = media.silence.reduce(
        (sum, item) => sum + item.duration,
        0
      );
      checks.push(
        check(
          "video.black-frames",
          "technical",
          blackDuration > Math.max(2, duration * 0.05)
            ? "error"
            : blackDuration > duration * 0.01
              ? "warning"
              : "pass",
          `Quadros pretos acumulados: ${round(blackDuration)}s.`,
          "Remova trechos pretos involuntários.",
          { intervals: media.black.slice(0, 20) }
        )
      );
      checks.push(
        check(
          "video.freeze",
          "technical",
          freezeDuration > Math.max(8, duration * 0.15)
            ? "error"
            : freezeDuration > Math.max(3, duration * 0.05)
              ? "warning"
              : "pass",
          `Imagem congelada detectada: ${round(freezeDuration)}s.`,
          "Substitua cenas estáticas longas ou aplique movimento editorial.",
          { intervals: media.freeze.slice(0, 20) }
        )
      );
      checks.push(
        check(
          "audio.silence",
          "technical",
          silenceDuration > Math.max(10, duration * 0.25)
            ? "error"
            : silenceDuration > Math.max(4, duration * 0.1)
              ? "warning"
              : "pass",
          `Silêncio acumulado: ${round(silenceDuration)}s.`,
          "Revise falhas de narração e mixagem.",
          { intervals: media.silence.slice(0, 20) }
        )
      );
      checks.push(
        check(
          "audio.level",
          "technical",
          media.meanVolume == null
            ? "warning"
            : media.meanVolume < -32 || (media.maxVolume ?? -99) >= 0
              ? "error"
              : media.meanVolume < -26 || (media.maxVolume ?? -99) > -0.2
                ? "warning"
                : "pass",
          `Volume médio ${media.meanVolume ?? "?"} dB; pico ${media.maxVolume ?? "?"} dB.`,
          "Normalize a mixagem e evite clipping."
        )
      );
      const expectedAspect = String(
        config.aspect_ratio ||
          storyboard?.visual_prompts?.[0]?.aspect_ratio ||
          ""
      );
      const actualVertical = height > width;
      if (expectedAspect) {
        const expectedVertical = expectedAspect === "9:16";
        checks.push(
          check(
            "video.orientation",
            "technical",
            expectedVertical === actualVertical ? "pass" : "error",
            `Orientação renderizada ${actualVertical ? "9:16" : "16:9"}; projeto ${expectedAspect}.`,
            "Renderize novamente na orientação escolhida."
          )
        );
      }
      technicalScore = scoreChecks(
        checks.filter((item) => item.category === "technical")
      );
    } catch (error) {
      checks.push(
        check(
          "video.probe",
          "technical",
          "error",
          `Falha ao analisar o MP4: ${error.message}`,
          "Verifique o FFmpeg e renderize novamente."
        )
      );
      technicalScore = scoreChecks(
        checks.filter((item) => item.category === "technical")
      );
    }
  }

  const previousProjects = loadPreviousProjects(projectsRoot, projectDir);
  const originality = assessOriginality({
    narration,
    title: metadata.title,
    assets,
    previousProjects,
    sourceCount: sources.size,
  });
  checks.push(
    check(
      "originality.narration",
      "originality",
      originality.maxNarration.score >= 0.82
        ? "error"
        : originality.maxNarration.score >= 0.65
          ? "warning"
          : "pass",
      originality.maxNarration.project
        ? `Maior semelhança de narração: ${Math.round(originality.maxNarration.score * 100)}% com ${originality.maxNarration.project}.`
        : "Nenhum projeto anterior comparável.",
      "Reescreva tese, exemplos, ordem dos argumentos e conclusão."
    )
  );
  checks.push(
    check(
      "originality.assets",
      "originality",
      originality.maxAssets.score >= 0.75 ? "warning" : "pass",
      originality.maxAssets.project
        ? `Maior repetição exata de assets: ${Math.round(originality.maxAssets.score * 100)}%.`
        : "Sem repetição relevante de assets.",
      "Troque imagens e vídeos repetidos por material específico desta narrativa."
    )
  );
  checks.push(
    check(
      "originality.sources",
      "originality",
      sources.size ? "pass" : "warning",
      sources.size
        ? `${sources.size} fonte(s) ou URL(s) registradas.`
        : "Nenhuma fonte verificável foi registrada no storyboard.",
      "Registre as fontes factuais e a procedência dos assets."
    )
  );

  const retention = assessRetention({
    title: metadata.title,
    narration,
    sceneDurations: parseSceneDurations(storyboard, config),
  });
  checks.push(
    check(
      "retention.promise",
      "retention",
      retention.promiseOverlap >= 0.25 ? "pass" : "warning",
      `Correspondência entre promessa do título e abertura: ${Math.round(retention.promiseOverlap * 100)}%.`,
      "Entregue a promessa central nos primeiros segundos."
    )
  );
  checks.push(
    check(
      "retention.hook",
      "retention",
      retention.vagueOpening
        ? "warning"
        : retention.concreteHook
          ? "pass"
          : "warning",
      retention.vagueOpening
        ? "A abertura começa com saudação ou introdução genérica."
        : retention.concreteHook
          ? "A abertura contém um gancho concreto."
          : "O gancho inicial parece pouco específico.",
      "Comece com conflito, descoberta, prova ou pergunta específica."
    )
  );
  checks.push(
    check(
      "retention.repetition",
      "retention",
      retention.repeatedPairs >= 3
        ? "warning"
        : retention.repeatedPairs
          ? "warning"
          : "pass",
      `${retention.repeatedPairs} par(es) de frases muito semelhantes.`,
      "Remova redundâncias e faça cada bloco avançar a história."
    )
  );
  checks.push(
    check(
      "retention.visual-rhythm",
      "retention",
      retention.maxScene > 15
        ? "warning"
        : retention.maxScene > 10
          ? "warning"
          : "pass",
      `Maior cena planejada: ${retention.maxScene || "?"}s; média ${retention.averageScene || "?"}s.`,
      "Inclua mudanças visuais motivadas pela narração."
    )
  );

  const policy = assessMetadataAndPolicy({
    metadata,
    narration,
    assetCount: assets.length,
    provenanceCount,
    sourceCount: sources.size,
    isShort:
      config.video_format === "SHORTS" ||
      config.aspect_ratio === "9:16" ||
      (video ? video.height > video.width : false),
  });
  checks.push(
    check(
      "metadata.title",
      "metadata",
      metadata.title && metadata.title.length <= 100 ? "pass" : "error",
      metadata.title
        ? `Título com ${metadata.title.length} caracteres.`
        : "Título do YouTube ausente.",
      "Defina um título fiel ao conteúdo com até 100 caracteres."
    )
  );
  checks.push(
    check(
      "metadata.description",
      "metadata",
      metadata.description ? "pass" : "warning",
      metadata.description
        ? `Descrição com ${metadata.description.length} caracteres.`
        : "Descrição ausente.",
      "Adicione contexto, fontes e resumo do vídeo."
    )
  );
  checks.push(
    check(
      "policy.synthetic-disclosure",
      "monetization",
      metadata.containsSyntheticMedia ? "pass" : "error",
      metadata.containsSyntheticMedia
        ? "Uso de mídia sintética marcado para declaração."
        : "A declaração de mídia sintética está desativada.",
      "Ative a declaração de mídia sintética."
    )
  );
  checks.push(
    check(
      "policy.sensitive-content",
      "monetization",
      policy.sensitiveInTitle && !policy.educationalContext
        ? "error"
        : policy.sensitiveInBody > 2
          ? "warning"
          : "pass",
      `Termos sensíveis: ${policy.sensitiveInTitle} no título e ${policy.sensitiveInBody} no conteúdo.`,
      "Use contexto educacional claro e evite exploração sensacionalista."
    )
  );
  checks.push(
    check(
      "policy.provenance",
      "monetization",
      assets.length && policy.provenanceCoverage < 0.25 ? "warning" : "pass",
      `Procedência registrada em ${Math.round(policy.provenanceCoverage * 100)}% dos assets.`,
      "Registre fonte, licença ou origem gerada de cada asset."
    )
  );
  const suspiciousAssets = assets.filter((item) =>
    /(watermark|preview|sample|shutterstock|alamy|getty)/i.test(
      String(item.asset || item.file || "")
    )
  );
  checks.push(
    check(
      "policy.watermark-heuristic",
      "monetization",
      suspiciousAssets.length ? "error" : "pass",
      suspiciousAssets.length
        ? `${suspiciousAssets.length} asset(s) com nome indicativo de prévia ou marca-d'água.`
        : "Nenhum nome de asset indicou prévia com marca-d'água.",
      "Use apenas mídia própria, licenciada ou gerada sem marca-d'água."
    )
  );

  const dimensionScores = {
    technical: technicalScore,
    originality: originality.score,
    retention: retention.score,
    metadata: policy.score,
    monetization: scoreChecks(
      checks.filter((item) => item.category === "monetization")
    ),
  };
  const blocking = checks.filter((item) => item.status === "error");
  const warnings = checks.filter((item) => item.status === "warning");
  const overallScore = round(
    dimensionScores.technical * 0.34 +
      dimensionScores.originality * 0.24 +
      dimensionScores.retention * 0.22 +
      dimensionScores.metadata * 0.1 +
      dimensionScores.monetization * 0.1
  );
  const report = {
    version: 1,
    generatedAt,
    project: path.basename(projectDir),
    video,
    ready: blocking.length === 0 && Boolean(video),
    score: overallScore,
    blockingCount: blocking.length,
    warningCount: warnings.length,
    dimensions: dimensionScores,
    checks,
    recommendations: checks
      .filter((item) => item.status === "error" || item.status === "warning")
      .map((item) => item.fix)
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index),
    safePublish: {
      initialPrivacy: "private",
      awaitYoutubeChecksBeforePublic: true,
      message:
        "O primeiro envio deve permanecer privado até os checks de direitos autorais e adequação do YouTube terminarem.",
    },
    learning: readJson(path.join(projectDir, OUTCOMES_NAME), { outcomes: [] }),
    context: {
      workspaceDir,
      comparedProjects: previousProjects.length,
      sourceCount: sources.size,
      assetCount: assets.length,
    },
  };
  writeJson(path.join(projectDir, REPORT_NAME), report);
  return report;
}

export function readYoutubeQualityGate(projectDir) {
  return readJson(path.join(projectDir, REPORT_NAME), null);
}

export function assertYoutubeQualityGateReady(projectDir, videoPath = null) {
  const report = readYoutubeQualityGate(projectDir);
  const stat =
    videoPath && fs.existsSync(videoPath) ? fs.statSync(videoPath) : null;
  const fresh =
    report?.video &&
    (!videoPath ||
      (path.resolve(report.video.path).toLowerCase() ===
        path.resolve(videoPath).toLowerCase() &&
        Number(report.video.size) === Number(stat?.size) &&
        Math.abs(Number(report.video.mtimeMs) - Number(stat?.mtimeMs)) < 2));
  if (!report?.ready || !fresh) {
    const error = new Error(
      !fresh
        ? "O Quality Gate não corresponde ao vídeo selecionado ou o arquivo mudou."
        : `Quality Gate bloqueado por ${report?.blockingCount || 1} problema(s).`
    );
    error.code = "YOUTUBE_QUALITY_GATE_BLOCKED";
    error.report = report;
    throw error;
  }
  return report;
}

export function recordYoutubeQualityOutcome(projectDir, payload = {}) {
  const filePath = path.join(projectDir, OUTCOMES_NAME);
  const current = readJson(filePath, { outcomes: [] });
  const outcome = {
    recordedAt: new Date().toISOString(),
    videoId: String(payload.videoId || "").trim() || null,
    ctr: Number(payload.ctr) || null,
    averageViewDuration: Number(payload.averageViewDuration) || null,
    averagePercentageViewed: Number(payload.averagePercentageViewed) || null,
    retention30: Number(payload.retention30) || null,
    likes: Number(payload.likes) || null,
    comments: Number(payload.comments) || null,
    dislikes: Number(payload.dislikes) || null,
    qualityScore: Number(payload.qualityScore) || null,
  };
  current.outcomes = [outcome, ...(current.outcomes || [])].slice(0, 100);
  writeJson(filePath, current);
  return current;
}

function backupProjectConfig(projectDir, config) {
  const backupDir = path.join(projectDir, ".quality-gate-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `config_qanat-${stamp}.json`);
  writeJson(backupPath, config);
  return backupPath;
}

function cleanAiText(value, maxLength) {
  return String(value || "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function canonicalRepairVideo(projectDir, videoName, reportVideoPath) {
  const safeName = path.basename(String(videoName || reportVideoPath || ""));
  const preferred = path.join(
    projectDir,
    "OUTPUT",
    "qanat_persa_video_final",
    safeName
  );
  if (safeName && fs.existsSync(preferred)) return preferred;
  if (reportVideoPath && fs.existsSync(reportVideoPath)) return reportVideoPath;
  return resolveQualityGateVideo(projectDir, safeName);
}

function edgeBlackTrim(checkItem, duration) {
  const intervals = checkItem?.details?.intervals || [];
  let start = 0;
  let end = duration;
  for (const interval of intervals) {
    if (Number(interval.start) <= 0.15 && Number(interval.duration) <= 5) {
      start = Math.max(start, Number(interval.end) || 0);
    }
    if (
      duration > 0 &&
      Number(interval.end) >= duration - 0.15 &&
      Number(interval.duration) <= 5
    ) {
      end = Math.min(end, Number(interval.start) || duration);
    }
  }
  return { start, end, changed: start > 0 || end < duration };
}

async function repairTechnicalVideo({
  projectDir,
  videoName,
  report,
  expectedAspect,
}) {
  const issues = report.checks.filter(
    (item) =>
      item.category === "technical" &&
      (item.status === "error" || item.status === "warning")
  );
  const repairableIds = new Set([
    "video.pixel-format",
    "video.resolution",
    // NÃO inclui video.orientation — mudança de orientação (ex: 16:9 → 9:16)
    // requer re-render completo no Remotion; scale+pad via FFmpeg causa efeito
    // "selo postal" que destrói o conteúdo visual.
    "video.progressive",
    "video.faststart",
    "video.black-frames",
    "audio.level",
  ]);
  const repairable = issues.filter((item) => repairableIds.has(item.id));
  const deferred = issues
    .filter((item) => !repairableIds.has(item.id))
    .map((item) => ({
      id: item.id,
      message: `${item.message} Não é seguro inventar conteúdo ausente; requer nova edição/renderização.`,
    }));
  if (!repairable.length || !report.video) {
    return { changed: false, applied: [], deferred };
  }

  const source = canonicalRepairVideo(projectDir, videoName, report.video.path);
  if (!source || !fs.existsSync(source)) {
    return {
      changed: false,
      applied: [],
      deferred: [
        ...deferred,
        {
          id: "video.missing",
          message: "O arquivo de vídeo não foi localizado para reparo.",
        },
      ],
    };
  }
  const ff = getFfmpegStatus();
  if (!ff.binary) {
    return {
      changed: false,
      applied: [],
      deferred: [
        ...deferred,
        { id: "ffmpeg.missing", message: "FFmpeg não está disponível." },
      ],
    };
  }

  const ids = new Set(repairable.map((item) => item.id));
  const ext = path.extname(source);
  const temp = path.join(
    path.dirname(source),
    `${path.basename(source, ext)}.quality-fix-${Date.now()}${ext}`
  );
  const backupDir = path.join(projectDir, ".quality-gate-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(
    backupDir,
    `${path.basename(source, ext)}-before-quality-fix-${Date.now()}${ext}`
  );
  const args = ["-y"];
  const blackCheck = repairable.find(
    (item) => item.id === "video.black-frames"
  );
  const trim = edgeBlackTrim(blackCheck, Number(report.video.duration || 0));
  if (trim.changed) {
    args.push("-ss", String(round(trim.start, 3)));
    if (trim.end > trim.start) args.push("-to", String(round(trim.end, 3)));
  }
  args.push("-i", source);

  const videoFilters = [];
  if (ids.has("video.resolution")) {
    // Só corrige resolução baixa, NUNCA orientação (que requer re-render).
    // Preserva a orientação real do vídeo ao invés de forçar a do config.
    const actualVertical = report.video.height > report.video.width;
    const targetWidth = actualVertical ? 1080 : 1920;
    const targetHeight = actualVertical ? 1920 : 1080;
    videoFilters.push(
      `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
      `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black`
    );
  }
  if (videoFilters.length) args.push("-vf", videoFilters.join(","));
  if (ids.has("audio.level")) {
    args.push("-af", "loudnorm=I=-14:LRA=11:TP=-1.5");
  }
  args.push(
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    ids.has("audio.level") ? "aac" : "copy"
  );
  if (ids.has("audio.level")) args.push("-b:a", "192k");
  args.push("-movflags", "+faststart", temp);

  const result = await command(ff.binary, args, { timeoutMs: 1800000 });
  if (result.code !== 0 || !fs.existsSync(temp)) {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
      // ignore
    }
    throw new Error(
      `FFmpeg não conseguiu reparar o vídeo: ${result.stderr.slice(-800)}`
    );
  }
  const tempStat = fs.statSync(temp);
  const sourceSize = fs.statSync(source).size;
  if (
    tempStat.size < 32 * 1024 ||
    (sourceSize > 1024 * 1024 && tempStat.size < sourceSize * 0.05)
  ) {
    fs.unlinkSync(temp);
    throw new Error("O vídeo reparado ficou suspeitamente pequeno.");
  }
  await probeVideo(temp);

  try {
    fs.renameSync(source, backup);
    fs.renameSync(temp, source);
  } catch (error) {
    try {
      if (!fs.existsSync(source) && fs.existsSync(backup))
        fs.renameSync(backup, source);
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
      // Preserve backup if rollback cannot complete.
    }
    throw error;
  }

  const applied = repairable.map((item) => ({
    id: item.id,
    message:
      item.id === "audio.level"
        ? "Áudio normalizado para nível seguro de publicação."
        : item.id === "video.black-frames" && trim.changed
          ? "Trechos pretos das bordas foram removidos."
          : item.id === "video.resolution" || item.id === "video.orientation"
            ? "Resolução e orientação foram corrigidas sem distorcer o quadro."
            : item.id === "video.faststart"
              ? "MP4 reorganizado para carregamento rápido."
              : "Vídeo recodificado em H.264 progressivo e yuv420p.",
  }));
  return { changed: true, applied, deferred, backupPath: backup };
}

export async function autoFixYoutubeQualityGate({
  workspaceDir,
  projectsRoot,
  projectDir,
  videoName = "",
  fixWithAi,
}) {
  const before = await runYoutubeQualityGate({
    workspaceDir,
    projectsRoot,
    projectDir,
    videoName,
  });
  const configPath = path.join(projectDir, "config_qanat.json");
  const storyboard = readJson(path.join(projectDir, "storyboard.json"));
  const config = readJson(configPath);
  const narration = getNarration(storyboard, config);
  const currentMetadata = getYoutubeMetadata(storyboard, config);
  const problematicIds = new Set(
    before.checks
      .filter((item) => item.status === "error" || item.status === "warning")
      .map((item) => item.id)
  );
  const applied = [];
  const deferred = [];
  let changed = false;
  const technicalRepair = await repairTechnicalVideo({
    projectDir,
    videoName,
    report: before,
    expectedAspect: String(
      config.aspect_ratio || storyboard?.visual_prompts?.[0]?.aspect_ratio || ""
    ),
  });
  applied.push(...technicalRepair.applied);
  deferred.push(...technicalRepair.deferred);
  if (technicalRepair.changed) changed = true;

  config.upload_metadata ||= {};
  config.upload_metadata.youtube ||= {};
  const youtube = config.upload_metadata.youtube;

  if (!currentMetadata.containsSyntheticMedia) {
    youtube.contains_synthetic_media = true;
    applied.push({
      id: "policy.synthetic-disclosure",
      message: "Declaração de mídia sintética ativada.",
    });
    changed = true;
  }
  if (String(currentMetadata.privacy || "").toLowerCase() !== "private") {
    youtube.privacy = "private";
    applied.push({
      id: "safe-publish.private",
      message: "Privacidade inicial alterada para privado.",
    });
    changed = true;
  }

  const needsEditorialFix = [
    "retention.promise",
    "retention.hook",
    "metadata.title",
    "metadata.description",
  ].some((id) => problematicIds.has(id));

  if (needsEditorialFix && typeof fixWithAi === "function") {
    const firstNarration = String(narration)
      .split(/\s+/)
      .slice(0, 90)
      .join(" ");
    const prompt = `Você é um editor sênior de YouTube. Corrija SOMENTE a embalagem editorial de um vídeo já renderizado.

REGRAS:
- Não altere fatos, números ou promessas.
- O título deve corresponder claramente ao que é entregue nos primeiros segundos.
- Não invente conteúdo que não aparece na narração.
- Português brasileiro natural.
- Título com no máximo 100 caracteres.
- Descrição concisa, factual, com contexto e sem promessas falsas.
- Preserve hashtags úteis já existentes, no máximo 5.
- Retorne APENAS JSON válido neste formato:
{"title":"...","description":"...","reason":"..."}

Título atual:
${currentMetadata.title}

Descrição atual:
${currentMetadata.description}

Abertura real da narração:
${firstNarration}

Narração completa:
${narration}`;
    try {
      const ai = await fixWithAi({ projectDir, prompt });
      const title = cleanAiText(ai?.title, 100);
      const description = String(ai?.description || "")
        .trim()
        .slice(0, 5000);
      if (title && title !== currentMetadata.title) {
        youtube.title = title;
        applied.push({
          id: "ai.title",
          message: `Título alinhado pela IA: ${title}`,
        });
        changed = true;
      }
      if (description && description !== currentMetadata.description) {
        youtube.description = description;
        applied.push({
          id: "ai.description",
          message: "Descrição revisada pela IA para refletir o conteúdo real.",
        });
        changed = true;
      }
    } catch (error) {
      deferred.push({
        id: "ai.editorial",
        message: `A IA não conseguiu revisar os metadados: ${error.message}`,
      });
    }
  }

  const alreadyDeferred = new Set(deferred.map((item) => item.id));
  const requiresRender = before.checks.filter(
    (item) =>
      (item.status === "error" || item.status === "warning") &&
      ["retention.visual-rhythm"].includes(item.id) &&
      !alreadyDeferred.has(item.id)
  );
  for (const item of requiresRender) {
    deferred.push({
      id: item.id,
      message: `${item.message} Exige ajustar a edição e renderizar novamente.`,
    });
  }
  if (problematicIds.has("policy.provenance")) {
    deferred.push({
      id: "policy.provenance",
      message:
        "A procedência dos assets precisa de confirmação humana; a IA não pode inventar licença ou autoria.",
    });
  }
  if (problematicIds.has("policy.watermark-heuristic")) {
    deferred.push({
      id: "policy.watermark-heuristic",
      message:
        "Use o Removedor de Marca-d'água ou substitua o asset por mídia licenciada.",
    });
  }

  let backupPath = technicalRepair.backupPath || null;
  const configChanged = applied.some(
    (item) =>
      item.id === "policy.synthetic-disclosure" ||
      item.id === "safe-publish.private" ||
      item.id === "ai.title" ||
      item.id === "ai.description"
  );
  if (configChanged) {
    backupPath = backupProjectConfig(projectDir, readJson(configPath));
    writeJson(configPath, config);
  }

  const after = await runYoutubeQualityGate({
    workspaceDir,
    projectsRoot,
    projectDir,
    videoName,
  });
  return {
    success: true,
    changed,
    backupPath,
    applied,
    deferred,
    metadata: getYoutubeMetadata(storyboard, config),
    before: {
      score: before.score,
      blockingCount: before.blockingCount,
      warningCount: before.warningCount,
    },
    report: after,
  };
}
