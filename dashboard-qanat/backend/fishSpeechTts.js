/**
 * Narração via Fish Speech S2 (servidor HTTP local).
 * https://github.com/fishaudio/fish-speech — POST /v1/tts (JSON ou msgpack).
 */

import fs from "fs";
import path from "path";

export const FISH_SPEECH_DEFAULT_VOICE = "__default__";

export const FISH_CLOUD_BASE = "https://api.fish.audio";

export const FISH_SPEECH_DEFAULTS = {
  baseUrl: "http://127.0.0.1:8080",
  cloudBaseUrl: FISH_CLOUD_BASE,
  apiKey: "",
  mode: "auto",
  cloudModel: "s2.1-pro-free",
  format: "mp3",
  temperature: 0.8,
  topP: 0.8,
  repetitionPenalty: 1.1,
  chunkLength: 300,
  maxNewTokens: 1024,
  useTaggedScript: true,
  defaultReferenceId: "",
};

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

export function loadFishSpeechConfig({
  workspaceDir = null,
  projectDir = null,
} = {}) {
  const wsCfg = workspaceDir
    ? readJsonSafe(path.join(workspaceDir, "config_qanat.json"))
    : {};
  const projCfg = projectDir
    ? readJsonSafe(path.join(projectDir, "config_qanat.json"))
    : {};
  const wsFish = wsCfg.fish_speech || wsCfg.fishSpeech || {};
  const projFish = projCfg.fish_speech || projCfg.fishSpeech || {};
  return { fish_speech: { ...wsFish, ...projFish } };
}

export function resolveFishSpeechConfig(config = {}) {
  const fish = config.fish_speech || config.fishSpeech || config;
  const modeRaw = String(fish.mode || FISH_SPEECH_DEFAULTS.mode).toLowerCase();
  const mode = ["auto", "local", "cloud"].includes(modeRaw) ? modeRaw : "auto";
  return {
    baseUrl: String(
      fish.base_url || fish.baseUrl || FISH_SPEECH_DEFAULTS.baseUrl
    ).replace(/\/$/, ""),
    cloudBaseUrl: String(
      fish.cloud_base_url || fish.cloudBaseUrl || FISH_CLOUD_BASE
    ).replace(/\/$/, ""),
    apiKey: String(fish.api_key || fish.apiKey || ""),
    mode,
    cloudModel: String(
      fish.cloud_model || fish.cloudModel || FISH_SPEECH_DEFAULTS.cloudModel
    ),
    format: fish.format || FISH_SPEECH_DEFAULTS.format,
    temperature: Number(fish.temperature ?? FISH_SPEECH_DEFAULTS.temperature),
    topP: Number(fish.top_p ?? fish.topP ?? FISH_SPEECH_DEFAULTS.topP),
    repetitionPenalty: Number(
      fish.repetition_penalty ??
        fish.repetitionPenalty ??
        FISH_SPEECH_DEFAULTS.repetitionPenalty
    ),
    chunkLength: Number(
      fish.chunk_length ?? fish.chunkLength ?? FISH_SPEECH_DEFAULTS.chunkLength
    ),
    maxNewTokens: Number(
      fish.max_new_tokens ??
        fish.maxNewTokens ??
        FISH_SPEECH_DEFAULTS.maxNewTokens
    ),
    useTaggedScript:
      fish.use_tagged_script !== false && fish.useTaggedScript !== false,
    defaultReferenceId: String(
      fish.default_reference_id || fish.defaultReferenceId || ""
    ),
    prosodySpeed: Number(fish.prosody_speed ?? fish.prosodySpeed ?? 1),
  };
}

