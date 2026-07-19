/**
 * Adapter opcional para API Seedance (ByteDance / parceiros).
 * Ative em config_qanat.json → seedance_api.enabled + api_key.
 */

import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://api.seedance.ai/v1";

export function loadSeedanceApiConfig(projDir) {
  const configPath = path.join(projDir, "config_qanat.json");
  let cfg = {};
  try {
    if (fs.existsSync(configPath))
      cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    /* ignore */
  }
  const block = cfg.seedance_api || cfg.seedanceApi || {};
  return {
    enabled: Boolean(block.enabled),
    base_url: String(
      block.base_url || block.baseUrl || DEFAULT_BASE_URL
    ).replace(/\/$/, ""),
    api_key: String(block.api_key || block.apiKey || "").trim(),
    model: String(block.model || "seedance-2.0").trim(),
    timeout_ms: Number(block.timeout_ms) || 300_000,
  };
}

/**
 * Payload multimodal no estilo Seedance Skill OS — refs por papel.
 */
export function buildSeedanceApiPayload({
  prompt = "",
  refs = {},
  directing_brief = {},
  duration_seconds = 5,
  aspect_ratio = "16:9",
  model = "seedance-2.0",
} = {}) {
  const refEntries = Object.entries(refs)
    .filter(([, v]) => String(v || "").trim())
    .map(([role, value]) => ({ role, value: String(value).trim() }));

  return {
    model,
    prompt: String(prompt).trim(),
    duration: Math.min(10, Math.max(1, Number(duration_seconds) || 5)),
    aspect_ratio,
    directing_brief,
    references: refEntries,
  };
}

export async function generateSeedanceApiVideo({
  prompt,
  refs,
  directing_brief,
  duration_seconds,
  aspect_ratio,
  config,
  projDir,
}) {
  const cfg = config || loadSeedanceApiConfig(projDir);
  if (!cfg.enabled) {
    throw new Error(
      "API Seedance desabilitada. Ative seedance_api.enabled em config_qanat.json ou use provider: 'mobilewan'."
    );
  }
  if (!cfg.api_key) {
    throw new Error(
      "API Seedance: configure seedance_api.api_key em config_qanat.json."
    );
  }

  const payload = buildSeedanceApiPayload({
    prompt,
    refs,
    directing_brief,
    duration_seconds,
    aspect_ratio,
    model: cfg.model,
  });

  const url = `${cfg.base_url}/videos/generate`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.api_key}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(cfg.timeout_ms),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      text.slice(0, 300);
    throw new Error(`API Seedance (${res.status}): ${msg}`);
  }

  return {
    prompt_id: data.job_id || data.id || data.task_id || null,
    status: data.status || "queued",
    remote_url: data.video_url || data.output_url || null,
    raw: data,
  };
}

export async function pollSeedanceApiJob({ jobId, config, projDir }) {
  const cfg = config || loadSeedanceApiConfig(projDir);
  const url = `${cfg.base_url}/videos/${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.api_key}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Seedance poll failed (${res.status})`);
  return res.json();
}
