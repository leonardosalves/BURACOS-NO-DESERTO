/**
 * Narração via Voicebox (estúdio TTS local — clone de voz, 7 engines).
 * https://github.com/jamiepine/voicebox — API :17493 (app) ou :17600 (Docker)
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getFfmpegStatus } from "./pythonEnv.js";

export const VOICEBOX_DEFAULT_URLS = [
  "http://127.0.0.1:17493",
  "http://127.0.0.1:17600",
  "http://127.0.0.1:8000",
];
export const VOICEBOX_DEFAULT_ENGINE = "chatterbox";
export const VOICEBOX_DEFAULT_LANGUAGE = "pt";

export const VOICEBOX_DEFAULTS = {
  baseUrls: VOICEBOX_DEFAULT_URLS,
  defaultProfileId: "",
  engine: VOICEBOX_DEFAULT_ENGINE,
  language: VOICEBOX_DEFAULT_LANGUAGE,
  maxChunkChars: 800,
  crossfadeMs: 50,
  pollIntervalMs: 2000,
  timeoutMs: 900000,
};

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

export function loadVoiceboxConfig({ workspaceDir = null, projectDir = null } = {}) {
  const wsCfg = workspaceDir ? readJsonSafe(path.join(workspaceDir, "config_qanat.json")) : {};
  const projCfg = projectDir ? readJsonSafe(path.join(projectDir, "config_qanat.json")) : {};
  const ws = wsCfg.voicebox || {};
  const proj = projCfg.voicebox || {};
  return { voicebox: { ...ws, ...proj } };
}

export function resolveVoiceboxConfig(config = {}) {
  const vb = config.voicebox || config;
  const urlsRaw = vb.base_urls || vb.baseUrls || vb.base_url || vb.baseUrl;
  const baseUrls = Array.isArray(urlsRaw)
    ? urlsRaw.map((u) => String(u).replace(/\/$/, ""))
    : urlsRaw
      ? [String(urlsRaw).replace(/\/$/, "")]
      : [...VOICEBOX_DEFAULT_URLS];
  return {
    baseUrls: baseUrls.length ? baseUrls : [...VOICEBOX_DEFAULT_URLS],
    defaultProfileId: String(vb.default_profile_id || vb.defaultProfileId || ""),
    engine: String(vb.engine || VOICEBOX_DEFAULT_ENGINE),
    language: String(vb.language || VOICEBOX_DEFAULT_LANGUAGE),
    maxChunkChars: Number(vb.max_chunk_chars ?? vb.maxChunkChars ?? VOICEBOX_DEFAULTS.maxChunkChars),
    crossfadeMs: Number(vb.crossfade_ms ?? vb.crossfadeMs ?? VOICEBOX_DEFAULTS.crossfadeMs),
    pollIntervalMs: Number(vb.poll_interval_ms ?? vb.pollIntervalMs ?? VOICEBOX_DEFAULTS.pollIntervalMs),
    timeoutMs: Number(vb.timeout_ms ?? vb.timeoutMs ?? VOICEBOX_DEFAULTS.timeoutMs),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchVoiceboxJson(baseUrl, endpoint, options = {}) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Voicebox-Client-Id": "lumiera",
      ...(options.headers || {}),
    },
    signal: options.signal || AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

export async function probeVoiceboxServer(config = {}, { timeoutMs = 5000 } = {}) {
  const cfg = resolveVoiceboxConfig(config);
  const errors = [];

  for (const baseUrl of cfg.baseUrls) {
    try {
      const health = await fetchVoiceboxJson(baseUrl, "/health", {
        signal: AbortSignal.timeout(timeoutMs),
      });
      let profiles = [];
      try {
        profiles = await fetchVoiceboxJson(baseUrl, "/profiles", {
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        profiles = [];
      }
      const list = Array.isArray(profiles) ? profiles : [];
      return {
        ok: true,
        baseUrl,
        gpuAvailable: Boolean(health.gpu_available),
        backendType: health.backend_type || null,
        profiles: list.map((p) => ({ id: p.id, name: p.name, language: p.language })),
        defaultProfileId: cfg.defaultProfileId || list[0]?.id || "",
      };
    } catch (err) {
      errors.push(`${baseUrl}: ${err?.message || "offline"}`);
    }
  }

  return {
    ok: false,
    baseUrl: cfg.baseUrls[0],
    profiles: [],
    error: errors.join(" · ") || "Voicebox offline",
  };
}

export function buildVoiceboxVoiceList(probe = {}) {
  const voices = (probe.profiles || []).map((p) => ({
    id: p.id,
    label: p.name,
    group: p.language || "profile",
  }));
  if (!voices.length) {
    voices.push({
      id: "__configure__",
      label: "Crie um perfil de voz no Voicebox",
      group: "help",
    });
  }
  return voices;
}

function resolveProfileId(voice, profiles = [], fallbackId = "") {
  const needle = String(voice || "").trim();
  if (!needle || needle === "__configure__") {
    return fallbackId || profiles[0]?.id || "";
  }
  const byId = profiles.find((p) => p.id === needle);
  if (byId) return byId.id;
  const lower = needle.toLowerCase();
  const byName = profiles.find((p) => String(p.name || "").toLowerCase() === lower);
  if (byName) return byName.id;
  if (/^[0-9a-f-]{36}$/i.test(needle)) return needle;
  return fallbackId || profiles[0]?.id || "";
}

function runFfmpegToMp3(inputPath, outputPath) {
  const ff = getFfmpegStatus();
  if (!ff.found || !ff.binary) {
    fs.copyFileSync(inputPath, outputPath.replace(/\.mp3$/i, ".wav"));
    throw new Error("ffmpeg ausente — salvo como WAV. Instale ffmpeg para MP3.");
  }
  return new Promise((resolve, reject) => {
    const args = ["-y", "-i", inputPath, "-codec:a", "libmp3lame", "-q:a", "2", outputPath];
    const proc = spawn(ff.binary, args, { windowsHide: true });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(new Error(`ffmpeg falhou (${code}): ${stderr.slice(-400)}`));
    });
    proc.on("error", reject);
  });
}

function bufferLooksMp3(buffer) {
  if (!buffer?.length) return false;
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return true; // ID3
  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

async function writeAudioBuffer(buffer, outputPath, contentType = "") {
  const isWav = String(contentType).includes("wav") || buffer.slice(0, 4).toString() === "RIFF";
  const isMp3 = String(contentType).includes("mpeg") || bufferLooksMp3(buffer);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (isMp3 && /\.mp3$/i.test(outputPath)) {
    fs.writeFileSync(outputPath, buffer);
    return { format: "mp3", bytes: buffer.length };
  }

  const tmpWav = outputPath.replace(/\.mp3$/i, "_voicebox_tmp.wav");
  fs.writeFileSync(tmpWav, buffer);
  try {
    await runFfmpegToMp3(tmpWav, outputPath);
    return { format: "mp3", bytes: fs.statSync(outputPath).size };
  } finally {
    try { fs.unlinkSync(tmpWav); } catch { /* ignore */ }
  }
}

