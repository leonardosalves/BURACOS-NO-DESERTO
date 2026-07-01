/**
 * Rotas de pesquisa profunda (padrão DeerFlow → Lumiera).
 */

import { runDeepResearch, planDeepResearch } from "./deerFlowResearch.js";
import { buildCompetitorLlmFns } from "./researchLlmHelpers.js";

export function registerResearchRoutes(app, deps) {
  const {
    WORKSPACE_DIR,
    BACKEND_DIR,
    getApiKey,
    getApiKeys,
    getAiProvider,
    getGeminiModel,
    callGeminiWithRetry,
    callNvidiaWithRetry,
    NVIDIA_MODELS,
  } = deps;

  app.post("/api/research/deep/plan", (req, res) => {
    try {
      const topic = String(req.body?.topic || req.body?.requirement || "").trim();
      if (!topic) return res.status(400).json({ error: "Informe topic ou requirement." });
      const niche = String(req.body?.niche || "Geral").trim();
      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format = formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      res.json({ ok: true, plan: planDeepResearch(topic, { niche, format }) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/research/deep", async (req, res) => {
    try {
      const topic = String(req.body?.topic || req.body?.requirement || "").trim();
      if (!topic) return res.status(400).json({ error: "Informe topic ou requirement." });

      const useAi = req.body?.useAi !== false;
      const { llmFn, repairJsonFn } = buildCompetitorLlmFns({
        workspaceDir: WORKSPACE_DIR,
        getAiProvider,
        getApiKey,
        getApiKeys,
        getGeminiModel,
        callGeminiWithRetry,
        callNvidiaWithRetry,
        NVIDIA_MODELS,
      }, { useAi });

      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format = formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      const legs = Array.isArray(req.body?.legs) ? req.body.legs : undefined;

      const result = await runDeepResearch(WORKSPACE_DIR, {
        topic,
        niche: String(req.body?.niche || "Geral").trim(),
        format,
        legs,
        llmFn: legs && !legs.includes("competitors") ? null : llmFn,
        repairJsonFn: legs && !legs.includes("competitors") ? null : repairJsonFn,
        getApiKeys,
        apiKey: getApiKey(WORKSPACE_DIR),
        backendDir: BACKEND_DIR,
        notebooklmDeep: req.body?.notebooklmDeep === true,
        enqueueIdeas: req.body?.enqueueIdeas !== false,
        maxCompetitors: Math.min(Math.max(Number(req.body?.maxCompetitors) || 5, 1), 8),
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Falha na pesquisa profunda", details: err.message });
    }
  });
}