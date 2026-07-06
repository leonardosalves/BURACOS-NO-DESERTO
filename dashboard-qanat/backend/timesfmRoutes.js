/**
 * Rotas de previsão de tendências YouTube (TimesFM) + nichos pioneiros.
 */

import { probeTimesfmStatus, runTrendForecast } from "./timesfmForecast.js";
import { discoverPioneerNiches } from "./pioneerNicheDiscovery.js";
import {
  deleteTrendRadarSave,
  getTrendRadarSave,
  listTrendRadarSaves,
  saveTrendRadarNiche,
  saveTrendRadarScan,
} from "./trendRadarSaves.js";

function buildPioneerLlmFn(deps) {
  const {
    WORKSPACE_DIR,
    getApiKey,
    getAiProvider,
    callGeminiWithRetry,
    callNvidiaWithRetry,
    NVIDIA_MODELS,
  } = deps;

  if (!getApiKey || !callGeminiWithRetry) return null;

  return async (prompt) => {
    const tryCall = async (label, fn) => {
      try {
        const text = String((await fn()) || "").trim();
        if (text) return text;
      } catch (err) {
        console.warn(`[PioneerNiche] ${label}:`, err.message);
      }
      return null;
    };

    if (getAiProvider?.(WORKSPACE_DIR) === "nvidia" && callNvidiaWithRetry) {
      for (const model of (NVIDIA_MODELS || []).slice(0, 3)) {
        const text = await tryCall(`nvidia-${model}`, () =>
          callNvidiaWithRetry(prompt, {
            maxRetries: 1,
            models: [model],
            temperature: 0.25,
            projectDir: WORKSPACE_DIR,
          })
        );
        if (text) return text;
      }
    }

    const text = await tryCall("gemini", () =>
      callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
        maxRetries: 1,
        temperature: 0.25,
        projectDir: WORKSPACE_DIR,
      })
    );
    return text;
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
      const format = ["SHORT", "SHORTS", "LONG", "LONGO"].includes(formatRaw)
        ? formatRaw
        : "SHORTS";
      const discoveryMode =
        req.body?.discoveryMode === "chosen" ? "chosen" : "virgin";
      const result = await discoverPioneerNiches(WORKSPACE_DIR, {
        niche: String(req.body?.niche || "").trim(),
        format,
        discoveryMode,
        maxCandidates: Number(req.body?.maxCandidates) || 10,
        useAi: req.body?.useAi !== false,
        llmFn: req.body?.useAi === false ? null : pioneerLlmFn,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "Falha na descoberta de nichos pioneiros",
        details: err.message,
      });
    }
  });

  app.get("/api/trends/saved", (_req, res) => {
    try {
      res.json(listTrendRadarSaves(WORKSPACE_DIR));
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/trends/saved/:id", (req, res) => {
    try {
      const result = getTrendRadarSave(WORKSPACE_DIR, req.params.id);
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/trends/saved", (req, res) => {
    try {
      const saveType = req.body?.type === "scan" ? "scan" : "niche";
      const discoveryMode =
        req.body?.discoveryMode === "chosen" ? "chosen" : "virgin";
      const nicheFilter = String(
        req.body?.nicheFilter || req.body?.niche || ""
      ).trim();
      const format = String(req.body?.format || "SHORTS").toUpperCase();

      if (saveType === "scan") {
        const result = saveTrendRadarScan(WORKSPACE_DIR, {
          discovery: req.body?.discovery || {},
          discoveryMode,
          nicheFilter,
          format,
          label: String(req.body?.label || "").trim(),
        });
        return res.json(result);
      }

      const niche = req.body?.niche || req.body?.nicheData || {};
      const result = saveTrendRadarNiche(WORKSPACE_DIR, {
        niche,
        discoveryMode,
        nicheFilter,
        format,
        scanSummary: req.body?.scanSummary || null,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "Falha ao salvar resultado",
        details: err.message,
      });
    }
  });

  app.delete("/api/trends/saved/:id", (req, res) => {
    try {
      const result = deleteTrendRadarSave(WORKSPACE_DIR, req.params.id);
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/trends/forecast", async (req, res) => {
    try {
      const formatRaw = String(req.body?.format || "all").toUpperCase();
      const format = ["SHORT", "SHORTS", "LONG", "LONGO", "ALL"].includes(
        formatRaw
      )
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
        discoveryMode:
          req.body?.discoveryMode === "chosen" ? "chosen" : "virgin",
        pioneerLlmFn: req.body?.discoverPioneers === true ? pioneerLlmFn : null,
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "Falha na previsão de tendências",
        details: err.message,
      });
    }
  });

  app.post("/api/trends/expand-pioneer-idea", async (req, res) => {
    try {
      if (!pioneerLlmFn) {
        return res.status(400).json({
          ok: false,
          error: "IA não configurada ou sem chave de API ativa.",
        });
      }

      const {
        macroNiche,
        label,
        angle,
        format,
        firstVideoIdea,
        firstVideoHook,
        demandAnalysis,
        contentPillars,
        competitionLevel,
        whyPioneer,
        nicheLabel,
      } = req.body;

      const isShorts = String(format || "").toUpperCase() !== "LONGO";
      const targetFormat = isShorts ? "SHORTS" : "LONGO";
      const blockCount = isShorts ? "3 to 4" : "5 to 8";

      // Monta contexto rico da pesquisa de tendências
      const researchContext = [
        demandAnalysis ? `DEMAND ANALYSIS: ${demandAnalysis}` : "",
        angle ? `SPECIFIC ANGLE: ${angle}` : "",
        firstVideoIdea ? `SUGGESTED FIRST VIDEO IDEA: ${firstVideoIdea}` : "",
        firstVideoHook ? `SUGGESTED HOOK: ${firstVideoHook}` : "",
        whyPioneer ? `WHY THIS IS A PIONEER OPPORTUNITY: ${whyPioneer}` : "",
        competitionLevel ? `COMPETITION LEVEL: ${competitionLevel}` : "",
        Array.isArray(contentPillars) && contentPillars.length > 0
          ? `CONTENT PILLARS:\n${contentPillars.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const prompt = `You are an expert YouTube content strategist.
You have received the following RESEARCH DATA from a YouTube trend radar tool about a real, validated opportunity:

NICHE: ${nicheLabel || macroNiche || label}
MACRO NICHE: ${macroNiche || "General"}
TOPIC/LABEL: ${label || nicheLabel || "General Topic"}
VIDEO FORMAT: ${targetFormat}

=== TREND RESEARCH DATA ===
${researchContext || `Angle: ${angle || "Interesting facts about the topic"}`}
===========================

Based on this SPECIFIC trend research data above, expand into a structured video outline.
The content MUST be directly related to and inspired by the research data provided — do NOT generate generic content.
All returned fields MUST be in English.

1. "title": A highly catchy, high-CTR video title (in English, max 90 chars). Base it on the specific angle/first video idea from the research.
2. "hook": A powerful retention hook (in English). It should NOT be the same as the title. Base it on the suggested hook from the research if available. It should grab attention immediately (e.g. "We've been lied to about...", "You've been looking at maps wrong...").
3. "promise": A general base script outline / promise of the video (in English, 2-3 sentences). Must reflect the specific demand analysis and angle from the research.
4. "blocks": A list of sequential script blocks.
   - If the format is SHORTS, you MUST generate exactly between 3 and 4 blocks.
   - If the format is LONGO, you MUST generate exactly between 5 and 8 blocks.
   - Each block must have a number ("block": integer) and a concise description of what should be covered ("content": string in English).
   - The blocks should follow the content pillars and angle from the research data.

Respond STRICTLY in valid JSON format. Do not write any conversational text before or after the JSON.
JSON format structure:
{
  "title": "...",
  "hook": "...",
  "promise": "...",
  "blocks": [
    { "block": 1, "content": "..." },
    { "block": 2, "content": "..." }
  ]
}`;

      const rawResponse = await pioneerLlmFn(prompt);
      if (!rawResponse) {
        throw new Error("Resposta vazia da IA.");
      }

      let cleaned = rawResponse.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(json)?/, "")
          .replace(/```$/, "")
          .trim();
      }

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        console.error("Falha ao analisar JSON retornado da expansão:", cleaned);
        throw new Error(
          "O modelo de IA não retornou um JSON válido. Tente novamente."
        );
      }

      res.json({
        ok: true,
        title: parsed.title || angle || label,
        hook: parsed.hook || angle || label,
        promise: parsed.promise || label,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
}
