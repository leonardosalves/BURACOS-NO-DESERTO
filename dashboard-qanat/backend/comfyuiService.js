import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { workflowUiToApi } from "./comfyuiWorkflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "../..");
const COMFYUI_ROOT = path.join(WORKSPACE_DIR, "tools", "comfyui");
const COMFYUI_DIR = path.join(COMFYUI_ROOT, "ComfyUI");
const CONFIG_PATH = path.join(COMFYUI_ROOT, "ltx_rtx4060_8gb.json");
const COMFYUI_PORT = 8188;
const COMFYUI_BASE = `http://127.0.0.1:${COMFYUI_PORT}`;

let comfyProcess = null;
const activeJobs = new Map();
const wsByClient = new Map();

export const LTX_GENERATION_OPTIONS = {
  aspect_ratios: [
    {
      id: "16:9",
      label: "16:9 Paisagem",
      hint: "YouTube, TV, desktop",
      sizes: {
        "8gb": { width: 640, height: 384, frames: 17 },
        fast: { width: 512, height: 288, frames: 9 },
      },
    },
    {
      id: "9:16",
      label: "9:16 Vertical",
      hint: "Shorts, Reels, TikTok",
      sizes: {
        "8gb": { width: 384, height: 640, frames: 17 },
        fast: { width: 288, height: 512, frames: 9 },
      },
    },
    {
      id: "1:1",
      label: "1:1 Quadrado",
      hint: "Instagram, feed social",
      sizes: {
        "8gb": { width: 512, height: 512, frames: 17 },
        fast: { width: 384, height: 384, frames: 9 },
      },
    },
    {
      id: "4:3",
      label: "4:3 Clássico",
      hint: "Apresentações, slide",
      sizes: {
        "8gb": { width: 512, height: 384, frames: 17 },
        fast: { width: 448, height: 352, frames: 9 },
      },
    },
    {
      id: "3:4",
      label: "3:4 Retrato",
      hint: "Stories, posts verticais",
      sizes: {
        "8gb": { width: 384, height: 512, frames: 17 },
        fast: { width: 320, height: 416, frames: 9 },
      },
    },
    {
      id: "21:9",
      label: "21:9 Ultrawide",
      hint: "Cinemático / banner",
      sizes: {
        "8gb": { width: 672, height: 288, frames: 17 },
        fast: { width: 576, height: 256, frames: 9 },
      },
    },
  ],
  quality_tiers: [
    { id: "8gb", label: "8GB otimizado" },
    { id: "fast", label: "Rápido (menos VRAM)" },
  ],
  presets: [
    { id: "8gb_default", label: "8GB padrão (640×384, 17f)", width: 640, height: 384, frames: 17, aspect_ratio: "16:9" },
    { id: "fast", label: "Rápido (512×288, 9f)", width: 512, height: 288, frames: 9, aspect_ratio: "16:9" },
    { id: "balanced", label: "Equilibrado (640×384, 25f)", width: 640, height: 384, frames: 25, aspect_ratio: "16:9" },
  ],
  frame_options: [9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 121],
  fps: 24,
  duration_seconds: { min: 0.4, max: 5, step: 0.1, default: 0.7 },
  max_frames_8gb: 121,
  formats: ["auto", "mp4"],
  codecs: ["auto", "h264"],
  upscale_options: [
    { id: "none", label: "Sem upscale (rápido, menos VRAM)", scale: 1 },
    { id: "ltx-2-spatial-upscaler-x2-1.0.safetensors", label: "Spatial 2x (padrão LTX)", scale: 0.5 },
  ],
  notes: "LTX exige largura/altura múltiplas de 32 e frames no formato 8n+1. Duração ≈ frames ÷ FPS (padrão 24).",
};

export function snapLtxFrames(rawFrames, { min = 9, max = 121 } = {}) {
  const clamped = Math.min(max, Math.max(min, Math.round(Number(rawFrames) || min)));
  const bucket = Math.round((clamped - 1) / 8);
  return bucket * 8 + 1;
}

export function secondsToLtxFrames(seconds, fps = 24, maxFrames = 121) {
  return snapLtxFrames(Number(seconds) * fps, { max: maxFrames });
}

export function ltxFramesToSeconds(frames, fps = 24) {
  return Math.round((Number(frames) / fps) * 100) / 100;
}

