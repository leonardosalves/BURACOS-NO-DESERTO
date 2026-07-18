/**
 * Narração local via Qwen3-TTS CustomVoice (1.7B, 12Hz).
 * https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
 * pip install -U qwen-tts  (venv: .venv-qwen3-tts)
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QWEN3_SCRIPT = path.join(__dirname, "qwen3_tts_narration.py");
const QWEN3_VENV_PYTHON = path.join(
  __dirname,
  ".venv-qwen3-tts",
  "Scripts",
  "python.exe"
);
const QWEN3_VENV_PYTHON_UNIX = path.join(
  __dirname,
  ".venv-qwen3-tts",
  "bin",
  "python"
);

export const QWEN3_TTS_VOICES = [
  {
    id: "ryan_pt",
    label: "Ryan — PT masculino dinâmico",
    lang: "pt",
    group: "pt",
    speaker: "Ryan",
    language: "Portuguese",
  },
  {
    id: "aiden_pt",
    label: "Aiden — PT masculino claro",
    lang: "pt",
    group: "pt",
    speaker: "Aiden",
    language: "Portuguese",
  },
  {
    id: "vivian_pt",
    label: "Vivian — PT feminino brilhante",
    lang: "pt",
    group: "pt",
    speaker: "Vivian",
    language: "Portuguese",
  },
  {
    id: "serena_pt",
    label: "Serena — PT feminino suave",
    lang: "pt",
    group: "pt",
    speaker: "Serena",
    language: "Portuguese",
  },
  {
    id: "uncle_fu_pt",
    label: "Uncle Fu — PT masculino maduro",
    lang: "pt",
    group: "pt",
    speaker: "Uncle_Fu",
    language: "Portuguese",
  },
  {
    id: "ryan_en",
    label: "Ryan — EN dynamic male",
    lang: "en",
    group: "en",
    speaker: "Ryan",
    language: "English",
  },
  {
    id: "aiden_en",
    label: "Aiden — EN sunny male",
    lang: "en",
    group: "en",
    speaker: "Aiden",
    language: "English",
  },
  {
    id: "vivian_en",
    label: "Vivian — EN bright female",
    lang: "en",
    group: "en",
    speaker: "Vivian",
    language: "English",
  },
  {
    id: "serena_en",
    label: "Serena — EN warm female",
    lang: "en",
    group: "en",
    speaker: "Serena",
    language: "English",
  },
  {
    id: "uncle_fu_en",
    label: "Uncle Fu — EN mellow male",
    lang: "en",
    group: "en",
    speaker: "Uncle_Fu",
    language: "English",
  },
];

export const QWEN3_TTS_DEFAULT_VOICE = "ryan_pt";
export const QWEN3_TTS_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice";

export const QWEN3_TTS_DEFAULTS = {
  instruct: "",
  device: "",
  modelId: QWEN3_TTS_MODEL_ID,
};

const TEXT_FILE_THRESHOLD = 400;

/**
 * Converte tags cinematográficas Lumiera ([tom …], [pausa], [ênfase], …)
 * em texto falado limpo + `instruct` natural language do Qwen3 CustomVoice.
 */
