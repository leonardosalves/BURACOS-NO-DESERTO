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

export function loadFishSpeechConfig({ workspaceDir = null, projectDir = null } = {}) {
  const wsCfg = workspaceDir ? readJsonSafe(path.join(workspaceDir, "config_qanat.json")) : {};
  const projCfg = projectDir ? readJsonSafe(path.join(projectDir, "config_qanat.json")) : {};
  const wsFish = wsCfg.fish_speech || wsCfg.fishSpeech || {};
  const projFish = projCfg.fish_speech || projCfg.fishSpeech || {};
  return { fish_speech: { ...wsFish, ...projFish } };
}

export function resolveFishSpeechConfig(config = {}) {
  const fish = config.fish_speech || config.fishSpeech || config;
  const modeRaw = String(fish.mode || FISH_SPEECH_DEFAULTS.mode).toLowerCase();
  const mode = ["auto", "local", "cloud"].includes(modeRaw) ? modeRaw : "auto";
  return {
    baseUrl: String(fish.base_url || fish.baseUrl || FISH_SPEECH_DEFAULTS.baseUrl).replace(/\/$/, ""),
    cloudBaseUrl: String(fish.cloud_base_url || fish.cloudBaseUrl || FISH_CLOUD_BASE).replace(/\/$/, ""),
    apiKey: String(fish.api_key || fish.apiKey || ""),
    mode,
    cloudModel: String(fish.cloud_model || fish.cloudModel || FISH_SPEECH_DEFAULTS.cloudModel),
    format: fish.format || FISH_SPEECH_DEFAULTS.format,
    temperature: Number(fish.temperature ?? FISH_SPEECH_DEFAULTS.temperature),
    topP: Number(fish.top_p ?? fish.topP ?? FISH_SPEECH_DEFAULTS.topP),
    repetitionPenalty: Number(
      fish.repetition_penalty ?? fish.repetitionPenalty ?? FISH_SPEECH_DEFAULTS.repetitionPenalty,
    ),
    chunkLength: Number(fish.chunk_length ?? fish.chunkLength ?? FISH_SPEECH_DEFAULTS.chunkLength),
    maxNewTokens: Number(fish.max_new_tokens ?? fish.maxNewTokens ?? FISH_SPEECH_DEFAULTS.maxNewTokens),
    useTaggedScript: fish.use_tagged_script !== false && fish.useTaggedScript !== false,
    defaultReferenceId: String(fish.default_reference_id || fish.defaultReferenceId || ""),
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
      return { ok: false, baseUrl: cfg.baseUrl, error: `Health HTTP ${healthRes.status}` };
    }

    let references = [];
    try {
      const listRes = await fetch(`${cfg.baseUrl}/v1/references/list?format=json`, {
        headers: authHeaders(cfg.apiKey, { Accept: "application/json" }),
        signal,
      });
      if (listRes.ok) {
        const data = await listRes.json();
        references = Array.isArray(data.reference_ids) ? data.reference_ids : [];
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

async function fetchFishCloudModels(cfg, { timeoutMs = 15000, libraryLanguage = "pt" } = {}) {
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
    const selfRes = await fetch(`${cfg.cloudBaseUrl}/model?self=true&page_size=50`, { headers, signal });
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
        { headers, signal },
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
      const fallbackRes = await fetch(`${cfg.cloudBaseUrl}/model?page_size=30&sort_by=score`, { headers, signal });
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

  const configuredDefault = cfg.defaultReferenceId && cfg.defaultReferenceId !== FISH_SPEECH_DEFAULT_VOICE
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

export function buildFishSpeechVoiceList(probe = {}) {
  const voices = [
    {
      id: FISH_SPEECH_DEFAULT_VOICE,
      label: probe.mode === "cloud" ? "Voz padrão S2.1 (sem clone)" : "Voz padrão do modelo S2",
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

export async function synthesizeFishSpeech(text, {
  outputPath,
  referenceId = null,
  config = {},
  onLog = () => {},
} = {}) {
  const cfg = resolveFishSpeechConfig(config);
  const plain = String(text || "").trim();
  if (!plain || plain.length < 20) {
    throw new Error("Texto muito curto para Fish Speech.");
  }
  if (!outputPath) {
    throw new Error("Caminho de saída ausente para Fish Speech.");
  }

  const probe = await probeFishSpeechServer(config);
  if (!probe.ok) {
    throw new Error(`Fish Speech indisponível. ${probe.error || ""}`.trim());
  }

  const mode = probe.mode || "local";
  const baseUrl = mode === "cloud" ? cfg.cloudBaseUrl : cfg.baseUrl;

  const refId = referenceId && referenceId !== FISH_SPEECH_DEFAULT_VOICE
    ? referenceId
    : (cfg.defaultReferenceId || null);

  const body = {
    text: plain,
    format: cfg.format,
    references: [],
    reference_id: refId || null,
    chunk_length: cfg.chunkLength,
    temperature: cfg.temperature,
    top_p: cfg.topP,
    repetition_penalty: cfg.repetitionPenalty,
    max_new_tokens: cfg.maxNewTokens,
    latency: "normal",
    use_memory_cache: "off",
    normalize: true,
    streaming: false,
    condition_on_previous_chunks: true,
    min_chunk_length: 50,
  };

  onLog(`[Fish Speech] ${plain.length} chars · ref=${refId || "padrão"} · ${mode} · ${baseUrl}`);

  const headers = authHeaders(cfg.apiKey, {
    "Content-Type": "application/json",
    Accept: "audio/*",
  });
  if (mode === "cloud") {
    headers.model = cfg.cloudModel;
  }

  const res = await fetch(`${baseUrl}/v1/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(900000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Fish Speech HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error("Fish Speech retornou áudio vazio.");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  return {
    outputPath,
    referenceId: refId,
    format: cfg.format,
    bytes: buffer.length,
    mode,
  };
}