export function resolveLtxFrames({ frames, duration_seconds, fps, max_frames }) {
  const cfg = readConfig();
  const resolvedFps = Number(fps) || cfg?.ltx?.fps || LTX_GENERATION_OPTIONS.fps;
  const maxFrames = Number(max_frames) || LTX_GENERATION_OPTIONS.max_frames_8gb;

  if (duration_seconds != null && Number.isFinite(Number(duration_seconds))) {
    return {
      frames: secondsToLtxFrames(duration_seconds, resolvedFps, maxFrames),
      fps: resolvedFps,
      duration_seconds: Number(duration_seconds),
    };
  }

  const fallback = cfg?.ltx?.frames || 17;
  const raw = Number.isFinite(Number(frames)) ? Number(frames) : fallback;
  const snapped = snapLtxFrames(raw, { max: maxFrames });
  return {
    frames: snapped,
    fps: resolvedFps,
    duration_seconds: ltxFramesToSeconds(snapped, resolvedFps),
  };
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}

function scanModelFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => extensions.some((ext) => name.toLowerCase().endsWith(ext)))
    .map((name) => {
      const fullPath = path.join(dir, name);
      let size_mb = null;
      try {
        size_mb = Math.round(fs.statSync(fullPath).size / (1024 * 1024));
      } catch { /* ignore */ }
      return { id: name, label: name, size_mb };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function listAvailableLtxModels() {
  const cfg = readConfig();
  const modelsDir = path.join(COMFYUI_DIR, "models");
  const gguf = scanModelFiles(path.join(modelsDir, "diffusion_models"), [".gguf"]);
  const loras = scanModelFiles(path.join(modelsDir, "loras"), [".safetensors"]);
  const upscalers = scanModelFiles(path.join(modelsDir, "latent_upscale_models"), [".safetensors"]);

  const upscaleOptions = LTX_GENERATION_OPTIONS.upscale_options.map((opt) => {
    if (opt.id === "none") return { ...opt, installed: true };
    const match = upscalers.find((u) => u.id === opt.id);
    return { ...opt, installed: Boolean(match), size_mb: match?.size_mb ?? null };
  });

  return {
    gguf,
    loras,
    upscalers,
    upscale_options: upscaleOptions,
    defaults: {
      model_gguf: cfg?.ltx?.model_gguf || gguf[0]?.id || null,
      lora: "ltx-2-19b-distilled-lora-384.safetensors",
      upscale: "ltx-2-spatial-upscaler-x2-1.0.safetensors",
    },
  };
}

export function buildComfyuiOutputUrl({ filename, subfolder = "" }) {
  const params = new URLSearchParams({ filename });
  if (subfolder) params.set("subfolder", subfolder);
  return `/api/comfyui/output?${params.toString()}`;
}

export function resolveComfyuiOutputFile({ filename, subfolder = "" }) {
  if (!filename || filename.includes("..") || subfolder.includes("..")) return null;
  const outputDir = path.join(COMFYUI_DIR, "output");
  const filePath = path.join(outputDir, subfolder, filename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(outputDir))) return null;
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

function fileReady(filePath, minBytes = 50 * 1024 * 1024) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size >= minBytes;
  } catch {
    return false;
  }
}

export function getComfyuiPaths() {
  const cfg = readConfig() || {};
  const ltx = cfg.ltx || {};
  return {
    root: COMFYUI_ROOT,
    comfyDir: COMFYUI_DIR,
    configPath: CONFIG_PATH,
    workflowsDir: path.join(COMFYUI_ROOT, "workflows"),
    outputDir: path.join(COMFYUI_DIR, "output"),
    models: {
      gguf: path.join(COMFYUI_DIR, "models", "diffusion_models", ltx.model_gguf || ""),
      videoVae: path.join(COMFYUI_DIR, "models", "vae", ltx.video_vae || ""),
      audioVae: path.join(COMFYUI_DIR, "models", "vae", ltx.audio_vae || ""),
      embeddings: path.join(COMFYUI_DIR, "models", "text_encoders", ltx.embeddings_connector || ""),
      gemma: path.join(COMFYUI_DIR, "models", "text_encoders", ltx.text_encoder || ""),
    },
  };
}