export function prepareQwen3ExpressiveNarration(
  taggedOrPlain = "",
  { voiceId = "", language = "" } = {}
) {
  const raw = String(taggedOrPlain || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return { text: "", instruct: "", tags: [], language: "Portuguese" };
  }

  const voiceMeta = QWEN3_TTS_VOICES.find((v) => v.id === voiceId);
  const langName =
    language ||
    voiceMeta?.language ||
    (String(voiceId).endsWith("_en") || /\ben\b/i.test(voiceId)
      ? "English"
      : "Portuguese");
  const isEn = /^english$/i.test(langName);

  const tagMatches = [...raw.matchAll(/\[([^\]]+)\]|\(([^)]+)\)/g)];
  const tags = tagMatches.map((m) => m[0]).filter(Boolean);
  const uniqueTagBodies = [
    ...new Set(
      tagMatches.map((m) => String(m[1] || m[2] || "").trim()).filter(Boolean)
    ),
  ];

  const instructParts = [];
  let hasTone = false;
  let wantsEmphasis = false;
  let wantsFast = false;
  let wantsSlow = false;
  let wantsWhisper = false;
  let wantsQuestion = false;
  let wantsEnergy = false;
  let wantsTension = false;
  let wantsMystery = false;
  let wantsWarm = false;
  let wantsConclude = false;

  for (const body of uniqueTagBodies) {
    const lower = body.toLowerCase();
    if (
      /^(pause|pausa)/i.test(lower) ||
      /^breath$/i.test(lower) ||
      /^sigh$/i.test(lower) ||
      /^laughs?/i.test(lower)
    ) {
      continue;
    }
    if (/^tom\b/i.test(body) || /narrador/i.test(body)) {
      instructParts.push(body.replace(/^tom\s*/i, "").trim() || body);
      hasTone = true;
      if (/interrog|curios|pergunt/i.test(lower)) wantsQuestion = true;
      if (/tenso|baixa|sussurr/i.test(lower)) wantsTension = true;
      if (/mister/i.test(lower)) wantsMystery = true;
      if (/animad|energ|alto/i.test(lower)) wantsEnergy = true;
      if (/acolhed|convid|suave|calmo|warm/i.test(lower)) wantsWarm = true;
      if (/conclus|satisfat/i.test(lower)) wantsConclude = true;
      if (/document/i.test(lower)) {
        /* keep */
      }
      continue;
    }
    if (/ênfase|emphasis|dramática|dramatico/i.test(lower)) {
      wantsEmphasis = true;
      continue;
    }
    if (/rápido|rapido|fast/i.test(lower)) {
      wantsFast = true;
      continue;
    }
    if (/lento|slow/i.test(lower)) {
      wantsSlow = true;
      continue;
    }
    if (/sussurr|whisper|voz baixa/i.test(lower)) {
      wantsWhisper = true;
      continue;
    }
    if (/interrog|curios|question/i.test(lower)) {
      wantsQuestion = true;
      continue;
    }
    if (/animad|excit|energ/i.test(lower)) {
      wantsEnergy = true;
      continue;
    }
    if (/mister|enigma/i.test(lower)) {
      wantsMystery = true;
      continue;
    }
    if (/tenso|tension|perigo/i.test(lower)) {
      wantsTension = true;
      continue;
    }
    if (/acolhed|warm|convid/i.test(lower)) {
      wantsWarm = true;
      continue;
    }
    if (/conclus|payoff|awe/i.test(lower)) {
      wantsConclude = true;
      continue;
    }
    // Qualquer outra tag descritiva vira instrução de estilo
    if (body.length >= 3 && body.length <= 120) {
      instructParts.push(body);
      hasTone = true;
    }
  }

  if (!hasTone) {
    instructParts.unshift(
      isEn
        ? "premium documentary narrator, clear, natural, confident"
        : "narrador documental premium, claro, natural e confiante"
    );
  }

  if (wantsEmphasis) {
    instructParts.push(
      isEn
        ? "emphasize key words with vocal weight"
        : "dê ênfase nas palavras importantes com peso vocal"
    );
  }
  if (wantsFast) {
    instructParts.push(
      isEn ? "slightly faster pace" : "ritmo um pouco mais acelerado"
    );
  }
  if (wantsSlow) {
    instructParts.push(
      isEn
        ? "slower, deliberate pace for names and numbers"
        : "ritmo mais lento e deliberado em nomes e números"
    );
  }
  if (wantsWhisper) {
    instructParts.push(
      isEn ? "softer, intimate delivery" : "entrega mais baixa e íntima"
    );
  }
  if (wantsQuestion) {
    instructParts.push(
      isEn
        ? "curious interrogative intonation"
        : "entonação interrogativa e curiosa"
    );
  }
  if (wantsEnergy) {
    instructParts.push(
      isEn ? "higher energy and enthusiasm" : "mais energia e entusiasmo"
    );
  }
  if (wantsTension) {
    instructParts.push(
      isEn
        ? "controlled tension, slightly lower register"
        : "tensão controlada, registro um pouco mais grave"
    );
  }
  if (wantsMystery) {
    instructParts.push(
      isEn
        ? "mysterious, intrigue-building tone"
        : "tom misterioso, construindo curiosidade"
    );
  }
  if (wantsWarm) {
    instructParts.push(
      isEn ? "warm and inviting" : "tom acolhedor e convidativo"
    );
  }
  if (wantsConclude) {
    instructParts.push(
      isEn
        ? "satisfying conclusive delivery"
        : "entrega conclusiva e satisfatória"
    );
  }

  // Texto falado: pausas viram reticências; tags de estilo saem
  let spoken = raw
    .replace(/\[pausa\s*longa\]/gi, " ... ")
    .replace(/\[pausa\]|\[pause\]/gi, " ... ")
    .replace(/\(pause\s*\d+\s*ms\)/gi, " ... ")
    .replace(/\(breath\)|\(sigh\)|\(laughs?\)/gi, " ")
    .replace(/\[tom[^\]]*\]/gi, " ")
    .replace(/\[ênfase[^\]]*\]/gi, " ")
    .replace(/\[emphasis[^\]]*\]/gi, " ")
    .replace(/\[rápido\]|\[rapido\]|\[fast\]/gi, " ")
    .replace(/\[lento\]|\[slowly\]|\[slow\]/gi, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/<break[^>]*\/?>/gi, " ... ")
    .replace(/\s*\.\.\.\s*/g, " ... ")
    .replace(/\s+/g, " ")
    .trim();

  // Dedup instruct
  const seen = new Set();
  const instruct = instructParts
    .map((p) => String(p || "").trim())
    .filter((p) => {
      if (!p) return false;
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("; ")
    .slice(0, 480);

  return {
    text: spoken || raw,
    instruct,
    tags,
    language: langName,
    preview: spoken || raw,
  };
}

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

export function loadQwen3TtsConfig({
  workspaceDir = null,
  projectDir = null,
} = {}) {
  const wsCfg = workspaceDir
    ? readJsonSafe(path.join(workspaceDir, "config_qanat.json"))
    : {};
  const projCfg = projectDir
    ? readJsonSafe(path.join(projectDir, "config_qanat.json"))
    : {};
  const ws = wsCfg.qwen3_tts || wsCfg.qwen3Tts || wsCfg.qwen_tts || {};
  const proj = projCfg.qwen3_tts || projCfg.qwen3Tts || projCfg.qwen_tts || {};
  return { qwen3_tts: { ...ws, ...proj } };
}

export function resolveQwen3TtsConfig(config = {}) {
  const q =
    config.qwen3_tts || config.qwen3Tts || config.qwen_tts || config || {};
  return {
    instruct: String(q.instruct || QWEN3_TTS_DEFAULTS.instruct || "").trim(),
    device: String(q.device || "").trim(),
    modelId: String(
      q.model_id || q.modelId || q.model || QWEN3_TTS_DEFAULTS.modelId
    ).trim(),
  };
}

function resolvePythonExecutable() {
  if (
    process.env.QWEN3_TTS_PYTHON_PATH &&
    fs.existsSync(process.env.QWEN3_TTS_PYTHON_PATH)
  ) {
    return process.env.QWEN3_TTS_PYTHON_PATH;
  }
  if (fs.existsSync(QWEN3_VENV_PYTHON)) return QWEN3_VENV_PYTHON;
  if (fs.existsSync(QWEN3_VENV_PYTHON_UNIX)) return QWEN3_VENV_PYTHON_UNIX;
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
  const line = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("{"));
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function buildEnv() {
  const base = buildPythonSpawnEnv();
  const cfgModel = process.env.QWEN3_TTS_MODEL_ID || QWEN3_TTS_MODEL_ID;
  return {
    ...base,
    QWEN3_TTS_MODEL_ID: cfgModel,
    ...(process.env.QWEN3_TTS_MODEL_DIR
      ? { QWEN3_TTS_MODEL_DIR: process.env.QWEN3_TTS_MODEL_DIR }
      : {}),
    ...(process.env.QWEN3_TTS_DEVICE
      ? { QWEN3_TTS_DEVICE: process.env.QWEN3_TTS_DEVICE }
      : {}),
    // HF cache preferencial no usuário
    HF_HOME:
      process.env.HF_HOME ||
      path.join(
        process.env.USERPROFILE || process.env.HOME || "",
        ".cache",
        "huggingface"
      ),
  };
}

function runPython(args, { cwd = process.cwd(), onLog = () => {} } = {}) {
  const python = resolvePythonExecutable();
  onLog(`[Qwen3-TTS] ${args.filter((a) => a.startsWith("--")).join(" ")}`);

  return new Promise((resolve, reject) => {
    const spawnArgs =
      process.platform === "win32"
        ? [
            [quoteSpawnArg(python), ...args.map(quoteSpawnArg)].join(" "),
            { cwd, shell: true, env: buildEnv() },
          ]
        : [python, args, { cwd, shell: false, env: buildEnv() }];
    const child = spawn(...spawnArgs);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      chunk
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => onLog(`[Qwen3-TTS] ${line}`));
    });
    child.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderr += chunk;
      chunk
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => onLog(`[Qwen3-TTS] ${line}`));
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      const parsed = parseJsonLine(stdout);
      if (code !== 0 || !parsed?.ok) {
        const errMsg =
          parsed?.error ||
          stderr.trim() ||
          stdout.trim() ||
          `Qwen3-TTS falhou (exit ${code})`;
        reject(new Error(errMsg));
        return;
      }
      resolve(parsed);
    });
  });
}