function authHeaders(apiKey, extra = {}) {
  const headers = { ...extra };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function probeFishSpeechLocal(cfg, { timeoutMs = 6000 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const healthRes = await fetch(`${cfg.baseUrl}/v1/health`, {
      headers: authHeaders(cfg.apiKey, { Accept: "application/json" }),
      signal,
    });
    if (!healthRes.ok) {
      return {
        ok: false,
        baseUrl: cfg.baseUrl,
        error: `Health HTTP ${healthRes.status}`,
      };
    }

    let references = [];
    try {
      const listRes = await fetch(
        `${cfg.baseUrl}/v1/references/list?format=json`,
        {
          headers: authHeaders(cfg.apiKey, { Accept: "application/json" }),
          signal,
        }
      );
      if (listRes.ok) {
        const data = await listRes.json();
        references = Array.isArray(data.reference_ids)
          ? data.reference_ids
          : [];
      }
    } catch {
      /* referências opcionais */
    }

    return {
      ok: true,
      mode: "local",
      baseUrl: cfg.baseUrl,
      references,
      defaultReferenceId: cfg.defaultReferenceId || FISH_SPEECH_DEFAULT_VOICE,
    };
  } catch (err) {
    return {
      ok: false,
      mode: "local",
      baseUrl: cfg.baseUrl,
      references: [],
      error: err?.message || "fetch failed",
    };
  }
}

function normalizeFishModel(item, group) {
  const id = String(item?._id || item?.id || "").trim();
  if (!id) return null;
  const state = String(item?.state || "trained").toLowerCase();
  if (state && state !== "trained") return null;
  const type = String(item?.type || "tts").toLowerCase();
  if (type && type !== "tts") return null;
  return {
    id,
    title: String(item?.title || id).trim(),
    group,
    languages: Array.isArray(item?.languages) ? item.languages : [],
  };
}

async function fetchFishCloudModels(
  cfg,
  { timeoutMs = 15000, libraryLanguage = "pt" } = {}
) {
  if (!cfg.apiKey) return [];
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = authHeaders(cfg.apiKey, { Accept: "application/json" });
  const models = [];
  const seen = new Set();

  const ingest = (items, group) => {
    for (const raw of items || []) {
      const model = normalizeFishModel(raw, group);
      if (!model || seen.has(model.id)) continue;
      seen.add(model.id);
      models.push(model);
    }
  };

  try {
    const selfRes = await fetch(
      `${cfg.cloudBaseUrl}/model?self=true&page_size=50`,
      { headers, signal }
    );
    if (selfRes.ok) {
      const data = await selfRes.json();
      ingest(data.items, "minhas vozes");
    }
  } catch {
    /* opcional */
  }

  const lang = String(libraryLanguage || "pt").trim();
  if (lang) {
    try {
      const libRes = await fetch(
        `${cfg.cloudBaseUrl}/model?page_size=40&language=${encodeURIComponent(lang)}&sort_by=score`,
        { headers, signal }
      );
      if (libRes.ok) {
        const data = await libRes.json();
        ingest(data.items, `biblioteca ${lang.toUpperCase()}`);
      }
    } catch {
      /* opcional */
    }
  }

  if (!models.length) {
    try {
      const fallbackRes = await fetch(
        `${cfg.cloudBaseUrl}/model?page_size=30&sort_by=score`,
        { headers, signal }
      );
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        ingest(data.items, "biblioteca");
      }
    } catch {
      /* opcional */
    }
  }

  return models;
}

async function probeFishSpeechCloud(cfg, opts = {}) {
  const libraryLanguage = opts.libraryLanguage || "pt";
  let models = [];
  try {
    models = await fetchFishCloudModels(cfg, { ...opts, libraryLanguage });
  } catch {
    models = [];
  }

  const configuredDefault =
    cfg.defaultReferenceId &&
    cfg.defaultReferenceId !== FISH_SPEECH_DEFAULT_VOICE
      ? cfg.defaultReferenceId
      : "";

  return {
    ok: true,
    mode: "cloud",
    baseUrl: cfg.cloudBaseUrl,
    models,
    references: models.map((m) => m.id),
    defaultReferenceId: configuredDefault || FISH_SPEECH_DEFAULT_VOICE,
    modelCount: models.length,
  };
}

export async function probeFishSpeechServer(config = {}, opts = {}) {
  const cfg = resolveFishSpeechConfig(config);
  let localProbe = { ok: false, error: "fetch failed" };

  if (cfg.mode !== "cloud") {
    localProbe = await probeFishSpeechLocal(cfg, opts);
    if (localProbe.ok) return localProbe;
    if (cfg.mode === "local") {
      return {
        ...localProbe,
        error: `${localProbe.error}. Rode: .\\scripts\\start-fish-speech.ps1`,
      };
    }
  }

  if (cfg.apiKey && cfg.mode !== "local") {
    return probeFishSpeechCloud(cfg, opts);
  }

  return {
    ok: false,
    mode: "local",
    baseUrl: cfg.baseUrl,
    references: [],
    error: `${localProbe.error || "servidor offline"}. Inicie .\\scripts\\start-fish-speech.ps1 ou configure fish_speech.api_key (cloud) no config_qanat.json`,
  };
}

export const FISH_PREVIEW_SAMPLE_PT =
  "Esta é uma amostra da voz do narrador. Tom documental, natural e claro em português brasileiro.";