export async function getComfyuiStatus() {
  const paths = getComfyuiPaths();
  const cfg = readConfig();
  const installed = fs.existsSync(path.join(COMFYUI_DIR, "main.py"));
  const venvOk = fs.existsSync(path.join(COMFYUI_DIR, "venv", "Scripts", "python.exe"));
  const ggufOk = fileReady(paths.models.gguf, 8 * 1024 * 1024 * 1024);
  const vaeOk = fileReady(paths.models.videoVae, 100 * 1024 * 1024);
  const audioVaeOk = fileReady(paths.models.audioVae, 10 * 1024 * 1024);
  const embedOk = fileReady(paths.models.embeddings, 500 * 1024 * 1024);
  const gemmaOk = fileReady(paths.models.gemma, 500 * 1024 * 1024);
  const modelsReady = ggufOk && vaeOk && audioVaeOk && embedOk && gemmaOk;
  const workflowT2v = path.join(COMFYUI_ROOT, "workflows", cfg?.ltx?.workflow_t2v || "LTX2_T2V_GGUF.json");
  const apiUp = await isComfyuiApiUp();

  return {
    installed,
    venv_ok: venvOk,
    running: apiUp || (!!comfyProcess && !comfyProcess.killed),
    port: COMFYUI_PORT,
    profile: cfg?.profile || "rtx_4060_ti_8gb",
    config: cfg?.ltx || null,
    models: {
      gguf: ggufOk,
      video_vae: vaeOk,
      audio_vae: audioVaeOk,
      embeddings: embedOk,
      gemma: gemmaOk,
      ready: modelsReady,
    },
    workflow_t2v: fs.existsSync(workflowT2v),
    generation_options: LTX_GENERATION_OPTIONS,
    available_models: listAvailableLtxModels(),
    paths: {
      root: COMFYUI_ROOT,
      comfyui_output: path.join(COMFYUI_DIR, "output"),
      ui: `${COMFYUI_BASE}/`,
    },
  };
}

