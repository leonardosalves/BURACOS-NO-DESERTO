/**
 * Narração local via Kokoro-82M (Python + kokoro-onnx).
 * 100% gratuito, roda no PC — sem Edge TTS.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOKORO_SCRIPT = path.join(__dirname, "kokoro_narration.py");

export const KOKORO_VOICES = [
  { id: "pm_alex", label: "Alex — PT-BR masculino", lang: "pt-br", gender: "male", group: "pt" },
  { id: "pm_santa", label: "Santa — PT-BR masculino", lang: "pt-br", gender: "male", group: "pt" },
  { id: "pf_dora", label: "Dora — PT-BR feminino", lang: "pt-br", gender: "female", group: "pt" },
  { id: "am_fenrir", label: "Fenrir — EN grave sarcástico", lang: "en-us", gender: "male", group: "en" },
  { id: "am_michael", label: "Michael — EN autoritário", lang: "en-us", gender: "male", group: "en" },
  { id: "am_puck", label: "Puck — EN seco", lang: "en-us", gender: "male", group: "en" },
  { id: "bm_george", label: "George — EN-GB maduro", lang: "en-gb", gender: "male", group: "en" },
  { id: "bm_fable", label: "Fable — EN-GB narrador", lang: "en-gb", gender: "male", group: "en" },
  { id: "af_heart", label: "Heart — EN feminino quente", lang: "en-us", gender: "female", group: "en" },
  { id: "bf_emma", label: "Emma — EN-GB feminino", lang: "en-gb", gender: "female", group: "en" },
];

export const KOKORO_DEFAULT_VOICE = "pm_alex";
export const KOKORO_DEFAULT_SPEED = 0.82;

const TEXT_FILE_THRESHOLD = 400;

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

export function runKokoroTts({
  text,
  textFile,
  voice = KOKORO_DEFAULT_VOICE,
  speed = KOKORO_DEFAULT_SPEED,
  outputPath,
  cwd = process.cwd(),
  onLog = () => {},
} = {}) {
  if (!outputPath) {
    return Promise.reject(new Error("Caminho de saída ausente para Kokoro TTS."));
  }
  if (!text?.trim() && !textFile) {
    return Promise.reject(new Error("Texto de narração vazio para Kokoro TTS."));
  }

  const python = resolvePythonExecutable();
  const args = [
    KOKORO_SCRIPT,
    "--voice", voice,
    "--speed", String(speed),
    "--output", outputPath,
  ];
  if (textFile) args.push("--text-file", textFile);
  else args.push("--text", text);

  onLog(`[Kokoro] Voz ${voice}, speed ${speed}...`);

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
      chunk.split(/\r?\n/).filter(Boolean).forEach((line) => onLog(`[Kokoro] ${line}`));
    });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      const parsed = parseJsonLine(stdout);
      if (code !== 0 || !parsed?.ok) {
        const errMsg = parsed?.error || stderr.trim() || stdout.trim() || `Kokoro TTS falhou (exit ${code})`;
        reject(new Error(errMsg));
        return;
      }
      if (!fs.existsSync(outputPath)) {
        reject(new Error(`Arquivo não gerado: ${outputPath}`));
        return;
      }
      resolve({
        voice: parsed.voice || voice,
        speed: parsed.speed ?? speed,
        durationSeconds: parsed.durationSeconds,
        outputPath: parsed.outputPath || outputPath,
      });
    });
  });
}

export async function synthesizeKokoroNarration(text, {
  voice = KOKORO_DEFAULT_VOICE,
  speed = KOKORO_DEFAULT_SPEED,
  outputPath,
  workDir,
  onLog = () => {},
} = {}) {
  const plain = String(text).replace(/\s+/g, " ").trim();
  if (plain.length < 40) {
    throw new Error("Roteiro de narração ausente ou muito curto.");
  }

  fs.mkdirSync(workDir, { recursive: true });
  let tempFile = null;

  if (plain.length > TEXT_FILE_THRESHOLD) {
    tempFile = path.join(workDir, "_kokoro_narration_input.txt");
    fs.writeFileSync(tempFile, plain, "utf8");
    onLog(`[Kokoro] Roteiro longo (${plain.length} chars) — arquivo temporário.`);
  }

  try {
    const result = await runKokoroTts({
      text: tempFile ? undefined : plain,
      textFile: tempFile || undefined,
      voice,
      speed,
      outputPath,
      cwd: workDir,
      onLog,
    });
    return { ...result, chars: plain.length };
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
    }
  }
}