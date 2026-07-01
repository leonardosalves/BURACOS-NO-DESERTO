/**
 * Narração local via Chatterbox (Resemble AI).
 * https://github.com/resemble-ai/chatterbox — pip install chatterbox-tts
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHATTERBOX_SCRIPT = path.join(__dirname, "chatterbox_narration.py");

export const CHATTERBOX_VOICES = [
  { id: "multilingual_pt", label: "Multilingual V3 — Português", lang: "pt", group: "pt" },
  { id: "multilingual_en", label: "Multilingual V3 — English", lang: "en", group: "en" },
  { id: "turbo_en", label: "Turbo — English + tags [laugh]/[chuckle]", lang: "en", group: "en" },
  { id: "english_default", label: "English — voz padrão", lang: "en", group: "en" },
];

export const CHATTERBOX_DEFAULT_VOICE = "multilingual_pt";

export const CHATTERBOX_DEFAULTS = {
  exaggeration: 0.5,
  cfgWeight: 0.5,
  temperature: 0.8,
  useTaggedScript: true,
  referenceAudio: "",
};

const TEXT_FILE_THRESHOLD = 400;

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

export function loadChatterboxConfig({ workspaceDir = null, projectDir = null } = {}) {
  const wsCfg = workspaceDir ? readJsonSafe(path.join(workspaceDir, "config_qanat.json")) : {};
  const projCfg = projectDir ? readJsonSafe(path.join(projectDir, "config_qanat.json")) : {};
  const ws = wsCfg.chatterbox || wsCfg.chatterbox_tts || {};
  const proj = projCfg.chatterbox || projCfg.chatterbox_tts || {};
  return { chatterbox: { ...ws, ...proj } };
}

export function resolveChatterboxConfig(config = {}) {
  const cb = config.chatterbox || config.chatterbox_tts || config;
  return {
    exaggeration: Number(cb.exaggeration ?? CHATTERBOX_DEFAULTS.exaggeration),
    cfgWeight: Number(cb.cfg_weight ?? cb.cfgWeight ?? CHATTERBOX_DEFAULTS.cfgWeight),
    temperature: Number(cb.temperature ?? CHATTERBOX_DEFAULTS.temperature),
    useTaggedScript: cb.use_tagged_script !== false && cb.useTaggedScript !== false,
    referenceAudio: String(cb.reference_audio || cb.referenceAudio || ""),
    device: String(cb.device || "").trim(),
  };
}

function resolvePythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(localAppData, "Python", "bin", "python.exe"),
    "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe",
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return process.platform === "win32" ? "python.exe" : "python3";
}

function quoteSpawnArg(value) {
  const text = String(value);
  if (!/[\s"]/g.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function parseJsonLine(stdout) {
  const line = stdout.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("{"));
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function runPython(args, { cwd = process.cwd(), onLog = () => {} } = {}) {
  const python = resolvePythonExecutable();
  onLog(`[Chatterbox] ${args.filter((a) => a.startsWith("--")).join(" ")}`);

  return new Promise((resolve, reject) => {
    const spawnArgs = process.platform === "win32"
      ? [[quoteSpawnArg(python), ...args.map(quoteSpawnArg)].join(" "), { cwd, shell: true, env: buildPythonSpawnEnv() }]
      : [python, args, { cwd, shell: false, env: buildPythonSpawnEnv() }];
    const child = spawn(...spawnArgs);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      chunk.split(/\r?\n/).filter(Boolean).forEach((line) => onLog(`[Chatterbox] ${line}`));
    });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      const parsed = parseJsonLine(stdout);
      if (code !== 0 || !parsed?.ok) {
        const errMsg = parsed?.error || stderr.trim() || stdout.trim() || `Chatterbox falhou (exit ${code})`;
        reject(new Error(errMsg));
        return;
      }
      resolve(parsed);
    });
  });
}

export async function probeChatterbox() {
  try {
    const parsed = await runPython([CHATTERBOX_SCRIPT, "--probe"], { onLog: () => {} });
    return {
      ok: true,
      device: parsed.device,
      cuda: parsed.cuda,
      voices: parsed.voices || CHATTERBOX_VOICES.map((v) => v.id),
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "Chatterbox indisponível",
      voices: CHATTERBOX_VOICES.map((v) => v.id),
    };
  }
}

export async function synthesizeChatterboxNarration(text, {
  voice = CHATTERBOX_DEFAULT_VOICE,
  outputPath,
  workDir,
  config = {},
  onLog = () => {},
} = {}) {
  const plain = String(text).replace(/\s+/g, " ").trim();
  if (plain.length < 40) {
    throw new Error("Roteiro de narração ausente ou muito curto.");
  }

  const cfg = resolveChatterboxConfig(config);
  fs.mkdirSync(workDir, { recursive: true });

  let tempFile = null;
  if (plain.length > TEXT_FILE_THRESHOLD) {
    tempFile = path.join(workDir, "_chatterbox_narration_input.txt");
    fs.writeFileSync(tempFile, plain, "utf8");
    onLog(`[Chatterbox] Roteiro longo (${plain.length} chars) — arquivo temporário.`);
  }

  const args = [
    CHATTERBOX_SCRIPT,
    "--voice", voice,
    "--exaggeration", String(cfg.exaggeration),
    "--cfg-weight", String(cfg.cfgWeight),
    "--temperature", String(cfg.temperature),
    "--output", outputPath,
  ];
  if (cfg.device) args.push("--device", cfg.device);
  if (cfg.referenceAudio && fs.existsSync(cfg.referenceAudio)) {
    args.push("--reference-audio", cfg.referenceAudio);
  }
  if (tempFile) args.push("--text-file", tempFile);
  else args.push("--text", plain);

  try {
    const result = await runPython(args, { cwd: workDir, onLog });
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Arquivo não gerado: ${outputPath}`);
    }
    return { ...result, chars: plain.length, voice: result.voice || voice };
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
}