async function isComfyuiApiUp() {
  try {
    const res = await fetch(`${COMFYUI_BASE}/system_stats`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startComfyui() {
  const status = await getComfyuiStatus();
  if (!status.installed) throw new Error("ComfyUI não instalado. Rode a instalação primeiro.");
  if (await isComfyuiApiUp()) return { started: false, message: "ComfyUI já está rodando.", url: `${COMFYUI_BASE}/` };

  const pythonExe = path.join(COMFYUI_DIR, "venv", "Scripts", "python.exe");
  const mainPy = path.join(COMFYUI_DIR, "main.py");
  const args = [
    mainPy,
    "--listen", "127.0.0.1",
    "--port", String(COMFYUI_PORT),
    "--lowvram",
    "--reserve-vram", "1024",
    "--preview-method", "auto",
  ];

  comfyProcess = spawn(pythonExe, args, {
    cwd: COMFYUI_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  comfyProcess.stdout?.on("data", (d) => console.log(`[ComfyUI] ${d.toString().trim()}`));
  comfyProcess.stderr?.on("data", (d) => console.warn(`[ComfyUI] ${d.toString().trim()}`));
  comfyProcess.on("exit", () => { comfyProcess = null; });

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isComfyuiApiUp()) {
      return { started: true, message: "ComfyUI iniciado (modo lowvram 8GB).", url: `${COMFYUI_BASE}/` };
    }
  }
  throw new Error("ComfyUI não respondeu em 60s. Verifique o console.");
}

export function stopComfyui() {
  if (comfyProcess && !comfyProcess.killed) {
    comfyProcess.kill("SIGTERM");
    comfyProcess = null;
    return { stopped: true };
  }
  return { stopped: false, message: "ComfyUI não estava rodando pelo Lumiera." };
}

export function runComfyuiInstall(onLog) {
  return new Promise((resolve, reject) => {
    const bat = path.join(COMFYUI_ROOT, "install_comfyui_ltx.bat");
    if (!fs.existsSync(bat)) return reject(new Error("install_comfyui_ltx.bat não encontrado."));
    const child = spawn("cmd.exe", ["/c", bat, "silent"], { cwd: COMFYUI_ROOT, windowsHide: true });
    const log = (text) => { console.log(`[ComfyUI Install] ${text}`); onLog?.(text); };
    child.stdout?.on("data", (d) => log(d.toString()));
    child.stderr?.on("data", (d) => log(d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve({ success: true });
      else reject(new Error(`Instalação terminou com código ${code}`));
    });
  });
}

export function runComfyuiModelDownload(onLog) {
  return new Promise((resolve, reject) => {
    const pythonExe = path.join(COMFYUI_DIR, "venv", "Scripts", "python.exe");
    const script = path.join(COMFYUI_ROOT, "download_ltx_models.py");
    if (!fs.existsSync(pythonExe)) return reject(new Error("ComfyUI venv não encontrado. Instale primeiro."));
    const child = spawn(pythonExe, [script], { cwd: COMFYUI_ROOT, windowsHide: true });
    const log = (text) => { console.log(`[LTX Download] ${text}`); onLog?.(text); };
    child.stdout?.on("data", (d) => log(d.toString()));
    child.stderr?.on("data", (d) => log(d.toString()));
    child.on("close", async (code) => {
      const status = await getComfyuiStatus();
      if (code === 0 || status.models.ready) resolve({ success: true, models: status.models });
      else reject(new Error(`Download terminou com código ${code}`));
    });
  });
}

function formatComfyuiError(body) {
  try {
    const data = JSON.parse(body);
    if (data.error?.message) {
      const details = data.error.details ? ` — ${data.error.details}` : "";
      const nodeErrors = data.node_errors ? ` | nodes: ${JSON.stringify(data.node_errors).slice(0, 300)}` : "";
      return `${data.error.message}${details}${nodeErrors}`;
    }
    return JSON.stringify(data).slice(0, 500);
  } catch {
    return body.slice(0, 500);
  }
}

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function extractHistoryOutputs(historyPayload, promptId) {
  const entry = historyPayload?.[promptId];
  if (!entry?.outputs) return [];

  const files = [];
  for (const [nodeId, nodeOut] of Object.entries(entry.outputs)) {
    for (const items of Object.values(nodeOut)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item?.filename) continue;
        const subfolder = item.subfolder || "";
        files.push({
          node_id: nodeId,
          filename: item.filename,
          subfolder,
          type: item.type || "output",
          filepath: path.join(COMFYUI_DIR, "output", subfolder, item.filename),
          preview_url: buildComfyuiOutputUrl({ filename: item.filename, subfolder }),
        });
      }
    }
  }
  return files;
}

function computeJobPercent(job) {
  if (job.status === "completed") return 100;
  if (job.status === "queued") return Math.max(1, job.queue_position ? Math.max(1, 8 - job.queue_position * 2) : 3);
  const nodeShare = job.total_nodes > 0 ? (job.executed_nodes / job.total_nodes) * 88 : 10;
  const innerShare = job.node_max > 0 ? (job.node_value / job.node_max) * 10 : 0;
  return Math.min(99, Math.round(nodeShare + innerShare + (job.status === "running" ? 2 : 0)));
}

function ensureComfyuiWs(clientId) {
  if (wsByClient.has(clientId)) return wsByClient.get(clientId);

  const ws = new WebSocket(`ws://127.0.0.1:${COMFYUI_PORT}/ws?clientId=${encodeURIComponent(clientId)}`);
  wsByClient.set(clientId, ws);

  ws.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    const type = message?.type;
    const data = message?.data || {};
    const promptId = data.prompt_id;
    if (!promptId || !activeJobs.has(promptId)) return;

    const job = activeJobs.get(promptId);

    if (type === "execution_start") {
      job.status = "running";
      job.message = "Iniciando geração...";
    } else if (type === "executing") {
      if (data.node == null) {
        if (job.status !== "error") {
          job.status = "completed";
          job.percent = 100;
          job.message = "Finalizando...";
          finalizeJob(job).catch(() => {});
        }
        return;
      }
      if (job.current_node && job.current_node !== data.node) job.executed_nodes += 1;
      job.current_node = data.node;
      job.status = "running";
      job.message = `Processando nó ${data.display_node || data.node}...`;
      job.node_value = 0;
      job.node_max = 0;
    } else if (type === "progress") {
      job.status = "running";
      job.node_value = Number(data.value) || 0;
      job.node_max = Number(data.max) || 0;
      if (data.node) job.current_node = data.node;
      job.message = job.node_max > 0
        ? `Amostragem ${job.node_value}/${job.node_max}`
        : "Gerando...";
    } else if (type === "execution_error") {
      job.status = "error";
      job.error = data.exception_message || data.exception_type || "Erro na execução";
      job.message = job.error;
      job.percent = 0;
    } else if (type === "execution_success") {
      job.status = "completed";
      job.percent = 100;
      job.message = "Vídeo gerado.";
      finalizeJob(job).catch(() => {});
    }

    job.percent = computeJobPercent(job);
    job.updated_at = Date.now();
  };

  ws.onclose = () => wsByClient.delete(clientId);
  ws.onerror = () => wsByClient.delete(clientId);

  return ws;
}