export function applyFishOptionOverrides(config = {}, fishOpt = {}) {
  const fish = config.fish_speech || config.fishSpeech || {};
  return {
    fish_speech: {
      ...fish,
      ...(fishOpt.temperature != null
        ? { temperature: Number(fishOpt.temperature) }
        : {}),
      ...(fishOpt.topP != null ? { top_p: Number(fishOpt.topP) } : {}),
      ...(fishOpt.top_p != null ? { top_p: Number(fishOpt.top_p) } : {}),
      ...(fishOpt.repetitionPenalty != null
        ? { repetition_penalty: Number(fishOpt.repetitionPenalty) }
        : {}),
      ...(fishOpt.repetition_penalty != null
        ? { repetition_penalty: Number(fishOpt.repetition_penalty) }
        : {}),
      ...(fishOpt.chunkLength != null
        ? { chunk_length: Number(fishOpt.chunkLength) }
        : {}),
      ...(fishOpt.chunk_length != null
        ? { chunk_length: Number(fishOpt.chunk_length) }
        : {}),
      ...(fishOpt.prosodySpeed != null
        ? { prosody_speed: Number(fishOpt.prosodySpeed) }
        : {}),
      ...(fishOpt.prosody_speed != null
        ? { prosody_speed: Number(fishOpt.prosody_speed) }
        : {}),
      ...(fishOpt.cloudModel
        ? { cloud_model: String(fishOpt.cloudModel) }
        : {}),
      ...(fishOpt.cloud_model
        ? { cloud_model: String(fishOpt.cloud_model) }
        : {}),
    },
  };
}

export function buildFishPreviewSample(narrativeScript = "") {
  const plain = String(narrativeScript || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length >= 40) {
    const sentence = plain.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || plain;
    return sentence.slice(0, 180).trim();
  }
  return FISH_PREVIEW_SAMPLE_PT;
}

export function buildFishSpeechVoiceList(probe = {}) {
  const voices = [
    {
      id: FISH_SPEECH_DEFAULT_VOICE,
      label:
        probe.mode === "cloud"
          ? "Voz padrão S2.1 (sem clone)"
          : "Voz padrão do modelo S2",
      group: "padrão",
    },
  ];
  const seen = new Set([FISH_SPEECH_DEFAULT_VOICE]);

  for (const model of probe.models || []) {
    if (!model?.id || seen.has(model.id)) continue;
    seen.add(model.id);
    voices.push({
      id: model.id,
      label: model.title || model.id,
      group: model.group || "biblioteca",
    });
  }

  for (const refId of probe.references || []) {
    if (!refId || seen.has(refId)) continue;
    seen.add(refId);
    const fromModel = (probe.models || []).find((m) => m.id === refId);
    voices.push({
      id: refId,
      label: fromModel?.title || `Referência: ${refId}`,
      group: fromModel?.group || "ref",
    });
  }

  return voices;
}

/**
 * Decide se o normalizador textual do Fish ainda e necessario. Textos que ja
 * chegam por extenso nao devem passar por uma segunda normalizacao, pois ela
 * pode reinterpretar unidades e abreviacoes em portugues.
 */
export function shouldNormalizeFishSpeechText(text = "") {
  const value = String(text || "");
  return /\d|[%°º]|\b(?:min|seg|km|cm|mm|kg|mph|hz|khz|mhz)\b/i.test(value);
}

/** Monta o payload em um unico lugar para preview e sintese usarem as mesmas regras. */
export function buildFishSpeechRequestBody(
  text,
  cfg,
  referenceId = null,
  { independentChunk = false, normalizeText = "auto" } = {}
) {
  const preparedText = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const normalize =
    normalizeText === "auto"
      ? shouldNormalizeFishSpeechText(preparedText)
      : Boolean(normalizeText);
  const configuredTemperature = Number(cfg.temperature);
  const configuredTopP = Number(cfg.topP);

  return {
    text: preparedText,
    format: cfg.format,
    references: [],
    reference_id: referenceId || null,
    chunk_length: cfg.chunkLength,
    // Trechos curtos precisam privilegiar fidelidade ao texto, nao variacao.
    temperature: independentChunk
      ? Math.min(configuredTemperature, 0.7)
      : configuredTemperature,
    top_p: independentChunk ? Math.min(configuredTopP, 0.75) : configuredTopP,
    repetition_penalty: cfg.repetitionPenalty,
    max_new_tokens: cfg.maxNewTokens,
    latency: "normal",
    use_memory_cache: "off",
    normalize,
    streaming: false,
    condition_on_previous_chunks: !independentChunk,
    min_chunk_length: independentChunk
      ? Math.max(1, Math.min(50, preparedText.length))
      : 50,
  };
}