export async function probeQwen3Tts() {
  try {
    const parsed = await runPython([QWEN3_SCRIPT, "--probe"], {
      onLog: () => {},
    });
    return {
      ok: true,
      device: parsed.device,
      cuda: parsed.cuda,
      model: parsed.model || QWEN3_TTS_MODEL_ID,
      voices: parsed.voices || QWEN3_TTS_VOICES.map((v) => v.id),
      speakers: parsed.speakers || [],
      languages: parsed.languages || ["Portuguese", "English"],
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "Qwen3-TTS indisponível",
      voices: QWEN3_TTS_VOICES.map((v) => v.id),
      model: QWEN3_TTS_MODEL_ID,
    };
  }
}

export async function synthesizeQwen3TtsNarration(
  text,
  {
    voice = QWEN3_TTS_DEFAULT_VOICE,
    outputPath,
    workDir,
    config = {},
    instruct = "",
    /** Se true (default), extrai tags do texto e monta instruct + fala limpa. */
    applyTags = true,
    minChars = 8,
    onLog = () => {},
  } = {}
) {
  const cfg = resolveQwen3TtsConfig(config);
  let spoken = String(text).replace(/\s+/g, " ").trim();
  let finalInstruct = String(instruct || cfg.instruct || "").trim();
  let extractedTags = [];

  if (applyTags && /\[|\(/.test(spoken)) {
    const prepared = prepareQwen3ExpressiveNarration(spoken, {
      voiceId: voice,
    });
    spoken = prepared.text;
    extractedTags = prepared.tags;
    if (!finalInstruct && prepared.instruct) {
      finalInstruct = prepared.instruct;
    } else if (finalInstruct && prepared.instruct) {
      // Combina instrução explícita + tags
      finalInstruct = `${finalInstruct}; ${prepared.instruct}`.slice(0, 480);
    }
    if (prepared.instruct) {
      onLog(`[Qwen3-TTS] instruct: ${finalInstruct.slice(0, 160)}`);
    }
  }

  if (spoken.length < minChars) {
    throw new Error("Roteiro de narração ausente ou muito curto.");
  }

  fs.mkdirSync(workDir, { recursive: true });

  let tempFile = null;
  if (spoken.length > TEXT_FILE_THRESHOLD) {
    tempFile = path.join(workDir, "_qwen3_tts_narration_input.txt");
    fs.writeFileSync(tempFile, spoken, "utf8");
    onLog(
      `[Qwen3-TTS] Roteiro longo (${spoken.length} chars) — arquivo temporário.`
    );
  }

  const args = [QWEN3_SCRIPT, "--voice", voice, "--output", outputPath];
  if (finalInstruct) args.push("--instruct", finalInstruct);
  if (cfg.device) args.push("--device", cfg.device);
  if (cfg.modelId) args.push("--model", cfg.modelId);
  if (tempFile) args.push("--text-file", tempFile);
  else args.push("--text", spoken);

  try {
    const result = await runPython(args, { cwd: workDir, onLog });
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Arquivo não gerado: ${outputPath}`);
    }
    return {
      ...result,
      chars: spoken.length,
      voice: result.voice || voice,
      instruct: finalInstruct,
      tags: extractedTags,
    };
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        /* ignore */
      }
    }
  }
}