async function refreshQueueState(promptId) {
  const job = activeJobs.get(promptId);
  if (!job || job.status === "completed" || job.status === "error") return;

  try {
    const res = await fetch(`${COMFYUI_BASE}/queue`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const data = await res.json();
    const pending = data.queue_pending || [];
    const running = data.queue_running || [];

    const runIdx = running.findIndex((item) => item[1] === promptId);
    if (runIdx >= 0) {
      job.status = "running";
      job.queue_position = 0;
      job.message = job.message || "Executando no ComfyUI...";
      return;
    }

    const pendingIdx = pending.findIndex((item) => item[1] === promptId);
    if (pendingIdx >= 0) {
      job.status = "queued";
      job.queue_position = pendingIdx + 1;
      job.message = `Na fila (posição ${job.queue_position})`;
      job.percent = computeJobPercent(job);
      return;
    }

    if (job.status === "queued") {
      const histRes = await fetch(`${COMFYUI_BASE}/history/${promptId}`, { signal: AbortSignal.timeout(3000) });
      if (histRes.ok) {
        const hist = await histRes.json();
        if (hist[promptId]) {
          job.status = "completed";
          job.percent = 100;
          job.message = "Vídeo gerado.";
          job.outputs = extractHistoryOutputs(hist, promptId);
        }
      }
    }
  } catch {
    // ignore polling errors
  }
}

async function finalizeJob(job) {
  try {
    const histRes = await fetch(`${COMFYUI_BASE}/history/${job.prompt_id}`);
    if (!histRes.ok) return;
    const hist = await histRes.json();
    job.outputs = extractHistoryOutputs(hist, job.prompt_id);
    if (job.outputs.length) job.message = `Pronto: ${job.outputs[0].filename}`;
  } catch {
    // ignore
  }
  job.updated_at = Date.now();
}

export function startJobTracking(promptId, clientId, meta = {}) {
  const job = {
    prompt_id: promptId,
    client_id: clientId,
    status: "queued",
    percent: 2,
    message: "Na fila do ComfyUI...",
    current_node: null,
    executed_nodes: 0,
    total_nodes: meta.totalNodes || 0,
    node_value: 0,
    node_max: 0,
    queue_position: null,
    outputs: null,
    error: null,
    settings: meta.settings || null,
    started_at: Date.now(),
    updated_at: Date.now(),
  };
  activeJobs.set(promptId, job);
  ensureComfyuiWs(clientId);
  refreshQueueState(promptId);
  const poll = setInterval(() => {
    if (!activeJobs.has(promptId)) {
      clearInterval(poll);
      return;
    }
    const current = activeJobs.get(promptId);
    if (current.status === "completed" || current.status === "error") {
      clearInterval(poll);
      setTimeout(() => activeJobs.delete(promptId), 10 * 60 * 1000);
      return;
    }
    refreshQueueState(promptId);
  }, 2000);
  return job;
}

export function getComfyuiProgress(promptId) {
  const job = activeJobs.get(promptId);
  if (!job) return { status: "unknown", percent: 0, message: "Job não encontrado." };
  return {
    prompt_id: job.prompt_id,
    status: job.error ? "error" : job.status,
    percent: job.percent,
    message: job.message,
    current_node: job.current_node,
    queue_position: job.queue_position,
    outputs: job.outputs,
    error: job.error,
    settings: job.settings,
  };
}

function detectAspectRatio(width, height) {
  const ratio = width / height;
  const targets = [
    ["16:9", 16 / 9],
    ["9:16", 9 / 16],
    ["1:1", 1],
    ["4:3", 4 / 3],
    ["3:4", 3 / 4],
    ["21:9", 21 / 9],
  ];
  let best = "custom";
  let bestDiff = Infinity;
  for (const [label, target] of targets) {
    const diff = Math.abs(ratio - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = label;
    }
  }
  return bestDiff < 0.08 ? best : "custom";
}

function resolveUpscaleOption(upscaleId) {
  const available = listAvailableLtxModels();
  const opt = LTX_GENERATION_OPTIONS.upscale_options.find((o) => o.id === upscaleId)
    || LTX_GENERATION_OPTIONS.upscale_options.find((o) => o.id === available.defaults.upscale)
    || LTX_GENERATION_OPTIONS.upscale_options[0];
  return opt;
}

export async function queueLtxGeneration({
  prompt,
  width,
  height,
  frames,
  duration_seconds,
  fps,
  mode = "t2v",
  format,
  codec,
  filename_prefix,
  aspect_ratio,
  model_gguf,
  lora,
  lora_strength,
  upscale,
}) {
  const cfg = readConfig();
  if (!cfg) throw new Error("Config LTX não encontrada.");
  if (!(await isComfyuiApiUp())) throw new Error("ComfyUI offline. Inicie o servidor primeiro.");

  const workflowName = mode === "i2v" ? cfg.ltx.workflow_i2v : cfg.ltx.workflow_t2v;
  const workflowPath = path.join(COMFYUI_ROOT, "workflows", workflowName);
  if (!fs.existsSync(workflowPath)) throw new Error(`Workflow não encontrado: ${workflowName}`);

  const resolvedWidth = clampInt(width, cfg.ltx.width, 256, 1280);
  const resolvedHeight = clampInt(height, cfg.ltx.height, 256, 1024);
  const timing = resolveLtxFrames({ frames, duration_seconds, fps });
  const resolvedFrames = timing.frames;
  const resolvedFormat = format === "mp4" ? "mp4" : "auto";
  const resolvedCodec = codec === "h264" ? "h264" : "auto";
  const resolvedPrefix = String(filename_prefix || "video/LTX-2").trim() || "video/LTX-2";
  const available = listAvailableLtxModels();
  const resolvedModel = model_gguf || cfg.ltx.model_gguf;
  const resolvedLora = lora || available.defaults.lora;
  const resolvedUpscale = upscale || available.defaults.upscale;
  const upscaleOpt = resolveUpscaleOption(resolvedUpscale);
  const resolvedLoraStrength = Number.isFinite(Number(lora_strength)) ? Number(lora_strength) : 1;

  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  const { prompt: apiPrompt, seed } = await workflowUiToApi(workflow, {
    baseUrl: COMFYUI_BASE,
    patch: {
      prompt,
      width: resolvedWidth,
      height: resolvedHeight,
      frames: resolvedFrames,
      format: resolvedFormat,
      codec: resolvedCodec,
      filename_prefix: resolvedPrefix,
      seed: Math.floor(Math.random() * 2 ** 31),
      upscale: upscaleOpt.id,
      upscale_scale: upscaleOpt.scale,
      upscale_model: upscaleOpt.id === "none" ? null : upscaleOpt.id,
      model_gguf: resolvedModel,
      lora_name: resolvedLora,
      lora_strength: resolvedLoraStrength,
      models: {
        model_gguf: resolvedModel,
        lora_name: resolvedLora,
        lora_strength: resolvedLoraStrength,
        upscale_model: upscaleOpt.id === "none" ? null : upscaleOpt.id,
        text_encoder: cfg.ltx.text_encoder,
        embeddings_connector: cfg.ltx.embeddings_connector,
        video_vae: cfg.ltx.video_vae,
        audio_vae: cfg.ltx.audio_vae,
      },
    },
  });
  const clientId = randomUUID();

  const res = await fetch(`${COMFYUI_BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: apiPrompt, client_id: clientId }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ComfyUI rejeitou o prompt: ${formatComfyuiError(err)}`);
  }

  const data = await res.json();
  const settings = {
    width: resolvedWidth,
    height: resolvedHeight,
    frames: resolvedFrames,
    fps: timing.fps,
    duration_seconds: timing.duration_seconds,
    aspect_ratio: aspect_ratio || detectAspectRatio(resolvedWidth, resolvedHeight),
    format: resolvedFormat,
    codec: resolvedCodec,
    filename_prefix: resolvedPrefix,
    model: resolvedModel,
    lora: resolvedLora,
    lora_strength: resolvedLoraStrength,
    upscale: upscaleOpt.id,
    seed,
  };

  startJobTracking(data.prompt_id, clientId, {
    totalNodes: Object.keys(apiPrompt).length,
    settings,
  });

  return {
    prompt_id: data.prompt_id,
    client_id: clientId,
    settings,
    ui_url: `${COMFYUI_BASE}/`,
  };
}

export async function getComfyuiHistory(promptId) {
  if (!(await isComfyuiApiUp())) throw new Error("ComfyUI offline.");
  const res = await fetch(`${COMFYUI_BASE}/history/${promptId}`);
  if (!res.ok) throw new Error("Histórico não encontrado.");
  const data = await res.json();
  const progress = getComfyuiProgress(promptId);
  return { history: data, progress, outputs: extractHistoryOutputs(data, promptId) };
}