export function prepareFishSpeechInputText(text) {
  const plain = String(text || "").trim();
  if (!plain) {
    throw new Error("Texto vazio para Fish Speech.");
  }
  return plain;
}

export async function fetchFishSpeechAudio(
  text,
  {
    referenceId = null,
    config = {},
    onLog = () => {},
    onProgress = null,
    timeoutMs = 900000,
    independentChunk = false,
    normalizeText = "auto",
  } = {}
) {
  const report =
    typeof onProgress === "function"
      ? (pct, label) => onProgress("fish", label, pct)
      : () => {};
  const cfg = resolveFishSpeechConfig(config);
  const plain = prepareFishSpeechInputText(text);

  report(10, "Conectando ao Fish Audio…");
  const probe = await probeFishSpeechServer(config);
  if (!probe.ok) {
    throw new Error(`Fish Speech indisponível. ${probe.error || ""}`.trim());
  }

  const mode = probe.mode || "local";
  report(
    18,
    mode === "cloud"
      ? "Fish Audio cloud · preparando síntese…"
      : "Fish Audio local · preparando síntese…"
  );
  const baseUrl = mode === "cloud" ? cfg.cloudBaseUrl : cfg.baseUrl;

  const refId =
    referenceId && referenceId !== FISH_SPEECH_DEFAULT_VOICE
      ? referenceId
      : cfg.defaultReferenceId || null;

  const prosodySpeed = Number(cfg.prosodySpeed ?? cfg.prosody_speed);
  const body = buildFishSpeechRequestBody(plain, cfg, refId, {
    independentChunk,
    normalizeText,
  });
  if (Number.isFinite(prosodySpeed) && prosodySpeed > 0 && prosodySpeed !== 1) {
    body.prosody = {
      speed: prosodySpeed,
      volume: 0,
      normalize_loudness: true,
    };
  }

  onLog(
    `[Fish Speech] ${body.text.length} chars · ref=${refId || "padrão"} · ${mode} · ` +
      `normalização=${body.normalize ? "ativa" : "desativada"} · ` +
      `contexto=${body.condition_on_previous_chunks ? "contínuo" : "trecho independente"} · ${baseUrl}`
  );
  report(28, `Sintetizando ${plain.length} caracteres…`);

  const headers = authHeaders(cfg.apiKey, {
    "Content-Type": "application/json",
    Accept: "audio/*",
  });
  if (mode === "cloud") {
    headers.model = cfg.cloudModel;
  }

  const synthStarted = Date.now();
  const progressTicker = setInterval(() => {
    const elapsed = Date.now() - synthStarted;
    const pct = Math.min(
      88,
      32 + Math.floor((elapsed / Math.max(timeoutMs, 1)) * 56)
    );
    report(
      pct,
      mode === "cloud"
        ? "Fish Audio cloud processando…"
        : "Fish Audio sintetizando voz…"
    );
  }, 2500);

  let res;
  try {
    res = await fetch(`${baseUrl}/v1/tts`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } finally {
    clearInterval(progressTicker);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Fish Speech HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }

  report(92, "Recebendo áudio do Fish Audio…");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error("Fish Speech retornou áudio vazio.");
  }
  report(97, "Áudio Fish Audio recebido");

  return {
    buffer,
    referenceId: refId,
    format: cfg.format,
    bytes: buffer.length,
    mode,
  };
}

export async function previewFishSpeechVoice({
  voice = null,
  sampleText = "",
  narrativeScript = "",
  config = {},
  fishOptions = {},
  onLog = () => {},
} = {}) {
  const mergedConfig = applyFishOptionOverrides(config, fishOptions);
  const text =
    String(sampleText || "").trim() || buildFishPreviewSample(narrativeScript);
  const result = await fetchFishSpeechAudio(text, {
    referenceId: voice,
    config: mergedConfig,
    onLog,
    timeoutMs: 120000,
  });
  return {
    ...result,
    sampleText: text,
  };
}

export async function synthesizeFishSpeech(
  text,
  {
    outputPath,
    referenceId = null,
    config = {},
    onLog = () => {},
    onProgress = null,
  } = {}
) {
  if (!outputPath) {
    throw new Error("Caminho de saída ausente para Fish Speech.");
  }

  const result = await fetchFishSpeechAudio(text, {
    referenceId,
    config,
    onLog,
    onProgress,
  });
  if (typeof onProgress === "function") {
    onProgress("fish", "Salvando narracao_mestra_premium.mp3…", 99);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.buffer);

  return {
    outputPath,
    referenceId: result.referenceId,
    format: result.format,
    bytes: result.bytes,
    mode: result.mode,
  };
}