async function waitForGeneration(baseUrl, generationId, { onLog, pollIntervalMs, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const gen = await fetchVoiceboxJson(baseUrl, `/history/${generationId}`, {
      signal: AbortSignal.timeout(15000),
    });
    const status = gen.status || "completed";
    onLog(`[Voicebox] geração ${generationId.slice(0, 8)}… status=${status}`);
    if (status === "completed") return gen;
    if (status === "failed") {
      throw new Error(gen.error || "Voicebox falhou na geração");
    }
    await sleep(pollIntervalMs);
  }
  throw new Error("Voicebox timeout — roteiro longo ou fila GPU ocupada");
}

export async function synthesizeVoiceboxNarration(text, {
  outputPath,
  voice = null,
  config = {},
  onLog = () => {},
} = {}) {
  const plain = String(text || "").trim();
  if (!plain || plain.length < 20) {
    throw new Error("Texto muito curto para Voicebox.");
  }
  if (!outputPath) {
    throw new Error("Caminho de saída ausente para Voicebox.");
  }

  const cfg = resolveVoiceboxConfig(config);
  const probe = await probeVoiceboxServer(config);
  if (!probe.ok) {
    throw new Error(
      `Voicebox indisponível. ${probe.error || ""} Instale: .\\scripts\\setup-voicebox.ps1`.trim(),
    );
  }

  const profileId = resolveProfileId(voice, probe.profiles, probe.defaultProfileId);
  if (!profileId) {
    throw new Error(
      "Nenhum perfil de voz no Voicebox. Abra o app → Voices → crie/importe um perfil (clone ou preset Kokoro PT).",
    );
  }

  const profileLabel = probe.profiles.find((p) => p.id === profileId)?.name || profileId;

  onLog(
    `[Voicebox] ${plain.length} chars · perfil=${profileLabel} · engine=${cfg.engine} · ${probe.baseUrl}`,
  );

  const generation = await fetchVoiceboxJson(probe.baseUrl, "/generate", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      text: plain,
      language: cfg.language,
      engine: cfg.engine,
      max_chunk_chars: cfg.maxChunkChars,
      crossfade_ms: cfg.crossfadeMs,
      normalize: true,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const generationId = generation.id;
  if (!generationId) {
    throw new Error("Voicebox não retornou id de geração");
  }

  const completed = await waitForGeneration(probe.baseUrl, generationId, {
    onLog,
    pollIntervalMs: cfg.pollIntervalMs,
    timeoutMs: cfg.timeoutMs,
  });

  const audioRes = await fetch(`${probe.baseUrl}/history/${generationId}/export-audio`, {
    headers: { "X-Voicebox-Client-Id": "lumiera" },
    signal: AbortSignal.timeout(120000),
  });
  if (!audioRes.ok) {
    const errText = await audioRes.text().catch(() => "");
    throw new Error(`Voicebox export-audio HTTP ${audioRes.status}: ${errText.slice(0, 300)}`);
  }

  const contentType = audioRes.headers.get("content-type") || "";
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  if (!buffer.length) {
    throw new Error("Voicebox retornou áudio vazio");
  }

  const written = await writeAudioBuffer(buffer, outputPath, contentType);

  return {
    outputPath,
    profileId,
    profileName: profileLabel,
    engine: cfg.engine,
    generationId,
    durationSeconds: completed.duration || null,
    chars: plain.length,
    format: written.format,
    bytes: written.bytes,
    baseUrl: probe.baseUrl,
  };
}