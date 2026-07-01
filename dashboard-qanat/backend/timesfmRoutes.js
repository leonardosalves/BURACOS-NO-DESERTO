/**
 * Rotas de previsão de tendências YouTube (TimesFM) + nichos pioneiros.
 */

import { probeTimesfmStatus, runTrendForecast } from "./timesfmForecast.js";
import { discoverPioneerNiches } from "./pioneerNicheDiscovery.js";

function buildPioneerLlmFn(deps) {
  const {
    WORKSPACE_DIR,
    getApiKey,
    getApiKeys,
    getAiProvider,
    getGeminiModel,
    callGeminiWithRetry,
    callNvidiaWithRetry,
    NVIDIA_MODELS,
  } = deps;

  if (!getApiKey || !callGeminiWithRetry) return null;

  return async (prompt) => {
    const tryCall = async (label, fn) => {
      try {
        const text = String(await fn() || "").trim();
        if (text) return text;
      } catch (err) {
        console.warn(`[PioneerNiche] ${label}:`, err.message);
      }
      return null;
    };

    if (getAiProvider?.(WORKSPACE_DIR) === "nvidia" && callNvidiaWithRetry) {
      for (const model of (NVIDIA_MODELS || []).slice(0, 3)) {
        const text = await tryCall(`nvidia-${model}`, () => callNvidiaWithRetry(prompt, {
          maxRetries: 1,
          models: [model],
          temperature: 0.25,
          projectDir: WORKSPACE_DIR,
        }));
        if (text) return text;
      }
    }

    let text = await tryCall("gemini", () => callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
      maxRetries: 1,
      models: [getGeminiModel?.(WORKSPACE_DIR) || "gemini-2.5-flash", "gemini-2.5-flash"],
      temperature: 0.25,
      projectDir: WORKSPACE_DIR,
    }));
    if (text) return text;

    for (const key of (getApiKeys?.(WORKSPACE_DIR) || []).slice(0, 2)) {
      text = await tryCall("gemini-fallback", () => callGeminiWithRetry(key, prompt, {
        maxRetries: 1,
        models: ["gemini-2.0-flash"],
        temperature: 0.25,
        projectDir: WORKSPACE_DIR,
        forceProvider: "gemini",
      }));
      if (text) return text;
    }
    return null;
  };
}

export function registerTimesfmRoutes(app, deps) {
  const { WORKSPACE_DIR, PROJECTS_ROOT, PYTHON_PATH } = deps;
  const pioneerLlmFn = buildPioneerLlmFn(deps);

  app.get("/api/trends/status", async (_req, res) => {
    try {
      const status = await probeTimesfmStatus({ pythonPath: PYTHON_PATH });
      res.json(status);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/trends/pioneer-niches", async (req, res) => {
    try {
      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format = ["SHORT", "SHORTS", "LONG", "LONGO"].includes(formatRaw) ? formatRaw : "SHORTS";
      const result = await discoverPioneerNiches(WORKSPACE_DIR, {
        niche: String(req.body?.niche || "").trim(),
        format,
        maxCandidates: Number(req.body?.maxCandidates) || 10,
        useAi: req.body?.useAi !== false,
        llmFn: req.body?.useAi === false ? null : pioneerLlmFn,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha na descoberta de nichos pioneiros", details: err.message });
    }
  });

  app.post("/api/trends/forecast", async (req, res) => {
    try {
      const formatRaw = String(req.body?.format || "all").toUpperCase();
      const format = ["SHORT", "SHORTS", "LONG", "LONGO", "ALL"].includes(formatRaw)
        ? formatRaw
        : "all";

      const result = await runTrendForecast(WORKSPACE_DIR, {
        projectsRoot: PROJECTS_ROOT,
        pythonPath: PYTHON_PATH,
        horizon: Number(req.body?.horizon) || 7,
        historyDays: Number(req.body?.historyDays) || 14,
        maxVideos: Number(req.body?.maxVideos) || 12,
        format,
        enqueueIdeas: req.body?.enqueueIdeas === true,
        niche: String(req.body?.niche || "").trim(),
        discoverPioneers: req.body?.discoverPioneers === true,
        pioneerLlmFn: req.body?.discoverPioneers === true ? pioneerLlmFn : null,
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha na previsão de tendências", details: err.message });
    }
  });
}